
Goal: fully fix search/filter alignment by rebuilding the shared toolbar logic (not page-by-page hacks), then run route-by-route visual QA across all Internal Audit pages.

What I found (from code + current preview):
1) The current StandardSearchFilterBar is still unstable:
- Desktop column math creates oversized empty reset areas when filters are few.
- Multi-row logic distributes row 2 unevenly (especially 5-filter pages like Follow-up Tracker).
- Inline `gridColumn` spans apply at all breakpoints, causing awkward tablet wrapping/alignment.
- Dynamic class names like `lg:col-span-${colSpan}` are unreliable.
2) Most Internal Audit list routes do use the shared component, so fixing it centrally will correct nearly all pages at once.

Implementation plan:
1) Rebuild `src/components/common/StandardSearchFilterBar.tsx` layout engine with strict deterministic rules:
- Desktop: true 12-col grid only.
- Default spans: Search=4, each filter=2, Reset fixed at far right.
- No unpredictable flex growth.
- Compact uniform controls (`h-9`), consistent label spacing, uniform gaps/padding.
2) Replace current multi-row algorithm with controlled wrapping:
- If controls fit comfortably, single row.
- If not, split into two explicit rows.
- Follow-up Tracker special requirement supported via reusable prop (config-driven, not custom page markup): row 1 = Search + first 2 filters; row 2 = remaining filters + Reset.
3) Keep API/backward compatibility of the component, but add optional layout config props (e.g., first-row filter cap / desktop split strategy) so pages can declare structure without custom UI code.
4) Remove dynamic Tailwind span strings and breakpoint-conflicting inline grid behavior; use explicit grid templates per breakpoint.
5) Fix debounce effect dependencies in the component to avoid stale search updates.

Page wiring updates:
- Keep all existing filters/business logic.
- Add only layout-config props where required:
  - `/audit/follow-up-tracker` (explicit 2-row distribution).
  - Any other high-density filter pages if needed after QA (likely `/audit/activity-workbench`, `/audit/audit-reports`).

QA/test plan (must be completed before finalizing):
Desktop + Tablet + Mobile checks for:
- /audit/auditors
- /audit/leave
- /audit/holidays
- /audit/audit-plans
- /audit/activity-workbench
- /audit/evidence
- /audit/working-papers
- /audit/findings
- /audit/responses
- /audit/actions
- /audit/follow-up-tracker
- /audit/plan-closeout
- /audit/departments
- /audit/functions
- /audit/plan-approval
- /audit/audit-reports
- /audit/calendar
- /audit/letters
- /audit/communication-center

Acceptance checklist:
- Search not over-dominant.
- Dropdown/date widths balanced and equal-height.
- Reset always right-aligned and visually connected.
- No cramped date inputs.
- Clean wrap behavior (no overflow/squeezing).
- Consistent spacing/label alignment across all audited routes.

Deliverable:
- One corrected shared toolbar system + small page config touches only where needed + verified screenshots/route-by-route QA notes for the key problematic pages (Auditors, Audit Plans, Activity Workbench, Follow-up Tracker, Plan Closeout, Department Master).
