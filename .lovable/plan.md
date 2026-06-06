
# Persona-Based Claimant Portal

Redesign the public-facing portal (currently `/claimant/*`) so the logged-in identity is decoupled from the **person** the data belongs to. Features become visible based on the user's verified relationship(s) to one or more SSNs.

## 1. Data model

### New table: `public.external_user_person_link`

Captures the verified relationship between an external portal user and one or more Social Security records.

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid — `auth.users.id` of the portal user |
| `ssn` | varchar — `ip_master.ssn` of the related person |
| `relationship_type` | enum: `SELF`, `GUARDIAN`, `PAYEE`, `REPRESENTATIVE`, `BENEFICIARY`, `APPLICANT_FOR` |
| `is_primary` | bool — only one `SELF` per user |
| `verification_status` | enum: `PENDING`, `VERIFIED`, `REJECTED`, `REVOKED` |
| `verified_at`, `verified_by` | audit |
| `notes` | text |
| `created_at`, `updated_at` | timestamps |

- Unique key `(user_id, ssn, relationship_type)`.
- DB CHECK: only `SELF` is treated as identity-equivalent — contribution privacy enforced in the resolver and policies, not by mixing types.
- `GRANT` to `authenticated`/`service_role`. RLS stays disabled per project policy; access is gated by service-layer + edge function checks.

### Audit table: `public.external_persona_audit`

Append-only log of persona-sensitive events (persona resolved, contributions viewed, claim viewed, document uploaded, etc.). Fields: `id`, `user_id`, `event_type`, `target_ssn`, `target_claim_id`, `target_award_id`, `payload jsonb`, `ip`, `user_agent`, `created_at`.

## 2. Persona resolver

`src/services/external/portalPersonaService.ts`

```ts
resolvePortalPersonas(userId): Promise<PortalPersonaContext>
```

Resolution sources (queried in parallel and union'd):

| Persona | Source |
|---|---|
| `INSURED_PERSON` | `external_user_person_link` where `relationship_type='SELF'` AND `verification_status='VERIFIED'`, joined to `ip_master.ssn` |
| `CLAIMANT` | `bn_claim` rows where `submitted_by_user_id = userId` OR linked via `external_user_person_link.APPLICANT_FOR` |
| `BENEFICIARY` | `bn_award_beneficiary.user_id = userId` OR `bn_claim_participant.kind='BENEFICIARY'` matched on email/ssn |
| `PAYEE` | `bn_award.payee_user_id = userId` |
| `GUARDIAN` | `external_user_person_link.relationship_type='GUARDIAN'` AND verified |
| `REPRESENTATIVE` | `external_user_person_link.relationship_type='REPRESENTATIVE'` AND verified |
| `PENSIONER` | `bn_award` active, where award holder SSN matches a `SELF` link of this user |

Returns:

```ts
{
  personas: Persona[];
  personSsn: string | null;            // own SSN if SELF link exists
  displayName: string;
  flags: {
    canViewContributions: boolean;     // === has SELF link only
    canViewEmploymentHistory: boolean; // === SELF
    canApplyForSelf: boolean;          // SELF or product allows non-insured applicants for self
    canApplyForOthers: boolean;        // GUARDIAN/PAYEE/REPRESENTATIVE/APPLICANT_FOR
    canManageDependants: boolean;      // GUARDIAN || PAYEE
    canViewPayments: boolean;          // PENSIONER || PAYEE || BENEFICIARY (own award)
  };
  managedPersons: Array<{ ssn; displayName; relationship }>;
  managedClaims: Array<{ id; claimNumber; benefitType; status; role }>;
  managedAwards: Array<{ id; awardNumber; benefitType; status; role }>;
}
```

- Pure read; emits one `PERSONA_RESOLVED` audit row per call.
- Memoized via `useQuery(['portalPersona', userId])` on the client.

## 3. Routes and shell

Replace the static `CLAIMANT_NAV` array in `src/portals/claimant/ClaimantPortal.tsx` with a derived nav driven by persona flags.

New pages under `src/portals/claimant/pages/`:

- `PersonaDashboard.tsx` — `/claimant/dashboard`. Sections rendered conditionally (see §4).
- `ManagedPersonsPage.tsx` — `/claimant/managed/people`
- `ManagedClaimsPage.tsx` — `/claimant/managed/claims`
- `ManagedAwardsPage.tsx` — `/claimant/managed/awards`
- `BeneficiaryAwardsPage.tsx` — `/claimant/beneficiary/awards`
- `ApplyForOthersPage.tsx` — `/claimant/apply-for-others`
- `LinkVerificationPage.tsx` — `/claimant/identity/links` — user requests/sees SELF/GUARDIAN/PAYEE links

Existing pages (`/claimant/contributions`, `/claimant/employment-history`, `/claimant/apply`) are kept but **gated** by the persona flags via a `<RequirePersonaFlag flag="canViewContributions">` wrapper that renders a clear "Not available for your account" message when blocked.

## 4. Dashboard sections (rule-based)

```text
+ Always: Welcome + persona chips (INSURED, CLAIMANT, ...)
+ If INSURED_PERSON:
    - Contribution Summary, Employment History, Contribution Statement
    - Apply for My Benefit, My Own Claims, My Awards/Pensions, My Payments
+ If CLAIMANT (without INSURED_PERSON):
    - Claims I Submitted, Applications for Someone Else
    - Pending Applicant Tasks, Documents Required, Messages/Letters
+ If BENEFICIARY:
    - Benefits Where I Am Beneficiary, Beneficiary Payment Status
    - School Certificate / Verification Tasks, Messages
+ If PAYEE / GUARDIAN / REPRESENTATIVE:
    - People I Manage, Claims I Manage, Awards I Manage
    - Pending Tasks, Upload Documents
    - Bank Update (if authorized for that award), Messages
+ If PENSIONER:
    - Award details, Payments, Life Certificate, EFT/Bank Update
```

Multi-persona users see all matching sections, grouped under section headers.

## 5. "Who are you applying for?" step

Add a first step to every public application form (`PortalFormRenderer.tsx` / `apply` flow).

Options shown based on persona + product config:

- Myself (only if `canApplyForSelf`)
- A deceased insured person (Funeral Grant / Survivor)
- A child / dependant (Guardian persona)
- Someone I represent (Representative)
- As guardian / payee
- As person responsible for funeral expenses (no relationship required, but flagged)

The selection is recorded on the claim as `applicant_role` and the resolved insured/deceased SSN is stored on `bn_claim_participant`. If "Myself" is not allowed, the form refuses to default the insured SSN to the user's SSN.

## 6. Contribution privacy enforcement

- Client guard: every contribution/employment-history page and hook checks `flags.canViewContributions === true`.
- Service guard: `publicBenefitApiClient` adds a `requireSelfLink(ssn)` helper called before any contribution-bearing request.
- Edge-function guard (server): a new edge function `claimant-data` (or new routes inside `public-benefits`) enforces:
  - `GET /contributions?ssn=...` → 403 unless caller has a `SELF` verified link to that SSN.
  - `GET /employment-history?ssn=...` → same rule.
  - `GET /payments` → must be award holder/payee/beneficiary on the award.
  - `GET /claims` → returns only claims where the user is applicant/participant; redacts insured-person contribution & wage fields when caller is not SELF.
- All blocked requests emit `CONTRIB_VIEW_DENIED` audit.

## 7. Claim status visibility for non-insured claimants

For `/claimant/claims/:id`, the API returns a redacted projection when caller is not the insured person:

Shown: claim number, benefit type, status, required actions, messages addressed to applicant, documents they submitted.

Hidden: insured person's contribution details, wage history, employer contribution details, medical details not addressed to the applicant.

## 8. Internal Claim Workbench — Participants tab

Extend `ClaimParticipantsTab` to clearly group participants by role: Applicant, Insured Person, Deceased Insured Person, Beneficiary, Payee, Guardian, Representative. Show which participant matches the `submitted_by_user_id` so the officer immediately sees "who logged in vs. who the claim is about". No behaviour changes to the existing accept/reject controls.

## 9. Audit events

Standard event types written to `external_persona_audit`:

`PERSONA_RESOLVED`, `CONTRIBUTIONS_VIEWED`, `EMPLOYMENT_HISTORY_VIEWED`, `CLAIM_VIEWED`, `MANAGED_PERSON_ACCESSED`, `REPRESENTATIVE_CLAIM_SUBMITTED`, `DOCUMENT_UPLOADED`, `PAYMENT_VIEWED`, `CONTRIB_VIEW_DENIED`, `LINK_REQUESTED`, `LINK_VERIFIED`, `LINK_REVOKED`.

## 10. Tests / acceptance scenarios

Manual + scripted checks for each persona pattern listed in the request (A–F). Verification harness in `scripts/qa/portalPersona.test.ts` (Node script that calls the resolver against seeded users) plus an edge-function curl matrix.

Final acceptance:
- Contribution/employment features visible only to verified SELF-linked users.
- Claimant-only users never see insured-person contribution data, in UI or API.
- Multi-persona users see grouped sections correctly.
- Edge functions enforce the same flags returned by the resolver.
- TypeScript build passes.

## Delivery in phases

To keep PRs reviewable, ship in three sequenced PRs (each independently testable):

1. **PR-A (foundation)** — `external_user_person_link`, `external_persona_audit`, `portalPersonaService`, `useClaimantPersona` hook, audit writer, seed a `SELF` link for the test claimant user. No UI changes yet.
2. **PR-B (UI gating)** — Persona-driven nav + `PersonaDashboard`, gates on contribution/employment pages, "Who are you applying for?" step, redacted claim view.
3. **PR-C (server enforcement + workbench polish)** — Edge-function checks for `contributions`, `employment-history`, `payments`, `claims`; redaction in claim-detail endpoint; participants-tab grouping; audit wiring for all viewer events.

## Out of scope

- Identity-proofing UI (how a user *acquires* a verified `SELF` link beyond a basic "request link" form — full KYC flow is a separate effort).
- Beneficiary self-service signup. We assume internal staff verify links for now.
- Changing the existing internal staff portals or `/bn/*` workbench routes beyond the Participants tab grouping.

## Open questions to confirm before PR-A

1. For the prototype/test environment, can we auto-seed a verified `SELF` link for the current preview user against their matching `ip_master.ssn` (so the dashboard is testable immediately)?
2. Should `BENEFICIARY` persona detection match on email when no explicit user link exists, or strictly via `external_user_person_link`?
3. Are there any products today that allow "Apply for Myself" without a verified SELF link (e.g. first-time registrant flows)? If yes, list them so we don't lock them out.
