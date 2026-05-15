## Diagnosis

- The Live backend is healthy and responding normally.
- The previous placeholder migration-ledger rows are no longer present in Live.
- Live is behind Test by one migration: `20260514150558_9babccfe-0509-42a6-9d4d-9da6daa44cc8.sql`.
- That pending migration only changes access policies for the `audit-signatures` storage bucket.
- It does **not** copy Test data to Live and does **not** modify business/application table rows.

## Answer to your question

Creating a brand-new Live environment is **not the safest recovery path** if the goal is to preserve existing Live database table data. A new Live backend would start as a separate environment and would require manually migrating all production data, files, secrets, auth users, and domain configuration. That creates a much higher data-loss and downtime risk than fixing the current publish gap.

The safer option is to keep the existing Live environment and publish only after verifying the one remaining pending migration.

## Recommended safe publish plan

### 1. Do not retry publish repeatedly

Stop repeated publish attempts until the exact failure reason is captured or the final verification below is complete.

### 2. Confirm the current Live state

Before the next publish attempt, verify:

- Live migration ledger has no placeholder rows.
- Live max migration is `20260513163056`.
- Test max migration is `20260514150558`.
- Live has not yet applied `20260514150558`.
- Live still has the old `audit_sig_public_read` policy and does not yet have the new authenticated-only policy.

I already checked these points and they match the expected state.

### 3. Treat the next publish as low data-risk

The next publish should only apply this pending backend change:

```text
Bucket: audit-signatures
Change: replace public read policy with authenticated read/insert/update policies
Business table data: untouched
Live database rows: not copied from Test and not overwritten
```

### 4. Publish once

Use:

```text
Publish → Update
```

Do this one time after the checks above. Do not run any manual SQL against business tables.

### 5. If it fails again, capture the exact publish error

If publishing still fails, the next step should be based on the exact publish dialog error, not another ledger-repair guess.

Immediately after the failed publish, capture:

- Full publish error text/screenshot.
- Time of failure.
- Whether the frontend build failed, migration failed, function deployment failed, or domain update failed.

Then I can inspect the relevant logs and produce the next targeted fix.

## Fallback plan if you still want a new environment

Use this only if Lovable support confirms the current Live environment cannot be recovered.

### New environment migration checklist

1. Export Live database schema and data.
2. Export Live storage files.
3. Record Live secrets and environment-specific settings.
4. Record authentication/domain/email settings.
5. Create the new environment.
6. Apply schema first.
7. Import data table-by-table with validation counts.
8. Import storage files.
9. Configure secrets and auth settings.
10. Smoke test login, protected pages, document downloads, payments, workflows, and public API endpoints.
11. Switch domain only after validation.
12. Keep the old Live environment read-only as rollback until sign-off.

This fallback is more complex and riskier than publishing the existing Live environment because it requires a controlled production data migration.

## Decision

Recommended path: **keep the current Live environment and publish once after verification**. A brand-new Live environment should be the last resort, not the primary fix.