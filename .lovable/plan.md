## Fix Plan: C3 Validation, Schedule Handling & Verification Fields

### Issues Identified

**Issue 1 — Schedule not incrementing (SE/VC `fetchScheduleNo` timezone bug)**

- `SelfContributorC3Form.tsx` line 414 and `VoluntaryC3Form.tsx` line 274 still use `new Date(period.year, period.month, 1).toISOString()` for the schedule-number lookup (the save path was fixed but the pre-fetch was not).
- This sends a timezone-shifted period to the `get_next_c3_schedule_no` RPC, which does an exact `period = p_period` match, so it never finds the existing VAC record and returns 1 instead of 2.

**Issue 2 — ER form missing schedule prompt handling**

- `EmployerC3Form.tsx` delegates save to `C3Management.tsx` → `saveDraft()` → `useC3Management.ts`.
- `useC3Management.ts` correctly returns `{ promptNextSchedule: true }` but `C3Management.tsx` line 990-1022 only checks `result.success` — the `promptNextSchedule` case is silently dropped, no dialog shown.

**Issue 3 — DFT/PEN existing record not auto-loaded for editing**

- When a user navigates to "Add New C3" for a payer+period that already has a DFT/PEN record, the form doesn't check for existing records on load. It only detects the conflict at save time (via `resolveC3SaveAction`). The user expects the existing data to be pre-populated.

**Issue 4 — Verified By / Date Verified NULL for workflow-verified records**

- The workflow action handler (`useWorkflowActions.ts` line 1193-1217) sets `posting_status = 'VAC'` but does NOT set `verified_by` or `date_verified`.
- The `verify_c3_record` RPC properly sets both fields, but the workflow path bypasses the RPC entirely.
- DB confirms: SE 100039 Sep 2026 has `posting_status = 'VAC'` with `verified_by = NULL, date_verified = NULL`.

---

### Fix Plan

#### Step 1 — Fix `fetchScheduleNo` timezone in SE + VC forms

**Files**: `SelfContributorC3Form.tsx`, `VoluntaryC3Form.tsx`

Replace line 414 (SE) and line 274 (VC):

```typescript
const periodStr = new Date(period.year, period.month, 1).toISOString();
```

With:

```typescript
const periodStr = `${period.year}-${String(period.month + 1).padStart(2, '0')}-01`;
```

#### Step 2 — Fix `get_next_c3_schedule_no` RPC to normalize period

The RPC does `period = p_period` exact match. If the input has a time component, it won't match date-only values. Update the RPC to normalize:

```sql
WHERE period = p_period::date
```

#### Step 3 — Add schedule prompt dialog for ER in C3Management.tsx

In the ER `onSave` handler (line 990-1022), after checking `result.success`, add handling for `result.promptNextSchedule`:

- Show a `ConfirmDialog` asking to create next schedule
- On confirm, set the schedule number on the data and re-call `saveDraft`

#### Step 4 — Auto-load existing DFT/PEN record on form mount (SE + VC + ER)

Add a check when the form mounts (or when SSN+period are set for a new record):

- Query `findAllC3ForPeriod(payerId, payerType, normalizedPeriod)`
- If a DFT/PEN record exists, show an informational toast and load that record's data into the form (switch to edit mode)
- This requires exposing `findAllC3ForPeriod` or adding a new service function `checkExistingC3ForEdit`

#### Step 5 — Fix workflow action handler to set verified_by / date_verified

**File**: `src/hooks/useWorkflowActions.ts`

In the C3 submission workflow block (line 1193-1217), when `newPostingStatus === 'VAC'`:

```typescript
if (newPostingStatus === 'VAC') {
  updateData.verified_by = userId;  // UserCode of the approver
  updateData.date_verified = new Date().toISOString();
}
```

Apply the same to the `ip_wages` update block below it.

#### Step 6 — Backfill existing NULL verified_by records

Create a migration to populate `verified_by` and `date_verified` for existing VAC records that have these fields NULL, using data from `workflow_logs` where available.

---

### Files to Modify


| File                                                     | Change                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/pages/c3Management/forms/SelfContributorC3Form.tsx` | Fix `fetchScheduleNo` period string; add auto-load existing DFT/PEN |
| `src/pages/c3Management/forms/VoluntaryC3Form.tsx`       | Same as SE                                                          |
| `src/pages/c3Management/C3Management.tsx`                | Add schedule prompt dialog for ER `onSave`                          |
| `src/hooks/useWorkflowActions.ts`                        | Set `verified_by` + `date_verified` when status → VAC               |
| `src/services/c3Service.ts`                              | Export `findAllC3ForPeriod` or add `checkExistingC3ForEdit` helper  |
| Migration SQL                                            | Fix `get_next_c3_schedule_no` RPC; backfill NULL verified fields    |


### Edge Cases

- Multiple VAC records for same period and payer → next schedule = max + 1
- DFT record found on load → auto-populate and switch to edit mode silently
- Workflow approval vs direct `verify_c3_record` RPC both now populate audit fields
- Timezone-safe period construction in all paths (fetch, save, schedule lookup)

Note: make sure schedule no. confirmation toast show be show on the fill of payer_id and the period in the add c3 form not on save okey??  
