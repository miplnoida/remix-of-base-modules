## Goal

Replace the current source-department tabbed Legal Referrals page with a true **Enterprise Workbench**: a single reusable component driven by assignment state, workbasket routing and SLA — not by hardcoded source statuses. The same component will later power Legal Matters, Contract Reviews, Employer Recovery, Appeals and Payment Arrangements.

## Scope of this change

In scope now:
1. Build the reusable `EnterpriseWorkbench` shell (cards + queue tabs + grid + actions + auto-refresh).
2. Adapt it for **Legal Referrals** as the first consumer (replacing `LegalReferralsWorkbench`).
3. Wire it to the existing services: `legalReferralUnifiedService`, `legalReferralSlaService`, `lgAssignmentService`, `lgRoutingService`, `lgTeamService`, `lgStaffService`, plus realtime via `useLegalReferralsRealtime`.

Out of scope (follow-up phases, will reuse the same component with different adapters):
- Legal Matters, Contract Reviews, Employer Recovery, Appeals, Payment Arrangements adapters.
- New backend tables/RPCs. The workbench will derive queues from existing columns on `legal_referral` (assignment, workbasket, team, SLA fields) plus `legal_referral_info_request`.

## Architecture

```text
src/components/enterprise-workbench/
  EnterpriseWorkbench.tsx         generic shell: cards, queue tabs, filters, grid, actions
  workbench-types.ts              QueueDef, CardDef, ColumnDef, ActionDef, WorkbenchAdapter
  WorkbenchCards.tsx              clickable metric cards
  WorkbenchQueueTabs.tsx          queue tabs with live counts
  WorkbenchGrid.tsx               wraps existing LgDataGrid (sort/filter/columns/export/pagination)
  WorkbenchToolbar.tsx            source-dept filter, search, priority, date range, refresh

src/workbenches/legal-referrals/
  LegalReferralsWorkbenchAdapter.ts  defines queues, cards, columns, actions, row-link, queryKeys
  useLegalReferralsWorkbenchData.ts  queries + derived counts + realtime refresh
```

The `EnterpriseWorkbench` is generic over a row type `T` and takes an `adapter` describing:
- `queues`: array of `{ id, label, predicate(row, ctx), countBadge }` — computed client-side from the loaded dataset
- `cards`: array of `{ id, label, icon, predicate, tone }` — clickable, sets `activeQueue` or a card filter
- `columns`: `ColumnDef<T>[]` reusing the platform standard grid
- `actions`: row actions (`Assign`, `Reassign`, `Transfer Workbasket`, `Escalate`, `Request Info`, `View`)
- `rowLink(row)`, `getId(row)`, `getPriority(row)`, `getSla(row)`

## Queues (assignment + SLA driven)

For Legal Referrals these map to fields already on `legal_referral` and the open info-request set:

| Queue | Predicate |
|---|---|
| My Queue | `assigned_to_user_code === currentUserCode` AND not terminal |
| Team Queue | `assigned_team_code IN myTeams` AND `assigned_to_user_code` IS NULL |
| Workbasket Queue | `legal_workbasket_code IN myWorkbaskets` AND no team/user assigned |
| Waiting on Source | open info request exists OR status `INFO_REQUESTED` |
| Waiting on Legal | status in `SUBMITTED_TO_LEGAL`, `RECEIVED_BY_LEGAL`, `INFO_RESPONDED`, `UNDER_LEGAL_REVIEW` |
| Overdue | sla `due_date < now` AND not breached/closed |
| SLA Breached | `sla_status === 'BREACHED'` |
| Completed | status in `LEGAL_CASE_CREATED`, `REJECTED`, `CLOSED` |

Source Department becomes a **filter chip** in the toolbar (Benefits / Compliance / All), not a tab.

## Cards (metrics)

`New Referrals`, `Assigned to Me`, `Assigned to My Team`, `Assigned to My Workbasket`, `Waiting on Source`, `Waiting on Legal`, `Due Today`, `Overdue`, `SLA Breached`, `High Priority`. Clicking a card sets the matching queue (or applies a card-level filter on top of the current queue).

## Grid columns (default)

Referral Number, Matter Type, Origin Department, Primary Entity, Assigned Workbasket, Assigned Team, Assigned Officer, Priority, Current Stage, SLA Status, SLA Due Date, Days Remaining, Last Activity, Status. Standard enterprise grid features (column chooser, sort, filter, export, pagination, density) inherited from `LgDataGrid`.

## SLA integration

`legalReferralSlaService.computeSlaStatus` already returns `ON_TIME | DUE_SOON | OVERDUE | BREACHED`. The workbench reads:
- `due_date` from `legal_referral` (or earliest open info-request)
- live `days_remaining` calculated each render
- statuses: `Waiting on Source`, `Waiting on Legal`, `Due Today`, `Overdue`, `Breached`

No static badges. The SLA cell renders from live data.

## Assignment integration

Each row shows `legal_workbasket_code`, `assigned_team_code`, `assigned_to_user_code`, `assigned_at`, `reassignment_count`. Row actions call existing services:

- Assign / Reassign → `lgAssignmentService.assignReferral`
- Transfer Workbasket → `lgRoutingService.transferWorkbasket`
- Escalate → existing escalation rule entry point (`lgPolicyService` / escalation RPC)
- Request Information → existing `RequestInfoDialog`

If a service method does not exist with that exact name, the adapter will fall back to the closest existing one and emit a TODO log — no schema changes in this phase.

## Auto refresh

`useLegalReferralsRealtime` already subscribes to relevant tables. We extend the workbench data hook to invalidate the workbench query keys on:
- new referral (`legal_referral` INSERT)
- reassignment (`legal_referral` UPDATE on assignment columns)
- status update (UPDATE on `status`)
- info request response (`legal_referral_info_request` UPDATE)
- acceptance / rejection / case creation (status transitions)

No manual refresh is needed; a manual `Refresh` button stays available in the toolbar.

## File changes

Create:
- `src/components/enterprise-workbench/EnterpriseWorkbench.tsx`
- `src/components/enterprise-workbench/workbench-types.ts`
- `src/components/enterprise-workbench/WorkbenchCards.tsx`
- `src/components/enterprise-workbench/WorkbenchQueueTabs.tsx`
- `src/components/enterprise-workbench/WorkbenchGrid.tsx`
- `src/components/enterprise-workbench/WorkbenchToolbar.tsx`
- `src/workbenches/legal-referrals/LegalReferralsWorkbenchAdapter.tsx`
- `src/workbenches/legal-referrals/useLegalReferralsWorkbenchData.ts`

Modify:
- `src/pages/legal/LegalReferralsWorkbench.tsx` → thin page mounting `<EnterpriseWorkbench adapter={LegalReferralsAdapter} />`
- `src/hooks/useLegalReferralsRealtime.ts` → extend invalidation keys to cover the new query keys.

Untouched in this phase: routes, navigation, DB schema, other modules' pages.

## Acceptance

- Legal Referrals page no longer has Benefits / Compliance / Accepted / Rejected as primary tabs.
- New queues appear: My Queue, Team Queue, Workbasket Queue, Waiting on Source, Waiting on Legal, Overdue, SLA Breached, Completed.
- Dashboard cards are clickable and filter the grid.
- Grid shows the full default column list above with live SLA values.
- Row actions hit existing assignment / routing / SLA / info-request services.
- Realtime: assignment/status/info-request changes update cards, counts, and grid without a manual refresh.
- TypeScript build passes.
- Existing Legal Referrals routes still resolve (`/legal/referrals-workbench`).
