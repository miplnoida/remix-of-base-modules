

## Analysis: Three Issues — Sync Failure, Missing Accept Icon, Schedule Loading

---

### Issue 1: Sync Failed — "Multiple contribution records found; cannot be resolved uniquely"

**Root Cause (C3-Wizard side)**

The sync payload for SE payers does **not** include `schedule_number`. The edge function (line 206-210) only adds it for `ER` payers:

```typescript
if (header.payer_type === "ER") {
  payload.schedule_number = component?.sequence_no != null ? String(component.sequence_no) : undefined;
}
```

SE payer 100039 has **3 VAC records** for Sep 2026 (schedules 1, 2, 3). Without `schedule_number`, the Wizard's `/receive-payment` endpoint finds all 3 and returns `"Multiple contribution records found; cannot resolve uniquely"`.

The `c3_payment_components` table confirms each payment has a `sequence_no` (payment 84 → seq 2, payment 85 → seq 1), so we **do** have the data — we're just not sending it.

**Fix required (SSB-Admin side)**: Include `schedule_number` for SE payers too.

**Escalation message for C3-Wizard team**:

> **Subject: Payment Sync — SE /receive-payment fails with "Multiple contribution records found"**
>
> When SSB-Admin syncs SE payments via `/receive-payment`, the response returns:  
> `{ "success": false, "error": "Multiple contribution records found; cannot resolve uniquely" }`
>
> This occurs because SE payers can have multiple schedules for the same period (e.g., SSN 100039 has 3 VAC records for Sep 2026).
>
> **Action requested**: Please confirm that the `/receive-payment` endpoint accepts and uses the `schedule_number` field for SE payer types to disambiguate which contribution record to apply the payment against. We will begin including `schedule_number` in SE payloads immediately.
>
> Additionally, please confirm NWD (Non-Working Director) payment handling — we send `is_for_director: true` and the `registration_number` (employer ID). Please verify your endpoint correctly routes NWD payments to director-specific contribution records.

**Our code fix**: Add `|| header.payer_type === "SE"` to the `schedule_number` condition in `sync-c3-payment/index.ts`.

---

### Issue 2: Accept Icon Not Visible for Employer 658852 (Sep 2026, PEN)

**Root Cause (SSB-Admin bug)**

The workflow instance for this record (`84d92d19-...`) is already **Completed**:

| Field | Value |
|-------|-------|
| Instance status | `Completed` |
| Task status | `Completed` |
| Task assigned_to | `null` |
| Workflow logs | Empty (no approval actions logged) |

The C3 `posting_status` is `PEN` but the workflow completed immediately on submission — likely because there's no actual assignment logic or the system auto-completed the single-step workflow.

The `useWorkflowActions` hook (line 98) explicitly **excludes** completed instances:
```typescript
.not('status', 'in', '("Completed","Rejected","Cancelled")')
```

So it returns `hasWorkflow: false` → no Accept/Reject buttons rendered.

**The problem**: The `submit_c3_record` RPC sets `posting_status = PEN`, then `triggerC3Workflow` creates an instance — but the workflow's single step ("Review & Approve") is auto-completed because the submitter has an approver role, or the task is unassigned (`assigned_to: null`) and the system treats it as auto-resolved.

**Fix**: The workflow task has `assigned_to: null`, meaning nobody was assigned to approve. The `WorkflowActionButtons` likely falls through with no active task. We need to investigate why the task is completing immediately and ensure it stays `Pending` for the approver to act on.

---

### Issue 3: Schedule Shows 2 Instead of Loading Existing PEN Record

**Root Cause (SSB-Admin logic bug)**

The `resolveC3SaveAction` function (c3Service.ts line 96-103) for sequence_no=1:
1. Finds the existing PEN record for seq 1
2. Since PEN is in `EDITABLE_STATUSES`, it returns `{ action: 'update', existingId: ... }` ← this is correct

But the **form's initial proactive lookup** (triggered on payer_id + period entry) uses `findAllC3ForPeriod` and the schedule-number RPC `get_next_c3_schedule_no`. The RPC counts existing records and suggests the next number. Since one PEN record exists (seq 1), it suggests seq 2.

The fix should ensure the proactive lookup detects the PEN record and auto-loads it for editing (like it does for DFT records), rather than suggesting a new schedule.

---

### Plan Summary

| # | Issue | Root Cause | Fix Location |
|---|-------|------------|-------------|
| 1 | SE sync "Multiple records" | `schedule_number` not sent for SE | `sync-c3-payment/index.ts` — add SE to schedule_number condition |
| 2 | Accept icon missing | Workflow auto-completed on submit (task unassigned) | Investigate workflow auto-completion; ensure task stays Pending |
| 3 | Shows Schedule 2 for PEN record | Proactive lookup suggests next schedule instead of loading editable PEN | ER form's period-change handler in `C3Management.tsx` — detect PEN records and auto-load |

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/sync-c3-payment/index.ts` | Add `schedule_number` for SE payers (1-line condition change) |
| `src/hooks/useC3Submit.ts` | Investigate why workflow task is created with `assigned_to: null` and auto-completes |
| `src/pages/c3Management/C3Management.tsx` | ER proactive lookup: detect PEN/DFT records and auto-load instead of prompting new schedule |

