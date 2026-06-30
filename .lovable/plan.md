## Problem
Three issues in **Compliance Monitoring** (`/compliance/workbench/monitoring`):

1. **Non-Compliant and Under Review tiles show 0** even though `ce_v_compliance_monitoring` has 196 non_compliant, 1 critical, and 618 partially_compliant rows.
   - Root cause: `fetchComplianceMonitoring()` does `select("*")` with no pagination. Supabase caps the response at 1,000 rows, and the first 1,000 happen to all be `compliant`, so the other tiles compute 0.
2. **No pagination on the records table** — all rows render on one page, making navigation painful when there are thousands of records.
3. **"View" button does nothing** — the button has no `onClick`, so the user cannot drill into a record.

## Fix

### 1. Accurate summary tiles (server-side aggregation)
Add `fetchComplianceMonitoringStats(filters)` in the service layer. It runs four lightweight `count: 'exact', head: true` queries against `ce_v_compliance_monitoring`, one per tile bucket (Compliant / Non-Compliant + Critical / Under Review + Partially_Compliant / High + Critical risk). Active filters (employer id, employer name, status, risk) are applied so tiles reflect the current filter set.

### 2. Server-side paginated records table
- Add `fetchComplianceMonitoringPage(filters, page, pageSize)` using Supabase `.range(from, to)` with `count: 'exact'`, applying the same filters server-side (`ilike` for employer id/name, `eq` for status/risk).
- In `ComplianceMonitoring.tsx`:
  - Replace the single `useQuery` with two queries — stats (keyed on filters) and page (keyed on filters + page + pageSize).
  - Remove the client-side `filtered` / `stats` `useMemo` blocks.
  - Add a standard pagination footer: `Showing X–Y of N`, Prev / Next, page-size selector (10 / 25 / 50 / 100, default 25).
  - Reset to page 1 whenever any filter changes.

### 3. Wire the View button
- Use `useNavigate` from react-router and navigate to the existing Employer 360 route on click:
  `navigate('/compliance/field/employer-360/' + record.employer_id)`.
- Keep the existing button styling.

### Technical detail
Files touched:
- `src/services/complianceReportingService.ts`
  - Add `ComplianceMonitoringFilters` type.
  - Add `fetchComplianceMonitoringStats(filters)` → `{ compliant, nonCompliant, underReview, highRisk }`.
  - Add `fetchComplianceMonitoringPage(filters, page, pageSize)` → `{ rows, total }`.
  - Leave existing `fetchComplianceMonitoring()` export untouched for other callers.
- `src/pages/compliance/dashboards/ComplianceMonitoring.tsx`
  - Wire the two new queries, add pagination controls, drop client-side filter/stat memos, attach `onClick` handler to the View button via `useNavigate`.

No DB / view / migration changes. No UI restyle beyond the pagination footer and the View click handler.
