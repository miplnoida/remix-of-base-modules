# Public Registration & SSN Linking Redesign

A multi-step wizard that lets a public user create an account, verify email or phone, and link their Social Security record automatically when identity match is strong — without manual moderation. Sensitive contribution features stay locked until a VERIFIED SELF link exists.

## Scope

In scope: claimant (insured-person) public registration. Employer/doctor flows untouched. Reuses existing tables wherever possible.

## Data model

Reuse existing tables — do **not** duplicate:

- `external_user_person_link` (already exists, 11 cols) — extend with: `match_score INT`, `match_method TEXT`, `verified_email BOOL`, `verified_phone BOOL`, `verified_by TEXT`, `relationship_type` constraint widened to SELF/CLAIMANT/GUARDIAN/PAYEE/REPRESENTATIVE/BENEFICIARY.
- `ip_master` — read-only source of truth for matching (ssn, date_of_birth, surname, first_name, mother_maiden_name, gender, etc.).
- Supabase `auth.users.user_metadata` — keep `display_name`, `portal_role`, `link_status`, plus new `email_verified`, `phone_verified` flags.
- `system_audit_trail` — every step writes an entry via existing `auditPortalAction`.
- `external_portal_feature_config` (already exists, 10 cols) — store the thresholds and toggles (no new table).

New tables (only where nothing equivalent exists):

- `external_verification_attempt` — channel (EMAIL/PHONE), destination_masked, status, attempt_count, expires_at, verified_at, rate-limit window.
- `external_identity_link_attempt` — user_id, attempted_ssn_masked, score, decision (AUTO_LINK/MANUAL_REVIEW/REJECT), created_at — used for rate limiting + audit.

Both new tables: RLS off (per project policy), GRANT to authenticated + service_role.

## Services

`src/services/external/identityLinkingService.ts` — single facade:

```text
startRegistration(payload)
sendEmailOtp(userId) / verifyEmailOtp(userId, code)
sendPhoneOtp(userId) / verifyPhoneOtp(userId, code)
attemptSsnLink(userId, candidate) -> { decision, score, personRef? }
calculateMatchScore(candidate, dbPerson) -> 0..100
createVerifiedSelfLink(userId, ssn, score)
createLimitedAccount(userId)
auditIdentityLinkAttempt(userId, decision, score)
getLinkStatus(userId)
```

Match scoring (server-side, in the service):

- Hard gates: SSN exact AND DOB exact — otherwise score = 0.
- Then weighted: surname fuzzy (30), first name fuzzy (25), mother's maiden / previous name (15), gender (10), email-on-record (10), phone-on-record (10).
- Fuzzy = normalized (lowercase, strip diacritics, collapse whitespace) + Levenshtein ratio ≥ 0.85.
- Thresholds read from `external_portal_feature_config`: `autoLinkThreshold` (default 85), `manualReviewThreshold` (default 60).
- Rate limit: max N attempts/day (config, default 5). Lockout response is generic.

## UI — registration wizard

New `src/portals/claimant/register/RegistrationWizard.tsx` with 4 steps + a result screen, mounted at `/claimant/register` and linked from `ClaimantLanding`.

- Step 1 Create account: email, mobile, password, terms checkbox. Uses existing `externalApiClient.registerExternalUser`.
- Step 2 Verify contact: tabbed Email / Phone OTP. Either one passing enables Next. Resend cooldown + retry limit from config.
- Step 3 Link SSN: SSN, DOB, first/last name, optional middle, optional previous/maiden, optional national ID. `noValidate` + ValidationSummary + inline errors per Validation-UX standards. SSN masked on display.
- Step 4 Result: AUTO_LINK → success animation + "Go to dashboard"; MANUAL_REVIEW → "Submit for review" or "Continue with limited access"; REJECT → "Continue with limited access". Messages are the friendly strings from the brief (no detailed mismatch reasons).

Re-uses Validation-UX, date, and phone standards already documented in `<project-knowledge>`.

## Feature gating

Single hook `useSelfLinkStatus()` reads the current user's `external_user_person_link` row for relationship=SELF status=VERIFIED.

- `ClaimantPortal` `buildSidebar` consults the hook; hides Contribution History, Employment History, Contribution Statement, Insurable Earnings, Payment Details, Bank Update when no verified SELF link.
- Dashboard shows a persistent banner: "Link your Social Security record to unlock contribution history and self-service benefits." with CTA → `/claimant/register?step=link` (re-enters the wizard at step 3 for already-authenticated users).
- Apply-for-Benefits product list filters by `bn_product.public_online_enabled` + each product's `requires_self_link` flag (Sickness/Age require SELF, Funeral/Survivors do not).

## Admin settings

Extend `external_portal_feature_config` with: `require_email_verification`, `require_phone_verification`, `allow_either_channel`, `auto_link_threshold`, `manual_review_threshold`, `max_ssn_attempts_per_day`, `enable_limited_accounts`, `enable_people_i_manage`, `enable_representative_access`. Surface in existing Super Admin → External Portal Settings page.

## Audit

Every step calls `auditPortalAction(action, payload)` writing to `system_audit_trail`:
REGISTRATION_STARTED, EMAIL_OTP_SENT, EMAIL_VERIFIED, PHONE_OTP_SENT, PHONE_VERIFIED, SSN_LINK_ATTEMPT, SSN_LINK_SUCCESS, SSN_LINK_FAIL, LIMITED_ACCOUNT_CREATED, IDENTITY_REVIEW_REQUESTED. SSN is masked in payload.

## Security

- Rate limit + lockout enforced server-side in `attemptSsnLink` against `external_identity_link_attempt`.
- Masked SSN in all logs, audit rows, and UI.
- Generic failure copy; never reveal which field mismatched.
- Email/phone OTP enforce single-use, expiry, retry cap.

## Files

New:
- `supabase/migrations/<ts>_external_registration_extensions.sql` — extend `external_user_person_link`, create the 2 attempt tables, extend `external_portal_feature_config` columns.
- `src/services/external/identityLinkingService.ts`
- `src/hooks/external/useSelfLinkStatus.ts`
- `src/portals/claimant/register/RegistrationWizard.tsx`
- `src/portals/claimant/register/steps/{CreateAccountStep,VerifyContactStep,LinkSsnStep,ResultStep}.tsx`
- `src/portals/claimant/register/SelfLinkBanner.tsx`

Edited:
- `src/portals/claimant/ClaimantPortal.tsx` — sidebar gating via `useSelfLinkStatus`, banner on dashboard.
- `src/portals/claimant/ClaimantLanding.tsx` — replace existing register CTA with the new wizard route.
- `src/portals/claimant/LinkSsnPage.tsx` — delegate to wizard step 3 to avoid two link paths.
- `src/services/external/portalFeatureConfigService.ts` — read new toggles/thresholds.
- `src/components/routing/AppRoutes.tsx` — register `/claimant/register` route.

## Verification

Manual scenarios from §15 of the brief — strong match auto-links; DOB mismatch returns generic failure; name typo passes when fuzzy ≥ threshold; limited account cannot reach `/claimant/account/contribution-statements`; Funeral Grant still visible in Apply for Benefits without SELF link; rate-limit kicks in after configured attempts.

## Out of scope (this iteration)

- Actual SMS provider wiring (uses Supabase phone OTP if enabled; otherwise stub with audit-only flow and TODO).
- Manual-review reviewer UI for admins (only the queue write happens here).
- People-I-Manage flow (kept behind feature flag, no UI changes here).
