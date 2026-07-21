/**
 * CH-SIMPLE-P3D-B.2.a — Runtime immutability + transport-guard harness.
 *
 * Runs against the live database inside a rolled-back transaction. Skipped
 * (never silently green) when PGHOST is not set.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

const HAS_PG = !!process.env.PGHOST;

function psqlJSON(sql: string): unknown {
  const out = execFileSync("psql", [process.env.DATABASE_URL ?? "postgres://", "-Atc", sql], {
    encoding: "utf8",
    timeout: 60_000,
  });
  return JSON.parse(out.trim());
}

describe("CH-SIMPLE-P3D-B.2.a runtime harness", () => {
  it.runIf(HAS_PG)("classification immutability triggers fail closed", () => {
    // Build a sandbox request + locked dry-run message, run assertions,
    // then roll everything back so we do not pollute live data.
    const sql = `
SET ROLE service_role;
DO $harness$
DECLARE
  v_req uuid;
  v_msg uuid;
  v_err text;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Setup ---------------------------------------------------------------
  INSERT INTO public.communication_request
    (request_no, module_code, event_code, channels, status,
     payload, context, decision_send_context)
  VALUES
    ('P3D-B2a-'||floor(random()*1e9)::text, 'test','test',
     ARRAY['email']::text[], 'pending','{}','{}','dry_run')
  RETURNING id INTO v_req;

  INSERT INTO public.communication_message
    (request_id, channel, status, send_context, dry_run_locked)
  VALUES (v_req, 'email','queued','dry_run', true)
  RETURNING id INTO v_msg;

  -- Assert 1: cannot clear dry_run_locked at runtime -------------------
  BEGIN
    UPDATE public.communication_message SET dry_run_locked = false WHERE id = v_msg;
    v_results := v_results || jsonb_build_object('name','clear_lock','ok',false);
  EXCEPTION WHEN insufficient_privilege OR others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_results := v_results || jsonb_build_object('name','clear_lock','ok',
      position('dry_run_classification_is_immutable' in v_err) > 0
      OR position('immutable' in v_err) > 0);
  END;

  -- Assert 2: cannot change send_context away from dry_run -------------
  BEGIN
    UPDATE public.communication_message SET send_context = 'live' WHERE id = v_msg;
    v_results := v_results || jsonb_build_object('name','ctx_flip','ok',false);
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_results := v_results || jsonb_build_object('name','ctx_flip','ok',
      position('dry_run_classification_is_immutable' in v_err) > 0
      OR position('immutable' in v_err) > 0);
  END;

  -- Assert 3: request decision_send_context cannot flip ---------------
  BEGIN
    UPDATE public.communication_request SET decision_send_context = 'live' WHERE id = v_req;
    v_results := v_results || jsonb_build_object('name','req_flip','ok',false);
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    v_results := v_results || jsonb_build_object('name','req_flip','ok',
      position('dry_run_classification_is_immutable' in v_err) > 0);
  END;

  -- Assert 4: transport guard returns DRY_RUN_PROVIDER_INVOCATION_BLOCKED
  DECLARE
    v_dec jsonb;
  BEGIN
    v_dec := public.resolve_comm_hub_transport_guard(jsonb_build_object(
      'message_id', v_msg, 'request_id', v_req,
      'attempted_provider','resend','caller_function','harness'));
    v_results := v_results || jsonb_build_object('name','guard_blocks','ok',
      (v_dec->>'allowed')::boolean = false AND
      v_dec->>'code' = 'DRY_RUN_PROVIDER_INVOCATION_BLOCKED' AND
      (v_dec->>'audit_id') IS NOT NULL);
  END;

  -- Assert 5: mismatched request id -> PROVIDER_CONTEXT_MISMATCH -------
  DECLARE
    v_dec jsonb;
  BEGIN
    v_dec := public.resolve_comm_hub_transport_guard(jsonb_build_object(
      'message_id', v_msg, 'request_id', gen_random_uuid()));
    v_results := v_results || jsonb_build_object('name','ctx_mismatch','ok',
      (v_dec->>'allowed')::boolean = false AND
      v_dec->>'code' = 'PROVIDER_CONTEXT_MISMATCH');
  END;

  -- Assert 6: missing message -> PROVIDER_EVIDENCE_NOT_FOUND -----------
  DECLARE
    v_dec jsonb;
  BEGIN
    v_dec := public.resolve_comm_hub_transport_guard(jsonb_build_object(
      'message_id', gen_random_uuid()));
    v_results := v_results || jsonb_build_object('name','evidence_missing','ok',
      (v_dec->>'allowed')::boolean = false AND
      v_dec->>'code' = 'PROVIDER_EVIDENCE_NOT_FOUND');
  END;

  -- Assert 7: audit rows are append-only -------------------------------
  BEGIN
    UPDATE public.communication_hub_transport_guard_audit
       SET block_code = 'DRY_RUN_PROVIDER_INVOCATION_BLOCKED'
     WHERE message_id = v_msg;
    v_results := v_results || jsonb_build_object('name','audit_update','ok',false);
  EXCEPTION WHEN others THEN
    v_results := v_results || jsonb_build_object('name','audit_update','ok',true);
  END;

  -- Assert 8: migration-only bypass allows the flip --------------------
  BEGIN
    PERFORM set_config('communication_hub.dry_run_immutability_bypass','migration', true);
    UPDATE public.communication_message SET dry_run_locked = false WHERE id = v_msg;
    v_results := v_results || jsonb_build_object('name','migration_bypass','ok',true);
    -- restore for downstream
    UPDATE public.communication_message SET dry_run_locked = true WHERE id = v_msg;
    PERFORM set_config('communication_hub.dry_run_immutability_bypass','', true);
  EXCEPTION WHEN others THEN
    v_results := v_results || jsonb_build_object('name','migration_bypass','ok',false);
  END;

  -- Roll back the sandbox --------------------------------------------
  RAISE EXCEPTION 'ROLLBACK_HARNESS %', v_results::text;
END;
$harness$;
    `;
    let payload: any = null;
    try {
      execFileSync("psql", [process.env.DATABASE_URL ?? "postgres://", "-v", "ON_ERROR_STOP=0", "-Atc", sql], {
        encoding: "utf8",
        timeout: 60_000,
      });
    } catch (e: any) {
      const msg: string = (e.stderr ?? e.stdout ?? String(e)).toString();
      const m = msg.match(/ROLLBACK_HARNESS\s+(\[.*\])/s);
      if (m) payload = JSON.parse(m[1]);
    }
    expect(payload, "harness did not produce results").not.toBeNull();
    const failed = (payload as any[]).filter((r) => r.ok === false);
    // eslint-disable-next-line no-console
    if (failed.length) console.error("Failed harness assertions:", failed);
    expect(failed).toEqual([]);
    expect((payload as any[]).length).toBeGreaterThanOrEqual(8);
  }, 90_000);

  it.skipIf(HAS_PG)("PGHOST not set — runtime harness skipped (not silently passing)", () => {
    expect(true).toBe(true);
  });
});
