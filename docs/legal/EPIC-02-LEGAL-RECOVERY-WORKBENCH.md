# EPIC-02 — Legal Recovery Workbench

## What was implemented
Enterprise Legal Recovery Workbench — the primary operational workspace for
SSB St. Kitts & Nevis Legal officers and managers to monitor and act on
outstanding recoveries (arrears, penalties, interest, overpayments, court
costs, legal costs).

## Screens / routes
- `/legal/lg/recovery` — `src/pages/legal/LgRecoveryWorkbench.tsx` (rebuilt).

## Components used
- `PageShell` — loading/error/empty/no-permission states.
- `LgDataGrid` (BN grid standard) — sort, column filter, global search, column
  chooser, pagination, export (Excel/CSV/PDF where the BN export supports it),
  summary chips, toolbar filter dropdowns, row actions.
- `LgStatusBadge`, shadcn `Badge`, `lucide-react` icons.

## Hooks / services
- `src/hooks/legal/useRecoveryWorkbench.ts` — TanStack Query wrapper.
- `src/services/legal/lgRecoveryWorkbenchService.ts` —
  `listRecoveryWorkbenchRows()` bulk-aggregates rows.

## Tables read
- `lg_case` (anchor)
- `lg_case_action` — principal, interest, penalty, cost, amount_paid, total.
- `lg_fee_charge` — court cost (`COURT_COST|COURT_FEE`), legal cost
  (`LEGAL_COST|LEGAL_FEE|ATTORNEY|SOLICITOR`), other posted fees.
- `lg_payment_arrangement_link` — arrangement status, paid, outstanding.
- `lg_hearing` — next hearing date.
- `lg_case_task` — SLA aggregate per case.
- `er_master` — employer regno / trade name.
- `ip_master` — SSN + firstname/middle/surname.
- `profiles` — assigned officer name.

## Tables updated
None. Read-only workbench. Any drill-down mutations happen on the case detail
tabs and are audited via the existing `lg_case_activity` pipeline.

## Recovery calculations
```
Total Recoverable = Principal Due + Interest + Penalty + Court Cost + Legal Cost + Other posted fees
Total Paid        = SUM(lg_payment_arrangement_link.paid_amount) — falls back to SUM(lg_case_action.amount_paid) when no arrangements exist
Outstanding       = MAX(0, Total Recoverable − Total Paid) — falls back to lg_case.outstanding_amount_snapshot / total_outstanding when derivation is 0
Recovery %        = Total Paid / Total Recoverable × 100 (0 when denominator is 0)
```

## Ageing buckets
`0–30`, `31–60`, `61–90`, `91–180`, `180+` days — computed from
`lg_case.opened_date` (falls back to `created_at`).

## Summary cards
`Total Recoverable`, `Total Outstanding`, `Total Recovered`, `Recovery %`,
`Overdue Matters` (next-action date past), `Breached Arrangements`,
`Hearings Due` (upcoming), `Cases Awaiting Action` (SLA `AT_RISK`/`OVERDUE`).

## Toolbar filter chips
Ageing, Legal Status, Recovery Type, Party Type, Officer, Territory,
Arrangement Status, Breach Status. All values are derived from live data —
no hardcoded lists.

## Export capability
Column chooser + export are provided by the shared BN grid toolbar (Excel/CSV).
The current filtered view is exported.

## Permission behaviour
- Gated by `useLgAccess().can("viewCase")`.
- Row action "Open Case" / "Open Recovery Tab" navigates into the existing
  Case 360 which enforces its own capability matrix.
- No placeholder actions — unavailable actions are hidden.

## Missing tables / known gaps
| Field | Gap | Behaviour |
| --- | --- | --- |
| Team / Workbasket name | `lg_case.assigned_team_code` shows the code only; team-name lookup not wired. | Column hidden by default. |
| Territory / Office name | Only `country_code` is stored on `lg_case`. | Country code shown; office-level territory NOT IMPLEMENTED. |
| Legal cost taxonomy | Depends on `lg_fee_charge.fee_head_code` matching `LEGAL_COST|LEGAL_FEE|ATTORNEY|SOLICITOR`. | Non-matching heads count as "Other posted fees". |
| Overdue installment detail | Sourced from `lg_payment_arrangement_link.outstanding_amount` + `active` flag. Fine-grained installment miss counts live on the Case Recovery tab. | Workbench flag only; drill down for detail. |
| Source reference for benefit overpayment | Uses `court_case_no` / `legacy_case_no` / `source_record_id`. | Displayed as `—` when none exists. |

## Test checklist
- [ ] Page loads live rows; empty state shows when there are no cases.
- [ ] Summary cards recompute when a filter chip changes.
- [ ] Ageing chips 0–30 / 31–60 / 61–90 / 91–180 / 180+ split rows correctly.
- [ ] Officer / Territory / Status / Recovery Type / Party Type / Arrangement /
      Breach chips only show values present in the dataset.
- [ ] Column chooser hides/shows Interest, Penalty, Court Cost, Legal Cost,
      Last Activity, Team.
- [ ] Global search matches matter no, party name and employer number.
- [ ] Sort works on every numeric and date column.
- [ ] Export downloads the filtered rows.
- [ ] Row click opens the Case 360 Recovery tab.
- [ ] Row action "Open Case" opens the Case 360 overview.
- [ ] Without `viewCase` capability the page shows the no-permission state.

## UAT scenarios
1. Officer with active caseload — sees only their cases via Officer filter.
2. Manager reviewing breached arrangements — Arrangement=ACTIVE +
   Breach=YES.
3. Overdue actions triage — Ageing=91–180 + SLA=OVERDUE.
4. Recovery KPI review — clear filters, compare `Recovery %` chip against
   `total_paid / total_recoverable`.
5. Drill-down — from any row open the Case Recovery tab and verify
   Outstanding matches the workbench figure.

## Acceptance criteria mapping
1. Live-only data or empty state — ✅ (no seed/mock code paths).
2. No dummy matters / hardcoded parties — ✅ (party name from `er_master` /
   `ip_master`).
3. Recovery fields visible + safely calculated — ✅ (guarded division,
   `MAX(0, …)` for outstanding).
4. Filter / sort / search / export — ✅ via BN grid toolbar.
5. Open source / case from row — ✅ row action + row click.
6. Summary cards from live data — ✅ derived from filtered rows.
7. Missing backend data documented — ✅ this doc.
8. Suitable primary SSB Legal workspace — ✅ route registered in Legal
   sidebar as "Recovery Workbench".

---

## EPIC-02A — Enterprise Enhancement (v1.1)

The workbench now operates as a proactive operational cockpit. All rules are deterministic; no AI is used.

### New capabilities

| Area | Description |
|------|-------------|
| **Recovery Health** | `HEALTHY / ATTENTION / HIGH_RISK / CRITICAL` computed from breach, SLA, ageing, inactivity, outstanding and recovery %. Tooltip lists reasons. |
| **Next Recommended Action** | 12 deterministic outcomes (Issue Demand Notice → Close Matter, plus Waiting states). |
| **Recovery Timeline** | Side-drawer visualising Referral → Assessment → Demand Notice → Court Filing → Hearings → Judgment → Recovery → Settlement → Closure with current stage highlighted. |
| **Financial Breakdown** | Popover on Principal / Total Recoverable / Outstanding amounts with the full composition (interest, penalty, court cost, legal cost, other charges, payments, arrangement, last payment). |
| **Enterprise Alerts** | Missing Docs, Hearing ≤ 7d, Breached, Idle 30/60d, SLA Warning, Overdue, High Outstanding, Judgment Due. Filterable, tooltip explains each. |
| **Bulk Operations** | Assign Officer, Generate Notices, Create Tasks, Bulk Reminder, Mark Reviewed, Export Selected. Actions honour the existing `useLgAccess` permission matrix. |
| **Snapshot Panel** | Right-hand read-only panel with matter, party, financial, case, tasks, docs and last-activity summary. Opened on row click. |
| **Smart Filter Presets** | My Active, Overdue, Breached, Hearings This Week, Awaiting Docs, Awaiting Court, Outstanding > Threshold, Settlement Cases, Recently Updated, No Activity 30d. |
| **Operational KPIs** | Added Avg Recovery %, Avg Case Age, Avg Outstanding, Avg Idle, My Workload alongside existing totals. |
| **UX** | Refresh button + last-refreshed timestamp, persisted filter state, persistent column widths/visibility via BNDataGrid `id`. |

### Configurable thresholds

Defined centrally in `src/services/legal/lgRecoveryHealth.ts` (`DEFAULT_RECOVERY_THRESHOLDS`). Admin overrides may be persisted through `saveRecoveryThresholds()` (stored under `lg.recovery.thresholds` in localStorage).

Fields: `outstandingHigh`, `outstandingCritical`, `recoveryPctHealthy`, `recoveryPctWarn`, `ageingWarnDays`, `ageingCriticalDays`, `inactivityWarnDays`, `inactivityCriticalDays`, `hearingImminentDays`, `slaWarnDays`, `requiredDocumentCount`.

### Health scoring rules

Score increments for each hit; `>=5 CRITICAL`, `>=3 HIGH_RISK`, `>=1 ATTENTION`, else `HEALTHY`. Recovery % above healthy threshold subtracts one point.

### Next Action decision order

1. Terminal status / fully recovered → Close Matter
2. Breached arrangement → Escalate to Supervisor
3. SLA overdue → Escalate to Supervisor
4. Hearing within threshold → Prepare Hearing Documents
5. Hearing date passed → Record Hearing Outcome
6. Active arrangement (+idle) → Follow-up / Waiting for Payment
7. Judgment / Hearing stage → Waiting for Court
8. Filed / In Court → Waiting for Court
9. Notice / Demand stage → Prepare Court Filing / Waiting for Party
10. Missing docs → Request Additional Information
11. Accepted / Under Review → Issue Demand Notice
12. Critical inactivity → Escalate to Supervisor
13. Default → Review Settlement

### Files modified / added

- **Added** `src/services/legal/lgRecoveryHealth.ts` — thresholds, health/action/alert/timeline/preset helpers.
- **Added** `src/components/legal/lg/RecoveryHealthBadge.tsx`
- **Added** `src/components/legal/lg/RecoveryAlertsCell.tsx`
- **Added** `src/components/legal/lg/FinancialBreakdownPopover.tsx`
- **Added** `src/components/legal/lg/RecoveryTimelineDrawer.tsx`
- **Added** `src/components/legal/lg/RecoverySnapshotPanel.tsx`
- **Modified** `src/pages/legal/LgRecoveryWorkbench.tsx` — new columns, bulk actions, presets, snapshot & timeline wiring, refresh + last-refreshed, persisted filters.
- **Modified** `src/services/legal/lgRecoveryWorkbenchService.ts` — last-payment derivation (uses `updated_at` where paid amounts > 0 because `paid_date`/`last_payment_date` columns are not present in schema).

### Known limitations / backend gaps

- **`last_payment_date` proxy** — derived from `updated_at` on arrangement links / actions with paid amounts > 0. A dedicated payment ledger with `paid_date` would remove this proxy.
- **Bulk Assign / Generate Notice / Create Tasks** currently surface confirmation toasts and expect the officer to complete the workflow in the target module; end-to-end write flows require server-side batch endpoints not yet exposed.
- **Threshold configuration UI** — thresholds are persisted per-user in localStorage; central admin CRUD is a future enhancement.
- **Keyboard shortcuts** — inherited from BNDataGrid (arrow navigation, focus). No workbench-specific shortcuts were added.


---

## EPIC-06A.2 Retrofit — Applied

Recoverable-liability rollups from `lg_recoverable_liability` are now consumed by this workspace. See [EPIC-06A.2 — Liability Retrofit](./EPIC-06A.2-LIABILITY-RETROFIT.md) for scope, fallbacks and acceptance results.
