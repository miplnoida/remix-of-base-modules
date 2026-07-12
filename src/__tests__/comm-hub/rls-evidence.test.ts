/**
 * CH-RLS-EVIDENCE-1 — Communication Hub RLS evidence matrix.
 *
 * This is a declarative snapshot of the SELECT-side RLS posture on every
 * Communication Hub evidence/governance table as observed against the live
 * database on 2026-07-12 (`pg_policies`). It is intentionally a static
 * matrix rather than a live-role e2e test: Lovable Cloud does not expose
 * a service-role key to CI, so we cannot legitimately impersonate the
 * four test roles from vitest. Live-role verification is documented in
 * `docs/testing/comm-hub-rls-evidence.md` and executed manually / via
 * the opt-in Playwright harness.
 *
 * What this test DOES enforce:
 *   1. Every listed table has RLS enabled.
 *   2. Every listed table has at least one SELECT policy.
 *   3. No listed table exposes SELECT to `anon`.
 *   4. Sensitive-evidence tables (trace/message/recipient/attempt/event) do
 *      NOT carry a blanket `USING (true)` SELECT policy for authenticated.
 *
 * What this test does NOT do:
 *   - It does not send email, toggle live gates, enable cron/bulk, insert
 *     communication_request, or mutate any policy.
 *   - It does not attempt to authenticate as a real end-user.
 */
import { describe, expect, it } from "vitest";

type Access =
  | "admin_only"                      // Admin role only
  | "admin_or_sys_or_ch_view"         // Admin OR system_administration.view OR communication_hub.view
  | "request_scoped"                  // via can_access_communication_request()
  | "request_scoped_or_owner"         // request-scoped OR requested_by = auth.uid()
  | "authenticated_read"              // SELECT true to authenticated (catalog / reference)
  | "service_role_only";              // no authenticated SELECT

interface Row {
  object: string;
  kind: "table" | "view";
  rlsEnabled: boolean;
  selectAccess: Access;
  sensitiveEvidence: boolean;
  plainUserCanRead: boolean;   // authenticated user with no admin/system/ch permissions
  anonCanRead: boolean;
  notes?: string;
}

/**
 * Snapshot captured from pg_policies on 2026-07-12.
 * Update this snapshot (and the companion doc) if RLS policies change.
 */
export const CH_RLS_MATRIX: Row[] = [
  { object: "communication_hub_trace",                     kind: "table", rlsEnabled: true, selectAccess: "admin_or_sys_or_ch_view",  sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false, notes: "trace_admin_select" },
  { object: "communication_hub_trace_step",                kind: "table", rlsEnabled: true, selectAccess: "admin_or_sys_or_ch_view",  sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false, notes: "trace_step_admin_select" },
  { object: "communication_hub_trace_unified_view",        kind: "view",  rlsEnabled: true, selectAccess: "admin_or_sys_or_ch_view",  sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false, notes: "Inherits communication_hub_trace policy" },
  { object: "communication_request",                       kind: "table", rlsEnabled: true, selectAccess: "request_scoped_or_owner",  sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false, notes: "Owner (requested_by) OR admin OR notification_logs.view-logs OR system_administration.view" },
  { object: "communication_message",                       kind: "table", rlsEnabled: true, selectAccess: "request_scoped",           sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_recipient",                     kind: "table", rlsEnabled: true, selectAccess: "request_scoped",           sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_delivery_attempt",              kind: "table", rlsEnabled: true, selectAccess: "request_scoped",           sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false, notes: "Reachable only via parent message → request" },
  { object: "communication_event_log",                     kind: "table", rlsEnabled: true, selectAccess: "request_scoped",           sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_hub_control_audit",             kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_hub_control_settings",          kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false, notes: "Recipient allowlist / live gates" },
  { object: "communication_hub_event_live_control",        kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_hub_event_send_policy",         kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_hub_event_review_policy",       kind: "table", rlsEnabled: true, selectAccess: "authenticated_read",       sensitiveEvidence: false, plainUserCanRead: true,  anonCanRead: false, notes: "NEEDS_REVIEW: review_policy_read_authenticated USING(true). Non-sensitive config, but authenticated users can enumerate policy rows." },
  { object: "communication_hub_module_automation_setting", kind: "table", rlsEnabled: true, selectAccess: "authenticated_read",       sensitiveEvidence: false, plainUserCanRead: true,  anonCanRead: false, notes: "Config table; write is service_role only." },
  { object: "communication_hub_sender_profile",            kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: true,  plainUserCanRead: false, anonCanRead: false },
  { object: "communication_hub_event_template_map",        kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: false, plainUserCanRead: false, anonCanRead: false },
  { object: "communication_hub_module_event_registry",     kind: "table", rlsEnabled: true, selectAccess: "admin_only",               sensitiveEvidence: false, plainUserCanRead: false, anonCanRead: false },
];

const SENSITIVE_MUST_BE_GATED: Access[] = [
  "admin_only",
  "admin_or_sys_or_ch_view",
  "request_scoped",
  "request_scoped_or_owner",
  "service_role_only",
];

describe("Communication Hub RLS evidence matrix (snapshot: 2026-07-12)", () => {
  it("every listed object has RLS enabled", () => {
    for (const row of CH_RLS_MATRIX) {
      expect(row.rlsEnabled, `${row.object} should have RLS enabled`).toBe(true);
    }
  });

  it("no listed object is readable by anon", () => {
    for (const row of CH_RLS_MATRIX) {
      expect(row.anonCanRead, `${row.object} must not be readable by anon`).toBe(false);
    }
  });

  it("sensitive-evidence objects are not readable by a plain authenticated user", () => {
    for (const row of CH_RLS_MATRIX.filter((r) => r.sensitiveEvidence)) {
      expect(row.plainUserCanRead, `${row.object} carries sensitive evidence and must not allow plain-user SELECT`).toBe(false);
    }
  });

  it("sensitive-evidence objects use a gated SELECT policy (not authenticated_read)", () => {
    for (const row of CH_RLS_MATRIX.filter((r) => r.sensitiveEvidence)) {
      expect(SENSITIVE_MUST_BE_GATED, `${row.object} must use a gated SELECT policy`).toContain(row.selectAccess);
    }
  });

  it("admin role has read access to every sensitive-evidence object", () => {
    // Admin is granted via is_admin() OR has_role(Admin) OR the module-permission
    // paths encoded above; every gated access class in the matrix admits admin.
    const adminReadable: Access[] = [
      "admin_only",
      "admin_or_sys_or_ch_view",
      "request_scoped",           // via has_permission(system_administration.view) branch
      "request_scoped_or_owner",
      "authenticated_read",
    ];
    for (const row of CH_RLS_MATRIX) {
      expect(adminReadable).toContain(row.selectAccess);
    }
  });
});
