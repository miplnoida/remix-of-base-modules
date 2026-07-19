# BN Appeals & Disputes — Module Contract

Status: **Foundation slice 1 delivered.** Claimant-submission path is
production-usable end-to-end; the remaining 14 lifecycle commands are
catalogued and gated for follow-up slices.

## Boundary

| Layer                    | Component                                                                         |
|--------------------------|-----------------------------------------------------------------------------------|
| Portal UI                | `src/portals/claimant/appeals/AppealsPage.tsx`                                    |
| React Query hook         | `src/hooks/bn/appeals/useSubmitClaimantAppeal.ts`, `useMyAppeals.ts`              |
| Client service           | `src/services/bn/gap/appeals/submitClaimantAppealService.ts`                      |
| **Server boundary**      | `supabase/functions/bn-appeals-claimant-submit/index.ts`                          |
| Atomic write             | RPC `public.bn_appeal_submit_claimant`                                            |
| Rollout gate             | `app_modules.name = 'bn_appeals'` (is_enabled ∧ actions_enabled)                  |
| Idempotency + audit      | `bn_gap_idempotency`, `bn_gap_command_log` (shared with gap pipeline)             |
| State machine            | `src/types/bn/gap/appeals/appealStateMachine.ts`                                  |
| Command catalogue        | `src/types/bn/gap/appeals/appealCommands.ts`                                      |

## Authorisation model

Claimant submissions bypass the RBAC `bn_appeals:*` capability check because
their authority derives from **ownership of the disputed decision**. Ownership
is proved by joining `external_user_person_link.ssn → bn_claim.ssn` inside the
`bn_appeal_submit_claimant` RPC. If no active linkage exists the RPC raises
`BN_APPEAL_CLAIM_NOT_OWNED`, which the edge function translates to a `DENIED`
result.

Staff-initiated appeal commands (register, acknowledge, decide, implement,
refer-to-legal) DO use `role_permissions` via the standard gap pipeline. The
capability verbs are registered in `module_actions` for `bn_appeals`:

```
read | write | decide | admin | claimant_submit | admissibility_review |
assign | recommend | implement | refer_legal
```

## State machine (summary)

```
DRAFT → SUBMITTED → ACKNOWLEDGED → ADMISSIBILITY_REVIEW → (ADMISSIBLE | INADMISSIBLE)
                                                        ↓
                        HEARING_SCHEDULED → HEARING_HELD → RECOMMENDED → DECIDED
                                                                       ↓
                                             IMPLEMENTATION_PENDING → IMPLEMENTED → CLOSED
```

Reverse transitions are never allowed. Withdrawal and legal referral are
first-class terminal branches from most states. See `appealStateMachine.ts`
for the canonical transition table.

## Data model

- `bn_appeal` — aggregate root. Owns lifecycle timestamps, deadlines, status,
  outcome, appellant reference, source-decision anchor (any of
  `bn_claim_id`, `bn_award_id`, `bn_overpayment_id`).
- `bn_appeal_ground` — enumerated grounds (0..n per appeal).
- `bn_appeal_decision_snapshot` — **immutable** capture of the original
  decision at appeal time. Unique per appeal. Never updated.
- `bn_appeal_evidence` — pointers to DMS document ids (bytes stay in DMS).
- `bn_appeal_event` — append-only lifecycle timeline.
- `bn_appeal_hearing_link` — optional pointer to a `lg_hearing` or external
  hearing record.

RLS remains **disabled** platform-wide per
`docs/ARCHITECTURE-NO-RLS-RULE.md`. Authorisation is enforced by the RPC
(ownership) and the edge function (JWT + rollout gate + envelope validation).

## Handoffs to other modules

| Trigger                          | Downstream module   | Mechanism (follow-up slice)                                    |
|----------------------------------|---------------------|----------------------------------------------------------------|
| Appeal `DECIDED = OVERTURNED_*`  | `bn_claim` / `bn_award` | `BN_APPEAL_IMPLEMENT` handler calls source-module RPCs         |
| Appeal `REFERRED_TO_LEGAL`       | Legal module        | Creates `lg_case_intake` row via existing legal boundary       |
| Appeal `SUBMITTED`               | Communication Hub   | `sendCommunication({moduleCode:'bn_appeals', eventCode:'APPEAL_ACKNOWLEDGE_REQUIRED'})` |
| Appeal `ACKNOWLEDGED`            | Communication Hub   | `APPEAL_ACKNOWLEDGED` — templated letter                        |
| Appeal `DECIDED`                 | Communication Hub   | `APPEAL_DECIDED` — templated outcome letter                     |
| Appeal `IMPLEMENTED`             | Overpayments        | If outcome creates a debt, forwards to `BN_OP_CREATE` handler   |

None of these dispatches happens inside handlers — they all publish to the
Communication Hub façade and other modules subscribe. This preserves the
"no direct cross-module inserts" rule.

## Idempotency

Every submission carries an `idempotencyKey`. Replays with the same key
return the original successful result. Two-phase safety: the RPC assigns
the appeal id + number under a serialised nextval; the idempotency row is
written AFTER the successful RPC so partial failures do not lock out the
retry.

## Delivered vs. pending

| Command                             | Status       |
|-------------------------------------|--------------|
| BN_APPEAL_SUBMIT_CLAIMANT           | ✅ delivered |
| BN_APPEAL_REGISTER_STAFF            | 🟡 catalogued |
| BN_APPEAL_ACKNOWLEDGE               | 🟡 catalogued |
| BN_APPEAL_REVIEW_ADMISSIBILITY      | 🟡 catalogued |
| BN_APPEAL_ASSIGN                    | 🟡 catalogued |
| BN_APPEAL_ATTACH_EVIDENCE           | 🟡 catalogued |
| BN_APPEAL_SCHEDULE_HEARING          | 🟡 catalogued |
| BN_APPEAL_RECORD_HEARING_OUTCOME    | 🟡 catalogued |
| BN_APPEAL_RECOMMEND_OUTCOME         | 🟡 catalogued |
| BN_APPEAL_DECIDE                    | 🟡 catalogued |
| BN_APPEAL_IMPLEMENT                 | 🟡 catalogued |
| BN_APPEAL_WITHDRAW                  | 🟡 catalogued |
| BN_APPEAL_REFER_LEGAL               | 🟡 catalogued |
| BN_APPEAL_CLOSE                     | 🟡 catalogued |
| BN_APPEAL_REOPEN                    | 🟡 catalogued |

## Defect corrected

`AppealsPage.tsx` previously performed a direct
`supabase.from('bn_claim_decision').insert({...})` for `APPEAL_REQUESTED`.
That is prohibited by the gap-modules architecture rule (enforced by
`src/__tests__/bn/gap-modules/architectureNoDirectMutation.test.ts`). It has
been replaced with the `useSubmitClaimantAppeal` hook, which routes through
the server boundary described above. The obsolete `bn_claim_decision`
`APPEAL_REQUESTED` rows are legacy data — no back-fill migration is
attempted (safe-migration rule).
