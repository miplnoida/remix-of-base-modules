# Benefits Configuration Governance — Final Verification

Re-run after closing the 2 PARTIAL areas plus the audit-bypass sweep.

| # | Area | Status |
|---|---|---|
| 1 | Audit (`system_audit_trail`) | ✅ PASS |
| 2 | Governance classification | ✅ PASS |
| 3 | Lifecycle mapping | ✅ PASS |
| 4 | Country Configuration Package | ✅ PASS |
| 5 | Formula Resolver | ✅ PASS |
| 6 | Product Calc Validation | ✅ PASS |
| 7 | No regressions | ✅ PASS |

## What changed

### 1. Audit — request context wired
- New helper `src/lib/audit/requestContext.ts` captures `session_id`
  (suffix of Supabase access token), `device_info` (navigator.userAgent),
  `route` (window pathname + search), and `correlation_id` (uuid).
  `ip_address` is set by `setAuditIpAddress()` from the login response /
  edge proxy; defaults to `null` if not known.
- `writeBnAudit` auto-resolves any missing context and persists into the
  existing `system_audit_trail.ip_address / session_id / device_info /
  route / correlation_id` columns. No new columns were added to config
  tables.

### 5. Formula Resolver — full source coverage
`formulaResolverService` now classifies every variable against:
`bn_data_field_registry`, `bn_derived_fact`, `bn_product_parameter`,
`bn_rate_table` (incl. `bn_rate_table_dimension` + `bn_rate_table_row`
for MATRIX/SHARE_TABLE/CONDITION_TABLE), `bn_medical_tariff_table` /
`bn_medical_reimbursement_limit`, prior formula outputs
(`bn_formula_template.output_variable` / `template_code` /
`formula_code`), claim fields, and manual inputs.

New statuses emitted: `MISSING_MATRIX_TABLE`, `MISSING_MEDICAL_TARIFF`,
`MISSING_DERIVED_FACT`, `MISSING_PRODUCT_PARAMETER`,
`MISSING_PRIOR_FORMULA_OUTPUT` (in addition to RESOLVED / UNKNOWN /
ORPHAN / UNMAPPED / MISSING_RATE_TABLE).

### 6. Product Calc Validation — full chain
`productCalcValidationService` now checks per active product version:
binding presence, formula governance status, every variable mapped,
fact/derived-fact/parameter existence + population, rate-table & matrix
existence + active rows, medical tariff coverage, prior-formula ordering
(via `sequence_order`). Each INVALID row carries a structured
`missing_dependencies` payload and a `fixes[]` recommendation list. The
runtime calc engine (V2) is not invoked dry — the validator records a
`SIMULATION_SKIPPED` note because true dry-runs require per-claim
context the validator cannot fabricate; static checks now cover every
governance gap previously missed.

### Bypass sweep
Audit hooks added to:
- `workbasketService` (create/update/assign/pick/release/complete)
- `workbasketRoleService` (setWorkbasketRoles)
- `roleBundleService` (setBundleActive)
- `useBnParticipantTaskConfig` (upsert/delete)
- `scheduleService` (executeScheduleRowAction, suspendFutureRows,
  regenerateSchedule, generateArrearsRows)

`rateTableDimensionSources` is read-only — confirmed; no mutations to
audit. All write paths now route through `auditConfigChange` /
`writeBnAudit`, which auto-attaches user / session / device / route /
correlation context.

## Out of scope (unchanged)
- No new screens, pages, or maintenance forms.
- No new audit framework — still `system_audit_trail`.
- No new approval framework — still `bn_version_approval` driven by
  `approvalRoutingService`.
- No new IP / session / device columns on config tables — request
  context is persisted only in `system_audit_trail`.
