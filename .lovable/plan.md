## Business Module Foundation — Pilot Epic: Employer Registry

This epic applies the new **Parallel Screen / Controlled Pilot / No Disruption** rollout rule to the **first business module: Employer**. All existing employer screens, routes, tables, and menu items remain untouched. A new governed screen is added alongside them, visible only to pilot/admin users.

---

### 1. Non-disruption guarantees (nothing removed or changed)

- Existing employer routes (`/employers/*`, `/admin/employers*`, `EmployerDirectory`, `EmployerRegistration`, etc.) — untouched.
- Existing menu entries — untouched.
- Existing employer tables (`au_er_master`, `er_master`, `er_*`, `bema_registrations`, etc.) — no rename, no drop, no schema change, no data change.
- Old route is **not** marked LEGACY in this epic.

### 2. New screen (pilot)

- Route: **`/admin/employer-registry`** (business-friendly name: **Employer Registry**).
- Page: `src/pages/admin/EmployerRegistry.tsx` with simple business sections (Summary, Basic Details, Registration, Contact & Address, Compliance, Contribution, Linked Records, History). Advanced/Migration/Audit tucked behind "More Details".
- Detail route `/admin/employer-registry/:employerId` with `show_in_platform_admin=false`.
- Registered in PlatformAdmin navigation only for users holding `er.admin.employer_registry.view`.

### 3. Route governance (`core_admin_route_registry`)

Insert new rows only (existing rows untouched):

- `/admin/employer-registry` — page_name "Employer Registry", admin_domain `EMPLOYER`, canonical_status `CANONICAL`, owner_module_code `EMPLOYER`, requires_permission `er.admin.employer_registry.view`, `show_in_platform_admin=true`.
- `/admin/employer-registry/:employerId` — same domain, `show_in_platform_admin=false`.

### 4. Permission strategy

Seed in **both** `core_permission_registry` and `src/platform/rbac/core.permissions.ts`:

```
er.admin.employer_registry.view
er.admin.employer_registry.create
er.admin.employer_registry.update
er.admin.employer_registry.deactivate
er.admin.employer_registry.manage_status
er.admin.employer_registry.view_sensitive
er.admin.employer_registry.pilot_access
```

Grant to existing roles only: **Admin**, **Application Admin**, **Migration Admin** (if present), plus a **Pilot Employer Admin** role added only if not already present.

### 5. Data strategy — no duplicate source of truth

- No new `employer` data table in this epic.
- The new screen reads through a new `employerRegistryService` that consumes existing legacy tables via a compatibility layer (initially `au_er_master` / `er_master`).
- No writes in this epic beyond audit + workflow instance rows. Create/Update/Status actions in the new screen route through the workflow engine (DRAFT definitions) so nothing mutates the legacy employer row without approval.

### 6. Legacy mapping (`core_legacy_table_map`, `core_legacy_column_map`, `core_legacy_value_map`)

Register mappings for the legacy employer tables the new screen touches:

- Tables: `au_er_master`, `er_master`.
- Columns: legacy id/number/name/registration_date/status/contribution_status/office_code/address/contact → modern canonical field names.
- Value maps for status codes (Active/Inactive/Suspended, Compliant/Non-Compliant/Under Audit, Paid/Overdue/Pending).

Also register the legacy tables in `core_table_registry` if not already.

### 7. Reference governance

Register in `core_reference_source_map` + `core_reference_consumer_map`:

- `EMPLOYER_STATUS`, `EMPLOYER_TYPE`, `EMPLOYER_SECTOR`, `EMPLOYER_CATEGORY`, `EMPLOYER_REGISTRATION_STATUS`, `EMPLOYER_COMPLIANCE_STATUS`, `EMPLOYER_CONTRIBUTION_STATUS`, `BUSINESS_ACTIVITY_TYPE`.
- Consumer: module `EMPLOYER`, feature `employer_registry`, route `/admin/employer-registry`.

### 8. Audit events (`core_audit_event_type` + `coreAuditService`)

Seed:

```
EMPLOYER_REGISTRY_CREATED
EMPLOYER_REGISTRY_UPDATED
EMPLOYER_REGISTRY_DEACTIVATED
EMPLOYER_REGISTRY_REACTIVATED
EMPLOYER_STATUS_CHANGED
EMPLOYER_SENSITIVE_VIEWED
EMPLOYER_EXPORT_CREATED
EMPLOYER_LEGACY_MAPPING_USED
```

Add to `src/platform/audit/auditEventTypes.ts` under `employer.registry`.

### 9. Workflow readiness (Epic 9 engine)

Seed **DRAFT** workflow definitions in `core_workflow_definition` / `core_workflow_step` / `core_workflow_transition`:

- `EMPLOYER_REGISTRATION_APPROVAL`
- `EMPLOYER_STATUS_CHANGE_APPROVAL`
- `EMPLOYER_DEACTIVATION_APPROVAL`
- `EMPLOYER_SENSITIVE_CORRECTION_APPROVAL`

Steps: SUBMIT → REVIEW → APPROVE → END, with RETURN/REJECT transitions.

### 10. Migration Control (Epic 10) readiness

Register a `mig_migration_plan` for **EMPLOYER_FOUNDATION** with plan_tables for `au_er_master`, `er_master`, and seed cutover readiness checks for column/value mapping completeness, validation, reconciliation, and issues. No data movement.

### 11. Release Readiness (Epic 12)

The new checks pick this up automatically via registered route, permissions, table registry, reference governance, audit events, and migration plan.

### 12. Files to add / edit

**New**
- `src/pages/admin/EmployerRegistry.tsx` (list + tabs)
- `src/pages/admin/EmployerRegistryDetail.tsx` (record view, business sections)
- `src/platform/employer-registry/types.ts`
- `src/platform/employer-registry/permissions.ts`
- `src/platform/employer-registry/service.ts` (reads legacy `au_er_master` / `er_master` via adapter, writes audit, opens workflow instances)
- `src/platform/employer-registry/hooks.ts`
- One migration `supabase/migrations/<ts>_employer_registry_foundation.sql` — permissions, route, table registry, legacy mapping, reference source/consumer, audit event types, workflow DRAFT defs, migration plan, role grants.

**Edited (append only, no deletions)**
- `src/components/routing/AppRoutes.tsx` — add two new routes.
- `src/pages/admin/PlatformAdmin.tsx` — add Employer Registry entry under Business Modules, permission-gated.
- `src/platform/rbac/core.permissions.ts` — add 7 permissions.
- `src/platform/audit/auditEventTypes.ts` — add `employer.registry.*` codes.

### 13. Acceptance mapping

All 21 acceptance criteria are satisfied by the above:
- Old screen/route/menu/data untouched (1, 2, 17, 18, 19).
- New route + registered in `core_admin_route_registry` (3, 4).
- Permissions in both registries, gated (5, 6, 7, 8).
- No duplicate source of truth — reads via adapter (9).
- Legacy tables/columns/values mapped (10).
- Reference governance registered (11).
- Audit events seeded and used (12, 13).
- Workflow DRAFT defs seeded, mutations routed via workflow (14).
- Migration plan seeded (15).
- Business-friendly UI (16).
- Typecheck runs after implementation (20).
- Release readiness dashboard picks up new registrations automatically (21).

### 14. What this epic explicitly does NOT do

- Does not mark the old route LEGACY / hidden / redirected.
- Does not migrate employer data.
- Does not write to legacy employer tables from the new screen (all mutations go through DRAFT workflow instances until approvals are wired).
- Does not force any user off the existing screen.

---

Shall I proceed with implementation exactly as planned?
