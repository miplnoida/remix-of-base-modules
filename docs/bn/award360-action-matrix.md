# Award 360 — Action Matrix (generated)

<!--
This document is generated from `src/services/bn/awards/awardActionCatalog.ts`.
Do not edit action rows manually. Regenerate with:
  bunx tsx scripts/generate-award360-action-matrix.ts
The action-contract test asserts this file's content matches the generator.
-->

## Navigation actions

| Action | Type | Execution | Route | Required capability | Additional capabilities | Owning module | Feature flag | Business eligibility | Server command | Current behaviour |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OPEN_PERSON_360 | Navigation | NAVIGATE | `/bn/person-360` | PENSIONER_VIEW | — | bn_person_360 | — | PERSON_LINKED | unavailable | Navigation enabled |
| OPEN_CLAIM | Navigation | NAVIGATE | `/bn/claims/:claimId` (fallback `/bn/claims`) | CLAIM_VIEW | — | bn_claim_worklist | — | ALWAYS_WITH_FALLBACK | unavailable | Navigation enabled (fallback route when linkage missing) |
| OPEN_PRODUCT | Navigation | NAVIGATE | `/bn/config/products` | PRODUCT_VIEW | — | bn_product_catalog | — | ALWAYS | unavailable | Navigation enabled |
| OPEN_PAYMENT_PROFILE | Navigation | NAVIGATE | `/bn/payment-profiles` | PAYMENT_PROFILE_VIEW | — | bn_payment_profiles | payments | NOT_BENEFICIARY_CONTEXT | unavailable | Navigation enabled |
| OPEN_SURVIVORS_WORKSPACE | Navigation | NAVIGATE | `/bn/survivors?awardId=:awardId` | BENEFICIARY_WORKSPACE_VIEW | — | bn_survivors | — | ALWAYS | unavailable | Navigation enabled |
| OPEN_PAYMENT_SCHEDULE | Navigation | NAVIGATE | `/bn/schedules?awardId=:awardId` | PAYMENT_HISTORY_VIEW | — | bn_payment_history | payments | ALWAYS | unavailable | Navigation enabled |
| OPEN_PAYMENT_INSTRUCTION | Navigation | NAVIGATE | `/bn/payables?awardId=:awardId` | PAYMENT_HISTORY_VIEW | — | bn_payment_history | payments | ALWAYS | unavailable | Navigation enabled |
| OPEN_PAYMENT_BATCH | Navigation | NAVIGATE | `/bn/batches` | PAYMENT_HISTORY_VIEW | — | bn_payment_history | payments | ALWAYS | unavailable | Navigation enabled |
| OPEN_PAYMENT_EXCEPTION | Navigation | NAVIGATE | `/bn/exceptions` | PAYMENT_HISTORY_VIEW | — | bn_payment_history | payments | ALWAYS | unavailable | Navigation enabled |
| OPEN_MEDICAL_REVIEW_WORKSPACE | Navigation | NAVIGATE | `/bn/medical-reviews?awardId=:awardId` | MEDICAL_REVIEW_VIEW | — | bn_medical_reviews | medicalReview | ALWAYS | unavailable | Navigation enabled |
| OPEN_OVERPAYMENT | Navigation | NAVIGATE | `/bn/overpayments?awardId=:awardId` | OVERPAYMENT_WORKSPACE_VIEW | — | bn_overpayments | overpayment | ALWAYS | unavailable | Navigation enabled |
| OPEN_COMMUNICATION_HUB | Navigation | NAVIGATE | `/admin/communication-hub` | COMMUNICATION_HUB_VIEW | — | communication_hub_lifecycle_log | — | ALWAYS | unavailable | Navigation enabled |
| OPEN_COMMUNICATION_DELIVERY_MONITOR | Navigation | NAVIGATE | `/admin/communication-hub/delivery-monitor` | COMMUNICATION_DELIVERY_VIEW | — | communication_hub_delivery_monitor | — | ALWAYS | unavailable | Navigation enabled |
| OPEN_COMMUNICATION_RETRY_QUEUE | Navigation | NAVIGATE | `/admin/communication-hub/retry-queue` | COMMUNICATION_RETRY_QUEUE_VIEW | — | communication_hub_retry_queue | — | ALWAYS | unavailable | Navigation enabled |
| EXPORT_AUDIT | Navigation | NAVIGATE | `/bn/audit-history` | AUDIT_EXPORT | — | bn_audit_history | — | ALWAYS | unavailable | Navigation enabled |

## Dark-launched mutations

Every mutation resolves to `executionMode = DISABLED` in Wave 1. The
`serverCommandAvailable` flag is `false` for every entry — mutations must
be performed inside the specialist workspace linked in the `Route` column.

| Action | Type | Execution | Route | Required capability | Additional capabilities | Owning module | Feature flag | Business eligibility | Server command | Current behaviour |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ADD_BENEFICIARY | Mutation | DISABLED | `/bn/survivors?awardId=:awardId` | BENEFICIARY_ADD | — | bn_survivors | — | PENSIONER_ALIVE | unavailable | Disabled (dark-launched) |
| AMEND_BENEFICIARY | Mutation | DISABLED | `/bn/survivors?awardId=:awardId` | BENEFICIARY_AMEND | — | bn_survivors | — | BENEFICIARY_ACTIVE | unavailable | Disabled (dark-launched) |
| END_BENEFICIARY | Mutation | DISABLED | `/bn/survivors?awardId=:awardId` | BENEFICIARY_END | — | bn_survivors | — | BENEFICIARY_ACTIVE | unavailable | Disabled (dark-launched) |
| CANCEL_PAYMENT | Mutation | DISABLED | `/bn/payables?awardId=:awardId` | PAYMENT_CANCEL | — | bn_payment_history | payments | ALWAYS | unavailable | Disabled (dark-launched) |
| REISSUE_PAYMENT | Mutation | DISABLED | `/bn/issue` | PAYMENT_REISSUE | — | bn_payment_history | payments | ALWAYS | unavailable | Disabled (dark-launched) |
| VERIFY_LIFE_CERTIFICATE | Mutation | DISABLED | `/bn/life-certificates?awardId=:awardId` | LIFE_CERTIFICATE_VERIFY | — | bn_life_certificates | lifeCert | ALWAYS | unavailable | Disabled (dark-launched) |
| RECORD_LIFE_CERTIFICATE_RECEIPT | Mutation | DISABLED | `/bn/life-certificates?awardId=:awardId` | LIFE_CERTIFICATE_RECORD_RECEIPT | — | bn_life_certificates | lifeCert | ALWAYS | unavailable | Disabled (dark-launched) |
| SEND_LIFE_CERTIFICATE_REMINDER | Mutation | DISABLED | `/bn/life-certificates?awardId=:awardId` | LIFE_CERTIFICATE_SEND_REMINDER | COMMUNICATION_SEND | bn_life_certificates | lifeCert | ALWAYS | unavailable | Disabled (dark-launched) |
| SCHEDULE_MEDICAL_REVIEW | Mutation | DISABLED | `/bn/medical-reviews?awardId=:awardId` | MEDICAL_REVIEW_SCHEDULE | — | bn_medical_reviews | medicalReview | ALWAYS | unavailable | Disabled (dark-launched) |
| RECORD_MEDICAL_OUTCOME | Mutation | DISABLED | `/bn/medical-reviews?awardId=:awardId` | MEDICAL_REVIEW_RECORD_OUTCOME | — | bn_medical_reviews | medicalReview | ALWAYS | unavailable | Disabled (dark-launched) |
| REFER_MEDICAL_BOARD | Mutation | DISABLED | `/bn/medical-reviews?awardId=:awardId` | MEDICAL_REVIEW_REFER_BOARD | — | bn_medical_reviews | medicalReview | ALWAYS | unavailable | Disabled (dark-launched) |
| PROPOSE_SUSPENSION | Mutation | DISABLED | `/bn/award-suspension?awardId=:awardId` | SUSPENSION_PROPOSE | — | bn_award_suspension | awardSuspension | AWARD_NOT_SUSPENDED_OR_TERMINATED | unavailable | Disabled (dark-launched) |
| REVIEW_SUSPENSION | Mutation | DISABLED | `/bn/award-suspension?awardId=:awardId` | SUSPENSION_APPROVE | — | bn_award_suspension | awardSuspension | ALWAYS | unavailable | Disabled (dark-launched) |
| PROPOSE_RESUMPTION | Mutation | DISABLED | `/bn/award-suspension?awardId=:awardId` | SUSPENSION_RESUME_PROPOSE | — | bn_award_suspension | awardSuspension | AWARD_SUSPENDED | unavailable | Disabled (dark-launched) |
| CONFIGURE_RECOVERY_PLAN | Mutation | DISABLED | `/bn/overpayments?awardId=:awardId` | OVERPAYMENT_CONFIGURE_RECOVERY | — | bn_overpayments | overpayment | OVERPAYMENT_ACTIVE | unavailable | Disabled (dark-launched) |
| REQUEST_OVERPAYMENT_WAIVER | Mutation | DISABLED | `/bn/overpayments?awardId=:awardId` | OVERPAYMENT_REQUEST_WAIVER | — | bn_overpayments | overpayment | OVERPAYMENT_ACTIVE | unavailable | Disabled (dark-launched) |
| SEND_AWARD_COMMUNICATION | Mutation | DISABLED | `/admin/communication-hub` | COMMUNICATION_SEND | — | communication_hub_dispatch_register | — | ALWAYS | unavailable | Disabled (dark-launched) |
| RETRY_COMMUNICATION | Mutation | DISABLED | `/admin/communication-hub/retry-queue` | COMMUNICATION_RETRY | — | communication_hub_retry_queue | — | COMMUNICATION_FAILED | unavailable | Disabled (dark-launched) |

## Business eligibility summary

- **OPEN_PERSON_360** — Requires a canonical personId when opened from a beneficiary row.
- **OPEN_CLAIM** — Navigation always allowed; deep-links to /bn/claims/:claimId when linked, otherwise falls back to /bn/claims worklist.
- **OPEN_PRODUCT** — Always eligible while award is loaded.
- **OPEN_PAYMENT_PROFILE** — Disabled from a beneficiary row until canonical beneficiary→payment-profile link exists.
- **OPEN_SURVIVORS_WORKSPACE** — Always eligible.
- **ADD_BENEFICIARY** — Blocked when pensioner is deceased.
- **AMEND_BENEFICIARY** — Requires a selected beneficiary that is not ENDED/INACTIVE/TERMINATED.
- **END_BENEFICIARY** — Requires a selected beneficiary that is not already ended.
- **OPEN_PAYMENT_SCHEDULE** — Always eligible.
- **OPEN_PAYMENT_INSTRUCTION** — Always eligible.
- **OPEN_PAYMENT_BATCH** — Always eligible.
- **OPEN_PAYMENT_EXCEPTION** — Always eligible.
- **CANCEL_PAYMENT** — Row-level cancel gates enforced by the specialist workspace.
- **REISSUE_PAYMENT** — Row-level reissue gates enforced by the specialist workspace.
- **VERIFY_LIFE_CERTIFICATE** — Row-level verification gates enforced by the LC workspace.
- **RECORD_LIFE_CERTIFICATE_RECEIPT** — Row-level receipt gates enforced by the LC workspace.
- **SEND_LIFE_CERTIFICATE_REMINDER** — Row-level reminder gates enforced by the LC workspace.
- **SCHEDULE_MEDICAL_REVIEW** — Row-level scheduling gates enforced by the Medical workspace.
- **RECORD_MEDICAL_OUTCOME** — Row-level outcome gates enforced by the Medical workspace.
- **REFER_MEDICAL_BOARD** — Row-level referral gates enforced by the Medical workspace.
- **OPEN_MEDICAL_REVIEW_WORKSPACE** — Always eligible.
- **PROPOSE_SUSPENSION** — Blocked when award status is SUSPENDED or TERMINATED.
- **REVIEW_SUSPENSION** — Row-level approval gates enforced by the Suspension workspace.
- **PROPOSE_RESUMPTION** — Requires award status = SUSPENDED.
- **OPEN_OVERPAYMENT** — Always eligible when award has any overpayment.
- **CONFIGURE_RECOVERY_PLAN** — Requires outstanding > 0 and non-terminal recovery status.
- **REQUEST_OVERPAYMENT_WAIVER** — Requires outstanding > 0 and non-terminal recovery status.
- **OPEN_COMMUNICATION_HUB** — Always eligible.
- **OPEN_COMMUNICATION_DELIVERY_MONITOR** — Always eligible.
- **OPEN_COMMUNICATION_RETRY_QUEUE** — Always eligible.
- **SEND_AWARD_COMMUNICATION** — Row-level send gates enforced by the Comm Hub façade.
- **RETRY_COMMUNICATION** — Requires communication status in FAILED/RETRY/RETRYING/PENDING_RETRY/ERROR.
- **EXPORT_AUDIT** — Always eligible; navigation-only surface for audit export.

## Cross-module handoffs

- **Claim workbench:** deep-link only, no state pushed.
- **Person 360:** disabled entirely (`canonicalPersonId=null`) when PERSON_360_VIEW absent.
- **Comm Hub:** all sends route through `sendCommunication(...)`; Award 360 never enqueues directly.
- **Legal referral:** surfaced as a read-only chip on the Claim tab.
- **Workflow:** `core_workflow_task` visited only when a suspension carries `workflow_instance_id`.

## Fail-closed rules

- Missing capability registration → action disabled (Admin does not bypass).
- Missing action registration → disabled.
- Missing owning module row → disabled.
- `moduleEnabled=false` / `routesEnabled=false` → navigation disabled.
- `actions_enabled=false` → mutations disabled but read-only navigation preserved.
- `serverCommandAvailable=false` → mutation stays DISABLED even when all gates pass.

