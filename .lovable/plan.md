
## Goal

Make the floating Developer Information (`</>`) panel — Overview, Tables, Logic, Fields, Actions, Dependencies, Audit, Re-analyze, Copy, Export — work on **every Compliance & Enforcement page and sub-menu**, not just the few that already have a row in `dev_info_screens`.

## Findings

- `src/components/routing/AppRoutes.tsx` + `src/pages/compliance/Routes.tsx` register ~190 routes under `/compliance/*`.
- Only ~62 of those routes currently have a row in `dev_info_screens`, so on most Compliance pages the modal shows "No Developer Information".
- Re-analyze already works for any route since the last change (the modal auto-bootstraps a stub `dev_info_screens` row when missing). What's still missing for parity with C3 Dashboard is a curated, named seed entry per route so:
  - The screen has a stable `screen_code`, `screen_name`, `module_name`, `submodule_name`, and `menu_path`.
  - The Overview section shows meaningful labels even before the first AI run.
  - Admin maintenance lists/filters by module work correctly.
- Concrete-id routes (e.g. `/compliance/violations/:id`) cannot be matched verbatim by the modal at runtime because it looks up `route_url` against `location.pathname`. Those need a runtime fix in the lookup, not just data.

## Plan

### 1. Bulk-seed missing Compliance routes in `dev_info_screens`

One `INSERT … SELECT … WHERE NOT EXISTS` batch (via the data tool) for every `/compliance/*` route registered in the router. For each row:

- `screen_code` — derived from the path, e.g. `CE_<UPPER_SNAKE>` (capped to 60 chars, unique).
- `screen_name` — human title derived from the leaf segment (e.g. "Compliance Manager Dashboard").
- `module_name` — `Compliance & Enforcement`.
- `submodule_name` — second segment mapped to a friendly label: `workbench → Workbench`, `cases → Cases`, `violations → Violations`, `notices → Notices`, `arrangements → Arrangements`, `enforcement → Enforcement`, `legal → Legal`, `audit-planning → Audit Planning`, `field → Field Operations`, `reports → Reports`, `risk → Risk`, `sampling → Sampling`, `monitoring → Monitoring`, `admin → Administration`, `staff → Staff`, `settings → Settings`, `tools → Tools`, `automation → Automation`, `geography → Geography`, `dashboard → Dashboards`, `operations → Operations`, `employers → Employers`, `inspections → Inspections`.
- `menu_path` — `Compliance & Enforcement › <Submodule> › <Screen Name>`.
- `screen_type` — `dashboard` / `report` / `settings` / `list` / `detail` inferred from segments (dashboards under `/dashboard|/workbench`, reports under `/reports`, settings under `/settings|/admin`, dynamic-id paths → `detail`).
- `documentation_status` — `pending`, `is_active = true`.
- `ON CONFLICT (screen_code) DO NOTHING` so reruns and prior rows are preserved.

This is data only — no schema change, no migration.

### 2. Match dynamic routes (`:id`, `:employerId`, etc.) at runtime

Update `developerInfoService.getScreenByRoute` so dynamic routes resolve to their template row:

- Try exact `route_url = pathname` first (current behavior).
- If no row, list `route_url` containing `:` and match by converting each template (`/compliance/violations/:id`) into a regex (`/compliance/violations/[^/]+`) and testing against the pathname.
- Return the first match, or `null` if none.

No change to `DeveloperInfoFAB` or `DeveloperInfoModal` is needed because the bootstrap-on-Reanalyze path added previously still covers any future or unknown route.

### 3. Verification

- Visit a representative sample after seeding: `/compliance/cases/intake`, `/compliance/workbench/queues`, `/compliance/enforcement/notices`, `/compliance/reports/violations/zone`, `/compliance/admin/settings/sampling`, `/compliance/violations/<real-id>`. In each:
  - `</>` FAB opens the panel with the correct Route, screen name, module, and submodule shown in Overview.
  - Re-analyze populates Tables/Logic/Actions/etc., changes badge to `auto extracted`.
  - Copy and Export produce the same JSON shape as on C3 Dashboard.
- Query: `SELECT count(*) FROM dev_info_screens WHERE module_name = 'Compliance & Enforcement'` should rise from ~62 to ~190.

## Files to change

- `src/services/developerInfoService.ts` — add dynamic-route fallback inside `getScreenByRoute`.
- Data change (no migration): bulk `INSERT … WHERE NOT EXISTS` into `dev_info_screens` for missing `/compliance/*` routes.

No changes to the FAB, modal, edge function, or routing.

## What this plan does NOT do

- It does not pre-run AI extraction for each new row (avoids ~130 LLM calls). Each page is one click away from full documentation via Re-analyze.
- It does not touch other modules (C3, Benefits, Finance, Legal, Audit, etc.). If you want the same sweep there, we can repeat steps 1–2 per module afterward.
