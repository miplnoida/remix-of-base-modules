/**
 * identityLinkingService — public registration + SSN linking facade.
 *
 * Hard rules:
 *  - SSN + DOB must both match exactly before any name scoring runs.
 *  - Score 0..100. AUTO_LINK >= autoLinkThreshold (default 85),
 *    MANUAL_REVIEW >= manualReviewThreshold (default 60), else REJECT.
 *  - Rate limit: maxAttemptsPerDay (default 5). Lockout returns LOCKED.
 *  - User-facing failure copy is intentionally generic — no field hints.
 *  - Every step writes to external_persona_audit via auditPortalAction.
 */
import { supabase } from '@/integrations/supabase/client';
import { auditPortalAction } from './auditPortalAction';

const db = supabase as any;

const DEFAULT_AUTO_LINK_THRESHOLD = 85;
const DEFAULT_MANUAL_REVIEW_THRESHOLD = 60;
const DEFAULT_MAX_ATTEMPTS_PER_DAY = 5;
const FUZZY_RATIO = 0.85;

export type LinkDecision = 'AUTO_LINK' | 'MANUAL_REVIEW' | 'REJECT' | 'LOCKED';

export interface IdentityCandidate {
  ssn: string;
  dateOfBirth: string;          // yyyy-MM-dd
  firstName: string;
  lastName: string;
  middleName?: string;
  previousName?: string;
  nationalId?: string;
  gender?: 'M' | 'F' | 'N';
}

export interface LinkAttemptResult {
  decision: LinkDecision;
  score: number;
  message: string;
  matchedSsn?: string;
}

/* ---------- helpers ---------- */

function maskSsn(ssn: string): string {
  if (!ssn) return '';
  return ssn.length <= 3 ? ssn : `${'•'.repeat(ssn.length - 3)}${ssn.slice(-3)}`;
}

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Levenshtein-based ratio, 1.0 == identical. */
function similarity(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dp: number[] = Array(y.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j];
      dp[j] = x[i - 1] === y[j - 1]
        ? prev
        : 1 + Math.min(prev, dp[j - 1], dp[j]);
      prev = tmp;
    }
  }
  const dist = dp[y.length];
  return 1 - dist / Math.max(x.length, y.length);
}

function fuzzyMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return similarity(a ?? '', b ?? '') >= FUZZY_RATIO;
}

async function getThresholds() {
  const { data } = await db
    .from('external_portal_feature_config')
    .select('feature_key, enabled');
  const rows: any[] = data ?? [];
  const isOn = (k: string) => rows.find(r => r.feature_key === k)?.enabled ?? false;
  return {
    autoLink: DEFAULT_AUTO_LINK_THRESHOLD,
    manualReview: DEFAULT_MANUAL_REVIEW_THRESHOLD,
    maxPerDay: DEFAULT_MAX_ATTEMPTS_PER_DAY,
    requireEmail: isOn('requireEmailVerification'),
    requirePhone: isOn('requirePhoneVerification'),
    eitherChannel: isOn('allowEitherVerificationChannel'),
    limitedAccounts: isOn('limitedAccountsEnabled'),
  };
}

/* ---------- public surface ---------- */

export async function startRegistration(_payload: unknown): Promise<void> {
  // Account creation itself is done by externalApiClient.registerExternalUser.
  // This wrapper exists for parity with the brief + future audit hook.
  auditPortalAction('REGISTRATION_STARTED', {});
}

/**
 * Sends an email OTP using Supabase magic-link OTP.
 * Falls back to logging-only when auth is not configured.
 */
export async function sendEmailOtp(email: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('public-registration-otp', {
    body: { action: 'send', channel: 'EMAIL', destination: email },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function verifyEmailOtp(email: string, token: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('public-registration-otp', {
    body: { action: 'verify', channel: 'EMAIL', destination: email, token },
  });
  if (error || data?.error) return false;
  if (!data?.verified) return false;
  auditPortalAction('EMAIL_VERIFIED', { payload: { email } });
  return true;
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('public-registration-otp', {
    body: { action: 'send', channel: 'PHONE', destination: phone },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}


export async function verifyPhoneOtp(phone: string, token: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('public-registration-otp', {
    body: { action: 'verify', channel: 'PHONE', destination: phone, token },
  });
  if (error || data?.error) return false;
  if (!data?.verified) return false;
  auditPortalAction('PHONE_VERIFIED', { payload: { phone } });
  return true;
}

/** Pure score function — exported for tests. */
export function calculateMatchScore(c: IdentityCandidate, dbPerson: any): number {
  // Hard gates already enforced by the caller; this function trusts SSN+DOB match.
  let score = 0;
  if (fuzzyMatch(c.lastName, dbPerson.surname)) score += 30;
  if (fuzzyMatch(c.firstName, dbPerson.firstname)) score += 25;
  if (c.middleName && dbPerson.middle_name && fuzzyMatch(c.middleName, dbPerson.middle_name)) score += 10;
  if (c.previousName && dbPerson.surname && fuzzyMatch(c.previousName, dbPerson.surname)) score += 5;
  if (c.gender && dbPerson.sex && c.gender.toUpperCase() === String(dbPerson.sex).toUpperCase()) score += 10;
  if (dbPerson.phone || dbPerson.mobile) score += 10;
  if (c.nationalId) score += 10;
  return Math.min(100, score);
}

export async function getLinkStatus(userId: string): Promise<{
  verified: boolean;
  ssn: string | null;
}> {
  if (!userId) return { verified: false, ssn: null };
  const { data } = await db
    .from('external_user_person_link')
    .select('ssn, verification_status')
    .eq('user_id', userId)
    .eq('relationship_type', 'SELF')
    .maybeSingle();
  return {
    verified: data?.verification_status === 'VERIFIED',
    ssn: data?.ssn ?? null,
  };
}

async function recentAttemptsCount(userId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from('external_identity_link_attempt')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  return count ?? 0;
}

export async function auditIdentityLinkAttempt(
  userId: string,
  ssn: string,
  score: number,
  decision: LinkDecision,
  reason?: string,
): Promise<void> {
  try {
    await db.from('external_identity_link_attempt').insert({
      user_id: userId,
      attempted_ssn_masked: maskSsn(ssn),
      match_score: score,
      decision,
      reason: reason ?? null,
    });
  } catch {/* non-blocking */}
}

export async function createVerifiedSelfLink(
  userId: string,
  ssn: string,
  score: number,
  channelFlags: { verifiedEmail: boolean; verifiedPhone: boolean },
): Promise<void> {
  await db.from('external_user_person_link').upsert({
    user_id: userId,
    ssn,
    relationship_type: 'SELF',
    verification_status: 'VERIFIED',
    is_primary: true,
    verified_at: new Date().toISOString(),
    verification_method: 'AUTO_IDENTITY_MATCH',
    match_method: 'SSN_DOB_NAME_SCORE',
    match_score: score,
    verified_email: channelFlags.verifiedEmail,
    verified_phone: channelFlags.verifiedPhone,
  }, { onConflict: 'user_id,ssn,relationship_type' });
  auditPortalAction('SSN_LINK_SUCCESS', { userId, targetSsn: ssn, payload: { score } });
}

export async function createLimitedAccount(userId: string): Promise<void> {
  // No DB row required — absence of a VERIFIED SELF link is the limited state.
  // We just audit the explicit user choice / system fallback.
  auditPortalAction('SSN_LINK_FAIL', { userId, payload: { limited: true } });
}

/**
 * Attempt to link a user's SSN to an insured-person record.
 * Enforces rate limit, hard SSN+DOB gates, then scoring.
 */
export async function attemptSsnLink(
  userId: string,
  candidate: IdentityCandidate,
  channelFlags: { verifiedEmail: boolean; verifiedPhone: boolean },
): Promise<LinkAttemptResult> {
  if (!userId) {
    return { decision: 'REJECT', score: 0, message: friendlyMessage('REJECT') };
  }
  const cfg = await getThresholds();

  // Channel pre-check
  const channelOk = cfg.eitherChannel
    ? (channelFlags.verifiedEmail || channelFlags.verifiedPhone)
    : ((!cfg.requireEmail || channelFlags.verifiedEmail) &&
       (!cfg.requirePhone || channelFlags.verifiedPhone));
  if (!channelOk) {
    return {
      decision: 'REJECT',
      score: 0,
      message: 'Please verify your email or phone before linking your Social Security record.',
    };
  }

  // Rate limit
  const recent = await recentAttemptsCount(userId);
  if (recent >= cfg.maxPerDay) {
    await auditIdentityLinkAttempt(userId, candidate.ssn, 0, 'LOCKED', 'rate_limit');
    return { decision: 'LOCKED', score: 0, message: friendlyMessage('LOCKED') };
  }

  // Hard gates: SSN exact + DOB exact
  const { data: match } = await db
    .from('ip_master')
    .select('ssn, dob, surname, firstname, middle_name, sex, phone, mobile')
    .eq('ssn', candidate.ssn.trim())
    .maybeSingle();

  const dobOk = !!match?.dob &&
    new Date(match.dob).toISOString().slice(0, 10) === candidate.dateOfBirth;

  if (!match || !dobOk) {
    await auditIdentityLinkAttempt(userId, candidate.ssn, 0, 'REJECT', 'hard_gate');
    auditPortalAction('SSN_LINK_FAIL', { userId, targetSsn: candidate.ssn });
    return { decision: 'REJECT', score: 0, message: friendlyMessage('REJECT') };
  }

  const score = calculateMatchScore(candidate, match);
  let decision: LinkDecision;
  if (score >= cfg.autoLink) decision = 'AUTO_LINK';
  else if (score >= cfg.manualReview) decision = 'MANUAL_REVIEW';
  else decision = 'REJECT';

  await auditIdentityLinkAttempt(userId, candidate.ssn, score, decision);

  if (decision === 'AUTO_LINK') {
    await createVerifiedSelfLink(userId, match.ssn, score, channelFlags);
    return {
      decision,
      score,
      matchedSsn: match.ssn,
      message: friendlyMessage(decision),
    };
  }

  if (decision === 'MANUAL_REVIEW') {
    // Insert a NEEDS_REVIEW row so admins can pick it up later.
    try {
      await db.from('external_user_person_link').upsert({
        user_id: userId,
        ssn: match.ssn,
        relationship_type: 'SELF',
        verification_status: 'NEEDS_REVIEW',
        is_primary: false,
        verification_method: 'PENDING_REVIEW',
        match_method: 'SSN_DOB_NAME_SCORE',
        match_score: score,
        verified_email: channelFlags.verifiedEmail,
        verified_phone: channelFlags.verifiedPhone,
      }, { onConflict: 'user_id,ssn,relationship_type' });
    } catch {/* non-blocking */}
    auditPortalAction('SSN_LINK_FAIL', { userId, targetSsn: candidate.ssn, payload: { needsReview: true, score } });
    return { decision, score, message: friendlyMessage(decision) };
  }

  auditPortalAction('SSN_LINK_FAIL', { userId, targetSsn: candidate.ssn, payload: { score } });
  return { decision, score, message: friendlyMessage(decision) };
}

export function friendlyMessage(decision: LinkDecision): string {
  switch (decision) {
    case 'AUTO_LINK':
      return 'Your Social Security record has been linked successfully.';
    case 'MANUAL_REVIEW':
      return 'We could not automatically confirm your record. You can continue with limited access or submit details for review.';
    case 'LOCKED':
      return 'Too many attempts. Please try again later or contact Social Security.';
    case 'REJECT':
    default:
      return 'We could not verify your record using the details provided. Please check your information or continue with limited access.';
  }
}
