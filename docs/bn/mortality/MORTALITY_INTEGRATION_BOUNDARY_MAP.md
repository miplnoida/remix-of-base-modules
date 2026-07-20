# BN Mortality — Integration Boundary Map (BN-MORT-2B.2 §1)

Purpose: authoritative catalogue of the cross-module server contracts that
Mortality's 12 currently-blocked commands must call. Each entry records the
canonical owner, existing callable surface, input/output shape, transaction /
idempotency behaviour, and whether it is reusable as-is or requires a small
additive server contract owned by the target module (never a Mortality-local
duplicate).

Status legend:
- **REUSE** — existing boundary is sufficient; Mortality calls it directly.
- **EXTEND** — existing boundary exists but must be widened by the *owning*
  module (not by Mortality) to accept a canonical mortality-source event.
- **CREATE** — no callable server boundary today; the owning module must
  publish one before Mortality can invoke it.

All new boundaries added by this epic MUST be added to the owning module's
`services/*` folder and its server surface (RPC or edge function). Mortality
adapters live under `src/services/bn/mortality/adapters/` and only translate
between the canonical mortality envelope and the target module's contract.

---

## 1. Award servicing — hold / release / terminate

| Aspect | Value |
| --- | --- |
| Owner module | `bn_awards` |
| Existing surface | `src/services/bn/awardServicingService.ts` (client-side, direct table writes into `bn_award_suspension_event` and `bn_award_status_event`) |
| Server contract today | None. Writes happen from the browser under the current permissive schema. |
| Target tables | `bn_award`, `bn_award_status_event`, `bn_award_suspension_event`, `bn_payment_schedule`, `bn_payment_instruction` |
| Transaction behaviour | Multi-row updates are not atomic today. |
| Idempotency | None. Duplicate calls create duplicate suspension events unless the partial-unique index on `(bn_award_id) WHERE status IN ('PROPOSED','APPROVED')` blocks them. |
| Decision | **CREATE** — owning module must publish RPC `bn_awards_apply_servicing_event` (SECURITY DEFINER) accepting `{ award_id, action ('HOLD'|'RELEASE'|'TERMINATE'), effective_date, source_module, source_event_id, correlation_id, idempotency_key, actor_user_id }` and returning the created suspension/status event ids. Same RPC handles: append status event, upsert suspension row, cancel future `bn_payment_schedule` rows, void unsent `bn_payment_instruction` rows, preserve history. Idempotency by `(source_module, source_event_id, action)`. |
| Consumed by mortality commands | `PLACE_PROVISIONAL_HOLD`, `RELEASE_HOLD`, `TERMINATE_AWARD` |

The existing partial unique index `ux_bn_award_suspension_open_case` is the
correctness guarantee we build on: only one open suspension per award. The new
RPC MUST honour it.

---

## 2. Award / claim / beneficiary discovery for PREPARE_IMPACT

| Aspect | Value |
| --- | --- |
| Owner module | `bn_awards` (read-side) |
| Existing surface | `bn-benefits-query` edge function has `BN_MORTALITY_GET_AFFECTED_AWARDS` which joins `bn_award` → `bn_claim.ssn` and beneficiary linkages. |
| Gaps | Query returns *candidates* only; it does not classify each award by required action (`HOLD` / `TERMINATE` / `PRORATE`), does not compute future-payment exposure from `bn_payment_schedule` / `bn_payment_instruction`, and does not persist anything. |
| Decision | **EXTEND** the RPC layer — add server function `bn_mortality_prepare_impact(p_event_id uuid, ...)` (SECURITY DEFINER) invoked by `bn_mortality_execute_command` when the command is `BN_MORTALITY_PREPARE_IMPACT`. Function scans awards, classifies each, upserts one row per `(event_id, bn_award_id)` into `bn_mortality_award_impact`, preserves `APPROVED` rows unless recalculation is authorised, and returns the summary block used by the response DTO. |
| Consumed by | `PREPARE_IMPACT` |

The existing partial unique index
`ux_bn_mortality_award_impact_event_award` guarantees the "exactly one impact
row per event/award" invariant.

---

## 3. Overpayment (PAD liability)

| Aspect | Value |
| --- | --- |
| Owner module | `bn_overpayments` |
| Existing table | `bn_overpayment` (16 columns, `bn_award_id` FK exists) |
| Existing service | `src/services/bn/overpayments/overpaymentOutstandingCalculator.ts` — read-only outstanding-balance calculator. **No** creation service, **no** server RPC. |
| Finance handoff | `src/services/bn/finance/overpaymentFinanceContract.ts` — outgoing-only contract, does not create the liability. |
| Decision | **CREATE** — owning module publishes `bn_overpayments_create_liability` RPC (SECURITY DEFINER) accepting `{ award_id, person_id, cause_code, source_module, source_event_id, source_award_impact_id, period_from, period_to, gross_minor, adjustments_minor, currency, correlation_id, idempotency_key, actor_user_id, payment_breakdown_json }`. Idempotency: unique `(source_module, source_event_id, bn_award_id, cause_code)`. Must exclude payments already linked to any prior liability for the same award (server-computed, not client-supplied). |
| Consumed by | `CREATE_PAD_OVERPAYMENT` |

The RPC MUST NOT accept a client-supplied liability amount as authoritative.
It computes the amount from `bn_payment_instruction` rows where
`paid_at > verified_death_date` AND `status='COMPLETED'` AND not already
linked.

---

## 4. DMS evidence linking

| Aspect | Value |
| --- | --- |
| Owner module | `core_dms` |
| Existing surface | `src/services/core/coreDmsService.ts`, edge functions `core-dms-upload`, `dms-transfer`, `dms-transfer-single`, `dms-transfer-retry`. `core_dms_document_type`, `core_dms_module_mapping`, `core_dms_provider`. |
| Linkage table | Modules link via `core_generated_document` or module-local link tables. Mortality has none today. |
| Decision | **CREATE** a Mortality-specific link table `bn_mortality_evidence_link` (id, event_id, dms_document_id, document_type, title, source, verification_status, linked_by, linked_at, correlation_id, UNIQUE(event_id, dms_document_id)) plus RPC `bn_mortality_attach_evidence(...)`. The authoritative document remains in DMS; this table stores only the link + non-authoritative metadata. `BN_MORTALITY_GET_EVIDENCE_LINKS` reads this table joined to `core_dms_*`. |
| Consumed by | `ATTACH_EVIDENCE` |

---

## 5. Survivor benefit intake

| Aspect | Value |
| --- | --- |
| Owner module | `bn_claims` (canonical intake path) |
| Existing surface | `src/services/bn/claimService.ts`, `awardCreationService.ts`, workflow via `bn_workflow_template` + `core_workflow_instance`. Survivor is treated as a Claim of survivor product type; there is no separate `bn_survivor_*` intake table. |
| Decision | **EXTEND** claim intake — expose RPC `bn_claims_create_intake_from_mortality(p_event_id, p_product_code IN ('SURVIVOR','FUNERAL_GRANT'), p_deceased_person_id, ...)` that creates the `bn_claim` row, kicks off exactly one workflow instance, and returns `{ claim_id, claim_reference, workflow_instance_id, route }`. Idempotency by `(source_event_id, product_code)` unique. Never create a second `person`. |
| Consumed by | `INITIATE_SURVIVOR_ASSESSMENT`, `INITIATE_FUNERAL_GRANT` |

Storage on the mortality side: `bn_mortality_referral` already has the fields
needed to record `target_entity_id`, `reference`, `route`,
`workflow_instance_id` per Mortality-event referral.

---

## 6. Legal / Estate referral

| Aspect | Value |
| --- | --- |
| Owner module | `legal` (Social Security Legal Department) |
| Existing surface | `lg_case_intake` (63 columns), `lg_case_intake_source` catalog, `legal_referral` (25 cols), service `src/services/legal/benefitsForwardingService.ts`. `bn_legal_referral` (36 cols) is the *outbound-from-Benefits* record. |
| Decision | **REUSE with contract** — `benefitsForwardingService` already models the Benefits → Legal handoff. Add server RPC `legal_intake_create_from_benefits` (SECURITY DEFINER) that accepts `{ source_module, source_event_id, purpose IN ('LEGAL','ESTATE'), deceased_person_id, award_ids[], overpayment_ids[], financial_exposure_minor, evidence_dms_ids[], originating_officer, correlation_id, idempotency_key }`. Returns `{ lg_case_intake_id, reference, route, workflow_instance_id }`. Idempotency: unique `(source_module, source_event_id, purpose)`. Mortality persists the returned ids on `bn_legal_referral` (already has `case_id`, `intake_id`-shaped columns). |
| Consumed by | `REFER_LEGAL` |

Distinct purposes `LEGAL` and `ESTATE` must produce distinct
`bn_legal_referral` rows for the same event.

---

## 7. Workflow (single creation path)

| Aspect | Value |
| --- | --- |
| Owner module | `core_workflow` |
| Existing surface | `bn_workflow_template` + `core_workflow_instance` + `core_workflow_task`. `bnWorkflowRuntimeService.ts` is the canonical starter. |
| Decision | **REUSE** — every intake RPC above (`bn_claims_create_intake_from_mortality`, `legal_intake_create_from_benefits`, `bn_awards_apply_servicing_event`) MUST call the single core workflow-instance creator inside its transaction. Neither the RPC nor a wrapping service may independently create workflow instances. Tests assert exactly one workflow instance per intake. |

---

## 8. Communication Hub

| Aspect | Value |
| --- | --- |
| Owner module | `communication_hub` |
| Existing surface | `communication_request` + `comm-hub-enqueue` edge function (per project custom instructions — modules never call `notification_queue` directly). |
| Decision | **REUSE** — Mortality follow-on completion gate checks `communication_request` for the required `moduleCode='bn_mortality'` events (e.g. `MORTALITY_TERMINATION_NOTICE`, `MORTALITY_SURVIVOR_INVITE`) with `status IN ('QUEUED','SENT','WAIVED')`. No new boundary. |
| Consumed by | `COMPLETE_FOLLOWON`, `CLOSE_EVENT` completion assessment |

---

## 9. Completion / closure assessment storage

| Aspect | Value |
| --- | --- |
| Owner module | `bn_mortality` (this epic) |
| Decision | **CREATE** internal — table `bn_mortality_completion_assessment (event_id PK, requirements_json, missing_requirements_json, assessed_at, assessed_by, gate ('FOLLOWON'|'CLOSURE'))` snapshot; immutable via trigger. |
| Consumed by | `COMPLETE_FOLLOWON`, `CLOSE_EVENT` |

---

## 10. Cross-cutting: failure & retry model

Every RPC above returns the canonical block:
```
{ status: 'PENDING'|'ACCEPTED'|'COMPLETED'|'FAILED',
  target_id, target_reference, target_route,
  failure_code, failure_message, correlation_id }
```
`failure_message` is sanitised (no stack traces, no PII beyond the deceased
person's canonical id). Mortality persists `status`, `target_*` and
`failure_*` onto the driving row (`bn_mortality_award_impact`,
`bn_mortality_referral`) so retry is safe and duplicate targets are
prevented.

---

## Implementation sequencing

The 12 blocked commands cannot all be shipped simultaneously without either
(a) inflating completion flags on unverified integrations, or (b) creating
Mortality-local duplicates that the epic explicitly forbids. The dependency
order forced by real data flow is:

1. **§2 PREPARE_IMPACT** — populates the `bn_mortality_award_impact` rows every
   other command reads. No new cross-module RPC needed; a new
   `bn_mortality_prepare_impact` helper called inside
   `bn_mortality_execute_command`.
2. **§3 HOLD / RELEASE / §4 TERMINATE** — depend on §1 RPC
   `bn_awards_apply_servicing_event` in the Award module.
3. **§5 PAD OVERPAYMENT** — depends on §3 RPC
   `bn_overpayments_create_liability` in the Overpayment module.
4. **§6 EVIDENCE** — new `bn_mortality_evidence_link` table + RPC.
5. **§7 SURVIVOR / FUNERAL** — depend on Claim-intake RPC in §5.
6. **§8 LEGAL / ESTATE** — depends on `legal_intake_create_from_benefits` RPC.
7. **§9 COMPLETE_FOLLOWON / §10 CLOSE_EVENT** — depend on all of the above
   producing truthful state on the driving rows.

Each slice ships: owning-module RPC, Mortality adapter, `bn_mortality_execute_command`
branch, DB-driven test set from §13, and honest `implemented=true` flip only
after the target-side row is verified in test.

Only after all slices land does `implemented=true` reach 26/26. Until then
each unshipped command MUST retain `implemented=false` with the precise
missing boundary named in `mortalityCommands.ts`.
