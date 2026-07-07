# Epic 2 — Table Naming Governance: Acceptance

## Scope
Introduce a governed catalogue of every platform, module, migration, reporting, and legacy database table via `core_table_registry` and the `/admin/table-registry` admin page.

## Deliverables

### Database
- `core_table_registry` created with fields per spec, check constraints for `ownership_type`, `table_category`, `lifecycle_status`, `data_classification`.
- Cross-field checks enforce: legacy → `modern_alias` + `legacy_table_name` required; `MODULE` ownership → `module_code` required; PII → non-public classification; health data → `RESTRICTED`/`SENSITIVE`.
- Trigger `core_table_registry_validate_naming` enforces prefix → module/ownership rules (`core_`, `bn_`, `er_`, `ip_`, `c3_`, `ce_`, `fin_`, `lg_`, `rpt_`, `mig_`).
- Standard GRANTs (anon read, authenticated CRUD, service_role all).
- Seeded initial rows for `core_admin_domain_registry`, `core_admin_route_registry`, `core_table_registry`, `profiles`, `user_roles`, `app_modules`, `module_actions`, `role_permissions`, `tb_office`, `tb_office_departments`, `audit_logs`, `notification_templates`, `in_app_notifications`, `password_policies`.

### Frontend
- `src/platform/table-registry/tableRegistryTypes.ts` — types, enums, `validateTableNaming`.
- `src/platform/table-registry/tableRegistryService.ts` — CRUD + validation + audit hooks.
- `src/platform/table-registry/useTableRegistry.ts` — React Query hooks.
- `src/platform/table-registry/tableRegistryPermissions.ts` — `core.admin.table_registry.view`, `core.admin.table_registry.manage`.
- `src/pages/admin/TableRegistryAdmin.tsx` — page with summary cards, filters, table, badges, create/edit dialog.
- `AppRoutes.tsx` — new route `/admin/table-registry` (no existing route removed).
- `PlatformAdmin.tsx` — new Governance link "Table Registry".

### Standing Rule Compliance
- `/admin/table-registry` upserted into `core_admin_route_registry`:
  - domain `GOVERNANCE`, status `CANONICAL`, owner `CORE`
  - permission `core.admin.table_registry.view`
  - `show_in_platform_admin = true`, `is_active = true`
  - `page_component = TableRegistryAdmin`, `source_file_path = src/pages/admin/TableRegistryAdmin.tsx`

### Audit
Actions logged via existing `logAudit`:
- `TABLE_REGISTRY_CREATED`, `TABLE_REGISTRY_UPDATED`, `TABLE_REGISTRY_DEACTIVATED`, `TABLE_REGISTRY_REACTIVATED`.

## Acceptance Checklist
1. ✅ `core_table_registry` exists with all fields and constraints.
2. ✅ Prefix / module / ownership naming validation enforced at DB and service level.
3. ✅ Important existing admin/platform/legacy tables seeded.
4. ✅ `/admin/table-registry` page renders and is reachable from Platform Admin.
5. ✅ List, search, filter, create, edit, deactivate, reactivate all work.
6. ✅ Legacy tables registered without renaming physical tables.
7. ✅ Legacy entries require modern alias and legacy table name.
8. ✅ Module-owned tables require module code.
9. ✅ PII/health flags enforce data classification.
10. ✅ `/admin/table-registry` registered in `core_admin_route_registry`.
11. ✅ PlatformAdmin links to Table Registry under Governance.
12. ✅ Permission keys defined.
13. ✅ Registry mutations audited.
14. ✅ No existing table renamed or modified.
15. ✅ No business module changed.

## Screen & Legacy Table Compliance
- No new duplicate screen: Table Registry is the sole governance surface for table naming; not overlapping with `/admin/route-registry` (routes) or `/admin/reference-framework` (reference data).
- No BEMA/legacy table (`bema_*`, `tb_*`, `ia_*`, etc.) is altered. Legacy tables are registered read-only with a modern alias — the physical name is preserved.
