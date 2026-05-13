## Plan to fix and publish

### What I found
- The published site is already public, and the Live backend is responding normally.
- Live is behind Test by many backend migrations; publishing likely fails while applying pending backend changes.
- The highest-risk pending migrations are not retry-safe if a previous publish partially applied them:
  - Medical benefit setup creates tables/indexes/triggers with plain `CREATE ...` statements.
  - Internal Audit risk categories adds a realtime publication entry without checking if it already exists.
- The affected Internal Audit and Compliance menu routes use embedded satellite modules. The current host keeps the sidebar/header around the iframe, but the embedded module readiness can leave a “Loading...” state if the satellite does not send the expected handshake.

### Changes I will make
1. **Make pending backend migrations publish-safe**
   - Update the medical benefit setup migration to use guarded table/index creation.
   - Make trigger creation idempotent by dropping/recreating triggers or checking existence before creation.
   - Wrap the realtime publication add for `ia_risk_categories` so repeated/partial publishes do not fail.
   - Keep the project rule unchanged: do not add RLS.

2. **Patch related retry hazards in pending migrations**
   - Review pending migrations since the last Live migration and fix only statements that can block a second publish after partial execution.
   - Preserve existing behavior and data model.

3. **Improve embedded Internal Audit / Compliance loading behavior**
   - Keep `/audit-hub/*` and `/compliance-hub/*` inside the protected app layout so the left navigation and header remain visible.
   - Replace the indefinite “Loading...” behavior with a clearer timeout/retry fallback for the embedded module.
   - Ensure the iframe container does not break out into a full-screen layout outside the host shell.

4. **Validate readiness**
   - Run targeted checks for migration safety patterns.
   - Verify Test/Live migration state after changes.
   - Confirm no backend errors are showing in recent logs.

5. **Publish to Live**
   - After fixes are implemented, use the Publish/Update flow to push the app live.
   - If the publish tool still reports a generic failure, the next isolated cause will be deployment volume from the large number of backend functions, and I’ll narrow it to the failing deploy step.

### Expected outcome
- Publish should be able to retry safely even if Live has partial backend changes from earlier attempts.
- Internal Audit should no longer remain stuck on an indefinite loading screen.
- Compliance & Enforcement should remain within the normal application shell with left navigation and header visible.