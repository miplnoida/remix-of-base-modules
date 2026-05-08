## Context

The latest C3 Publish in the database log succeeded at 06:37 UTC today. There are no edge-function logs and no `c3_config_sync_log` rows after that, which means the most recent click is failing **before** the request reaches the `c3-config-sync-publish` edge function (i.e. the failure is happening client-side while building the payload or invoking the function). The toast in `usePublishToC3Wizard` only ever surfaces `error.message`, so a vague `"Publishing failed"` string suggests the underlying error is being swallowed or rewritten somewhere.

## Goals

1. Surface the **actual** root cause to both the user (toast) and developer (console + sync log).
2. Apply the fix once the cause is known.
3. Make sure a future failure can never appear as an opaque `"Publishing failed"` again.

## Plan

### 1. Capture the real error (no behaviour change)
- In `src/hooks/useC3ConfigPublish.ts` → `usePublishToC3Wizard`:
  - Wrap `buildSyncPayload()` in its own try/catch and rethrow with a tagged prefix `[payload_build] <message>` so a payload-build failure is distinguishable from a Wizard-side failure.
  - `console.error('[C3 Publish] failure:', error)` inside `onError` so the browser console always shows the full error object/stack.
  - Persist a row in `c3_config_sync_log` with `status='failed'` even when the failure happens **before** the edge function call, so the Publish History tab records the attempt.
- In `supabase/functions/c3-config-sync-publish/index.ts`:
  - Already returns `{ status:'error', error_type, error }` on every branch; verify the message is propagated verbatim into the toast (it is — no change needed beyond the new `[payload_build]` tag above).

### 2. Reproduce with the user
- Ask the user to click Publish once more after step 1 ships. The toast will now show one of:
  - `[payload_build] ...` → fix is in our React code or local Supabase data.
  - `[wizard_error] ...` → fix belongs to C3-Wizard (already documented in `docs/C3_WIZARD_REQUEST_FILING_CONFIG_PERMISSION_FIX.md`).
  - `[network_error] ...` → check `C3_WIZARD_BASE_URL` in `c3_site_settings`.
  - `[invalid_response] ...` → Wizard endpoint returned non-JSON.
  - `[internal_error] ...` → unhandled exception in the edge function.

### 3. Apply the targeted fix
Based on what step 2 reveals:

| Symptom | Action |
|---|---|
| Missing/renamed column on a source table (e.g. new field on `c3_filing_config_periods`) | Update `buildSyncPayload` select / payload mapping. |
| RLS blocking a `select` in `buildSyncPayload` for current user | Add a permissive read policy or tighten the role check. |
| Wizard permission still missing on `wiz_c3_filing_config_periods` | The blocker doc is already filed; nudge the Wizard team. |
| `OUTBOUND_SYNC_API_KEY` / `C3_WIZARD_BASE_URL` not set in `c3_site_settings` for the active environment | Restore the rows in Settings → Site Settings. |

### 4. Verify
- Click Publish → expect success toast with full counts and the header badge to flip to **Synced {date}**.
- Confirm a new `success` row in the Publish History tab.
- Confirm the latest entry in `c3_config_sync_log` matches.

## Files likely to change
- `src/hooks/useC3ConfigPublish.ts` (better error surfacing + always-log failed attempts)
- Possibly `supabase/functions/c3-config-sync-publish/index.ts` (only if step 2 shows an unhandled branch)

## Out of scope
- Any change to the C3-Wizard side (tracked separately in `docs/C3_WIZARD_REQUEST_FILING_CONFIG_PERMISSION_FIX.md`).
- C3 configuration data itself.
