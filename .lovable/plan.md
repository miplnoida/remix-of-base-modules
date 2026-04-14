

# Fix: NWD Payment Sync — `is_for_director` Sent as String Instead of Boolean

## Root Cause

The `sync-c3-payment` edge function sends `is_for_director: "true"` (a **string**) instead of `is_for_director: true` (a **boolean**).

This happens because the payload is typed as `Record<string, string | undefined>` (line 185), forcing all values to strings. When `is_for_director = "true"` reaches C3-Wizard, it fails the boolean check and defaults to searching for standard ER contributions — which don't exist at those schedule numbers — causing the error:

> "No submitted contribution found for the given period and schedule"

## Fix

**File:** `supabase/functions/sync-c3-payment/index.ts`

1. **Remove `is_for_director` from the string-typed `payload` object** (lines 197-200). Instead, add it directly to the `cleanPayload` object (which is `Record<string, unknown>`) as a proper **boolean `true`**:

```typescript
// Line ~235, after cleanPayload is built:
if (header.is_for_director) {
  cleanPayload.is_for_director = true;  // boolean, not string
}
```

2. **Delete the old string assignment** at lines 197-200 that sets `payload.is_for_director = "true"`.

This ensures the JSON body sent to C3-Wizard contains `"is_for_director": true` (boolean), matching the required contract from the SSB Admin team's specification.

## What Changes

| File | Change |
|------|--------|
| `supabase/functions/sync-c3-payment/index.ts` | Move `is_for_director` from string payload to `cleanPayload` as boolean `true` |

## What Stays Unchanged

- All other payload fields remain as-is
- Retry logic, logging, idempotency checks — untouched
- Regular ER and SE sync flows — unaffected (the flag is only added when `header.is_for_director` is truthy)
- No database or frontend changes needed

## After Deploy

The two failed payments (Schedule 3 and Schedule 6 for March 2026, employer 658852) can be retried via the existing Resync button in the UI.

