# Risk Simulator

| Field | Value |
|---|---|
| Sub-section | Compliance → Admin → Tools |
| Route | `/compliance/admin/tools/risk-simulator` |
| Page component | `src/pages/compliance/tools/RiskSimulator.tsx` |
| Engine module | `src/lib/compliance/riskScoringEngine.ts` |

---

## 1. Purpose

A **read-only, dry-run workspace** for the employer **risk-scoring** model defined by the active `ce_risk_policies` row. Lets admins:

1. Pick any employer (with or without a stored risk profile).
2. View the **current live state** — total score, band, last-calculated date, latest factor inputs and last 5 history entries.
3. **Override individual factor values** (Arrears, Active Violations, Missed Filings, Breach Rate, Legal Escalations) one-by-one with toggle + numeric input.
4. Run **two scoring passes** in the browser — current (live inputs) vs simulated (live + overrides) — and compare side-by-side: scores, bands, per-factor weighted contributions, deltas, thresholds, points awarded, explanations.
5. See the **recommended action** that the simulated band would trigger.

**Critical guarantee** — like the Rule Simulator, the Risk Simulator never writes. No rows are inserted/updated in `ce_risk_profiles`, `ce_risk_score_history`, `system_audit_trail`, or any other table. Scoring is performed locally by `runSimulation()` in `riskScoringEngine.ts`.

This is the BA/SME counterpart to the live nightly recalculation that updates `ce_risk_profiles` (presumably via a `LEDGER-*` or `RISK-*` automation job — **assumption / needs confirmation**, as the live job is not invoked from this screen).

---

## 2. Business purpose

| Need | How the screen serves it |
|---|---|
| Tune factor **weights** or **thresholds** before activating a new policy | Edit policy in `RiskRulePolicy.tsx`, return here, simulate against representative employers, confirm band distribution behaves as intended. |
| Investigate a band-change appeal | Override the disputed factor with the appellant's claimed value, see whether the band would change. |
| Demonstrate the impact of a hypothetical enforcement action (clearing arrears, resolving violations) | Set Arrears = 0 or Violations = 0, observe new score and recommended action. |
| Validate the active **policy code** is the one in production | Header badge displays `Policy: {policy_code}`. |

---

## 3. Data sources (tables / RPCs read)

All access via Supabase JS. **No mutations.**

### 3.1 Employer roster
Hook: `useSimulatorEmployers()` — `src/hooks/useRiskSimulatorData.ts`.

| Table | Columns | Filter |
|---|---|---|
| `er_master` | `regno, name, status` | `status IN ('A','V')`, ordered by `name` |
| `ce_risk_profiles` | `id, employer_id, employer_name, total_score, risk_band, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score, last_calculated_at, override_band, override_reason, territory` | ordered by `employer_name` |

The hook merges both lists keyed by `employer_id` (regno) so the dropdown shows employers **with and without** a stored profile.

### 3.2 Active risk policy + factors + bands
Hook: `useActiveRiskPolicy()` — chained reads:

| # | Table | Purpose |
|---|---|---|
| 1 | `ce_risk_policies` | First row where `status = 'ACTIVE'`. |
| 2 | `ce_risk_policy_factors` | Factor IDs for that policy where `is_active = true`, plus `weight_override`. |
| 3 | `ce_risk_config` | Factor configs (`factor_code, factor_name, weight, max_score, scoring_method, thresholds, data_source, category`) for the IDs from step 2. |
| 4 | `ce_risk_bands` | Bands (`band_name, score_range_min, score_range_max, color`) for the active policy ordered by `score_range_min`. |

`thresholds` is parsed from JSON if stored as a string.

### 3.3 Live factor inputs for the selected employer
Hook: `useEmployerLiveFactors(employerId)` — gathers raw values for the 5 model factors:

| Factor | Source | Computation |
|---|---|---|
| **arrears** | RPC `ce_calculate_employer_arrears(p_employer_id)` | Sum of `net_balance` across returned rows. |
| **violations** | `ce_violations` count where `status IN ('OPEN','UNDER_REVIEW','ESCALATED')` | Direct count. |
| **filings** | `cn_c3_reported` count where `period >= now()-365d` | `missedFilings = max(12 - count, 0)`. |
| **payment** (breach %) | `ce_payment_arrangements` (active count) + `ce_arrangement_breaches` (unresolved count) | `breachPct = round(breaches / (arrangements + breaches) * 100)`. |
| **legal** | `ce_legal_escalations` count by `employer_id` | Direct count. |

Each entry is returned as `{ rawValue, detail }`. The `ce_arrangement_breaches` read is wrapped in a try/catch (table may not exist in all envs).

### 3.4 Score history
Hook: `useRiskScoreHistory(profileId)` — `ce_risk_score_history` last 10 rows ordered desc by `calculated_at`. Top 5 are rendered in the "Recent History" mini-list.

### 3.5 Tables/RPCs **NOT** touched
The simulator does **not** call the live recalc job, does **not** read or write `system_audit_trail`, does **not** mutate `ce_risk_profiles` even when a `Run` is performed.

---

## 4. Validations & guards

| Guard | Where | Behaviour |
|---|---|---|
| `Run Simulation` disabled until ready | `disabled={!isReady || liveLoading}` where `isReady = selectedEmployerId && liveFactors && policyData?.policy` | Prevents NaN scores. |
| Live factors fetch only when employer selected | `enabled: !!employerId` on `useQuery` | — |
| History fetch only when profile exists | `enabled: !!profileId` | Employers without a stored profile show no history list. |
| Override toggle gates input | Numeric input is `disabled` unless `overrides[code].enabled` is true | Avoids confusing a typed value with an active override. |
| Inactive policy factors excluded | `useActiveRiskPolicy` filters `is_active = true` at step 2 | — |
| Inactive policies excluded | `status = 'ACTIVE'` filter at step 1 | If no active policy, dropdown still works but `Run` stays disabled (no `policyData.policy`). |
| Empty factor IDs sentinel | When no policy factors exist, query uses sentinel UUID `'00000000-…'` to keep the `.in()` valid | Defensive. |

There are **no** server-side validations because there are no writes.

---

## 5. Actions available on the screen

| Action | Control | Effect |
|---|---|---|
| **Select employer** | Top `Select` | Resets overrides + both result objects, triggers `useEmployerLiveFactors` and `useRiskScoreHistory`. |
| **Toggle override** for a factor | `Switch` per factor card | Enables/disables that factor's manual value; if disabling, sim falls back to live `rawValue`. |
| **Type override value** | Numeric `Input` per factor | Updates `overrides[code].value`. |
| **Run Simulation** | `Run Simulation` button | Builds two input maps (live-only, live+overrides), calls `runSimulation(factorConfigs, factorWeights, inputs, bands)` twice, stores both results. |
| **Reset** | `Reset` button | Clears `overrides`, `simulationResult`, `currentResult`. |

No Save / Approve / Apply / Delete. **No write paths.**

---

## 6. Hooks, services, edge functions

| Layer | Symbol | File |
|---|---|---|
| React hook (employer roster) | `useSimulatorEmployers` | `src/hooks/useRiskSimulatorData.ts` |
| React hook (active policy bundle) | `useActiveRiskPolicy` | same |
| React hook (live factors) | `useEmployerLiveFactors` | same |
| React hook (score history) | `useRiskScoreHistory` | same |
| Engine | `runSimulation`, `getRecommendedAction`, `getBandStyle` (+ types `FactorInput`, `SimulationResult`, `FactorConfig`, `BandConfig`) | `src/lib/compliance/riskScoringEngine.ts` |
| Date util | `formatDateForDisplay` | `src/lib/format-config.ts` |
| RPC invoked | `ce_calculate_employer_arrears(p_employer_id uuid)` | DB function |
| Edge functions invoked | **None** | — |

---

## 7. Output panels (UI breakdown)

| Panel | Content |
|---|---|
| **Header** | Title + active policy code badge. |
| **Simulation alert** | Amber "SIMULATION MODE — No data will be saved" banner. |
| **Employer selector** | Dropdown (employer + current band), Run / Reset buttons. |
| **Current Live State** | Total score, band badge, override-band alert (if `ce_risk_profiles.override_band` set), live factor inputs list, last 5 history entries. |
| **Simulation Overrides** | One card per active factor — meta (label, description), Override switch, value input, weight%. Disabled inputs show the live value as read-only context. |
| **Simulation Results** | 3-column comparison: Current score+band → arrow + delta + band-change alert → Simulated score+band. Below: recommended-action box driven by `getRecommendedAction(simulated.risk_band)`. |
| **Factor-by-Factor Comparison table** | Per factor: current input, simulated input, current score, simulated score, delta (red/green), weight. Override rows are highlighted amber. |
| **Explainability Detail (Simulated)** | Per factor: code, name, raw input, threshold band hit (`{label}` or `min–max`), points awarded, weighted contribution, plain-language explanation. |

---

## 8. Cross-references — where the same tables are used elsewhere

| Table | Other consumers |
|---|---|
| `ce_risk_policies`, `ce_risk_policy_factors`, `ce_risk_config`, `ce_risk_bands` | **Authoring**: `Compliance Admin → Settings → Risk & Escalation Policy` (`RiskRulePolicy.tsx`). **Display**: workbench KPI cards, employer profile risk widget. |
| `ce_risk_profiles` | **Compliance Workbench** (employer detail, KPI cards, role-based metric cards via `useComplianceWorkbench`), **Cases** (risk badge), **Reports** (risk-mix dashboards), **Compliance Rule Simulator** (reads `total_score` for `riskScore` fact). |
| `ce_risk_score_history` | Profile detail / audit views (band change history). |
| `er_master` | All Employer-related modules (see Rule Simulator §8). |
| `ce_violations`, `ce_payment_arrangements`, `ce_arrangement_breaches`, `ce_legal_escalations`, `cn_c3_reported` | Live cases / arrangements / legal / C3 modules; consumed here only for factor inputs. |
| RPC `ce_calculate_employer_arrears` | Arrears widget, ledger views, breach detection — single source of truth for net arrears. |

---

## 9. Audit, approvals, notifications

| Concern | Status |
|---|---|
| Writes to `system_audit_trail` | **None.** Pure read screen. |
| Approval workflow | None. |
| Notifications | None. |
| User identity tracking | Not applicable. |

---

## 10. Risks, gaps & assumptions

| # | Item | Type | Note |
|---|---|---|---|
| 1 | The screen shows the **stored** `ce_risk_profiles.total_score / risk_band` as "Current Live State", but recomputes a "Current (Live)" result from the same factors at Run time. If the live recalc job ran with **different factor configs** since the profile was stored, the two "current" numbers will disagree. | Consistency risk | Make explicit in the UI that the top card is the *stored* snapshot and the comparison column is *recomputed-now*. |
| 2 | Identity of the live recalc job is not invoked or named on this screen. | Documentation gap | **Assumption / needs confirmation**: live recalc is performed by an automation job under `ce_automation_jobs` (likely category `RISK-*`). Cross-link in code/UI recommended. |
| 3 | `ce_arrangement_breaches` table read is wrapped in try/catch — silent fallback to `breachCount = 0`. | Hidden failure | If table exists but the query errors (e.g., column rename), the user would never know. Replace with explicit "table missing" branch using `.select(..., { head: true })` + null check. |
| 4 | "Missed filings" formula `max(12 - count, 0)` assumes one filing per month for the last 12 months. Employers exempt from monthly filing (e.g., quarterly or seasonal) will be over-penalised. | Logic risk | Should consider `c3_config_details.submission_frequency` if such a column exists. |
| 5 | `useSimulatorEmployers` filters `er_master.status IN ('A','V')`. The Rule Simulator does not apply this filter — inconsistency between the two simulators. | Inconsistency | Decide whether ceased employers (`status='C'`/`'D'`) should be simulatable. |
| 6 | No `Reload policy` action — policy edits in `RiskRulePolicy.tsx` won't appear until a hard refetch. | UX | — |
| 7 | No export of the comparison report. | UX | — |
| 8 | Override values are not persisted across employer changes. | By design / UX | Acceptable; reduces confusion. |
| 9 | The amber-highlight colours (`bg-amber-50`, `text-emerald-600`, `text-red-600`) are **raw Tailwind utility classes**, not semantic tokens (`destructive`, etc.). | Design system | Per project standards, should use design tokens; flagged for future refactor. |

---

## 11. Generated document path

- Project: `docs/compliance/admin/tools/risk-simulator.md`
- Mirror: `/mnt/documents/compliance-admin-docs/tools/risk-simulator.md`
