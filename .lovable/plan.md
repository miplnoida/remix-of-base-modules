## What I confirmed now

The repeated fixes have already cleared the normal publish blockers:

- **Migration ledgers match**: Test and Live both have `501` migration rows, first `20260310181315`, latest `20260514150558`, and `0` placeholder/synthetic rows.
- **Local migrations match**: `supabase/migrations` has exactly `501` valid migration files, no duplicate versions, no invalid names.
- **Backend logs are clean**: no recent Live database errors and no recent failing backend-function requests.
- **Publish visibility is not the issue**: the published site is public.
- **Dependency security gate is clean**: no high/critical dependency vulnerabilities after removing `expr-eval`.
- **Environment packaging is not the known `.env` issue**: `.env` exists, is tracked, and is not ignored; Vite reads the expected `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

The remaining hard evidence is:

```text
Test backend project: xynceskeiiisiefqlgxo
Live backend project: pruvbfejdpodpalqafcu
Source config/.env: xynceskeiiisiefqlgxo
```

That means the project source and Test backend point to one backend, while the Live publish target points to another. After the ledger/schema/security/package cleanup, this is the only concrete blocker left. More SQL scripts or migration rewrites are unlikely to fix it and risk damaging production bookkeeping again.

## Complete fix plan

1. **Freeze database repair attempts**
   - Do not run more migration backfills, placeholder inserts, ledger deletes, or schema sync scripts.
   - Do not create a new Live environment from inside the app flow.
   - Do not touch Live business tables or production data.

2. **Clean only package-manager ambiguity if approved**
   - The repo currently has both npm and Bun lockfiles (`package-lock.json`, `bun.lock`, `bun.lockb`) and no `packageManager` field.
   - This is not proven as the blocker, but it can add publish ambiguity.
   - Safe source-only cleanup option: add a package-manager declaration for Bun and remove the stale binary Bun lockfile if the publish pipeline does not require it.
   - Do not change dependencies or application logic.

3. **Prepare an escalation package for Lovable Cloud support**
   - Include exact evidence:
     - Lovable project ID: `455cbbae-c40e-4f3f-af49-d9ed99089948`
     - Test backend project: `xynceskeiiisiefqlgxo`
     - Live backend project: `pruvbfejdpodpalqafcu`
     - Source `.env` / `supabase/config.toml` target: `xynceskeiiisiefqlgxo`
     - Both ledgers now match: `501` rows, latest `20260514150558`, no placeholders.
     - Publish still fails with only generic `Publishing failed` after backend/source cleanup.
   - Request a platform-side repair: relink Live publishing to the current Test backend target, or repair the Live backend mapping while preserving existing Live data.

4. **Retry publish once only after platform repair**
   - Once Lovable Cloud confirms the Live/Test mapping is repaired, run one `Publish → Update`.
   - If it fails after mapping repair, then capture the precise failure timestamp and re-check logs for that single attempt.

## Why this is the safest complete fix

The current issue is no longer database schema drift. The remaining mismatch is at the Lovable Cloud publish-environment mapping layer. Code-level SQL changes cannot relink two backend projects and may risk Live production data or migration history.