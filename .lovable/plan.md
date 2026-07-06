## Goal

Turn `/admin/ssb-setup` into a real central policy configuration console for St. Kitts & Nevis SSB, and turn `/admin/configuration-governance` into governance-only with accurate, policy-driven health.

## Scope guardrails

- KN SSB only. No BN / BEMA / IA / legacy tables touched.
- No new Master Data or Shared Domain CRUD. We only bind existing masters into `ssb_*_policy` tables.
- No new scattered admin routes. Everything lives under `/admin/ssb-setup` (with a `?section=` deep link) and `/admin/configuration-governance`.
- Lifecycle stays exactly as documented in `SSB_POLICY_LIFECYCLE_ACCEPTANCE.md` — draft → scheduled → active → retired via `ssbPolicyLifecycleService`. Active policies are never overwritten; edits create a new version.

## What changes

### 1. SSB Setup page (`/admin/ssb-setup`) — real forms per section

Refactor `SsbSetupPage.tsx` into a section-driven console. Section is driven by `?section=<key>` so Governance can deep-link to it. Sections:

| Section key | Table | Real form fields |
|---|---|---|
| `address` | `ssb_address_policy` | Address components included, mandatory/optional flags, display order, validation regex, geo hierarchy binding, effective_from, status |
| `identity` | `ssb_identity_policy` | Per identity type: enabled, mandatory, primary flag, regex, min/max length, checksum ref, issuing authority |
| `numbering` | `ssb_numbering_policy` | Per entity (MEMBER, EMPLOYER, CLAIM, BENEFIT): prefix, sequence code, length, padding, reset policy |
| `contribution` | `ssb_contribution_calendar_policy` | Period type, filing due day, payment due day, grace days, interest start rule, working-week ref |
| `financial` | `ssb_financial_policy` | Default currency, allowed payment channels (multi), allowed banks marker, rounding rule, settlement method(s), account types |
| `legal` | `ssb_legal_policy` | Applicable act (from `ssp_legal_act`), bound sections, appeal timelines, statutory deadlines |
| `documents` | `ssb_document_policy` | Per process (member/employer/claim/benefit): required doc types, mandatory/optional, expiry required, verification required |
| `communication` | `ssb_communication_policy` | Per process/channel: template binding, sender default, SMS/letter deferred flag |
| `workflow` | `ssb_workflow_policy` | Per process: workflow ref, SLA hours, approval levels, escalation policy, assignment policy |

Each section shows: current ACTIVE version summary, editable Draft form, list of SCHEDULED / SUPERSEDED / RETIRED versions, and lifecycle buttons (Save Draft, Approve, Schedule, Activate, Retire) wired to existing `ssbPolicyLifecycleService`.

Section shell is one shared component (`SsbPolicySectionShell`) so the 9 sections stay consistent and small.

### 2. Policy health service

Add `src/services/ssb/ssbPolicyHealthService.ts`. For each asset key it inspects the `is_current` row of the bound `ssb_*_policy` table and returns one of: `ready | partial | missing | deferred | error`, with reasons.

Rules:

- `missing` — no current row.
- `error` — overlapping active rows or invalid regex/length.
- `deferred` — row exists with an explicit `deferred=true` marker (e.g. SMS channel, bank list).
- `partial` — required fields present but optional/recommended missing (e.g. no letter template bound, no bank list).
- `ready` — all required fields present.

### 3. Configuration Governance — governance only, real health, deep links

Update `ConfigurationGovernancePage.tsx` and `ssbConfigurationGovernanceService.ts`:

- Registry Health column reads from `ssbPolicyHealthService`, no more `Unknown` for evaluable assets.
- Each Registry row gets a "Configure" button that navigates to `/admin/ssb-setup?section=<key>` (mapping in table above), replacing the generic canonical-route link.
- Validation run uses the real health checks — blocking errors for missing address / identity / numbering / contribution / financial / legal / document / workflow policies; warnings for communication templates incomplete, bank list unverified, SMS deferred, legal chapter reconciliation, calendar holidays partial.
- No editing forms inside Governance. Package / Snapshot / Impact tabs unchanged behaviour, wired to updated validation output.

### 4. Documentation

Create `docs/social-security/SSB_ADMIN_POLICY_CONFIGURATION_FIX_ACCEPTANCE.md` covering: link-only vs editable now, referenced-only screens, tables updated, validation health rules, BN readiness impact, no-duplicate-CRUD confirmation, no legacy impact.

## Files

**New**
- `src/components/admin/ssb/SsbPolicySectionShell.tsx` — shared version list + lifecycle actions wrapper
- `src/components/admin/ssb/sections/AddressPolicyForm.tsx`
- `src/components/admin/ssb/sections/IdentityPolicyForm.tsx`
- `src/components/admin/ssb/sections/NumberingPolicyForm.tsx`
- `src/components/admin/ssb/sections/ContributionCalendarPolicyForm.tsx`
- `src/components/admin/ssb/sections/FinancialPolicyForm.tsx`
- `src/components/admin/ssb/sections/LegalPolicyForm.tsx`
- `src/components/admin/ssb/sections/DocumentPolicyForm.tsx`
- `src/components/admin/ssb/sections/CommunicationPolicyForm.tsx`
- `src/components/admin/ssb/sections/WorkflowPolicyForm.tsx`
- `src/services/ssb/ssbPolicyHealthService.ts`
- `docs/social-security/SSB_ADMIN_POLICY_CONFIGURATION_FIX_ACCEPTANCE.md`

**Edited**
- `src/pages/admin/SsbSetupPage.tsx` — section router driven by `?section=`, mounts the 9 forms
- `src/pages/admin/ConfigurationGovernancePage.tsx` — health from health service, "Configure" deep links
- `src/services/ssb-configuration/ssbConfigurationGovernanceService.ts` — validation delegates to health service

No database migrations. All 9 `ssb_*_policy` tables already exist with lifecycle columns.

## Acceptance

- Each of the 9 sections shows a real editable draft form and version history, not just a link.
- Registry Health shows Ready / Partial / Missing / Deferred / Error for every evaluable asset, no `Unknown`.
- Governance "Configure" button opens the exact SSB Setup section via `?section=`.
- BN readiness on the Governance page reflects real active-policy checks.
- No new master or shared-domain screens. No BN / BEMA / IA / legacy table touched.
