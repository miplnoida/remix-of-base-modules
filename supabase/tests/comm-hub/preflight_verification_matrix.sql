-- =============================================================================
-- Phase 4B3 — Checkpoint 2B Runner Repair
-- Preflight Verification Matrix — Assertive Service-Role Suite (v2)
--
-- Executes public.inspect_comm_hub_dry_run_preflight against:
--   * the historical production pair (READ-ONLY proof, no mutation)
--   * a fresh disposable Preview+Approval pair per case (built with final
--     immutable evidence — no post-insert UPDATE of evidence fields, no
--     bypass of immutable triggers, no txn-control inside PL/pgSQL)
--   * unauthenticated / authenticated-no-privilege / operator-admin /
--     service-role callers (all four proven separately)
--
-- All cases run inside a single BEGIN/ROLLBACK. On any assertion mismatch we
-- RAISE EXCEPTION and psql (ON_ERROR_STOP=1) aborts with a non-zero exit.
--
-- Environment gate (item H): the matrix refuses to run unless
--   set_config('app.environment', ...)  -- server-side marker
-- equals 'test' or 'staging'. The wrapper script sets it explicitly via
-- `-v env=...` before executing this file.
-- =============================================================================
\set ON_ERROR_STOP on
\timing off

-- Client-supplied environment ack (from -v env=...). Empty string if absent.
\set env_ack '\'' :env '\''

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Safety: production refusal + explicit non-production environment marker.
--    * Reject database names matching /prod/i unconditionally.
--    * Require server-side app.environment IN ('test','staging') OR the
--      psql-provided :env variable to equal test/staging.
--    * No COMM_HUB_ALLOW_PROD override exists anywhere.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_db       text := current_database();
  v_srv_env  text := coalesce(current_setting('app.environment', true), '');
  v_cli_env  text := coalesce(:env_ack, '');
BEGIN
  IF v_db ~* 'prod' THEN
    RAISE EXCEPTION 'PRODUCTION_DATABASE_REFUSED: current_database()=% matches /prod/i', v_db;
  END IF;
  IF lower(v_srv_env) NOT IN ('test','staging')
     AND lower(v_cli_env) NOT IN ('test','staging') THEN
    RAISE EXCEPTION
      'NON_PRODUCTION_MARKER_REQUIRED: expected app.environment IN (test,staging) or psql -v env=test|staging (got server=%, cli=%)',
      v_srv_env, v_cli_env;
  END IF;
END $$;

-- Bypass the auth gate for the fixture-mutation portion by setting the JWT
-- role claim to 'service_role'. Auth cases explicitly override this.
SELECT set_config('request.jwt.claims',
  json_build_object('role','service_role')::text, true);

-- ---------------------------------------------------------------------------
-- 1. Zero-row-delta ledger — item L.
--    Required tables MUST exist; missing critical tables fail the run
--    instead of being silently zeroed.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _row_counts(
  tbl           text PRIMARY KEY,
  is_required   boolean NOT NULL,
  is_present    boolean NOT NULL,
  before_count  bigint,
  after_count   bigint
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.snap_counts(p_phase text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_targets text[][] := ARRAY[
    -- required=true  → missing table is a matrix failure
    ARRAY['public.communication_dry_run_execution',            't'],
    ARRAY['public.communication_dry_run_certification',        't'],
    ARRAY['public.communication_request',                      't'],
    ARRAY['public.communication_recipient',                    't'],
    ARRAY['public.communication_message',                      't'],
    ARRAY['public.communication_delivery_attempt',             't'],
    ARRAY['public.communication_hub_trace',                    't'],
    ARRAY['public.communication_hub_trace_step',               't'],
    ARRAY['public.communication_hub_send_decision_log',        't'],
    ARRAY['public.communication_hub_runtime_transition_log',   't'],
    ARRAY['public.communication_event_log',                    't'],
    ARRAY['public.communication_controlled_live_execution',    't'],
    ARRAY['public.communication_controlled_live_grant',        't'],
    -- optional retry/provider/simulator tables; if present they must stay 0.
    ARRAY['public.communication_retry_policy',                 'f'],
    ARRAY['public.communication_hub_delivery_event',           'f'],
    ARRAY['public.communication_controlled_live_certification','f']
  ];
  v_t text;
  v_required boolean;
  v_present boolean;
  v_n bigint;
BEGIN
  FOR i IN 1..array_length(v_targets,1) LOOP
    v_t := v_targets[i][1];
    v_required := v_targets[i][2]::boolean;
    v_present := to_regclass(v_t) IS NOT NULL;
    v_n := NULL;
    IF v_present THEN
      EXECUTE format('SELECT count(*) FROM %s', v_t) INTO v_n;
    END IF;
    IF p_phase = 'before' THEN
      INSERT INTO _row_counts(tbl, is_required, is_present, before_count, after_count)
        VALUES (v_t, v_required, v_present, v_n, NULL)
      ON CONFLICT (tbl) DO UPDATE
        SET is_required=EXCLUDED.is_required,
            is_present=EXCLUDED.is_present,
            before_count=EXCLUDED.before_count;
    ELSE
      UPDATE _row_counts SET after_count = v_n WHERE tbl = v_t;
    END IF;
  END LOOP;
END $$;

SELECT pg_temp.snap_counts('before');

-- Fail-fast if any REQUIRED table is missing (item L).
DO $$
DECLARE v_missing text := '';
BEGIN
  SELECT string_agg(tbl, ', ') INTO v_missing
    FROM _row_counts WHERE is_required AND NOT is_present;
  IF v_missing IS NOT NULL AND v_missing <> '' THEN
    RAISE EXCEPTION 'REQUIRED_TABLES_MISSING: %', v_missing;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Assertion helper — no transaction-control statements (item D).
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _matrix_report(
  case_name    text PRIMARY KEY,
  expected     jsonb,
  actual       jsonb,
  passed       boolean NOT NULL,
  failure_note text
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.assert_preflight(
  p_case          text,
  p_snap          uuid,
  p_appr          uuid,
  p_module        text,
  p_event         text,
  p_channel       text,
  p_expected      jsonb
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r jsonb;
  v_actual jsonb;
  v_status text; v_terminal boolean; v_retry_safe boolean;
  v_stage_succeeded boolean; v_passed boolean;
  v_mutation_started boolean; v_created_this_call boolean;
  v_provider boolean; v_simulator boolean;
  v_ready boolean;
  v_blockers text[]; v_expected_blockers text[]; v_missing text[];
  v_note text := NULL;
  b text;
BEGIN
  r := public.inspect_comm_hub_dry_run_preflight(p_snap, p_appr, p_module, p_event, p_channel);

  v_status            := r->>'status';
  v_terminal          := coalesce((r->>'terminal')::boolean, false);
  v_retry_safe        := coalesce((r->>'retry_safe')::boolean, false);
  v_stage_succeeded   := coalesce((r->>'stage_succeeded')::boolean, false);
  v_passed            := coalesce((r->>'passed')::boolean, false);
  v_mutation_started  := coalesce((r->>'mutation_started')::boolean, false);
  v_created_this_call := coalesce((r->>'created_this_call')::boolean, false);
  v_provider          := coalesce((r->>'provider_call_attempted')::boolean, false);
  v_simulator         := coalesce((r->>'simulator_call_attempted')::boolean, false);
  v_ready             := v_status = 'PREFLIGHT_READY';

  SELECT coalesce(array_agg(x->>'code'), ARRAY[]::text[]) INTO v_blockers
    FROM jsonb_array_elements(coalesce(r->'blockers','[]'::jsonb)) x;

  v_actual := jsonb_build_object(
    'status', v_status, 'terminal', v_terminal, 'retry_safe', v_retry_safe,
    'stage_succeeded', v_stage_succeeded, 'passed', v_passed,
    'mutation_started', v_mutation_started, 'created_this_call', v_created_this_call,
    'provider_call_attempted', v_provider, 'simulator_call_attempted', v_simulator,
    'blockers', to_jsonb(v_blockers));

  -- Read-only invariants apply to every case (item K).
  IF v_mutation_started OR v_created_this_call OR v_provider OR v_simulator THEN
    v_note := format('read-only invariant violated: mutation_started=%s created=%s provider=%s simulator=%s',
      v_mutation_started, v_created_this_call, v_provider, v_simulator);
  END IF;

  IF v_note IS NULL AND p_expected ? 'status' AND v_status <> (p_expected->>'status') THEN
    v_note := format('status: expected %s, got %s', p_expected->>'status', v_status);
  END IF;
  IF v_note IS NULL AND p_expected ? 'terminal' AND v_terminal <> (p_expected->>'terminal')::boolean THEN
    v_note := format('terminal: expected %s, got %s', p_expected->>'terminal', v_terminal);
  END IF;
  IF v_note IS NULL AND p_expected ? 'retry_safe' AND v_retry_safe <> (p_expected->>'retry_safe')::boolean THEN
    v_note := format('retry_safe: expected %s, got %s', p_expected->>'retry_safe', v_retry_safe);
  END IF;
  IF v_note IS NULL AND p_expected ? 'stage_succeeded' AND v_stage_succeeded <> (p_expected->>'stage_succeeded')::boolean THEN
    v_note := format('stage_succeeded: expected %s, got %s', p_expected->>'stage_succeeded', v_stage_succeeded);
  END IF;
  IF v_note IS NULL AND p_expected ? 'passed' AND v_passed <> (p_expected->>'passed')::boolean THEN
    v_note := format('passed: expected %s, got %s', p_expected->>'passed', v_passed);
  END IF;

  IF v_note IS NULL AND p_expected ? 'blockers_include' THEN
    SELECT array_agg(x) INTO v_expected_blockers
      FROM jsonb_array_elements_text(p_expected->'blockers_include') x;
    v_missing := ARRAY[]::text[];
    FOREACH b IN ARRAY v_expected_blockers LOOP
      IF NOT b = ANY(v_blockers) THEN v_missing := v_missing || b; END IF;
    END LOOP;
    IF array_length(v_missing,1) IS NOT NULL THEN
      v_note := format('blockers missing: %s (actual=%s)', v_missing, v_blockers);
    END IF;
  END IF;

  IF v_note IS NULL AND p_expected ? 'first_blocker'
     AND coalesce(v_blockers[1],'') <> (p_expected->>'first_blocker') THEN
    v_note := format('first_blocker: expected %s, got %s',
      p_expected->>'first_blocker', coalesce(v_blockers[1],''));
  END IF;

  IF v_note IS NULL AND p_expected ? 'ready' AND v_ready <> (p_expected->>'ready')::boolean THEN
    v_note := format('ready: expected %s, got %s (status=%s)',
      p_expected->>'ready', v_ready, v_status);
  END IF;

  INSERT INTO _matrix_report VALUES (p_case, p_expected, v_actual, v_note IS NULL, v_note);

  IF v_note IS NOT NULL THEN
    RAISE EXCEPTION 'CASE % FAILED — %', p_case, v_note;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Fixture builder — inserts a fresh Preview and Approval in FINAL FORM
--    (item B and C). No post-insert UPDATE of evidence fields. No immutable
--    trigger is disabled. Overrides are applied BEFORE insertion.
--
--    Overrides jsonb keys (all optional):
--      snapshot side:
--        status, expires_at_delta_minutes,
--        to_recipients, cc_recipients, bcc_recipients,
--        raw_placeholder_count, placeholder_scanner_version,
--        governance_evidence, renderer_unresolved_variables,
--        unresolved_variables_normalised,
--        certified_dependency_hash_null, current_dependency_hash_override,
--        preview_recipient_hash_override  -- requires disabling align trigger
--      approval side:
--        approval_status, approval_expires_at_delta_minutes,
--        approval_correlation_override,
--        approval_config_hash_null,
--        approval_canonical_override,   -- write literal bad hash
--        approval_recipient_hash_override,
--        approval_evidence_version_override,
--        approval_omit_configuration_hash  -- write NULL instead
--
--    Returns text[3] = { snapshot_id, approval_id, correlation_id }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.make_fixture(p_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE
  v_snap         uuid := gen_random_uuid();
  v_corr         uuid := gen_random_uuid();
  v_appr         uuid := gen_random_uuid();

  -- pull baseline from historical pair
  v_hist         record;

  -- final immutable snapshot evidence (built before insert)
  v_to           jsonb;
  v_cc           jsonb;
  v_bcc          jsonb;
  v_recip_hash   text;
  v_cfg_hash     text := encode(sha256(v_snap::text::bytea),'hex');
  v_scanner      text;
  v_placeholder  text := encode(sha256((v_snap::text||'-ph')::bytea),'hex');
  v_governance   jsonb;
  v_renderer     jsonb;
  v_resolver     jsonb;
  v_raw_count    integer;
  v_status       text;
  v_expires      timestamptz;
  v_snap_recip_override text;

  -- approval side
  v_appr_status  text;
  v_appr_expires timestamptz;
  v_appr_corr    uuid;
  v_appr_cfg     text;
  v_appr_evver   text;
  v_canonical    text;
  v_appr_recip   text;
  v_disable_align boolean := false;
BEGIN
  SELECT * INTO v_hist FROM public.communication_preview_snapshot
   WHERE id='9a7fc2cd-a715-4888-b029-83ff1de0b76d';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HISTORICAL_PREFLIGHT_PAIR_NOT_PRESENT (snapshot baseline missing)';
  END IF;

  -- apply overrides
  v_to     := coalesce(p_overrides->'to_recipients', v_hist.to_recipients);
  v_cc     := coalesce(p_overrides->'cc_recipients', v_hist.cc_recipients);
  v_bcc    := coalesce(p_overrides->'bcc_recipients', v_hist.bcc_recipients);
  v_status := coalesce(p_overrides->>'status', 'PREPARED');
  v_expires := now() + make_interval(mins =>
                 coalesce((p_overrides->>'expires_at_delta_minutes')::int, 60));
  v_scanner := coalesce(p_overrides->>'placeholder_scanner_version',
                        'comm-hub-raw-placeholder-scanner/v2');
  v_governance := coalesce(p_overrides->'governance_evidence',
                    jsonb_build_object('malformed_braces', jsonb_build_object('count',0)));
  v_renderer := coalesce(p_overrides->'renderer_unresolved_variables', '[]'::jsonb);
  v_resolver := coalesce(p_overrides->'unresolved_variables_normalised', '[]'::jsonb);
  v_raw_count := coalesce((p_overrides->>'raw_placeholder_count')::int, 0);
  v_snap_recip_override := p_overrides->>'preview_recipient_hash_override';

  IF (p_overrides ? 'certified_dependency_hash_null')
     AND (p_overrides->>'certified_dependency_hash_null')::boolean THEN
    v_cfg_hash := NULL;
  END IF;

  -- final recipient_set_hash BEFORE insert (item B)
  v_recip_hash := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc)->>'recipient_set_hash';

  -- If a Preview-side hash override is requested we need to bypass the
  -- ALIGNMENT trigger for that single INSERT. This trigger is not an
  -- immutability trigger (it computes and aligns the recipient hash to
  -- current inputs), so temporary disable-per-insert is permitted. All
  -- immutable triggers remain armed.
  IF v_snap_recip_override IS NOT NULL THEN
    v_disable_align := true;
    ALTER TABLE public.communication_preview_snapshot
      DISABLE TRIGGER trg_comm_hub_snapshot_align_recipient_hash;
    v_recip_hash := v_snap_recip_override;
  END IF;

  -- Insert Preview ONCE, with all final immutable evidence.
  INSERT INTO public.communication_preview_snapshot(
    id, module_code, event_code, channel, send_context,
    to_recipients, cc_recipients, bcc_recipients, recipient_set_hash,
    template_id, template_version_id, sender_profile_id,
    rendered_subject, rendered_body_html, rendered_body_text,
    subject_hash, body_hash, content_hash, context_data, context_hash,
    unresolved_variables, status, expires_at,
    certified_dependency_hash, current_dependency_hash,
    governance_evidence, renderer_unresolved_variables,
    unresolved_variables_normalised, raw_placeholders, raw_placeholder_count,
    placeholder_scanner_version, correlation_id
  )
  SELECT v_snap, module_code, event_code, channel, send_context,
    v_to, v_cc, v_bcc, v_recip_hash,
    template_id, template_version_id, sender_profile_id,
    rendered_subject, rendered_body_html, rendered_body_text,
    subject_hash, body_hash, content_hash, context_data, context_hash,
    unresolved_variables, v_status, v_expires,
    v_cfg_hash,
    coalesce(p_overrides->>'current_dependency_hash_override', v_cfg_hash),
    v_governance, v_renderer, v_resolver, '[]'::jsonb, v_raw_count,
    v_scanner, v_corr
  FROM public.communication_preview_snapshot
  WHERE id='9a7fc2cd-a715-4888-b029-83ff1de0b76d';

  IF v_disable_align THEN
    ALTER TABLE public.communication_preview_snapshot
      ENABLE TRIGGER trg_comm_hub_snapshot_align_recipient_hash;
  END IF;

  -- Compute approval-side inputs BEFORE insert (item C).
  v_appr_status := coalesce(p_overrides->>'approval_status', 'ACTIVE');
  v_appr_expires := now() + make_interval(mins =>
                      coalesce((p_overrides->>'approval_expires_at_delta_minutes')::int, 30));
  v_appr_corr := coalesce((p_overrides->>'approval_correlation_override')::uuid, v_corr);
  v_appr_evver := coalesce(p_overrides->>'approval_evidence_version_override',
                            'comm-hub-approval-evidence/v1');
  v_appr_cfg  := CASE WHEN coalesce((p_overrides->>'approval_omit_configuration_hash')::boolean, false)
                      THEN NULL ELSE v_cfg_hash END;
  v_appr_recip := coalesce(p_overrides->>'approval_recipient_hash_override', v_recip_hash);

  -- Canonical hash: either computed from final inputs, or literal override.
  IF p_overrides ? 'approval_canonical_override' THEN
    v_canonical := p_overrides->>'approval_canonical_override';
  ELSE
    v_canonical := public._comm_hub_compute_canonical_approval_evidence_v1(
      v_snap, v_appr_corr,
      (SELECT content_hash FROM public.communication_preview_snapshot WHERE id=v_snap),
      v_appr_recip,
      (SELECT template_version_id FROM public.communication_preview_snapshot WHERE id=v_snap),
      v_appr_cfg, v_scanner, v_placeholder,
      (SELECT COALESCE((SELECT id FROM auth.users LIMIT 1), gen_random_uuid())),
      now(), v_appr_expires);
  END IF;

  -- Insert Approval ONCE, in final form.
  INSERT INTO public.communication_preview_approval(
    id, snapshot_id, approved_by, approved_at, approval_reason, status, expires_at,
    content_hash_at_approval, snapshot_id_at_approval, correlation_id_at_approval,
    recipient_set_hash_at_approval, template_version_id_at_approval,
    configuration_hash_at_approval, scanner_version_at_approval,
    placeholder_evidence_hash_at_approval,
    canonical_approval_evidence_hash, evidence_version
  )
  SELECT v_appr, v_snap,
         COALESCE((SELECT id FROM auth.users LIMIT 1), gen_random_uuid()),
         now(), 'matrix fixture', v_appr_status, v_appr_expires,
         content_hash, v_snap, v_appr_corr,
         v_appr_recip, template_version_id,
         v_appr_cfg, v_scanner, v_placeholder,
         v_canonical, v_appr_evver
  FROM public.communication_preview_snapshot WHERE id = v_snap;

  RETURN ARRAY[v_snap::text, v_appr::text, v_corr::text];
EXCEPTION WHEN OTHERS THEN
  IF v_disable_align THEN
    BEGIN
      ALTER TABLE public.communication_preview_snapshot
        ENABLE TRIGGER trg_comm_hub_snapshot_align_recipient_hash;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RAISE;
END $$;

-- Convenience: run a case with a fresh fixture per case (item D).
CREATE OR REPLACE FUNCTION pg_temp.case_with_fixture(
  p_case text, p_overrides jsonb, p_expected jsonb
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE ids text[]; v_snap uuid; v_appr uuid;
BEGIN
  ids := pg_temp.make_fixture(p_overrides);
  v_snap := ids[1]::uuid; v_appr := ids[2]::uuid;
  PERFORM pg_temp.assert_preflight(
    p_case, v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email', p_expected);
END $$;

-- ---------------------------------------------------------------------------
-- 4. Historical pair — READ-ONLY proof (item I).
--    Verify pair exists and approval belongs to preview BEFORE assertion.
-- ---------------------------------------------------------------------------
DO $$
DECLARE v_snap uuid; v_appr uuid;
BEGIN
  SELECT id INTO v_snap FROM public.communication_preview_snapshot
   WHERE id='9a7fc2cd-a715-4888-b029-83ff1de0b76d';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HISTORICAL_PREFLIGHT_PAIR_NOT_PRESENT (snapshot 9a7fc2cd... missing)';
  END IF;
  SELECT id INTO v_appr FROM public.communication_preview_approval
   WHERE id='aec5dcf1-ee74-4c42-bc53-ca69bcc8891b'
     AND snapshot_id='9a7fc2cd-a715-4888-b029-83ff1de0b76d';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HISTORICAL_PREFLIGHT_PAIR_NOT_PRESENT (approval aec5dcf1... missing or unbound)';
  END IF;
END $$;

SELECT pg_temp.assert_preflight(
  '00_historical_pair_readonly',
  '9a7fc2cd-a715-4888-b029-83ff1de0b76d'::uuid,
  'aec5dcf1-ee74-4c42-bc53-ca69bcc8891b'::uuid,
  'APPEALS','APPEAL_RECEIVED_NOTICE','email',
  jsonb_build_object(
    'status','BLOCKED', 'terminal', true, 'retry_safe', true,
    'stage_succeeded', false, 'passed', false, 'ready', false,
    'blockers_include', jsonb_build_array(
      'CONFIGURATION_HASH_MISSING',
      'APPROVAL_EXPIRED_BEFORE_BEGIN',
      'APPROVAL_EVIDENCE_MISSING_OR_LEGACY',
      'MALFORMED_BRACE_EVIDENCE_MISSING'
    )
  ));

-- ---------------------------------------------------------------------------
-- 5. Anti-leak auth cases (items E and F).
-- ---------------------------------------------------------------------------

-- AUTH_1: unauthenticated caller
DO $$
DECLARE r jsonb; ev jsonb; codes text[];
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  r := public.inspect_comm_hub_dry_run_preflight(NULL,NULL,'APPEALS','APPEAL_RECEIVED_NOTICE','email');
  ev := coalesce(r->'evidence','{}'::jsonb);
  SELECT coalesce(array_agg(x->>'code'),ARRAY[]::text[]) INTO codes
    FROM jsonb_array_elements(coalesce(r->'blockers','[]'::jsonb)) x;
  IF (r->>'status') <> 'BLOCKED' OR NOT 'PREFLIGHT_AUTHENTICATION_REQUIRED' = ANY(codes) THEN
    RAISE EXCEPTION 'AUTH_1: expected BLOCKED+PREFLIGHT_AUTHENTICATION_REQUIRED, got % / %', r->>'status', codes;
  END IF;
  -- Hardened anti-leak: top-level AND evidence object.
  IF r->>'preview_snapshot_id' IS NOT NULL
     OR r->>'preview_approval_id' IS NOT NULL
     OR r->>'correlation_id' IS NOT NULL
     OR r ? 'canonical_approval_evidence_hash'
     OR r ? 'authoritative_correlation'
     OR r ? 'recipient_set_hash'
     OR r ? 'approval_evidence'
     OR r ? 'preview_prepared_at'
     OR r ? 'approval_approved_at'
     OR ev ? 'preview_snapshot_id' OR ev ? 'preview_approval_id'
     OR ev ? 'correlation_id' OR ev ? 'authoritative_correlation'
     OR ev ? 'canonical_approval_evidence_hash'
     OR ev ? 'recipient_set_hash' OR ev ? 'approval_evidence' THEN
    RAISE EXCEPTION 'AUTH_1: response leaked identifiers or evidence — %', r;
  END IF;
  INSERT INTO _matrix_report VALUES(
    'AUTH_1_unauthenticated',
    jsonb_build_object('first_blocker','PREFLIGHT_AUTHENTICATION_REQUIRED'),
    jsonb_build_object('status', r->>'status', 'blockers', codes),
    true, NULL);
END $$;

-- AUTH_2: authenticated but not operator admin
DO $$
DECLARE
  r jsonb; ev jsonb; codes text[];
  v_uid uuid := gen_random_uuid();
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_uid::text, 'role','authenticated')::text, true);
  r := public.inspect_comm_hub_dry_run_preflight(NULL,NULL,'APPEALS','APPEAL_RECEIVED_NOTICE','email');
  ev := coalesce(r->'evidence','{}'::jsonb);
  SELECT coalesce(array_agg(x->>'code'),ARRAY[]::text[]) INTO codes
    FROM jsonb_array_elements(coalesce(r->'blockers','[]'::jsonb)) x;
  IF (r->>'status') <> 'BLOCKED' OR NOT 'PREFLIGHT_PERMISSION_REQUIRED' = ANY(codes) THEN
    RAISE EXCEPTION 'AUTH_2: expected BLOCKED+PREFLIGHT_PERMISSION_REQUIRED, got % / %', r->>'status', codes;
  END IF;
  IF r->>'preview_snapshot_id' IS NOT NULL OR r->>'preview_approval_id' IS NOT NULL
     OR r->>'correlation_id' IS NOT NULL OR r ? 'canonical_approval_evidence_hash'
     OR r ? 'authoritative_correlation' OR r ? 'recipient_set_hash'
     OR r ? 'approval_evidence'
     OR ev ? 'preview_snapshot_id' OR ev ? 'preview_approval_id'
     OR ev ? 'correlation_id' OR ev ? 'canonical_approval_evidence_hash'
     OR ev ? 'recipient_set_hash' OR ev ? 'approval_evidence' THEN
    RAISE EXCEPTION 'AUTH_2: response leaked identifiers or evidence — %', r;
  END IF;
  INSERT INTO _matrix_report VALUES(
    'AUTH_2_authenticated_no_privilege',
    jsonb_build_object('first_blocker','PREFLIGHT_PERMISSION_REQUIRED'),
    jsonb_build_object('status', r->>'status', 'blockers', codes),
    true, NULL);
END $$;

-- AUTH_3: operator-admin — grant EXACT capability, run against baseline
-- fixture, then revoke.
DO $$
DECLARE
  r jsonb; codes text[];
  v_uid uuid;
  v_ids text[];
  v_snap uuid; v_appr uuid;
  v_inserted_user boolean := false;
  v_inserted_role boolean := false;
BEGIN
  -- Prefer an existing Admin; else insert one (synthetic auth.users +
  -- user_roles row). Both are unwound before we leave this DO block.
  SELECT user_id INTO v_uid FROM public.user_roles
    WHERE role='Admin'::public.app_role LIMIT 1;
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users(id, instance_id, aud, role, email, email_confirmed_at,
                           created_at, updated_at, is_super_admin)
      VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
              'authenticated', 'matrix-operator-'||v_uid::text||'@example.invalid',
              now(), now(), now(), false);
    v_inserted_user := true;
    INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'Admin'::public.app_role);
    v_inserted_role := true;
  END IF;

  -- Under service-role JWT, build a valid baseline fixture.
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','service_role')::text, true);
  v_ids := pg_temp.make_fixture('{}'::jsonb);
  v_snap := v_ids[1]::uuid; v_appr := v_ids[2]::uuid;

  -- Now impersonate the operator via JWT and call preflight.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_uid::text, 'role','authenticated')::text, true);
  r := public.inspect_comm_hub_dry_run_preflight(v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email');
  SELECT coalesce(array_agg(x->>'code'),ARRAY[]::text[]) INTO codes
    FROM jsonb_array_elements(coalesce(r->'blockers','[]'::jsonb)) x;
  IF 'PREFLIGHT_AUTHENTICATION_REQUIRED' = ANY(codes)
     OR 'PREFLIGHT_PERMISSION_REQUIRED' = ANY(codes) THEN
    RAISE EXCEPTION 'AUTH_3: operator admin was rejected by auth gate: %', codes;
  END IF;
  -- Reached evidence branch is proven by seeing evidence.authenticated=true.
  IF NOT coalesce(((r->'evidence')->>'authenticated')::boolean, false) THEN
    RAISE EXCEPTION 'AUTH_3: operator admin did not reach evidence branch — %', r;
  END IF;
  INSERT INTO _matrix_report VALUES(
    'AUTH_3_operator_admin',
    jsonb_build_object('expected','reaches evidence branch'),
    jsonb_build_object('status', r->>'status',
                       'evidence.authenticated', (r->'evidence')->>'authenticated'),
    true, NULL);

  -- Restore service-role JWT for the remainder of the matrix.
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','service_role')::text, true);

  -- Unwind temp identity.
  IF v_inserted_role THEN
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role='Admin'::public.app_role;
  END IF;
  IF v_inserted_user THEN
    DELETE FROM auth.users WHERE id = v_uid;
  END IF;
END $$;

-- AUTH_4: service_role JWT — evidence branch reached under service identity.
DO $$
DECLARE r jsonb; codes text[]; v_ids text[]; v_snap uuid; v_appr uuid;
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','service_role')::text, true);
  v_ids := pg_temp.make_fixture('{}'::jsonb);
  v_snap := v_ids[1]::uuid; v_appr := v_ids[2]::uuid;
  r := public.inspect_comm_hub_dry_run_preflight(v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email');
  SELECT coalesce(array_agg(x->>'code'),ARRAY[]::text[]) INTO codes
    FROM jsonb_array_elements(coalesce(r->'blockers','[]'::jsonb)) x;
  IF 'PREFLIGHT_AUTHENTICATION_REQUIRED' = ANY(codes)
     OR 'PREFLIGHT_PERMISSION_REQUIRED' = ANY(codes) THEN
    RAISE EXCEPTION 'AUTH_4: service_role rejected by auth gate: %', codes;
  END IF;
  IF NOT coalesce(((r->'evidence')->>'authenticated')::boolean, false) THEN
    RAISE EXCEPTION 'AUTH_4: service_role did not reach evidence branch — %', r;
  END IF;
  INSERT INTO _matrix_report VALUES(
    'AUTH_4_service_role',
    jsonb_build_object('expected','reaches evidence branch'),
    jsonb_build_object('status', r->>'status',
                       'evidence.authenticated', (r->'evidence')->>'authenticated'),
    true, NULL);
END $$;

-- ---------------------------------------------------------------------------
-- 6. Valid baseline (item J): fresh fixture, self-proving preconditions.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  ids text[]; v_snap uuid; v_appr uuid;
  v_snap_row record; v_appr_row record;
  v_recomputed_recip text; v_recomputed_canonical text;
  v_dup_count int;
BEGIN
  ids := pg_temp.make_fixture('{}'::jsonb);
  v_snap := ids[1]::uuid; v_appr := ids[2]::uuid;

  -- Precondition: Preview inserted exactly once.
  IF (SELECT count(*) FROM public.communication_preview_snapshot WHERE id=v_snap) <> 1 THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: Preview not inserted exactly once';
  END IF;
  -- Precondition: Approval inserted exactly once.
  IF (SELECT count(*) FROM public.communication_preview_approval WHERE id=v_appr) <> 1 THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: Approval not inserted exactly once';
  END IF;
  SELECT * INTO v_snap_row FROM public.communication_preview_snapshot WHERE id=v_snap;
  SELECT * INTO v_appr_row FROM public.communication_preview_approval WHERE id=v_appr;
  IF v_snap_row.status <> 'PREPARED' THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: Preview status <> PREPARED (got %)', v_snap_row.status;
  END IF;
  IF v_appr_row.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: Approval status <> ACTIVE (got %)', v_appr_row.status;
  END IF;
  -- Item A: evidence version must equal server-required value.
  IF v_appr_row.evidence_version <> 'comm-hub-approval-evidence/v1' THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: evidence_version <> comm-hub-approval-evidence/v1 (got %)',
      v_appr_row.evidence_version;
  END IF;
  IF v_snap_row.certified_dependency_hash IS DISTINCT FROM v_snap_row.current_dependency_hash THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: dependency hashes drift';
  END IF;
  IF v_snap_row.certified_dependency_hash IS NULL THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: certified_dependency_hash NULL';
  END IF;
  -- Recompute canonical approval hash and recipient hash.
  v_recomputed_recip := public.comm_hub_normalize_recipient_set(
    v_snap_row.to_recipients, v_snap_row.cc_recipients, v_snap_row.bcc_recipients
  )->>'recipient_set_hash';
  IF v_recomputed_recip IS DISTINCT FROM v_snap_row.recipient_set_hash THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: recipient_set_hash recompute mismatch';
  END IF;
  v_recomputed_canonical := public._comm_hub_compute_canonical_approval_evidence_v1(
    v_appr_row.snapshot_id_at_approval, v_appr_row.correlation_id_at_approval,
    v_appr_row.content_hash_at_approval, v_appr_row.recipient_set_hash_at_approval,
    v_appr_row.template_version_id_at_approval, v_appr_row.configuration_hash_at_approval,
    v_appr_row.scanner_version_at_approval, v_appr_row.placeholder_evidence_hash_at_approval,
    v_appr_row.approved_by, v_appr_row.approved_at, v_appr_row.expires_at);
  IF v_recomputed_canonical IS DISTINCT FROM v_appr_row.canonical_approval_evidence_hash THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: canonical_approval_evidence_hash recompute mismatch';
  END IF;
  -- No duplicates in recipient arrays.
  SELECT count(*) - count(DISTINCT lower(x)) INTO v_dup_count
    FROM jsonb_array_elements_text(v_snap_row.to_recipients) x;
  IF v_dup_count <> 0 THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: TO duplicates';
  END IF;
  IF v_snap_row.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2' THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: scanner not v2';
  END IF;
  IF v_snap_row.raw_placeholder_count <> 0
     OR jsonb_array_length(v_snap_row.renderer_unresolved_variables) <> 0
     OR jsonb_array_length(v_snap_row.unresolved_variables_normalised) <> 0 THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: unresolved evidence not zero';
  END IF;

  -- Now invoke preflight and assert the full readiness invariant matrix.
  PERFORM pg_temp.assert_preflight(
    '42_valid_disposable_baseline', v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email',
    jsonb_build_object(
      'status','PREFLIGHT_READY', 'terminal', false,
      'stage_succeeded', true, 'passed', false,
      'retry_safe', true, 'ready', true));
END $$;

-- ---------------------------------------------------------------------------
-- 7. Blocked matrix — each case gets a FRESH disposable fixture (item D).
--    Each case asserts at least one principal blocker code (item K).
-- ---------------------------------------------------------------------------

-- Preview lifecycle
SELECT pg_temp.case_with_fixture('05_preview_not_prepared',
  jsonb_build_object('status','SUPERSEDED'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_SNAPSHOT_NOT_PREPARED')));

SELECT pg_temp.case_with_fixture('07_preview_expired',
  jsonb_build_object('expires_at_delta_minutes', -1),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_EXPIRED')));

-- Governance / rendering
SELECT pg_temp.case_with_fixture('19_scanner_v1',
  jsonb_build_object('placeholder_scanner_version','comm-hub-raw-placeholder-scanner/v1'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PLACEHOLDER_SCANNER_VERSION_STALE')));

SELECT pg_temp.case_with_fixture('20_raw_placeholder_residue',
  jsonb_build_object('raw_placeholder_count', 3),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RAW_PLACEHOLDERS_PRESENT')));

SELECT pg_temp.case_with_fixture('21_malformed_brace_evidence_missing',
  jsonb_build_object('governance_evidence', '{}'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('MALFORMED_BRACE_EVIDENCE_MISSING')));

SELECT pg_temp.case_with_fixture('22_malformed_brace_evidence_invalid',
  jsonb_build_object('governance_evidence',
    jsonb_build_object('malformed_braces','not-an-object')),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('MALFORMED_BRACE_EVIDENCE_INVALID')));

SELECT pg_temp.case_with_fixture('23_malformed_braces_present',
  jsonb_build_object('governance_evidence',
    jsonb_build_object('malformed_braces', jsonb_build_object('count',2))),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('MALFORMED_BRACES_PRESENT')));

SELECT pg_temp.case_with_fixture('24_renderer_evidence_invalid',
  jsonb_build_object('renderer_unresolved_variables', '{"bad":1}'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RENDERER_EVIDENCE_INVALID')));

SELECT pg_temp.case_with_fixture('25_renderer_unresolved',
  jsonb_build_object('renderer_unresolved_variables', '["x"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RENDERER_UNRESOLVED_VARIABLES')));

SELECT pg_temp.case_with_fixture('26_resolver_evidence_invalid',
  jsonb_build_object('unresolved_variables_normalised', '["str_entry"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RESOLVER_EVIDENCE_INVALID')));

SELECT pg_temp.case_with_fixture('27_resolver_required_unresolved',
  jsonb_build_object('unresolved_variables_normalised',
    '[{"name":"x","required":true}]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('REQUIRED_VARIABLES_UNRESOLVED')));

SELECT pg_temp.case_with_fixture('28_configuration_hash_missing',
  jsonb_build_object('certified_dependency_hash_null', true),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('CONFIGURATION_HASH_MISSING')));

SELECT pg_temp.case_with_fixture('30_dependency_drift',
  jsonb_build_object('current_dependency_hash_override','drift_hash'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('DEPENDENCY_HASH_DRIFT')));

-- Recipient validation
SELECT pg_temp.case_with_fixture('31_recipient_container_invalid',
  jsonb_build_object('to_recipients', '"not-an-array"'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RECIPIENT_CONTAINERS_INVALID')));

SELECT pg_temp.case_with_fixture('35_recipient_address_invalid',
  jsonb_build_object('to_recipients', '["not-an-email"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RECIPIENT_ENTRIES_INVALID')));

SELECT pg_temp.case_with_fixture('36_duplicate_within_role',
  jsonb_build_object('to_recipients','["a@x.com","a@x.com"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RECIPIENT_DUPLICATE_POLICY_VIOLATED')));

SELECT pg_temp.case_with_fixture('37_duplicate_across_roles',
  jsonb_build_object('to_recipients','["a@x.com"]'::jsonb,
                     'cc_recipients','["a@x.com"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RECIPIENT_DUPLICATE_POLICY_VIOLATED')));

SELECT pg_temp.case_with_fixture('38_case_only_duplicate',
  jsonb_build_object('to_recipients','["Rohit@Mishainfotech.com"]'::jsonb,
                     'cc_recipients','["rohit@mishainfotech.com"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RECIPIENT_DUPLICATE_POLICY_VIOLATED')));

SELECT pg_temp.case_with_fixture('40_preview_recipient_hash_mismatch',
  jsonb_build_object('preview_recipient_hash_override','deadbeef'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_RECIPIENT_HASH_RECOMPUTE_MISMATCH')));

-- Approval-side cases (each fixture inserts approval directly in target state)
SELECT pg_temp.case_with_fixture('08_approval_reserved',
  jsonb_build_object('approval_status','RESERVED'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_NOT_ACTIVE')));

SELECT pg_temp.case_with_fixture('12_approval_expired',
  jsonb_build_object('approval_expires_at_delta_minutes', -1),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_EXPIRED_BEFORE_BEGIN')));

SELECT pg_temp.case_with_fixture('13_approval_evidence_missing_field',
  jsonb_build_object('approval_omit_configuration_hash', true),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_EVIDENCE_MISSING_OR_LEGACY')));

SELECT pg_temp.case_with_fixture('15_correlation_mismatch',
  jsonb_build_object('approval_correlation_override', gen_random_uuid()::text),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_CORRELATION_MISMATCH')));

SELECT pg_temp.case_with_fixture('18_canonical_approval_hash_mismatch',
  jsonb_build_object('approval_canonical_override', md5('tampered-'||gen_random_uuid()::text)),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH')));

SELECT pg_temp.case_with_fixture('41_approval_recipient_hash_mismatch',
  jsonb_build_object('approval_recipient_hash_override', 'different_'||md5(random()::text)),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH')));

-- Post-run: build one more baseline and re-prove it passes (item J closure).
DO $$
DECLARE ids text[]; v_snap uuid; v_appr uuid;
BEGIN
  ids := pg_temp.make_fixture('{}'::jsonb);
  v_snap := ids[1]::uuid; v_appr := ids[2]::uuid;
  PERFORM pg_temp.assert_preflight(
    '42_valid_disposable_baseline_recheck', v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email',
    jsonb_build_object('status','PREFLIGHT_READY','terminal',false,
                       'stage_succeeded',true,'passed',false,
                       'retry_safe',true,'ready',true));
END $$;

-- ---------------------------------------------------------------------------
-- 8. Zero-row-delta assertion (item L).
--    * fixture inserts are inside this outer transaction and rollback below,
--      so the after-count of these runtime tables must equal the before-count
--      (fixture inserts touch preview_snapshot / preview_approval, not the
--      13 required runtime tables tracked here).
-- ---------------------------------------------------------------------------
SELECT pg_temp.snap_counts('after');

DO $$
DECLARE r record; violated text := '';
BEGIN
  FOR r IN SELECT * FROM _row_counts WHERE is_present LOOP
    IF r.after_count IS DISTINCT FROM r.before_count THEN
      violated := violated || format(E'\n  % : before=% after=% delta=%',
        r.tbl, r.before_count, r.after_count, r.after_count - r.before_count);
    END IF;
  END LOOP;
  IF violated <> '' THEN
    RAISE EXCEPTION 'ZERO_ROW_DELTA_VIOLATED — the following tables changed:%', violated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 9. Report — sanitized (no IDs, no hashes).
-- ---------------------------------------------------------------------------
\echo ============================ PREFLIGHT MATRIX REPORT ============================
SELECT case_name, passed, coalesce(failure_note,'') AS note
  FROM _matrix_report ORDER BY case_name;

\echo ============================ ROW COUNT DELTA (must all be 0) ====================
SELECT tbl, is_required, is_present, before_count, after_count,
       (after_count - before_count) AS delta
  FROM _row_counts ORDER BY tbl;

DO $$
DECLARE v_total int; v_passed int; v_failed int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE passed), count(*) FILTER (WHERE NOT passed)
    INTO v_total, v_passed, v_failed FROM _matrix_report;
  RAISE NOTICE 'MATRIX SUMMARY: total=% passed=% failed=%', v_total, v_passed, v_failed;
  IF v_failed > 0 THEN
    RAISE EXCEPTION 'MATRIX FAILED (% of % cases)', v_failed, v_total;
  END IF;
END $$;

-- Nothing persists — the transaction is unconditionally rolled back.
ROLLBACK;
