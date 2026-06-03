
# Restore Internal Audit data from Live → Test (excluding logs)

## Goal
Re-populate the truncated **configuration** and **transactional** `ia_*` tables in **Test** by copying current rows from **Live**. Master tables are untouched. **Log-type tables are skipped per user instruction.**

## Excluded from restore (log tables — NOT copied)
- `ia_notification_logs`
- `ia_notification_queue`
- `ia_audit_execution_log`
- `ia_config_change_log` / `ia_plan_change_log` (any `*_change_log`)
- `ia_change_events`
- `ia_time_logs`
- `ia_approval_actions` (action log)
- Any other `ia_*` table whose name ends in `_log`, `_logs`, `_history`, `_queue`, or `_events`

Before execution I will list the exact matched table names from `information_schema` and confirm with you in the dry-run summary.

## Approach
For each in-scope `ia_*` table:
1. `supabase--read_query` (environment: production) → `SELECT * FROM public.<table>`
2. `supabase--insert` → batched `INSERT ... ON CONFLICT (id) DO NOTHING` into Test, wrapped with `SET session_replication_role='replica'`/`'origin'` so FK order and audit triggers don't fire.
3. After insert, advance identity sequences to `MAX(id)`.

Order: config tables → transactional parents → transactional children. Exact FK order derived from `information_schema` first.

## Caveats
1. Only rows currently in **Live** are restored. Any Test-only rows from before the truncate are unrecoverable.
2. Storage files (DMS attachments) do not sync between environments. Rows that reference storage paths will restore, but underlying files in Test storage stay missing until re-uploaded.
3. Schema must match between Test and Live for each table; if drift is detected I stop and report.
4. Large tables are batched (≈500 rows per insert statement).

## Deliverables
1. **Dry-run report**: per-table Live row count, Test row count, and Skip/Copy decision (with all log tables marked Skip).
2. Restore execution table-by-table with progress updates.
3. **Final report**: rows restored per table, sequences advanced, tables skipped (with reason).

## Confirm before I switch to build mode
1. Log-exclusion list above looks right? Anything to add or remove?
2. `ON CONFLICT (id) DO NOTHING` semantics OK (re-runnable; existing Test rows kept as-is)?
3. Accept that storage files are not copied — DB rows only?
