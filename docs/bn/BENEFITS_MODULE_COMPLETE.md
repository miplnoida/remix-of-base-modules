# Benefits (BN) Module — Complete Specification

> **Status:** Living document — last regenerated June 18, 2026.
> **Audience:** Combined — business stakeholders, configuration / implementation team, developers and architects.
> **Scope:** The entire Benefits module: country pack, reference data, formula library, calculation engine, product catalog, claims → entitlement → award → payment, simulation, governance, and the technical architecture that holds it all together.
> **Companion docs (already in `docs/bn/`):** `BN_CONTROLLED_IMPLEMENTATION_PLAN.md`, `formula-cutover-audit.md`, `formula-library-audit.md`, `medical-engine-audit.md`, `version-lifecycle-policy.md`, `legacy_table_usage_matrix.md`, `route_acceptance_matrix.md`, `phase_results.md`, `workflow_refactor_audit.md`, `permission_feature_flag_matrix.md`.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Module Map & Navigation](#2-module-map--navigation)
3. [Core Concepts & Glossary](#3-core-concepts--glossary)
4. [Country Pack — the Foundation Layer](#4-country-pack--the-foundation-layer)
5. [Reference Data / Enum Master](#5-reference-data--enum-master)
6. [Formula Library & Calculation Engine (deep dive)](#6-formula-library--calculation-engine-deep-dive)
7. [Product Catalog — Assembly Workbench (deep dive)](#7-product-catalog--assembly-workbench-deep-dive)
8. [Rate Tables, Medical Tariffs & Tables Library](#8-rate-tables-medical-tariffs--tables-library)
9. [Eligibility, Documents, Workflow & Notifications](#9-eligibility-documents-workflow--notifications)
10. [Claims → Entitlement → Award → Payment](#10-claims--entitlement--award--payment)
11. [Simulation Workspace](#11-simulation-workspace)
12. [Audit, Governance & Versioning](#12-audit-governance--versioning)
13. [Technical Architecture](#13-technical-architecture)
14. [Integration Points & Extension Guide](#14-integration-points--extension-guide)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

The Benefits (BN) module administers the full life-cycle of social-security benefit programs — from country-level legal/operational configuration, through product design, claim intake, eligibility checks, entitlement calculation, award and payment, to post-issue review and historical inquiry.

### 1.1 Design pillars

| Pillar | What it means in this codebase |
|---|---|
| **Configuration-first** | Every dropdown, enum, formula, rate table, document rule, workflow step and notification is data, not code. Hard-coded TypeScript enums are explicitly forbidden — see §5 and §14. |
| **One calculation path** | Every runtime consumer (workbench, entitlement, award, payment, simulation) calls `runProductCalculation` (`src/services/bn/runProductCalculation.ts`). No other module reads a formula expression or evaluates it. |
| **10-layer calculation engine** | Anchored at `cl_head`, layered: eligibility → base → multipliers → caps → offsets → deductions → tax → rounding → distribution → post-checks. |
| **Country Pack inheritance** | A country defines the legal references, ID rules, address model, participant types and payment methods; products inherit and may override. |
| **Maker–checker governance** | Templates, formulas, products and rate tables all flow through DRAFT → IN_REVIEW → ACTIVE → RETIRED with single-active enforcement. |
| **NO-RLS architecture** | Authorization is enforced at the application/edge layer; RLS is disabled in the public schema by policy (see `docs/ARCHITECTURE-NO-RLS-RULE.md` and project memory `Security No-RLS Policy`). |
| **PII masking & audit-everywhere** | Every state-changing write stamps the `user_code` and emits a `system_audit_trail` row; PII is masked in lists. |

### 1.2 Modernization narrative

The BN module is the product of a multi-phase modernization (see `docs/bn/phase_results.md` and `BN_CONTROLLED_IMPLEMENTATION_PLAN.md`):

- **Phase A — Schema unification.** Legacy `bn_calc_*` and ad-hoc product formula columns collapsed onto `bn_formula_template` / `bn_formula_version`, with `bn_product_version` referencing a formula by id rather than storing raw expressions.
- **Phase B — Formula Library cutover.** Every consumer was forced through `runProductCalculation` (`formula-cutover-audit.md`). The legacy `calculation_config_legacy` JSON columns are intentionally **not read**.
- **Phase C — Variable resolver.** A single `loadResolverMap()` (`src/services/bn/variableResolverService.ts`) classifies every identifier as Fact, Derived Fact, Product Parameter, or Prior Result.
- **Phase D — Country Pack refactor.** Country becomes a reusable reference layer (legal refs, ID rules, address model, participants, payment config, profile).
- **Phase E — Reference Data / Enum Master.** All BN dropdown enums moved to `bn_reference_group` / `bn_reference_value`, surfaced through the `useReferenceValues` hook.
- **Phase F — Medical policy consolidation.** A single source of truth for reimbursement limits (see `medical-engine-audit.md`).
- **Phase G — BN Payment Details Framework.** Unified `bn_payment_profile` and `PaymentDetailsSection` across all payment channels.

---

## 2. Module Map & Navigation

### 2.1 Sidebar

The BN sidebar is built from `src/components/sidebar/menuItems/bnMenuItems.ts` (with extra rows in `benefitsMenuItems.ts`). It is DB-aware: visibility is filtered by `app_modules` and the BN feature-flag matrix (`docs/bn/permission_feature_flag_matrix.md`). Every route is wrapped in a `<BnFeatureGate flag="…">` (`src/components/routing/AppRoutes.tsx`).

### 2.2 Route map

Routes are mounted in `src/components/routing/AppRoutes.tsx`. The following grouping mirrors the live sidebar.

#### Dashboards & inquiry
| Route | Page | Purpose |
|---|---|---|
| `/bn/dashboard` | `BenefitsDashboard` | KPI tiles, queues, alerts (aggregation via DB views — see project memory `Dashboard Aggregation`). |
| `/bn/person-360` | `BnPerson360` | Holistic person/beneficiary view across claims, awards, payments. |
| `/bn/history` | `BnHistoricalInquiry` | Read-only historical claim/payment inquiry. |
| `/bn/payment-history` | `BnPaymentHistoryInquiry` | Payment-centric history. |
| `/bn/audit-history` | `BnAuditDecisionHistory` | Decision/audit trail browser. |

#### Configuration — Country Pack (§4)
| Route | Page | Purpose |
|---|---|---|
| `/bn/config/country` | `BnCountryPackPage` | Dashboard + validation panel + profile editor. |
| `/bn/config/country/id-rules` | `BnCountryIdRules` | National-ID, passport, work-permit rules. |
| `/bn/config/country/address-model` | `BnCountryAddressModel` | Address fields, validations, parish/zone lookups. |
| `/bn/config/country/participant-types` | `BnCountryParticipantTypes` | Unified participant master (§4.4). |
| `/bn/config/country/payment-config` | `BnCountryPaymentConfig` | Allowed payment methods per country. |
| `/bn/config/country/legal-refs` | `BnCountryLegalRefs` | Structured legal references (`bn_legal_reference`). |

#### Configuration — Reference & Library (§5, §6, §8)
| Route | Page | Purpose |
|---|---|---|
| `/bn/config/reference-data` | `BnReferenceDataAdmin` | Manage `bn_reference_group` / `bn_reference_value`. |
| `/bn/config/formulas` | `BnFormulaConfiguration` | Formula Library (templates + versions). |
| `/bn/config/calculation` | `BnCalculationSetup` | Product calculation binding & simulator entry. |
| `/bn/config/calculation-readiness` | `BnCalculationReadiness` | Cross-product readiness matrix. |
| `/bn/config/derived-facts` | `BnDerivedFactRegistry` | Approved derived facts. |
| `/bn/config/product-parameters` | `BnProductParameterRegistry` | Approved product parameters. |
| `/bn/config/rule-catalogue` | `BnRuleCatalogue` | Reusable rule library. |
| `/bn/config/rules` | `BnRuleConfiguration` | Per-product rule binding. |
| `/bn/config/rules-admin` | `BnRulesAdministration` | Rule governance console. |
| `/bn/engine` | `BnCalculationEngine` | Engine layer admin & simulation harness. |

#### Configuration — Product & Operations (§7, §9)
| Route | Page | Purpose |
|---|---|---|
| `/bn/config/products` | `BnProductCatalog` | Product list. |
| `/bn/config/products/:id` | `BnProductEditor` | Assembly workbench (eligibility, calc, docs, workflow, notifications, …). |
| `/bn/config/product-approvals` | `BnProductApprovalConsole` | Product version approval queue. |
| `/bn/config/reason-codes` | `BnReasonCodes` | Reason-code master. |
| `/bn/config/communication-templates` | `BnBenefitCommunicationTemplates` | Letter/email/SMS templates. |
| `/bn/config/transitions` | `BnTransitionMatrix` | Allowed status transitions. |
| `/bn/config/workbaskets` | `BnWorkbasketConfig` | Workbasket routing. |
| `/bn/config/role-bundles` | `BnRoleBundles` | Role bundles for workflow. |
| `/bn/config/delegations` | `BnDelegations` | Delegation/escalation. |
| `/bn/config/escalation` | `BnEscalationConfig` | Escalation timers. |
| `/bn/config/service-doc-types` | `BnServiceDocTypes` | Service document types. |
| `/bn/config/document-setup` | `BnDocumentSetup` | Document master setup. |
| `/bn/config/screen-setup` | `BnScreenMetadataSetup` | Screen / field templates. |
| `/bn/config/validation` | `BnBenefitConfigurationValidation` | Cross-config validation. |
| `/bn/config/medical` | `BnMedicalConfig` | Medical tariff & policy setup. |
| `/bn/config/payment-masters` | `BnPaymentMasters` | Payment masters (banks, EFT formats). |

#### Claims & adjudication (§10)
| Route | Page |
|---|---|
| `/bn/intake/register` | `BnClaimRegistration` |
| `/bn/claims` | `BnClaimWorklist` |
| `/bn/worklist` | `BnClaimWorklistEnhanced` |
| `/bn/queue` | `BnClaimQueue` |
| `/bn/claims/:id` | `BnClaimWorkbench` |
| `/bn/claims/:id/eligibility` | `BnEligibilityReview` |
| `/bn/claims/:id/calculation` | `BnCalculationWorkspace` |
| `/bn/claims/:id/recommendation` | `BnDeterminationRecommendation` |
| `/bn/claims/:id/determination` | `BnBenefitDetermination` |
| `/bn/claims/:id/legacy` | `BnClaim360` |
| `/bn/approval` | `BnApprovalConsole` |
| `/bn/approval/queue` | `BnApprovalQueue` |
| `/bn/approval/workbaskets` | `BnApprovalWorkbasketsConsole` |
| `/bn/approval/workspace/:claimId` | `BnAdjudicationWorkspace` |

#### Awards, payments & servicing
| Route | Page |
|---|---|
| `/bn/entitlements` | `BnEntitlementManagement` |
| `/bn/awards` | `BnPensionerRegister` |
| `/bn/awards/:id` | `BnAward360` |
| `/bn/awards/survivors` | `BnSurvivorAwards` |
| `/bn/awards/adjustments` | `BnAwardAdjustments` |
| `/bn/survivors` | `BnSurvivorsBenefitProcessing` |
| `/bn/payables` | `BnPayablesQueue` |
| `/bn/schedules` | `BnPaymentSchedule` |
| `/bn/batches` | `BnBatchOperations` |
| `/bn/issue` | `BnPaymentIssue` |
| `/bn/post-issue` | `BnPostIssueReview` |
| `/bn/post-issue-enhanced` | `BnPostIssueEnhanced` |
| `/bn/exceptions` | `BnPaymentExceptions` |
| `/bn/cheque-stock` | `BnChequeStock` |
| `/bn/payment-profiles` | `BnPaymentProfiles` |
| `/bn/life-certificates` | `BnLifeCertificateManagement` |
| `/bn/medical-reviews` | `BnMedicalReviewScheduler` |
| `/bn/overpayments` | `BnOverpaymentRecovery` |
| `/bn/award-suspension` | `BnAwardSuspensionConsole` |
| `/bn/simulation` | (Simulation Workspace, §11) |

Acceptance status per route is tracked in `docs/bn/route_acceptance_matrix.md`.

---

## 3. Core Concepts & Glossary

| Concept | Definition |
|---|---|
| **Branch** | A statutory benefit branch (Short-Term, Long-Term, Employment Injury, Medical, …). |
| **Scheme** | A legal scheme inside a branch (e.g., "Sickness Benefit Scheme"). |
| **Product** | A configurable benefit product (`bn_product`). One scheme has many products over time. |
| **Product Version** | Immutable snapshot of a product's configuration (`bn_product_version`) — bound to one Formula Template, parameter values, cap rules, rounding, etc. Lifecycle: DRAFT → PENDING_APPROVAL → ACTIVE → SUSPENDED → ARCHIVED. |
| **Country Pack** | The set of country-specific reference data (legal refs, ID rules, address model, participants, payments, profile) that products inherit. |
| **Claim** | A request for benefit, anchored at `cl_head`. |
| **Entitlement** | The computed right to a benefit amount/schedule for a claim. |
| **Award** | A persisted, periodic entitlement (pension, monthly grant). |
| **Payment** | An instance of money movement against an entitlement/award. |
| **Participant** | Any person attached to a claim — claimant, beneficiary, payee, doctor, etc. (single unified master). |
| **Fact** | Raw eligibility input (`bn_eligibility_fact`). |
| **Derived Fact** | Computed value from facts/lookups (`bn_derived_fact`, APPROVED only). |
| **Product Parameter** | Per-product configurable constant (`bn_product_parameter`, APPROVED only). |
| **Prior Result** | Output of a previously-evaluated formula in the same calc context. |
| **Cap Rule** | Min/max clamps applied after raw evaluation. |
| **Rounding Rule** | `{ mode: NONE/UP/DOWN/NEAREST/BANKERS, precision }`. |
| **Effective Date Rule** | How the engine picks rates/formulas as of the claim date. |
| **Trace** | Per-variable provenance record returned by every calc run (§6.7). |

---

## 4. Country Pack — the Foundation Layer

The Country Pack is the reusable reference layer that drives forms, letters, notifications, payment options, validation, and product catalog selectors across the entire module. Every BN screen consumes the pack rather than carrying its own copy of country-specific data.

### 4.1 Tables

| Table | Purpose |
|---|---|
| `bn_country` | One row per country with profile fields: `default_language`, `date_format`, `number_format`, `phone_format`, social-security office contact/branding. |
| `bn_country_id_rule` | Per-country ID document rules (national-id, passport, work-permit), regex, length, issuing-authority. |
| `bn_country_address_field` | Address model: ordered list of fields, validations, dropdown source for parish/zone. |
| `bn_country_participant_type` | Unified participant master (claim roles + relationships + external parties), category-tagged. |
| `bn_country_payment_method` | Allowed payment methods per country, with required EFT/cheque parameters. |
| `bn_legal_reference` | Structured legal references (act, chapter, section, regulation, status, version) — replaces the legacy free-text `bn_country_legal_ref`. |

### 4.2 Screens

- **Country Pack Dashboard** (`src/components/bn/country/CountryPackDashboard.tsx`) — shows readiness across the six panels and a validation panel that surfaces gaps (missing default ID rule, no payment method, no active legal ref).
- **Country Profile Editor** (`src/components/bn/country/CountryProfileEditor.tsx`) — letterhead, default language, formatting locale.
- **ID Rules / Address Model / Participant Types / Payment Config** — list/edit pages under `src/pages/bn/config/country/`. All dropdowns inside these forms are driven by Reference Data (§5).
- **Legal References** (`src/pages/bn/config/country/CountryLegalRefs.tsx`) — full lifecycle DRAFT / ACTIVE / SUPERSEDED / REPEALED with versioning.

### 4.3 Services & hooks

| Service / hook | Role |
|---|---|
| `src/services/bn/countryPackService.ts` | CRUD across all five country-pack sub-entities. |
| `src/services/bn/countryProfileService.ts` | Country profile updates. |
| `src/services/bn/legalReferenceService.ts` | Structured CRUD on `bn_legal_reference`, including status workflow. |
| `src/hooks/bn/useBnCountryPack.ts` | Aggregated read of pack for product/forms. |
| `src/hooks/bn/useLegalReferences.ts` | React-query access to the legal master. |
| `src/contexts/BnCountryContext.tsx` | Global "current country" used by every BN screen. |

### 4.4 Unified participant master

`bn_country_participant_type` is a single table with a `category` column:

| Category | Examples |
|---|---|
| `claim_role` | claimant, beneficiary, payee |
| `relationship` | spouse, child, parent, guardian |
| `external_party` | doctor, employer rep, lawyer |

This replaces the earlier split between participant types and `tb_relation` / `tb_dependent_relation`. Consumers filter by category in the UI but read from one master.

### 4.5 Cross-module consumption

- **Forms** (public + internal) read ID rules and address model from the pack.
- **Letters / notifications** render legal references via tokens (`{{legal_ref.code}}`).
- **Product Catalog** selects legal references rather than typing strings.
- **Payments** read allowed methods from `bn_country_payment_method`.

---

## 5. Reference Data / Enum Master

Goal: **no Benefits dropdown depends on a hard-coded TypeScript enum array.** All configurable enum/dropdown values live in master tables that users can manage.

### 5.1 Tables

| Table | Columns of note |
|---|---|
| `bn_reference_group` | `group_code` (PK), `group_label`, `description`, `is_system`, `allows_user_values`. |
| `bn_reference_value` | `group_code` FK, `value_code`, `value_label`, `description`, `sort_order`, `is_default`, `is_system`, `is_active`, `metadata_json`. |

### 5.2 Lifecycle rules

- **System values** cannot be deleted; can be retired (`is_active=false`).
- **Used values** (referenced by any row in another table) cannot be deleted — only retired.
- **Inactive values** are hidden from new-config dropdowns but remain visible on historical records.
- Adding a value never requires code changes.

### 5.3 Seeded groups (initial cutover)

`table_type`, `lookup_mode`, `dimension_type`, `match_type`, `status`, `output_type`, `reimbursement_method`, `approval_level`, `location_code`, `provider_type_code`, `beneficiary_type`, `expression_type`, plus country-pack groups `BN_ID_TYPE`, `BN_PARTICIPANT_TYPE`, `BN_PAYMENT_METHOD_TYPE`, `BN_ADDRESS_FIELD_TYPE`, `BN_LEGAL_STATUS`, `BN_LEGAL_DOC_TYPE`.

### 5.4 Service & hook

- **Service:** `src/services/bn/referenceDataService.ts` — `listReferenceGroups`, `listReferenceValues(groupCode)`, plus admin CRUD.
- **Hook:** `src/hooks/bn/useReferenceData.ts` — `useReferenceValues(groupCode, fallback?)` returns `{ options, isLoading, error, raw, refetch }`. The optional `fallback` allows screens to keep working during the cutover; once seeded, fallback is never reached.

Usage pattern (replaces a hard-coded enum):

```tsx
const { options } = useReferenceValues('lookup_mode');
<SearchableSelect
  options={options.map(o => ({ value: o.value, label: o.label }))}
  value={mode}
  onChange={setMode}
/>
```

### 5.5 Reference Data Admin screen

`/bn/config/reference-data` (`src/pages/bn/config/ReferenceDataAdmin.tsx`) lets administrators:

- Browse groups, mark system vs user-managed.
- Add / retire values, set defaults, reorder.
- See **usage count** before retiring a value.
- Inspect `metadata_json` (e.g., currency symbols, ISO codes).

---

## 6. Formula Library & Calculation Engine (deep dive)

This is the heart of the module. Every monetary amount the system computes — entitlement, award schedule, payment line, simulation output — runs through the same pipeline.

### 6.1 Conceptual model

```text
                ┌─────────────────────────────────┐
                │       Formula Template          │  bn_formula_template
                │  (code, name, output variable,  │
                │   required parameters)          │
                └──────────────┬──────────────────┘
                               │ 1..N
                               ▼
                ┌─────────────────────────────────┐
                │       Formula Version           │  bn_formula_version
                │  (expression, status, version)  │  DRAFT → IN_REVIEW → ACTIVE → RETIRED
                └──────────────┬──────────────────┘
                               │ exactly one ACTIVE per template
                               ▼
                ┌─────────────────────────────────┐
                │       Product Version           │  bn_product_version
                │  binds: formula_template_id     │
                │         formula_parameter_values│
                │         cap_rules               │
                │         rounding_rule           │
                │         effective_date_rule     │
                └─────────────────────────────────┘
```

### 6.2 Variable registry

Every identifier a formula may reference is governed by `bn_formula_variable_registry` (read by `useBnFormulaVariableRegistry`, `src/hooks/bn/useBnFormulaVariableRegistry.ts`).

| Column | Use |
|---|---|
| `variable_code` | Identifier used in expressions. |
| `display_name` | UI label. |
| `category` / `source_type` / `source_path` | Where the value comes from. |
| `data_type`, `unit` | Validation + rendering. |
| `sample_value` | Used by the simulator and the formula builder preview. |
| `is_active` | Hides retired variables from pickers but keeps history readable. |

### 6.3 Variable resolver

`src/services/bn/variableResolverService.ts → loadResolverMap()` is the single source of truth for *what a variable means*. It returns a `Map<code → ResolvedVariable>` classifying each identifier as exactly one of:

1. **Fact** — `bn_eligibility_fact.fact_key`, active rows only.
2. **Derived Fact** — `bn_derived_fact.code`, status `APPROVED`, in effective window.
3. **Product Parameter** — `bn_product_parameter.code`, status `APPROVED`, in effective window.
4. **Prior Result** — output of a previously-evaluated formula in the same context.

Unknown identifiers come back as `UnresolvedVariable` so the UI can deep-link the user to the registry editor to create the missing source.

### 6.4 Expression grammar

The parser/evaluator lives in `src/lib/bn/formulaParser`. Supported elements:

- Numeric literals, parentheses, unary minus.
- Arithmetic: `+ - * / %`.
- Power: `^`.
- Comparison: `< <= > >= == !=` (boolean coerced to 0/1).
- Logical: `AND`, `OR`, `NOT`.
- Built-in functions: `min`, `max`, `round`, `ceil`, `floor`, `abs`, `if(cond, then, else)`.
- Identifiers must be in the resolver map (case-sensitive).

Parsing returns `{ ast, variablesUsed, errors }` so the UI can highlight unresolved or syntactically broken expressions before save.

### 6.5 Template & version lifecycle

`src/services/bn/formulaLifecycleService.ts` is the only path that may change formula state:

| Function | Effect |
|---|---|
| `getFormulaUsage(templateId)` | Counts product bindings + active versions + total versions. |
| `cloneFormula({templateId, newCode, newName, userCode})` | Deep-clones a template plus its current ACTIVE version into a new DRAFT. |
| `createNewVersion(templateId, userCode)` | Spawns a new DRAFT version from the latest. |
| `transitionVersion({versionId, newStatus, userCode})` | Enforces the DRAFT → IN_REVIEW → ACTIVE → RETIRED graph; activating retires the previously ACTIVE version (single-active rule). |
| `safeDeleteFormula(templateId, userCode)` | Refuses if any product binds the template; otherwise hard-deletes drafts and archives the rest. |
| `listVersions(templateId)` | Sorted version history. |

All operations stamp `user_code` and emit `system_audit_trail` rows.

### 6.6 Per-product binding

A Product Version (`bn_product_version`) contributes the *product-specific* part of a calculation:

| Column | Purpose |
|---|---|
| `formula_template_id` | The chosen formula (resolved at runtime to its ACTIVE version, or a pinned version when audit requires). |
| `formula_parameter_values` | JSON map `{ variable_code: value }` overriding registry sample values for this product. |
| `cap_rules` | `{ min?, max?, … }`. |
| `rounding_rule` | `{ mode, precision }`. |
| `effective_date_rule` | Strategy for picking rates/formulas relative to the claim date. |

**Strict modern columns only.** `productCalculationLoader.ts` deliberately ignores `calculation_config` / `calculation_config_legacy` — see `docs/bn/formula-cutover-audit.md`.

### 6.7 The runtime — `runProductCalculation`

The single sanctioned evaluation entry point is `src/services/bn/runProductCalculation.ts`. All consumers — workbench, entitlement, award, payment, simulation — call it.

```text
runProductCalculation(productVersionId, ctx)
    │
    ├─► loadProductCalculationConfig(productVersionId)
    │       reads bn_product_version + bn_formula_template
    │
    ├─► loadResolverMap()
    │       Fact / Derived Fact / Parameter / Prior
    │
    ├─► parseFormula(expression, resolver)
    │       → { ast, variablesUsed, errors }
    │
    ├─► For each variable, choose value with priority:
    │       1. product parameter override
    │       2. caller-supplied input
    │       3. resolver sample value
    │       4. (simulation) 0 if useSamples=true, else unresolved
    │       — each decision recorded in `trace[]`
    │
    ├─► evaluateFormula(ast, evalCtx)  → rawValue
    │
    └─► applyCapsAndRounding(rawValue, capRules, roundingRule) → finalValue
```

Returned `ProductCalculationResult`:

```ts
{
  productVersionId,
  template: { id, template_code, template_name, formula_expression, ... },
  rawValue,
  finalValue,
  variablesUsed: string[],
  unresolved: UnresolvedVariable[],
  trace: { variable, source, value, resolverPath }[],
  warnings: string[],
  errors: string[],
}
```

The `trace` array is the contract used by the Calculation Workspace UI and the Simulation Workspace formula-trace timeline.

### 6.8 The 10-layer Calculation Engine

The Formula Library evaluates one expression at a time. Real benefit calculations are composed of multiple ordered layers that wrap the formula run. The orchestrator is `src/services/bn/calculationEngine.ts`, anchored at `cl_head` (project memory `BN Calculation Engine`).

| # | Layer | Responsibility |
|---|---|---|
| 1 | Eligibility | Decision-engine pass; gates everything below. |
| 2 | Base | Primary formula evaluation (calls `runProductCalculation`). |
| 3 | Multipliers | Wage replacement %, factor tables, age/gender multipliers. |
| 4 | Caps | Statutory min/max, percentage-of-insurable-earnings caps. |
| 5 | Offsets | Other-income, employer-paid-portion offsets. |
| 6 | Deductions | Court orders, overpayment recovery (links to §10). |
| 7 | Tax | Withholding per tax rules. |
| 8 | Rounding | Bankers / nearest / up / down, per `bn_product_version.rounding_rule`. |
| 9 | Distribution | Split across payees, schedules, periods. |
| 10 | Post-checks | Re-validate caps post-rounding, ensure totals reconcile to `cl_head`. |

Each layer emits trace entries typed as `BnCalcTraceEntry` (`src/types/bnCalcEngine.ts`). The engine's full output (`BnCalcEngineOutput`) is what Simulation Workspace persists and what Calculation Workspace renders.

### 6.9 Configuration integration — putting it all together

When a user opens **Product Editor → Calculation tab**, the screen wires four data sources together:

1. **Reference Data** (§5) populates every dropdown: `output_type`, `reimbursement_method`, `match_type`, `expression_type`, …
2. **Formula Library** (`/bn/config/formulas`) provides the picker for `formula_template_id`.
3. **Variable Registry** drives the parameter editor — only variables in `bn_formula_template.required_parameters` are shown, with their `data_type`/`unit`.
4. **Country Pack** supplies legal references (for compliance text), allowed payment methods (downstream) and participant types (for distribution rules).

On save, the screen writes `bn_product_version` rows; the next time a claim runs against this version, `runProductCalculation` reads the same JSON.

### 6.10 Worked example — Sickness Benefit

Template `SB_BASE`:

```text
expression:      min(daily_wage * replacement_rate * eligible_days, weekly_cap * weeks)
required params: [daily_wage, replacement_rate, eligible_days, weekly_cap, weeks]
output:          sickness_amount  (NUMBER)
```

Product Version "SB-2026":

```json
{
  "formula_template_id": "…SB_BASE",
  "formula_parameter_values": { "replacement_rate": 0.65, "weekly_cap": 1200 },
  "cap_rules": { "min": 0, "max": 26000 },
  "rounding_rule": { "mode": "NEAREST", "precision": 2 }
}
```

Claim context (resolved by the runtime):

| Variable | Source | Value |
|---|---|---|
| `daily_wage` | FACT (`avg_daily_wage_8wk`) | 220.00 |
| `replacement_rate` | PARAMETER (override) | 0.65 |
| `eligible_days` | DERIVED_FACT (`certified_days`) | 14 |
| `weekly_cap` | PARAMETER | 1200 |
| `weeks` | DERIVED_FACT (`ceil(eligible_days/7)`) | 2 |

Run:
- `raw = min(220 * 0.65 * 14, 1200 * 2) = min(2002, 2400) = 2002`
- `caps`: clamp to `[0, 26000]` → 2002
- `rounding`: NEAREST/2 → 2002.00

Trace example entry: `{ variable: "daily_wage", source: "FACT", value: 220, resolverPath: "FACT:avg_daily_wage_8wk" }`.

---

## 7. Product Catalog — Assembly Workbench (deep dive)

The Product Catalog is where everything reusable becomes a product. Nothing is *defined* inside a product — every block is *selected* from a library.

### 7.1 Lifecycle

```text
DRAFT ─────► PENDING_APPROVAL ─────► ACTIVE ─────► SUSPENDED ─────► ARCHIVED
   │                                     │
   └────────────── new version ──────────┘
```

Status badges & variants are wired in `src/pages/bn/config/ProductCatalog.tsx` via `BN_PRODUCT_STATUS_LABELS`.

### 7.2 Tables

| Table | Role |
|---|---|
| `bn_product` | Stable product identity (code, name, branch, scheme, country). |
| `bn_product_version` | Immutable configuration snapshot. |
| `bn_product_eligibility_rule` | Bindings to rules in the Rule Catalogue. |
| `bn_product_document_requirement` | Required and service documents. |
| `bn_product_workflow_step` | Workflow step bindings. |
| `bn_product_notification` | Notification bindings (template + trigger). |
| `bn_product_screen_template` | Screen/field templates per stage. |
| `bn_product_workbasket_route` | Routing rules into workbaskets. |
| `bn_product_reason_code` | Allowed reason codes per decision point. |

### 7.3 Assembly workbench tabs

`src/pages/bn/config/ProductEditor.tsx` and components under `src/components/bn/config-builder/`:

1. **General** — code, name, branch/scheme, country, version metadata.
2. **Eligibility** — pick rules from `bn_rule_catalogue`; eligibility is evaluated by `decisionEngine.ts`.
3. **Calculation** — formula binding, parameters, caps, rounding (§6.9).
4. **Documents** — required & service documents (consumed by Document Lifecycle, §9).
5. **Medical policy** — bind a medical policy + tariff (§8.3).
6. **Workflow** — choose workflow template & step bindings.
7. **Screens / Fields** — pick a screen template per stage.
8. **Workbasket & escalation** — routing, SLAs, escalation paths.
9. **Reason codes** — per-decision allowed codes.
10. **Notifications** — templates, channels, recipients (Notification Engine, §9).
11. **Communications & legal** — letter templates and `bn_legal_reference` bindings.

### 7.4 Country inheritance & overrides

The product inherits the active Country Pack at run time. Overrides are explicit (e.g., a product may restrict payment methods to a subset, but cannot introduce a method not in `bn_country_payment_method`).

### 7.5 Approval & activation

- **Activation validator** (`src/services/bn/productActivationValidator.ts`) checks: formula bound, formula version ACTIVE, all required parameters supplied, eligibility rules present, at least one workbasket route, etc.
- **Approval console** (`/bn/config/product-approvals`) drives maker-checker.
- On activation, the previously ACTIVE version is auto-superseded with effective dates honored.

---

## 8. Rate Tables, Medical Tariffs & Tables Library

### 8.1 Common shape

All lookup tables share a **header / dimension / value** structure:

| Concept | Table |
|---|---|
| Header | `bn_rate_table`, `bn_medical_tariff`, … (table_type, lookup_mode, match_type from Reference Data) |
| Dimension definitions | `bn_rate_table_dimension` (dimension_type from Reference Data) |
| Values | `bn_rate_table_value` keyed by dimension combo |

`lookup_mode` (`EXACT`, `RANGE`, `STEPPED`) and `match_type` (`ANY`, `ALL`) come from Reference Data — no hard-coded enums.

### 8.2 Rate Tables

- **Setup screen** uses `useReferenceValues` for every dropdown (`table_type`, `dimension_type`, `lookup_mode`, `match_type`).
- **Runtime access:** `rateTableDimensionSources.ts` resolves dimension values from facts / parameters at evaluation time and looks up the value.

### 8.3 Medical Tariffs & Consolidated Policy

Per project memory `Medical Policy Consolidation`, there is **one** source of truth for reimbursement limits. `src/services/bn/medicalService.ts` exposes:

- `getReimbursementLimit({ countryCode, providerType, procedureCode, asOfDate })`
- `getCoveragePolicy(productVersionId)`

`provider_type_code` and `reimbursement_method` are Reference Data groups. The legacy parallel tables have been retired.

### 8.4 Tables Library

A generic library for ad-hoc lookups that products may bind to (e.g., income-tax brackets, life-expectancy tables). Same header/dimension/value pattern; same governance.

---

## 9. Eligibility, Documents, Workflow & Notifications

### 9.1 Eligibility & Decision Engine

- `src/services/bn/decisionEngine.ts` executes the rule chain bound to a Product Version.
- Rules come from `bn_rule_catalogue`; each rule may consult Facts / Derived Facts.
- Output: `EligibilityDecision` with per-rule trace and a final pass/fail.

### 9.2 Document Lifecycle

Per project memory `Document Lifecycle (IP/ER)`: resolver → atomic mirror to master → `dms_transfer_queue` with retry. Within BN:

- **Required documents** are seeded from the Product Version on claim creation.
- **Service documents** generated by the workflow (letters, certificates) are minted via templates and pushed through the same DMS pipeline.
- **Document Proxy edge function** is the only way to fetch DMS blobs (memory `Document Proxy Service`).

### 9.3 Workflow

- Workflow templates and step bindings are defined globally; the Product Version chooses one.
- `bnWorkflowRuntimeService.ts` enforces the maker-checker pattern and writes `system_audit_trail`.
- Reporting-manager resolution uses the dynamic RPC pattern (memory `Reporting Manager Resolution`).

### 9.4 Notification Engine

- `workflow_step_notifications` (DB-driven) + `bn_product_notification` bind notifications per stage.
- `bnNotificationIntegrationService.ts` dispatches via the unified Notification System (in-app realtime + email/SMS templates).
- Letter/email bodies can include legal-reference tokens that resolve against `bn_legal_reference`.

---

## 10. Claims → Entitlement → Award → Payment

### 10.1 End-to-end flow

```text
INTAKE ─► REGISTER ─► ELIGIBILITY ─► CALCULATION ─► RECOMMENDATION ─► APPROVAL
                                                                          │
                                                        ENTITLEMENT ◄─────┘
                                                              │
                                                       AWARD (if periodic)
                                                              │
                                       PAYABLES QUEUE ─► SCHEDULE ─► BATCH ─► ISSUE
                                                                                │
                                                                       POST-ISSUE REVIEW
                                                                                │
                                                                       HISTORICAL INQUIRY
```

### 10.2 Intake & registration

- Public intake (`src/pages/public/bn/PublicBenefitApplication.tsx`) writes to a staging area; internal intake (`/bn/intake/register`) writes directly. Country Pack drives field validation.
- Participants are attached via `useBnClaimParticipants` against the unified participant master.

### 10.3 Workbench

- `BnClaimWorkbench` is the operator UI: tabs for facts/evidence, eligibility, calculation, recommendation, communications, history.
- **Calculation Workspace** (`/bn/claims/:id/calculation`) calls `runProductCalculation` and renders the trace.

### 10.4 Approval

- Approval console & queues; `approvalGuardService.ts` enforces approval-level rules from Reference Data (`approval_level`).

### 10.5 Entitlement & Award

- `entitlementService.ts` persists the calc result against the claim.
- For periodic benefits, `awardServicingService.ts` materializes an `Award` and a payment schedule.
- Servicing modules: Life Certificates, Medical Reviews, Overpayments, Award Suspension, Survivors processing.

### 10.6 Payments — BN Payment Details Framework

Per memory `BN Payment Details Framework`:

- **Profile:** `bn_payment_profile` holds the beneficiary's payment methods (bank, mobile money, cheque, cash pickup).
- **Channel-agnostic UI:** `PaymentDetailsSection` is the single component used across all payment channels.
- **Allowed methods** come from `bn_country_payment_method` (Country Pack).
- **EFT formats:** `src/lib/bn/eftFormatPresets.ts`.
- **Pipeline:** Payables Queue → Schedule → Batch → Issue → Post-Issue Review → Exceptions.
- **Cheque stock & numbering:** `BnChequeStock` and the global number-format service (memory `Number Formats`).
- All money movement is atomic & locked per memory `Transaction Integrity` and `Payments Financial Integrity`.

---

## 11. Simulation Workspace

The Simulation Workspace lets analysts replay or invent claims against any Product Version and inspect the full engine output without touching production data.

### 11.1 Tables (`bn_sim_*`)

| Table | Role |
|---|---|
| `bn_sim_scenario` | Scenario header (name, type, product, country). |
| `bn_sim_config_snapshot` | Frozen snapshot of the chosen Product Version + linked libraries. |
| `bn_sim_run` | One execution (PENDING → RUNNING → COMPLETED/FAILED). |
| `bn_sim_run_input` | Per-run inputs (key/value/type/json). |
| `bn_sim_run_output` | Per-run outputs (numeric / text / json). |
| `bn_sim_rule_trace` | Per-rule pass/fail trace. |
| `bn_sim_formula_trace` | Per-formula-step trace (mirrors `BnCalcEngineOutput`). |

Types are in `src/types/bnSimulation.ts`.

### 11.2 Flow

```text
Scenario ──► Snapshot Config ──► Create Run ──► Inputs ──► Engine
                                                          │
                                                  Outputs + Rule Trace
                                                          + Formula Trace
                                                          │
                                                 Comparison & Replay UI
```

### 11.3 Modes

- **Simulation** — synthetic inputs.
- **What-If** — clone a real claim, change inputs, re-run without persisting.
- **Comparison** — run two snapshots side-by-side (e.g., current ACTIVE vs draft DRAFT) and diff outputs.

### 11.4 Service

`src/services/bn/simulationService.ts` orchestrates snapshot capture, run creation, engine invocation (`runProductCalculation` + the 10-layer wrapper) and trace persistence.

---

## 12. Audit, Governance & Versioning

### 12.1 Lifecycle policies

| Entity | Lifecycle |
|---|---|
| Formula version | DRAFT → IN_REVIEW → ACTIVE → RETIRED, single-active per template. |
| Product version | DRAFT → PENDING_APPROVAL → ACTIVE → SUSPENDED → ARCHIVED. |
| Legal reference | DRAFT → ACTIVE → SUPERSEDED → REPEALED, versioned. |
| Rate table | DRAFT → ACTIVE → RETIRED (effective dates honored). |
| Reference value | ACTIVE → INACTIVE (never deleted if used). |

Full rules in `docs/bn/version-lifecycle-policy.md`.

### 12.2 Audit trail

- Every state-changing write stamps `user_code` (custom-instruction "User Identity Tracking").
- `system_audit_trail` rows are emitted by service-layer helpers (memory `Audit Trail System`).
- Communication actions and document events use the same trail.

### 12.3 Maker-checker

Built into workflow templates; per memory `Workflow Maker-Checker` (`.lovable/rules/workflow-maker-checker.md`). Approval consoles for products, claims, payments share the same pattern.

### 12.4 Shielded errors

Per memory `Error Handling`: user-facing messages are friendly; raw technical details are logged via fire-and-forget — never blocking the UI.

---

## 13. Technical Architecture

### 13.1 Layering

```text
┌─────────────────────────────────────────────────────────────┐
│  Pages (src/pages/bn/**)         — route + page shell        │
│  Components (src/components/bn/**) — feature UI              │
│  Hooks (src/hooks/bn/**)         — react-query, contexts     │
│  Services (src/services/bn/**)   — orchestration, RPC calls  │
│  Lib (src/lib/bn/**)             — pure utilities (parser…)  │
│  Supabase RPCs / Edge Functions  — DB-side logic             │
│  Postgres (public schema, NO-RLS) — tables, triggers         │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 NO-RLS architecture

- Public schema has RLS **disabled** by policy. Authorization is enforced at the app and edge-function layer.
- All routes are gated by `isAuthReady && isAuthenticated` and a feature flag (`BnFeatureGate`).
- Reference: `docs/ARCHITECTURE-NO-RLS-RULE.md` and memory `Security No-RLS Policy`.

### 13.3 Domain table groups (`bn_*`)

| Group | Representative tables |
|---|---|
| Country Pack | `bn_country`, `bn_country_id_rule`, `bn_country_address_field`, `bn_country_participant_type`, `bn_country_payment_method`, `bn_legal_reference` |
| Reference Data | `bn_reference_group`, `bn_reference_value` |
| Variables & rules | `bn_eligibility_fact`, `bn_derived_fact`, `bn_product_parameter`, `bn_rule_catalogue`, `bn_formula_variable_registry` |
| Formulas | `bn_formula_template`, `bn_formula_version` |
| Tables Library | `bn_rate_table`, `bn_rate_table_dimension`, `bn_rate_table_value`, `bn_medical_tariff`, `bn_medical_policy` |
| Product | `bn_product`, `bn_product_version`, `bn_product_eligibility_rule`, `bn_product_document_requirement`, `bn_product_workflow_step`, `bn_product_notification`, `bn_product_screen_template`, `bn_product_workbasket_route`, `bn_product_reason_code` |
| Claims | `cl_head` (anchor), `bn_claim_*`, `bn_evidence`, `bn_claim_participant` |
| Entitlement & Award | `bn_entitlement`, `bn_award`, `bn_award_schedule` |
| Payments | `bn_payable`, `bn_payment_schedule`, `bn_payment_batch`, `bn_payment_issue`, `bn_payment_profile`, `bn_cheque_stock` |
| Simulation | `bn_sim_scenario`, `bn_sim_config_snapshot`, `bn_sim_run`, `bn_sim_run_input`, `bn_sim_run_output`, `bn_sim_rule_trace`, `bn_sim_formula_trace` |

### 13.4 RPC catalog (selected)

| RPC | Purpose |
|---|---|
| `bn_formula_check_usage` | Counts bindings/versions for safe-delete. |
| `bn_formula_clone_template` | Deep clone formula + ACTIVE version. |
| `bn_formula_new_version` | New DRAFT version. |
| `bn_formula_transition_version` | Status graph enforcement, single-active. |
| `bn_formula_safe_delete_template` | Refuses if in use. |
| `bn_product_activate` | Final activation gate. |
| `bn_payment_batch_*` | Batch lifecycle. |
| `bn_sim_run_engine` | Persisted simulation run. |

Per memory `RPC Architecture`: all overloads are dropped before recreation; parameters use typed variables.

### 13.5 Service & hook map

| Concern | Service | Hook |
|---|---|---|
| Reference Data | `referenceDataService.ts` | `useReferenceData.ts` |
| Country Pack | `countryPackService.ts`, `countryProfileService.ts` | `useBnCountryPack.ts` |
| Legal Refs | `legalReferenceService.ts` | `useLegalReferences.ts` |
| Variable Registry | (DB read) | `useBnFormulaVariableRegistry.ts` |
| Variable Resolver | `variableResolverService.ts` | `useVariableResolver.ts` |
| Formula Lifecycle | `formulaLifecycleService.ts` | `useBnRulesAdmin.ts` |
| Calculation | `productCalculationLoader.ts`, `runProductCalculation.ts`, `calculationEngine.ts` | `useBnCalcEngine.ts` |
| Product | `productService.ts`, `productActivationValidator.ts`, `productApprovalService.ts` | `useBnProduct.ts` |
| Claim | `claimService.ts`, `claimWorkbenchService.ts` | `useBnClaim.ts`, `useBnClaimWorkbench.ts` |
| Entitlement & Award | `entitlementService.ts`, `awardServicingService.ts` | `useBnEntitlement.ts`, `useBnAwards.ts` |
| Payment | `payablesQueueService.ts`, `paymentIssueService.ts`, `batchOperationsService.ts` | `useBnPayablesQueue.ts`, `useBnPaymentIssue.ts`, `useBnBatchOperations.ts` |
| Simulation | `simulationService.ts` | `useBnSimulation.ts` |
| Workflow | `bnWorkflowRuntimeService.ts`, `bnWorkflowIntegrationService.ts` | `useBnWorkflowIntegration.ts` |
| Notifications | `bnNotificationIntegrationService.ts` | `useBnNotifications.ts` |
| Medical | `medicalService.ts` | `useBnMedical.ts` |

### 13.6 Edge functions

- `document-proxy` — only path to fetch DMS blobs (memory).
- Notification dispatch — multi-channel send and template render.
- Public benefit application — captures public intake.

### 13.7 Performance patterns

- **Interactive lists:** `.range()` pagination (memory `Pagination Standards`).
- **Bulk processing:** 1,000-row chunked loops.
- **Caching:** react-query with `staleTime: 5 * 60_000` for libraries and reference data.
- **Auth gating:** every protected query requires `isAuthReady && isAuthenticated`.
- **N+1 mitigation & debouncing:** per memory `Performance Optimization`.

---

## 14. Integration Points & Extension Guide

### 14.1 How to add a new reference group

1. Insert one row into `bn_reference_group` (`group_code`, `group_label`, `is_system`).
2. Insert active values into `bn_reference_value`.
3. In the consuming screen, replace the hard-coded array with:
   ```ts
   const { options } = useReferenceValues('YOUR_GROUP_CODE');
   ```
4. Verify the Admin screen exposes the new group.

### 14.2 How to add a new formula variable

1. Decide source: Fact, Derived Fact, Product Parameter.
2. Insert the record into the appropriate registry table; set status `APPROVED` and an effective window.
3. Add a sample value (drives the simulator).
4. The variable is now usable in any Formula expression.

### 14.3 How to add a new formula

1. Create a `bn_formula_template` (code, name, output variable, required params).
2. Create a `bn_formula_version` (expression) in DRAFT.
3. Transition DRAFT → IN_REVIEW → ACTIVE via `transitionVersion`.
4. Bind to a Product Version's `formula_template_id`.

### 14.4 How to add a new country

1. Insert `bn_country` row (profile).
2. Seed ID rules, address model, participants, payment methods, legal references.
3. Country Pack Dashboard validation panel will turn green when complete.

### 14.5 How to add a new calculation layer

1. Implement the layer in `src/services/bn/calc/` returning the standard `BnCalcTraceEntry[]` plus updated context.
2. Register it in the pipeline ordering inside `calculationEngine.ts`.
3. Update Simulation Workspace types if new trace fields are introduced.

### 14.6 How to add a new payment channel

1. Add the channel to `BN_PAYMENT_METHOD_TYPE` reference values.
2. Permit the channel in `bn_country_payment_method` for relevant countries.
3. Extend `PaymentDetailsSection` rendering for any new required fields (all driven by `bn_payment_profile`).
4. Add an EFT preset to `src/lib/bn/eftFormatPresets.ts` if applicable.

### 14.7 Cross-module touchpoints

- **C3 (Contributions):** wage facts feed BN via `cl_head`.
- **Compliance:** non-payment escalations can trigger BN suspensions (memory `Compliance vs C3 Ownership`).
- **IP/ER Registration:** beneficiary identity sourced from registration master tables.
- **Audit module:** every BN write surfaces in the global audit history.

### 14.8 Hard "do not" list

- Do not read `calculation_config_legacy`.
- Do not evaluate a formula outside `runProductCalculation`.
- Do not hard-code enums in TypeScript — use Reference Data.
- Do not store free-text legal references in `bn_country_*` — use `bn_legal_reference`.
- Do not write to `cl_head` or core protected tables directly (memory `Protected Source Policy`).
- Do not enable RLS in the public schema (memory + project rule).

---

## 15. Appendices

### Appendix A — `bn_*` table inventory (logical grouping)

See §13.3. For column-level detail consult `src/integrations/supabase/types.ts`.

### Appendix B — RPC quick reference

See §13.4. The Formula Lifecycle wrappers are surfaced through `formulaLifecycleService.ts`.

### Appendix C — Route → primary table matrix

| Route | Primary table(s) |
|---|---|
| `/bn/config/country/legal-refs` | `bn_legal_reference` |
| `/bn/config/reference-data` | `bn_reference_group`, `bn_reference_value` |
| `/bn/config/formulas` | `bn_formula_template`, `bn_formula_version` |
| `/bn/config/products` | `bn_product`, `bn_product_version` |
| `/bn/config/calculation` | `bn_product_version` |
| `/bn/claims/:id/calculation` | `cl_head`, `bn_formula_*`, `bn_product_version` |
| `/bn/entitlements` | `bn_entitlement` |
| `/bn/awards` | `bn_award`, `bn_award_schedule` |
| `/bn/payables` | `bn_payable` |
| `/bn/issue` | `bn_payment_issue` |
| `/bn/simulation` | `bn_sim_*` |

Full matrix in `docs/bn/route_acceptance_matrix.md`.

### Appendix D — Seeded Reference Groups (initial cutover)

| Group code | Description |
|---|---|
| `table_type` | Type of lookup table. |
| `lookup_mode` | EXACT / RANGE / STEPPED. |
| `dimension_type` | NUMBER / DATE / CODE / RANGE. |
| `match_type` | ANY / ALL. |
| `status` | Generic lifecycle status. |
| `output_type` | NUMBER / CURRENCY / PERCENT / BOOLEAN. |
| `reimbursement_method` | Medical reimbursement methods. |
| `approval_level` | Maker, Checker, Senior, Director, … |
| `location_code` | Branch/office codes. |
| `provider_type_code` | Medical provider types. |
| `beneficiary_type` | Self, Spouse, Child, Other. |
| `expression_type` | Arithmetic, Conditional, Lookup, Tabular. |
| `BN_ID_TYPE` | National ID, Passport, Work Permit, … |
| `BN_PARTICIPANT_TYPE` | Claimant, Beneficiary, Payee, Doctor, Spouse, Child, … |
| `BN_PAYMENT_METHOD_TYPE` | Bank Transfer, Cheque, Mobile Money, Cash Pickup. |
| `BN_ADDRESS_FIELD_TYPE` | Free Text, Dropdown, Validated Code. |
| `BN_LEGAL_STATUS` | Draft, Active, Superseded, Repealed. |
| `BN_LEGAL_DOC_TYPE` | Act, Chapter, Section, Regulation. |

### Appendix E — Glossary

See §3.

### Appendix F — Diagrams

#### F.1 Formula evaluation pipeline

```text
loadProductCalculationConfig ──► loadResolverMap ──► parseFormula
                                                          │
                                                          ▼
                                       resolve each variable (param > input > sample)
                                                          │
                                                          ▼
                                                 evaluateFormula
                                                          │
                                                          ▼
                                              applyCapsAndRounding
                                                          │
                                                          ▼
                                        ProductCalculationResult + trace
```

#### F.2 Product version lifecycle

```text
DRAFT ──► PENDING_APPROVAL ──► ACTIVE ──► SUSPENDED ──► ARCHIVED
                                  │
                       new version (clone) ──► DRAFT …
```

#### F.3 Claim-to-payment flow

```text
INTAKE → REGISTER → ELIGIBILITY → CALCULATION → RECOMMENDATION → APPROVAL
                                                         │
                                                  ENTITLEMENT
                                                         │
                                            AWARD (if periodic)
                                                         │
                              PAYABLES → SCHEDULE → BATCH → ISSUE → POST-ISSUE
```

#### F.4 Country Pack inheritance

```text
            ┌──────────────────────┐
            │     Country Pack     │
            │  (legal, ID, addr,   │
            │   participants, pay) │
            └──────────┬───────────┘
                       │ inherits
            ┌──────────▼───────────┐
            │   Product Version    │
            │  (may restrict only) │
            └──────────┬───────────┘
                       │ used by
            ┌──────────▼───────────┐
            │  Claim / Payment /   │
            │  Letter / Form       │
            └──────────────────────┘
```

---

*End of document.*
