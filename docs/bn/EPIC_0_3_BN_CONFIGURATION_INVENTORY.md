# Epic 0.3 — BN Configuration Foundation — Inventory (Documentation only)

_Prepared: 2026-07-05_
_Scope: **inventory only** — no code, route, menu, schema, or seed changes._
_Source evidence: `src/pages/bn/config/*`, `src/pages/bn/admin/*`, `src/pages/bn/engine/*`, `src/components/routing/AppRoutes.tsx`, `src/components/sidebar/menuItems/bnMenuItems.ts`, `docs/bn/route_acceptance_sweep.md`, live `public.bn_*` table introspection._

Canonical namespace: **`/bn/*`**. Live menu source: **`app_modules`**. This document maps each BN Configuration area (the twelve categories the user listed) to (a) its canonical route, (b) its page component(s), (c) its backing table(s) with observed row counts, and (d) an initial health signal (**Solid / Partial / Investigate / Gap**). No recommendation is made yet; that comes in the next prompt.

Health legend:
- **Solid** — dedicated page + dedicated table(s) + non-trivial data.
- **Partial** — page + table present but sparse data or missing sibling table.
- **Investigate** — surface exists but wiring or ownership unclear.
- **Gap** — no dedicated page or no dedicated table.

---

## 1. Area-by-area inventory

### 1.1 Reference Data
| Field | Value |
|-------|-------|
| Canonical route | `/bn/config/reference-data` |
| Page | `src/pages/bn/config/ReferenceDataAdmin.tsx` |
| Backing tables | `bn_reference_group` (64 rows), `bn_reference_value` (463 rows) |
| Menu entry | Under BN → Settings → Reference Data (per `bnMenuItems.ts`) |
| Feature flag | `bn.config.rules` |
| Health | **Solid** |

### 1.2 Formula Library
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/formulas`, `/bn/config/calculation`, `/bn/config/calculation-readiness`, `/bn/engine` |
| Pages | `FormulaConfiguration.tsx`, `CalculationSetup.tsx`, `CalculationReadiness.tsx`, `engine/CalculationEngine.tsx`, `engine/CalculationWorkspace.tsx` |
| Backing tables | `bn_formula_template` (30), `bn_formula_version` (36), `bn_formula_variable_registry` (61), `bn_formula_resolution_report`, `bn_product_formula_binding`, `bn_product_formula_variable_mapping` |
| Related docs | `docs/bn/formula-library-audit.md`, `docs/bn/formula-cutover-audit.md`, `scripts/bn/run-formula-resolution.ts` |
| Feature flag | `bn.config.rules` |
| Health | **Solid** — versioning + binding + resolution report all present |

### 1.3 Variable Registry
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/derived-facts`, `/bn/config/product-parameters` (formula variables live inside Formula Library editor) |
| Pages | `DerivedFactRegistry.tsx`, `ProductParameterRegistry.tsx` (variables surfaced inside `FormulaConfiguration.tsx`) |
| Backing tables | `bn_derived_fact` (31), `bn_derived_fact_event`, `bn_product_parameter` (56), `bn_product_parameter_event`, `bn_formula_variable_registry` (61) |
| Health | **Partial** — three parallel registries (derived facts, product parameters, formula variables); no unified variable browser page exists. Investigate whether consolidation is warranted. |

### 1.4 Rule Catalogue
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/rule-catalogue`, `/bn/config/rules`, `/bn/config/rules-admin` |
| Pages | `RuleCatalogue.tsx`, `RuleConfiguration.tsx`, `RulesAdministration.tsx` |
| Backing tables | `bn_rule_catalogue` (50), `bn_rule_catalogue_group` (56), `bn_rule_catalogue_group_usage`, `bn_rule_condition`, `bn_rule_group`, `bn_rule_group_item`, `bn_eligibility_rule` (145), `bn_calculation_rule` (20), `bn_coverage_type_rule`, `bn_interaction_rule`, `bn_timeline_rule`, `bn_claim_transition_rule` |
| Feature flag | `bn.config.rules` |
| Health | **Solid** — three editor surfaces + catalogue table + typed rule tables. Overlap between the three editors should be **Investigate** in the next prompt. |

### 1.5 Document Library
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/document-setup`, `/bn/config/service-doc-types` |
| Pages | `DocumentSetup.tsx`, `ServiceDocTypes.tsx` |
| Backing tables | `bn_document_profile` (1), `bn_claim_document`, `bn_external_task_document` |
| Templates (out-of-module) | `/admin/notification-templates?module=BENEFITS[&type=PDF]` — shared Core Template Designer |
| Health | **Partial** — pages + tables exist, but `bn_document_profile` has only **1 row**. Document type catalogue appears seed-thin. |

### 1.6 Screen / Field Library
| Field | Value |
|-------|-------|
| Canonical route | `/bn/config/screen-setup` |
| Page | `ScreenMetadataSetup.tsx` |
| Backing tables | `bn_screen_template` (76), `bn_config_entity_registry` |
| Health | **Solid** on screens (76 templates). No dedicated field-level registry table observed — **Investigate** whether field metadata is stored inline in `bn_screen_template` or in a separate table we haven't found. |

### 1.7 Workbaskets
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/workbaskets`, `/bn/config/role-bundles`, `/bn/config/delegations` |
| Pages | `WorkbasketConfig.tsx`, `RoleBundles.tsx`, `Delegations.tsx` |
| Backing tables | `bn_workbasket` (19), `bn_workbasket_role` (40) |
| Feature flag | `bn.config.rules` |
| Health | **Solid** |

### 1.8 Escalation
| Field | Value |
|-------|-------|
| Canonical route | `/bn/config/escalation` |
| Page | `EscalationConfig.tsx` |
| Backing tables | `bn_escalation_policy` (11), `bn_escalation_policy_level` (16), `bn_escalation_event` |
| Feature flag | `bn.config.rules` |
| Health | **Solid** |

### 1.9 Reason Codes
| Field | Value |
|-------|-------|
| Canonical route | `/bn/config/reason-codes` |
| Page | `ReasonCodes.tsx` |
| Backing tables | `bn_reason_code` (25) |
| Feature flag | `bn.config.rules` |
| Health | **Solid** |

### 1.10 Notification Mappings
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/communication-templates` → `<Navigate>` to `/admin/notification-templates?tab=core&module=BENEFITS` (Epic 0.1); direct BN screen at same path renders `BenefitCommunicationTemplates.tsx` behind flag |
| Page(s) | `BenefitCommunicationTemplates.tsx` (BN surface); shared Core Template Designer (Platform) |
| Backing tables | Owned by the shared notifications module, not BN. No dedicated `bn_notification_*` table observed. |
| Health | **Investigate** — two routes are registered at the same path (`Navigate` at L2176 and `BenefitCommunicationTemplates` at L2373); React Router will pick the first match. Ownership boundary between BN and Platform Notifications needs to be confirmed. |

### 1.11 Medical Policy
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/medical` (hub), `/bn/config/medical/{procedures,facility-availability,referral-rules,reimbursement-limits,expense-types,review-rules,documents}` |
| Pages | `medical/MedicalSetupHome.tsx`, `MedicalProceduresCatalog.tsx`, `FacilityAvailabilityMatrix.tsx`, `ReferralRulesPage.tsx`, `ReimbursementLimitsPage.tsx`, `ExpenseTypeConfiguration.tsx`, `MedicalReviewRulesPage.tsx`, `MedicalDocumentsPage.tsx` |
| Backing tables | `bn_medical_procedure` (3), `bn_medical_facility`, `bn_medical_facility_procedure`, `bn_medical_provider_type`, `bn_medical_location_type`, `bn_medical_expense_type`, `bn_medical_tariff_table` (1), `bn_medical_tariff_row`, `bn_medical_authorization_rule` (3), `bn_medical_referral_rule`, `bn_medical_reimbursement_limit`, `bn_medical_reimbursement_calc`, `bn_medical_review_schedule`, `bn_medical_recommendation`, `bn_medical_claim_expense` |
| Related docs | `docs/bn/medical-engine-audit.md` |
| Health | **Partial** — full surface + rich schema, but core catalogues are seed-thin (procedures = 3, tariff tables = 1, auth rules = 3). |

### 1.12 Payment Masters
| Field | Value |
|-------|-------|
| Canonical route | `/bn/config/payment-masters` |
| Page | `src/pages/bn/admin/PaymentMasters.tsx` (note: page file lives under `pages/bn/admin/`, not `pages/bn/config/`) |
| Backing tables | Country-scoped: `bn_country_payment_config` (7 rows via `docs/bn/payment-config-hierarchy.md`), `bn_country_payment_cycle_method`; product-scoped: `bn_product_channel_config` |
| Feature flag | `bn.payments` (not `bn.config.rules`) |
| Related docs | `docs/bn/payment-config-hierarchy.md`, `docs/bn/legacy-payment-mapping.md` |
| Health | **Investigate** — page location (`admin/`) differs from other config pages (`config/`); acceptable but worth flagging. Payment master data is split across country + product tables — hierarchy is documented. |

### 1.13 Legal References
| Field | Value |
|-------|-------|
| Canonical routes | `/bn/config/country/legal-refs` (country-scoped only) |
| Page | `config/country/CountryLegalRefs.tsx` |
| Backing tables | `bn_legal_reference` (42), `bn_country_legal_ref` (42) |
| Health | **Partial** — data present, but no product-level or rule-level legal-reference browser page exists (only country-scoped). Investigate whether product/rule linkage is needed at the Configuration Foundation level or belongs to Compliance. |

---

## 2. Cross-cutting observations (evidence only)

1. **Feature-flag scope.** Almost every config page is gated by `bn.config.rules`. Only Payment Masters uses `bn.payments`, and Communication Templates uses `bn.config.rules` even though its data lives in the shared notifications module. No recommendation here — just noting for the improvement prompt.
2. **Duplicate route registration.** `/bn/config/communication-templates` is registered twice (`AppRoutes.tsx` L2176 as `<Navigate>` and L2373 as `<BnBenefitCommunicationTemplates>`). Route order means the redirect wins. **Investigate** before touching either.
3. **Page-directory drift.** All Configuration Foundation pages live under `src/pages/bn/config/*` **except** `PaymentMasters.tsx` (under `src/pages/bn/admin/`). Cosmetic, not blocking.
4. **Variable surfaces are triple-headed.** Derived Facts (`bn_derived_fact`), Product Parameters (`bn_product_parameter`), and Formula Variables (`bn_formula_variable_registry`) are three separate registries with three separate editors. No single "Variable Registry" landing page.
5. **Seed-thin catalogues.** `bn_document_profile` (1), `bn_medical_procedure` (3), `bn_medical_tariff_table` (1), `bn_medical_authorization_rule` (3). Configuration surface is complete but reference data is not populated.
6. **Menu vs. app_modules.** Per Epic 0.2, the live menu is `app_modules`-driven. This inventory reflects the code and DB surfaces, not menu visibility; menu resolution is already covered by `docs/bn/route_acceptance_sweep.md` (30/30).

---

## 3. Summary matrix

| # | Area | Route(s) | Page(s) | Table(s) | Rows (key table) | Health |
|---|------|----------|---------|----------|-----------------:|--------|
| 1 | Reference Data | `/bn/config/reference-data` | 1 | 2 | 463 (values) | Solid |
| 2 | Formula Library | `/bn/config/{formulas,calculation,calculation-readiness}` + `/bn/engine` | 5 | 6+ | 36 versions | Solid |
| 3 | Variable Registry | `/bn/config/{derived-facts,product-parameters}` | 2 | 3+ | 61 (formula vars) | Partial |
| 4 | Rule Catalogue | `/bn/config/{rule-catalogue,rules,rules-admin}` | 3 | 12+ | 145 (eligibility rules) | Solid |
| 5 | Document Library | `/bn/config/{document-setup,service-doc-types}` | 2 | 3 | 1 (profiles) | Partial |
| 6 | Screen/Field Library | `/bn/config/screen-setup` | 1 | 2 | 76 (screens) | Solid |
| 7 | Workbaskets | `/bn/config/{workbaskets,role-bundles,delegations}` | 3 | 2 | 40 (roles) | Solid |
| 8 | Escalation | `/bn/config/escalation` | 1 | 3 | 16 (levels) | Solid |
| 9 | Reason Codes | `/bn/config/reason-codes` | 1 | 1 | 25 | Solid |
| 10 | Notification Mappings | `/bn/config/communication-templates` (+ shared Platform) | 1 (+shared) | shared | n/a | Investigate |
| 11 | Medical Policy | `/bn/config/medical` + 7 sub-pages | 8 | 15 | 3 (procedures) | Partial |
| 12 | Payment Masters | `/bn/config/payment-masters` | 1 (in `admin/`) | 3 | 7 (country cfg) | Investigate |
| 13 | Legal References | `/bn/config/country/legal-refs` | 1 | 2 | 42 | Partial |

---

## 4. Explicit non-goals of this document

- No page is created, moved, renamed, or deleted.
- No table, column, RLS policy, grant, seed row, or migration is introduced.
- No feature flag is added or toggled.
- No menu file or `app_modules` row is edited.
- No recommendation on consolidation, retirement, or ownership boundaries — those come in the next prompt.

## 5. Ready-for-next-prompt checklist

- [x] Every one of the 12 user-listed areas has a canonical route.
- [x] Every area has at least one page component.
- [x] Every area (except cross-module Notification Mappings) has at least one dedicated `bn_*` table.
- [x] Observed data volumes captured so "improvement" work can distinguish sparse-schema from sparse-data problems.
- [x] Investigate items flagged, not guessed.
