

# Persistent Editable Locations & Dependants in Meeting Workbench

## Problem
When reviewing online applications at `/meetings/start/:id`, users can edit Locations (employer) and Dependants (IP) in-memory, but changes are **lost** when navigating away. The external API is re-fetched every time, overwriting edits.

## Architecture Decision: Use `meeting_edit_data` Table

Rather than overloading the existing `meetings.metadata` JSONB column (which stores meeting-level config), we create a dedicated table to store per-tab edited datasets. This keeps concerns separated and enables audit tracking.

```text
┌─────────────────────────┐
│   External API          │──(first load only)──▶ editedData state
└─────────────────────────┘
                                                       │
                                                  (user edits)
                                                       │
                                                       ▼
┌─────────────────────────┐                    ┌──────────────┐
│  meeting_edit_data      │◀──(auto-save)──────│  UI State    │
│  (Supabase table)       │──(reload on visit)─│  editedData  │
└─────────────────────────┘                    └──────┬───────┘
                                                       │
                                               (on Approve)
                                                       ▼
                                              Conversion RPCs
                                          (uses latest editedData)
```

## Changes

### 1. New Database Table: `meeting_edit_data`

```sql
CREATE TABLE public.meeting_edit_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,          -- 'locations' | 'dependants' | 'owners' etc.
  data_json JSONB NOT NULL DEFAULT '[]',
  original_api_json JSONB,         -- snapshot of original API data for audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  modified_by TEXT,
  UNIQUE(meeting_id, data_type)
);
```

- `data_type` allows extending to other tabs (owners, remarks) in the future
- `original_api_json` preserves the original API response for audit comparison
- `UNIQUE(meeting_id, data_type)` ensures one record per tab per meeting — upsert pattern

### 2. New Hook: `useMeetingEditData`

**File:** `src/hooks/useMeetingEditData.ts`

A reusable hook that:
- **Loads** saved data from `meeting_edit_data` for a given `meetingId` + `dataType`
- **Returns** `{ savedData, hasSavedData, save, isLoading, isSaving }`
- **`save(data, originalData, userCode)`**: Upserts to `meeting_edit_data` with the current array and original snapshot
- Uses React Query for caching with key `['meeting-edit-data', meetingId, dataType]`

### 3. Integration: Employer Locations Tab

**File:** `src/pages/meetings/StartMeetingPage.tsx` (or `EmployerApplicationEditForm.tsx`)

Modify the initialization flow:
1. On mount, call `useMeetingEditData(meetingId, 'locations')`
2. If `hasSavedData` → use `savedData` as initial `locations` in `editedData`
3. If no saved data → use API response (current behavior)
4. On every location add/edit/delete → call `save()` to persist immediately
5. Add a "Save Progress" button or auto-save on change (debounced)

The existing `saveLocation`, `confirmDeleteLocation`, `openAddLocation` functions in `EmployerApplicationEditForm.tsx` already update `onDataChange`. We wrap those to also persist.

### 4. Integration: IP Dependants Tab

**File:** `src/pages/meetings/StartMeetingPage.tsx` (InsuredPersonEditForm section)

Same pattern:
1. `useMeetingEditData(meetingId, 'dependants')`
2. If saved data exists → seed dependants from DB instead of API
3. On `saveDependant` / `confirmDeleteDependant` → persist to `meeting_edit_data`

### 5. Data Flow During Conversion

**No changes needed to conversion hooks.** Both `useConvertToIPRegistration` and `useConvertToEmployerRegistration` already consume from `editedData` (which merges API data + user edits). Since we're seeding `editedData` from persisted data on reload, the conversion automatically uses the latest user-modified state.

### 6. Initialization Logic (pseudocode)

```text
useEffect when applicationData loads:
  1. Check meeting_edit_data for 'locations' (or 'dependants')
  2. IF saved data exists:
       → setEditedData(prev => ({ ...prev, locations: savedData }))
       → Skip API data for this field
  3. ELSE:
       → Use applicationData.locations as-is (current behavior)
       → Optionally save original snapshot to original_api_json
```

## Files Modified

| File | Change |
|---|---|
| New migration SQL | Create `meeting_edit_data` table |
| `src/hooks/useMeetingEditData.ts` (new) | Reusable load/save hook for per-tab edited data |
| `src/components/meetings/EmployerApplicationEditForm.tsx` | Wire locations CRUD to auto-persist via hook |
| `src/pages/meetings/StartMeetingPage.tsx` | Wire dependants CRUD to auto-persist; seed from saved data on load |

## What Is NOT Changed
- Conversion RPCs — already consume `editedData`
- External API fetch hooks — still called, but data is overridden by saved edits when present
- Meeting scheduling, rescheduling, calendar — unaffected
- Document upload/verification — separate mechanism, unaffected
- Owners tab — not in scope (same pattern can be applied later)

