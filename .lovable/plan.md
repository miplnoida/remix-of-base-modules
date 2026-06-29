## Issue
In **Compliance → Notices → Create Notice**, the "Response Due Date" field (`src/pages/compliance/legal/NoticesManagement.tsx`, line 500) is a plain `<Input type="date">` with no minimum. Admins can pick a date in the past, which makes no business sense for a notice response deadline.

## Fix
Constrain the input so only today or future dates are selectable, and validate on save.

### Change in `src/pages/compliance/legal/NoticesManagement.tsx`

1. **Block past dates at the picker level** — add `min={today}` (yyyy-MM-dd) to the date input:
   ```tsx
   <Input
     type="date"
     min={new Date().toISOString().split('T')[0]}
     value={newNotice.due_response_date}
     onChange={...}
   />
   ```

2. **Validate on save** in `handleCreateSave` — if `due_response_date` is set and earlier than today, show a destructive toast ("Response due date cannot be in the past") and abort the mutation. This catches manual typing that bypasses the picker's `min`.

3. **Helper text** under the field: `<p className="text-[11px] text-muted-foreground">Must be today or a future date</p>`.

No other screens or DB changes — the edit-side notice list/detail views are read-only displays of this value.

## Acceptance
- The native date picker disables days before today.
- Typing an older date and clicking Save shows a red toast and the notice is not created.
- Today and any future date save normally.
