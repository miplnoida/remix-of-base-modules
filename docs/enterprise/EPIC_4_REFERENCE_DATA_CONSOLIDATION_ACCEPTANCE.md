# Epic 4 — Reference Data Consolidation: Acceptance

## Scope
Introduce a governed reference-data layer that connects the existing Reference Framework, master-data pages, table registry, and legacy mapping into one catalogue. No master-data CRUD page is duplicated or removed.

## Deliverables

### Database (single migration)
- `core_reference_source_map` — reference group → physical source (table/view/service) with FKs to `core_table_registry` and `core_legacy_table_map`, sync strategy, lifecycle, capabilities, steward.
- `core_reference_consumer_map` — which modules/features consume each group; usage type, cache, impact.
- `core_reference_dependency_map` — dependencies between reference groups (parent/child, filtered_by, etc.).
- `core_reference_change_policy` — allow_create/update/delete/retire, approval, blockers, effective-date/reason rules.
- Check constraints for `source_type`, `sync_strategy`, `lifecycle_status`, `usage_type`, `impact_level`, `dependency_type`.
- `updated_at` triggers via existing `public.update_updated_at_column`.
- Standard grants (anon SELECT, authenticated CRUD, service_role ALL).
- All four registered in `core_table_registry` (PLATFORM / CORE / GOVERNANCE / CONFIGURATION / INTERNAL / ACTIVE, `canonical_admin_route = /admin/reference-framework`).
- Seeded 24 initial reference source mappings (OFFICE, DEPARTMENT, DESIGNATION, COUNTRY, DISTRICT, POSTAL_DISTRICT, MARITAL_STATUS, OCCUPATION, INDUSTRY, BANK_CODE, PAYMENT_METHOD, PAY_PERIOD, PAYER_TYPE, PAYMENT_TYPE, RECEIPT_STATUS, INVOICE_STATUS, C3_STATUS, LEGAL_STATUS, DEPENDENT_RELATION, RELATION, SSC_RATE, VC_CONTRIB_RATE, VC_ELIGIBILITY_CONFIG, VERIFY_STATUS) with FK backfill to registry + legacy maps.
- Default change policies auto-seeded per group.

### Frontend
- `src/platform/reference-governance/referenceGovernanceTypes.ts` — types, enums, `HealthIssue`.
- `src/platform/reference-governance/referenceGovernanceService.ts` — CRUD + `computeOverview` / `computeHealth` + cross-registry helpers.
- `src/platform/reference-governance/useReferenceGovernance.ts` — React Query hooks for lists, mutations, options.
- `src/platform/reference-governance/referenceGovernancePermissions.ts` — `core.admin.reference_governance.view/manage/approve`.
- `src/components/admin/reference/ReferenceGovernanceSection.tsx` — self-contained governance section with 7 tabs (Overview, Sources, Consumers, Dependencies, Change Policies, Legacy Values, Health).
- `src/pages/admin/ReferenceFramework.tsx` — extended (not duplicated): the new section renders below the existing governance tabs.

### Cross-registry integration
- Source dialog picks `table_registry_id` from `core_table_registry` and `legacy_table_map_id` from `core_legacy_table_map`.
- Admin route field is validated against `core_admin_route_registry` (inline warning if not registered).
- Legacy Values tab reads `core_legacy_value_map`; deep edits go to `/admin/legacy-mapping`.

### Health warnings
Generates severity-scored issues: NO_SOURCE, NO_OWNER, LEGACY_NOT_MAPPED, TABLE_NOT_REGISTERED, ROUTE_NOT_REGISTERED, ROUTE_INACTIVE, NO_POLICY, NO_DEP_RULE, DELETE_ON_HIGH_IMPACT, NO_VALUE_MAPPING, DEP_TARGET_UNKNOWN.

### Audit
Uses existing `logAudit`:
- `REFERENCE_SOURCE_CREATED|UPDATED|DEACTIVATED|REACTIVATED`
- `REFERENCE_CONSUMER_CREATED|UPDATED|DEACTIVATED|REACTIVATED`
- `REFERENCE_DEPENDENCY_CREATED|UPDATED|DEACTIVATED|REACTIVATED`
- `REFERENCE_POLICY_UPDATED|DEACTIVATED|REACTIVATED`

## Standing Rule Compliance
- **Admin Route Registry**: no new routes; existing `/admin/reference-framework` already registered as CANONICAL / GOVERNANCE.
- **Table Registry**: all four new tables registered.
- **Legacy Mapping**: no legacy table touched; seeded reference groups link to existing legacy table maps by name.
- **PlatformAdmin**: Reference Framework link unchanged (already present under Governance).

## Acceptance Checklist
1. ✅ `core_reference_source_map` exists.
2. ✅ `core_reference_consumer_map` exists.
3. ✅ `core_reference_dependency_map` exists.
4. ✅ `core_reference_change_policy` exists.
5. ✅ All four registered in `core_table_registry`.
6. ✅ Existing `/admin/reference-framework` extended, not duplicated.
7. ✅ Source mappings surfaced (Sources tab).
8. ✅ Consumer mappings surfaced (Consumers tab).
9. ✅ Dependency mappings surfaced (Dependencies tab).
10. ✅ Change policies surfaced (Change Policies tab).
11. ✅ Legacy value mappings surfaced from `core_legacy_value_map` (Legacy Values tab).
12. ✅ Health tab with severity counts and per-issue warnings.
13. ✅ Reference sources link to `core_table_registry` (dialog select + FK).
14. ✅ Reference sources link to `core_legacy_table_map` (dialog select + FK).
15. ✅ Admin routes referenced by sources are checked against `core_admin_route_registry`.
16. ✅ 24 initial reference groups seeded.
17. ✅ PlatformAdmin still links to Reference Framework.
18. ✅ Changes audited via existing `logAudit`.
19. ✅ No master-data page deleted.
20. ✅ No legacy table renamed.
21. ✅ No business module modified.
22. ✅ Typecheck passes.

## Out of Scope (deferred)
- Consolidated `core_audit_log` (future epic).
- Full RBAC refactor and approval permission enforcement (Epic 5).
- Migration staging/batch tables (Epic 10).
- Rebuild of legacy master-data CRUD screens (not planned).
