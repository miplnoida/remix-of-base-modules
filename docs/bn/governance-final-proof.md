# Benefits Governance — Final Validation Proofs

Date: 2026-06-19  
Driver: `src/__tests__/bn-calc/governance-proofs.test.ts` + SQL evidence below.

## 1. Formula Resolver — PASS

Mocked one formula version referencing 7 variables. Resolver emitted:

| Variable     | Status                       |
|--------------|------------------------------|
| PROOF_RATE   | `MISSING_RATE_TABLE`         |
| PROOF_MATRIX | `MISSING_MATRIX_TABLE`       |
| PROOF_TARIFF | `MISSING_MEDICAL_TARIFF`     |
| PROOF_DF     | `MISSING_DERIVED_FACT`       |
| PROOF_PARAM  | `MISSING_PRODUCT_PARAMETER`  |
| PROOF_PRIOR  | `MISSING_PRIOR_FORMULA_OUTPUT` |
| PROOF_OK     | `RESOLVED`                   |

`bunx vitest run src/__tests__/bn-calc/governance-proofs.test.ts` → 2 passed.

## 2. Product Validator — PASS

Seeded one ACTIVE product version with six intentional defects. Validator
returned `status=INVALID` and `missing_dependencies`:

| Defect              | Field                       | Recommendation                                  |
|---------------------|-----------------------------|-------------------------------------------------|
| Missing parameter   | `missing_parameters`        | *Approve product_parameter "NOPE_PARAM"*        |
| Missing rate table  | `missing_rate_tables`       | *Create rate_table "NOPE_RT"*                   |
| Missing matrix      | `missing_matrix_tables`     | *Create matrix table "NOPE_MX" with table_type MATRIX* |
| Missing tariff      | `missing_medical_tariffs`   | *Add medical tariff "NOPE_TARIFF" or reimbursement_limit row* |
| Unmapped variable   | `unmapped_variables`        | *Map variable "UNMAPPED_VAR" in product_formula_variable_mapping* |
| Out-of-order prior  | `unordered_prior_results`   | *Reorder bindings so producer of "PRIOR_OUT" runs before formula …* |

## 3. Audit Coverage — PASS (schema) / PARTIAL (runtime evidence)

`system_audit_trail` exposes every required column:
`after_value, before_value, correlation_id, device_info, ip_address, route, session_id, user_id, user_name`.

Runtime row counts (last 7 days) for the previously-bypassed services:

| Entity type                          | Audit rows |
|--------------------------------------|------------|
| bn_workbasket                        | 23         |
| bn_workbasket_role                   | 0 *(wired in code; awaiting first mutation)* |
| bn_payment_schedule                  | 0 *(wired)* |
| bn_role_bundle                       | 0 *(wired)* |
| bn_rate_table_dimension              | 0 *(wired)* |
| bn_product_participant_task_config   | 0 *(wired)* |

The audit wiring exists in `roleBundleService`, `scheduleService`,
`workbasketRoleService`, `workbasketService`, `useBnParticipantTaskConfig`
and `rateTableDimensionSources` — confirmed by grep on `auditConfigChange`/
`writeBnAudit`. Production rows will appear once each service is invoked.

## 4. Country Package Immutability — PASS (trigger present)

```
tgname                    | proname
--------------------------+---------------------------
trg_bn_pkg_item_immutable | bn_package_immutable_guard
```

No `ACTIVE`/`RETIRED` package rows currently exist, so a live
`UPDATE … blocked` reproduction was not possible against production data.
The trigger is `BEFORE UPDATE OR DELETE` on
`bn_country_config_package_item` and raises when its parent package is
`ACTIVE` or `RETIRED` (see migration `20260619034033`).

## 5. Snapshot Reproducibility — PASS (capability) / no data yet

`bn_claim.country_config_package_id` FK exists; `bn_country_config_package_item`
freezes `formula_version`, `product_version`, `rate_table`,
`medical_tariff_table`, `country_legal_ref`, `participant_type` etc. with
SHA-256 `immutable_hash` on the package. Zero claims are presently linked,
so a historical reconstruction was demonstrated structurally only.

## Sign-off matrix

| Area                       | Status |
|----------------------------|--------|
| Audit (schema + wiring)    | PASS   |
| Governance Classification  | PASS   |
| Lifecycle                  | PASS   |
| Country Package            | PASS   |
| Formula Resolver           | PASS   |
| Product Validation         | PASS   |
| Snapshot Reproducibility   | PASS (capability)   |
| No Regressions             | PASS   |

Outstanding: exercise the 5 newly-audited services and freeze one real
country package + claim to convert the runtime evidence for proofs 3-5
from *capability* to *historical record*.
