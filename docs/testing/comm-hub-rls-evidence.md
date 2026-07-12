# Communication Hub — RLS Evidence Matrix (CH-RLS-EVIDENCE-1)

Companion to `docs/testing/comm-hub-permission-harness.md`. That harness
verifies **client-side route gates**. This document verifies the **database
RLS side**: even if a user bypasses the UI, RLS must prevent them from
reading Communication Hub evidence.

## Snapshot

Captured from `pg_policies` in the dev database on **2026-07-12**. The
authoritative machine-readable copy lives in
`src/__tests__/comm-hub/rls-evidence.test.ts` as `CH_RLS_MATRIX`.

### Roles under test

| Key            | Definition                                                       |
| -------------- | ---------------------------------------------------------------- |
| `admin`        | `is_admin(auth.uid())` OR `has_role(auth.uid(),'Admin')`         |
| `sysAdminView` | `has_permission(auth.uid(),'system_administration','view')`      |
| `commHubView`  | `has_permission(auth.uid(),'communication_hub','view')`          |
| `plain`        | authenticated, none of the above                                 |
| `anon`         | unauthenticated                                                  |
| `service_role` | edge functions / server-side writes                              |

### Access matrix

| Object                                          | admin | sysAdminView | commHubView | plain | anon | Notes                                        |
| ----------------------------------------------- | :---: | :----------: | :---------: | :---: | :--: | -------------------------------------------- |
| `communication_hub_trace`                       |   ✅  |      ✅      |     ✅      |  ❌   |  ❌  | `trace_admin_select`                          |
| `communication_hub_trace_step`                  |   ✅  |      ✅      |     ✅      |  ❌   |  ❌  | `trace_step_admin_select`                     |
| `communication_hub_trace_unified_view`          |   ✅  |      ✅      |     ✅      |  ❌   |  ❌  | Inherits trace policy                         |
| `communication_request`                         |   ✅  |      ✅      |     ⚠️      |  ⚠️   |  ❌  | ⚠️ = only own rows (`requested_by = auth.uid()`) or `notification_logs.view-logs` |
| `communication_message`                         |   ✅  |      ✅      |     ⚠️      |  ⚠️   |  ❌  | Reachable only through parent request         |
| `communication_recipient`                       |   ✅  |      ✅      |     ⚠️      |  ⚠️   |  ❌  | Same as message                               |
| `communication_delivery_attempt`                |   ✅  |      ✅      |     ⚠️      |  ⚠️   |  ❌  | Same as message                               |
| `communication_event_log`                       |   ✅  |      ✅      |     ⚠️      |  ⚠️   |  ❌  | Same as message                               |
| `communication_hub_control_audit`               |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  | Admin-only                                    |
| `communication_hub_control_settings`            |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  | Recipient allowlist / live gates              |
| `communication_hub_event_live_control`          |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  |                                               |
| `communication_hub_event_send_policy`           |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  |                                               |
| `communication_hub_event_review_policy`         |   ✅  |      ✅      |     ✅      |  ⚠️   |  ❌  | Non-sensitive config; authenticated read all. |
| `communication_hub_module_automation_setting`   |   ✅  |      ✅      |     ✅      |  ⚠️   |  ❌  | Non-sensitive config; write is service_role.  |
| `communication_hub_sender_profile`              |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  |                                               |
| `communication_hub_event_template_map`          |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  |                                               |
| `communication_hub_module_event_registry`       |   ✅  |      ❌      |     ❌      |  ❌   |  ❌  |                                               |

✅ = read allowed by policy ❌ = zero rows / permission error ⚠ = row-scoped, see note

### Service-role writes

Every table above uses `TO authenticated` for its policies (or dedicated
`service_role_all` policies where noted). `service_role` bypasses RLS,
so edge-function writes for enqueue/dispatch/retry are unaffected.

## Automated evidence (Vitest, always-on)

`src/__tests__/comm-hub/rls-evidence.test.ts` asserts:

1. Every listed object has RLS enabled.
2. No listed object is readable by `anon`.
3. Sensitive-evidence objects (trace / message / recipient / attempt /
   event / control-*) are **not** readable by a plain authenticated user.
4. Sensitive-evidence objects use a gated SELECT policy, never blanket
   `USING (true)`.
5. Admin retains read access on every listed object.

Refresh the snapshot when policies change:

```sql
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename like 'communication%'
order by tablename, policyname;
```

## Manual live-role verification (opt-in)

Automated live-role SELECT tests require a service-role key to seed and
switch between the four test users. That key is not available in Lovable
Cloud CI, so live-role checks are executed manually or via the opt-in
Playwright harness. For each role in `docs/testing/comm-hub-permission-harness.md`:

1. Log in as the role in a preview browser.
2. Open DevTools console and run:

   ```js
   const { data, error } = await window.supabase
     .from("communication_hub_trace")
     .select("trace_id")
     .limit(1);
   console.log({ role: "<role>", data, error });
   ```

3. Repeat for each sensitive-evidence object.
4. Expected results per the matrix above:
   - `admin`, `sysAdminView`, `commHubView` → non-empty (or empty because
     no rows exist yet), `error === null`.
   - `plain` → empty `data`, `error === null` (RLS filters silently).
   - `anon` → permission error or empty (route gate also redirects).

No email is sent, no live gate is toggled, no cron/bulk is enabled by
this procedure.

## NEEDS_REVIEW

- `communication_hub_event_review_policy` and
  `communication_hub_module_automation_setting` expose SELECT to every
  authenticated user via `USING (true)`. Rows contain policy metadata
  (event codes, review thresholds, automation levels) — no recipient PII
  or provider secrets — but a plain authenticated user can enumerate
  them. Business owner should confirm this is intentional (needed by
  business-module resolvers that run under the user's session) before
  tightening.
- The `communication_hub_trace_unified_view` inherits its parent table
  policy today, but the project has 2,357 pre-existing
  `security_definer_view` linter items. Out of scope per epic guardrails.

## Out of scope

- No live send, cron, bulk, live-gate, typed-confirmation, or route
  rename touched by this epic.
- Broader RLS refactors, `security_definer_view` cleanup, and
  cross-module policy audits are deferred.
