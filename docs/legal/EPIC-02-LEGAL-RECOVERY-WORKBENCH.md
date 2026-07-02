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
