
# Legal Referrals Workbench — Enterprise Overhaul

This is a large change. I'll break it into 4 phases so we can ship and verify each one. Approve the whole plan or tell me which phase to start with.

## Phase 1 — Foundation: SLA data model + Admin config

**New tables (migration)**
- `legal_referral_sla_rule` — source_module, request_type, default_due_days, reminder_before_days, escalation_after_days, escalation_workbasket, escalation_team, notify_original_submitter, notify_supervisor, email_enabled, active.
- `legal_referral_sla_event` — request_id, event (DUE_SOON / OVERDUE / ESCALATED / REMINDED), occurred_at, actor, payload.
- Add columns to `legal_referral_info_request`: `due_date`, `reminder_at`, `escalation_at`, `sla_status` (ON_TIME / DUE_SOON / OVERDUE / ESCALATED), `escalated_at`, `escalated_to_workbasket`, `escalated_to_team`, `sla_rule_id`, `due_date_override_by`.
- Backfill `due_date` on existing rows (created_at + 5 days) and `sla_status = ON_TIME`.

**Admin UI**
- `LegalAdminSlaRules.tsx` — CRUD grid at `/legal/admin/sla-rules`.
- `LegalAdminReferralIntegrity` — extend with the new SLA checks (overdue w/o escalation, request w/o due_date).

**Service**
- `legalReferralSlaService.ts` — `resolveRule(source, type)`, `computeDueDate(rule, override?)`, `computeSlaStatus(due_date, escalation_at)`, `recordEvent()`.

## Phase 2 — Atomic Request Info + Real-time

**Request Info workflow** (refactor `RequestInfoDialog` + `legalReferralUnifiedService.requestInfo`)
Wrap in a single Postgres function `lr_request_info_atomic(...)` that:
1. inserts `legal_referral_info_request` with resolved `due_date`,
2. updates `legal_referral.status = 'INFO_REQUESTED'`,
3. creates `legal_referral_source_task` (BENEFITS or COMPLIANCE),
4. inserts `in_app_notifications`,
5. queues email via `notification_queue`,
6. writes `legal_audit_log` + source activity.

If any step fails, the whole thing rolls back.

**Real-time / auto-refresh**
- Enable Realtime publication on `legal_referral`, `legal_referral_info_request`, `legal_referral_source_task`, `core_generated_document`.
- New hook `useLegalReferralsRealtime(queryClient)` mounted in workbench — invalidates the affected query keys on INSERT/UPDATE/DELETE.
- Every mutation hook calls `queryClient.invalidateQueries` for the tab + badge counts + history.

## Phase 3 — Standard Grid + Workbench tabs

**Shared grid component** `LegalReferralsStandardGrid.tsx`:
search, filter drawer, status chips, date-range, column chooser, CSV export, refresh, pagination, row action menu, clickable referral No, skeleton, empty state, error state w/ retry.

**Tabs refactored in `LegalReferralsWorkbench.tsx`**:
Benefits / Compliance / Info Requested / Response Received / Accepted / Case Created / Rejected — all use the shared grid, all columns from the spec including `Pending Info Count`, `SLA Due Date`, `SLA Status`, `Last Update`.

**Info Requested tab**: switch query source from `legal_referral.status` to `legal_referral_info_request` (status = PENDING_SOURCE_RESPONSE), filtered by user-visible source_module + workbasket.

**Letter history**: refactor `GeneratedLettersHistoryPanel` + `AvailableLettersPanel` to invalidate `['lg-letters', caseId]` immediately after generate/print and subscribe to realtime on `core_generated_document`.

## Phase 4 — SLA escalation job + integrity & error fixes

**Edge function** `legal-referral-sla-cron` (scheduled via pg_cron every 15 min):
- mark DUE_SOON (within reminder_before_days)
- mark OVERDUE (past due_date)
- mark ESCALATED (past escalation_after_days), copy to escalation workbasket/team
- send notifications to source/legal workbasket + supervisor
- write `legal_referral_sla_event` + `legal_audit_log`

**Integrity report extension** (`LegalAdminReferralIntegrity`):
- INFO_REQUESTED w/o open request
- request w/o source task
- request w/o due_date  → repair: recalc from SLA
- overdue w/o escalation → repair: trigger escalation
- generated letter missing DMS link / history row → repair: relink

**Runtime error fix** ("An error occurred, trying to fix automatically")
Add `LegalReferralsErrorBoundary` around the workbench; null-safe column accessors; default empty arrays in queries; type-guard enum values; surface real errors via toast + Retry button instead of silent recovery.

## Acceptance verification
- TypeScript build passes.
- Manually walk: Request Info → see source task + due date → Submit Response → Legal tab updates without refresh → Generate Letter → appears in history immediately.
- Run integrity report → 0 issues after repairs.
- Run SLA cron → overdue requests get ESCALATED events.

## Scope note
This touches ~20 files and 1 migration + 1 edge function. Estimated heavy change. Confirm to proceed with **all 4 phases**, or pick a subset (e.g. start with Phase 1+2, then 3, then 4).
