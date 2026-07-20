# BN Mortality — Command × State Transition Matrix

Canonical mapping between mortality commands, permitted "from" states,
resulting "to" state, and required capability. Enforced by
`src/types/bn/mortality/mortalityStateMachine.ts`, the
`benefitsCommandPipeline`, and — post-cutover — by a `CHECK (status IN (...))`
constraint in SQL Server.

## State codes

`DRAFT`, `REPORTED`, `PENDING_VERIFICATION`, `HOLD`, `VERIFIED`,
`DISPUTED`, `REJECTED`, `IMPACT_PREPARED`, `IMPACT_SUBMITTED`,
`IMPACT_RETURNED`, `IMPACT_APPROVED`, `AWARDS_HELD`,
`AWARDS_TERMINATED`, `SURVIVOR_ASSESSMENT`, `FUNERAL_OPPORTUNITY`,
`ESTATE_REFERRAL`, `REVERSED`, `CANCELLED`, `CLOSED`.

Terminal: `CLOSED`, `CANCELLED`, `REVERSED`.

## Command matrix

| Command | From | To | Capability | Maker-Checker |
| --- | --- | --- | --- | --- |
| `BN_MORTALITY_DRAFT_SAVE` | `∅` / `DRAFT` | `DRAFT` | `bn_mortality:write` | No |
| `BN_MORTALITY_REGISTER_REPORT` | `∅` / `DRAFT` | `REPORTED` | `bn_mortality:write` | No |
| `BN_MORTALITY_CANCEL` | `DRAFT` / `REPORTED` | `CANCELLED` | `bn_mortality:write` | No |
| `BN_MORTALITY_MATCH_PERSON` | `REPORTED` / `PENDING_VERIFICATION` | (same) | `bn_mortality:write` | No |
| `BN_MORTALITY_MARK_DUPLICATE` | `REPORTED` / `PENDING_VERIFICATION` | `CLOSED` | `bn_mortality:write` | No |
| `BN_MORTALITY_ASSIGN` | any non-terminal | (same) | `bn_mortality:write` | No |
| `BN_MORTALITY_ATTACH_EVIDENCE` | any non-terminal | (same) | `bn_mortality:write` | No |
| `BN_MORTALITY_SUBMIT_FOR_VERIFICATION` | `REPORTED` | `PENDING_VERIFICATION` | `bn_mortality:write` | No |
| `BN_MORTALITY_PLACE_PROVISIONAL_HOLD` | `PENDING_VERIFICATION` | `HOLD` | `bn_mortality:decide` | No |
| `BN_MORTALITY_RELEASE_HOLD` | `HOLD` | `PENDING_VERIFICATION` | `bn_mortality:decide` | No |
| `BN_MORTALITY_RECORD_CONFLICT` | `PENDING_VERIFICATION` / `HOLD` | `DISPUTED` | `bn_mortality:write` | No |
| `BN_MORTALITY_RESOLVE_CONFLICT` | `DISPUTED` | `PENDING_VERIFICATION` | `bn_mortality:decide` | No |
| `BN_MORTALITY_CONFIRM_VERIFICATION` | `PENDING_VERIFICATION` / `HOLD` / `DISPUTED` | `VERIFIED` | `bn_mortality:verify` | Yes |
| `BN_MORTALITY_REJECT_REPORT` | `PENDING_VERIFICATION` / `HOLD` / `DISPUTED` | `REJECTED` | `bn_mortality:decide` | Yes |
| `BN_MORTALITY_PREPARE_IMPACT` | `VERIFIED` | `IMPACT_PREPARED` | `bn_mortality:write` | No |
| `BN_MORTALITY_SUBMIT_IMPACT` | `IMPACT_PREPARED` / `IMPACT_RETURNED` | `IMPACT_SUBMITTED` | `bn_mortality:write` | No |
| `BN_MORTALITY_RETURN_IMPACT` | `IMPACT_SUBMITTED` | `IMPACT_RETURNED` | `bn_mortality:decide` | No |
| `BN_MORTALITY_APPROVE_IMPACT` | `IMPACT_SUBMITTED` | `IMPACT_APPROVED` | `bn_mortality:approve_impact` | Yes |
| `BN_MORTALITY_TERMINATE_AWARD` | `IMPACT_APPROVED` | `AWARDS_TERMINATED` | `bn_mortality:decide` | Yes |
| `BN_MORTALITY_CREATE_PAD_OVERPAYMENT` | `AWARDS_TERMINATED` | (same) | `bn_mortality:decide` | Yes |
| `BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT` | `AWARDS_TERMINATED` | `SURVIVOR_ASSESSMENT` | `bn_mortality:write` | No |
| `BN_MORTALITY_INITIATE_FUNERAL_GRANT` | `AWARDS_TERMINATED` / `SURVIVOR_ASSESSMENT` | `FUNERAL_OPPORTUNITY` | `bn_mortality:write` | No |
| `BN_MORTALITY_COMPLETE_FOLLOWON` | `SURVIVOR_ASSESSMENT` / `FUNERAL_OPPORTUNITY` / `ESTATE_REFERRAL` | `CLOSED` | `bn_mortality:decide` | No |
| `BN_MORTALITY_REFER_LEGAL` | `AWARDS_TERMINATED` / `ESTATE_REFERRAL` / `SURVIVOR_ASSESSMENT` | `ESTATE_REFERRAL` | `bn_mortality:decide` | Yes |
| `BN_MORTALITY_REVERSE_CONFIRMATION` | `VERIFIED` / `IMPACT_PREPARED` / `IMPACT_APPROVED` | `REVERSED` | `bn_mortality:reverse` | Yes |
| `BN_MORTALITY_CLOSE_EVENT` | `REJECTED` / `CANCELLED` / `AWARDS_TERMINATED` / `SURVIVOR_ASSESSMENT` / `FUNERAL_OPPORTUNITY` / `ESTATE_REFERRAL` | `CLOSED` | `bn_mortality:decide` | No |

## Invariants

- `AWARDS_TERMINATED` is only reachable from `IMPACT_APPROVED`.
- `IMPACT_APPROVED` is only reachable from `IMPACT_SUBMITTED`.
- `CANCELLED` is only reachable from `DRAFT` or `REPORTED` (never after
  verification).
- `REVERSED` is only reachable from a confirmed state
  (`VERIFIED` / `IMPACT_PREPARED` / `IMPACT_APPROVED`) and requires the
  `bn_mortality:reverse` capability plus maker/checker.
- Terminal states (`CLOSED`, `CANCELLED`, `REVERSED`) refuse all further
  commands with `STATE_TERMINAL`.
- Every transition writes an immutable row to `bn_mortality_event_history`.
