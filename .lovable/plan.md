## Findings

The backend itself is healthy, and the Live migration ledger was backfilled: Live now has **1,042** migration ledger rows and max version **20260513163056**.

However, Publish is still failing at the database stage because the ledger repair only tells Publish to skip old migration files. It does **not** fix invalid leftover Live database objects/jobs that still differ from Test or can fail during publish validation.

Current concrete signals:
- Live has a broken scheduled email job referencing `pgmq.q_auth_emails` / `pgmq.q_transactional_emails`, but those queue tables are missing on Live.
- Live logs show repeated backend errors from that job.
- The Test environment has those queues and the same job works there.
- Live has many placeholder ledger rows, so future schema checks may still depend on direct Live repair instead of replaying old migrations.

## Fix plan

1. **Create a Live-only database repair script**
   - Recreate the missing email queues on Live using existing `pgmq.create(...)` calls.
   - Keep it idempotent so it can be safely re-run.
   - Do not change business data.

2. **Repair the scheduled email queue job on Live**
   - Replace the cron command so it points to the current Live backend URL/key context and only runs when the queues exist.
   - Add existence guards around queue reads to prevent `relation does not exist` errors from breaking the database logs again.

3. **Add verification queries to the same script**
   - Confirm `pgmq.q_auth_emails` and `pgmq.q_transactional_emails` exist.
   - Confirm the `process-email-queue` job is active and no longer references missing objects unsafely.
   - Confirm migration ledger max version remains `20260513163056`.

4. **Validate after the user runs it in Live**
   - Query Live to confirm queue tables and cron job are fixed.
   - Re-check recent Live database logs for publish-blocking errors.
   - Ask the user to run Publish → Update once more.

## Technical notes

- This must be applied directly to **Live** because normal migrations apply to Test first and Live only during Publish, but Publish is the failing path.
- The repair is non-destructive: no drops, truncates, or business-table changes.
- No RLS changes will be added, consistent with this project’s architecture rule.
- If Publish still fails after this repair, the next step is to capture the exact new Live database log entry immediately after the failed publish and repair that specific object in the same Live-only manner.