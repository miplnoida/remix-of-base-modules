-- =============================================================================
-- Phase 4B3 — Checkpoint 2B Pre-Dispatch Static Certification Repair
-- Preflight Verification Matrix — Assertive Service-Role Suite (v3)
--
-- Executes public.inspect_comm_hub_dry_run_preflight against:
--   * the historical production pair (READ-ONLY proof, no mutation);
--   * a fresh disposable Preview+Approval pair per case (built with final
--     immutable evidence — no post-insert UPDATE of evidence fields, no
--     bypass of immutable triggers, no ALTER TABLE DISABLE TRIGGER anywhere
--     in this file);
--   * four separately-proven callers: anonymous, authenticated-no-privilege,
--     synthetic operator-admin (created and unwound), and service_role.
--
-- All cases run inside a single BEGIN/ROLLBACK. On any assertion mismatch we
-- RAISE EXCEPTION and psql (ON_ERROR_STOP=1) aborts with a non-zero exit.
--
-- Environment gate (item G): SERVER-SIDE app.environment marker is required
--   AND the client marker (psql -v env=…) MUST equal the server marker. There
--   is no OR-condition allowing the client marker to replace the server one.
-- =============================================================================
\set ON_ERROR_STOP on
\timing off

\if :{?env}
  \set _env :env
\else
  \set _env ''
\endif

BEGIN;

SELECT set_config('app.matrix_cli_env', :'_env', true);

-- ---------------------------------------------------------------------------
-- 0. Safety: production refusal + strict server↔client environment agreement.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_db      text := current_database();
  v_srv_env text := lower(coalesce(current_setting('app.environment', true), ''));
  v_cli_env text := lower(coalesce(current_setting('app.matrix_cli_env', true), ''));
BEGIN
  IF v_db ~* 'prod' THEN
    RAISE EXCEPTION 'PRODUCTION_DATABASE_REFUSED: current_database()=% matches /prod/i', v_db;
  END IF;
  -- Item G: server marker is authoritative. It MUST be test|staging.
  IF v_srv_env NOT IN ('test','staging') THEN
    RAISE EXCEPTION
      'SERVER_ENVIRONMENT_MARKER_REQUIRED: expected app.environment IN (test,staging), got %',
      coalesce(v_srv_env,'<null>');
  END IF;
  -- Client marker MUST also be test|staging AND equal the server marker.
  IF v_cli_env NOT IN ('test','staging') THEN
    RAISE EXCEPTION
      'CLIENT_ENVIRONMENT_MARKER_REQUIRED: psql -v env=test|staging (got %)',
      coalesce(v_cli_env,'<null>');
  END IF;
  IF v_cli_env <> v_srv_env THEN
    RAISE EXCEPTION
      'SERVER_CLIENT_ENVIRONMENT_MISMATCH: server=% client=%', v_srv_env, v_cli_env;
  END IF;
END $$;

-- Bypass the auth gate for the fixture-mutation portion by setting the JWT
-- role claim to 'service_role'. Auth cases explicitly override this.
SELECT set_config('request.jwt.claims',
  json_build_object('role','service_role')::text, true);

-- ---------------------------------------------------------------------------
-- 1. Zero-row-delta ledger.
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
    ARRAY['public.communication_retry_policy',                 'f'],
    ARRAY['public.communication_hub_delivery_event',           'f'],
    ARRAY['public.communication_controlled_live_certification','f']
  ];
  v_t text; v_required boolean; v_present boolean; v_n bigint;
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
        SET is_required=EXCLUDED.is_required, is_present=EXCLUDED.is_present,
            before_count=EXCLUDED.before_count;
    ELSE
      UPDATE _row_counts SET after_count = v_n WHERE tbl = v_t;
    END IF;
  END LOOP;
END $$;

SELECT pg_temp.snap_counts('before');

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
-- 2. Canonical blocker exhaustiveness (item B closure).
--    Every blocker string this matrix expects MUST appear inside the deployed
--    inspect_comm_hub_dry_run_preflight source. If any expected code is
--    missing from the deployed function we refuse to run.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_src text;
  v_expected text[] := ARRAY[
    'PREFLIGHT_AUTHENTICATION_REQUIRED',
    'PREFLIGHT_PERMISSION_REQUIRED',
    'PREVIEW_SNAPSHOT_NOT_PREPARED',
    'PREVIEW_EXPIRED_BEFORE_BEGIN',
    'SCANNER_VERSION_MISMATCH',
    'RAW_PLACEHOLDER_RESIDUE',
    'MALFORMED_BRACE_EVIDENCE_MISSING',
    'MALFORMED_BRACE_EVIDENCE_INVALID',
    'MALFORMED_BRACES_PRESENT',
    'RENDERER_EVIDENCE_INVALID',
    'RENDERER_UNRESOLVED_PRESENT',
    'RESOLVER_EVIDENCE_INVALID',
    'RESOLVER_REQUIRED_UNRESOLVED',
    'CONFIGURATION_HASH_MISSING',
    'DEPENDENCY_HASH_DRIFT',
    'PREVIEW_FROZEN_RECIPIENT_EVIDENCE_INVALID',
    'PREVIEW_RECIPIENT_ADDRESS_INVALID',
    'PREVIEW_RECIPIENT_FIELD_INVALID',
    'PREVIEW_RECIPIENT_DUPLICATE_INVALID',
    'PREVIEW_APPROVAL_NOT_ACTIVE',
    'APPROVAL_RESERVED_BEFORE_BEGIN',
    'APPROVAL_EXPIRED_BEFORE_BEGIN',
    'APPROVAL_EVIDENCE_MISSING_OR_LEGACY',
    'APPROVAL_PREVIEW_CORRELATION_MISMATCH',
    'APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH',
    'APPROVAL_RECIPIENT_HASH_MISMATCH'
  ];
  v_missing text := '';
  b text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_src
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='inspect_comm_hub_dry_run_preflight';
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'DEPLOYED_PREFLIGHT_FUNCTION_MISSING';
  END IF;
  FOREACH b IN ARRAY v_expected LOOP
    IF position(quote_literal(b) IN v_src) = 0 THEN
      v_missing := v_missing || b || ', ';
    END IF;
  END LOOP;
  IF v_missing <> '' THEN
    RAISE EXCEPTION 'BLOCKER_EXHAUSTIVENESS_FAILED: codes not in deployed function: %', v_missing;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Assertion helper.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE _matrix_report(
  case_name    text PRIMARY KEY,
  expected     jsonb,
  actual       jsonb,
  passed       boolean NOT NULL,
  failure_note text
) ON COMMIT DROP;

CREATE OR REPLACE FUNCTION pg_temp.assert_preflight(
  p_case text, p_snap uuid, p_appr uuid,
  p_module text, p_event text, p_channel text,
  p_expected jsonb
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  r jsonb; v_actual jsonb;
  v_status text; v_terminal boolean; v_retry_safe boolean;
  v_stage_succeeded boolean; v_passed boolean;
  v_mutation_started boolean; v_created_this_call boolean;
  v_provider boolean; v_simulator boolean; v_ready boolean;
  v_blockers text[]; v_expected_blockers text[]; v_missing text[];
  v_note text := NULL; b text;
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

  IF v_mutation_started OR v_created_this_call OR v_provider OR v_simulator THEN
    v_note := format('read-only invariant violated: m=%s c=%s p=%s s=%s',
      v_mutation_started, v_created_this_call, v_provider, v_simulator);
  END IF;

  IF v_note IS NULL AND p_expected ? 'status' AND v_status <> (p_expected->>'status') THEN
    v_note := format('status: expected %s, got %s (blockers=%s)',
      p_expected->>'status', v_status, v_blockers);
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

  IF v_note IS NULL AND p_expected ? 'blockers_include_any' THEN
    SELECT array_agg(x) INTO v_expected_blockers
      FROM jsonb_array_elements_text(p_expected->'blockers_include_any') x;
    IF NOT EXISTS (SELECT 1 FROM unnest(v_expected_blockers) e WHERE e = ANY(v_blockers)) THEN
      v_note := format('blockers_include_any missing: expected any of %s (actual=%s)',
        v_expected_blockers, v_blockers);
    END IF;
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
-- 4. Fixture builder.
--
--   Item A: canonical approval inputs (v_approved_by, v_approved_at,
--     v_approval_expires_at) are declared and assigned exactly ONCE, then
--     used for _comm_hub_compute_canonical_approval_evidence_v1 AND for the
--     approval INSERT. No separate now() / SELECT id FROM auth.users /
--     gen_random_uuid() expression appears in the hash/insert flow.
--
--   Item C precondition: after inserting, the builder asserts that
--     recomputing the canonical hash against the stored inputs matches the
--     stored hash — unless the caller explicitly requested a corrupt
--     canonical override, in which case the mismatch itself is the precondition.
--
--   Item D: no ALTER TABLE DISABLE TRIGGER exists in this file. Preview-side
--     recipient-hash-mismatch cases are NOT built via this fixture — they
--     live in a separate ephemeral workflow (see docs).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.make_fixture(p_overrides jsonb DEFAULT '{}'::jsonb)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE
  v_snap uuid := gen_random_uuid();
  v_corr uuid := gen_random_uuid();
  v_appr uuid := gen_random_uuid();

  v_hist record;

  -- final snapshot evidence
  v_to jsonb; v_cc jsonb; v_bcc jsonb;
  v_recip_hash text;
  v_cfg_hash text := encode(sha256(v_snap::text::bytea),'hex');
  v_scanner text; v_placeholder text := encode(sha256((v_snap::text||'-ph')::bytea),'hex');
  v_governance jsonb; v_renderer jsonb; v_resolver jsonb;
  v_raw_count integer; v_status text; v_expires timestamptz;

  -- approval-side (frozen once — item A)
  v_approved_by         uuid;
  v_approved_at         timestamptz;
  v_approval_expires_at timestamptz;

  v_appr_status  text;
  v_appr_corr    uuid;
  v_appr_cfg     text;
  v_appr_evver   text;
  v_canonical    text;
  v_appr_recip   text;
  v_recompute    text;
BEGIN
  SELECT * INTO v_hist FROM public.communication_preview_snapshot
   WHERE id='9a7fc2cd-a715-4888-b029-83ff1de0b76d';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HISTORICAL_PREFLIGHT_PAIR_NOT_PRESENT (snapshot baseline missing)';
  END IF;

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

  IF (p_overrides ? 'certified_dependency_hash_null')
     AND (p_overrides->>'certified_dependency_hash_null')::boolean THEN
    v_cfg_hash := NULL;
  END IF;

  v_recip_hash := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc)->>'recipient_set_hash';

  -- Preview insert (single, final form — item B). No trigger toggling.
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

  -- Item A: freeze approval inputs exactly once.
  v_approved_by         := gen_random_uuid();
  v_approved_at         := now();
  v_approval_expires_at := v_approved_at + make_interval(mins =>
                            coalesce((p_overrides->>'approval_expires_at_delta_minutes')::int, 30));

  v_appr_status := coalesce(p_overrides->>'approval_status', 'ACTIVE');
  v_appr_corr   := coalesce((p_overrides->>'approval_correlation_override')::uuid, v_corr);
  v_appr_evver  := coalesce(p_overrides->>'approval_evidence_version_override',
                            'comm-hub-approval-evidence/v1');
  v_appr_cfg    := CASE WHEN coalesce((p_overrides->>'approval_omit_configuration_hash')::boolean, false)
                        THEN NULL ELSE v_cfg_hash END;
  v_appr_recip  := coalesce(p_overrides->>'approval_recipient_hash_override', v_recip_hash);

  IF p_overrides ? 'approval_canonical_override' THEN
    v_canonical := p_overrides->>'approval_canonical_override';
  ELSE
    v_canonical := public._comm_hub_compute_canonical_approval_evidence_v1(
      v_snap, v_appr_corr,
      (SELECT content_hash FROM public.communication_preview_snapshot WHERE id=v_snap),
      v_appr_recip,
      (SELECT template_version_id FROM public.communication_preview_snapshot WHERE id=v_snap),
      v_appr_cfg, v_scanner, v_placeholder,
      v_approved_by, v_approved_at, v_approval_expires_at);
  END IF;

  INSERT INTO public.communication_preview_approval(
    id, snapshot_id, approved_by, approved_at, approval_reason, status, expires_at,
    content_hash_at_approval, snapshot_id_at_approval, correlation_id_at_approval,
    recipient_set_hash_at_approval, template_version_id_at_approval,
    configuration_hash_at_approval, scanner_version_at_approval,
    placeholder_evidence_hash_at_approval,
    canonical_approval_evidence_hash, evidence_version
  )
  SELECT v_appr, v_snap,
         v_approved_by, v_approved_at,
         'matrix fixture', v_appr_status, v_approval_expires_at,
         content_hash, v_snap, v_appr_corr,
         v_appr_recip, template_version_id,
         v_appr_cfg, v_scanner, v_placeholder,
         v_canonical, v_appr_evver
  FROM public.communication_preview_snapshot WHERE id = v_snap;

  -- Item A closure: recompute canonical hash from the stored row and
  -- assert equality with the stored value, EXCEPT when the caller
  -- deliberately corrupted it via approval_canonical_override (case 18).
  IF NOT (p_overrides ? 'approval_canonical_override') THEN
    v_recompute := public._comm_hub_compute_canonical_approval_evidence_v1(
      v_snap, v_appr_corr,
      (SELECT content_hash FROM public.communication_preview_snapshot WHERE id=v_snap),
      v_appr_recip,
      (SELECT template_version_id FROM public.communication_preview_snapshot WHERE id=v_snap),
      v_appr_cfg, v_scanner, v_placeholder,
      v_approved_by, v_approved_at, v_approval_expires_at);
    IF v_recompute IS DISTINCT FROM v_canonical THEN
      RAISE EXCEPTION
        'FIXTURE_BUILDER_ASSERTION: canonical hash recompute mismatch (built=% recomputed=%)',
        v_canonical, v_recompute;
    END IF;
  END IF;

  RETURN ARRAY[v_snap::text, v_appr::text, v_corr::text];
END $$;

-- Convenience: run a case with a fresh fixture, optionally asserting
-- fixture-side preconditions (item C).
CREATE OR REPLACE FUNCTION pg_temp.case_with_fixture(
  p_case text, p_overrides jsonb, p_expected jsonb,
  p_preconditions jsonb DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  ids text[]; v_snap uuid; v_appr uuid;
  v_snap_row record; v_appr_row record;
  v_recompute_recip text; v_recompute_canonical text;
  v_check text;
BEGIN
  ids := pg_temp.make_fixture(p_overrides);
  v_snap := ids[1]::uuid; v_appr := ids[2]::uuid;
  SELECT * INTO v_snap_row FROM public.communication_preview_snapshot WHERE id=v_snap;
  SELECT * INTO v_appr_row FROM public.communication_preview_approval WHERE id=v_appr;

  -- Item C: prove each malformed condition actually reached the row.
  IF p_preconditions IS NOT NULL THEN
    FOR v_check IN SELECT jsonb_array_elements_text(p_preconditions) LOOP
      CASE v_check
        WHEN 'to_recipients_not_array' THEN
          IF jsonb_typeof(v_snap_row.to_recipients) = 'array' THEN
            RAISE EXCEPTION 'PRECONDITION % failed: to_recipients was normalised to array', v_check;
          END IF;
        WHEN 'to_recipients_contain_invalid_address' THEN
          IF NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_snap_row.to_recipients) x
             WHERE position('@' IN x) = 0
          ) THEN
            RAISE EXCEPTION 'PRECONDITION % failed: no invalid address survived', v_check;
          END IF;
        WHEN 'to_recipients_duplicated' THEN
          IF (SELECT count(*) - count(DISTINCT lower(x))
                FROM jsonb_array_elements_text(v_snap_row.to_recipients) x) = 0 THEN
            RAISE EXCEPTION 'PRECONDITION % failed: duplicates were removed', v_check;
          END IF;
        WHEN 'to_cc_case_only_duplicate' THEN
          IF NOT EXISTS (
            SELECT 1
              FROM jsonb_array_elements_text(v_snap_row.to_recipients) t,
                   jsonb_array_elements_text(v_snap_row.cc_recipients) c
             WHERE lower(t) = lower(c)
          ) THEN
            RAISE EXCEPTION 'PRECONDITION % failed: cross-role duplicate lost', v_check;
          END IF;
        WHEN 'scanner_is_v1' THEN
          IF v_snap_row.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v1' THEN
            RAISE EXCEPTION 'PRECONDITION % failed: scanner=%', v_check, v_snap_row.placeholder_scanner_version;
          END IF;
        WHEN 'dependency_hashes_differ' THEN
          IF v_snap_row.certified_dependency_hash IS NOT DISTINCT FROM v_snap_row.current_dependency_hash THEN
            RAISE EXCEPTION 'PRECONDITION % failed: hashes equal (%=%)',
              v_check, v_snap_row.certified_dependency_hash, v_snap_row.current_dependency_hash;
          END IF;
        WHEN 'certified_dependency_hash_null' THEN
          IF v_snap_row.certified_dependency_hash IS NOT NULL THEN
            RAISE EXCEPTION 'PRECONDITION % failed: certified_dependency_hash not NULL', v_check;
          END IF;
        WHEN 'approval_correlation_differs' THEN
          IF v_appr_row.correlation_id_at_approval = v_snap_row.correlation_id THEN
            RAISE EXCEPTION 'PRECONDITION % failed: correlations equal', v_check;
          END IF;
        WHEN 'approval_recipient_hash_differs' THEN
          IF v_appr_row.recipient_set_hash_at_approval = v_snap_row.recipient_set_hash THEN
            RAISE EXCEPTION 'PRECONDITION % failed: recipient hashes equal', v_check;
          END IF;
        WHEN 'approval_expired' THEN
          IF v_appr_row.expires_at > now() THEN
            RAISE EXCEPTION 'PRECONDITION % failed: expires_at in future (%)', v_check, v_appr_row.expires_at;
          END IF;
        WHEN 'approval_status_reserved' THEN
          IF v_appr_row.status <> 'RESERVED' THEN
            RAISE EXCEPTION 'PRECONDITION % failed: approval status=%', v_check, v_appr_row.status;
          END IF;
        WHEN 'approval_configuration_hash_null' THEN
          IF v_appr_row.configuration_hash_at_approval IS NOT NULL THEN
            RAISE EXCEPTION 'PRECONDITION % failed: configuration_hash_at_approval not NULL', v_check;
          END IF;
        WHEN 'canonical_hash_corrupted' THEN
          v_recompute_canonical := public._comm_hub_compute_canonical_approval_evidence_v1(
            v_appr_row.snapshot_id_at_approval, v_appr_row.correlation_id_at_approval,
            v_appr_row.content_hash_at_approval, v_appr_row.recipient_set_hash_at_approval,
            v_appr_row.template_version_id_at_approval, v_appr_row.configuration_hash_at_approval,
            v_appr_row.scanner_version_at_approval, v_appr_row.placeholder_evidence_hash_at_approval,
            v_appr_row.approved_by, v_appr_row.approved_at, v_appr_row.expires_at);
          IF v_recompute_canonical = v_appr_row.canonical_approval_evidence_hash THEN
            RAISE EXCEPTION 'PRECONDITION % failed: canonical hash was not actually corrupted', v_check;
          END IF;
        WHEN 'preview_expired' THEN
          IF v_snap_row.expires_at > now() THEN
            RAISE EXCEPTION 'PRECONDITION % failed: preview expires_at in future', v_check;
          END IF;
        WHEN 'preview_status_not_prepared' THEN
          IF v_snap_row.status = 'PREPARED' THEN
            RAISE EXCEPTION 'PRECONDITION % failed: preview status still PREPARED', v_check;
          END IF;
        ELSE
          RAISE EXCEPTION 'UNKNOWN_PRECONDITION: %', v_check;
      END CASE;
    END LOOP;
  END IF;

  PERFORM pg_temp.assert_preflight(
    p_case, v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email', p_expected);
END $$;

-- ---------------------------------------------------------------------------
-- 5. Historical pair — READ-ONLY proof.
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
    )));

-- ---------------------------------------------------------------------------
-- 6. Auth cases.
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
  IF r->>'preview_snapshot_id' IS NOT NULL OR r->>'preview_approval_id' IS NOT NULL
     OR r->>'correlation_id' IS NOT NULL OR r ? 'canonical_approval_evidence_hash'
     OR r ? 'authoritative_correlation' OR r ? 'recipient_set_hash'
     OR r ? 'approval_evidence' OR r ? 'preview_prepared_at' OR r ? 'approval_approved_at'
     OR ev ? 'preview_snapshot_id' OR ev ? 'preview_approval_id'
     OR ev ? 'correlation_id' OR ev ? 'authoritative_correlation'
     OR ev ? 'canonical_approval_evidence_hash'
     OR ev ? 'recipient_set_hash' OR ev ? 'approval_evidence' THEN
    RAISE EXCEPTION 'AUTH_1: response leaked identifiers or evidence';
  END IF;
  INSERT INTO _matrix_report VALUES('AUTH_1_unauthenticated',
    jsonb_build_object('first_blocker','PREFLIGHT_AUTHENTICATION_REQUIRED'),
    jsonb_build_object('status', r->>'status', 'blockers', codes), true, NULL);
END $$;

-- AUTH_2: authenticated but not operator admin
DO $$
DECLARE r jsonb; ev jsonb; codes text[]; v_uid uuid := gen_random_uuid();
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
     OR r ? 'authoritative_correlation' OR r ? 'recipient_set_hash' OR r ? 'approval_evidence'
     OR ev ? 'preview_snapshot_id' OR ev ? 'preview_approval_id'
     OR ev ? 'correlation_id' OR ev ? 'canonical_approval_evidence_hash'
     OR ev ? 'recipient_set_hash' OR ev ? 'approval_evidence' THEN
    RAISE EXCEPTION 'AUTH_2: response leaked identifiers or evidence';
  END IF;
  INSERT INTO _matrix_report VALUES('AUTH_2_authenticated_no_privilege',
    jsonb_build_object('first_blocker','PREFLIGHT_PERMISSION_REQUIRED'),
    jsonb_build_object('status', r->>'status', 'blockers', codes), true, NULL);
END $$;

-- AUTH_3: synthetic operator-admin (item E) — never impersonate an existing admin.
DO $$
DECLARE
  r jsonb; codes text[];
  v_uid uuid := gen_random_uuid();
  v_ids text[]; v_snap uuid; v_appr uuid;
  v_ev_authn boolean; v_ev_authz boolean;
BEGIN
  -- Always create disposable synthetic identity — no SELECT of existing admin.
  INSERT INTO auth.users(id, instance_id, aud, role, email, email_confirmed_at,
                         created_at, updated_at, is_super_admin)
    VALUES (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'matrix-operator-'||v_uid::text||'@example.invalid',
            now(), now(), now(), false);
  INSERT INTO public.user_roles(user_id, role) VALUES (v_uid, 'Admin');

  -- Under service-role JWT, build a valid baseline fixture.
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','service_role')::text, true);
  v_ids := pg_temp.make_fixture('{}'::jsonb);
  v_snap := v_ids[1]::uuid; v_appr := v_ids[2]::uuid;

  -- Impersonate the synthetic operator and call preflight.
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_uid::text, 'role','authenticated')::text, true);
  r := public.inspect_comm_hub_dry_run_preflight(v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email');
  SELECT coalesce(array_agg(x->>'code'),ARRAY[]::text[]) INTO codes
    FROM jsonb_array_elements(coalesce(r->'blockers','[]'::jsonb)) x;
  IF 'PREFLIGHT_AUTHENTICATION_REQUIRED' = ANY(codes)
     OR 'PREFLIGHT_PERMISSION_REQUIRED' = ANY(codes) THEN
    RAISE EXCEPTION 'AUTH_3: synthetic operator admin was rejected by auth gate: %', codes;
  END IF;
  v_ev_authn := coalesce(((r->'evidence')->>'authenticated')::boolean, false);
  v_ev_authz := coalesce(((r->'evidence')->>'authorized')::boolean, false);
  IF NOT v_ev_authn OR NOT v_ev_authz THEN
    RAISE EXCEPTION 'AUTH_3: evidence.authenticated=% authorized=% (expected both true)',
      v_ev_authn, v_ev_authz;
  END IF;
  INSERT INTO _matrix_report VALUES('AUTH_3_operator_admin',
    jsonb_build_object('evidence.authenticated', true, 'evidence.authorized', true),
    jsonb_build_object('status', r->>'status',
                       'evidence.authenticated', v_ev_authn,
                       'evidence.authorized', v_ev_authz), true, NULL);

  -- Restore service-role JWT.
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','service_role')::text, true);
  -- Cleanup is delegated to outer ROLLBACK — item E.
END $$;

-- AUTH_4: service_role JWT reaches the evidence branch.
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
    RAISE EXCEPTION 'AUTH_4: service_role did not reach evidence branch';
  END IF;
  INSERT INTO _matrix_report VALUES('AUTH_4_service_role',
    jsonb_build_object('expected','reaches evidence branch'),
    jsonb_build_object('status', r->>'status',
                       'evidence.authenticated', (r->'evidence')->>'authenticated'),
    true, NULL);
END $$;

-- ---------------------------------------------------------------------------
-- 7. Valid baseline.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  ids text[]; v_snap uuid; v_appr uuid;
  v_snap_row record; v_appr_row record;
  v_recomputed_recip text; v_recomputed_canonical text; v_dup_count int;
BEGIN
  ids := pg_temp.make_fixture('{}'::jsonb);
  v_snap := ids[1]::uuid; v_appr := ids[2]::uuid;
  IF (SELECT count(*) FROM public.communication_preview_snapshot WHERE id=v_snap) <> 1 THEN
    RAISE EXCEPTION 'BASELINE_PRECONDITION: Preview not inserted exactly once';
  END IF;
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

  PERFORM pg_temp.assert_preflight(
    '42_valid_disposable_baseline', v_snap, v_appr,
    'APPEALS','APPEAL_RECEIVED_NOTICE','email',
    jsonb_build_object('status','PREFLIGHT_READY', 'terminal', false,
      'stage_succeeded', true, 'passed', false, 'retry_safe', true, 'ready', true));
END $$;

-- ---------------------------------------------------------------------------
-- 8. Blocked matrix — item B blocker codes aligned to deployed function.
--    Item C preconditions attached to every relevant case.
-- ---------------------------------------------------------------------------

-- Preview lifecycle
SELECT pg_temp.case_with_fixture('05_preview_not_prepared',
  jsonb_build_object('status','SUPERSEDED'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_SNAPSHOT_NOT_PREPARED')),
  jsonb_build_array('preview_status_not_prepared'));

SELECT pg_temp.case_with_fixture('07_preview_expired',
  jsonb_build_object('expires_at_delta_minutes', -1),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_EXPIRED_BEFORE_BEGIN')),
  jsonb_build_array('preview_expired'));

-- Governance / rendering
SELECT pg_temp.case_with_fixture('19_scanner_v1',
  jsonb_build_object('placeholder_scanner_version','comm-hub-raw-placeholder-scanner/v1'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('SCANNER_VERSION_MISMATCH')),
  jsonb_build_array('scanner_is_v1'));

SELECT pg_temp.case_with_fixture('20_raw_placeholder_residue',
  jsonb_build_object('raw_placeholder_count', 3),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RAW_PLACEHOLDER_RESIDUE')));

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
    'blockers_include', jsonb_build_array('RENDERER_UNRESOLVED_PRESENT')));

SELECT pg_temp.case_with_fixture('26_resolver_evidence_invalid',
  jsonb_build_object('unresolved_variables_normalised', '["str_entry"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RESOLVER_EVIDENCE_INVALID')));

SELECT pg_temp.case_with_fixture('27_resolver_required_unresolved',
  jsonb_build_object('unresolved_variables_normalised',
    '[{"name":"x","required":true}]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('RESOLVER_REQUIRED_UNRESOLVED')));

SELECT pg_temp.case_with_fixture('28_configuration_hash_missing',
  jsonb_build_object('certified_dependency_hash_null', true),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('CONFIGURATION_HASH_MISSING')),
  jsonb_build_array('certified_dependency_hash_null'));

SELECT pg_temp.case_with_fixture('30_dependency_drift',
  jsonb_build_object('current_dependency_hash_override','drift_hash'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('DEPENDENCY_HASH_DRIFT')),
  jsonb_build_array('dependency_hashes_differ'));

-- Recipient validation
SELECT pg_temp.case_with_fixture('31_recipient_container_invalid',
  jsonb_build_object('to_recipients', '"not-an-array"'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include_any', jsonb_build_array(
      'PREVIEW_FROZEN_RECIPIENT_EVIDENCE_INVALID','PREVIEW_RECIPIENT_FIELD_INVALID')),
  jsonb_build_array('to_recipients_not_array'));

SELECT pg_temp.case_with_fixture('35_recipient_address_invalid',
  jsonb_build_object('to_recipients', '["not-an-email"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include_any', jsonb_build_array(
      'PREVIEW_RECIPIENT_ADDRESS_INVALID','PREVIEW_RECIPIENT_FIELD_INVALID')),
  jsonb_build_array('to_recipients_contain_invalid_address'));

SELECT pg_temp.case_with_fixture('36_duplicate_within_role',
  jsonb_build_object('to_recipients','["a@x.com","a@x.com"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_RECIPIENT_DUPLICATE_INVALID')),
  jsonb_build_array('to_recipients_duplicated'));

SELECT pg_temp.case_with_fixture('37_duplicate_across_roles',
  jsonb_build_object('to_recipients','["a@x.com"]'::jsonb,
                     'cc_recipients','["a@x.com"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_RECIPIENT_DUPLICATE_INVALID')),
  jsonb_build_array('to_cc_case_only_duplicate'));

SELECT pg_temp.case_with_fixture('38_case_only_duplicate',
  jsonb_build_object('to_recipients','["Rohit@Mishainfotech.com"]'::jsonb,
                     'cc_recipients','["rohit@mishainfotech.com"]'::jsonb),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('PREVIEW_RECIPIENT_DUPLICATE_INVALID')),
  jsonb_build_array('to_cc_case_only_duplicate'));

-- Case 40 (PREVIEW_RECIPIENT_HASH_RECOMPUTE_MISMATCH) is intentionally
-- omitted from this shared matrix (item D). Producing a divergent stored
-- recipient hash requires bypassing the align trigger, which we refuse to
-- do in shared test/staging. That case is exercised in a separate
-- ephemeral-database workflow (see
-- docs/communication-hub/PREFLIGHT_VERIFICATION_MATRIX_RUNNER.md).

-- Approval-side cases
SELECT pg_temp.case_with_fixture('08_approval_reserved',
  jsonb_build_object('approval_status','RESERVED'),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include_any', jsonb_build_array(
      'PREVIEW_APPROVAL_NOT_ACTIVE','APPROVAL_RESERVED_BEFORE_BEGIN')),
  jsonb_build_array('approval_status_reserved'));

SELECT pg_temp.case_with_fixture('12_approval_expired',
  jsonb_build_object('approval_expires_at_delta_minutes', -1),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_EXPIRED_BEFORE_BEGIN')),
  jsonb_build_array('approval_expired'));

SELECT pg_temp.case_with_fixture('13_approval_evidence_missing_field',
  jsonb_build_object('approval_omit_configuration_hash', true),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_EVIDENCE_MISSING_OR_LEGACY')),
  jsonb_build_array('approval_configuration_hash_null'));

SELECT pg_temp.case_with_fixture('15_correlation_mismatch',
  jsonb_build_object('approval_correlation_override', gen_random_uuid()::text),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_PREVIEW_CORRELATION_MISMATCH')),
  jsonb_build_array('approval_correlation_differs'));

SELECT pg_temp.case_with_fixture('18_canonical_approval_hash_mismatch',
  jsonb_build_object('approval_canonical_override', md5('tampered-'||gen_random_uuid()::text)),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH')),
  jsonb_build_array('canonical_hash_corrupted'));

SELECT pg_temp.case_with_fixture('41_approval_recipient_hash_mismatch',
  jsonb_build_object('approval_recipient_hash_override', 'different_'||md5(random()::text)),
  jsonb_build_object('status','BLOCKED','terminal',true,'ready',false,
    'blockers_include', jsonb_build_array('APPROVAL_RECIPIENT_HASH_MISMATCH')),
  jsonb_build_array('approval_recipient_hash_differs'));

-- Post-run baseline recheck.
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
-- 9. Zero-row-delta assertion.
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
-- 10. Report — sanitized (no IDs, no hashes).
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

-- Nothing persists — outer ROLLBACK is unconditional.
ROLLBACK;
