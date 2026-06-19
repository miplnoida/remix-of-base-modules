## Benefits Configuration Governance Hardening

Goal: make BN config production-ready by reusing existing audit, approval, and override frameworks. **No new screens.** Backend + service-layer only.

---

### Phase 1 — Verify existing infrastructure (read-only)

Produce `docs/bn/governance-hardening-audit.md` documenting:

- `system_audit_trail` column coverage (user_id, user_name, session_id, ip_address, device_info, route, api_name, module, entity_type, entity_id, action, before_value, after_value, correlation_id, timestamp).
- Write-path scan: grep all `bn_*` config tables for direct `supabase.from(...).insert/update/delete` calls that bypass `writeBnAudit` / `useBnConfigAudit` / `systemLogger.logAudit`. Output an offender list per table.
- `bn_version_approval` actions in use (`submit/approve/reject/return/activate/retire`) and current consumers.
- `bn_override_request` / `bn_override_policy` / `bn_calc_override` reuse surface.

No code changes in this phase — output is a markdown report committed to repo.

---

### Phase 2 — Governance classification (metadata only)

Migration:
- New enum `bn_governance_class`: `SYSTEM | CONFIGURATION | REGULATORY | FINANCIAL`.
- New table `bn_config_entity_registry(entity_type PK, governance_class, lifecycle_required bool, effective_dating_required bool, approval_policy_code, notes)`.
- Seed initial mapping (Country/Currency/Timezone/Address = SYSTEM; Participant Types/Document Categories/Notification Categories/Comm Mapping = CONFIGURATION; Eligibility/Legal Refs/Contribution Rules/Rule Catalogue = REGULATORY; Formula Library/Rate Tables/Medical Tariffs/Payment Rules = FINANCIAL).

Service: `src/services/bn/governance/configRegistryService.ts` — `getClass(entityType)`, `requiresApproval(entityType)`, used by audit + approval routing.

---

### Phase 3 — Standard lifecycle

Migration:
- Enum `bn_lifecycle_state`: `DRAFT | IN_REVIEW | APPROVED | ACTIVE | RETIRED | REJECTED`.
- View `v_bn_config_lifecycle` that normalises each table's existing column (`is_active`, `status`, `rule_status`, `governance_status`, `lifecycle_status`) into a single `lifecycle_state` column per (entity_type, entity_id).
- Helper SQL function `bn_lifecycle_state(p_entity_type text, p_entity_id text) returns bn_lifecycle_state`.

No destructive column drops — existing fields stay, the view is the contract.

---

### Phase 4 — Standard audit columns

Migration adds missing `created_by / created_at / updated_by / updated_at` (text + timestamptz) to:
- `bn_country_legal_ref`
- `bn_country_participant_type` (add `updated_by/updated_at`)
- `bn_workflow_template`
- `workflow_steps`
- `bn_calculation_rule`
- `bn_override_policy` (add `updated_by/updated_at`)

Plus updated_at trigger on each. **No** IP/session/device columns — those remain only in `system_audit_trail`.

---

### Phase 5 — Effective dating

Migration adds `effective_from date`, `effective_to date NULL` to (where missing):
- `bn_reference_value` (already has — verify)
- `bn_country_legal_ref` (verify)
- `bn_rate_table` (verify)
- `bn_medical_tariff_table` (verify)
- `bn_formula_version`
- `bn_country_participant_type`
- `notification_templates`
- `ce_document_templates` / `ia_document_templates`

Add check constraint `effective_to is null or effective_to >= effective_from`.

---

### Phase 6 — Country Configuration Package versioning

Migration:
- `bn_country_config_package(id, country_code, package_code UNIQUE e.g. 'SKN-2026.1', label, status bn_lifecycle_state, activated_at, activated_by, immutable_hash, notes, created_by/at, updated_by/at)`.
- `bn_country_config_package_item(package_id, entity_type, entity_id, entity_version, snapshot_json)` — frozen snapshot of every constituent (legal refs, formula versions, rate tables, matrix tables, medical tariffs, participant types, product versions, eligibility rules).
- `bn_claim.package_id` FK column (nullable, backfill at adjudication time).
- DB function `bn_freeze_country_package(p_country, p_package_code)` that materialises snapshots and sets immutable_hash.

Service: `src/services/bn/governance/countryPackageService.ts` — `buildDraft`, `activate` (writes audit, blocks further edits to constituent rows by checking `lifecycle_state=ACTIVE` and `package immutable`), `getActiveForCountry`, `attachToClaim`.

No new UI.

---

### Phase 7 — Formula governance chain

Service `src/services/bn/governance/formulaResolverService.ts` (extends existing `variableResolverService`):
- For every active `bn_formula_template` / `bn_formula_version`, walk variables through: `bn_formula_variable_registry` → `bn_data_field_registry` → `bn_data_source_registry` → `bn_rate_table` / `bn_medical_tariff_table` / `bn_product_parameter`.
- Categorise each variable: RESOLVED / UNKNOWN / ORPHAN / UNMAPPED / MISSING_RATE_TABLE / MISSING_MATRIX.
- Persist to new table `bn_formula_resolution_report(run_id, formula_id, formula_version, variable_code, status, detail, checked_at)`.

CLI/run trigger: `scripts/bn/run-formula-resolution.ts` (node script invoked via `bun`) — writes report and fails non-zero on any UNKNOWN/MISSING in `ACTIVE` formulas.

Fix offenders flagged by the run (`rate`, `base_rate`, `grant_amount`, `contribution_units`) by adding rows to `bn_formula_variable_registry` with source mappings.

---

### Phase 8 — Product calculation validation

Service `src/services/bn/governance/productCalcValidationService.ts`:
- For every `bn_product_version` in ACTIVE/APPROVED: confirm formula exists + approved, required variables exist, required facts exist, rate tables exist, matrix tables exist, medical tariffs exist (where `requires_medical`).
- Persist to `bn_product_calc_validation_report(run_id, product_id, version_id, status, missing_dependencies jsonb, checked_at)`.

CLI: `scripts/bn/run-product-validation.ts`.

---

### Phase 9 — Approval routing

Service `src/services/bn/governance/approvalRoutingService.ts`:
- `routeFor(entityType)` looks up `bn_config_entity_registry.governance_class` then maps:
  - SYSTEM → no-op
  - CONFIGURATION → `BN_CONFIG_MANAGER`
  - REGULATORY → `BN_LEGAL_APPROVER`
  - FINANCIAL → `BN_FINANCE_APPROVER`
- Wires into existing `bn_version_approval` flow — no new approval engine.
- Seed `bn_approval_policy` rows for each class if missing.

Wrapper helper `submitForApproval(entityType, entityId, payload)` that all mutation services call.

---

### Phase 10 — Deliverables

Write `docs/bn/governance-hardening-report.md` containing:
1. Audit standardisation status (offenders fixed / remaining).
2. Lifecycle standardisation matrix.
3. Governance classification table.
4. Effective dating coverage matrix.
5. Country package model description + example SKN-2026.1.
6. Approval routing matrix.
7. Formula validation results (resolved / unresolved / missing variables / orphan facts).
8. Product validation results (valid / invalid / missing dependencies).
9. Acceptance checklist with pass/fail.

---

### Files touched (no new screens)

**Migrations** (one per phase that needs SQL):
- `…_phase2_governance_classification.sql`
- `…_phase3_lifecycle_view.sql`
- `…_phase4_standard_audit_columns.sql`
- `…_phase5_effective_dating.sql`
- `…_phase6_country_config_package.sql`
- `…_phase7_formula_resolution_report.sql`
- `…_phase8_product_calc_validation_report.sql`
- `…_phase9_approval_policy_seed.sql`

**Services (new)**
- `src/services/bn/governance/configRegistryService.ts`
- `src/services/bn/governance/countryPackageService.ts`
- `src/services/bn/governance/formulaResolverService.ts`
- `src/services/bn/governance/productCalcValidationService.ts`
- `src/services/bn/governance/approvalRoutingService.ts`

**Scripts**
- `scripts/bn/run-formula-resolution.ts`
- `scripts/bn/run-product-validation.ts`

**Docs**
- `docs/bn/governance-hardening-audit.md` (Phase 1 output)
- `docs/bn/governance-hardening-report.md` (Phase 10 output)

**Existing code wired (no UI changes)**
- `useBnConfigAudit` / `bnAuditService` — call sites that bypass it are converted (Phase 1 offender list).
- `bn_version_approval` consumers — routed through `approvalRoutingService`.

### Out of scope
- No new screens, pages, or maintenance forms.
- No new audit framework — only `system_audit_trail`.
- No new approval engine — only `bn_version_approval`.
- No IP/session columns on config tables.
- No destructive drops of existing status columns.

### Execution order
Phases run sequentially because later phases depend on registry + lifecycle view from Phases 2–3. Each phase ends with a migration + service + (where relevant) a CLI run whose output is appended to the Phase 10 report.

### Confirmation needed
This is a large, multi-migration effort (~8 migrations, 5 new services, 2 scripts, 2 doc deliverables). Confirm to proceed, or tell me which phases to do first (recommended start: **Phase 1 audit report + Phase 2 classification + Phase 4 audit columns**, since they unblock everything else).
