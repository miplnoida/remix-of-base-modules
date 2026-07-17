# Award 360 — Action Matrix

All operational buttons and links surface through `useAward360Actions`. Each action resolves to:
- `visible` — capability + feature-flag allow rendering
- `enabled` — visible AND business rule permits (e.g. award active, claim exists)
- `href` (nav actions) OR `disabledReason` (mutation stubs blocked in this wave)

## Navigation actions (NAV_ONLY)

| Action | Route | Gate |
|--------|-------|------|
| OPEN_PENSIONER_360             | `/bn/pensioners/:ssn`                        | PENSIONER_VIEW + PERSON_360_VIEW (nulled otherwise) |
| OPEN_CLAIM_WORKBENCH           | `/bn/claims/:claimId`                        | CLAIM_VIEW |
| OPEN_PRODUCT_VERSION           | `/bn/products/versions/:id`                  | PRODUCT_CONFIGURATION_VIEW |
| OPEN_SURVIVORS_WORKSPACE       | `/bn/awards/:id/survivors`                   | AWARD_VIEW |
| OPEN_MEDICAL_REVIEW_WORKSPACE  | `/bn/awards/:id/medical`                     | MEDICAL_REVIEW_VIEW |
| OPEN_OVERPAYMENT               | `/bn/overpayments/:id`                       | OVERPAYMENT_VIEW |
| OPEN_COMMUNICATION_HUB         | `/comm-hub/…`                                | COMMUNICATION_METADATA_VIEW |
| OPEN_COMMUNICATION_DELIVERY_MONITOR | `/comm-hub/monitor?scope=award&id=:id`  | COMMUNICATION_METADATA_VIEW |
| OPEN_COMMUNICATION_RETRY_QUEUE | `/comm-hub/retry?scope=award&id=:id`         | COMMUNICATION_METADATA_VIEW |
| EXPORT_AUDIT                   | client-side CSV                              | AWARD_VIEW |

## Mutation actions (disabled — future waves)

| Action | Status | Reason |
|--------|--------|--------|
| ADD_BENEFICIARY                | disabled | Beneficiaries mutation wave not started. |
| SCHEDULE_MEDICAL_REVIEW        | disabled | Medical mutation wave not started. |
| RECORD_MEDICAL_OUTCOME         | disabled | Medical mutation wave not started. |
| REFER_MEDICAL_BOARD            | disabled | Medical mutation wave not started. |
| CONFIGURE_RECOVERY_PLAN        | disabled | Overpayment recovery wave not started. |
| REQUEST_OVERPAYMENT_WAIVER     | disabled | Overpayment recovery wave not started. |
| SEND_AWARD_COMMUNICATION       | disabled | Routed via Comm Hub façade only. |

## Cross-module handoffs

- **Claim workbench:** deep-link only, no state pushed.
- **Person 360:** disabled entirely (`canonicalPersonId=null`) when PERSON_360_VIEW absent — prevents SSN leakage in deep-view payloads.
- **Comm Hub:** all sends route through `sendCommunication({moduleCode, eventCode, ...})`; Award 360 never enqueues directly.
- **Legal referral:** `bn_claim.lg_referral_id` surfaces as a read-only chip on Claim tab; navigation deferred until Legal integration wave.
- **Workflow:** `core_workflow_task` visited only when suspension has `workflow_instance_id`; skipped otherwise.

## Availability signals

Every action carries a `reason` string used by:
- Tooltip on disabled buttons.
- `?diag=1` admin panel to explain why an action is hidden.
- `action-capability-integration` test suite to prevent silent regressions.
