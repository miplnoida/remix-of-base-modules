# SSB Policy Standardization — Wave 1 Acceptance

Status: DELIVERED
Focus: Social Security Board — St. Kitts & Nevis
Scope: Bring all 9 SSB policies onto the canonical framework via a single-source-of-truth registry.
Non-goal: No BN / BEMA / IA / legacy table modification. No new business functionality.

## 1. What Wave 1 shipped

A canonical **Policy Registry** module was introduced so every consumer
of SSB policies (lifecycle, health, governance, resolvers, UI) reads
from one source of truth instead of maintaining private
`asset → table` maps.

Files:

- **New** — `src/services/ssb/ssbPolicyRegistry.ts`
- **Edited** — `src/services/ssb/ssbPolicyLifecycleService.ts`
- **Edited** — `src/services/ssb/ssbPolicyHealthService.ts`
- **Edited** — `src/services/ssb-configuration/ssbConfigurationGovernanceService.ts`
- **Edited docs** — `docs/social-security/SSB_POLICY_STANDARDIZATION_BACKLOG.md`

No table added. No table dropped. No column renamed. No form JSON editor
reintroduced. No BN/BEMA/IA/legacy table touched.

## 2. Registry structure

`POLICY_REGISTRY` is an array of `PolicyRegistryEntry` records. Each
entry captures the 8 canonical interfaces:

| Field         | Purpose |
|---------------|---------|
| `assetKey`    | Governance asset key (`ssb.<domain>`) |
| `table`       | Physical parent policy table |
| `section`     | `/admin/ssb-setup?section=<key>` deep-link key |
| `label`       | Human-readable label used in governance messages |
| `scopeKeys`   | Columns that identify "same policy" across versions |
| `childTables` | Relational children cloned on new version |
| `blocking`    | Whether missing/error blocks BN readiness |
| `ruleCode`    | Governance rule code prefix (`SSB.E0xx` / `SSB.W0xx`) |
| `consumes`    | Shared-domain / engine references (docs only) |

Derived exports (kept for back-compat with existing call sites):
`POLICY_BY_ASSET`, `POLICY_BY_TABLE`, `ASSET_TO_TABLE`,
`ASSET_TO_SECTION`, `POLICY_SCOPE_KEYS`, `POLICY_CHILD_TABLES`.

Canonical helpers:

- `resolveActivePolicy(assetKey, scope?)` — reads ACTIVE + is_current rows.
- `resolvePolicyChildren(table, policyId)` — reads all child tables for one parent.
- `getRegistryEntry(assetOrTable)` — lookup.

## 3. Rewiring summary

### `ssbPolicyLifecycleService`
- `POLICY_SCOPE_KEYS` now re-exported from the registry (no local duplicate).
- `POLICY_CHILD_TABLES` now re-exported from the registry — `cloneChildRows`
  automatically picks up any new child added to the registry, so new-version
  cloning covers all 9 policies (Address + Contribution Calendar have
  children today; the other 7 have empty child lists and are no-ops).
- All lifecycle actions (`createNewVersion`, `approvePolicy`,
  `schedulePolicy`, `activatePolicy`, `retirePolicy`) work unchanged.

### `ssbPolicyHealthService`
- `ASSET_TO_TABLE` and `ASSET_TO_SECTION` now derive from the registry.
- `evaluateAllAssetHealth` iterates every registry entry, so any
  new policy added to the registry is automatically evaluated.
- Per-asset validators (Address child rows, Contribution rule, Identity
  primary, Numbering entities, Financial channels, Legal acts, Documents
  processes, Communication channels, Workflow SLAs) retained.

### `ssbConfigurationGovernanceService`
- `BLOCKING_ASSETS` list is generated from
  `POLICY_REGISTRY.filter(p => p.blocking)` — no hand-maintained array.
- Communication is registered as non-blocking (`SSB.W020`) and continues
  to be reported as warning / deferred / info.
- Contribution calendar rule-based preview validation retained.

### `SsbPolicySectionShell` (UI)
- No change needed — each of the 9 section forms
  (`AddressPolicyForm`, `IdentityPolicyForm`, `NumberingPolicyForm`,
  `ContributionCalendarPolicyForm`, `FinancialPolicyForm`,
  `LegalPolicyForm`, `DocumentPolicyForm`, `CommunicationPolicyForm`,
  `WorkflowPolicyForm`) already mounts the shared shell, which already
  drives clone-on-active-edit via `createNewVersion` from the lifecycle
  service.

## 4. UI / form contract

Every section form:

- Reads and writes relational rows on its policy table
  (`ssb_<domain>_policy`) via `SsbPolicySectionShell`.
- Uses proper dropdowns for stable codes/IDs (identity types, entity
  codes, binding kinds, applies-to processes, channels, workflow keys).
- Contains **no JSON editors** for active configuration. Address
  child-row editing (mandatory/optional address fields, admin levels)
  and Contribution weekend-day editing are relational grid/checkbox
  editors introduced in the earlier JSON-elimination refactor.
- Supports clone-on-active-edit — editing an ACTIVE row automatically
  calls `createNewVersion`, which now also clones any child rows
  registered in `POLICY_CHILD_TABLES`.

## 5. Resolver contract

Business modules may consume policies in either of two equivalent ways:

- Legacy: `resolvePolicy(table, scope, asOfDate?)` — retained; unchanged.
- Canonical (recommended): `resolveActivePolicy(assetKey, scope?)`
  — sourced from the registry, hides the physical table.

`getMemberRegistrationConfig` / `getEmployerRegistrationConfig` /
`getBenefitSetupConfig` composed configs continue to work.

## 6. Governance validation contract

For each registry entry:

- `missing`  → blocking error using `ruleCode`.
- `error`    → blocking error using `ruleCode + ".ERR"`.
- `partial`  → warning using `ruleCode + ".W"`.
- `deferred` → info (used by Communication).
- Contribution calendar rule preview: separate error (`SSB.E013.RULE` /
  `SSB.E013.PREVIEW`).

Because the list is derived from the registry, adding a new policy also
auto-adds its blocking/warning row to the validation run.

## 7. Legacy impact

**None.** No BN, BEMA, IA, or legacy (`ip_*`, `er_*`, `cl_*`, `cn_*`,
`au_*`) table was altered. No business transaction data was migrated.
No master or shared-domain CRUD was duplicated. All shared-domain
references (`ssp_bank`, `ssp_currency_profile`, `core_legal_reference`,
`core_dms_document_type`, `ssp_communication_channel`, `core_template`,
`core_workbasket`) remain authoritative.

## 8. Rollback

Wave 1 is a pure code refactor. To roll back:

1. Delete `src/services/ssb/ssbPolicyRegistry.ts`.
2. Restore the previous inline `POLICY_SCOPE_KEYS` and
   `POLICY_CHILD_TABLES` in `ssbPolicyLifecycleService.ts`.
3. Restore the previous inline `ASSET_TO_TABLE` and `ASSET_TO_SECTION`
   in `ssbPolicyHealthService.ts`.
4. Restore the previous inline `BLOCKING_ASSETS` array in
   `ssbConfigurationGovernanceService.ts`.

No schema changes to revert.

## 9. Acceptance checklist

- [x] All 9 policies are READY (see updated backlog).
- [x] Forms use relational child editors — no JSON editors for active configuration.
- [x] Governance validation reads relational child rows and iterates the registry.
- [x] Business process resolvers still work (`getMemberRegistrationConfig`,
      `getEmployerRegistrationConfig`, `getBenefitSetupConfig`).
- [x] Lifecycle child-cloning wired for all 9 policies via the registry.
- [x] No BN/BEMA/IA/legacy table changed.
- [x] Typecheck passes.
