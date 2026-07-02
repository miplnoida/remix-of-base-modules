# Legal Referral State Machine

Source of truth: `src/services/legal/lgReferralStateMachine.ts`.
Enforced by: `src/services/legal/referralLifecycleService.ts`
(every mutation calls `assertTransition` before writing).

## States

| Code                 | Meaning                                                                 | Terminal |
| -------------------- | ----------------------------------------------------------------------- | :------: |
| `DRAFT`              | Source module is composing the referral packet.                         |          |
| `SUBMITTED_TO_LEGAL` | Referral has been dispatched to Legal; awaiting triage.                 |          |
| `RECEIVED_BY_LEGAL`  | Legal officer opened / acknowledged the referral.                       |          |
| `UNDER_LEGAL_REVIEW` | Assigned officer is assessing the merits before formal decision.        |          |
| `INFO_REQUESTED`     | Legal has requested additional information from source module.          |          |
| `INFO_RESPONDED`     | Source module returned the requested information; back with Legal.      |          |
| `ACCEPTED`           | Legal has accepted; Legal Case creation is the next expected action.    |          |
| `LEGAL_CASE_CREATED` | A `lg_case` row has been created from the referral.                     |          |
| `REJECTED`           | Legal declined; returned to source module with reason.                  |     ✔    |
| `CLOSED`             | Referral closed (obsolete, duplicate, resolved without case).           |     ✔    |

## Allowed transitions

```
DRAFT               → SUBMITTED_TO_LEGAL
SUBMITTED_TO_LEGAL  → RECEIVED_BY_LEGAL | INFO_REQUESTED | REJECTED
RECEIVED_BY_LEGAL   → UNDER_LEGAL_REVIEW | INFO_REQUESTED | ACCEPTED
                    | REJECTED | LEGAL_CASE_CREATED
INFO_REQUESTED      → INFO_RESPONDED | REJECTED | CLOSED
INFO_RESPONDED      → UNDER_LEGAL_REVIEW | ACCEPTED | REJECTED
                    | INFO_REQUESTED | LEGAL_CASE_CREATED
UNDER_LEGAL_REVIEW  → ACCEPTED | REJECTED | INFO_REQUESTED
                    | LEGAL_CASE_CREATED | CLOSED
ACCEPTED            → LEGAL_CASE_CREATED | CLOSED
LEGAL_CASE_CREATED  → CLOSED
REJECTED            → (terminal)
CLOSED              → (terminal)
```

## Actions → required capability

Enforced in `useReferralLifecycle` via `useLgAccess()`.

| Action                   | Capability                                       |
| ------------------------ | ------------------------------------------------ |
| `VIEW`                   | `canViewReferral`                                |
| `ACCEPT`                 | `canAcceptReferral`                              |
| `REJECT`                 | `canAcceptReferral`                              |
| `REQUEST_INFO`           | `canAcceptReferral`                              |
| `RECEIVE_INFO_RESPONSE`  | `canAcceptReferral`                              |
| `CREATE_INTAKE`          | `canAcceptReferral`                              |
| `CREATE_CASE`            | `canAcceptReferral`                              |
| `ASSIGN_OFFICER`         | `canAssignCase` or `canReassignCase`             |
| `REASSIGN`               | `canReassignCase`                                |
| `ESCALATE`               | `canApproveEscalation` or `canAcceptReferral`    |
| `CLOSE`                  | `canApproveClosure`                              |

## Audit

Every transition writes a row into `legal_referral_audit` with
`event_code`, `actor`, `notes`, and a metadata payload describing
`{ from, to }`. When the referral has been promoted to a case, the
event is mirrored into `lg_case_activity` via
`mirrorReferralEventToCase()` so both timelines stay in sync.
