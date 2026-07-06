# SSB Admin Policy Configuration — Fix Acceptance

**Date:** 2026-07-06
**Scope:** St. Kitts & Nevis (KN) SSB Administration Policy Configuration
**Goal:** Make `/admin/ssb-setup` a real central configuration console and
`/admin/configuration-governance` governance-only, with health driven by
actual SSB policy data.

---

## 1. What was link-only before

Every section under `/admin/ssb-setup` previously rendered only a
`SectionCard` with an "Open canonical CRUD" button that navigated to a
shared engine screen (Geography, Identity, Numbering, Bank Master, etc.).
No SSB-specific policy could be authored or lifecycle-managed from this
page. Configuration Governance therefore had nothing to evaluate and
displayed `Unknown` health for every asset.

## 2. What is editable now

Each of the 9 required sections is a real policy configuration surface with
Draft → Scheduled → Active → Retired lifecycle wired to
`ssbPolicyLifecycleService`. Common behaviour lives in one shared shell
(`SsbPolicySectionShell`) so the 9 forms are consistent and small.

| Section | URL (deep link) | Policy table |
|---|---|---|
| Address & Geography    | `/admin/ssb-setup?section=address`       | `ssb_address_policy` |
| Identity / NIS         | `/admin/ssb-setup?section=identity`      | `ssb_identity_policy` |
| Numbering              | `/admin/ssb-setup?section=numbering`     | `ssb_numbering_policy` |
| Contribution Calendar  | `/admin/ssb-setup?section=contribution`  | `ssb_contribution_calendar_policy` |
| Financial / Payment    | `/admin/ssb-setup?section=financial`     | `ssb_financial_policy` |
| Legal                  | `/admin/ssb-setup?section=legal`         | `ssb_legal_policy` |
| Documents              | `/admin/ssb-setup?section=documents`     | `ssb_document_policy` |
| Communication          | `/admin/ssb-setup?section=communication` | `ssb_communication_policy` |
| Workflow / SLA         | `/admin/ssb-setup?section=workflow`      | `ssb_workflow_policy` |

Every form supports:

- New draft (creates DRAFT row, version 1)
- Edit DRAFT / SCHEDULED in place
- **Edit ACTIVE clones a new DRAFT first** — active rows are never overwritten
- Approve (records approver + timestamp)
- Schedule (future effective date, status → SCHEDULED)
- Activate (supersedes existing active row for same scope, flips to ACTIVE)
- Retire (never hard-deletes; closes `effective_to`, keeps history)
- Version list showing status, is_current, version_no and effective window

## 3. Screens still referenced only (not duplicated)

The following engine screens are the canonical CRUD for their master data
and are only **referenced** by SSB Setup — never duplicated here:

- Geography domain (`/admin/master-data/countries`, parishes, villages)
- Identity types domain (`/admin/master-data/identity-types`)
- Platform Numbering (`/admin/numbering`)
- Financial Reference: banks, currencies, payment channels
- Legal Reference (`/admin/legal-references`)
- DMS document types (`/admin/dms/document-types`)
- Communication templates (`/admin/templates`)
- Workflow engine (`/admin/workflow`)

SSB Setup only stores the **binding** and **implementation-specific policy**
on top of these engines in `ssb_*_policy` tables.

## 4. Policy tables updated

No schema changes. All 9 `ssb_*_policy` tables already carry the lifecycle
columns from `SSB_POLICY_LIFECYCLE_ACCEPTANCE.md`:
`status`, `effective_from`, `effective_to`, `version_no`, `is_current`,
`supersedes_policy_id`, `approved_by`, `approved_at`, `retired_*`.

Writes go through the shared shell → `ssbPolicyLifecycleService` for
lifecycle actions, or direct `UPDATE / INSERT` for DRAFT / SCHEDULED rows.

## 5. Validation health rules (real policy checks)

Health is computed by `src/services/ssb/ssbPolicyHealthService.ts`.

| Verdict | Meaning |
|---|---|
| `ready`    | Required fields present, no known gaps |
| `partial`  | Policy exists but recommended items missing |
| `missing`  | No `is_current` policy row |
| `deferred` | Explicit deferral marker (e.g. SMS `DEFERRED` in notes) |
| `error`    | Multiple current rows / invalid data |

Per-asset rules:

- **Address** — mandatory field list not empty; single current row per country
- **Identity** — exactly one primary type, ≥ 2 accepted types
- **Numbering** — MEMBER + EMPLOYER required; CLAIM/BENEFIT recommended
- **Contribution Calendar** — one current row with period + filing & payment due days
- **Financial** — CURRENCY binding, ≥ 1 active PAYMENT_CHANNEL, BANK_LIST bound (deferred allowed)
- **Legal** — at least one governing act binding, ≥ 3 legal sections
- **Documents** — MEMBER + EMPLOYER policies present, ≥ 1 mandatory doc
- **Communication** — active LETTER template; SMS deferred → `deferred`
- **Workflow** — MEMBER + EMPLOYER + CLAIM workflows with SLA hours

## 6. BN readiness status

Configuration Governance validation now uses the same health verdicts:

**Blocking (BN blocked while any of these are `missing` or `error`):**
`ssb.address`, `ssb.identity`, `ssb.numbering`,
`ssb.contribution_calendar`, `ssb.financial`, `ssb.legal`,
`ssb.documents`, `ssb.workflow`.

**Warnings (do not block BN):** partial policies, incomplete communication
templates, unverified bank list, KN holiday set partial, legal chapter
reconciliation pending. **SMS deferred** is recorded as **info**, not a
warning, because it is an explicit MVP decision.

## 7. Governance stays governance-only

`/admin/configuration-governance` still owns Registry, Dependencies,
Packages, Validation, Snapshots and Impact — no editing UI. Every row in
the Registry now shows a **Configure** button that deep-links to the exact
SSB Setup section (`/admin/ssb-setup?section=<key>`), plus computed health
verdict and up to two health reason lines. When no policy binding exists
for the asset a **Reference** button appears instead, opening the shared
engine CRUD.

## 8. No duplicate master / shared-domain CRUD

Confirmed. Only `ssb_*_policy` writes happen from SSB Setup. Shared-domain
tables (`ssp_*`, `core_number_sequence`, `core_template`, `public_holidays`,
etc.) remain owned by their engines and are only referenced.

## 9. No legacy impact

No BN / BEMA / IA / IP / ER / CL / CN or `bn_*` / `bema_*` / `ia_*` table
is read, altered or migrated. Compliance, Legal, Finance and Claims
modules are unchanged and continue to consume config through
`ssbPolicyLifecycleService`.

## 10. Files added / edited

**Added**
- `src/services/ssb/ssbPolicyHealthService.ts`
- `src/components/admin/ssb/SsbPolicySectionShell.tsx`
- `src/components/admin/ssb/sections/AddressPolicyForm.tsx`
- `src/components/admin/ssb/sections/IdentityPolicyForm.tsx`
- `src/components/admin/ssb/sections/NumberingPolicyForm.tsx`
- `src/components/admin/ssb/sections/ContributionCalendarPolicyForm.tsx`
- `src/components/admin/ssb/sections/FinancialPolicyForm.tsx`
- `src/components/admin/ssb/sections/LegalPolicyForm.tsx`
- `src/components/admin/ssb/sections/DocumentPolicyForm.tsx`
- `src/components/admin/ssb/sections/CommunicationPolicyForm.tsx`
- `src/components/admin/ssb/sections/WorkflowPolicyForm.tsx`

**Edited**
- `src/pages/admin/SsbSetupPage.tsx` — `?section=` deep link, 9 real forms
- `src/pages/admin/ConfigurationGovernancePage.tsx` — coloured health, Configure deep link
- `src/services/ssb-configuration/ssbConfigurationGovernanceService.ts` — health injection, validation via health service

## 11. Acceptance checklist

- [x] `/admin/ssb-setup` has real policy forms for all 9 required sections
- [x] `/admin/configuration-governance` no longer shows `Unknown` for evaluable assets
- [x] Governance "Configure" opens the exact policy section via `?section=`
- [x] BN readiness is decided by real active SSB policies (validation runner uses health service)
- [x] Lifecycle preserved — active policies never overwritten; editing active clones a draft
- [x] No duplicate master/shared CRUD created
- [x] No BN / BEMA / IA / legacy table changed
