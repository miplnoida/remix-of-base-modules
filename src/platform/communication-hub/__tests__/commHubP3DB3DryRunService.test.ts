/**
 * CH-SIMPLE-P3D-B.3 — Frontend dry-run service contract & governance.
 *
 * These tests assert the service call surface is safe:
 *   - `runDryTest` invokes ONLY the `comm-hub-dry-run` edge function.
 *   - The service NEVER calls internal orchestration RPCs directly.
 *   - The server envelope is preserved verbatim (no shape collapse).
 *   - Idempotency keys are required and reused across calls.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";

const SERVICE_PATH = resolve(process.cwd(), "src/platform/communication-hub/dryRunService.ts");
const PANEL_PATH = resolve(
  process.cwd(),
  "src/pages/admin/communicationHub/controlCenter/DryRunPanel.tsx",
);
const serviceSrc = readFileSync(SERVICE_PATH, "utf8");
const panelSrc = readFileSync(PANEL_PATH, "utf8");

// --- Static governance -----------------------------------------------------

describe("dryRunService — governance", () => {
  it("[STATIC] does not call internal orchestration RPCs directly", () => {
    for (const forbidden of [
      "begin_comm_hub_dry_run",
      "mark_comm_hub_dry_run_dispatching",
      "finalize_comm_hub_dry_run",
      "fail_comm_hub_dry_run",
    ]) {
      // Allowed inside doc comments (as a description); disallowed in code.
      const codeOnly = serviceSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(codeOnly).not.toContain(forbidden);
    }
  });

  it("[STATIC] does not invoke the targeted_dry_run dispatcher operation", () => {
    const codeOnly = serviceSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/targeted_dry_run/);
    expect(codeOnly).not.toMatch(/comm-hub-dispatch/);
  });

  it("[STATIC] does not perform direct writes to the certification table", () => {
    const codeOnly = serviceSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    // Only RPC calls to the fetch/validate/revoke functions are allowed.
    expect(codeOnly).not.toMatch(/from\(\s*["']communication_dry_run_certification["']/);
  });

  it("[STATIC] runDryTest calls only the comm-hub-dry-run edge function", () => {
    expect(serviceSrc).toMatch(/functions\.invoke\(\s*["']comm-hub-dry-run["']/);
  });

  it("[STATIC] preserves the full server envelope shape", () => {
    for (const key of [
      "dry_run_execution_id",
      "dry_run_certification_id",
      "request_number",
      "message_id",
      "delivery_attempt_id",
      "trace_id",
      "original_decision_id",
      "dispatcher_revalidation_decision_id",
      "blockers",
      "warnings",
      "failure_stage",
      "certification_expires_at",
      "provider_call_attempted",
      "provider_message_id",
      "final_operating_mode",
      "idempotent_replay",
    ]) {
      expect(serviceSrc).toContain(key);
    }
  });

  it("[STATIC] service exports the required typed operations", () => {
    for (const name of [
      "runDryTest",
      "fetchDryRunExecution",
      "fetchDryRunCertification",
      "fetchLatestValidDryRunCertification",
      "validateDryRunCertification",
      "revokeDryRunCertification",
    ]) {
      expect(serviceSrc).toMatch(new RegExp(`export (async )?function ${name}\\b`));
    }
  });
});

// --- Panel governance ------------------------------------------------------

describe("DryRunPanel — governance & UX contract", () => {
  it("[STATIC] does not expose queue / dispatcher / cron / provider controls", () => {
    const codeOnly = panelSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const forbidden of [
      "notification_queue",
      "comm-hub-dispatch",
      "targeted_dry_run",
      "cron",
      "provider_credential",
      "live_window",
      "operating_mode_boolean",
      "begin_comm_hub_dry_run",
      "finalize_comm_hub_dry_run",
      "mark_comm_hub_dry_run_dispatching",
    ]) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });

  it("[STATIC] treats the server as authoritative for readiness (no recomputation)", () => {
    // The panel derives readiness ONLY from canonicalDecision.
    expect(panelSrc).toMatch(/canonicalDecision/);
    // It does not call the send-decision evaluator itself.
    const codeOnly = panelSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/evaluate_comm_hub_send_decision/);
  });

  it("[STATIC] emits DRY_RUN_PASSED / DRY_RUN_FAILED / BLOCKED, never intermediate", () => {
    expect(panelSrc).toContain("DRY_RUN_PASSED");
    expect(panelSrc).toContain("DRY_RUN_FAILED");
    expect(panelSrc).toContain("BLOCKED");
    const codeOnly = panelSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const forbidden of ["BEGIN_OK", "REQUEST_CREATED", "DISPATCHING", "DRY_RUN_PROCESSED", "ENQUEUED"]) {
      expect(codeOnly).not.toContain(forbidden);
    }
  });

  it("[STATIC] surfaces provider evidence explicitly", () => {
    expect(panelSrc).toContain("Provider call attempted");
    expect(panelSrc).toContain("Provider message ID");
  });

  it("[STATIC] technical details are collapsed by default", () => {
    // Uses Collapsible without a `defaultOpen` prop.
    expect(panelSrc).toMatch(/<Collapsible>\s*\n/);
  });

  it("[STATIC] does not register a top-level route", () => {
    // The panel is a component; no react-router registration.
    const codeOnly = panelSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/createBrowserRouter|<Route\s/);
  });
});

// --- Runtime behaviour (mocked supabase) -----------------------------------

vi.mock("@/integrations/supabase/client", () => {
  const invoke = vi.fn();
  const rpc = vi.fn();
  const session = {
    access_token: "validated-operator-token",
    refresh_token: "refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "operator-1" },
  };
  return {
    supabase: {
      functions: { invoke },
      rpc,
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: session.user }, error: null }),
        refreshSession: vi.fn(),
      },
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    },
    __invoke: invoke,
    __rpc: rpc,
  };
});

async function loadService() {
  return await import("@/platform/communication-hub/dryRunService");
}
async function loadMock() {
  return await import("@/integrations/supabase/client");
}

beforeEach(() => {
  vi.resetModules();
});

describe("runDryTest — runtime behaviour", () => {
  it("throws when idempotencyKey is missing (never auto-generates)", async () => {
    const svc = await loadService();
    await expect(
      svc.runDryTest({
        moduleCode: "BENEFITS",
        eventCode: "AWARD_ISSUED",
        channel: "email",
        recipients: ["ops@example.gov"],
        idempotencyKey: "",
      }),
    ).rejects.toThrow(/idempotencyKey/);
  });

  it("forwards inputs verbatim to comm-hub-dry-run and returns the envelope", async () => {
    const svc = await loadService();
    const mod: any = await loadMock();
    mod.__invoke.mockResolvedValueOnce({
      data: {
        status: "DRY_RUN_PASSED",
        passed: true,
        message: "Dry test passed — no real email was sent.",
        idempotent_replay: false,
        dry_run_execution_id: "exec-1",
        execution_no: "DR-1",
        dry_run_certification_id: "cert-1",
        request_id: "req-1",
        request_number: "R-1",
        message_id: "msg-1",
        delivery_attempt_id: "att-1",
        trace_id: "trace-1",
        original_decision_id: "dec-1",
        dispatcher_revalidation_decision_id: "dec-2",
        preview_snapshot_id: "snap-1",
        preview_approval_id: "appr-1",
        blockers: [],
        warnings: [],
        failure_stage: null,
        started_at: null,
        completed_at: null,
        certification_expires_at: "2099-01-01T00:00:00Z",
        provider_call_attempted: false,
        provider_message_id: null,
        final_operating_mode: "DRY_RUN_ONLY",
      },
      error: null,
    });

    const env = await svc.runDryTest({
      moduleCode: "BENEFITS",
      eventCode: "AWARD_ISSUED",
      channel: "email",
      recipients: ["ops@example.gov"],
      previewSnapshotId: "snap-1",
      previewApprovalId: "appr-1",
      operatorReason: "rehearsal",
      idempotencyKey: "dry-abc",
    });

    expect(mod.__invoke).toHaveBeenCalledTimes(1);
    const [fnName, opts] = mod.__invoke.mock.calls[0];
    expect(fnName).toBe("comm-hub-dry-run");
    expect(opts.headers).toEqual({ Authorization: "Bearer validated-operator-token" });
    expect(opts.body).toMatchObject({
      module_code: "BENEFITS",
      event_code: "AWARD_ISSUED",
      channel: "email",
      to_recipients: ["ops@example.gov"],
      preview_snapshot_id: "snap-1",
      preview_approval_id: "appr-1",
      idempotency_key: "dry-abc",
    });
    expect(env.status).toBe("DRY_RUN_PASSED");
    expect(env.provider_call_attempted).toBe(false);
    expect(env.provider_message_id).toBeNull();
    expect(env.dry_run_certification_id).toBe("cert-1");
    expect(env.delivery_attempt_id).toBe("att-1");
  });

  it("preserves BLOCKED envelope with structured blockers (no toast collapse)", async () => {
    const svc = await loadService();
    const mod: any = await loadMock();
    mod.__invoke.mockResolvedValueOnce({
      data: {
        status: "BLOCKED",
        passed: false,
        message: "",
        idempotent_replay: false,
        dry_run_execution_id: null,
        execution_no: null,
        dry_run_certification_id: null,
        request_id: null,
        request_number: null,
        message_id: null,
        delivery_attempt_id: null,
        trace_id: null,
        original_decision_id: null,
        dispatcher_revalidation_decision_id: null,
        preview_snapshot_id: null,
        preview_approval_id: null,
        blockers: [
          { code: "recipient_not_allowlisted", stage: "input", severity: "critical" },
        ],
        warnings: [],
        failure_stage: "BEGIN",
        started_at: null,
        completed_at: null,
        certification_expires_at: null,
        provider_call_attempted: false,
        provider_message_id: null,
        final_operating_mode: "DRY_RUN_ONLY",
      },
      error: null,
    });
    const env = await svc.runDryTest({
      moduleCode: "BENEFITS",
      eventCode: "AWARD_ISSUED",
      recipients: ["not-allowed@x.com"],
      idempotencyKey: "dry-xyz",
    });
    expect(env.status).toBe("BLOCKED");
    expect(env.blockers).toHaveLength(1);
    expect(env.blockers[0].code).toBe("recipient_not_allowlisted");
    expect(env.failure_stage).toBe("BEGIN");
  });

  it("preserves DRY_RUN_FAILED envelope with failure_stage and provider evidence", async () => {
    const svc = await loadService();
    const mod: any = await loadMock();
    mod.__invoke.mockResolvedValueOnce({
      data: {
        status: "DRY_RUN_FAILED",
        passed: false,
        message: "",
        idempotent_replay: false,
        dry_run_execution_id: "exec-9",
        execution_no: "DR-9",
        dry_run_certification_id: null,
        request_id: "req-9",
        message_id: "msg-9",
        delivery_attempt_id: "att-9",
        trace_id: null,
        original_decision_id: null,
        dispatcher_revalidation_decision_id: null,
        preview_snapshot_id: null,
        preview_approval_id: null,
        blockers: [{ code: "dispatcher_response_missing", stage: "DISPATCH_RESPONSE_VALIDATION" }],
        warnings: [],
        failure_stage: "DISPATCH_RESPONSE_VALIDATION",
        started_at: null,
        completed_at: null,
        certification_expires_at: null,
        provider_call_attempted: false,
        provider_message_id: null,
        final_operating_mode: null,
      },
      error: null,
    });
    const env = await svc.runDryTest({
      moduleCode: "BENEFITS",
      eventCode: "AWARD_ISSUED",
      recipients: ["ops@example.gov"],
      idempotencyKey: "dry-fail",
    });
    expect(env.status).toBe("DRY_RUN_FAILED");
    expect(env.failure_stage).toBe("DISPATCH_RESPONSE_VALIDATION");
    expect(env.provider_call_attempted).toBe(false);
    expect(env.provider_message_id).toBeNull();
  });

  it("represents idempotent replays with the idempotent_replay flag preserved", async () => {
    const svc = await loadService();
    const mod: any = await loadMock();
    const envelope = {
      status: "DRY_RUN_PASSED",
      passed: true,
      message: "Dry test passed — no real email was sent.",
      idempotent_replay: true,
      dry_run_execution_id: "exec-1",
      execution_no: "DR-1",
      dry_run_certification_id: "cert-1",
      request_id: "req-1",
      request_number: "R-1",
      message_id: "msg-1",
      delivery_attempt_id: "att-1",
      trace_id: "trace-1",
      original_decision_id: null,
      dispatcher_revalidation_decision_id: null,
      preview_snapshot_id: null,
      preview_approval_id: null,
      blockers: [],
      warnings: [],
      failure_stage: null,
      started_at: null,
      completed_at: null,
      certification_expires_at: null,
      provider_call_attempted: false,
      provider_message_id: null,
      final_operating_mode: null,
    };
    mod.__invoke.mockResolvedValue({ data: envelope, error: null });
    const a = await svc.runDryTest({
      moduleCode: "BENEFITS",
      eventCode: "AWARD_ISSUED",
      recipients: ["ops@example.gov"],
      idempotencyKey: "dry-same",
    });
    const b = await svc.runDryTest({
      moduleCode: "BENEFITS",
      eventCode: "AWARD_ISSUED",
      recipients: ["ops@example.gov"],
      idempotencyKey: "dry-same",
    });
    expect(a.idempotent_replay).toBe(true);
    expect(b.idempotent_replay).toBe(true);
    expect(a.dry_run_execution_id).toBe(b.dry_run_execution_id);
    expect(a.dry_run_certification_id).toBe(b.dry_run_certification_id);
  });
});

describe("validateDryRunCertification — runtime", () => {
  it("returns VALID / EXPIRED / SUPERSEDED / REVOKED without local calculation", async () => {
    const svc = await loadService();
    const mod: any = await loadMock();
    for (const status of ["VALID", "EXPIRED", "SUPERSEDED", "REVOKED", "INVALIDATED"]) {
      mod.__rpc.mockResolvedValueOnce({
        data: {
          valid: status === "VALID",
          status,
          reason: status === "VALID" ? null : `certification_${status.toLowerCase()}`,
          blockers: [],
          warnings: [],
          certification_id: "cert-1",
          module_code: "BENEFITS",
          event_code: "AWARD_ISSUED",
          channel: "email",
          certified_at: "2026-07-21T00:00:00Z",
          expires_at: "2026-08-21T00:00:00Z",
        },
        error: null,
      });
      const v = await svc.validateDryRunCertification({
        certificationId: "cert-1",
        moduleCode: "BENEFITS",
        eventCode: "AWARD_ISSUED",
      });
      expect(v.status).toBe(status);
      expect(v.valid).toBe(status === "VALID");
    }
  });
});

describe("generateIdempotencyKey", () => {
  it("mints unique keys with the dry- prefix", async () => {
    const svc = await loadService();
    const a = svc.generateIdempotencyKey();
    const b = svc.generateIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a.startsWith("dry-")).toBe(true);
  });
});
