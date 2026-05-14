## Diagnosis

Do I know what the issue is? **Yes.** The hosted backend is healthy, but the project’s migration history is still inconsistent with the local migration folder:

- Test and Live backend migration ledgers both show **349 applied migrations**.
- Local repo has **725 migration files**.
- At least **317 applied backend migration versions are not present as exact local filenames**.
- Most mismatches are timestamp drift of 1–3 seconds, e.g. backend `20260112195500` vs local `20260112195501`.
- There are also backend-applied migration versions that do not have an obvious exact local counterpart in the current ordered set.

This is a publish blocker because the publish pipeline validates migration history before applying the Live update. Previous attempts only touched later migrations, but the mismatch starts from January 2026.

## Fix plan

1. **Create a complete backend-to-local reconciliation map**
   - Use the backend migration ledger as the source of truth.
   - Match each applied backend version to the correct local migration file by timestamp proximity and ordering.
   - Do this across the full 349 applied migrations, not only recent March/April files.

2. **Rename matched migration files to exact backend ledger versions**
   - Rename local migration filenames where the content corresponds to an applied backend migration but the timestamp differs.
   - Preserve SQL contents exactly.
   - Avoid schema/data changes; this is repository history reconciliation only.

3. **Handle unmatched historical versions safely**
   - For backend-applied versions with no safe local match, create placeholder/no-op migration files with the exact backend version so the publish validator can resolve the ledger.
   - Do not delete local-only migration files unless a concrete duplicate/conflict is found.

4. **Check edge-function deploy blockers**
   - Verify whether a Deno lockfile exists under the backend functions area.
   - If present and incompatible, remove/rename it because incompatible Deno lockfiles can fail backend function deployment during publish.

5. **Validate before asking you to retry publish**
   - Re-run the full local-vs-backend migration comparison.
   - Confirm `remote_not_local = 0` for the backend ledger.
   - Confirm no duplicate local migration timestamps exist.
   - Re-check backend logs for obvious remaining publish-time errors.

## Expected result

After the ledger reconciliation, publish should no longer fail at migration-history validation. If it still fails after this, the next likely blocker is a specific backend function deployment failure, which I will isolate by deploying functions in smaller groups.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>