

## Plan: Fix Employer Application Data Loading on Meeting Start Page

### Root Cause

Line 118 of `StartMeetingPage.tsx` uses `useExternalApplicationDetail(applicationReference)` for **all** meeting types. This hook hardcodes the proxy module to `insured-person-applications`. When the meeting type is `Employer-Registration`, the proxy calls the wrong external API module, gets no data (or wrong data), and the form renders empty.

The project already has a dedicated `useEmployerApplicationDetail` hook in `src/hooks/useEmployerApplicationDetail.ts` that correctly calls the `employer-applications` proxy module and normalizes the response into the `EmployerApplicationDetail` interface — the same hook used by the read-only detail page at `/online-applications/employer/:id`.

### Fix

**File: `src/pages/meetings/StartMeetingPage.tsx`**

1. **Import `useEmployerApplicationDetail`** from `src/hooks/useEmployerApplicationDetail.ts`.

2. **Add a second query hook** for employer data, gated on meeting type:
   ```
   const isEmployerMeeting = meetingType === 'Employer-Registration';
   
   // Existing IP hook — only enabled for non-employer meetings
   const { data: ipApplicationData, ... } = useExternalApplicationDetail(
     !isEmployerMeeting ? applicationReference : undefined
   );
   
   // New employer hook — only enabled for employer meetings  
   const { data: employerApplicationData, ... } = useEmployerApplicationDetail(
     isEmployerMeeting ? applicationReference : undefined
   );
   
   // Unified reference
   const applicationData = isEmployerMeeting ? employerApplicationData : ipApplicationData;
   const appLoading = isEmployerMeeting ? employerLoading : ipAppLoading;
   const appFetching = isEmployerMeeting ? employerFetching : ipAppFetching;
   ```

3. **Update `handleRefresh`** to call the correct refetch function based on meeting type.

4. **Move `isEmployerMeeting` declaration** above the hooks (currently it's at line 140, after the hooks). Since `meetingType` comes from `meetingData` which can be undefined initially, both hooks will be disabled until `meetingData` loads, then the correct one activates.

5. **No changes to `EmployerApplicationEditForm`** — it already accepts `data: Record<string, any>` and the `EmployerApplicationDetail` interface fields match what the form reads.

6. **No changes to the approval flow** — the `convertToEmployer` call at line 248 already passes `applicationData` which will now be the correctly-typed employer data.

### Edge cases handled

- **Invalid/missing reference**: Both hooks return `null` when `applicationReference` is undefined; the existing "Unable to load application data" alert renders.
- **Meeting type not yet loaded**: Both hooks are disabled (`enabled: false`) when `meetingType` is undefined, preventing premature API calls.
- **Other meeting types unaffected**: IP-Registration and Doctor-Registration continue using `useExternalApplicationDetail` as before.

### Files to modify

| File | Change |
|------|--------|
| `src/pages/meetings/StartMeetingPage.tsx` | Add `useEmployerApplicationDetail` import; add conditional hook call; unify `applicationData`/`appLoading`/`appFetching` references |

### No migration or new files needed

The existing `useEmployerApplicationDetail` hook, `proxy-api` edge function, and `EmployerApplicationEditForm` component are all already built and correct. This is purely a wiring fix in the page component.

