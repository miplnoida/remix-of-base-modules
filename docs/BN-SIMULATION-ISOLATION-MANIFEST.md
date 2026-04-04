# BN Simulation Engine — Isolation Manifest

> **Purpose**: Define the strict boundary between the simulation workspace and
> production benefit processing. Every item is classified as NEW, REUSED (read-only
> reference), or UNTOUCHED (never modified by simulation code).

---

## 1. NEW Items (created exclusively for simulation)

### 1.1 Database Tables (all prefixed `bn_sim_`)

| Table | Purpose |
|---|---|
| `bn_sim_scenario` | Stores test scenario metadata (name, type, source, status) |
| `bn_sim_run` | One row per simulation execution (status, timing, errors) |
| `bn_sim_run_input` | Synthetic inputs supplied by the tester |
| `bn_sim_run_output` | Persisted engine outputs (rates, amounts, flags) |
| `bn_sim_rule_trace` | Eligibility/validation rule trace steps |
| `bn_sim_formula_trace` | Calculation/formula trace steps |
| `bn_sim_config_snapshot` | Frozen JSONB snapshot of rules at execution time |

> **None of these tables have foreign keys into transactional tables** (`bn_claim`,
> `bn_award`, `bn_payment_instruction`). They are fully self-contained.

### 1.2 Service Layer

| File | Role |
|---|---|
| `src/services/bn/simulationService.ts` | Orchestrator — snapshot → run → persist. **Only writes to `bn_sim_*` tables.** |

### 1.3 Types

| File | Role |
|---|---|
| `src/types/bnSimulation.ts` | All simulation-specific interfaces. Imports engine types read-only. |

### 1.4 Hooks

| File | Role |
|---|---|
| `src/hooks/bn/useBnSimulation.ts` | React Query hooks for simulation CRUD/queries |
| `src/hooks/bn/useSimPermission.ts` | RBAC guard — `canView`, `canCreate`, `canRun`, etc. |

### 1.5 UI Components

| File | Role |
|---|---|
| `src/pages/bn/simulation/SimulationDashboard.tsx` | Scenario list + stats |
| `src/pages/bn/simulation/ScenarioBuilder.tsx` | Create/edit scenario |
| `src/pages/bn/simulation/RunSimulation.tsx` | Execute a run |
| `src/pages/bn/simulation/SimulationResultSummary.tsx` | Results + trace + snapshot |
| `src/components/bn/simulation/SimRuleTraceView.tsx` | Rule trace viewer (read-only) |
| `src/components/bn/simulation/SimFormulaTraceView.tsx` | Formula trace viewer (read-only) |
| `src/components/bn/simulation/SimConfigSnapshotViewer.tsx` | Config snapshot browser |
| `src/components/bn/simulation/SimAccessDenied.tsx` | Permission denied fallback |

### 1.6 Permissions

| Constant / Type | Location |
|---|---|
| `SIM_PERMISSIONS` enum | `src/hooks/bn/useSimPermission.ts` |
| `SimPermission` type | same file |
| `SIM_ROLE_GRANTS` mapping | same file |
| `CONFIG_ANALYST` role | Added to `UserRole` in `src/types/newBenefit.ts` |

---

## 2. REUSED Items (read-only reference — never modified)

| Item | Location | How Simulation Uses It |
|---|---|---|
| `runCalculationEngine()` | `src/services/bn/calculationEngine.ts` | Called with `mode: 'SIMULATION'` flag. Engine logic is unchanged. |
| `BnCalcEngineInput` / `BnCalcEngineOutput` / `BnCalcTraceEntry` | `src/types/bnCalcEngine.ts` | Imported for type safety only. |
| `bn_product` table | Database | **SELECT only** — reads product metadata for snapshot. |
| `bn_product_version` table | Database | **SELECT only** — reads version config for snapshot. |
| `bn_eligibility_rule` table | Database | **SELECT only** — reads active rules for snapshot. |
| `bn_calculation_rule` table | Database | **SELECT only** — reads active rules for snapshot. |
| `bn_timeline_rule` table | Database | **SELECT only** — reads active rules for snapshot. |
| `bn_document_rule` table | Database | **SELECT only** — reads active rules for snapshot. |
| `bn_interaction_rule` table | Database | **SELECT only** — reads active rules for snapshot. |
| `bn_formula_template` table | Database | **SELECT only** — reads templates referenced by calc rules. |
| `bn_override_policy` table | Database | **SELECT only** — reads active policies for snapshot. |
| `productService.ts` | `src/services/bn/productService.ts` | May be imported for product/version lookups. Never written to. |
| `BnEmptyState` / `BnStatCard` | `src/components/bn/shared/` | Shared UI components reused in simulation pages. |
| Integration adapters | `src/services/bn/integration/` | Engine may call person/contribution adapters during execution. Adapters are read-only for simulation. |

> **Key rule**: Simulation code issues **only SELECT queries** against production
> configuration tables. It **never** issues INSERT, UPDATE, or DELETE against them.

---

## 3. UNTOUCHED Items (must never be modified by simulation work)

### 3.1 Transactional Tables — absolute write prohibition

| Table | Why |
|---|---|
| `bn_claim` | Live claim records |
| `bn_claim_detail` | Claim JSONB details |
| `bn_award` | Approved benefit awards |
| `bn_payment_instruction` | Payment settlement records |
| `bn_calc_run` | Production calculation runs |
| `bn_calc_trace` | Production calculation trace |
| `bn_calc_override` | Production manual overrides |
| `bn_calc_legacy_snapshot` | Legacy comparison data |
| `bn_service_case` | Service/appeal cases |

### 3.2 Production Services — no modifications

| File | Why |
|---|---|
| `src/services/bn/calculationEngine.ts` | Core engine — called, never changed |
| `src/services/bn/claimService.ts` | Claim lifecycle — completely untouched |
| `src/services/bn/decisionEngine.ts` | Decision/approval logic — untouched |
| `src/services/bn/evidenceService.ts` | Evidence management — untouched |
| `src/services/bn/workbasketService.ts` | Work queues — untouched |
| `src/services/bn/configService.ts` | Config publication flow — untouched |

### 3.3 Production UI — no modifications

| Path | Why |
|---|---|
| `src/pages/bn/claims/*` | Claim entry/processing screens |
| `src/pages/bn/products/*` | Product editor (11-tab interface) |
| `src/components/bn/engine/*` | Production calc viewer (except CalcSimulationPanel which pre-existed) |
| `src/components/bn/claims/*` | Claim form components |

### 3.4 Configuration Publication Flow

The version lifecycle (`Draft → Pending → Active → Retired`) with maker-checker
controls in `configService.ts` and the Product Editor UI is **completely untouched**.
Simulation reads the *result* of publication; it never participates in it.

### 3.5 Integration Layer

| File | Status |
|---|---|
| `src/services/bn/integration/contracts.ts` | Untouched |
| `src/services/bn/integration/*Adapter.ts` | Untouched (7 adapters) |
| `src/services/bn/integration/eventBus.ts` | Untouched — simulation does not publish domain events |

---

## 4. Architectural Guardrails

1. **Synthetic claim IDs**: All simulation runs use `SIM-{runId}` as the claim ID,
   ensuring no collision with production claim queries.

2. **No domain events**: `simulationService.ts` never calls `publishBnEvent()`.
   Simulation results do not trigger notifications, workflows, or payment processing.

3. **No RLS**: Per project policy, row-level security is not used. Access control is
   enforced at the application layer via `useSimPermission()`.

4. **Additive permissions only**: The `CONFIG_ANALYST` role grants simulation access
   but does not confer any production claim approval, payment, or override authority.

5. **Snapshot immutability**: Once a `bn_sim_config_snapshot` row is written, it is
   never updated. It provides a permanent record of the rules used for that run.

6. **Table isolation**: No `bn_sim_*` table has a foreign key to any `bn_claim`,
   `bn_award`, or `bn_payment_instruction` row.
