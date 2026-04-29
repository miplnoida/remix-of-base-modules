## Problem

When editing Social Security (or any field) in **C3 Configuration → Configuration Details** for a period that started before the current month (e.g. 31 Dec 2024), clicking **Save Changes** triggers the split flow. Confirming the split toasts:

> cannot call jsonb_each_text on a non-object

DB logs confirm the error originates in:
```
PL/pgSQL function upsert_c3_config_with_split(...) line 74 at FOR over SELECT rows
```
which is `FOR k, v IN SELECT * FROM jsonb_each_text(p_values_json) LOOP …`.

### Root cause

`src/hooks/useC3ConfigLifecycle.ts` calls the RPC with:
```ts
p_values_json: JSON.stringify(params.valuesJson),
p_scope_filter: params.scopeFilter ? JSON.stringify(params.scopeFilter) : null,
```

The RPC parameter is typed `jsonb`. supabase-js already JSON-encodes the request body, so passing a pre-stringified value gets **double-encoded**: Postgres receives a JSON string scalar (e.g. `"{}"`) instead of an object. `jsonb_each_text` only works on JSON objects, hence the error.

### Secondary issue

`C3ConfigDetailsDialog.handleConfirmSplit` passes `valuesJson: {}`. Even after the encoding fix, the newly-created split period row in `c3_config_periods` would have **no detail values**, and the user's edits to SS / Levy / etc. (which live in the child table `c3_config_details`) would be silently lost. The split must also create a `c3_config_details` row for the new period using the edited `formData`.

## Plan

### 1. Stop double-encoding jsonb RPC parameters
File: `src/hooks/useC3ConfigLifecycle.ts`

- `useAnalyzeC3ConfigChange`: pass `p_scope_filter: params.scopeFilter ?? null` (object, not string).
- `useUpsertC3ConfigWithSplit`: pass `p_values_json: params.valuesJson ?? {}` (object).
- `useCreateC3ConfigPeriod`: pass `p_details_json: params.detailsJson ?? {}` (object).

This resolves the immediate `jsonb_each_text` error for every caller of these hooks (period, bonus, holiday, income code, levy tabs).

### 2. Carry edited form values into the split-created period
File: `src/components/admin/c3-period-config/C3ConfigDetailsDialog.tsx` (`handleConfirmSplit`)

After `upsertWithSplit` returns `{ success, split: true, new_id, truncated_id }`:

1. Insert a new row into `c3_config_details` for `config_period_id = new_id`, copying every editable field from `formData` (excluding `id`, `config_period_id`, audit columns), plus `created_by` / `modified_by` = current `userCode`.
2. Log the change via `logC3ConfigChange` with `action: 'CREATE'`, entity name showing the new period range, and `oldValue: originalFormData`, `newValue: formData` so the audit log shows what changed.
3. Invalidate `['c3-config-periods']` and `['c3-config-period']` queries (already done).

### 3. Verify other call sites are not broken by removing the stringify
The same hook is used by:
- `C3ConfigCreateDialog` → `useCreateC3ConfigPeriod` (already passes a plain object as `detailsJson`)
- Bonus / Holiday / Income-code / Levy tabs that call `useUpsertC3ConfigWithSplit`

All current callers pass plain JS objects, so removing `JSON.stringify` is safe and actually fixes them too — they would hit the same error if the user ever forced a split.

### 4. Manual test matrix

After deploy, on `/admin/c3-configuration`:

| Scenario | Expected |
|---|---|
| Edit SS rate on a period starting before current month → Save → Confirm split | Old period truncated to last day of previous month, new period from 1st of current month carries new SS rate, no toast error |
| Edit SS rate on a period starting **in** current month → Save | Direct update path (no split dialog), new value persisted |
| Create new period via "+ New Period" | Still works (uses `create_c3_config_period`) |
| Bonus / Holiday / Income-code / Levy tabs: edit a row whose `date_from` is before current month → Save → Confirm split | Split succeeds, no `jsonb_each_text` error |

### Technical summary

- 1 hook file edited (3 RPC calls): remove `JSON.stringify` for jsonb params.
- 1 dialog edited: extend `handleConfirmSplit` to mirror the edited details into `c3_config_details` for the new split period and audit-log it.
- No DB migration required — the RPC itself is correct; the bug is on the client side and in how the split dialog handed off form state.
