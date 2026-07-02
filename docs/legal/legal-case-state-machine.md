# Legal Case State Machine

Central authority for the lifecycle of a Legal Case (`lg_case`).
Every code path that changes `lg_case.status_code` **or** `lg_case.current_stage_code` MUST go through
[`src/services/legal/legalCaseStateMachine.ts`](../../src/services/legal/legalCaseStateMachine.ts).

## States

| Code | Meaning | Terminal |
|---|---|---|
| `NEW` | Referral / lead just created, not yet touched by Legal | no |
| `INTAKE` | Legal is doing intake review | no |
| `ACCEPTED` | Referral accepted, case not yet opened | no |
| `CASE_OPEN` | Case file opened, awaiting substantive work | no |
| `UNDER_REVIEW` | Officer preparing/analysing evidence | no |
| `NOTICE_SENT` | Statutory notice / demand issued to party | no |
| `HEARING_SCHEDULED` | Court/tribunal hearing on calendar | no |
| `JUDGMENT_OBTAINED` | Court order / judgment recorded | no |
| `ENFORCEMENT` | Executing judgment (garnishment, levy, etc.) | no |
| `PAYMENT_ARRANGEMENT` | Active payment plan governs recovery | no |
| `SETTLED` | Matter fully settled | **yes** |
| `CLOSED` | Administratively closed | **yes** |
| `REJECTED` | Refused at intake / not taken up | **yes** |

## Allowed transitions

```
NEW                 → INTAKE, REJECTED
INTAKE              → ACCEPTED, REJECTED
ACCEPTED            → CASE_OPEN, REJECTED
CASE_OPEN           → UNDER_REVIEW, NOTICE_SENT, CLOSED
UNDER_REVIEW        → NOTICE_SENT, HEARING_SCHEDULED, SETTLED, CLOSED
NOTICE_SENT         → UNDER_REVIEW, HEARING_SCHEDULED, PAYMENT_ARRANGEMENT, SETTLED, CLOSED
HEARING_SCHEDULED   → JUDGMENT_OBTAINED, SETTLED, CLOSED
JUDGMENT_OBTAINED   → ENFORCEMENT, PAYMENT_ARRANGEMENT, SETTLED, CLOSED
ENFORCEMENT         → PAYMENT_ARRANGEMENT, SETTLED, CLOSED
PAYMENT_ARRANGEMENT → ENFORCEMENT (breach), SETTLED, CLOSED
SETTLED             → CLOSED
CLOSED              → ∅  (terminal)
REJECTED            → ∅  (terminal)
```

Any transition **not** in the table above is rejected with
`code: "INVALID_TRANSITION"` and a message listing the legal next states.

## Capability gating

Each transition also declares the `LegalCapability` flag the caller must hold
(see `useLegalCapability`):

| Transition kind | Required capability |
|---|---|
| Intake accept | `canAcceptReferral` |
| Draft/send notice | `canDraftLetter` |
| Schedule hearing | `canCreateHearing` |
| Close / settle / reject | `canApproveClosure` |
| Other lifecycle moves | `ANY_ACTOR` (any non–read-only Legal role) |

Read-only Legal users (`isReadOnly === true`) are always blocked.

## API

```ts
import {
  canTransitionLegalCase,        // non-throwing check (UI)
  assertLegalCaseTransition,     // throwing check (mutations)
  allowedNextLegalCaseStates,    // dropdown builder
  isTerminalLegalCaseState,
} from "@/services/legal/legalCaseStateMachine";

// UI — enable/disable a button
const { allowed, reason } = canTransitionLegalCase(
  caseRow.status_code, "HEARING_SCHEDULED", legalCapability,
);

// Mutation — throws with a clear message if invalid
assertLegalCaseTransition(caseRow.status_code, next, legalCapability);
```

`canTransitionLegalCase` returns `{ allowed, reason, code }` where `code`
is one of `TERMINAL | UNKNOWN_FROM | UNKNOWN_TO | NO_OP | INVALID_TRANSITION
| PERMISSION_DENIED`.

## Where it is enforced

| Call site | File |
|---|---|
| Stage/status change from Case Detail | `src/pages/legal/LgCaseDetail.tsx` — `stageChange` mutation |
| Close Case action from Case Detail | `src/pages/legal/LgCaseDetail.tsx` — `closeCase` mutation |
| Edit Case form save | `src/pages/legal/LgCaseEdit.tsx` — `handleSave` |

**Rule:** any new mutation that writes `status_code` or `current_stage_code`
must call `assertLegalCaseTransition` (server-side write) or
`canTransitionLegalCase` (UI gate) before hitting Supabase. Reviewers must
reject PRs that bypass the helper.

## Legacy / unknown statuses

If `from` is not one of the codes above (legacy imports), the helper allows
the write for `ANY_ACTOR` users, treating it as a one-time upgrade to the
canonical state set. Read-only users are still blocked.

## Terminal handling

`SETTLED`, `CLOSED`, and `REJECTED` are terminal. Any further transition
returns `code: "TERMINAL"` with the message *"Case is in terminal state X.
Reopen it before changing status."* A future Reopen action must first move
the case back to `CASE_OPEN` via an admin path that resets the terminal
flag; it is intentionally not part of this table.
