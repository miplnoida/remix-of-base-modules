
# Fix: Job Execution History Detail View

## Root Cause

The Eye button on line 140 of `JobHistory.tsx` has **no `onClick` handler** and **no detail modal/drawer exists**. It's a dead button — clicking it does nothing.

```tsx
// Current — no handler
<Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
```

## What exists

The `ce_automation_runs` table has rich columns not currently displayed:
- `execution_log` (JSONB) — full result payload
- `is_dry_run` (BOOLEAN)
- `idempotency_key` (VARCHAR)
- `parameters` (JSONB)
- `error_message` (TEXT)

The `AutomationRun` interface is missing these fields.

## Fix Plan

### Step 1 — Add state and detail modal to `JobHistory.tsx`

1. Add `selectedRun` state to track clicked row
2. Expand `AutomationRun` interface to include: `execution_log`, `is_dry_run`, `idempotency_key`, `parameters`, `error_message`
3. Wire `onClick` on the Eye button to set `selectedRun`

### Step 2 — Build execution detail modal

Create an inline `StandardModal` (or Dialog) showing:

**Section 1 — Run Overview**
- Run ID, Job Name, Status badge, Dry Run vs Live Run badge
- Triggered By, Idempotency Key
- Started At, Completed At, Duration

**Section 2 — Results**
- Records Processed, Records Affected
- Error message (if any, shown in red)

**Section 3 — Execution Log** (collapsible)
- If `execution_log` contains `scan_details`: show structured breakdown (employers scanned, violations detected/created, duplicates skipped, per-rule counts)
- Otherwise: show raw JSON in a `<pre>` block

**Section 4 — Parameters** (collapsible, if present)
- Raw JSON of input parameters

### Step 3 — Handle edge cases
- Missing/null fields → show "—"
- No execution_log → show "No execution log recorded"
- Running status → show animated indicator

### Files Changed
- `src/pages/compliance/automation/JobHistory.tsx` — all changes in this single file (state, interface, modal, wiring)
