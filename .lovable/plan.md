## Current diagnosis

- The hosted backend is responding normally.
- Local latest migration file is now aligned as `20260514150558_9babccfe-0509-42a6-9d4d-9da6daa44cc8.sql`.
- Test migration ledger currently has **501** rows, max version `20260514150558`.
- Live migration ledger currently has **849** rows, max version `20260513163056`.
- Live still has **500** `placeholder_synced_via_schema_script` rows in the migration bookkeeping table.
- The latest Test migration is **not yet applied on Live**.
- The latest pending migration only changes the `audit-signatures` storage access policies; it does **not** change business database tables or Live table data.
- Live still has the old `audit_sig_public_read` policy, while Test has authenticated-only policies.

## Goal

Publish Test to Live safely without affecting existing Live business data.

Live database data is not copied from Test during publish. The main risk here is migration bookkeeping mismatch, not data synchronization.

## Safety rules for this recovery

1. Do **not** modify application/business tables in Live.
2. Do **not** run destructive schema operations on Live data tables.
3. Do **not** delete, truncate, or update user/business data.
4. Only repair migration bookkeeping rows if the dry-run proves they are placeholder rows created by the previous sync attempt.
5. Wrap any Live bookkeeping repair script in a transaction with count checks, so it aborts automatically if the current Live state is different from expected.
6. Preserve an export of the Live migration ledger before any repair.

## Plan

### 1. Freeze changes and capture the exact publish failure

- Stop repeated publish retries until the migration ledger is repaired.
- Capture the exact publish dialog error if available.
- Confirm no new migration files were added after `20260514150558`.
- Confirm no backend function or schema change is pending outside the latest migration.

### 2. Create a read-only baseline report

Generate artifacts under `/mnt/documents/` before making any Live repair:

- `live_schema_migrations_before.csv`
- `test_schema_migrations_current.csv`
- `live_storage_policies_before.csv`
- `test_storage_policies_current.csv`
- `publish_recovery_dry_run_report.txt`

The dry-run report should include:

- Test migration count and max version.
- Live migration count and max version.
- Placeholder rows in Live.
- Versions present in Test but missing in Live.
- Versions present in Live placeholders but not in Test.
- Versions present in both but with mismatched migration names/metadata.
- Confirmation that pending migration `20260514150558` only affects `audit-signatures` policies.

### 3. Validate that the pending publish is non-destructive

Inspect migrations that Live has not applied yet.

Expected result:

- Only `20260514150558_9babccfe-0509-42a6-9d4d-9da6daa44cc8.sql` is pending.
- It only drops/recreates storage policies for `audit-signatures`.
- No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, destructive `ALTER COLUMN TYPE`, or business-table data update is pending.

If any destructive operation is found, stop and create a separate Live-data preservation plan before publishing.

### 4. Generate a Live-only migration-ledger repair script

Create a manual SQL script for Live only, for example:

- `live_publish_migration_ledger_repair.sql`

This script must only touch:

```text
supabase_migrations.schema_migrations
```

It must not touch:

```text
public.*
storage.objects
storage.buckets
auth.*
any business/application table
```

The repair script should:

- Begin a transaction.
- Verify Live currently has the expected placeholder count.
- Update placeholder rows that correspond to real Test migration versions so their bookkeeping matches Test.
- Remove only placeholder rows that are proven not to exist in the Test ledger and are safe bookkeeping noise.
- Preserve non-placeholder Live migration rows.
- Leave the latest migration `20260514150558` unapplied so Publish can apply it normally.
- Abort with a clear error if counts do not match the dry-run report.
- End with a verification query.

### 5. User runs the repair script manually on Live

Because normal migrations apply to Test first, this bookkeeping repair must be run directly against Live using:

```text
Cloud View → Run SQL → Live selected
```

The script should be reviewed before execution and should clearly state that it changes only migration bookkeeping, not application data.

### 6. Verify Live after the repair

After the script is executed, run read-only verification queries:

- Confirm placeholder mismatch rows are removed or corrected.
- Confirm business table row counts were not touched.
- Confirm Live still has the expected pre-publish policy state.
- Confirm the only remaining publish gap is the latest policy migration.

### 7. Publish to Live once

Run Publish → Update once after verification.

Expected publish behavior:

- Frontend deploys to Live.
- Backend functions deploy to Live if changed.
- The latest migration applies to Live.
- Live table data remains unchanged.
- `audit-signatures` policies become authenticated-only on Live.

### 8. Post-publish verification

After publish, verify:

- Live migration ledger includes `20260514150558`.
- Live `audit-signatures` policies match Test.
- `audit_sig_public_read` no longer exists.
- Authenticated insert/read/update policies exist.
- Login page loads.
- Main protected routes still load after login.
- No recent Live database errors appear in logs.

### 9. If publish still fails

Do not retry repeatedly.

Instead:

- Capture the exact publish error text.
- Re-check Live database logs immediately after the failed publish.
- Compare Live ledger against the baseline export.
- Restore only the migration bookkeeping from the saved baseline if the repair changed it unexpectedly.
- Create a new targeted plan based on the exact error.

## Why this protects Live data

- The repair targets only migration bookkeeping metadata.
- No application/business tables are updated or deleted.
- Publishing does not copy Test data into Live.
- The latest pending migration affects storage access policies only, not table data.
- The plan includes baseline exports and transaction checks before any Live repair.

<presentation-actions>
<presentation-open-history>View History</presentation-open-history>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>