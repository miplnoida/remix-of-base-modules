## Current findings

The database repair loop has gone as far as it can from code/tools:

- Test and Live migration ledgers now both show **501 rows**, latest `20260514150558`, with **0 synthetic/placeholder rows**.
- Local `supabase/migrations` also has **501 files**, matching the repaired ledgers.
- Recent Live database and function logs show **no migration/function errors**.
- Publish visibility is already **public**.
- Backend functions were redeployed successfully.
- The Vite/Supabase env packaging pattern is not currently the blocker: `.env` is not ignored by `.gitignore`, and the client reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` as expected.

The remaining concrete red flag is that **Test and Live are attached to different backend project identities**:

```text
Test backend: xynceskeiiisiefqlgxo
Live backend: pruvbfejdpodpalqafcu
Project config/source points to Test: xynceskeiiisiefqlgxo
```

That is a deployment-environment mapping problem. More SQL migration edits are unlikely to fix it and may make things worse.

## Fix plan

1. **Stop all further migration-ledger scripts**
   - Do not create or run more ledger backfills, placeholders, or reconciliation migrations.
   - Do not modify Live business tables or production data.

2. **Remove publish safety noise from the repo**
   - Remove the unused vulnerable dependency `expr-eval` from `package.json` and lockfiles if source imports confirm it is not used.
   - Keep package-manager state clean so publish is not blocked by dependency/security checks.

3. **Clear actionable publish security gate items only if safe**
   - Mark already-fixed `audit-signatures` finding as fixed has been done.
   - Review the remaining `ia-evidence` public bucket warning.
   - If code currently depends on public URLs, do not blindly make it private; instead either add authenticated read policy or leave it as a documented warning, depending on actual usage.

4. **Verify final local/source state**
   - Confirm:
     - local migration versions = Test ledger versions = Live ledger versions
     - no placeholders/synthetic migration rows
     - dependency lockfiles are consistent
     - edge functions deploy successfully
     - no recent backend errors

5. **Resolve the actual environment mapping blocker**
   - Because Test and Live are backed by different backend projects, the fix likely requires Lovable Cloud environment relink/reset at the platform level.
   - Safe path: keep the existing Live database/data intact, and ask Lovable support / Cloud team to relink Live publishing to the current Test backend project or repair the Live backend mapping.
   - Do **not** create a brand-new Live environment unless the user accepts a full production migration plan for database data, auth users, files, secrets, and domain cutover.

6. **Retry Publish once after source cleanup**
   - After removing dependency/security noise, retry **Publish → Update** once.
   - If it still fails with only the generic message, treat it as a platform-level environment mapping issue and escalate with the exact evidence above.

## Why this plan is safer

It avoids touching production business data and stops repeating failed database-ledger repairs. The remaining issue is now either a publish safety gate or the Test/Live backend identity mismatch, not an application schema migration problem.