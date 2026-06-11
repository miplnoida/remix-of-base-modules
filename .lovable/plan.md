# Plan: Benefits Management Module — Complete Reference Document

## Goal
Produce a single, comprehensive Markdown document covering the entire Benefits Management (BN) module: architecture, all `bn_*` tables and their relationships, UI surfaces, hooks/services, edge functions, workflows, and end-to-end flows. Output as a downloadable artifact.

## Deliverable
- **File:** `/mnt/documents/BN_Benefits_Management_Complete_Reference.md`
- **Format:** Single Markdown file (~50–80 pages worth), delivered via `presentation-artifact` tag for download.
- **Audience:** Mixed — business stakeholders (overview, flows) and developers (tables, APIs, code paths).

## Investigation Plan (read-only, before writing)
1. **Tables** — Query Supabase for all `bn_*` table columns, FKs, and indexes (≈180 tables already listed in context). Group by domain: Product/Config, Claim, Eligibility, Calculation, Entitlement, Payment, Workflow, Audit.
2. **Code surfaces** — Enumerate:
   - `src/pages/bn/**` (UI pages and routes)
   - `src/components/bn/**` (shared components)
   - `src/hooks/bn/**` (data hooks)
   - `src/services/bn/**` (service layer + integration adapters)
   - `src/types/bn*` and `src/types/benefitsWorkflow.ts`, `bnSimulation.ts`, etc.
   - `src/portals/_shared/publicBenefitApiClient.ts` (external portal API surface)
3. **Edge functions** — List `supabase/functions/**` related to BN (e.g., `public-benefits`, payment, eft, notification).
4. **Existing specs** — Pull and consolidate `docs/BN_*.md` and `docs/bn/**`.
5. **Routes** — Extract BN routes from `AppRoutes.tsx` / `src/config/routes.ts`.
6. **Workflow integration** — Map `bn_claim_transition_rule`, `workflow_*` tables, and `useBnWorkflowIntegration` linkage.

## Document Outline

```text
1. Executive Summary
2. Architecture Overview
   2.1 Layered model (UI → Hooks → Services → Adapters → DB / Edge Fn)
   2.2 Integration boundaries (BN ↔ Contributions, Employers, Persons, Payments, Legal, Compliance)
   2.3 Internal vs external portals (Claimant / Employer / Doctor)
   2.4 No-RLS / role-based auth model
3. Domain Model & Data Dictionary
   3.1 Product & Configuration  (bn_product, bn_product_version, bn_product_channel_config,
       bn_product_parameter, bn_scheme, bn_coverage_type, bn_calculation_rule,
       bn_formula_template, bn_eligibility_rule, bn_rule_catalogue*, bn_rule_group*)
   3.2 Country & Localization  (bn_country*, bn_country_*_rule, bn_payment_method)
   3.3 Claim Lifecycle  (bn_claim, bn_claim_application, bn_claim_detail, bn_claim_event,
       bn_claim_status_def, bn_claim_transition_rule, bn_claim_decision, bn_claim_note,
       bn_claim_document, bn_claim_amendment_log, bn_claim_correction_*)
   3.4 Eligibility & Evidence  (bn_eligibility_fact, bn_eligibility_diagnostic,
       bn_evidence_*, bn_doc_requirement, bn_derived_fact*)
   3.5 Calculation & Simulation  (bn_claim_calculation, bn_calc_run, bn_calc_trace,
       bn_calc_override, bn_calc_legacy_snapshot, bn_sim_*)
   3.6 Awards & Entitlements  (bn_award, bn_award_beneficiary, bn_award_rate_history,
       bn_award_status_event, bn_award_suspension_event, bn_entitlement)
   3.7 Payment Pipeline  (bn_payment_instruction, bn_payment_schedule, bn_payment_batch,
       bn_batch_item, bn_payment_exception, bn_payment_profile*, bn_eft_*,
       bn_cheque_register, bn_cheque_stock, bn_issue_record, bn_overpayment,
       bn_payment_reconciliation)
   3.8 Workflow, Approval & Workbasket  (bn_workflow_template, bn_workbasket*,
       bn_approval_policy, bn_override_*, bn_role_bundle*, bn_escalation_*,
       bn_post_issue_task, bn_external_task*)
   3.9 Communications & Notifications  (bn_letter, bn_comm_*, bn_communication_log)
   3.10 Medical sub-domain  (bn_medical_*)
   3.11 Reference & Metadata  (bn_data_field_registry, bn_data_source_registry,
       bn_field_metadata, bn_reason_code, bn_screen_template, bn_timeline_rule)
   For each table: purpose, key columns, FKs, status enums, audit fields.
4. Entity-Relationship Diagrams (Mermaid)
   - Claim ↔ Eligibility ↔ Calculation ↔ Award ↔ Entitlement ↔ Payment
   - Product/Version/Parameter/Rule
   - Payment batch issue chain to cl_cheques*
5. UI Map
   5.1 Route table (path → page component → role → primary tables)
   5.2 Internal pages (src/pages/bn) grouped by feature
   5.3 External portals (Claimant/Employer/Doctor) — task pages, intake forms
   5.4 Sidebar/menu wiring (bnMenuItems.ts)
6. Hooks & Services Layer
   6.1 Data hooks (src/hooks/bn) — purpose, queryKey, dependencies
   6.2 Service modules (src/services/bn) — business logic boundaries
   6.3 Integration adapters (src/services/bn/integration) — contracts and swap points
   6.4 Event bus (publishBnEvent / subscribeToBnEvents)
7. APIs & Edge Functions
   7.1 public-benefits edge function (endpoint catalogue from publicBenefitApiClient)
   7.2 Other BN-relevant edge functions
   7.3 Task token / secure link model
   7.4 RPC functions invoked from BN
8. End-to-End Flows (sequence + step list)
   8.1 Public claim intake → claim record → workflow start
   8.2 Eligibility evaluation (rule engine, derived facts)
   8.3 Calculation run & simulation
   8.4 Award creation, beneficiaries, rate history
   8.5 Payment instruction → schedule → batch → issue (cl_cheques) → reconciliation
   8.6 Exception / overpayment / suspension
   8.7 Correction / amendment / override (maker-checker)
   8.8 External task lifecycle (claimant, employer, doctor)
   8.9 Communication / letter generation
9. Workflow & Approval Model
   - bn_claim_transition_rule vs enterprise workflow engine governance
   - useBnWorkflowGovernance decision path
   - Escalations and SLAs
10. Security & Authorization
    - Role bundles, workbasket roles, capability checks
    - PII masking, audit trail (bn_claim_event, bn_*_audit)
    - No RLS — server-side guards in edge functions / RPCs
11. Reporting, Audit & Observability
    - bn_claim_event, bn_calc_trace, bn_sim_*_trace
    - Historical inquiry (per docs/BN_Historical_Inquiry_Specification.md)
    - Post-issue review (per docs/BN_Post_Issue_Review_Specification.md)
12. Backward Compatibility & Legacy Integration
    - cl_head, cl_cheques*, cn_* anchors
    - Legacy snapshots and formula cutover
13. Appendices
    A. Full table list with row counts and column counts
    B. Enum reference (statuses, payment methods, batch states)
    C. Glossary (Claim, Award, Entitlement, Instruction, Batch, Issue, Workbasket)
    D. Source-of-truth file index (where each concept lives in code)
    E. Open gaps / TODOs discovered during audit
```

## Technical Notes
- Use `supabase--read_query` against `information_schema` to extract columns/FKs for all `bn_*` tables in batched queries.
- Use `rg` to enumerate `src/pages/bn`, `src/hooks/bn`, `src/services/bn`, and route definitions.
- Mermaid ER diagrams embedded inline (rendered by viewers that support it); also reference companion `.mmd` files if any.
- No code changes. No publish. No DB changes.
- Document is generated under `/mnt/documents/` and surfaced via `<presentation-artifact>`.

## Out of Scope
- Implementing or fixing any BN feature.
- Touching the Compliance Rule Simulator (separate prior thread).
- Publishing to live or test URLs.

## Acceptance
- Single `.md` file delivered as artifact.
- Every `bn_*` table appears in section 3 with at least purpose + key columns.
- Every BN route in the app appears in section 5.1.
- Every endpoint in `publicBenefitApiClient` appears in section 7.1.
- Flows in section 8 cite the specific tables and code files involved.
