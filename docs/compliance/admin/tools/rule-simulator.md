# Rule Simulator

| Field | Value |
|---|---|
| Sub-section | Compliance → Admin → Tools |
| Route | `/compliance/admin/tools/rule-simulator` |
| Page component | `src/pages/compliance/tools/RuleSimulator.tsx` |
| Module key (`app_modules`) | Tools group under `ca…0140` |
| Engine module | `src/services/complianceSimulatorEngine.ts` |
| Preview marker | `Test Preview UI v2 — period scan + coverage enabled` |

---

## 1. Purpose

A **read-only, dry-run workbench** for the 4-engine compliance pipeline (Detection → Calculation → Escalation → Recommendation). Lets compliance admins, BAs and auditors test how the **currently configured rules** in `ce_detection_rules`, `ce_calculation_rules`, `ce_escalation_rules` and `ce_violation_types` would behave for either:

- a **real employer** — facts are auto-derived from live C3 filings, payments, ledger, violations, arrangements, notices and risk profile, OR
- a **manual scenario** — facts are entered by hand for "what if" testing.

**Critical guarantee** — the simulator never writes. It does not create violations, ledger entries, notices, escalations, audit-trail rows, queue items, or RPC calls. All evaluation runs locally in the browser through `runSimulation()` in `complianceSimulatorEngine.ts`.

This is the BA/SME equivalent of running the rule engine in a sandbox. It complements (does not replace) the **live** detection paths in `run-compliance-job` and `LEDGER-*` jobs.

---

## 2. Business purpose

| Need | How the screen serves it |
|---|---|
| Validate a new detection / calculation / escalation rule **before activation** | Turn the rule on (status `enabled`), pick a real employer or craft a synthetic scenario, run sim, inspect matched detections, computed amounts, escalation suggestions. |
| Reproduce a disputed violation | Pick the offending employer, ensure facts match the live snapshot, confirm whether the configured rules would have produced the same outcome. |
| Train new compliance officers | Demonstrate how thresholds (grace days, shortfall %, arrears bands) translate into recommendations without affecting production data. |
| Regression-test rule edits | After editing a rule in `RuleEngine.tsx`, re-run sim against representative employers to confirm intended behaviour. |

---

## 3. Data sources (tables / RPCs read)

All access is via the Supabase JS client. **No mutations.**

### 3.1 Rule catalog (loaded once per session, 5-min stale)
Hook: `useSimulatorRules()` in `src/hooks/compliance/useSimulatorData.ts`.

| Table | Columns selected | Filter |
|---|---|---|
| `ce_detection_rules` | `id, rule_code, name, description, trigger_event, auto_create_violation, is_enabled, violation_type_id, parameters, frequency, priority` | order by `rule_code` |
| `ce_calculation_rules` | `id, rule_code, name, applies_to, formula_expression, fund_type, source_config, is_enabled, violation_type_id` | order by `rule_code` |
| `ce_escalation_rules` | `id, rule_code, name, from_status, to_status, condition_expression, days_threshold, amount_threshold, auto_escalate, requires_approval, is_enabled, violation_type_id` | order by `rule_code` |
| `ce_violation_types` | `id, code, name, category, severity_default` | `is_active = true`, order by `sort_order` |

### 3.2 Employer search (`EmployerSelector`)
Hook: `useEmployerSearch(searchTerm)`.

| Table | Columns | Filter |
|---|---|---|
| `er_master` | `regno, name, status, trade_name, activity_type, sector_code, office_code` | `or(regno.ilike, name.ilike, trade_name.ilike)`, limit 20 |

### 3.3 Live employer compliance context
Hook: `useEmployerComplianceContext(regno)` — runs **9 parallel queries** to assemble the fact bundle:

| Table | Purpose |
|---|---|
| `er_master` | Identity, status, business type |
| `cn_c3_reported` | Last 12 C3 filings → expected-period match, wages, levy/severance, gap/consecutive-gap detection |
| `cn_payment_header` + `cn_payment` (joined) | Last 12 payments → period-matched payment total, shortfall vs amount due |
| `ce_violations` | Last 50 violations → open/under_review counts, repeat-offender count (rolling 12 mo), oldest open age |
| `ce_payment_arrangements` | Active arrangement detection |
| `ce_employer_financial_ledger` | Last 100 entries → total outstanding (DEBIT/CHARGE − CREDIT/PAYMENT) |
| `ce_risk_profiles` | Current `total_score` for `riskScore` fact |
| `ce_notices` | Latest notice → `noticeStage` fact |
| `c3_config_details` | `submission_due_day`, `levy_monthly_threshold` config |

Output is a `Partial<SimulationFactContext>` plus a UI snapshot (filed/notFiled/paid counts, totals, repeat counts, current notice stage).

### 3.4 Tables/RPCs **NOT** touched
The simulator does **not** read from: `ce_automation_jobs`, `ce_automation_runs`, `ce_posting_queue`, `system_audit_trail`, `ce_inspectors`, `ce_queue_members`, `ce_zones`. It also does **not** invoke the `run-compliance-job` edge function.

---

## 4. Validations & guards

| Guard | Where | Behaviour |
|---|---|---|
| Rules must be loaded before run | `handleRun` in `RuleSimulator.tsx` | Toast `"Rules not loaded yet"`, return. |
| Employer required for live mode | `useEmployerComplianceContext` `enabled: !!regno` | Hook short-circuits when no regno. |
| Employer search min length | `useEmployerSearch` `enabled: searchTerm.length >= 2` | No call until 2+ chars. |
| Disabled rules excluded | `runSimulation()` in engine — filters `is_enabled !== false`. | Inactive rules silently ignored. |
| Manual override marker | `overriddenFields: Set<string>` | Each manually edited fact is tagged so `ExplanationPanel` can show "Manual" vs "From DB". |
| Run button disabled until rules loaded | `disabled={rulesLoading}` | Prevents undefined-rule crash. |

There are **no** server-side validations because there are no writes.

---

## 5. Actions available on the screen

| Action | Control | Effect |
|---|---|---|
| **Select employer** | `EmployerSelector` (search + result list) | Sets `selectedRegNo/Name/Status`, clears prior sim output, triggers `useEmployerComplianceContext`. |
| **Toggle Live Data ↔ Manual Scenario** | "Manual Scenario" / "Live Data" button | When OFF (Live), context auto-merges into `facts` via `useMemo`. When ON, current facts are kept as the editing baseline; user-edited fields are tracked in `overriddenFields`. |
| **Edit a fact** | Inputs in `ScenarioInputs` (filing flags, amounts, days, gaps, etc.) | Updates `facts` state and adds field name to `overriddenFields`. |
| **Pick period** | `Period` selector | Runs a single selected `YYYY-MM` period when the 12-month scan is off; defaults to current-month context. |
| **Scan multiple periods** | `Scan last 12 months` switch | In live-data mode, evaluates available period facts through `runMultiPeriodSimulation()` and suppresses period-aware duplicates. |
| **Filter result volume** | `Matches only` switch | Keeps matched/applied outcomes only; when off, also shows not-matched and skipped evaluations. |
| **Run Simulation** | "Run Simulation" button | Calls `runSimulation(...)` or `runMultiPeriodSimulation(...)`. Sets `output` and shows toast `Simulation complete: N detection(s) matched`. |
| **Reset** | "Reset" button | Clears all overrides and output; if a context is loaded, re-applies it as the new baseline. |
| **Export** | "Export" button | Downloads the current dry-run payload and result as JSON after a simulation has been run. |

There are no Save / Approve / Submit / Delete buttons. **No menu actions write to any table.**

---

## 6. Hooks, services, edge functions

| Layer | Symbol | File |
|---|---|---|
| React hook (rules catalog) | `useSimulatorRules` | `src/hooks/compliance/useSimulatorData.ts` |
| React hook (employer search) | `useEmployerSearch` | same |
| React hook (employer context) | `useEmployerComplianceContext` | same |
| Engine entry point | `runSimulation` | `src/services/complianceSimulatorEngine.ts` |
| Engine helpers | `createDefaultFactContext`, type exports `SimulationFactContext`, `SimulationOutput`, `DetectionResult`, `CalculationResult`, `EscalationResult` | same |
| Sub-components | `EmployerSelector`, `ComplianceSnapshot`, `ScenarioInputs`, `SimulationResults`, `RecommendedAction`, `ExplanationPanel` | `src/components/compliance/simulator/*` |
| Edge functions invoked | **None** | — |
| RPCs invoked | **None** | — |

---

## 7. Output panels (UI breakdown)

| Panel | Component | Content |
|---|---|---|
| Simulation banner | inline | Amber "Dry Run Only" advisory. |
| Preview marker | inline badge | Confirms the visible preview is running `Test Preview UI v2 — period scan + coverage enabled`. |
| Compliance Snapshot | `ComplianceSnapshot` | Live counters from context.snapshot — filed/notFiled/paid/unpaid, total outstanding, open/review violations, repeat count, active arrangement, current notice stage. |
| Data Coverage | `SimulatorDataCoverage` | Always visible; before employer selection it prompts the tester to select an employer, then shows which source data can support each rule family. |
| Scenario Inputs | `ScenarioInputs` | Editable fact form (`SimulationFactContext` fields). |
| Simulation Results | `SimulationResults` | Per-engine breakdown (matched detections, computed calculations, suggested escalations) with collapsible detail. |
| Recommended Action | `RecommendedAction` | Plain-language next step derived from `output.recommendation`. |
| Explanation Panel | `ExplanationPanel` | Field-by-field provenance — which facts came from DB, which from manual edit, which were defaults. |

### 7.1 Acceptance test cases

| Test case | Input / action | Expected result |
|---|---|---|
| TC-RS-001 Preview version check | Open `/compliance/admin/tools/rule-simulator` in the authenticated test preview. | Header shows `Test Preview UI v2 — period scan + coverage enabled`. |
| TC-RS-002 Controls visible | Inspect the toolbar at desktop width. | `Period`, `Live Data`, `Scan last 12 months`, `Matches only`, `Reset`, `Run Simulation`, and `Export` are visible; `Save Run` is not visible. |
| TC-RS-003 Empty state data coverage | Open page before selecting an employer. | `Data Coverage` card is visible and says to select an employer. |
| TC-RS-004 Live employer scan | Search a real employer regno such as `658852`, select it, keep `Scan last 12 months` on, then run. | Results include period-aware rows where data exists; missing source families are marked as skipped rather than false no-match. |
| TC-RS-005 Single period scan | Turn `Scan last 12 months` off, pick a period, then run. | Results are limited to the selected period context. |

---

## 8. Cross-references — where the same tables are used elsewhere

(Module-level summary, not exhaustive file lists.)

| Table | Other consumers in this codebase |
|---|---|
| `ce_detection_rules`, `ce_calculation_rules`, `ce_escalation_rules`, `ce_violation_types` | **Authoring**: `Compliance Admin → Settings → Rule Engine` (`RuleEngine.tsx`) and `Violation Types`. **Live execution**: `run-compliance-job` edge function, automation jobs (`ce_automation_jobs`). **Display**: violation detail / case detail screens. |
| `er_master` | Used across **Employers** module (master data, address, status), **C3 Management**, **Payments**, **Compliance Workbench**, **Field operations**, dashboards. |
| `cn_c3_reported`, `cn_payment_header`, `cn_payment` | **C3 Management** (filing, history, balance), **Payments** (batch, receipt), **Ledger sync** (`PaymentLedgerSync`, `C3LedgerSync`), **Compliance** breach detection. |
| `ce_violations`, `ce_payment_arrangements`, `ce_notices`, `ce_legal_escalations` | **Compliance Cases**, **Workbench**, **Notices & Communication**, **Legal case integration**. |
| `ce_employer_financial_ledger` | **Ledger Operations / Administration / Posting Framework** screens, **arrears reporting**, **Risk Simulator** (via arrears RPC). |
| `ce_risk_profiles` | **Risk Simulator**, **Workbench KPIs**, **Risk policy & escalation** screen. |
| `c3_config_details` | **C3 Configuration Lifecycle** (Filing & Penalties, Period Config). |

---

## 9. Audit, approvals, notifications

| Concern | Status |
|---|---|
| Writes to `system_audit_trail` | **None.** Read-only screen. |
| Approval workflow | None. The Planner Approval Workflow (`mem://features/compliance/planner-approval-workflow.md`) governs `convert_exception` / `merge_duplicate` only — not invoked here. |
| Notifications | None — no side effects. |
| User identity tracking | Not applicable (no inserts/updates). |

---

## 10. Risks, gaps & assumptions

| # | Item | Type | Note |
|---|---|---|---|
| 1 | `installmentOverdueDays` is hardcoded to `0` in `useEmployerComplianceContext` (no installment-schedule table queried). | Gap | Sim cannot fully exercise installment-overdue detection rules against live data. Manual mode works. |
| 2 | `employeeCountObserved` defaults to `0` (no inspection event source). | Gap | Wage-mismatch / under-declaration rules requiring inspection data must be exercised in manual mode. |
| 3 | `hasClearanceCert` is hardcoded `false` (no clearance-cert table). | Gap | Same — manual override required. |
| 4 | `useMemo` on line 43–51 of `RuleSimulator.tsx` is being used for a **side effect** (`setFacts`), not for a memoised value. | Code smell / risk | Should be `useEffect`. Current pattern works but is non-idiomatic and could cause double-render fact resets in StrictMode. **Assumption / needs confirmation** with engineering. |
| 5 | `useEmployerSearch` builds an `or(...ilike...)` filter from raw user input. | Security | Inputs are passed through Supabase REST builder which escapes them, but BA review recommended. |
| 6 | Rules cache `staleTime = 5 min`. Edits in `RuleEngine.tsx` aren't visible in sim until refetch. | UX | Add a "Reload rules" button or invalidate `['simulator-rules']` on rule-engine save. **Improvement.** |
| 7 | No way to **export** the simulation result (JSON/CSV) for ticket attachment. | UX gap | — |
| 8 | Violations query uses `or('employer_id.eq.${regno}')` — single-condition `or` is a no-op wrapper. | Minor | Functionally correct; the intent (allow multi-condition later) is unclear. |

---

## 11. Generated document path

- Project: `docs/compliance/admin/tools/rule-simulator.md`
- Mirror: `/mnt/documents/compliance-admin-docs/tools/rule-simulator.md`
