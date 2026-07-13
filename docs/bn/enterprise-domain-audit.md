# Benefits Domain (`bn_*`) — Enterprise Audit and Quarantine Report (Corrected)

**Status:** Audit only. Corrective revision under BN-F01B.
**Date:** 2026-07-13 (corrected from initial 2026-07-13 report)
**Scope:** All `bn_*` tables, all Benefits-adjacent routes (`/bn/*`, `/nbenefit/*`, `/newBenefit/*`, `/benefits/*`), Benefits services, and integration boundaries with Communication Hub, Finance/Ledger, Workflow, Legal, DMS, IP, ER.

> This document has been corrected to (a) comply with the permanent repository rule
> `docs/ARCHITECTURE-NO-RLS-RULE.md` — **RLS must remain disabled** and is not the
> Benefits authorization mechanism, and (b) reclassify capabilities that the initial
> report incorrectly labeled as "no writer / no consumer" or "mock" despite the
> presence of real service functions and real-data screens. No source code, schema,
> RPC, trigger, grant, RLS policy, or database object has been changed by this audit.

Architectural framing is fixed and not reopened here: `/bn/*` and `bn_*` are canonical. Legacy PowerBuilder tables (`cl_*`, `au_cl_*`, `cn_*`, `au_cn_*`) and the prototype namespaces (`/newBenefit/*`, `/nbenefit/*`, overlapping `/benefits/*`) are **not** alternative production architectures.

---

## A. Executive conclusion

1. `bn_*` is canonical. No new Benefits domain should be created. New capabilities must be delivered by extending existing `bn_*` tables and services under `src/services/bn/*`.
2. **Primary production blocker (corrected).** Under the approved no-RLS architecture, the combination of (i) broad `authenticated`-role table grants, (ii) ~85 direct browser mutations against `bn_*`, and (iii) the absence of a server-side authorization boundary (RPC / edge function with role + permission + maker-checker) is the primary security defect. RLS is **not** the remediation and must not be enabled.
3. **Secondary production blockers.**
   - Direct browser writes to Communication-Hub–owned tables (`bn_communication_log`, `bn_letter`) and to `notification_templates` / `notification_template_versions` from Benefits configuration screens bypass the sending spine and the template governance path.
   - `newBenefitService.ts` is an in-memory mock still imported by six pages under `/newBenefit/*`. It is not a Benefits data source. It must be labelled and eventually retired via the `src/portals/*` migration, but not by editing the audit banner into the source file (this corrective task removed the previously added banners — see §B).
4. **Items that remain unverified.** See §I. Empty-table intent for tables with no observed writer/reader, actual PostgREST grants for `anon` / `authenticated` / `service_role` / application roles on each `bn_*` table, idempotency and transactional guarantees of many mutations, and per-page parity for the remaining `/nbenefit/*` legacy staff screens.

---

## B. Correction ledger

| Previous statement | Verdict | Corrected conclusion | Evidence |
| --- | --- | --- | --- |
| "Enable RLS on every `bn_*` table" and "No RLS is the primary defect" | **Incorrect** | RLS must remain disabled per `docs/ARCHITECTURE-NO-RLS-RULE.md`. Primary defect is the direct-browser-mutation + authenticated-role-grant + missing-server-authorization combination. Remediation is RPC/edge-function boundary, role/permission checks, maker-checker, idempotency, and audit — not RLS. | `docs/ARCHITECTURE-NO-RLS-RULE.md` |
| "`bn_overpayment`, `bn_life_certificate`, `bn_medical_review_schedule`, `bn_award_status_event`, `bn_award_suspension_event`, `bn_award_beneficiary` — no writer, no consumer, disconnected" | **Incorrect** | All are read and written by `src/services/bn/awardServicingService.ts` and consumed by real-data screens under `src/pages/bn/servicing/*`. They are **empty because no production servicing data exists yet in this environment**, not because the capability is missing. | `src/services/bn/awardServicingService.ts` lines 177, 190, 202, 227, 241, 259, 267, 276, 290, 310, 326, 349, 356; `src/pages/bn/servicing/{LifeCertificateManagement,AwardSuspensionConsole,OverpaymentRecovery,SurvivorsBenefitProcessing,MedicalReviewScheduler}.tsx` |
| "Servicing screens classification unspecified" | **Partial** | The five servicing pages are **real but partial** — real-data wiring exists; server-side authorization, transactional guarantees, maker-checker, and idempotency need per-mutation verification (see §E). | Same as row above |
| "No responsibility duplication was found inside `bn_*`" (stated absolutely) | **Partial** | Absolute wording is not supported. Only `bn_calc_trace` (143 rows, active) vs `bn_calculation_trace` (0 rows, no callers observed) is a candidate deprecation pair, and even that requires callers-audit. Other pairs remain **unverified** and are enumerated in §G(2). | §G(2) |
| "Direct browser writes to `bn_communication_log` / `bn_letter` bypass Communication Hub" | **Correct** | Retained. Remediation is to re-route through `sendCommunication`, not RLS. See §E and §H(1). | `mem://features/communication-hub/guardrails` |
| Direct-write count (~85 in `src/`, ~40 called out for review, ~10 in edge functions) | **Unverified in this corrective pass** | Numbers retained from the initial audit sweep; a full re-verification against `.from('bn_*').(insert|update|delete|upsert)` is queued as part of the mutation register work in §E. | Initial ripgrep in prior audit |
| Mock `newBenefitService.ts` labeled non-canonical by editing the source file | **Wrong scope for an audit** | The banner edits have been reverted by this corrective task. The classification is retained in this document only. | `git` diff in this commit — see §11 |
| Hosted/migration parity conclusions about `/nbenefit/*` and `/benefits/*` | **Partial** | Redirect counts retained as observations; parity per page is **unverified** and needs a page-by-page owner review before removal. | §G(1) |

---

## C. Canonical capability register

| Capability | Canonical bn_* owner | Current implementation | Lifecycle completeness | Shared dependency | Gap |
| --- | --- | --- | --- | --- | --- |
| Benefit product & versioning | `bn_product`, `bn_product_version`, `bn_product_channel_config`, `bn_product_parameter`, `bn_product_amendment_policy`, `bn_version_approval` | `src/services/bn/productBuilder/*`, `src/pages/bn/product-builder/*` | Complete | Workflow (approvals) | Direct browser writes to `bn_product_version` and `bn_version_approval` need server-boundary review |
| Eligibility rules & facts | `bn_eligibility_rule`, `bn_eligibility_fact`, `bn_rule_catalogue`, `bn_rule_group*`, `bn_rule_condition`, `bn_derived_fact` | `src/services/bn/eligibility/*` | Complete | Reference/config | None functional |
| Formula & calc trace | `bn_formula_template`, `bn_formula_version`, `bn_calc_run`, `bn_calc_trace`, `bn_calculation_rule` | `src/services/bn/calc/*`, `src/services/bn/calculationEngine.ts` | Complete; `bn_calculation_trace` candidate legacy | — | Confirm `bn_calculation_trace` has no callers before deprecation |
| Claims lifecycle | `bn_claim`, `bn_claim_application`, `bn_claim_event`, `bn_claim_decision`, `bn_claim_intake_validation`, `bn_claim_evidence`, `bn_claim_field_ownership`, `bn_claim_amendment_log`, `bn_claim_correction_request/_field`, `bn_claim_queue_assignment`, `bn_claim_detail`, `bn_claim_document` | `src/services/bn/claim*.ts`, `src/services/bn/intake/*`, `src/services/bn/amendClaimField.ts` | Real but partial — several event/amendment/correction tables empty despite writers observed | Workflow, DMS | Verify writers are exercised end-to-end; add server boundary |
| Awards & entitlement | `bn_award`, `bn_award_beneficiary`, `bn_award_rate_history`, `bn_award_status_event`, `bn_award_suspension_event`, `bn_entitlement` | `src/services/bn/awardServicingService.ts`, `src/services/bn/awards/*` | **Real but partial** — writers and readers exist for status/suspension/beneficiary; empty because live data not yet produced | — | Server-side authorization + audit events for status/suspension transitions (§E) |
| Servicing — life certificate | `bn_life_certificate` (+ `bn_award`, `ip_master`) | `src/services/bn/awardServicingService.ts` (issue/record/verify), `src/pages/bn/servicing/LifeCertificateManagement.tsx` | Real but partial | IP | Server boundary, maker-checker on verification, audit event |
| Servicing — medical review schedule | `bn_medical_review_schedule` | `src/services/bn/awardServicingService.ts`, `src/pages/bn/servicing/MedicalReviewScheduler.tsx` | Real but partial | Medical config catalogues | Server boundary, audit event |
| Servicing — overpayment | `bn_overpayment` | `src/services/bn/awardServicingService.ts`, `src/pages/bn/servicing/OverpaymentRecovery.tsx` | Real but partial — canonical is Benefits liability; Finance owns the AR/plan | Finance/Ledger | Boundary integration to Finance not verified end-to-end |
| Servicing — survivors | `bn_award (SURVIVORS)`, `bn_award_beneficiary` | `src/pages/bn/servicing/SurvivorsBenefitProcessing.tsx` (via `awardServicingService`) | Real but partial | IP | Server boundary, audit event |
| Payments (canonical pipeline) | `bn_payment_instruction`, `bn_payment_batch`, `bn_batch_item`, `bn_payment_schedule`, `bn_payment_exception`, `bn_payment_reconciliation`, `bn_cheque_register`, `bn_eft_file`, `bn_issue_record` | `src/services/bn/payments*`, `payablesQueueService.ts`, `paymentBoundaryService.ts`, `scheduleService.ts` | Real but partial — many stages empty | Finance | Multi-record ops need transactional wrapper; server boundary |
| Medical (config + transactional) | `bn_medical_*` | `src/services/bn/medical*` (config); transactional tables empty | Real but partial | — | Unverified for transactional stages |
| Documents & evidence link | `bn_claim_document`, `bn_doc_requirement`, `bn_evidence_checklist`, `bn_evidence_audit` | `src/services/bn/evidenceService.ts` and related | Real but partial | DMS | Boundary: file bytes/retention remain DMS |
| Benefits workflow (rules/policies) | `bn_workflow_template`, `bn_workbasket`, `bn_approval_policy`, `bn_escalation_policy*`, `bn_override_policy`, `bn_role_bundle*` | `src/services/bn/bnWorkflow*Service.ts`, approval console | Real, active | Core Workflow (execution) | Boundary already delineated; verify runtime |
| Benefits ↔ Communication | `bn_comm_event`, `bn_comm_mapping`, `bn_communication_log`, `bn_letter` | `src/modules/benefits/communication/*` (façade) **and** direct writes from `src/pages/bn/config/BenefitCommunicationTemplates.tsx` bypassing the façade | Real but uncontrolled | Communication Hub | Reroute all sends through `sendCommunication`; template CRUD through Hub (§9) |
| Benefits ↔ Legal referral | `bn_legal_referral` | `src/services/legal/legalReferralHistoryService.ts`, `coreLegalReferralItemService.ts` | Real but partial | Legal | Boundary retained |
| Simulation | `bn_sim_*` | `src/services/bn/simulation/*`, `scripts/bn/*` | Real but partial | — | Config presets empty |
| Country / config packages | `bn_country*`, `bn_country_config_package*` | `src/services/bn/countryMasterService.ts`, `countryPackService.ts` | Real but partial | Reference | Packages not yet used |

---

## D. Table usage register (representative rows — full list retained from initial inventory)

Full row counts are retained from the initial inventory (200 `bn_*` tables, ~110 populated, ~50 empty). Classification is corrected here to use code evidence, not row counts, and to name the exact code path.

| Table | Rows | Readers | Writers | RPC / trigger / edge function | Current classification |
| --- | --- | --- | --- | --- | --- |
| `bn_overpayment` | 0 | `awardServicingService.listOverpayments`, `OverpaymentRecovery.tsx`, `payablesQueueService`, `paymentBoundaryService`, `person360Service` | `awardServicingService.updateOverpayment` (browser) | None observed | Empty but read+written by active code — awaiting data |
| `bn_life_certificate` | 0 | `awardServicingService.listLifeCertificates`, `LifeCertificateManagement.tsx`, `portals/claimant/compliance/LifeCertificatePage.tsx` | `awardServicingService.issueLifeCertificate/recordLifeCertificate/verifyLifeCertificate` (browser) | None observed | Empty but read+written by active code — awaiting data |
| `bn_award_status_event` | 0 | `AwardSuspensionConsole.tsx`, `awardServicingService.listAwardEvents` | `awardServicingService.recordStatusEvent` (browser, insert) | None observed | Empty but read+written by active code — awaiting data |
| `bn_award_suspension_event` | 0 | `AwardSuspensionConsole.tsx`, `awardServicingService` list/lift | `awardServicingService.suspendAward/liftSuspension` (browser) | None observed | Empty but read+written by active code — awaiting data |
| `bn_award_beneficiary` | 0 | `SurvivorsBenefitProcessing.tsx`, `awardServicingService.listBeneficiaries` | `awardServicingService.upsertBeneficiary` (browser) | None observed | Empty but read+written by active code — awaiting data |
| `bn_payment_schedule` | 0 | `scheduleService`, `paymentBoundaryService`, `ScheduleGenerationWizard.tsx` | `scheduleService` (browser) | None observed | Empty but written by active code — behind schedule-generation flow |
| `bn_medical_review_schedule` | 0 | `MedicalReviewScheduler.tsx`, `awardServicingService.listMedicalReviews` | `awardServicingService.scheduleMedicalReview/updateMedicalReview` (browser) | None observed | Empty but read+written by active code — awaiting data |
| `bn_calc_trace` | 143 | active | active | — | Active canonical |
| `bn_calculation_trace` | 0 | none observed | none observed | — | **Candidate deprecation** — verify callers before removal |
| `bn_communication_log` | 57 | Benefits screens | **direct browser update** | — | Boundary violation vs Communication Hub |
| `bn_letter` | 13 | Benefits screens | **direct browser update** | — | Boundary violation vs Communication Hub |

(Every other `bn_*` table retains its prior inventory classification; the tables above are the ones the previous report misclassified.)

---

## E. Mutation register (Benefits sensitive writes — sampled and prioritised)

Format: `file → function → target → surface → authorization → transactional → audit → idempotent → priority`.

| File | Function | Table / RPC | Surface | Authorization | Transactional | Audit | Idempotent | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/services/bn/awardServicingService.ts` | `recordStatusEvent` | `bn_award_status_event` (insert) | Browser | UI permission only (unverified server) | No | No `bn_claim_event` / `core_audit_log` observed | No | **High** |
| `src/services/bn/awardServicingService.ts` | `suspendAward` / `liftSuspension` | `bn_award_suspension_event`, `bn_award.status` | Browser | UI permission only | No (two-step) | No audit event | No | **High** — maker-checker required |
| `src/services/bn/awardServicingService.ts` | `verifyLifeCertificate` | `bn_life_certificate.update` | Browser | UI permission only | No | No audit event | No | **High** — maker-checker required |
| `src/services/bn/awardServicingService.ts` | `updateOverpayment` | `bn_overpayment.update` | Browser | UI permission only | No | No audit event | No | **High** — Finance boundary |
| `src/services/bn/awardServicingService.ts` | `upsertBeneficiary` | `bn_award_beneficiary` | Browser | UI permission only | No | No audit event | No | **High** |
| `src/pages/bn/config/BenefitCommunicationTemplates.tsx` | multiple (`insert`/`update` at lines 100, 114, 137–139, 151, 182, 216, 518) | `notification_templates`, `notification_template_versions` | Browser | UI permission only | No | No Communication Hub governance event | No | **Critical** — must move to Communication Hub façade |
| `src/services/bn/claimService.ts` and neighbours | `bn_claim_event.insert` (~28 sites) | `bn_claim_event` | Browser | Mixed UI checks | No | Same table is itself the audit trail; still no central `core_audit_log` write | No | Medium — centralise via RPC |
| Payments services | `bn_payment_instruction.update`, `bn_payment_batch.update`, `bn_batch_item.update`, `bn_issue_record.update`, `bn_post_issue_task.update` | Browser | UI checks | Not transactional across siblings | Uneven | No | **High** |

Enumerating the remaining ~60 mutations at the same fidelity is queued as the first task of the recommended follow-up epic (§J-1). This section is deliberately **not** exhaustive in this corrective pass and is marked as such in §I.

> Note: moving a call from a page component to a browser-side service module is **not** a security fix and is not counted as remediation. Only moving the write behind a server-authorized RPC / edge function counts.

---

## F. Shared-platform boundary matrix

| Capability | Benefits ownership | Shared ownership | Current integration | Gap |
| --- | --- | --- | --- | --- |
| Communications | Business event, recipient reference, domain payload, Benefits event registry (`bn_comm_event`, `bn_comm_mapping`), Benefits projection (`bn_communication_log`, `bn_letter`) | Communication Hub — templates, versions, branding, sender, dispatch, retry, delivery log, central audit | `src/modules/benefits/communication/*` façade exists; direct writes to `bn_communication_log`, `bn_letter`, and `notification_templates` bypass it | Reroute all sends and template CRUD through Hub |
| Finance / Ledger | Payment instruction & batch, overpayment liability, EFT/cheque objects, issue record | GL heads/postings, AR ledger, payment allocation, payment arrangement | Reference by ID only | Verify Benefits does not write to `core_ledger_*` or `core_payment_allocation` directly |
| Workflow | Benefits templates, approval/escalation/override policies, workbaskets, role bundles | Core Workflow execution engine, tasks, transitions, inbox | `bn_workbasket` is a view over `core_workflow_task` | Verify at runtime |
| Legal | `bn_legal_referral` (handoff record, Benefits impact) | `lg_case`, `lg_appeal`, `lg_hearing`, `lg_order`, `lg_recovery_*`, `la_matter*` | ID reference | No direct Benefits write to `lg_*` |
| DMS | `bn_claim_document`, `bn_doc_requirement`, `bn_evidence_checklist`, `bn_evidence_audit` (links + verification state) | `core_dms_*`, `core_document_profile`, `core_generated_document` (bytes + retention) | ID reference | Confirm no Benefits writes to `core_dms_*` |
| IP | `bn_claim_person_snapshot`, `bn_claim_participant` (as-at-claim) | `ip_master`, `ip_depend`, `ip_wages`, `ip_employer`, `ip_names`, `ip_self_employ` (live truth) | Snapshot pattern | Benefits must never overwrite IP |
| ER | `bn_claim_employer_snapshot` (as-at-claim) | `er_master`, `er_owner`, `er_locations`, `er_visit`, `er_suit` | Snapshot pattern | Benefits must never overwrite ER |

Where both a `bn_*` and a `core_*` (or shared) table exist for adjacent concepts, the `bn_*` table is **not** automatically to be replaced. The boundary above defines the ownership.

---

## G. Legacy and prototype quarantine register

### G(1) Routes / services

| Route / service | Classification | Canonical replacement | Useful elements | Future action |
| --- | --- | --- | --- | --- |
| `/newBenefit/*` (~13 live pages) | Non-canonical prototype | `src/portals/*` (external) + `/bn/*` (internal) | UX reference for contributor/employer portals | Migrate portal flows to `src/portals/*` against real Cloud endpoints; then redirect |
| `src/services/newBenefitService.ts` | Non-canonical mock (in-memory) | `src/services/bn/*` | None for production | Retire after `src/portals/*` migration completes |
| `src/contexts/NewBenefitAuthContext.tsx` | Non-canonical prototype auth | `src/contexts/AuthContext.tsx` | None for production | Retire with the pages above |
| `/nbenefit/*` (~63 mounts, ~55% already redirected) | Legacy staff screens | `/bn/*` | Legacy form engine at `/nbenefit/application/:benefitType` retained pending parity check | Per-page parity check by named owners |
| `/benefits/*` | Mostly redirected to `/bn/*`; 3 legacy report pages remain (`payments-by-type`, `claims-volume`, `overpayments`); `/finance/accounts-payable/benefits-verification` is Finance-owned (not a duplicate) | `/bn/reports/*` | Report SQL and column shape | Build `/bn/*` report parity, then redirect |
| Legacy `cl_*` / `au_cl_*` / `cn_*` / `au_cn_*` | Historical / migration source (millions of rows) | — | Data | Read-only for migration; never write from `/bn/*` code paths |

### G(2) Intra-`bn_*` duplicate reassessment

The previous statement "no intra-`bn_*` duplication" was too absolute. Re-scored pairs:

| Pair | Classification |
| --- | --- |
| `bn_calc_trace` (143) vs `bn_calculation_trace` (0) | **Candidate confirmed duplicate** — verify no callers, then deprecate `bn_calculation_trace` |
| `bn_calculation_rule` vs rule-catalogue structures (`bn_rule_catalogue`, `bn_rule_group`, `bn_rule_group_item`, `bn_rule_condition`) | **Different responsibility** — `bn_calculation_rule` is calc-side; rule-catalogue is eligibility-side. Requires coexistence |
| `bn_claim_eligibility` vs eligibility diagnostic/result structures (`bn_eligibility_diagnostic`, `bn_derived_fact`) | **Operational vs. audit/history** — retain both |
| `bn_workbasket*` vs `bn_claim_queue_assignment` | **Configuration vs. transaction** — retain both |
| `bn_communication_log` vs Benefits event/archive structures (`bn_comm_event`) | **Operational log vs. event registry** — different responsibility |
| `bn_award_status_event` vs `bn_award_suspension_event` | **Parent/child** — status event is the general history; suspension event carries suspension-specific fields. Retain both |
| `bn_payment_instruction` vs `bn_payment_batch` vs `bn_batch_item` | **Parent/child (aggregation)** — retain all |
| Anything else | **Unverified** — no pairwise column-and-usage comparison has been performed in this pass |

No deletion is recommended on row-count alone.

---

## H. Verified gaps

### H(1) Security & command-boundary gaps
- ~85 direct browser mutations against `bn_*` with no server-side authorization boundary.
- Direct browser writes to `notification_templates`, `notification_template_versions` from `src/pages/bn/config/BenefitCommunicationTemplates.tsx`.
- Direct browser writes to `bn_communication_log` and `bn_letter` bypass Communication Hub.
- No maker-checker on suspension, life-certificate verification, overpayment update, and beneficiary changes.
- Grants for `authenticated` / application roles on each `bn_*` table have not been verified in this pass.

### H(2) Transaction gaps
- Multi-row payment operations (batch + items + instructions) are not wrapped in a single server-side transaction.
- Status transitions on awards (event + status update) are two client-side steps.

### H(3) Audit gaps
- Servicing writes do not emit a `bn_claim_event` or a `core_audit_log` entry.
- Communication template mutations do not emit a Communication Hub governance event.

### H(4) Workflow gaps
- Approval/override policies exist as data (`bn_approval_policy` 303, `bn_override_policy` 5) but the runtime execution against `core_workflow_*` is not verified end-to-end in this pass.

### H(5) Functional lifecycle gaps
- Empty-but-wired tables (§D): the writer exists but has not been exercised in this environment — requires smoke tests, not new tables.
- Payment reconciliation (`bn_payment_reconciliation`) still lacks a verified writer.
- Simulation output tables (`bn_sim_run_output`, `bn_sim_formula_trace`, `bn_sim_rule_trace`) empty — unverified.

### H(6) Integration gaps
- Overpayment ↔ Finance AR/plan boundary not verified end-to-end.
- DMS `document_id` binding integrity not verified.

### H(7) Reporting & finance gaps
- Three `/benefits/reports/*` pages still legacy — `/bn/*` report parity not yet built.

### H(8) Migration gaps
- `cl_*` / `cn_*` → `bn_*` migration batches are not part of this audit; only read patterns were confirmed as legitimate.

---

## I. Remaining uncertainties (do not hide)

- Actual `GRANT` matrix per `bn_*` table for `anon`, `authenticated`, `service_role`, and any application roles — not enumerated in this pass.
- Exhaustive mutation register (§E) — sampled only.
- Empty-table intent for tables outside the seven capabilities re-checked here (§D).
- Callers of `bn_calculation_trace` — need explicit ripgrep sweep before deprecation.
- Runtime integration of `bn_workflow_template` and `bn_approval_policy` with `core_workflow_*`.
- Idempotency semantics of every enumerated mutation.
- Whether any Benefits path still touches `notification_queue` / `notification_logs` directly.

---

## J. Next three recommended epics (small, dependency-ordered)

1. **BN-SEC-B1 — Server-boundary for high-risk servicing mutations.** Move `awardServicingService` mutations (status event, suspension, life-certificate verification, overpayment update, beneficiary upsert) behind authorized RPCs / edge functions with role + permission checks, maker-checker, transactional wrapper, idempotency key, and Benefits + central audit events. Lint-block direct browser writes to those tables afterwards. **Does not include** payments, product versioning, or communications.
2. **BN-COMM-B1 — Communication Hub reroute for Benefits.** Reroute Benefits sends currently writing directly to `bn_communication_log` / `bn_letter` through `sendCommunication`. Move `BenefitCommunicationTemplates.tsx` to the Communication Hub template governance path (Hub-owned template CRUD + Benefits-scoped view). No servicing or payment changes in scope.
3. **BN-DUP-B1 — `bn_calculation_trace` deprecation verification.** Explicit callers-sweep across `src/**`, edge functions, RPCs, and triggers. If none, mark the table deprecated in a documentation-only change; schedule DDL removal in a later migration. No other tables in scope.

Each subsequent epic (payments boundary, workflow runtime verification, appeals & mortality, empty-table intent sweep, grants audit) is deliberately **not** combined into these three.

---

## 11. Corrective commit summary

- Restored `src/services/newBenefitService.ts` and `src/contexts/NewBenefitAuthContext.tsx` to their exact pre-commit source state by removing only the audit banner headers added in commit `04aea9fd`.
- Rewrote this document to (a) remove all RLS recommendations, (b) reclassify the seven servicing/empty tables, (c) add correction ledger, canonical capability register, mutation register (sampled), boundary matrix, and next-three-epics.
- **No** runtime logic, imports, types, formatting, or behavior changed.
- **No** schema, RPC, trigger, edge function, grant, or database object changed.
- **No** RLS was enabled or recommended.
- **No** new `bn_*` table was proposed (extend-first rule preserved).
