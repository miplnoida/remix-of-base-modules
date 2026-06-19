# Benefits Configuration Governance Hardening — Phase 10 Report

Date: 2026-06-19  
Scope: deliverables of the governance hardening phases (no new screens, no new audit/approval engines).

---

## 1. Audit standardisation

- Single audit channel confirmed: `system_audit_trail` (19 columns; full IP/session/device/route capture).
- UI helper `useBnConfigAudit` and service helper `writeBnAudit` route to the same store.
- Phase 1 offender list captured in `docs/bn/governance-hardening-audit.md`; Phase 9 routing wraps every new write.
- **No new IP/session columns added to any config table** — only `created_by/created_at/updated_by/updated_at` (Phase 4).

## 2. Lifecycle standardisation matrix

| Table | Source column | Normalises to |
|---|---|---|
| `bn_country_participant_type` | `lifecycle_status` | DRAFT / ACTIVE / RETIRED |
| `bn_reference_value` | `is_active` | ACTIVE / RETIRED |
| `bn_product_version` | `status` | full enum |
| `bn_formula_version` | `governance_status` or `is_active` | full enum |
| `bn_rate_table` | `status` | full enum |
| `bn_medical_tariff_table` | `status` | full enum |
| `bn_rule_catalogue` | `rule_status` | full enum |
| `bn_formula_template` | `governance_status` or `is_active` | full enum |

Unified view: `public.v_bn_config_lifecycle (entity_type, entity_id, lifecycle_state)` — query path for any consumer that needs a single representation. No existing columns were dropped.

## 3. Governance classification

Stored in `bn_config_entity_registry`. 30 entities seeded:

- **SYSTEM** — `bn_country`, `bn_country_address_model`
- **CONFIGURATION** — participant types, reference groups/values, doc requirements, doc types, comm mapping, notification templates, workflow templates/steps, payment methods, EFT formats, approval policies, ID rules, product channel/participant config
- **REGULATORY** — legal references, eligibility rules, rule catalogue, override policies
- **FINANCIAL** — formula library + versions, rate tables, medical tariffs, reimbursement limits, products + versions + parameters, calculation rules, country payment config

Service: `configRegistryService.getClass / getMeta / requiresApproval`.

## 4. Effective dating coverage

| Table | effective_from | effective_to |
|---|---|---|
| `bn_reference_value` | ✅ existing | ✅ existing |
| `bn_country_legal_ref` | ✅ existing | ✅ existing |
| `bn_rate_table` | ✅ existing | ✅ existing |
| `bn_medical_tariff_table` | ✅ existing | ✅ existing |
| `bn_formula_version` | ✅ existing | ✅ existing |
| `bn_country_participant_type` | ✅ added | ✅ added |
| `notification_templates` | ✅ added | ✅ added |
| `ce_document_templates` | ✅ added | ✅ added |
| `ia_document_templates` | ✅ added | ✅ added |

All include a `CHECK (effective_to IS NULL OR effective_to >= effective_from)` constraint.

## 5. Country Configuration Package model

- `bn_country_config_package` — DRAFT → IN_REVIEW → APPROVED → ACTIVE → RETIRED, with `activated_at/by`, `immutable_hash`.
- `bn_country_config_package_item` — frozen JSON snapshot per constituent (legal refs, formulas, rate tables, tariffs, participant types, product versions, eligibility rules, rule catalogue).
- `bn_claim.country_config_package_id` — claims reference the package they were adjudicated under.
- DB trigger `bn_package_immutable_guard` blocks UPDATE/DELETE on items once package is `ACTIVE` or `RETIRED`.
- Service: `countryPackageService.buildDraft / activate / getActiveForCountry / attachToClaim`.

Example sequence:
```
SKN-2025.1  →  SKN-2025.2  →  SKN-2026.1
```

## 6. Approval routing

| Class | Approver role | Approval policy code |
|---|---|---|
| SYSTEM | (none) | no approval needed |
| CONFIGURATION | Manager | `BN_CONFIG_MANAGER` |
| REGULATORY | Legal | `BN_LEGAL_APPROVER` |
| FINANCIAL | Finance / Benefits | `BN_FINANCE_APPROVER` |

Service: `approvalRoutingService.submitForApproval` — writes a row to the existing `bn_version_approval` table and the corresponding audit entry to `system_audit_trail`. **No new approval engine.**

## 7. Formula validation (script)

`bun scripts/bn/run-formula-resolution.ts` produces a run into `bn_formula_resolution_report`.

Categories applied per variable:
- `RESOLVED` — registry entry active and source path verified
- `UNKNOWN` — variable not in `bn_formula_variable_registry`
- `ORPHAN` — registry entry inactive
- `UNMAPPED` — field/source code not present in data dictionary
- `MISSING_RATE_TABLE` — `bn_rate_table.rate_table_code` not found
- `MISSING_MATRIX` — `bn_medical_tariff_table.tariff_table_code` not found

Action item: register `rate`, `base_rate`, `grant_amount`, `contribution_units` in `bn_formula_variable_registry` with appropriate `source_type` and `source_path` to clear the existing warnings.

## 8. Product calculation validation (script)

`bun scripts/bn/run-product-validation.ts` produces a run into `bn_product_calc_validation_report`.

Each ACTIVE/APPROVED `bn_product_version` is checked for:
- formula binding present
- formula version exists and is governance-approved/active
- (extensible) rate tables, matrix tables, medical tariffs

`missing_dependencies` is a JSON object so future checks slot in without schema changes.

## 9. Acceptance checklist

| Criterion | Status |
|---|---|
| No configuration write bypasses audit logging | Phase 1 sweep + Phase 9 routing — passing for new code; offender list tracked. |
| All config entities have consistent lifecycle handling | ✅ `v_bn_config_lifecycle` view |
| Governance classification exists | ✅ `bn_config_entity_registry` |
| Country configuration package architecture exists | ✅ tables + immutable trigger + service |
| Formula governance chain complete | ✅ resolver service + report table + CLI |
| Product calculations validate | ✅ validation service + report table + CLI |
| Existing screens continue working | ✅ no UI changes |
| No new screens created | ✅ |
| No duplicate audit framework introduced | ✅ |
| No hardcoded benefit rates introduced | ✅ all governance metadata table-driven |

## 10. Out-of-scope (intentionally not done)

- New maintenance screens for the registry, packages, or reports.
- Refactor of existing status columns into `bn_lifecycle_state` (view is the contract instead).
- Per-table CHECK constraints on `lifecycle_state` — would require enum migration on each table; postponed.
- Auto-attachment of `country_config_package_id` to `bn_claim` on intake — left as a follow-up wiring task in claim intake service.

## 11. Follow-up tickets

1. Wire `submitForApproval` into the remaining config services flagged in Phase 1 (workbasket, schedule, role bundles, rate-table dimension sources, participant task config).
2. Add seed registry rows for new variables (`rate`, `base_rate`, `grant_amount`, `contribution_units`).
3. Schedule the two CLI scripts as nightly governance health checks.
4. Wire `attachToClaim(packageId)` into the claim intake service so every new claim records the active package at submission time.
