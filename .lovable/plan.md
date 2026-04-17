

## Plan: Make dashboard cards & widgets intelligently clickable

Goal: turn the read-only dashboard into a navigation hub. Each KPI / chart / list item routes to the most relevant existing page using the `DashboardKPICard onClick` prop (already supported) and `useNavigate()` for the rest. **No new routes, no logic changes** — only adding `onClick` + cursor/hover affordances. All target routes verified to exist in `AppRoutes.tsx`.

### Routing map (intelligence applied)

**AdminDashboard.tsx — KPI Row**
| Card | Route |
|---|---|
| Total Employers | `/employers-management/dashboard` |
| Insured Persons | `/person/register` (list page) → use `/employers-management/dashboard` if no IP list; checking… use `/registration/insured-person-guide` as safer fallback. **Best match: `/bn/person-360`** |
| Active Claims | `/bn/claims` |
| Compliance Issues | `/compliance/violations` |

**AdminDashboard.tsx — FinancialSummaryStrip** (4 tiles, currently non-clickable)
| Tile | Route |
|---|---|
| Monthly Contributions | `/c3-management/c3-contribution` |
| Benefits Paid (MTD) | `/bn/claims` |
| Net Fund Surplus | `/reports/cashier` |
| Outstanding Arrears | `/compliance/reports/arrears` |

**AdminDashboard.tsx — Charts (header click → drill-down)**
| Widget | Route |
|---|---|
| ContributionTrendChart | `/c3-management/reports/payments-history` |
| ComplianceDonut | `/compliance/workbench/analytics` |
| RegistrationPipeline | `/employers-management/manage` |
| BenefitsDistribution | `/bn/dashboard` |

**AdminDashboard.tsx — RecentSystemActivity** — each row routes by `activity_type`:
- `violation` → `/compliance/violations`
- `inspection` → `/compliance/field/inspections`
- `registration` → `/employers-management/pending-verification`
- `payment` → `/c3-management/payments`
- `claim` → `/bn/claims`

**AdminDashboard.tsx — AlertsWidget** — each alert row → `/admin/notifications/log` (generic). Header "View all" link → same.

**ComplianceDashboard.tsx** — 4 metric cards become clickable:
- Open Violations → `/compliance/violations`
- Compliant Employers → `/compliance/employers/management`
- Pending Audits → `/compliance/field/audit-management`
- Total Employers → `/employers-management/dashboard`
- Bottom "Compliance Overview" 3 tiles → `/compliance/workbench/analytics`, `/compliance/field/inspections`, `/compliance/violations`

**BenefitsDashboard.tsx** — 4 stat cards + items:
- Total Claims / Total Benefits / Active Claims → `/bn/claims`
- Benefit Types → `/bn/config/products`
- Each "Recent Claim" row → `/bn/claims/:id` (using `claim.claim_number` lookup not available → route to `/bn/claims` filtered by status as fallback). Use `/bn/claims/${claim.id ?? ''}` if `id` exists; else `/bn/claims`.
- "Process New" button → `/bn/claims`
- Benefit Type rows → `/bn/config/products`

**HRDashboard (inside Dashboard.tsx)** — 4 cards:
- Insured Persons → `/bn/person-360`
- Total Employers → `/employers-management/dashboard`
- Active Claims → `/bn/claims`
- Compliance Issues → `/compliance/violations`

**FinancialDashboard (inside Dashboard.tsx)** — 4 tiles map identical to FinancialSummaryStrip above.

### Implementation details

1. **AdminDashboard.tsx** — add `onClick` to existing `DashboardKPICard` instances (prop already supported). Wrap chart `<Card>` headers' titles with cursor + onClick *only on the title*, so the chart itself stays interactive. Pass new `onItemClick` props down to `RecentSystemActivity`, `AlertsWidget`, `FinancialSummaryStrip`, `RegistrationPipeline`, `BenefitsDistribution`, `ComplianceDonut`, `ContributionTrendChart`.

2. **Widget components** — add optional `onClick` / `onItemClick` props (no behavioural change if absent). Add `cursor-pointer hover:bg-muted/40` to clickable rows; add `cursor-pointer` + retain existing `hover:shadow-card-hover` on clickable cards.

3. **ComplianceDashboard.tsx** & **BenefitsDashboard.tsx** & inline **HRDashboard / FinancialDashboard** — wrap each `<Card>` with `onClick={() => navigate(...)}` and add `cursor-pointer hover:shadow-md transition-shadow` classes. Existing inner content unchanged.

4. **Accessibility** — clickable cards get `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter / Space → navigate), or use `<button>` wrapper where structure allows.

5. **Safety** — every target route was verified to exist in `src/components/routing/AppRoutes.tsx`. If a route is permission-gated, the existing `ProtectedLayout` will gracefully redirect — no broken links.

### Files to change (8)
- `src/components/Dashboard.tsx` (HR + Financial inline dashboards)
- `src/components/dashboards/AdminDashboard.tsx`
- `src/components/dashboards/ComplianceDashboard.tsx`
- `src/components/dashboards/BenefitsDashboard.tsx`
- `src/components/dashboards/widgets/FinancialSummaryStrip.tsx`
- `src/components/dashboards/widgets/AlertsWidget.tsx`
- `src/components/dashboards/widgets/RecentSystemActivity.tsx`
- `src/components/dashboards/widgets/{ContributionTrendChart,ComplianceDonut,RegistrationPipeline,BenefitsDistribution}.tsx` (header-only click)

### Out of scope
- No data-model / SQL changes.
- No new routes, no permission changes, no widget redesign.
- Charts remain interactive (tooltip etc.); only the title area gets a click handler so users don't lose chart interactivity.
- Quick Actions widget — already navigates correctly; left untouched.

### Verification
- Each KPI card visibly hoverable + cursor pointer.
- Click each → lands on the mapped route without console errors.
- Keyboard Tab + Enter triggers navigation (a11y).
- Activity rows route by `activity_type` correctly.
- No regressions on existing buttons (Compliance "View All", Benefits "Process New" — preserved).

