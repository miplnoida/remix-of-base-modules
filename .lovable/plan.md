## Diagnosis

Publish is failing at the database/migration stage because the migration bookkeeping is inconsistent between Test, Live, and the local migration files.

Current findings:
- **Test backend is at 501 migration records**, max version `20260514150558`.
- **Live backend is still over-backfilled at 1,042 migration records**, max version `20260513163056`.
- Live still contains hundreds of `placeholder_synced_via_schema_script` rows from the earlier backfill, so the previous cleanup has not been applied successfully to the current Live state.
- The latest security migration is also misaligned locally: the backend ledger records `20260514150558`, while the file on disk is named `20260514150602_9babccfe-0509-42a6-9d4d-9da6daa44cc8.sql`.
- Test has the new `audit-signatures` authenticated-only storage policies, but Live still has the old public policies, confirming the latest migration has not reached Live.

## Fix plan

1. **Align the local migration filename with Test**
   - Rename the latest security migration file from:
     - `20260514150602_9babccfe-0509-42a6-9d4d-9da6daa44cc8.sql`
   - To:
     - `20260514150558_9babccfe-0509-42a6-9d4d-9da6daa44cc8.sql`
   - This makes the local migration file match the version already applied in Test.

2. **Generate a new Live-only cleanup SQL artifact**
   - Build the script from the **current Test ledger**, not from old local migration files.
   - The script will delete only Live rows where:
     - `name = 'placeholder_synced_via_schema_script'`
     - and the version is **not present in Test**
   - It will not touch business tables, app data, real migration rows, queues, cron jobs, users, or storage files.

3. **Have you run the cleanup script in Live**
   - The script must be run manually in **Cloud View → Run SQL → Live selected**.
   - This cannot be done through a normal migration, because normal migrations apply to Test first and only reach Live through Publish.

4. **Verify Live after cleanup**
   - Confirm Live ledger drops from `1,042` to the expected pre-publish state.
   - Confirm the email queues and `process-email-queue` cron job remain intact.
   - Confirm Live is still missing only the latest Test migration so Publish can apply it normally.

5. **Retry Publish → Update**
   - Publish should then apply the latest `audit-signatures` policy migration to Live.
   - After publish, verify Live ledger reaches `501` and Live storage policies match Test.

6. **If it still fails**
   - Capture the exact Publish dialog error and inspect Live backend logs again before making any further repair.

<presentation-actions>
<presentation-open-history>View History</presentation-open-history>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>