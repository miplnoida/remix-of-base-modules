# BN-AP-00 — Appeals command × state transition matrix

Reconciliation of the appeal state machine (`src/types/bn/appeals/appealStateMachine.ts`)
against the canonical command catalogue (`src/types/bn/appeals/appealCommands.ts`).
Only `BN_APPEAL_SUBMIT_CLAIMANT` is executable end-to-end in AP-00. Every
other command is registered so the capability grants, audit inventory and
UI action panel remain in lock-step with the state machine from day one.
Handlers are delivered in AP-01+ as noted.

## Canonical states

`DRAFT`, `SUBMITTED`, `ACKNOWLEDGED`, `ADMISSIBILITY_REVIEW`, `INADMISSIBLE`,
`UNDER_REVIEW`, `HEARING_SCHEDULED`, `HEARING_HELD`, `RECOMMENDATION_ISSUED`,
`DECIDED_UPHELD`, `DECIDED_OVERTURNED`, `DECIDED_PARTIAL`, `IMPLEMENTED`,
`WITHDRAWN`, `REFERRED_LEGAL`, `CLOSED`.

## Command → transition matrix

| Command | From | To | Capability | Maker/Checker | Ownership | AP-00 |
|---|---|---|---|---|---|---|
| BN_APPEAL_SUBMIT_CLAIMANT | `-` (create) | `SUBMITTED` | `bn_appeals:claimant_submit` | – | Yes (SSN) | **executable** |
| BN_APPEAL_REGISTER_STAFF | `-` (create) | `SUBMITTED` | `bn_appeals:write` | – | – | AP-01 |
| BN_APPEAL_ACKNOWLEDGE | `SUBMITTED` | `ACKNOWLEDGED` | `bn_appeals:write` | – | – | AP-01 |
| BN_APPEAL_REVIEW_ADMISSIBILITY | `ACKNOWLEDGED` | `ADMISSIBILITY_REVIEW` → `UNDER_REVIEW` or `INADMISSIBLE` | `bn_appeals:admissibility_review` | – | – | AP-01 |
| BN_APPEAL_ASSIGN | `ACKNOWLEDGED`, `ADMISSIBILITY_REVIEW`, `UNDER_REVIEW` | (no state change; assignment side-effect) | `bn_appeals:assign` | – | – | AP-01 |
| BN_APPEAL_ATTACH_EVIDENCE | any pre-decision | (no state change) | `bn_appeals:write` | – | – | AP-01 |
| BN_APPEAL_SCHEDULE_HEARING | `UNDER_REVIEW` | `HEARING_SCHEDULED` | `bn_appeals:write` | – | – | AP-01 |
| BN_APPEAL_RECORD_HEARING_OUTCOME | `HEARING_SCHEDULED` | `HEARING_HELD` | `bn_appeals:write` | – | – | AP-01 |
| BN_APPEAL_RECOMMEND_OUTCOME | `UNDER_REVIEW`, `HEARING_HELD` | `RECOMMENDATION_ISSUED` | `bn_appeals:recommend` | Yes | – | AP-01 |
| BN_APPEAL_DECIDE | `RECOMMENDATION_ISSUED`, `HEARING_HELD` | `DECIDED_UPHELD` / `DECIDED_OVERTURNED` / `DECIDED_PARTIAL` | `bn_appeals:decide` | Yes | – | AP-01 |
| BN_APPEAL_IMPLEMENT | `DECIDED_OVERTURNED`, `DECIDED_PARTIAL` | `IMPLEMENTED` | `bn_appeals:implement` | – | – | AP-01 |
| BN_APPEAL_WITHDRAW | `SUBMITTED`, `ACKNOWLEDGED`, `UNDER_REVIEW` | `WITHDRAWN` | `bn_appeals:claimant_submit` | – | Yes | AP-01 |
| BN_APPEAL_REFER_LEGAL | `DECIDED_UPHELD`, `INADMISSIBLE` | `REFERRED_LEGAL` | `bn_appeals:refer_legal` | – | – | AP-01 |
| BN_APPEAL_CLOSE | `IMPLEMENTED`, `WITHDRAWN`, `INADMISSIBLE`, `REFERRED_LEGAL`, `DECIDED_UPHELD` | `CLOSED` | `bn_appeals:decide` | – | – | AP-01 |
| BN_APPEAL_REOPEN | `CLOSED`, `WITHDRAWN` | `UNDER_REVIEW` | `bn_appeals:admin` | Yes | – | AP-01 |

## Hand-offs to other modules

| Hand-off | Trigger command | Target |
|---|---|---|
| Award adjustment when appeal overturned | `BN_APPEAL_IMPLEMENT` | Award servicing (BN Award 360 payment profile / rate history) |
| Legal proceedings | `BN_APPEAL_REFER_LEGAL` | Legal module — `lg_case_intake` via routing rules |
| Communication to appellant | any status change | Communication Hub `sendCommunication({ moduleCode: 'bn_appeals', eventCode: '<STATUS>' })` |
| Evidence upload | `BN_APPEAL_ATTACH_EVIDENCE` | Document Management System via `core_generated_document` / DMS provider |
| Overpayment linkage | Any decision on `bn_overpayment_id`-anchored appeal | Overpayments module |

## Notes

- Withdrawal by the claimant is subject to ownership check (same SSN linkage
  used by submit).
- Reopen after close is admin-only and always maker/checker.
- Every command writes at least one `bn_appeal_event` row — the log is now
  append-only in the database (`bn_appeal_event_append_only` trigger).
- Physical delete of `bn_appeal` is forbidden. Closure is the terminal state.
