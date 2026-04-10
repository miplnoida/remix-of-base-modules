

# Plan: Session-Persistent Search Criteria and Results for C3 Screens

## Problem

On all three C3 contribution screens, when a cashier navigates away (e.g., to process a payment) and returns, all search filters and results are lost. The cashier must re-enter criteria and re-search, wasting time during sequential payment workflows.

## Approach: Client-Side `sessionStorage` with User-Scoped Keys

Backend persistence is unnecessary here. The data involved is:
- **Filters**: 5-6 string values (selected entity ID, period months/years) — a few hundred bytes
- **Results**: JSON array returned from external C3-Wizard API — typically under 50KB

Using `sessionStorage` is the right fit because:
- Automatically clears when the browser tab/session closes (no cleanup needed)
- Instant read/write with no network latency
- Naturally isolated per browser tab
- User isolation is achieved by including the authenticated user's ID in the storage key

No database tables, RPCs, or edge functions are needed.

## Implementation

### 1. Create a reusable hook: `src/hooks/useSessionPersistedSearch.ts`

A generic hook that:
- Accepts a `screenKey` (e.g., `'c3-contribution'`, `'nw-director'`, `'self-employed-c3'`)
- Reads the current user ID from `SupabaseAuthContext`
- Constructs a storage key: `c3_search_{screenKey}_{userId}`
- Provides `save(filters, results)` and `load()` methods, plus a `clear()` method
- On `save`: serializes filters + results to `sessionStorage`, completely replacing any prior data
- On `load`: deserializes and returns `{ filters, results } | null`

### 2. Update `C3ContributionList.tsx`

- Import the hook with `screenKey = 'c3-contribution'`
- On mount (`useEffect`): call `load()`. If data exists, restore `selectedCompanyId`, `periodFromMonth/Year`, `periodToMonth/Year` and `contributions` state
- In `handleSearch`: after successful API response, call `save()` with current filters and the fetched `contributions` array (full replacement, no merging)
- UI fields will naturally reflect restored state since they're bound to the same state variables

### 3. Update `NwDirectorList.tsx`

- Same pattern with `screenKey = 'nw-director'`
- Restore `selectedCompanyId`, period filters, and `contributions`

### 4. Update `SelfEmployedContributionList.tsx`

- Same pattern with `screenKey = 'self-employed-c3'`
- Restore `selectedSeId`, period filters, and `contributions`

## Technical Details

```text
sessionStorage key format:
  c3_search_{screenKey}_{userId}

Stored value (JSON):
{
  "filters": {
    "entityId": "123",
    "periodFromMonth": "Jan",
    "periodFromYear": "2026",
    "periodToMonth": "Mar",
    "periodToYear": "2026"
  },
  "results": [ ...contribution records... ],
  "timestamp": 1712764800000
}
```

- Each new Search click overwrites the entire stored value — no merging
- User ID from `useSupabaseAuth()` ensures isolation between users
- `sessionStorage` is tab-scoped, so different tabs are naturally isolated
- No expiration logic needed — `sessionStorage` auto-clears on tab close

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useSessionPersistedSearch.ts` | **New** — reusable hook for session-scoped search persistence |
| `src/pages/c3Management/c3Details/C3ContributionList.tsx` | Add restore-on-mount + save-on-search |
| `src/pages/c3Management/c3Details/NwDirectorList.tsx` | Add restore-on-mount + save-on-search |
| `src/pages/c3Management/c3Details/SelfEmployedContributionList.tsx` | Add restore-on-mount + save-on-search |

## Impact

- Zero backend changes — no migrations, no new tables
- No regression: search behavior unchanged; persistence is additive
- Cashiers can process multiple payments sequentially without re-searching
- Navigating away and returning restores the exact prior state
- New search fully replaces old data
- Different users on different sessions never see each other's data

