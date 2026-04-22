# Risk & Escalation Policy

## 1. Screen Overview
- **Screen name**: Risk & Escalation Policy
- **Route/path**: `/compliance/admin/settings/risk-policy`
- **Page component**: `src/pages/compliance/settings/RiskRulePolicy.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'ce_risk_scoring_config'`, sort_order 4)
- **Screen type**: Settings / Multi-tab CRUD

## 2. Business Function
A four-tab policy hub that governs how the system **scores employer risk and decides when to escalate to legal**:
1. **Risk Factors & Weights** — defines individual risk-scoring factors (e.g. "months overdue", "violation count") and how heavily each contributes.
2. **Risk Policies** — bundles factors into named policies (so different policies can apply to different employer segments / time periods).
3. **Risk Bands & Behaviour** — maps score ranges to bands (Low / Medium / High / Critical) and the operational behaviour for each band (monitoring frequency, sampling weight, etc.).
4. **Legal Escalation** — thresholds (days/amount/violation-count) that trigger automatic legal referral.

Used by **Compliance Policy Owners / Risk Managers** during set-up and whenever the institution's risk appetite changes (typically a once-a-year policy review).

## 3. Primary User Roles
- **Access / Edit**: Compliance Admin, Risk Manager, Policy Owner.
- **View only**: Supervisor (read-only menu grant).
- **No in-screen approval** — all four tabs publish on save.

## 4. UI Responsibilities
- Page header with title, subtitle, and a context badge: *"Risk factors drive employer scoring → Bands determine monitoring intensity → Escalation rules trigger legal referral."*
- 4-tab layout (`Tabs` + `TabsList` shadcn). Each tab is its own self-contained component:
  - `RiskFactorsTab.tsx` — list of factors, weight / category / formula, toggle.
  - `RiskPoliciesTab.tsx` — policies (group of factors), default flag.
  - `RiskBandsTab.tsx` — score range → band → behaviour profile.
  - `LegalEscalationTab.tsx` — escalation thresholds (mirrors the "auto_escalate / requires_approval" pattern from Rule Engine).
- Each tab is a list + dialog editor; no cross-tab forms.

## 5. Main Actions and Business Outcomes
| Action | Effect | DB Impact | Downstream |
|---|---|---|---|
| **Add/Edit Risk Factor** | INSERT/UPDATE factor with weight, formula reference. | `ce_risk_policy_factors` (or `ce_risk_factors`, see riskFactorService) | Risk-scoring engine; rescoring batch will include the new factor on next run. |
| **Add/Edit Risk Policy** | Bundle of factors with weights. | `ce_risk_policies` | Defines which scoring set is "live"; default flag selects the active policy. |
| **Add/Edit Risk Band** | Score range → band label → behaviour. | `ce_risk_bands` | Workbench prioritisation, sampling selection (Sampling Settings consumes bands). |
| **Add/Edit Legal Escalation Threshold** | Day/amount/violation thresholds. | `ce_risk_config` | Legal Cases module: when an employer/case crosses a threshold, an automatic referral is created (or queued for approval). |
| **Toggle Active / Default** | UPDATE flag. | UPDATE | Live for next engine pass. |

## 6. Data Model / Tables Used
| Table | R/W | Why | Key fields | Reused in |
|---|---|---|---|---|
| `ce_risk_policies` | RW | Named policies (sets of factors) | `name`, `description`, `is_default`, `is_active` | Risk-scoring engine, Workbench filters |
| `ce_risk_policy_factors` | RW | Factor instances within a policy | `policy_id`, `factor_key`, `weight`, `direction`, `enabled` | Scoring engine |
| `ce_risk_bands` | RW | Score → band mapping + behaviour | `band`, `min_score`, `max_score`, `monitoring_frequency`, `sampling_weight`, `is_active` | Workbench, Sampling, dashboards |
| `ce_risk_config` | RW | Legal-escalation thresholds + global risk knobs | `threshold_*`, `requires_approval`, `is_active` | Legal Cases module, escalation cron |
| `ce_violation_types` | R | When tying escalation thresholds to specific violation types | `id`, `code`, `name` | Many compliance screens |

The exact column set is defined in the migrations and `riskPolicyService.ts` / `riskFactorService.ts`. The page itself is just a tab shell; CRUD lives in the four tab components and their services.

## 7. Services / Hooks / Queries Used
- `src/services/riskPolicyService.ts` — CRUD for policies and bands.
- `src/services/riskFactorService.ts` — CRUD for factors.
- React Query throughout (per service convention).
- `useUserCode` — supplies UserCode for `created_by` / `updated_by` (assumed via the services; needs verification).
- Tabs from shadcn UI.

## 8. Validation Rules
- Per-tab UI validation: required name, numeric weights, min<max for bands, etc.
- Service-level duplicate checks for policy names (mirrors pattern of other settings screens).
- "Default" enforcement: only one policy may be default at a time (enforced server-side by riskPolicyService — needs confirmation in code).
- No DB-level CHECK constraints identified beyond FK references.

## 9. Workflow / Approval / Notification Logic
- No in-screen approval workflow.
- The `requires_approval` field on legal-escalation thresholds is consumed by the Legal Cases module — it does not gate this screen.
- No notification fired on policy changes.

## 10. Linkages to Other Screens
- **Sampling Settings** (`/compliance/admin/settings/sampling`) — consumes risk bands as one of its sampling weights.
- **Risk Simulator** (`/compliance/admin/tools/risk-simulator`) — dry-runs scoring for a sample employer with the current policy.
- **Compliance Workbench / Cases / Legal Cases** — display risk band, react to escalation thresholds.
- **Dashboards** (Compliance, Risk) — aggregate by band.
- **Rule Engine** — adjacent (rules can use risk_score as a condition variable).

## 11. Audit Trail / Logging
- Inline `created_by` / `updated_by` / `updated_at` (when populated by the service layer).
- No append-only history table for policy changes.
- No access log.

## 12. Technical Risks / Gaps / Assumptions
- **Multiple "risk" tables** (`ce_risk_policies`, `ce_risk_policy_factors`, `ce_risk_bands`, `ce_risk_config`) — boundary between `ce_risk_config` (single-row knobs) and the policy/factor model needs a clear ownership note. Risk of a policy change being silently overridden by a `ce_risk_config` value.
- **No change history**: rolling back a poorly-tuned policy after it has rescored production employers requires manual restoration.
- **No "impact preview"**: before saving a band-range change, there is no count of how many employers will reclassify.
- **Default policy switch** lacks an approval step — flipping the default re-routes scoring instantly.
- **Tab autonomy**: each tab is independent; cross-tab consistency (e.g. band ranges aligned with policy max-score) is not enforced.
- **Assumption**: services correctly stamp audit fields — needs explicit verification (the page component does not).

## 13. Recommended Improvements
1. Add a "Pending Activation" review step + approval workflow for changing the default risk policy.
2. Add an impact-preview ("X employers will move from Band A to Band B") before save.
3. Consolidate `ce_risk_config` knobs into either `ce_risk_policies` or a clearly named "global config" surface.
4. Introduce `ce_risk_policy_history` to retain prior-period scoring rules for audit.
5. Add cross-tab validation: band ranges must cover 0..100 contiguously.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1081)
- Page: `src/pages/compliance/settings/RiskRulePolicy.tsx`
- Tabs: `src/pages/compliance/settings/risk-policy/RiskFactorsTab.tsx`, `RiskPoliciesTab.tsx`, `RiskBandsTab.tsx`, `LegalEscalationTab.tsx`
- Services: `src/services/riskPolicyService.ts`, `src/services/riskFactorService.ts`
- Migrations: `supabase/migrations/*ce_risk_policies*`, `*ce_risk_policy_factors*`, `*ce_risk_bands*`, `*ce_risk_config*`
- Types: `src/integrations/supabase/types.ts`

> **Assumption / needs confirmation**: exact column lists for `ce_risk_policies`, `ce_risk_policy_factors`, `ce_risk_bands`, `ce_risk_config` were not exhaustively read. See the listed services and migrations for the authoritative schema.
