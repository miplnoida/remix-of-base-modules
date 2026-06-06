# Public Website + External Portal Registration — Plan

## What already exists (do not duplicate)

- **Auth**: Supabase auth, `/login`, `/forgot-password`, `/reset-password`, `/mfa-verify`, `externalAuthService` wraps `supabase.auth` and reads `user_metadata.portal_role`.
- **Portals**: `/claimant/*` (rebuilt), `/employer/*`, `/doctor/*`, `/external/tasks/:token` (SecureTaskPage), `/portals` hub.
- **Services**: `portalPersonaService`, `portalFeatureConfigService` (Super Admin flags), `auditPortalAction` (`external_persona_audit`), `seedSelfLink`, `publicBenefitApiClient`.
- **DB**: `external_user_person_link`, `external_persona_audit`, `external_portal_feature_config`, `ip_master`, `er_master`, `system_audit_trail`, `auth.users`. No public sign-up route exists today.
- **Public**: only `/public/api-docs` and `/public/benefit/:productCode` exist — no marketing site.

## Scope (delivered in 4 PRs)

### PR-A — Public Website shell (marketing, no business logic)
- `src/pages/public/PublicLayout.tsx` — top nav (Services, Benefits, Contributions, Employers, Medical Providers, Help, Contact) + sign-in / register CTAs, public footer.
- Routes (all public, unauthenticated):
  - `/public` Home
  - `/public/services`, `/public/benefits`, `/public/contributions`, `/public/employers`, `/public/medical-providers`
  - `/public/contact`, `/public/help`
  - `/public/register`, `/public/login` (login is a thin wrapper that delegates to the existing Supabase sign-in; no second auth stack)
- Plain content pages — every CTA links into a portal route (`/claimant/apply`, `/employer/c3`, `/doctor/tasks`, `/external/tasks/:token`). The public website never executes business logic itself.

### PR-B — Unified Registration Wizard
- `src/pages/public/register/RegisterWizard.tsx` with 6 steps:
  1. **Account type** — Insured/Claimant · Employer · Doctor · "I have a secure task link" (redirects to `/external/tasks/:token` input).
  2. **Email and/or mobile** — at least one required.
  3. **Verification** — Supabase email OTP (`signInWithOtp`) **or** phone OTP (`signInWithOtp({phone})`); succeed if either is verified. Audit `REGISTRATION_VERIFY_EMAIL` / `_PHONE`.
  4. **Basic profile** — display name, preferred language; writes `auth.user_metadata` (`display_name`, `portal_role`, `phone_verified`, `email_verified`).
  5. **Link to Social Security record** — type-specific (see PR-C/D).
  6. **Dashboard redirect** — by `portal_role` (`/claimant/dashboard`, `/employer/dashboard`, `/doctor/dashboard`).
- Progress bar with friendly copy ("Create your online account", "You can still apply even if we can't link your SSN now"). All language plain — no "participant", "product version", etc.
- New shared service: `src/services/external/externalApiClient.ts` exporting the contract listed in the brief (`registerExternalUser`, `verifyEmailOtp`, `verifyPhoneOtp`, `linkInsuredPerson`, `registerEmployerUser`, `registerMedicalProviderUser`, `getPortalPersonas`, `getPortalFeatureFlags`, `getDashboardSummary`, `getAvailableServices`). Internally delegates to Supabase auth + existing services so we don't fork data paths.

### PR-C — Insured Person / Claimant linking
- Step 5 prompts SSN + date of birth + one extra field (mother's maiden name or last employer regno when present in `ip_master`).
- On match: insert verified row into `external_user_person_link` (relationship `SELF`, status `VERIFIED`) — reuses `seedSelfLink` style helper but driven by user input. Audit `SSN_LINK_SUCCESS`.
- On miss: persona becomes `CLAIMANT` only — dashboard hides contribution/employment/earnings tiles via existing `RequirePersonaFlag` + `usePortalFeatureConfig`. Show banner: "We couldn't verify your record yet. You can still apply for benefits." Audit `SSN_LINK_FAIL`.
- Funeral applicant flow: a flag `applyingForDeceased` skips linking but allows `Funeral Grant` product (already enforced by `useProductApplicability.allowsOthers`).

### PR-D — Employer + Doctor + admin approval
- Employer step 5: regno lookup against `er_master`; show employer name to confirm; optional authorization-letter upload to `ip_documents` style storage; create a pending row in a new `external_user_employer_link` table with `status = 'PENDING_APPROVAL'` and role (`EMPLOYER_ADMIN` / `PAYROLL_OFFICER` / `HR_OFFICER` / `BENEFIT_CONFIRMATION`). Audit `EMPLOYER_LINK_REQUESTED`.
- Doctor step 5: similar — license lookup, optional document, `external_user_provider_link` with role `MEDICAL_OFFICER`. Audit `PROVIDER_LINK_REQUESTED`.
- New admin page at `/admin/external-portal-approvals` (super admin only) listing pending employer + provider requests with Approve/Reject + reason, writing to `system_audit_trail`.
- Until approved, employer/doctor portal shows the existing `RequireFeature` "awaiting approval" empty state.

## Security & UX rules (applied across all PRs)

- Email **or** phone verification is the minimum bar for portal entry.
- "Sensitive" tiles (contributions, bank update, payments) remain gated by `personaFlags` set only via verified `external_user_person_link`.
- OTP attempts rate-limited via existing Supabase auth throttling (no custom backend limiter — per project memory).
- Every flow step writes to `external_persona_audit` via `auditPortalAction` and high-impact events also to `system_audit_trail`.
- Secure task tokens already implemented in `SecureTaskPage`; PR-A only adds a "I have a link" entry tile pointing to it.
- No internal LAN routes exposed: public layout only links to `/public/*` and external portal entry points.

## Tech notes (for the technical reader)

```text
src/
├── pages/public/
│   ├── PublicLayout.tsx           (PR-A)
│   ├── Home.tsx, Services.tsx, …  (PR-A)
│   └── register/
│       ├── RegisterWizard.tsx     (PR-B)
│       ├── steps/                 (PR-B/C/D)
│       └── LinkInsuredStep.tsx    (PR-C)
├── services/external/
│   ├── externalApiClient.ts       (PR-B, façade over existing services)
│   └── linkAccountService.ts      (PR-C/D)
└── pages/admin/
    └── ExternalPortalApprovals.tsx (PR-D)
```

New tables (PR-D only):
- `external_user_employer_link(user_id, regno, role, status, requested_at, approved_at, approved_by, …)`
- `external_user_provider_link(user_id, license_no, role, status, requested_at, …)`

Both will follow the public-schema GRANT contract (authenticated SELECT/INSERT/UPDATE on own row, service_role full). RLS stays mostly off per project memory; column-level checks live in service-layer code.

## Out of scope for this plan

- Replacing Supabase auth with a custom provider.
- Public knowledge-base content (uses existing `kb_articles` later).
- Internal admin workflow redesign — only the new approvals page is added.

## Suggested order

PR-A → PR-B → PR-C → PR-D, each ending in a TypeScript build check. Approve this plan and I'll start with PR-A.
