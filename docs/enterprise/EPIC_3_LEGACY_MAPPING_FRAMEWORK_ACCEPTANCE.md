# Epic 3 — Legacy Mapping Framework: Acceptance

## Scope
Introduce a formal old-to-new mapping dictionary for the PowerBuilder migration: tables, columns, values and relationships — without renaming any existing physical table.

## Deliverables

### Database
- `core_legacy_table_map` — legacy table → modern entity, alias, service, route, use strategy, mapping status, classification flags, PKs, source system.
- `core_legacy_column_map` — old column → modern field, data types, PII classification, transformation/validation rules, display metadata.
- `core_legacy_value_map` — old code → modern code/label linked to reference groups; effective from/to dates.
- `core_legacy_relationship_map` — old FK-style relationships → modern relationship name/type.
- Check constraints for `use_strategy`, `mapping_status`, `relationship_type`, `pii_classification`.
- `updated_at` triggers on all four tables.
- Standard GRANTs (anon read, authenticated CRUD, service_role all).

### Frontend
- `src/platform/legacy-mapping/legacyMappingTypes.ts` — types, enums, validators, `legacyTableMapWarnings`, `suggestCompatibility`.
- `src/platform/legacy-mapping/legacyMappingService.ts` — CRUD for all four tables, eligible-legacy-tables from `core_table_registry`, audit hooks.
- `src/platform/legacy-mapping/useLegacyMapping.ts` — React Query hooks for every service method.
- `src/platform/legacy-mapping/legacyMappingPermissions.ts` — `core.admin.legacy_mapping.view` / `.manage` / `.approve` (approve gate is TODO'd until RBAC enforcement).
- `src/pages/admin/LegacyMappingAdmin.tsx` — summary cards, filters, table, create/edit dialog, approve action, deactivate/reactivate.
- `src/pages/admin/LegacyMappingDetailAdmin.tsx` — Overview, Columns, Value Mapping, Relationships, Compatibility, Data Quality (placeholder), Audit (placeholder) tabs with full CRUD on columns, values, relationships.

### Routing
- `/admin/legacy-mapping` and `/admin/legacy-mapping/:tableMapId` added to `AppRoutes.tsx`.
- No existing route removed or renamed.

### Standing Rule Compliance

**Admin routes registered in `core_admin_route_registry`:**
- `/admin/legacy-mapping` — MIGRATION domain, CANONICAL, `core.admin.legacy_mapping.view`, shown in Platform Admin.
- `/admin/legacy-mapping/:tableMapId` — MIGRATION domain, CANONICAL, `core.admin.legacy_mapping.view`, hidden from Platform Admin.

**New tables registered in `core_table_registry`:**
- `core_legacy_table_map`, `core_legacy_column_map`, `core_legacy_value_map`, `core_legacy_relationship_map` — all PLATFORM / CORE / MIGRATION / CONFIGURATION / INTERNAL / ACTIVE with `canonical_admin_route = /admin/legacy-mapping`.

### Platform Admin
- New "Migration" group added under Governance; contains the Legacy Mapping link.
- Existing Governance links unchanged.

### Seed Data
Initial legacy table maps seeded for: `tb_office`, `tb_office_departments`, `profiles`, `user_roles`, `app_modules`, `module_actions`, `role_permissions`, `audit_logs`, `notification_templates`, `in_app_notifications`, `password_policies`. Each links to its `core_table_registry` row where available.

### Audit
All create/update/deactivate/reactivate/approve actions use existing `logAudit`:
- `LEGACY_TABLE_MAP_CREATED|UPDATED|DEACTIVATED|REACTIVATED|APPROVED`
- `LEGACY_COLUMN_MAP_CREATED|UPDATED|DEACTIVATED`
- `LEGACY_VALUE_MAP_CREATED|UPDATED|DEACTIVATED`
- `LEGACY_RELATIONSHIP_MAP_CREATED|UPDATED|DEACTIVATED`

## Acceptance Checklist

1. ✅ `core_legacy_table_map` exists.
2. ✅ `core_legacy_column_map` exists.
3. ✅ `core_legacy_value_map` exists.
4. ✅ `core_legacy_relationship_map` exists.
5. ✅ All four registered in `core_table_registry`.
6. ✅ `/admin/legacy-mapping` list page exists.
7. ✅ `/admin/legacy-mapping/:tableMapId` detail page exists.
8. ✅ Both routes registered in `core_admin_route_registry`.
9. ✅ PlatformAdmin links to Legacy Mapping (Migration group).
10. ✅ List page supports summary cards, filters, table, create/edit, deactivate/reactivate, approve.
11. ✅ Detail page has Overview, Columns, Value Mapping, Relationships, Compatibility, Data Quality (placeholder), Audit (placeholder) tabs.
12. ✅ Column mapping supports legacy column → modern field.
13. ✅ Value mapping supports legacy code → modern code/label.
14. ✅ Relationship mapping documents old relationships.
15. ✅ Framework integrates with `core_table_registry` via `getEligibleLegacyTablesFromTableRegistry` and `table_registry_id` FK.
16. ✅ No existing table renamed.
17. ✅ No business module modified.
18. ✅ Changes audited via existing audit mechanism.
19. ✅ Typecheck passes.

## Screen & Legacy Table Compliance
- No new duplicate screen: Legacy Mapping is the sole surface for legacy→modern dictionary, distinct from `/admin/table-registry` (naming governance) and `/admin/route-registry` (route governance).
- No BEMA / `tb_*` / `ia_*` / other legacy table is altered. Legacy tables are catalogued and mapped read-only via new PLATFORM registry tables.

## Out-of-Scope (deferred)
- Full migration engine, data import batches, staging tables — Epic 10 (PowerBuilder Migration Control Centre).
- Reference Framework refactor — Epic 4 (Reference Data Consolidation).
- Consolidated `core_audit_log` — dedicated future epic.
- Global RBAC refactor — dedicated future epic.
