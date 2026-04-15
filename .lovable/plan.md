

# Tab-Level Persistence for Meeting Edit Data

## Current State
- The `meeting_edit_data` table already exists with columns: `meeting_id`, `data_type`, `data_json` (JSONB), `original_api_json`, `modified_by`
- The `useMeetingEditData` hook persists **array-type** sub-data (owners, locations, dependants) but **not scalar field edits** (personal info, contact, employment, etc.)
- Scalar edits live only in React state (`editedData`) and are lost on page refresh
- No per-tab Save buttons exist — edits are only committed when "Accept" is clicked

## What Changes

### 1. Extend `useMeetingEditData` hook
- Accept `Record<string, any>` in addition to `any[]` (currently typed as arrays only)
- No DB schema change needed — `data_json` is already JSONB and supports objects

### 2. Add per-tab persistence hooks in `StartMeetingPage.tsx`
Register `useMeetingEditData` for each tab type:

**IP Meeting tabs:** `ip-personal`, `ip-contact`, `ip-relations`, `ip-employment`, `ip-remarks`
**Employer Meeting tabs:** `er-employer-profile`, `er-basic-details`, `er-contact-reach`, `er-tech-finance` (plus existing `owners`, `locations`)

### 3. Per-tab Save buttons
- Add a "Save Tab" button at the bottom of each tab content area
- Track dirty state per tab using a `dirtyTabs: Set<string>` state
- On Save: persist only that tab's fields to `meeting_edit_data` with the appropriate `data_type`
- Show success toast on save, disable button when no changes exist

### 4. Merge logic on load
- On page load, fetch API data first, then overlay all saved tab edits from Supabase
- Each tab's saved `data_json` is spread over the base `editedData` object
- Saved values always take precedence over API values

### 5. Field-to-tab mapping
Define which fields belong to which tab so that:
- Save only persists fields for that tab
- Dirty tracking knows which tab changed

### 6. Unsaved changes navigation guard
- Use `beforeunload` event and React Router `useBlocker` to warn when any tab has unsaved changes
- Show confirmation dialog before navigating away

### 7. Audit logging
- On each tab Save, call `logAuditTrail` with before/after values using the existing `computeFieldDiff` utility
- Record `data_type` (tab identifier), `modified_by` (userCode), and field-level diffs

## Files to Modify

1. **`src/hooks/useMeetingEditData.ts`** — Widen type from `any[]` to `any[] | Record<string, any>`, update save signature
2. **`src/pages/meetings/StartMeetingPage.tsx`** — Add per-tab hooks, dirty tracking, merge logic, Save buttons for IP tabs, navigation guard
3. **`src/components/meetings/EmployerApplicationEditForm.tsx`** — Add Save buttons per employer tab, expose per-tab save callbacks via props

## Technical Details
- No database migration needed — existing `meeting_edit_data` table structure supports this
- No new Supabase endpoints needed — uses existing `upsert` pattern
- The `data_type` column differentiates tab data (e.g., `ip-personal`, `er-basic-details`)
- Conversion logic (`handleApprove`) already merges `editedData` into the conversion payload, so persisted tab data flows through naturally

