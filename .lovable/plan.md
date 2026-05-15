## What I found

Publish is most likely still failing because the **Live migration ledger is not actually aligned with Test**.

Current read-only checks show:

- **Live backend is healthy**.
- **Test ledger:** 501 migrations, latest `20260514150558`.
- **Live ledger:** 849 migrations, latest `20260513163056`.
- Live still has **500 synthetic/placeholder-style migration rows** with statement text like:
  `Live schema already existed before publish recovery; this row repairs migration bookkeeping only.`
- Live also has **349 Live-only historical ledger rows** that do not exist in Test.
- The only intended pending Test migration is still the `audit-signatures` storage policy change; it does **not** touch business/application table data.

So the previous repair did not make Live match Test closely enough for the publish pipeline. The issue is migration bookkeeping drift, not Live table data corruption.

## Safe fix plan

### 1. Do not create a new Live environment

A new Live environment is higher risk because it requires moving production database rows, auth users, storage files, secrets, and domain settings manually.

### 2. Generate a new guarded Live-only repair script

Create a script that touches **only**:

```text
supabase_migrations.schema_migrations
storage.objects policies for audit-signatures
```

It will not touch any `public.*` business tables or application data.

### 3. Apply the final pending storage policy manually in Live

The script will safely apply the same policy change as migration `20260514150558`:

- remove old public read policy for `audit-signatures`
- create authenticated read/insert/update policies

This is a storage access-rule change only.

### 4. Normalize Live migration ledger to match Test exactly

The script will then make Live’s migration ledger match Test’s 501 versions exactly:

- remove Live-only migration ledger rows not present in Test
- replace synthetic placeholder rows with the real Test migration metadata
- insert/confirm ledger row `20260514150558`

This changes deployment bookkeeping only; it does not drop tables, delete business rows, or copy Test data into Live.

### 5. Add strict safety guards

The script should abort unless all expected preconditions match:

- Live ledger has 849 rows before repair
- Test target list has 501 rows
- Live has the `audit-signatures` bucket
- Live currently lacks `20260514150558`
- only migration-ledger rows are affected

It should also verify after repair:

- Live ledger has exactly 501 rows
- Live latest version is `20260514150558`
- Live storage policies match Test for `audit-signatures`

### 6. Retry Publish once

After the script succeeds, retry:

```text
Publish → Update
```

At that point publish should not need to run database migrations, because Live’s ledger and final policy state will already match Test.

## If publish still fails after this

Then the blocker is likely outside the database migration path, such as frontend build/deploy, function deployment, secrets sync, or domain update. In that case, we need the exact publish dialog error text/screenshot and failure time to target that subsystem.