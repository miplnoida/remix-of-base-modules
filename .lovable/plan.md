## Plan: Fix Continuous Loading on IP Registration, Employer Registration, and C3 Management Pages

### Root Cause

The three affected pages (`IPRegistrationList`, `EmployerRegistrationList`, `C3Management`) execute database queries immediately on mount without waiting for the authentication session to be fully established. Although `ProtectedRoute` checks `isLoading`, the Supabase client session may not be fully ready when the first query fires, causing queries to fail silently or return empty results that leave the page in a perpetual loading state.

Specifically:

- **IPRegistrationList**: Uses raw `useEffect` + `fetchRecords` on mount — no auth gate
- **EmployerRegistrationList** (`useEmployerList` hook): Uses React Query without an `enabled` gate
- **C3Management** (`useC3Management` hook): Uses raw `useEffect` + `fetchRecords` on mount — no auth gate

### Fix

Gate all data-fetching in these pages/hooks on `isAuthReady && isAuthenticated` from `useSupabaseAuth()`, following the pattern already established in `useDynamicNavigation`.

### Step 1: Fix `useEmployerList` in `src/hooks/useEmployerRegistration.ts`

Add `useSupabaseAuth` import and gate both React Query calls with `enabled: isAuthReady && isAuthenticated`:

```typescript
const { isAuthReady, isAuthenticated } = useSupabaseAuth();

const { data: employers, isLoading, refetch } = useQuery({
  queryKey: ['er_master_list', activeTab],
  queryFn: async () => { ... },
  enabled: isAuthReady && isAuthenticated,  // ADD THIS
});

const { data: counts } = useQuery({
  queryKey: ['er_master_counts'],
  queryFn: async () => { ... },
  enabled: isAuthReady && isAuthenticated,  // ADD THIS
});
```

### Step 2: Fix `IPRegistrationList` in `src/pages/ip-registration/IPRegistrationList.tsx`

Add `isAuthReady` and `isAuthenticated` from `useSupabaseAuth()` and gate the `fetchRecords` and `fetchCounts` effects:

```typescript
const { isAuthReady, isAuthenticated } = useSupabaseAuth();

// Gate data fetching on auth readiness
useEffect(() => {
  if (!isAuthReady || !isAuthenticated) return;
  fetchRecords(appliedFilters, page, pageSize);
}, [page, pageSize, activeTab, appliedFilters, fetchRecords, isAuthReady, isAuthenticated]);

useEffect(() => {
  if (!isAuthReady || !isAuthenticated) return;
  fetchCounts();
}, [fetchCounts, isAuthReady, isAuthenticated]);

// Also gate the debounced search effect
useEffect(() => {
  if (!isAuthReady || !isAuthenticated) return;
  const timer = setTimeout(() => { ... }, 400);
  return () => clearTimeout(timer);
}, [searchText, isAuthReady, isAuthenticated]);
```

### Step 3: Fix `C3Management` in `src/pages/c3Management/C3Management.tsx`

Add `isAuthReady` and `isAuthenticated` from `useSupabaseAuth()` and gate the mount-time data fetch:

```typescript
const { isAuthReady, isAuthenticated } = useSupabaseAuth();

useEffect(() => {
  if (!isAuthReady || !isAuthenticated) return;
  getC3Statuses().then(setC3Statuses);
  getActiveProfiles().then(setProfilesList);
}, [isAuthReady, isAuthenticated]);

useEffect(() => {
  if (!isAuthReady || !isAuthenticated) return;
  fetchRecords({ ... });
}, [contributionType, searchParams, isAuthReady, isAuthenticated]);
```

### Files to modify


| File                                               | Change                                          |
| -------------------------------------------------- | ----------------------------------------------- |
| `src/hooks/useEmployerRegistration.ts`             | Add `enabled` gate to both `useQuery` calls     |
| `src/pages/ip-registration/IPRegistrationList.tsx` | Gate `useEffect` data fetches on auth readiness |
| `src/pages/c3Management/C3Management.tsx`          | Gate `useEffect` data fetches on auth readiness |


### No new files, no migrations

This is a wiring fix applying the same auth-gating pattern used by `useDynamicNavigation` to three ungated pages.  
  
Important Note: Why are these changes needed, and how was it working before? All the pages were working well two days ago. I want to know which functionality or change caused this error in the last 1–2 days, as it was working fine before.