

# Fix: SE Wages Publishing Hits Wrong Endpoint

## Root Cause

The `se-wages-sync-publish` edge function constructs its target URL by **appending** `/sync-se-wages` to `C3_WIZARD_SYNC_URL`:

```
syncUrl.replace(/\/$/, '') + '/sync-se-wages'
```

But `C3_WIZARD_SYNC_URL` already points to the full config sync endpoint (e.g. `https://host/functions/v1/c3-config-sync`), so the result becomes `.../c3-config-sync/sync-se-wages` — which still routes to the config sync function and triggers its `config_periods`/`levy_slabs` validation.

## Fix

Two changes:

### 1. Edge function: `supabase/functions/se-wages-sync-publish/index.ts`
Replace the URL construction (line 41) to derive the base URL and append the correct path:
```typescript
// Instead of appending to the full config-sync URL,
// replace the last path segment with sync-se-wages
const seWagesSyncUrl = syncUrl.replace(/\/[^\/]*\/?$/, '/sync-se-wages');
```

### 2. Hook cleanup: `src/hooks/usePublishSEWages.ts`
Per the C3-Wizard team's confirmation, remove the unnecessary `config_periods` and `levy_slabs` fields from both the interface and payload — they are not needed by `/sync-se-wages`.

| File | Change |
|------|--------|
| `supabase/functions/se-wages-sync-publish/index.ts` | Fix URL construction to target `/sync-se-wages` instead of appending to config-sync URL |
| `src/hooks/usePublishSEWages.ts` | Remove `config_periods` and `levy_slabs` from interface and payload |

