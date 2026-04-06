

## Plan: Fix C3 Management Page Infinite Loader

### Root Cause

The `C3Management` page calls `getC3Records()` which invokes the `get_c3_records_filtered` RPC. The RPC itself works correctly (23 rows, proper indexes, single function signature, RLS disabled). The infinite loader occurs when the Supabase client's HTTP request hangs without resolving or rejecting — the `await supabase.rpc(...)` never completes, so `setLoading(false)` in the `finally` block never executes.

Contributing factors:
1. **No request timeout** — `getC3Records` has no timeout; a stalled network connection keeps `loading: true` forever.
2. **Missing `fetchRecords` in useEffect deps** — The initial data-fetch `useEffect` (line 111) depends on `[contributionType, searchParams]` but not `fetchRecords`, meaning it can call a stale closure.
3. **No safety timer** — Unlike the sidebar (which has a 15-second safety fallback), this page has no mechanism to escape a hung request.

### Fix

**File: `src/services/c3Service.ts`** — Add a timeout wrapper around the RPC call in `getC3Records`:
- Wrap the `supabase.rpc` call in a `Promise.race` with a 15-second `AbortController`/timeout
- If the timeout fires, reject with a clear "Request timed out" error
- The existing `catch` block will handle it and return `{ data: [], total: 0, error }`, allowing the page to show "No records found" instead of an infinite spinner

**File: `src/hooks/useC3Management.ts`** — Add a safety timer in `fetchRecords`:
- After 20 seconds, if `loading` is still `true`, force it to `false` and set an error message
- This acts as a last-resort fallback independent of the service layer timeout

**File: `src/pages/c3Management/C3Management.tsx`** — Two fixes:
1. Add `fetchRecords` to the initial `useEffect` dependency array (line 128) to prevent stale closure issues
2. Add a retry button alongside the "Loading C3 records..." message that appears after 10 seconds, so users can manually retry without refreshing the page

### Files to modify

| File | Change |
|------|--------|
| `src/services/c3Service.ts` | Add 15s timeout to `getC3Records` RPC call |
| `src/hooks/useC3Management.ts` | Add 20s safety timer in `fetchRecords` |
| `src/pages/c3Management/C3Management.tsx` | Fix `useEffect` deps; add timeout retry UI in loading state |

