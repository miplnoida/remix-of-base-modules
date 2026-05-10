# Fix: C3 Configuration "Pending Changes" Indicator Never Triggers

## Root cause (confirmed against the live `c3_config_sync_log`)

The pending-change detector in `src/hooks/useC3ConfigPublish.ts` uses this line to compute `payload_hash`:

```ts
const payloadHash = btoa(JSON.stringify(payload)).slice(0, 64);
```

The serialized payload always starts with:

```
{"sync_version":"4.1","sync_timestamp":"2026-05-08T..."
```

After base64-encoding and slicing to **64 characters**, the resulting "hash" only encodes the first ~48 bytes of the JSON — i.e. just `{"sync_version":"4.1","sync_timestamp":"2026-05-...`. **None of the actual config data (periods, levy slabs, SE rates, bonus, holiday, income codes, etc.) ever influences the value.**

Verified with `SELECT DISTINCT LEFT(payload_hash, 64) FROM c3_config_sync_log` — only **5 distinct values exist across 35 sync rows**, and they differ only by `sync_version` and the month part of `sync_timestamp`. Every publish in May 2026 produced the identical "hash":

```
eyJzeW5jX3ZlcnNpb24iOiI0LjEiLCJzeW5jX3RpbWVzdGFtcCI6IjIwMjYtMDUt
```

### Why the UI always shows "Synced"

In `useC3SyncStatus`:

```ts
const hasPendingChanges = lastPublishedHash
  ? currentHash !== lastPublishedHash
  : Object.values(currentCounts).some(c => c > 0);
```

Within the same calendar month after the last successful publish, `currentHash === lastPublishedHash` → `hasPendingChanges = false` → the green **"Synced 08-05-2026"** badge is shown regardless of any edits or new rows in:

- SE Contribution Rates (the user's case: 10% → 11%)
- Period Configuration, Levy Slabs, Bonus/Holiday Policies & Exceptions
- Income Code Policies & Exceptions, Calculation Config, Filing Config
- Income Codes, Income Categories

So the symptom is **not** a missing trigger on the mutation side; mutations correctly invalidate `c3-sync-status`. The status query refetches, but the broken hash returns the same value, so the UI concludes "no changes".

A second latent issue: `sync_timestamp` is included in the hashed payload. Even if the truncation bug were fixed naively, the hash would change on every refetch (every 30 s) and the badge would always show "Pending". The timestamp must be excluded from hashing.

## Fix

In `src/hooks/useC3ConfigPublish.ts`, replace the hash computation in `buildSyncPayload()` with a proper content-only SHA-256:

1. Build a separate `hashableContent` object that contains only the config arrays (everything in `payload` **except** `sync_version` and `sync_timestamp`). `sync_version` is a code constant, not user data; `sync_timestamp` must never be in the hash.
2. Stringify with sorted object keys so cosmetic key-order differences from PostgREST don't produce false positives.
3. Hash with `crypto.subtle.digest('SHA-256', …)` and convert to a 64-char hex string. No truncation of source data.
4. Keep `payload` (the wire format sent to the edge function) unchanged so the C3-Wizard sync protocol is untouched.

```ts
// Stable JSON: sort keys recursively so PostgREST column order doesn't matter
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash only content — exclude sync_version (constant) and sync_timestamp (volatile)
const hashableContent = {
  config_periods: payload.config_periods,
  levy_slabs: payload.levy_slabs,
  bonus_policies: payload.bonus_policies,
  bonus_exceptions: payload.bonus_exceptions,
  holiday_policies: payload.holiday_policies,
  holiday_exceptions: payload.holiday_exceptions,
  calculation_configs: payload.calculation_configs,
  income_codes: payload.income_codes,
  income_categories: payload.income_categories,
  self_emp_contrib_rates: payload.self_emp_contrib_rates,
  income_code_policies: payload.income_code_policies,
  income_code_exceptions: payload.income_code_exceptions,
  filing_config_periods: payload.filing_config_periods,
};
const payloadHash = await sha256Hex(stableStringify(hashableContent));
```

Make `buildSyncPayload` `async` (already is) and `await` the hash call. Both call sites (`useC3SyncStatus` and `usePublishToC3Wizard`) already `await` it, so no signature change is needed.

## Behavior after the fix


| Scenario                                                                     | Before                           | After                                            |
| ---------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Edit SE rate 10 → 11, no publish                                             | Green "Synced …"                 | Red "Changes Pending Sync"                       |
| Add new levy slab / income code policy / period                              | Green "Synced …"                 | Red "Changes Pending Sync"                       |
| Refetch with no edits between publishes                                      | Green "Synced …"                 | Green "Synced …" (stable hash)                   |
| Cosmetic re-order from PostgREST / extra `modified_on` bump with same values | Could falsely flip on a real fix | Stays "Synced" (stable stringify + content-only) |
| Publish completes successfully                                               | Hash recorded but meaningless    | Hash recorded; next refetch matches → Synced     |


## Files changed

- `src/hooks/useC3ConfigPublish.ts` — replace `payloadHash` computation in `buildSyncPayload()`; add `stableStringify` and `sha256Hex` helpers.

## Out of scope (not changed)

- Mutation invalidation paths (already correct — `c3-sync-status` is invalidated by lifecycle hooks).
- Edge function `c3-config-sync-publish` and the sync-protocol payload shape.
- The `c3_config_sync_log.payload_hash` column (still text; new hashes are 64-char hex and fit fine).
- No DB migration needed. Existing log rows keep their old (broken) hashes; the next publish writes a correct hash and from that point comparisons work.
- No changes to host vs. satellite project layout, RLS, or any other module.  
  
  
Important note: make the icon on each sunced rows or non-synced rows to shpws the sttaus of the sync with the c3-wizard to know this row is still penind to sync with th c3-wizard.  
you just need to  add the small decent icons to know the admin about the sttaus of each rows that is being synced with the c3-wizard.