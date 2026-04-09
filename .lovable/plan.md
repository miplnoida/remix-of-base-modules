

# Persist Owners Tab Data (Mirror Locations Pattern)

## Current State

**Locations tab** — fully persistent:
1. `useMeetingEditData(meetingId, 'locations')` hook loads saved data on mount
2. On initialization, `savedLocations` overlays the API data if present
3. Every add/edit/delete auto-saves via `saveLocationsEdit()` in the `onDataChange` callback

**Owners tab** — NOT persistent:
- No `useMeetingEditData` hook for `'owners'`
- No seeding from saved data on revisit
- No auto-save on change
- All owner edits are lost on page refresh

## Changes

### File: `src/pages/meetings/StartMeetingPage.tsx`

Three additions, mirroring the exact locations pattern:

**1. Add persistence hook** (after the locations hook ~line 130):
```typescript
const {
  savedData: savedOwners,
  hasSavedData: hasPersistedOwners,
  isLoading: ownersEditLoading,
  save: saveOwnersEdit,
} = useMeetingEditData(isEmployerMeeting ? meetingId : undefined, 'owners');
```

**2. Seed from saved data on load** (in the initialization `useEffect` ~line 196):
- Add `ownersEditLoading` to the loading gate
- Add overlay: `if (isEmployerMeeting && hasPersistedOwners && savedOwners) { merged.owners = savedOwners; }`
- Add new state variables to the `useEffect` dependency array

**3. Auto-persist on change** (in the `onDataChange` callback ~line 669):
```typescript
if (isEmployerMeeting && Array.isArray(newData.owners)) {
  const originalOwners = applicationData ? (applicationData as any).owners : undefined;
  saveOwnersEdit(newData.owners, originalOwners, userCode || undefined).catch(console.error);
}
```

No new tables, no schema changes — the existing `meeting_edit_data` table supports arbitrary `data_type` values.

| File | Action | Purpose |
|---|---|---|
| `src/pages/meetings/StartMeetingPage.tsx` | Edit | Add owners persistence hook, seed on load, auto-save on change |

