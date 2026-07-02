# Legal Hearing State Machine

Source of truth: `src/services/legal/lgHearingStateMachine.ts`.

## States

| State       | Meaning                                                    | Terminal |
| ----------- | ---------------------------------------------------------- | :------: |
| `SCHEDULED` | Hearing booked, awaiting the sitting                       |    No    |
| `ADJOURNED` | Sitting postponed; a follow-up hearing row is auto-created |    No    |
| `COMPLETED` | Outcome recorded with `outcome_code` and minutes           |   Yes    |
| `CANCELLED` | Hearing withdrawn before sitting                           |   Yes    |
| `NO_SHOW`   | Party failed to appear                                     |   Yes    |

## Allowed transitions

```
SCHEDULED → COMPLETED | ADJOURNED | CANCELLED | NO_SHOW
ADJOURNED → COMPLETED | CANCELLED | NO_SHOW
COMPLETED | CANCELLED | NO_SHOW  → (terminal)
```

## Capability mapping

| Target status | Required capability      | Roles                                |
| ------------- | ------------------------ | ------------------------------------ |
| `SCHEDULED`   | `scheduleHearing`        | Legal Admin, Legal Manager           |
| `COMPLETED`   | `recordHearingOutcome`   | Admin, Manager, assigned Officer     |
| `ADJOURNED`   | `rescheduleHearing`      | Admin, Manager                       |
| `CANCELLED`   | `cancelHearing`          | Admin, Manager                       |
| `NO_SHOW`     | `cancelHearing`          | Admin, Manager                       |

See `docs/legal/permission-matrix.md` for the full role → capability grid.

## Side effects on transition

- **SCHEDULED (create)** — fires `HEARING_SCHEDULED` fee event
  (`lgFeeEngineService.autoApplyForEvent`); mirrors an activity row to
  `lg_case_activity`.
- **COMPLETED with `next_hearing_date`** — auto-creates the follow-up
  `lg_hearing` row and a task on `lg_case_task`. Recorded as one activity
  chain (`HEARING_OUTCOME_RECORDED` + `HEARING_SCHEDULED`).
- **ADJOURNED** — a new `SCHEDULED` hearing row is created for the new
  date; the original row is closed as `ADJOURNED`.
- **CANCELLED / NO_SHOW** — activity logged; no follow-up row.

## Where to use

- `HearingOutcomeDialog` (create + record outcome) — enforces capability
  via `useLgAccess` before calling `createLgHearing` / `updateLgHearing`.
- `LgHearingCalendar` — reads capability to gate the "Add Hearing" and
  row-level edit/cancel actions.
- Any future bulk operations must call `assertHearingTransition(from, to)`
  before persisting.
