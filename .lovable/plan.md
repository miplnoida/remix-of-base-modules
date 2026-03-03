

## Fix: Dashboard Widget Overlapping Issues

Based on the screenshots, two widgets have layout problems:

### 1. Compliance Donut — Legend Text Overlap
The legend items show text running together (e.g., "Compliant12,840"). The flex layout between the donut chart and the legend column is too cramped at certain breakpoints.

**Fix:**
- Change the legend layout from side-by-side `flex-row` to a stacked vertical layout on smaller screens
- Add `min-w-0` and proper `gap` to prevent the name and value from colliding
- Reduce donut size slightly (outerRadius 80, innerRadius 52) so it fits comfortably in a 1/3-width grid column
- Use `flex-col` layout always within the card (donut on top, legend below) to avoid horizontal cramping

**File:** `src/components/dashboards/widgets/ComplianceDonut.tsx`

### 2. Quick Actions — Button Label Truncation
The 3-column grid with `grid-cols-3` causes labels like "Register Employer" and "New IP Application" to overflow their button containers.

**Fix:**
- Add `text-center` and `whitespace-normal` to allow text wrapping inside buttons
- Add a minimum height and consistent padding so all buttons align
- Ensure the grid uses `grid-cols-2` on small screens and `grid-cols-3` on medium+

**File:** `src/components/dashboards/widgets/QuickActions.tsx`

### Summary
Two file edits, no database changes, no new dependencies. Pure CSS/layout adjustments.

