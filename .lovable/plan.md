## What I found

The remaining publish blocker is no longer a simple Live-only mismatch.

- Live backend is healthy.
- Dependency metadata is consistent.
- No `deno.lock` blocker exists.
- Function folders/config look structurally valid; no broken relative imports found.
- Active local migrations currently match Live exactly: `349 / 349`.
- But active local migrations do not match Test at all: Test has `500` applied versions and the active folder has `0` overlap with them.

That means the repository is now aligned to Live but disconnected from Test. Since publish uses the Test state to promote changes to Live, this can still fail before or during backend reconciliation.

## Exact fix plan

1. **Create a unified no-op migration baseline**
   - Build the union of both migration ledgers:
     - Live: `349` versions
     - Test: `500` versions
   - Keep every version represented in `supabase/migrations/`.
   - Replace active migration SQL with safe no-op reconciliation files for both ledgers.
   - Archive all historical real SQL files outside the active migration folder.

2. **Why this is different from previous attempts**
   - Previous Test-aligned attempts left real, non-idempotent migration SQL active, so Live could try to replay conflicting schema changes.
   - Previous Live-only cleanup fixed Live history but broke Test history.
   - The new approach makes both histories present and safe, so publish can mark missing versions without replaying risky schema SQL.

3. **Validate both environments**
   - Confirm local active versions cover all Test versions: `test_remote_not_local = 0`.
   - Confirm local active versions cover all Live versions: `live_remote_not_local = 0`.
   - Confirm no duplicate migration timestamps.
   - Confirm all active migrations are no-op reconciliation files.
   - Confirm no `deno.lock` under `supabase/` or `supabase/functions/`.

4. **Check remaining publish blockers after migration reconciliation**
   - Re-check function deployment structure.
   - Re-check package lock consistency.
   - Review security findings marked as `error`, because the publish dialog may block on these even if migrations are fixed.

5. **Retry Publish → Update**
   - After validation, retry publish.
   - If it still fails, the remaining cause is likely a platform-side publish/security gate rather than project migration SQL; at that point the exact publish dialog error text will be needed to isolate the final blocker.

## Scope

This plan does not change app logic, user data, authentication, or database schema. It only makes the repository migration history safe for the publish pipeline.