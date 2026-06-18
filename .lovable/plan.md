## Goal

Produce one authoritative Markdown document at `docs/bn/BENEFITS_MODULE_COMPLETE.md` that fully describes the Benefits (BN) module — business purpose, screens, country pack, reference data, formula library, product catalog, calculation engine, simulation, payments, audit, and technical architecture — including how formulas and configuration integrate end-to-end.

No code changes. No branding. Plain Markdown, layered for business → config → developer audiences.

## Discovery (read-only, before writing)

Before writing, I will scan and cite:
- `src/pages/bn/**`, `src/components/bn/**`, `src/hooks/bn/**`, `src/services/bn/**`
- `src/types/bn*`, `src/types/bnCalcEngine.ts`, `src/types/bnSimulation.ts`
- Existing docs in `docs/bn/*` (formula-cutover-audit, formula-library-audit, medical-engine-audit, version-lifecycle-policy, legacy_table_usage_matrix, route_acceptance_matrix, phase_results, BN_CONTROLLED_IMPLEMENTATION_PLAN, etc.)
- Country Pack reference data work just completed (bn_reference_group/value, bn_legal_reference, bn_country_*)
- BN-related migrations in `supabase/migrations/*bn*`
- Memory entries: BN Platform Modernization, BN Calculation Engine, Medical Policy Consolidation, BN Payment Details Framework

## Document Outline

```text
docs/bn/BENEFITS_MODULE_COMPLETE.md
├── 1. Executive Summary
├── 2. Module Map & Navigation
├── 3. Core Concepts & Glossary
├── 4. Country Pack (foundation layer)
├── 5. Reference Data / Enum Master
├── 6. Formula Library & Calculation Engine   ← deep dive
├── 7. Product Catalog (assembly workbench)   ← deep dive
├── 8. Rate Tables, Medical Tariffs, Tables Library
├── 9. Eligibility, Documents, Workflow, Notifications
├── 10. Claims → Entitlement → Award → Payment
├── 11. Simulation Workspace
├── 12. Audit, Governance & Versioning
├── 13. Technical Architecture (DB / RPC / services / hooks)
├── 14. Integration Points & Extension Guide
└── Appendices (schema map, RPC catalog, route matrix, glossary)
```

### Section detail (what each chapter contains)

**1. Executive Summary** — purpose, modernization story (10-layer engine, cl_head anchor, Formula Library cutover), target users.

**2. Module Map** — sidebar structure (bnMenuItems), every BN route with one-line purpose, screen-role banners.

**3. Core Concepts** — Branch, Scheme, Product, Product Version, Claim, Entitlement, Award, Payment, Beneficiary, Participant, Cap, Rounding, Effective Date Rule.

**4. Country Pack** — Country profile, ID Rules, Address Model, Participant Types, Payment Config, Legal References (`bn_legal_reference`), validation panel, cross-module consumption (forms, letters, notifications, product catalog).

**5. Reference Data / Enum Master** — `bn_reference_group` + `bn_reference_value`, `useReferenceValues` hook, all seeded groups (table_type, lookup_mode, dimension_type, match_type, status, output_type, reimbursement_method, approval_level, location_code, provider_type_code, beneficiary_type, expression_type, BN_ID_TYPE, BN_PARTICIPANT_TYPE, BN_PAYMENT_METHOD_TYPE, etc.), system vs user values, lifecycle (active/retired/cannot-delete-if-used), Reference Data Admin screen.

**6. Formula Library & Calculation Engine** *(deep dive)*
- Variable Registry (`bn_formula_variable_registry`) — code, label, source_type, sample_value
- Formula Template / Version (`bn_formula_template`, `bn_formula_version`) — DRAFT→IN_REVIEW→ACTIVE→RETIRED, single-active rule, clone, new-version, safe-delete (`formulaLifecycleService`)
- Expression grammar and parser (`src/lib/bn/formulaParser`)
- Variable Resolver (`variableResolverService`) — Fact / Derived Fact / Parameter / Prior result
- Calculation loader (`productCalculationLoader`) — pulls formula + per-product parameters, cap rules, rounding, effective date rule
- Runtime entry point (`runProductCalculation`) — only sanctioned path; flow diagram: loader → resolver → parse → evaluate → caps/rounding → trace
- Trace & telemetry contract (used by Simulation and Workbench)
- 10-layer Calculation Engine pipeline (eligibility, base, multipliers, caps, offsets, deductions, tax, rounding, distribution, post-checks) anchored at `cl_head`
- Configuration integration: how a Product Version binds a formula, supplies parameter values, cap_rules, rounding_rule; how Reference Data feeds dropdowns inside the builder
- Worked example: Sickness Benefit calculation walk-through with sample inputs and trace output

**7. Product Catalog** *(deep dive)*
- `bn_product`, `bn_product_version` lifecycle (DRAFT, PENDING_APPROVAL, ACTIVE, SUSPENDED, ARCHIVED)
- Assembly workbench: eligibility, calculation (formula binding), documents, service docs, medical policy, workflow, screen/field template, workbasket, escalation, reason codes, notifications, legal references
- How each block reads from a library (no redefinition in product)
- Country pack inheritance and overrides

**8. Rate Tables / Medical Tariffs / Tables Library** — header/dimension/value structure, lookup_mode, match_type, reference-data-driven dropdowns, medical policy consolidation (single source for reimbursement limits).

**9. Eligibility / Documents / Workflow / Notifications** — eligibility rule engine, document lifecycle (resolver, atomic mirror, dms_transfer_queue), workflow_step_notifications engine, role assignment.

**10. Claims → Payment** — claim intake, entitlement calc using `runProductCalculation`, award generation, payment via BN Payment Details Framework (`bn_payment_profile`, unified PaymentDetailsSection), EFT formats.

**11. Simulation Workspace** — `bn_sim_*` tables, scenario → config snapshot → run → inputs/outputs/rule trace/formula trace, comparison mode, replay.

**12. Audit, Governance & Versioning** — version-lifecycle-policy, system_audit_trail patterns, maker-checker, immutable history.

**13. Technical Architecture**
- Schema map of all `bn_*` tables (grouped by domain)
- RPC catalog (lifecycle, calculation, simulation, governance)
- Service layer (formulaLifecycleService, productCalculationLoader, runProductCalculation, variableResolverService, legalReferenceService, countryProfileService, referenceDataService, …)
- Hook layer (useReferenceData, useBnFormulaVariableRegistry, useBnProducts, useLegalReferences, …)
- Edge functions touching BN (document-proxy, notifications)
- NO-RLS architecture note + app-layer authorization
- Performance patterns (pagination, staleTime, isAuthReady gating)

**14. Integration Points & Extension Guide** — how to add a new formula variable, a new reference group, a new product, a new country pack, a new calculation layer, a new payment channel; cross-module touchpoints (Compliance, C3, IP/ER registration).

**Appendices**
- A. Table-by-table schema reference for `bn_*`
- B. RPC quick reference
- C. Route → screen → primary table matrix
- D. Reference group catalog (all seeded groups + values)
- E. Glossary
- F. Diagrams (ASCII): formula evaluation flow, product version lifecycle, claim-to-payment flow, country pack inheritance

## Conventions

- File-line citations (e.g. `src/services/bn/runProductCalculation.ts:45`) so engineers can jump straight to source.
- ASCII diagrams in fenced ` ```text ` blocks.
- Tables for enums, statuses, RPC signatures.
- Pure Markdown — no images, no branding.
- Single file; estimated 4–6k lines. If it exceeds a sensible size, split appendices into sibling files under `docs/bn/spec/` and link from the master doc.

## Deliverable

- `docs/bn/BENEFITS_MODULE_COMPLETE.md` (new)
- Optional sibling appendix files under `docs/bn/spec/` only if the master file would exceed ~6k lines.

No source code, schema, or runtime behavior changes.
