## Fix: Risk Band Distribution chart label overlap

### Problem
In `ManagerDashboard.tsx` the donut uses in-slice labels (`band: count (pct%)`) printed at the outer radius. When one band dominates (LOW ~94%) the remaining 3 bands occupy tiny arcs and their labels collide on the right edge — exactly what the screenshot shows ("Critical / Medium" stacked on top of each other).

### Fix (single file: `src/pages/compliance/dashboards/ManagerDashboard.tsx`, ~lines 246–265)

1. **Remove the inline `label` prop** on `<Pie>`. Inline labels on a donut with extreme skew always collide; no amount of `labelLine` tweaking fixes it cleanly.
2. **Add a bottom `<Legend />`** that lists every band with its count and percentage, e.g. `LOW — 1092 (94%)`. Use a small custom `formatter` so each legend row reads `BAND — count (pct%)` instead of just the band name.
3. **Add `paddingAngle={2}`** and a thin `stroke="hsl(var(--background))"` on cells so the small slices stay visually distinguishable in the ring.
4. **Bump container height** from 260 → 300 to give the legend room without squeezing the donut.
5. Keep the existing `<Tooltip>` for hover detail (already shows count).

No data, query, or business-logic changes. Pure presentation.

### Out of scope
- Risk-band thresholds, colors, counts, query keys.
- Other charts in the row (Radar, Cases by Status).
