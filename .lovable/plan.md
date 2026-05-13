## Diagnosis

Do I know what the issue is? **Yes.** The previous fix only aligned the 25 newest pending migrations, but the backend ledger still has broad migration history drift:

- Test backend migration ledger has **500** applied migration versions.
- Local repo has **720** migration files.
- The Test ledger starts at `20260310181315`, while local files include many earlier baseline migrations from `202601...` and `202602...` that are not in the Test ledger.
- Most applied Test versions from March/April are off by 1–5 seconds from local filenames, for example:
  - Test: `20260310181315`
  - Local: `20260310181316_...sql`
- This is the same class of issue documented for Supabase/Lovable-style pipelines as “remote migration versions not found in local migrations directory”. It causes the publish pipeline to fail generically before browser DevTools shows a failed request.

Backend logs are clean, the published site is public, and the recent pending migrations are now aligned. The remaining blocker is the **full migration ledger mismatch**, not app runtime code.

## Fix plan

1. **Generate a complete migration reconciliation map**
   - Query the Test backend’s full `supabase_migrations.schema_migrations` version list.
   - Compare it against local migration files.
   - Match each Test version to the nearest local migration file timestamp where the drift is small and ordering is preserved.

2. **Rename all matched local migration files to exact Test ledger versions**
   - Rename March/April local migration files whose timestamp differs from Test by a few seconds.
   - Preserve file contents exactly.
   - Do not create schema changes or run migrations for this step.

3. **Handle local-only historical baseline files safely**
   - Keep early local-only baseline files intact unless they directly conflict with Test ledger reconciliation.
   - Do not delete migration files unless a concrete publish check requires it; deletion would be higher risk.

4. **Validate the ledger match**
   - Re-run a full comparison after renaming.
   - Confirm `remote_not_local = 0` for the Test backend ledger.
   - Confirm the 25 newest pending files remain aligned.

5. **Retry Publish → Update**
   - After `remote_not_local = 0`, retry publish.
   - If it still fails, the next remaining suspect is edge-function deployment fan-out; then we will isolate backend function deploy failures one function group at a time.

## Expected result

The publish pipeline should stop failing at migration reconciliation and proceed to apply the Live update.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>