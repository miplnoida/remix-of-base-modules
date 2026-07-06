# SSB Canonical Policy Framework

**Status:** Approved standard for all SSB policies (St. Kitts & Nevis)
**Scope:** Address, Identity, Numbering, Contribution Calendar, Financial, Legal, Documents, Communication, Workflow
**Non-goal:** No BN/BEMA/IA/legacy table changes. No business functionality changes in this document — this defines the shared template only.

---

## 1. Audit of existing policy implementations

Snapshot of the current state across the nine SSB policy families. Column meanings:

- **Header** — the `ssb_<domain>_policy` table
- **Children** — relational child tables holding repeatable/optional rules
- **Lifecycle** — draft → review → approved → active → superseded flow implementation
- **Resolver** — service that returns the active policy to consumers
- **Validation** — governance validator that scores the policy
- **UI** — the section form under `/admin/ssb-setup`
- **JSON residue** — any JSON columns still driving *active* logic (audit/snapshot JSON is allowed)

| Policy | Header | Children | Lifecycle | Resolver | Validation | UI | JSON residue |
|---|---|---|---|---|---|---|---|
| Address | `ssb_address_policy` | `ssb_address_policy_field`, `ssb_address_policy_admin_level` | ✅ `ssbPolicyLifecycleService` (clones children) | ✅ | ✅ governance + health | ✅ relational editor | none |
| Contribution Calendar | `ssb_contribution_calendar_policy` | `ssb_contribution_calendar_weekend_day` | ✅ (clones weekend rows) | ✅ `ssbContributionCalendarService` | ✅ 12-month preview | ✅ rule-based form + preview | none |
| Identity | `ssb_identity_policy` | *(none — flat columns)* | ⚠ header-only lifecycle | ⚠ direct select | partial | flat form | none |
| Numbering | `ssb_numbering_policy` | *(none — flat columns)* | ⚠ header-only | ⚠ direct select | partial | flat form | none |
| Financial | `ssb_financial_policy` | *(none — flat columns)* | ⚠ header-only | ⚠ direct select | partial | flat form | none |
| Legal | `ssb_legal_policy` | *(none — flat columns)* | ⚠ header-only | ⚠ direct select | partial | flat form | none |
| Documents | `ssb_document_policy` | *(none — flat columns)* | ⚠ header-only | ⚠ direct select | partial | flat form | none |
| Communication | `ssb_communication_policy` | *(none — flat columns)* | ⚠ header-only | ⚠ direct select | partial | flat form | none |
| Workflow | `ssb_workflow_policy` | *(none — flat columns)* | ⚠ header-only | ⚠ direct select | partial | flat form | none |

**Findings**

1. Only Address and Contribution Calendar fully implement the target relational + lifecycle-aware pattern.
2. The other seven policies are header-only. They already avoid JSON for active logic (audit confirmed in `SSB_POLICY_JSON_USAGE_AUDIT.md`) but they do not yet expose the canonical lifecycle clone-on-edit semantics for future child rows, and their resolvers/validators are hand-written per policy rather than using a shared contract.
3. All nine share `ssb_policy_audit` and `ssb_configuration_snapshot` (snapshot JSON — permitted).
4. Business Processes panel + Configuration Governance both already consume policies via `resolveActive*` helpers — a shared resolver contract is achievable without changing consumers.

---

## 2. Canonical Policy Framework

Every SSB policy MUST implement the eight interfaces below. Policies with no repeatable rules (e.g. Identity today) still declare the interfaces; the child-table set may be empty.

### 2.1 Standard Header

Table: `ssb_<domain>_policy`

Mandatory columns (in addition to domain-specific columns):

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | |
| `country_code` | text | Scope (e.g. `KN`) |
| `version` | int | Monotonic per country |
| `status` | text | `draft` \| `in_review` \| `approved` \| `active` \| `superseded` |
| `effective_from` | date | |
| `effective_to` | date null | |
| `is_active` | bool | Denormalised for fast resolver lookup |
| `created_by` / `updated_by` | text | UserCode (per project rule) |
| `created_at` / `updated_at` | timestamptz | |
| `approved_by` / `approved_at` | text / timestamptz | |
| `superseded_by_policy_id` | uuid null | Points to the successor row |

Exactly one row per `country_code` may have `is_active = true`.

### 2.2 Standard Child Pattern

Naming: `ssb_<domain>_policy_<child_noun>` (singular child noun).

Every child table:

- `id` uuid PK
- `policy_id` uuid FK → `ssb_<domain>_policy(id)` **ON DELETE CASCADE**
- `sort_order` int (when order matters)
- domain columns
- `created_at` / `updated_at` timestamptz

Children are **owned** by exactly one policy version. Editing an *active* policy is forbidden — the lifecycle service clones header + all children into a new draft (see 2.3). No JSON arrays for active configuration; snapshots and audit payloads may remain JSON.

### 2.3 Standard Lifecycle

Implemented in `src/services/ssb/ssbPolicyLifecycleService.ts`.

```
draft ──submit──▶ in_review ──approve──▶ approved ──activate──▶ active
                                                                     │
                                              new draft ◀──clone─────┤
                                                                     ▼
                                                              superseded
```

Rules:

1. `createNewVersion(policyId)` clones the header (new `id`, `status='draft'`, `version = max+1`, `is_active=false`) and **deep-clones every registered child table**. Child cloning is metadata-driven via `POLICY_CHILD_REGISTRY` so new policies opt-in by declaring their child tables.
2. `activate(policyId)` runs in a transaction: sets old active row `status='superseded'`, `is_active=false`, `effective_to=today-1`; sets new row `status='active'`, `is_active=true`, `effective_from=today`; writes `ssb_policy_audit`.
3. Only `draft` rows are editable. `approved` and `active` rows are immutable.
4. Rollback = activate a previous version by id.

### 2.4 Standard Validation

Every policy exports a validator with the signature:

```ts
type PolicyValidator = (ctx: {
  policy: PolicyHeader;
  children: Record<string, unknown[]>;
  country: CountryContext;
}) => Promise<{
  errors: Array<{ code: string; field?: string; message: string }>;
  warnings: Array<{ code: string; field?: string; message: string }>;
  score: number; // 0..100
}>;
```

Codes use `SSB.E<###>` for errors and `SSB.W<###>` for warnings. Governance service aggregates all validators and produces the score published to `/admin/configuration-governance`.

### 2.5 Standard Resolver

Every policy exports:

```ts
resolveActivePolicy(countryCode: string): Promise<{
  header: PolicyHeader;
  children: Record<string, unknown[]>;
} | null>;
```

Resolver contract:

- Returns exactly one row where `is_active=true` and `country_code = ?`, plus all child rows joined by `policy_id`.
- Consumers MUST NOT read the header table directly.
- Resolver is pure/side-effect free; cache invalidation is triggered by `activate()`.

### 2.6 Standard UI Layout

Under `/admin/ssb-setup` each policy renders inside `SsbPolicySectionShell` with four regions:

1. **Header strip** — version badge, status pill, effective window, action buttons (Edit → clone, Submit, Approve, Activate, Rollback).
2. **Policy body** — form for header fields.
3. **Child editors** — one grid per child table, add/remove/reorder.
4. **Preview / Governance panel** — validator output (errors, warnings, score) plus any policy-specific preview (e.g. 12-month due-date preview for Contribution Calendar).

Rules:

- Active policies render read-only; the `Edit` action clones to a draft.
- No JSON textareas for active configuration.
- All labels sourced from the same section shell to guarantee consistency.

### 2.7 Standard Governance Integration

`ssbConfigurationGovernanceService` registers each policy through `POLICY_REGISTRY` and:

- Runs the policy's validator on demand and on activation.
- Records blocking errors on `ssb_configuration_validation_result`.
- Publishes readiness to `ssb_setup_readiness` per business process.
- Emits `SSB.E013.PREVIEW` when a preview computation fails.

### 2.8 Standard Business Process Integration

`ssbBusinessProcessConfigService` maps each business process (Employer Registration, Contribution Collection, Benefit Administration, etc.) to the set of policies it depends on. Readiness = all required policies `active` AND validator returns zero blocking errors.

Business processes never bypass the resolver.

---

## 3. Mandatory interfaces (summary)

Each policy module MUST export:

```ts
export const policyDescriptor = {
  domain: 'address' | 'identity' | 'numbering' | 'contribution_calendar' |
          'financial' | 'legal' | 'document' | 'communication' | 'workflow',
  headerTable: 'ssb_<domain>_policy',
  childTables: ReadonlyArray<{ table: string; cloneOnVersion: true }>,
  resolveActivePolicy,
  validate,
};
```

Registered in `src/services/ssb/policyRegistry.ts` so lifecycle, governance, and UI can enumerate policies generically.

---

## 4. Child-table naming conventions

- Prefix: `ssb_<domain>_policy_`
- Singular child noun: `_field`, `_admin_level`, `_weekend_day`, `_channel`, `_component`, `_requirement`, `_binding`, `_reference`, `_rule`
- FK column always `policy_id`
- Ordering column always `sort_order` when order-sensitive
- No `is_active` on child rows — activation is owned by the header

---

## 5. Lifecycle sequence

1. User clicks **Edit** on an active policy → `createNewVersion` clones header + children → returns `draftId`.
2. User edits draft (header + child grids).
3. User clicks **Submit for review** → status `in_review`, validator runs, warnings shown.
4. Reviewer clicks **Approve** → status `approved`, immutable.
5. Reviewer clicks **Activate** → transactional swap with current active, audit row written, governance recomputed.
6. Rollback = activate an earlier version id.

---

## 6. Validation sequence

1. Header field checks (required, type, range).
2. Child-row structural checks (min/max counts, uniqueness).
3. Cross-field policy checks (e.g. calendar rule + weekend days consistency).
4. Cross-policy checks delegated to governance service (e.g. Numbering vs. Identity prefix collision).
5. Preview computation (where applicable) — failure = `SSB.E013.PREVIEW`.

---

## 7. Resolver contract

- Signature fixed (see 2.5).
- Must be safe to call from any module (BN, BEMA, IA, Employer, Contributions, Claims, Compliance, Finance).
- Never returns partially loaded children — either full result or `null`.
- Never returns non-active rows.

---

## 8. Governance contract

- Every validator registered in `POLICY_REGISTRY`.
- Governance run outputs: `{ policyDomain, status, errorCount, warningCount, score }`.
- Business process readiness derived from validator output only — never from ad-hoc checks in components.

---

## 9. UI contract

- All policy sections mounted via `SsbPolicySectionShell`.
- Read-only when active. Clone-on-edit is the only mutation path.
- No hand-rolled JSON editors for active configuration.
- Governance panel is a first-class region, not an afterthought.

---

## 10. Migration strategy for remaining policies

Per remaining policy (Identity, Numbering, Financial, Legal, Documents, Communication, Workflow):

1. **Register** in `POLICY_REGISTRY` with existing header — no schema change if no child rows are needed yet.
2. **Wrap** the existing resolver into the canonical `resolveActivePolicy` signature.
3. **Wrap** the existing validator into the canonical `PolicyValidator` signature.
4. **Mount** the section form inside `SsbPolicySectionShell` if it is not already.
5. **Extract child tables only where a repeatable rule already exists in the header as a delimited/JSON-shaped column** — see `SSB_POLICY_JSON_USAGE_AUDIT.md`. Do not invent child tables to re-shape data that is already properly relational.
6. **Enable clone-on-edit** by adding the policy's child list (possibly empty) to `POLICY_CHILD_REGISTRY`.
7. **Governance registration** — validator wired into `ssbConfigurationGovernanceService`.
8. **UAT** — activate a v2 of each policy, confirm resolver + business process readiness unchanged for consumers.

No BN/BEMA/IA/legacy table is touched by any of the above.

---

## 11. Rollback

Framework changes are additive:

- New tables `POLICY_REGISTRY` / `POLICY_CHILD_REGISTRY` live in code only.
- No column drops on existing headers.
- Reverting a single policy = remove its registry entry; existing screens continue to work against the previous hand-written resolver.
