/**
 * portalPersonaService
 *
 * Resolves the persona(s) for a logged-in external portal user.
 * The user's identity (auth.users.id) is decoupled from the person(s)
 * their data is about — relationships are stored in
 * `external_user_person_link` and only a VERIFIED `SELF` link grants
 * contribution / employment-history visibility.
 *
 * Source-of-truth tables consulted:
 *   - external_user_person_link  (SELF, GUARDIAN, PAYEE, REPRESENTATIVE, BENEFICIARY, APPLICANT_FOR)
 *   - bn_claim                   (submitted_by_user_id → CLAIMANT)
 *   - bn_award_beneficiary       (user_id           → BENEFICIARY)
 *   - bn_award                   (active award holder → PENSIONER)
 *   - ip_master                  (display name for the SELF SSN)
 *
 * Pure read. Audit row (PERSONA_RESOLVED) is best-effort, never blocks.
 */
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export type Persona =
  | 'INSURED_PERSON'
  | 'CLAIMANT'
  | 'BENEFICIARY'
  | 'PAYEE'
  | 'GUARDIAN'
  | 'REPRESENTATIVE'
  | 'PENSIONER';

export type RelationshipType =
  | 'SELF'
  | 'GUARDIAN'
  | 'PAYEE'
  | 'REPRESENTATIVE'
  | 'BENEFICIARY'
  | 'APPLICANT_FOR';

export interface PersonaFlags {
  canViewContributions: boolean;
  canViewEmploymentHistory: boolean;
  canApplyForSelf: boolean;
  canApplyForOthers: boolean;
  canManageDependants: boolean;
  canViewPayments: boolean;
}

export interface ManagedPersonRef {
  ssn: string;
  displayName: string | null;
  relationship: RelationshipType;
}

export interface ManagedClaimRef {
  id: string;
  claimNumber: string | null;
  benefitType: string | null;
  status: string | null;
  role: 'SUBMITTED_BY' | 'APPLICANT_FOR';
}

export interface ManagedAwardRef {
  id: string;
  awardNumber: string | null;
  benefitType: string | null;
  status: string | null;
  role: 'HOLDER' | 'BENEFICIARY' | 'PAYEE';
}

export interface PortalPersonaContext {
  userId: string;
  personas: Persona[];
  personSsn: string | null;
  displayName: string;
  flags: PersonaFlags;
  managedPersons: ManagedPersonRef[];
  managedClaims: ManagedClaimRef[];
  managedAwards: ManagedAwardRef[];
  resolvedAt: string;
}

const EMPTY_FLAGS: PersonaFlags = {
  canViewContributions: false,
  canViewEmploymentHistory: false,
  canApplyForSelf: false,
  canApplyForOthers: false,
  canManageDependants: false,
  canViewPayments: false,
};

/** Fire-and-forget audit writer. */
async function auditPersonaResolved(userId: string, personas: Persona[]) {
  try {
    await db.from('external_persona_audit').insert({
      user_id: userId,
      event_type: 'PERSONA_RESOLVED',
      payload: { personas },
    });
  } catch {
    /* never block UI on audit */
  }
}

async function fetchLinks(userId: string) {
  const { data, error } = await db
    .from('external_user_person_link')
    .select('ssn, relationship_type, verification_status, is_primary')
    .eq('user_id', userId)
    .eq('verification_status', 'VERIFIED');
  if (error) throw error;
  return (data ?? []) as Array<{
    ssn: string;
    relationship_type: RelationshipType;
    verification_status: string;
    is_primary: boolean;
  }>;
}

async function fetchDisplayNameForSsn(ssn: string | null): Promise<string | null> {
  if (!ssn) return null;
  const { data } = await db
    .from('ip_master')
    .select('first_name, last_name')
    .eq('ssn', ssn)
    .maybeSingle();
  if (!data) return null;
  return [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || null;
}

async function fetchClaimsSubmittedBy(userId: string): Promise<ManagedClaimRef[]> {
  const { data, error } = await db
    .from('bn_claim')
    .select('id, claim_number, benefit_type, status, submitted_by_user_id')
    .eq('submitted_by_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    claimNumber: r.claim_number ?? null,
    benefitType: r.benefit_type ?? null,
    status: r.status ?? null,
    role: 'SUBMITTED_BY' as const,
  }));
}

async function fetchAwardsForSsn(ssn: string): Promise<ManagedAwardRef[]> {
  const { data, error } = await db
    .from('bn_award')
    .select('id, award_number, benefit_type, status, ssn')
    .eq('ssn', ssn);
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    id: r.id,
    awardNumber: r.award_number ?? null,
    benefitType: r.benefit_type ?? null,
    status: r.status ?? null,
    role: 'HOLDER' as const,
  }));
}

async function fetchBeneficiaryAwards(userId: string): Promise<ManagedAwardRef[]> {
  // bn_award_beneficiary may or may not have user_id column populated; tolerate either.
  try {
    const { data } = await db
      .from('bn_award_beneficiary')
      .select('award_id, bn_award:award_id(id, award_number, benefit_type, status)')
      .eq('user_id', userId);
    return (data ?? [])
      .map((r: any) => r.bn_award)
      .filter(Boolean)
      .map((a: any) => ({
        id: a.id,
        awardNumber: a.award_number ?? null,
        benefitType: a.benefit_type ?? null,
        status: a.status ?? null,
        role: 'BENEFICIARY' as const,
      }));
  } catch {
    return [];
  }
}

/**
 * Resolve all personas for a logged-in user.
 *
 * Returns a deterministic context. Even when nothing matches, the structure
 * is the same with personas: [] and all flags false — callers can rely on it.
 */
export async function resolvePortalPersonas(
  userId: string,
  opts: { displayNameFallback?: string | null } = {},
): Promise<PortalPersonaContext> {
  if (!userId) {
    return {
      userId: '',
      personas: [],
      personSsn: null,
      displayName: opts.displayNameFallback ?? 'Guest',
      flags: { ...EMPTY_FLAGS },
      managedPersons: [],
      managedClaims: [],
      managedAwards: [],
      resolvedAt: new Date().toISOString(),
    };
  }

  // 1. Verified relationship links
  const links = await fetchLinks(userId);
  const selfLink = links.find(l => l.relationship_type === 'SELF') ?? null;
  const guardianLinks = links.filter(l => l.relationship_type === 'GUARDIAN');
  const payeeLinks = links.filter(l => l.relationship_type === 'PAYEE');
  const repLinks = links.filter(l => l.relationship_type === 'REPRESENTATIVE');
  const beneficiaryLinks = links.filter(l => l.relationship_type === 'BENEFICIARY');
  const applicantForLinks = links.filter(l => l.relationship_type === 'APPLICANT_FOR');

  // 2. Claims & awards
  const [submittedClaims, beneficiaryAwards] = await Promise.all([
    fetchClaimsSubmittedBy(userId),
    fetchBeneficiaryAwards(userId),
  ]);

  // Pensioner = active award where user has a verified SELF link.
  let pensionerAwards: ManagedAwardRef[] = [];
  if (selfLink) {
    pensionerAwards = (await fetchAwardsForSsn(selfLink.ssn)).filter(a =>
      ['ACTIVE', 'IN_PAYMENT', 'AWARDED'].includes(String(a.status ?? '').toUpperCase()),
    );
  }

  // 3. Personas
  const personas = new Set<Persona>();
  if (selfLink) personas.add('INSURED_PERSON');
  if (submittedClaims.length > 0 || applicantForLinks.length > 0) personas.add('CLAIMANT');
  if (beneficiaryAwards.length > 0 || beneficiaryLinks.length > 0) personas.add('BENEFICIARY');
  if (payeeLinks.length > 0) personas.add('PAYEE');
  if (guardianLinks.length > 0) personas.add('GUARDIAN');
  if (repLinks.length > 0) personas.add('REPRESENTATIVE');
  if (pensionerAwards.length > 0) personas.add('PENSIONER');

  // 4. Flags — strict contribution privacy: ONLY SELF link grants it.
  const flags: PersonaFlags = {
    canViewContributions: !!selfLink,
    canViewEmploymentHistory: !!selfLink,
    canApplyForSelf: !!selfLink,
    canApplyForOthers:
      guardianLinks.length > 0 ||
      payeeLinks.length > 0 ||
      repLinks.length > 0 ||
      applicantForLinks.length > 0,
    canManageDependants: guardianLinks.length > 0 || payeeLinks.length > 0,
    canViewPayments:
      pensionerAwards.length > 0 ||
      payeeLinks.length > 0 ||
      beneficiaryAwards.length > 0,
  };

  // 5. Managed people roll-up (Guardian / Payee / Representative / ApplicantFor)
  const managedSsns = Array.from(new Set([
    ...guardianLinks.map(l => l.ssn),
    ...payeeLinks.map(l => l.ssn),
    ...repLinks.map(l => l.ssn),
    ...applicantForLinks.map(l => l.ssn),
  ]));
  const managedPersons: ManagedPersonRef[] = await Promise.all(
    managedSsns.map(async (ssn) => {
      const displayName = await fetchDisplayNameForSsn(ssn);
      const rel =
        (guardianLinks.find(l => l.ssn === ssn)?.relationship_type) ??
        (payeeLinks.find(l => l.ssn === ssn)?.relationship_type) ??
        (repLinks.find(l => l.ssn === ssn)?.relationship_type) ??
        ('APPLICANT_FOR' as RelationshipType);
      return { ssn, displayName, relationship: rel };
    }),
  );

  // 6. Display name & person SSN
  const personSsn = selfLink?.ssn ?? null;
  let displayName = opts.displayNameFallback ?? 'Portal user';
  if (personSsn) {
    const name = await fetchDisplayNameForSsn(personSsn);
    if (name) displayName = name;
  }

  // 7. Best-effort audit
  void auditPersonaResolved(userId, Array.from(personas));

  return {
    userId,
    personas: Array.from(personas),
    personSsn,
    displayName,
    flags,
    managedPersons,
    managedClaims: submittedClaims,
    managedAwards: [...pensionerAwards, ...beneficiaryAwards],
    resolvedAt: new Date().toISOString(),
  };
}

/** Convenience predicate. */
export function hasPersona(ctx: PortalPersonaContext | null | undefined, p: Persona): boolean {
  return !!ctx?.personas.includes(p);
}
