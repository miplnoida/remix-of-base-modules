# Medical Engine — Current State Audit (Phase B1)

> Read-only inventory. Companion to `.lovable/plan.md` Track B.

## 1. Tables

| Table | Cols | Status | Role |
|---|---|---|---|
| `bn_medical_procedure` | 18 | ACTIVE | Procedure master |
| `bn_medical_facility` | 16 | ACTIVE | Facility master |
| `bn_medical_facility_procedure` | 11 | ACTIVE | Availability matrix |
| `bn_medical_referral_rule` | 17 | ACTIVE | Referral by jurisdiction |
| `bn_medical_expense_type` | 15 | ACTIVE | Expense catalogue |
| `bn_medical_reimbursement_limit` | 30 | ACTIVE (extended in prior phase) | **Single source of reimbursement** |
| `bn_medical_authorization_rule` | 18 | ACTIVE | Pre-auth rules |
| `bn_medical_review_schedule` | 14 | ACTIVE | Periodic review |
| `bn_medical_location_type` | 10 | ACTIVE | Location lookup |
| `bn_medical_provider_type` | 9 | ACTIVE | Provider lookup |
| `bn_medical_tariff_table` | 14 | **DEPRECATED** | Quarantined; commented in prior migration |
| `bn_medical_tariff_row` | 24 | **DEPRECATED** | Data migrated into `bn_medical_reimbursement_limit` |
| `bn_medical_claim_expense` | 17 | ACTIVE | Claim line items |
| `bn_medical_reimbursement_calc` | 10 | ACTIVE | Calc runs |
| `bn_medical_recommendation` | 16 | ACTIVE | Referrals out |

## 2. Screens (routes)

Single canonical set under `/bn/config/medical/*`:

- `MedicalSetupHome.tsx`
- `MedicalProceduresCatalog.tsx`
- `FacilityAvailabilityMatrix.tsx`
- `ReferralRulesPage.tsx`
- `ReimbursementLimitsPage.tsx`  ← needs new-column UI (Track B5)
- `ExpenseTypeConfiguration.tsx`
- `MedicalReviewRulesPage.tsx`
- `MedicalDocumentsPage.tsx`

**Legacy duplicate** at `/nbenefit/config/medical-rules` → `src/pages/nbenefit/config/MedicalRulesConfig.tsx` with three tabs (`ProcedureRegistry`, `AvailabilityRouting`, `MaximumLimits`). Overlaps with the `/bn/config/medical/*` set. Should be removed in Track B5.

No `/bn/config/medical/tariff*` route exists in `AppRoutes.tsx` — good. The "Medical Tariff Engine" concern from the prompt manifested only as DB tables (`bn_medical_tariff_*`) + a resolver, both of which the prior phase already neutralised.

## 3. Services

| File | Status | Action |
|---|---|---|
| `src/services/bn/medicalService.ts` | ACTIVE | Keep — Medical Policy Library data access |
| `src/services/medicalService.ts` | Doctor-registration domain | Unrelated, keep |
| `src/services/bn/calc/medicalTariffLookup.ts` | Already rewired to read `bn_medical_reimbursement_limit` | **Rename → `medicalPolicyResolver.ts` + export `resolveReimbursement`** |

## 4. Runtime call chain

```
runProductCalculationV2 → formulaRunner → variableResolver
                                       ↘ medicalTariffLookup  (← to rename)
                                             ↳ bn_medical_reimbursement_limit
```

Only one resolver function is referenced from `formulaRunner`. Removing the file name "tariff" is purely cosmetic — but required to enforce "single engine" naming.

## 5. Duplicate concept matrix

| Concept | Policy Library | Tariff (deprecated) | Action |
|---|---|---|---|
| Procedure | `bn_medical_procedure` | `bn_medical_tariff_row.procedure_code` | Keep Library; tariff already deprecated |
| Facility availability | `bn_medical_facility_procedure` | — | Library only |
| Referral | `bn_medical_referral_rule` | embedded | Library only |
| Reimbursement | `bn_medical_reimbursement_limit` (extended) | `bn_medical_tariff_row` | Library only; data already migrated |
| Documents | `bn_medical_authorization_rule` | — | Library only |
| Review rules | `bn_medical_review_schedule` | — | Library only |

## 6. Section-6 field coverage in `bn_medical_reimbursement_limit`

After the prior migration:

| Field | Present? |
|---|---|
| procedure | `procedure_id`, `procedure_code` ✅ |
| treatment type | via `expense_type_id` → category ✅ |
| expense type | `expense_type_id` ✅ |
| location region | `location_code` ✅ (needs CHECK incl. `CARIBBEAN`) |
| provider type | `provider_type_code` ✅ |
| referral required | `referral_required` ✅ |
| pre-authorization | `pre_authorization_required` ✅ |
| emergency exception | `emergency_allowed` ✅ |
| medical board | `approval_level` ✅ |
| reimbursement method | `reimbursement_method` ✅ |
| percentage | `reimbursement_percent` ✅ |
| ceiling | `ceiling_amount` ✅ |
| fixed amount | `fixed_amount` ✅ |
| currency | `currency_code` ✅ |
| effective dates | `effective_from`, `effective_to` ✅ |
| legal reference | **missing** → add `legal_reference TEXT` in Track B3 |

## 7. Recommendation (drives Track B)
1. Migration: add `legal_reference` column; tighten `location_code` CHECK to include `CARIBBEAN`/`INTERNATIONAL`; revoke `SELECT` on deprecated tariff tables from `authenticated`.
2. Rename resolver file → `medicalPolicyResolver.resolveReimbursement(...)`.
3. Delete `/nbenefit/config/medical-rules` route + `MedicalRulesConfig.tsx` after pointing menu items at `/bn/config/medical`.
4. Extend `ReimbursementLimitsPage` with new columns.
5. Product Catalog Medical tab: reference-only (no inline JSON).
6. Configuration Validation checks (Track B7).
