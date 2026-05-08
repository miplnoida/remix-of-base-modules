## Context

C3-Wizard team confirmed v4.1 schema parity:
- All audit columns (`created_by`, `modified_by`, `updated_by`) widened from `VARCHAR(5)` → `VARCHAR(50)` on `wiz_c3_config_periods`, `wiz_c3_config_details`, `wiz_levy_slabs`, `wiz_levy_slab_details`.
- New table `wiz_c3_filing_config_periods` accepts our `filing_config_periods[]` payload with proper `UUID`/`DATE`/`TIMESTAMPTZ`/`VARCHAR(50)` types.
- Last publish succeeded end-to-end.

Our side currently has two leftover items from the debugging session:
1. **Diagnostic logging** in `supabase/functions/c3-config-sync-publish/index.ts` (`diagOver5` helper logging every Period field >5 chars) — was added only to identify the offending column. No longer needed.
2. **Audit-field truncation to 5 chars** in `src/hooks/useC3ConfigPublish.ts` (`AUDIT_FIELDS` mirror-truncate) — was a defensive workaround. With Wizard now at `VARCHAR(50)`, this destroys real `user_code` values (e.g., `SAdmin` → `SAdmi`, `SYSTEM` → `SYSTE`) and breaks audit-trail accuracy on the Wizard side.

## Plan

### 1. Remove diagnostic logging
File: `supabase/functions/c3-config-sync-publish/index.ts`
- Delete the `diagOver5` helper and the two `[period-diag]` log loops over `payload.config_periods` and `payload.filing_config_periods`.
- Keep the existing success/error logs untouched.

### 2. Relax audit-field truncation from 5 → 50 chars
File: `src/hooks/useC3ConfigPublish.ts`
- In `buildSyncPayload()`, change the `AUDIT_FIELDS` truncation from `slice(0, 5)` to `slice(0, 50)` so full `user_code` values (`SAdmin`, `SYSTEM`, etc.) are preserved end-to-end.
- This matches our master `user_code VARCHAR(50)` standard and the Wizard's new column width.

### 3. Update Wizard requirements doc
File: `docs/C3_WIZARD_SYNC_ENDPOINT_UPDATE_REQUIRED.md`
- Mark the `VARCHAR(5)` issue as **Resolved in Wizard v4.1**.
- Record the confirmed schema (audit columns at `VARCHAR(50)`, `wiz_c3_filing_config_periods` shape) for future reference.
- Note that no further Wizard-side schema changes are required for the current sync protocol.

### 4. Verify
- Trigger **Publish to C3-Wizard** once.
- Confirm `c3_config_sync_log.status = 'success'` and the toast shows full counts including `filing_config_periods`.
- Spot-check Wizard-side audit columns now show `SAdmin`/`SYSTEM` (not `SAdmi`/`SYSTE`) on the latest sync.

## Out of scope
- Field-level change tracking on the 6 new tables — that's tracked separately in `docs/C3_WIZARD_FIELD_LEVEL_CHANGE_TRACKING.md` and is a Wizard-side task.
- Any DB migration on our side (none required).
- UI changes.

## Files touched
- `supabase/functions/c3-config-sync-publish/index.ts` — remove diagnostic logging.
- `src/hooks/useC3ConfigPublish.ts` — change audit truncation 5 → 50.
- `docs/C3_WIZARD_SYNC_ENDPOINT_UPDATE_REQUIRED.md` — mark resolved, record final schema.
