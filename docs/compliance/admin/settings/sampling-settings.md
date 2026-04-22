# Sampling Settings

## 1. Screen Overview
- **Screen name**: Risk & Sampling Policy Settings
- **Route/path**: `/compliance/admin/settings/sampling`
- **Page component**: `src/pages/compliance/sampling/RiskSamplingSettings.tsx`
- **Parent menu location**: Compliance → Admin → Settings (`app_modules.name = 'ce_sampling_settings'`, sort_order 5)
- **Screen type**: Settings (placeholder / not yet provisioned)

## 2. Business Function
**Intended**: configure how the audit-planning engine selects employers for inspection — the mix of random sampling, risk-weighted sampling, and mandatory rules (e.g. "every employer with >$50k arrears must be visited annually"). Used by **Audit Planning Owners / Compliance Policy Owners** when defining the annual / quarterly inspection programme.

**Current state**: stub. The page only renders an empty-state Card explaining that the sampling settings store is not yet provisioned in this environment, and points users to **Compliance → Admin → Risk Policies** as the interim configuration surface.

## 3. Primary User Roles
- **Access**: Compliance Admin, Audit Planning Owner (when the screen is implemented).
- Currently no edit / approve roles because no edit surface exists.

## 4. UI Responsibilities
- `PageHeader` with breadcrumb trail (Compliance → Admin Settings → Risk & Sampling).
- Single `Card` empty-state with icon, title "Sampling Settings Not Yet Provisioned", and pointer to Risk Policies.
- No filters, forms, dialogs, or tables.

## 5. Main Actions and Business Outcomes
None — the screen is read-only informational.

## 6. Data Model / Tables Used
None directly. Future intent (per intro paragraph):
- A `ce_sampling_*` table family (mandatory rules, random-pool sizing, risk-weighting parameters).
- Will likely consume `ce_risk_bands` and `ce_risk_policies` from the Risk Policy screen.

## 7. Services / Hooks / Queries Used
- `PageHeader` shared component only.
- No data fetching.

## 8. Validation Rules
- N/A in current stub.

## 9. Workflow / Approval / Notification Logic
- N/A.

## 10. Linkages to Other Screens
- **Risk & Escalation Policy** — current substitute configuration surface.
- **Audit Planning / Weekly Plan Builder V3** (`/compliance/field/plan-builder-v3`) — the intended *consumer* of sampling settings (selects employers for the weekly plan).
- **Risk Simulator** — would dry-run sampling once implemented.

## 11. Audit Trail / Logging
- N/A.

## 12. Technical Risks / Gaps / Assumptions
- **The screen is a stub.** Anyone landing here today gets no functionality. The menu entry exists in `app_modules` (`ce_sampling_settings`) and is enabled by default for admins.
- The pointer to "Risk Policies" is helpful but Audit Planning currently relies on hardcoded sampling defaults inside the planner builders — meaning policy-driven sampling is not actually live.
- **Risk of misleading menu**: appearing in the sidebar implies functionality.

## 13. Recommended Improvements
1. Either disable the menu entry until the feature ships (`is_enabled=false`) **or** ship a minimal v1: random-N + risk-weighted-N + mandatory rules, persisted in `ce_sampling_policies` + `ce_sampling_mandatory_rules`.
2. Wire the Weekly Plan Builder V3 to consume the sampling settings instead of in-builder defaults.
3. Add a Test/Preview button: "How many employers would today's policy select?".
4. Track sampling decisions in an `audit_planning` log so legal can defend the selection later.

## 14. File References
- Route: `src/components/routing/AppRoutes.tsx` (line ~1089)
- Page: `src/pages/compliance/sampling/RiskSamplingSettings.tsx`
- Shared component: `src/components/shared/PageHeader.tsx`
- Migrations: none yet for sampling
- Related (interim): `src/pages/compliance/settings/RiskRulePolicy.tsx`

> **Assumption / needs confirmation**: the planned schema (`ce_sampling_*`) is inferred from the page copy; no migration of that name currently exists.
