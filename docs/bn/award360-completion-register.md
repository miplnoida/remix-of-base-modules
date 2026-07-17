# Award 360 — Completion Register (AW360-WAVE-1)

Starting SHA: `f203f3ba7f5c8a313b77d3d71fb4ed8d0af445c3`
Owner: Award 360 workspace (`/bn/awards/:id`).
Scope: 13 operational tabs, read-only. No new mutations in this wave.

## Wave 1 Slice status

| Slice | Status |
|-------|--------|
| C1 Slice A — shell refactor + active-tab gating | CODE_COMPLETE |
| C1 Slice A.1 — pensioner alert edge cases | CODE_COMPLETE |
| C1 Slice B — action contract + table-aware schema contract | CODE_COMPLETE |
| C1 Slice B.1 — executable contract certification (scope enforcement, containment lockdown, envelope provenance, exact drift, route resolution, OPEN_CLAIM Option B, expanded gating) | CODE_COMPLETE |

| C1 Slice C — admin dataDiag panel + live 13-tab sweep | NOT STARTED |

Statuses used below: `CODE_COMPLETE` (typechecked + unit-tested against mocks),
`RUNTIME_VERIFIED` (proved against the live browser preview), `BUSINESS_ACCEPTED`,
`CLOSED`. A static schema contract is **not** deployed runtime certification.



Legend: `RO` read-only complete · `RO-P` read-only partial · `TODO` not started · `N/A` not applicable this wave.

| # | Tab | Status | Data source(s) | Permission gate | Notes |
|---|-----|--------|----------------|-----------------|-------|
| 1  | overview           | RO   | `bn_award`, `bn_product`, `bn_claim`, `bn_product_version`; summary aggregates | `AWARD_VIEW` (bn_awards_list.view) | Header + tri-state summary shell certified. |
| 2  | pensioner          | RO   | `ip_master`, `bn_award`, `bn_claim`, `ip_depend`, `bn_payment_profile`, `bn_payment_profile_change_request` | `PENSIONER_VIEW` (+ PAYMENT_PROFILE_VIEW, PERSON_360_VIEW) | SSN masking + `canonicalPersonId=null` when Person360 denied. |
| 3  | claim              | RO   | `bn_claim`, `bn_award`, `bn_claim_queue_assignment`, `bn_product_version`, `bn_claim_eligibility`, `bn_claim_calculation`, `bn_claim_decision`, `bn_claim_evidence`, `bn_doc_requirement`, `bn_claim_event`, `bn_claim_note`, `bn_override_request` | `CLAIM_VIEW` (+ CLAIM_EVIDENCE_VIEW, CLAIM_WORKFLOW_VIEW) | Workflow queries skipped when `canViewWorkflow=false`. Evidence baseline via `bn_doc_requirement`. |
| 4  | product            | RO   | `bn_product`, `bn_product_version`, `bn_product_formula_binding`, `bn_eligibility_rule`, `bn_approval_policy`, `bn_comm_mapping` | `PRODUCT_VIEW` (+ PRODUCT_CONFIGURATION_VIEW) | Explicit column selection; navigation to Formulas/Docs/Screens suppressed when configuration view denied. |
| 5  | beneficiaries      | RO   | `bn_award_beneficiary` | `AWARD_VIEW` | Paged + detail. Row actions gated by `canServiceBeneficiaries`. |
| 6  | schedule           | RO   | `bn_payment_schedule` | `PAYMENT_HISTORY_VIEW` ‖ `PAYMENT_PROFILE_VIEW` | Paged + detail. |
| 7  | payments           | RO   | `bn_payment_instruction` (scoped `award_id`) | `PAYMENT_HISTORY_VIEW` ‖ `PAYMENT_PROFILE_VIEW` | Ordered by `paid_date`. |
| 8  | life-certificates  | RO   | `bn_life_certificate` | `LIFE_CERTIFICATE_VIEW` | Reminder feed + paged. |
| 9  | medical            | RO   | `bn_medical_review_schedule` | `MEDICAL_REVIEW_VIEW` (+ SENSITIVE_MEDICAL_VIEW) | Safe/sensitive column split. |
| 10 | suspensions        | RO   | `bn_award_suspension_event`, `core_workflow_task` | `SUSPENSION_VIEW` | Uses `status`/`entered_at` (never `event_status`/`created_at`). |
| 11 | overpayments       | RO   | `bn_overpayment`, `bn_payment_schedule` | `OVERPAYMENT_VIEW` | Recovery timeline + waiver stub actions. |
| 12 | communications     | RO   | `bn_communication_log`, `bn_letter` | `COMMUNICATION_METADATA_VIEW` (+ CONTENT_VIEW) | Scoped by `claim_id` and `context @> {award_id}`. Subject/body masked without content view. |
| 13 | audit              | RO   | `bn_award_status_event`, `bn_award_rate_history`, `bn_award_suspension_event`, `core_audit_log` | `AWARD_VIEW` (+ CENTRAL_AUDIT_VIEW) | Paged, filtered, source-isolated. Central audit gated. |

## Cross-cutting

- **Permission resolver:** `useAward360Permissions` + `useAward360TabAccess` are the single source of truth.
- **Restricted state:** Full-page + per-tab restricted panels; `?diag=1` shows admin diagnostics.
- **Retry access:** `refetchAllPermissions` is awaitable and surfaces refresh errors.
- **Query cache safety:** Every hook that varies with permissions encodes the flag into its query key.
- **Lazy loading:** Overview + summary always run when Overview visible; deep tabs run only when their tab is active.
- **Source-failure isolation:** Every multi-source loader returns `SectionResult<T>` (`ok | restricted | unavailable`).
- **No mutations:** Static safety test scans Award 360 tree for `.insert/.update/.upsert/.delete` (see `safety.test.ts`).
