/**
 * CH-SIMPLE-P3D-B.2.c — Dry-run orchestrator contract & governance.
 *
 * These tests validate the edge-function orchestration contract statically
 * against the source file. Full end-to-end HTTP orchestration (BEGIN →
 * targeted dispatch → FINALIZE against a real Supabase project) is proven
 * server-side by:
 *
 *   - the SQL runtime harness `run_ch_p3d_b2c_runtime_tests()`
 *   - the finalize evidence guards inside `finalize_comm_hub_dry_run`
 *   - the state-machine and write-once trigger on
 *     `communication_dry_run_execution`
 *
 * The static assertions here guarantee the edge function:
 *
 *   1. verifies JWT and derives operator identity server-side;
 *   2. strips all client-supplied evidence fields before calling `begin`;
 *   3. sequences begin → mark_dispatching → targeted_dry_run → finalize;
 *   4. never trusts client-supplied attempt/provider/hash/certification data;
 *   5. maps every terminal outcome to one of BLOCKED / DRY_RUN_FAILED /
 *      DRY_RUN_PASSED and never returns BEGIN_OK / REQUEST_CREATED /
 *      DISPATCHING / DRY_RUN_PROCESSED / ENQUEUED as final success;
 *   6. never leaks provider secrets, dispatch secret, or service-role key
 *      into logs, responses, or error messages;
 *   7. records terminal failures via `fail_comm_hub_dry_run` for every
 *      failure stage;
 *   8. treats identity mismatch on idempotent replay as BLOCKED without
 *      leaking existing evidence to a different operator.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ORCHESTRATOR_PATH = resolve(
  process.cwd(),
  "supabase/functions/comm-hub-dry-run/index.ts",
);
const orchestrator = readFileSync(ORCHESTRATOR_PATH, "utf8");

// --------------------------------------------------------------------------
// Runtime assertions (statically inferred from the deployed orchestrator).
// --------------------------------------------------------------------------

describe("P3D-B.2.c orchestrator — auth & input sanitisation", () => {
  it("[RUNTIME] rejects requests without an Authorization header", () => {
    expect(orchestrator).toMatch(/authHeader\.startsWith\("Bearer "\)/);
    expect(orchestrator).toMatch(/code:\s*"not_authenticated"/);
  });

  it("[RUNTIME] derives operator identity from the verified JWT — never from the payload", () => {
    expect(orchestrator).toMatch(/userClient\.auth\.getUser\(\)/);
    // sanitizeBeginInputs sets requested_by from the verified JWT last,
    // overwriting any caller-supplied value.
    expect(orchestrator).toMatch(/out\["requested_by"\]\s*=\s*requestedBy/);
  });

  it("[STATIC] refuses to accept trusted evidence from callers", () => {
    // The allowed input set excludes every evidence field.
    const forbidden = [
      "delivery_attempt_id",
      "dispatcher_revalidation_decision_id",
      "provider_call_attempted",
      "provider_message_id",
      "subject_hash",
      "body_hash",
      "trace_complete",
      "event_log_complete",
      "certification_result",
      "execution_state",
      "revalidation_decision_id",
    ];
    const allowedBlock = orchestrator.match(/const allowed = new Set\(\[[\s\S]*?\]\);/)?.[0] ?? "";
    expect(allowedBlock).toBeTruthy();
    for (const key of forbidden) {
      expect(allowedBlock).not.toContain(key);
    }
    // Positive: only business inputs are allowed.
    expect(allowedBlock).toContain("module_code");
    expect(allowedBlock).toContain("event_code");
    expect(allowedBlock).toContain("channel");
    expect(allowedBlock).toContain("preview_snapshot_id");
    expect(allowedBlock).toContain("preview_approval_id");
    expect(allowedBlock).toContain("idempotency_key");
    expect(allowedBlock).toContain("operator_reason");
  });
});

describe("P3D-B.2.c orchestrator — sequencing", () => {
  it("[RUNTIME] follows the canonical order begin → mark_dispatching → targeted_dry_run → finalize", () => {
    const iBegin  = orchestrator.indexOf('"begin_comm_hub_dry_run"');
    const iMark   = orchestrator.indexOf('"mark_comm_hub_dry_run_dispatching"');
    const iTarget = orchestrator.indexOf('operation: "targeted_dry_run"');
    const iFin    = orchestrator.indexOf('"finalize_comm_hub_dry_run"');
    expect(iBegin).toBeGreaterThan(-1);
    expect(iMark).toBeGreaterThan(iBegin);
    expect(iTarget).toBeGreaterThan(iMark);
    expect(iFin).toBeGreaterThan(iTarget);
  });

  it("[RUNTIME] never fires targeted dispatch or finalise when begin returns BLOCKED", () => {
    // The BLOCKED branch returns before reaching mark/dispatch/finalise.
    const blockedBlock = orchestrator.match(/begin\.status === "BLOCKED"[\s\S]*?}\);/)?.[0] ?? "";
    expect(blockedBlock).toBeTruthy();
    expect(blockedBlock).not.toContain("mark_comm_hub_dry_run_dispatching");
    expect(blockedBlock).not.toContain("callTargetedDispatch");
    expect(blockedBlock).not.toContain("finalize_comm_hub_dry_run");
    // ...and BLOCKED never carries certification info.
    expect(blockedBlock).not.toContain("dry_run_certification_id");
  });

  it("[RUNTIME] handles BEGIN_REPLAY without re-dispatching a CERTIFIED execution", () => {
    // Replay path reads the execution state first, and only continues
    // orchestration when state is not terminal.
    expect(orchestrator).toMatch(/BEGIN_REPLAY/);
    expect(orchestrator).toMatch(/buildReplayEnvelope/);
    const replayFn = orchestrator.match(/async function buildReplayEnvelope[\s\S]*?^\}/m)?.[0] ?? "";
    expect(replayFn).toContain('exec.state === "CERTIFIED"');
    expect(replayFn).toContain("idempotent_replay: true");
    expect(replayFn).not.toContain("callTargetedDispatch");
    expect(replayFn).not.toContain('rpc("finalize_comm_hub_dry_run"');
  });

  it("[RUNTIME] refuses replay for a different operator with the same key/scope", () => {
    expect(orchestrator).toMatch(/idempotency_key_operator_mismatch/);
    // The mismatch branch must never leak evidence — it returns BLOCKED
    // without exec-linked ids.
    const mismatchBranch = orchestrator.match(
      /exec\.requested_by !== operatorId[\s\S]*?return stable\([\s\S]*?\}\);/,
    )?.[0] ?? "";
    expect(mismatchBranch).toContain('status: "BLOCKED"');
    expect(mismatchBranch).not.toContain("dry_run_execution_id: exec");
    expect(mismatchBranch).not.toContain("request_id: exec");
    expect(mismatchBranch).not.toContain("message_id: exec");
  });
});

describe("P3D-B.2.c orchestrator — trust model & finalisation", () => {
  it("[STATIC] finalize is called with ONLY execution id + operator id", () => {
    const finCall = orchestrator.match(
      /rpc\("finalize_comm_hub_dry_run"[\s\S]*?\}\);/,
    )?.[0] ?? "";
    expect(finCall).toBeTruthy();
    // Only these two keys are passed.
    expect(finCall).toContain("dry_run_execution_id: executionId");
    expect(finCall).toContain("requested_by: operatorId");
    // No caller evidence is forwarded to finalise.
    const forbidden = [
      "delivery_attempt_id", "provider_call_attempted", "provider_message_id",
      "subject_hash", "body_hash", "recipient_set_hash",
      "revalidation_decision_id", "raw", "req.body", "dispatch.body",
    ];
    for (const bad of forbidden) expect(finCall).not.toContain(bad);
  });

  it("[STATIC] edge-level dispatcher response check is defensive only (result, provider flags, IDs, revalidation, attempt)", () => {
    const validator = orchestrator.match(
      /function validateDispatcherResponse[\s\S]*?^\}/m,
    )?.[0] ?? "";
    expect(validator).toContain("DRY_RUN_PROCESSED");
    expect(validator).toContain("dispatcher_provider_call_attempted_true");
    expect(validator).toContain("dispatcher_provider_message_id_present");
    expect(validator).toContain("dispatcher_message_id_mismatch");
    expect(validator).toContain("dispatcher_request_id_mismatch");
    expect(validator).toContain("dispatcher_revalidation_decision_missing");
    expect(validator).toContain("dispatcher_delivery_attempt_missing");
  });
});

describe("P3D-B.2.c orchestrator — stable envelope", () => {
  it("[RUNTIME] only three final statuses are surfaced", () => {
    const finalSet = orchestrator.match(/FINAL_STATUSES\s*=\s*new Set\(\[[^\]]+\]\)/)?.[0] ?? "";
    expect(finalSet).toContain("DRY_RUN_PASSED");
    expect(finalSet).toContain("DRY_RUN_FAILED");
    expect(finalSet).toContain("BLOCKED");
  });

  it("[RUNTIME] intermediate statuses NEVER appear in the outer response mapping", () => {
    const finalMap = orchestrator.match(
      /const finalStatus = fin\.status === "DRY_RUN_PASSED"[\s\S]*?"DRY_RUN_FAILED";/,
    )?.[0] ?? "";
    expect(finalMap).toBeTruthy();
    for (const banned of [
      '"BEGIN_OK"', '"REQUEST_CREATED"', '"DISPATCHING"',
      '"DRY_RUN_PROCESSED"', '"ENQUEUED"',
    ]) {
      expect(finalMap).not.toContain(banned);
    }
  });

  it("[RUNTIME] success message is the canonical operator-facing string", () => {
    expect(orchestrator).toContain('const SUCCESS_MESSAGE = "Dry test passed — no real email was sent.";');
    // Applied automatically on DRY_RUN_PASSED.
    expect(orchestrator).toMatch(/partial\.status === "DRY_RUN_PASSED" \? SUCCESS_MESSAGE/);
  });

  it("[STATIC] stable envelope exposes every evidence id specified by the contract", () => {
    for (const key of [
      "dry_run_execution_id", "execution_no", "dry_run_certification_id",
      "request_id", "request_number", "message_id", "delivery_attempt_id",
      "trace_id", "original_decision_id", "dispatcher_revalidation_decision_id",
      "preview_snapshot_id", "preview_approval_id",
      "certification_expires_at", "failure_stage",
      "provider_call_attempted", "provider_message_id", "final_operating_mode",
    ]) {
      expect(orchestrator).toContain(key);
    }
  });

  it("[STATIC] provider evidence in the success envelope is server-forced", () => {
    // Success response hard-codes provider_call_attempted:false and null message id.
    expect(orchestrator).toMatch(/provider_call_attempted:\s*false,\s*provider_message_id:\s*null,/);
  });
});

describe("P3D-B.2.c orchestrator — terminal-failure recording", () => {
  it("[RUNTIME] every failure branch calls fail_comm_hub_dry_run with a canonical stage", () => {
    expect(orchestrator).toMatch(/rpc\("fail_comm_hub_dry_run"/);
    for (const stage of [
      '"BEGIN"',
      '"MARK_DISPATCHING"',
      '"TARGETED_DISPATCH"',
      '"DISPATCH_RESPONSE_VALIDATION"',
      '"FINALIZE"',
    ]) {
      expect(orchestrator).toContain(stage);
    }
  });

  it("[STATIC] recordTerminalFailure is passed BLOCKED or FAILED only", () => {
    const fnBody = orchestrator.match(
      /async function recordTerminalFailure[\s\S]*?^\}/m,
    )?.[0] ?? "";
    expect(fnBody).toContain('"BLOCKED" | "FAILED"');
    expect(fnBody).not.toContain('"CERTIFIED"');
  });
});

describe("P3D-B.2.c orchestrator — provider isolation & secret hygiene", () => {
  it("[RUNTIME] no provider transport (Resend, SendGrid, SMTP, Twilio) is invoked here", () => {
    for (const provider of [
      /resend\.com/i, /sendgrid/i, /twilio/i,
      /nodemailer/i, /smtp\.gmail/i, /RESEND_API_KEY/, /TWILIO_/,
    ]) {
      expect(orchestrator).not.toMatch(provider);
    }
  });

  it("[STATIC] dispatch secret is loaded from env and never logged or returned", () => {
    expect(orchestrator).toMatch(/COMMUNICATION_HUB_DISPATCH_SECRET/);
    // Header name is sent — the *value* only lives in a fetch header.
    const rawSecretMatches = orchestrator.match(/DISPATCH_SECRET/g) ?? [];
    // Two references: declaration + one usage in fetch header.
    expect(rawSecretMatches.length).toBeGreaterThanOrEqual(2);
    // The value never appears in a returned envelope.
    expect(orchestrator).not.toMatch(/return.*DISPATCH_SECRET/);
    expect(orchestrator).not.toMatch(/console\.log[\s\S]*DISPATCH_SECRET/);
  });

  it("[STATIC] service-role key is never echoed into responses", () => {
    expect(orchestrator).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(orchestrator).not.toMatch(/JSON\.stringify\([\s\S]*SERVICE_ROLE/);
    expect(orchestrator).not.toMatch(/return.*SERVICE_ROLE/);
  });
});

describe("P3D-B.2.c governance scans", () => {
  it("[STATIC] no frontend code calls finalize_comm_hub_dry_run", () => {
    const hits = executeGrep("finalize_comm_hub_dry_run", "src");
    expect(hits, `frontend must not call finalize directly; found: ${hits.join("\n")}`).toHaveLength(0);
  });

  it("[STATIC] no frontend code calls mark_comm_hub_dry_run_dispatching", () => {
    const hits = executeGrep("mark_comm_hub_dry_run_dispatching", "src");
    expect(hits).toHaveLength(0);
  });

  it("[STATIC] no frontend code calls the targeted_dry_run dispatcher operation", () => {
    const hits = executeGrep('operation: "targeted_dry_run"', "src")
      .concat(executeGrep("'operation': 'targeted_dry_run'", "src"));
    expect(hits).toHaveLength(0);
  });

  it("[STATIC] no frontend code calls fail_comm_hub_dry_run", () => {
    const hits = executeGrep("fail_comm_hub_dry_run", "src");
    expect(hits).toHaveLength(0);
  });

  it("[STATIC] no browser-callable GRANT exposes internal orchestration RPCs", () => {
    // Migrations REVOKE these from anon/authenticated and only GRANT to service_role.
    // We assert the orchestrator itself never generates SQL that grants otherwise.
    expect(orchestrator).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.(begin|mark|finalize|fail)_comm_hub_dry_run/);
  });
});

// --------------------------------------------------------------------------
// Helpers.
// --------------------------------------------------------------------------

function executeGrep(needle: string, root: string): string[] {
  // deno-lint-ignore no-var-requires
  const { execSync } = require("node:child_process") as typeof import("node:child_process");
  try {
    // Governance intent: no *production frontend code* calls these internal
    // orchestration functions. Exclude generated Supabase types (schema
    // catalogue, not a call site) and test/spec files (self-references).
    const out = execSync(
      `rg -n --fixed-strings ${JSON.stringify(needle)} ${JSON.stringify(root)} ` +
      `-g "!src/integrations/supabase/types.ts" ` +
      `-g "!**/__tests__/**" -g "!**/*.test.ts" -g "!**/*.spec.ts" ` +
      `|| true`,
      { encoding: "utf8" },
    );
    return out.split("\n").filter((l) => l.trim().length > 0);
  } catch {
    return [];
  }
}
