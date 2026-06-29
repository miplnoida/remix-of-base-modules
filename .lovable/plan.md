## Shrink Risk Band Distribution legend font

### Change
In `src/pages/compliance/dashboards/ManagerDashboard.tsx` (the `<Legend>` added in the previous fix), wrap the legend `formatter` return in a `<span style={{ fontSize: 11 }}>…</span>` so each row renders smaller. Tighten `height={48}` → `height={40}` to keep the layout compact.

### Other dashboards (Inspector, Monitoring, Analytics)
Verified by ripgrep — `InspectorDashboard.tsx`, `ComplianceMonitoring.tsx`, and `ComplianceAnalytics.tsx` contain no Recharts `<Legend>` and no overlapping in-slice pie labels. **No change needed** in those files. (The only other inline pie label in ManagerDashboard is the small "Cases by Status" donut where labels do not overlap; leaving it alone per scope.)

### Out of scope
- Colors, chart sizing, data, or any other dashboard widget.
