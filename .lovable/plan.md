## Findings

- The previously leaked key `uiop906754drd35fvg` is no longer present anywhere in the repo.
- The current security result still contains a stale old finding named `wiz_hardcoded_api_key`, pointing to files that no longer contain that key.
- Live backend health is OK.
- Fresh Live diagnostics show the likely publish blocker is now database security linting: **45 `Security Definer View` ERRORs** plus many warnings.
- Live database logs also show a recurring background job error: `relation "pgmq.q_auth_emails" does not exist`. This may not be the publish blocker, but it should be repaired because it is continuously failing in Live.

## Plan

1. **Clear the stale hardcoded-key finding**
   - Mark the old `wiz_hardcoded_api_key` finding as fixed, because repo search confirms zero remaining matches for the leaked literal.

2. **Fix Live publish security errors**
   - Add a database migration that changes the affected public views to use `security_invoker = true`.
   - Target the 45 public views currently reported as `Security Definer View` issues, including the dashboard and compliance views returned by the Live inspection.
   - Keep this as a schema/security-hardening migration only; no business data changes.

3. **Repair the failing Live email queue job**
   - Inspect the scheduled job that references `pgmq.q_auth_emails`.
   - Either recreate the missing queue dependency or disable/replace the orphaned job if the queue is no longer used.
   - Avoid touching unrelated notification logic.

4. **Re-run verification**
   - Re-run the security scan/linter.
   - Confirm the hardcoded key finding is fixed.
   - Confirm `Security Definer View` ERRORs are cleared or reduced to non-blocking warnings.
   - Ask you to retry Live publish.

## Technical notes

- No frontend UI changes are required.
- No RLS implementation will be added.
- The fix is focused on publish blockers, not the full backlog of all 1,600+ linter warnings.