

## Diagnosis: Two stacked problems

### Real cause #1 — Wizard DB rejects `environment = "Production"`
Direct call to the Wizard reveals the actual per-row error (which our edge function is throwing away):
```
new row for relation "c3_site_settings" violates check constraint
"chk_site_settings_environment"
```
All 5 settings in our DB are seeded with `environment = "Production"`, but the C3-Wizard side's CHECK constraint on `c3_site_settings.environment` only accepts `'Dev' | 'Prod' | 'Both'` (note the short form `Prod`, not `Production`). Every row therefore fails on the Wizard side.

Why these 5 specifically: they are the only rows in our table whose `environment = 'Production'` — every other row (96 of them) uses `Dev`/`Prod`/`Both` and synced fine in earlier publishes.

### Real cause #2 — Our sync function masks the real error as "Unknown API error"
In `wiz-settings-sync/index.ts` `classifyResponse()` (lines 60–78):
- Wizard responds with `status: "error"` AND `data.results[].error` populated (per-row errors)
- Our classifier only looks at `apiRes.error` and `apiRes.data?.error` — it never reads `apiRes.data?.results[].error`
- So `globalError` falls through to the literal string `"Unknown API error"` and that's what gets stored in `sync_error` and shown in the response.

The fact that we're seeing this for all 5 rows but it looks like a "global" failure is because the Wizard returns `status: "error"` (not `partial`) when *every* row fails, even though it has rich per-row errors in `data.results`.

## Fix plan (2 changes, both small)

### A. Data fix — migration (1-liner, safe)
Update the 5 rows from `environment = 'Production'` → `environment = 'Prod'` to match the Wizard's accepted enum. This is the primary fix and immediately unblocks the publish.

```sql
UPDATE c3_site_settings
   SET environment = 'Prod', is_synced = false, sync_error = null
 WHERE environment = 'Production';
```

(Also clears the misleading "Unknown API error" message so the next publish reports cleanly.)

### B. Code fix — surface per-row errors (`wiz-settings-sync/index.ts`)
Update `classifyResponse()` + the three sync loops so that when Wizard returns `status: "error"` with `data.results`, we treat it like `partial` and read per-row `error` fields instead of writing the literal `"Unknown API error"`.

Concretely:
- In `classifyResponse`: if `status === "error"` AND `data?.results?.length > 0` → return `{ ok: true }` (let per-row logic decide).
- The existing per-row loops already handle `r.status === "error"` and store `r.error` — they just never run today because we short-circuit on the global error.

Result going forward: any Wizard validation failure will store the *real* error (e.g. the constraint name) in `sync_error`, not "Unknown API error".

### What I will NOT touch
- No changes to the Wizard side (their constraint stays as-is — `'Prod'` is the canonical short form).
- No changes to UI, no changes to the publish button, no changes to other settings.
- No changes to the 96 already-synced rows.

### Verification after deploy
1. Open `/c3-management/settings-configuration` → pending count drops from 5 to 0 after Publish.
2. Re-test by intentionally setting one row to an invalid value → confirm `sync_error` now shows the real Wizard message instead of "Unknown API error".

### Files touched
- 1 migration (5-row update)
- 1 edge function (`supabase/functions/wiz-settings-sync/index.ts` — ~10-line change in `classifyResponse`)

### Note on the team's confirmation
This issue is **unrelated** to the env-var/secret cleanup we just shipped — auth and URL resolution work correctly (the request reached the Wizard and got a structured error back). It's a pre-existing data/enum mismatch that was masked by the over-broad error classifier. Safe to confirm to the C3-Wizard team that our outbound side is clean; this is a separate fix on our side.

