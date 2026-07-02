# Legal Hearings Workflow

End-to-end reference for the hearings module in the SSB Legal system.

## Data model

| Table                                | Purpose                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| `lg_hearing`                         | Hearing rows (date, time, court, room, status, outcome)    |
| `lg_hearing.next_hearing_date/time`  | Populated when adjourned or when a follow-up is booked     |
| `lg_case_activity`                   | Audit trail for schedule/outcome/adjourn/cancel events     |
| `lg_case_task`                       | Auto-generated preparation task when a hearing is created  |
| `lg_case_deadline`                   | Compliance deadline linked to next hearing date            |

Foreign keys of interest:
- `lg_hearing.lg_case_id → lg_case.id`
- `lg_order.hearing_id → lg_hearing.id` (see order state machine)

## Screens

| Screen                                       | Route                                | Purpose                                            |
| -------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| Hearing Calendar                             | `/legal/lg/hearings`                 | Month/week/day + list view of team hearings       |
| Case 360 → Hearings tab                      | `/legal/lg/cases/:id?tab=hearings`   | Case-scoped hearing history + schedule/record     |

## Actions

1. **Schedule** — `HearingOutcomeDialog` in `create` mode.
   - Guarded by `useLgAccess().can("scheduleHearing")`.
   - Calls `createLgHearing` → status `SCHEDULED`.
   - Fires `HEARING_SCHEDULED` fee event and audit row.
2. **Record outcome** — `HearingOutcomeDialog` in `outcome` mode.
   - Guarded by `useLgAccess().can("recordHearingOutcome")`.
   - Requires `outcome_code`; writes `minutes`.
   - Transitions row to `COMPLETED`; if `next_hearing_date` is supplied,
     an adjourned/follow-up row is created automatically.
3. **Reschedule / Adjourn** — updates the row to `ADJOURNED` and creates
   a new `SCHEDULED` row for the new date.
4. **Cancel / No-show** — closes the row as `CANCELLED` or `NO_SHOW`.

All transitions must go through
`src/services/legal/lgHearingStateMachine.ts` (`assertHearingTransition`)
to keep behaviour consistent across screens and any future bulk jobs.

## Permissions

Handled centrally in `useLgAccess` and mirrored in
`useLgHearingPermissions` for legacy screens. See
`docs/legal/permission-matrix.md`.

## Empty / loading / error states

- Calendar and list use `LgDataGrid` with built-in empty and error UI.
- Case-scoped tab shows a "No hearings scheduled." empty state and a
  contextual "Schedule Hearing" button gated by capability.

## Deprecated

- `src/components/legal/ScheduleHearingDialog.tsx` and
  `src/components/legal/tabs/CaseHearingsTab.tsx` (legacy path used by
  `LegalCaseView` / `SSBCaseView`) are retained per the route-retirement
  plan but no longer render mock hearings. All new work must use
  `HearingOutcomeDialog` + the LG Case 360 hearings tab.
