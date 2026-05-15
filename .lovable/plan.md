## Current diagnosis

The earlier database issue has been repaired:

- Test migration ledger: 501 rows, latest `20260514150558`
- Live migration ledger: 501 rows, latest `20260514150558`
- Placeholder migration rows: 0 in both environments
- `audit-signatures` storage policies match in both environments
- Recent backend error logs show no database migration failures
- Live backend is responding normally

So the remaining Publish failure is no longer caused by migration ledger drift or the `audit-signatures` policy migration.

## Fix plan

1. **Capture the exact publish failure**
   - Ask for the current Publish dialog error text or screenshot, including the approximate failure time.
   - This is required because the database checks now show clean state, so the blocker is likely in another publish stage.

2. **Classify the failing publish stage**
   - Determine whether the failure is in:
     - frontend build/deploy
     - backend function deployment
     - secrets/config sync
     - domain/update routing
     - publish service state

3. **Run targeted checks only for that stage**
   - If frontend/build: inspect package/config and run the smallest relevant local verification.
   - If backend functions: inspect function logs and function config.
   - If secrets/config: verify required function secrets and environment config.
   - If domain/publish service: verify publish settings and project URLs.

4. **Apply the smallest safe fix**
   - Do not run more migration-ledger repair scripts now; they are already aligned.
   - Avoid any changes to Live application data or business tables.
   - Only change code/config if the captured error points to it.

5. **Retry Publish once after the targeted fix**
   - Use **Publish → Update** once after the specific blocker is fixed.
   - If it still fails with the same error, escalate using the exact error and timestamp because the backend database state is already clean.

## Why this is the safe path

Creating a new Live environment is not the right next step because it risks production data, users, storage files, secrets, and domain configuration. The current Live database is now aligned with Test, so the next fix must target the actual non-database publish error rather than continuing ledger repairs.