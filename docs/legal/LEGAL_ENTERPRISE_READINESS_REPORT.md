# Legal Enterprise Readiness Report — Phase 14

Compiled after completion of the 13-phase master plan.

## Summary

| Area | Status |
|------|--------|
| Foundation cleanup (Phase 1) | Complete — mock data purged from production screens; legacy routes retained per user decision. |
| Recovery Workbench (Phase 2) | Complete — `/legal/lg/recovery` on `LgDataGrid`. |
| Referral workflow (Phase 3) | Complete — state machine, capability guards, audit + realtime. |
| Case 360 workspace (Phase 4) | Complete — 13 functional areas in 6 groups. |
| Hearings (Phase 5) | Complete — calendar, outcomes, fee events, state machine. |
| Orders & Judgments (Phase 6) | Complete — registry, Case 360 tab, state machine. |
| Recovery & Payments (Phase 7) | Complete — deterministic engine, Case 360 tab, dashboard KPIs. |
| Settlements (Phase 8) | Complete — extended state machine, `transitionLgSettlement`. |
| Documents & Notices (Phase 9) | Complete — DMS integration, template-driven notices. |
| Advisory (Phase 10) | Complete — separate lifecycle, isolated from recovery KPIs. |
| Analytics Explorer (Phase 11) | Complete — 13 datasets on shared framework. |
| Command Centre (Phase 12) | Complete — live widgets with realtime refresh. |
| Permissions + Audit + Validation (Phase 13) | Complete — 22-capability matrix; every mutation audits; state machines guard every transition. |

## Screens changed / added

- Added: `LgRecoveryWorkbench`, `LgCaseDetail` (Case 360),
  `LgHearingCalendar`, `CourtOrdersManagement`, `LgCaseRecoveryTab`,
  `LgCaseOrdersTab`, `LgTasksList`, Enterprise Explorer datasets,
  Command Centre widgets.
- Retired (redirect only): `ReportsAnalytics`, `LegalReports`,
  `SSBLegalReports`, `LegalOrderRegistry`.
- Legacy `SSB*`, `NewLegalModule`, `LegalUnifiedWorkbench`, `CaseIntake`,
  `CaseView`, `LegalCaseView` remain live per Phase-1 decision B;
  cutover waves tracked in `route-retirement-plan.md`.

## Tables used

`lg_case`, `lg_case_intake`, `lg_case_activity`, `lg_case_task`,
`lg_case_task_audit`, `lg_hearing`, `lg_order`, `lg_notice`,
`lg_document_link`, `lg_settlement`, `lg_fee_charge`,
`lg_payment_arrangement_link`, `lg_contract_review`, `la_matter`,
`core_legal_referral_item`, `core_legal_reference`, `ce_legal_referrals`,
`bn_legal_referral`, `core_payment_arrangement`,
`core_payment_schedule_installment`, `core_payment_allocation`,
`ce_arrears_ledger`, `bn_overpayment`, `explorer_saved_view`,
`explorer_schedule`.

## State machines

- `lgReferralStateMachine.ts`
- `lgCaseStateMachine.ts`
- `lgHearingStateMachine.ts`
- `lgOrderStateMachine.ts`
- `lgSettlementStateMachine.ts` (new — Phase 8)

Each rejects invalid transitions and maps every action to a
`useLegalCapability` flag.

## Permissions matrix

Central: `useLgAccess` → 22 capabilities. See
[`permission-matrix.md`](./permission-matrix.md).

## Audit

Every mutation writes `lg_case_activity` with `user`, `ts`, `entity_type`,
`entity_id`, `action`, `old_value`, `new_value`, `remarks`. Task changes
additionally write `lg_case_task_audit`. Referral events mirror into the
Case 360 timeline via `lgAuditService.mirrorReferralEventToCase`.

## Exports

Every Explorer dataset supports Excel / CSV / PDF / Word / HTML / JSON /
XML / Print of the currently-filtered rows only. Scheduled delivery runs
via `explorer-scheduled-delivery` edge function driven by pg_cron.

## Gaps / limitations

- Sidebar reorganisation (13-section navigation from the master plan) is
  documented but **not yet applied to `app_modules`** — deferred per
  user decision A, scheduled for the Phase 4 cutover wave.
- Legacy `SSB*` / `NewLegalModule` / `LegalUnifiedWorkbench` remain in
  parallel; users must be trained to use the new workbench even though
  bookmarks still resolve.
- Some optional views (`v_lg_recovery_matter`, `v_lg_case_financials`)
  listed in the technical notes are computed in code today; DB views can
  be added later for performance without changing consumers.
- No AI insights this phase, by design.

## UAT checklist

1. Create referral (Compliance) → Accept in Legal → Case created →
   assigned to officer.
2. Schedule hearing → record outcome → follow-up hearing auto-created,
   fee event logged.
3. File court order → mark Granted → mark Complied; verify status
   transitions and audit entries.
4. Propose settlement (`DRAFT`) → submit → review → approve → activate →
   verify linked arrangement created and fee event triggered.
5. Miss two consecutive installments → arrangement marked `BREACHED`,
   linked order flipped to `BREACHED`, enforcement task auto-created.
6. Generate demand letter → approve → dispatch; PDF appears in DMS,
   timeline entry recorded.
7. Advisory: submit contract → assign → request info → issue comments →
   approve → close. Confirm it does not appear in recovery KPIs.
8. Analytics Explorer: create saved view, schedule delivery, export
   filtered rows to Excel and PDF.
9. Command Centre: verify every widget shows live counts and deep-links
   land on a pre-filtered screen.
10. Permission smoke: log in as `LEGAL_READ_ONLY`, confirm no mutation
    buttons render; as `LEGAL_OFFICER`, confirm approvals are hidden;
    as `LEGAL_MANAGER`, confirm approvals allowed.

## Sign-off

Module is enterprise-ready subject to the deferred sidebar cutover and
legacy retirement waves scheduled in `route-retirement-plan.md`.
