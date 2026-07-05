# Epic 0.36B — Service Implementation Matrix

**Status:** Read-only audit.

Classifies hooks, contexts, services, utilities, validation helpers, and adapters observed in the repository. Coverage is at the family level; individual entries call out the notable coupling issues.

## 1. Contexts

| Context | Location | Domain | Notes |
|---|---|---|---|
| `SupabaseAuthContext` | `src/contexts/SupabaseAuthContext.tsx` | Identity | Correctly Platform. |
| `AuthContext` | `src/contexts/AuthContext.tsx` | Identity (legacy) | Duplicates Supabase context — consolidation candidate. |
| `NewBenefitAuthContext` | `src/contexts/NewBenefitAuthContext.tsx` | BN (legacy) | Retire with legacy `/nbenefit`. |
| `LegalAuthContext` | `src/contexts/LegalAuthContext.tsx` | Legal | Duplicate of platform auth. Consolidate. |
| `LegalRoleContext`, `LegalCaseContext` | `src/contexts/` | Legal | Keep (Legal-local). |
| `BnCountryContext` | `src/contexts/BnCountryContext.tsx` | SSP (target) / BN (current) | Move to SSP context. |
| `ThemeContext`, `SystemSettingsContext`, `PIIMaskingContext`, `GlobalBlockingContext` | `src/contexts/` | Platform / Shared | Correct. |

## 2. Hooks

### 2.1 BN hook family (`src/hooks/bn/*`, ~40 files)

| Hook | Reads from | Wrong coupling? | Shared service candidate |
|---|---|---|---|
| `useBnCountryPack` | `bn_country*` | 🔴 Yes — should call SSP | `useSspCountryPack` |
| `useBnCountryMaster` | `bn_country` | 🔴 Yes | `useSspCountry` |
| `useBnPaymentMasters` | `bn_bank_*`, `bn_payment_method`, `bn_eft_*` | 🔴 Yes | `useSspPaymentChannels`, `useSspBankBranches` |
| `useBnConfig`, `useBnConfigAudit` | `bn_*` config | 🟡 Partial — SSP-owned rows leak | Split. |
| `useBnClaim*` (10 hooks) | `bn_claim*` | ✅ Legit BN | — |
| `useBnCalcEngine`, `useBnSimulation`, `useBnDecisionEngine`, `useBnDetermination` | `bn_calc_*`, `bn_sim_*`, `bn_eligibility_*` | ✅ Legit BN | — |
| `useBnAwards`, `useBnEntitlement`, `useBnSchedule`, `useBnPayablesQueue`, `useBnPaymentIssue`, `useBnBatchOperations`, `useBnPostIssue` | `bn_award*`, `bn_entitlement`, `bn_payment_*`, `bn_batch_item` | ✅ Legit BN | — |
| `useBnMedical` | `bn_medical_*` | ✅ Legit BN | — |
| `useBnNotifications`, `useBnClaimCommunication` | `bn_comm_*`, `bn_communication_log`, `bn_letter` | 🔴 Should call Shared Notification | `useNotification` |
| `useBnWorkflowIntegration`, `useBnApprovalConsole` | `bn_workflow_template`, `bn_approval_policy` | 🔴 Should call Shared Workflow | `useWorkflow` |
| `useBnProduct`, `useBnRulesAdmin`, `useBnFormulaVariableRegistry`, `useBnParticipantConfig`, `useBnParticipantTaskConfig`, `useBnScreenTemplateUsage` | `bn_product*`, `bn_rule*`, `bn_formula*`, `bn_screen_template` | 🟡 Reads Legal Ref via BN | Consume `useLegalReference` |
| `useBnDashboard`, `useBnHistoricalInquiry`, `useBnPerson360`, `useBnWorkbasket`, `useBnGridState` | mixed | 🟡 | Refactor once shared services land. |

### 2.2 Compliance hooks

| Hook | Location | Notes |
|---|---|---|
| `useComplianceRole` | `src/hooks/useComplianceRole.ts` | Correct capability engine. |
| `useHasCapability` | `src/hooks/useHasCapability.ts` | ✅ Capability model — should be lifted to Enterprise Authorisation. |

### 2.3 Legal hooks

| Hook | Location | Notes |
|---|---|---|
| `useLgAccess` | `src/hooks/legal/*` | Legal-local capability check. Converge with `useHasCapability`. |
| `useLegalCapability`, `useLegalMatterWorkspace` | `src/hooks/legal/*` | Domain-appropriate. |

## 3. Services

### 3.1 BN services (`src/services/bn/*`)

| Subfolder | Role | Coupling verdict |
|---|---|---|
| `audit`, `awards`, `calc`, `eligibility`, `intake`, `payment`, `policies` | BN-owned business logic | ✅ Correct. |
| `communication` | BN-local notification bridge | 🔴 Consolidate into Shared Notification. |
| `workflow` | BN-local workflow bridge | 🔴 Consolidate into Shared Workflow. |
| `config`, `governance`, `registries` | Config + SSP masters accessor | 🔴 Read SSP masters directly — swap in Epic 0.39. |
| `integration`, `source` | Legacy claim source integration | 🟡 Retain per Epic 0.2. |
| `forms` | Form definition | ✅ |
| `skn` | Country-specific pack | 🔴 Should be data in SSP, not code in BN. |
| `_legacy` | Explicit shim | ✅ Already isolated. |

### 3.2 Compliance services (`src/services/compliance/*`)

- CE state machines and enforcement services — ✅ correct domain.
- Direct writes to Legal referral tables — 🔴 emit events to Legal via shared surface.

### 3.3 Legal services (`src/services/legal/*`, `src/services/legal-reference/*`)

- `legal/*` — ✅ certified (Legal V1).
- `legal-reference/*` — 🔴 duplicates SSP Legal Reference candidate; consolidation target.
- `legal/postJudgment/*` — ✅ domain-appropriate.

### 3.4 Core / shared services (`src/services/core/*`)

- Correct home for enterprise shared logic.
- Missing surfaces (planned): SSP facade, Org profile facade, Shared Workflow facade, Shared Notification facade, Enterprise Authorisation facade.

### 3.5 Reference services (`src/services/reference/*`)

- Reads from `core_reference_*` — ✅ correct.
- Does **not** yet own the `tb_*` legacy reference lists — consolidation target.

### 3.6 Ledger / Finance services (`src/services/ledger/*`)

- Fragment of future Finance app.
- Overlaps with `bn_payment_*`, `cn_*`, `lg_fee_*` computations.

### 3.7 System / External services

- `src/services/system/*` — ✅ Platform-appropriate.
- `src/services/external/*` — ✅ external portal API surface.

## 4. Adapters (`src/adapters/*`)

| Adapter | Domain | Verdict |
|---|---|---|
| `calendarAdapter` | Shared Calendar | ✅ |
| `complianceAdapter` | CE | ✅ |
| `documentsAdapter` | Shared DMS | ✅ |
| `financeAdapter` | FN | ✅ |
| `notificationsAdapter` | Shared Notification | ✅ |
| `peopleAdapter` | Shared Party | ✅ |
| `reportingAdapter` | Shared Reporting | ✅ |

Adapters are the correct shape for the shared-service facade — they need the underlying shared services to be materialised.

## 5. Utilities & validation helpers (`src/utils/*`, `src/lib/*`)

- Currency, date, week, penalty, export utilities — ✅ shared.
- Compliance capability model (`src/lib/compliance/capabilities.ts`) — ✅ template for Enterprise Authorisation refactor.
- Validation framework (`docs/VALIDATION-FRAMEWORK.md`) is documented — implementation is per-module.

## 6. Coupling hotspots (summary)

1. **BN → SSP masters** (Country, Bank, Payment, Legal Ref, ID Rules) — highest-volume cross-domain read; resolved by Epics 0.36C/D + 0.39.
2. **BN / CE / LG → local Notification stacks** — resolved by Epic 0.37.
3. **BN / CE / LG → local Workflow engines** — resolved by Epic 0.37.
4. **CE ↔ LG referral bridge** — resolved by Legal shared surface (already Legal V1; CE-side refactor pending).
5. **Duplicate auth contexts** (`AuthContext`, `NewBenefitAuthContext`, `LegalAuthContext`) — resolved by consolidating to `SupabaseAuthContext`.
6. **Duplicate capability engines** (`useHasCapability` vs `useLgAccess`) — resolved by Enterprise Authorisation refactor.
