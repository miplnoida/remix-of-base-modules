## Findings

- The hosted backend is healthy.
- Test database has the previous view-security migrations applied, but Live does **not**.
- Live still has **45 `Security Definer View` errors** because those migrations have not reached Live.
- Live also still has a scheduled email queue job referencing missing queue table `pgmq.q_auth_emails`, but recent logs show no fresh failures in the last 6 hours.
- The security scan also reports `RLS Disabled in Public` and `Sensitive Columns Exposed` as errors. This conflicts with the project rule: **do not implement RLS; role-based security only**.

## Root cause

Publish is still failing because Live is being checked while it still contains blocking database security errors. The previous fix was applied in Test, but it has not been applied to Live because publish is failing before Live is fully updated.

## Plan to fix

1. **Apply the view security fix directly to Live**
   - Run the same `ALTER VIEW ... SET (security_invoker = true)` statements for the 45 Live views.
   - This does not change business data.
   - This clears the current `Security Definer View` blocker in Live.

2. **Handle RLS-related publish blockers without adding RLS**
   - Because the project explicitly forbids RLS, mark the RLS-disabled findings as an accepted architecture decision rather than implementing RLS.
   - Update the security memory to document that this app intentionally uses role-based security instead of RLS.

3. **Repair the orphaned queue dependency**
   - Inspect whether `pgmq.q_auth_emails` should exist.
   - If the email processor still expects it, recreate the missing queue safely.
   - If it is obsolete, update the scheduled job to stop referencing it.

4. **Verify Live again**
   - Re-run the Live database linter/security scan.
   - Confirm no remaining blocking publish errors.
   - Ask you to retry Publish once Live is clean.

## Technical note

The critical next step is a **Live database remediation**, not a frontend code change. The previous migration files exist locally/Test-side, but Live still shows the old view configuration.