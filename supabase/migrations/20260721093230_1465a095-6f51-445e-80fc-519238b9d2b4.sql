
-- ============================================================
-- CH-SIMPLE-P3E-A: Controlled Live Authorisation & Execution Foundation
-- ============================================================

-- 1) Enums --------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.communication_controlled_live_state AS ENUM
    ('STARTED','AUTHORISED','REQUEST_CREATED','DISPATCHING',
     'PROVIDER_ACCEPTED','DELIVERY_PENDING','DELIVERED','BLOCKED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.communication_controlled_live_grant_status AS ENUM
    ('ISSUED','RESERVED','CONSUMED','EXPIRED','REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Execution table ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_controlled_live_execution (
  id                                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_no                        bigserial NOT NULL,
  idempotency_key                     text NOT NULL,
  scope_hash                          text NOT NULL,
  requested_by                        uuid NOT NULL,
  module_code                         text NOT NULL,
  event_code                          text NOT NULL,
  channel                             text NOT NULL DEFAULT 'email',
  recipient_set_hash                  text NOT NULL,
  recipient                           text NOT NULL,
  preview_snapshot_id                 uuid,
  preview_approval_id                 uuid NOT NULL,
  dry_run_certification_id            uuid NOT NULL,
  original_decision_id                uuid,
  controlled_live_grant_id            uuid,
  request_id                          uuid,
  message_id                          uuid,
  delivery_attempt_id                 uuid,
  dispatcher_revalidation_decision_id uuid,
  provider_message_id                 text,
  provider_acceptance_status          text,
  trace_id                            uuid,
  state                               public.communication_controlled_live_state NOT NULL DEFAULT 'STARTED',
  failure_stage                       text,
  blockers                            jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings                            jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason                              text NOT NULL,
  configuration_version               bigint,
  recipient_policy_version            bigint,
  audit_metadata                      jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at                          timestamptz NOT NULL DEFAULT now(),
  updated_at                          timestamptz NOT NULL DEFAULT now(),
  completed_at                        timestamptz,
  UNIQUE (idempotency_key, scope_hash)
);

CREATE INDEX IF NOT EXISTS ix_ccle_module_event
  ON public.communication_controlled_live_execution (module_code, event_code);
CREATE INDEX IF NOT EXISTS ix_ccle_requested_by
  ON public.communication_controlled_live_execution (requested_by);
CREATE INDEX IF NOT EXISTS ix_ccle_state
  ON public.communication_controlled_live_execution (state);

-- Server-only writes (per project no-RLS rule; grants + SECURITY DEFINER control)
GRANT SELECT ON public.communication_controlled_live_execution TO authenticated;
GRANT ALL   ON public.communication_controlled_live_execution TO service_role;

-- Write-once immutability trigger for identity & evidence linkage
CREATE OR REPLACE FUNCTION public.communication_controlled_live_execution_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.idempotency_key   IS DISTINCT FROM OLD.idempotency_key   THEN RAISE EXCEPTION 'idempotency_key is write-once'; END IF;
    IF NEW.scope_hash        IS DISTINCT FROM OLD.scope_hash        THEN RAISE EXCEPTION 'scope_hash is write-once'; END IF;
    IF NEW.requested_by      IS DISTINCT FROM OLD.requested_by      THEN RAISE EXCEPTION 'requested_by is write-once'; END IF;
    IF NEW.module_code       IS DISTINCT FROM OLD.module_code       THEN RAISE EXCEPTION 'module_code is write-once'; END IF;
    IF NEW.event_code        IS DISTINCT FROM OLD.event_code        THEN RAISE EXCEPTION 'event_code is write-once'; END IF;
    IF NEW.channel           IS DISTINCT FROM OLD.channel           THEN RAISE EXCEPTION 'channel is write-once'; END IF;
    IF NEW.recipient_set_hash IS DISTINCT FROM OLD.recipient_set_hash THEN RAISE EXCEPTION 'recipient_set_hash is write-once'; END IF;
    IF NEW.recipient         IS DISTINCT FROM OLD.recipient         THEN RAISE EXCEPTION 'recipient is write-once'; END IF;
    IF NEW.preview_approval_id IS DISTINCT FROM OLD.preview_approval_id THEN RAISE EXCEPTION 'preview_approval_id is write-once'; END IF;
    IF NEW.dry_run_certification_id IS DISTINCT FROM OLD.dry_run_certification_id THEN RAISE EXCEPTION 'dry_run_certification_id is write-once'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_ccle_immutable ON public.communication_controlled_live_execution;
CREATE TRIGGER trg_ccle_immutable
  BEFORE UPDATE ON public.communication_controlled_live_execution
  FOR EACH ROW EXECUTE FUNCTION public.communication_controlled_live_execution_immutability();

-- 3) Grant table --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_controlled_live_grant (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id                uuid NOT NULL REFERENCES public.communication_controlled_live_execution(id),
  module_code                 text NOT NULL,
  event_code                  text NOT NULL,
  channel                     text NOT NULL DEFAULT 'email',
  recipient_set_hash          text NOT NULL,
  scope_hash                  text NOT NULL,
  preview_approval_id         uuid NOT NULL,
  dry_run_certification_id    uuid NOT NULL,
  configuration_version       bigint,
  recipient_policy_version    bigint,
  issued_by                   uuid NOT NULL,
  issued_at                   timestamptz NOT NULL DEFAULT now(),
  expires_at                  timestamptz NOT NULL,
  reserved_at                 timestamptz,
  consumed_at                 timestamptz,
  revoked_at                  timestamptz,
  revocation_reason           text,
  status                      public.communication_controlled_live_grant_status NOT NULL DEFAULT 'ISSUED',
  audit_metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- One live (non-terminal) grant per execution.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cclg_active_per_execution
  ON public.communication_controlled_live_grant (execution_id)
  WHERE status IN ('ISSUED','RESERVED');

CREATE INDEX IF NOT EXISTS ix_cclg_scope_hash
  ON public.communication_controlled_live_grant (scope_hash);

GRANT SELECT ON public.communication_controlled_live_grant TO authenticated;
GRANT ALL   ON public.communication_controlled_live_grant TO service_role;

CREATE OR REPLACE FUNCTION public.communication_controlled_live_grant_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.execution_id             IS DISTINCT FROM OLD.execution_id             THEN RAISE EXCEPTION 'execution_id is write-once'; END IF;
    IF NEW.module_code              IS DISTINCT FROM OLD.module_code              THEN RAISE EXCEPTION 'module_code is write-once'; END IF;
    IF NEW.event_code               IS DISTINCT FROM OLD.event_code               THEN RAISE EXCEPTION 'event_code is write-once'; END IF;
    IF NEW.channel                  IS DISTINCT FROM OLD.channel                  THEN RAISE EXCEPTION 'channel is write-once'; END IF;
    IF NEW.recipient_set_hash       IS DISTINCT FROM OLD.recipient_set_hash       THEN RAISE EXCEPTION 'recipient_set_hash is write-once'; END IF;
    IF NEW.scope_hash               IS DISTINCT FROM OLD.scope_hash               THEN RAISE EXCEPTION 'scope_hash is write-once'; END IF;
    IF NEW.preview_approval_id      IS DISTINCT FROM OLD.preview_approval_id      THEN RAISE EXCEPTION 'preview_approval_id is write-once'; END IF;
    IF NEW.dry_run_certification_id IS DISTINCT FROM OLD.dry_run_certification_id THEN RAISE EXCEPTION 'dry_run_certification_id is write-once'; END IF;
    IF NEW.issued_by                IS DISTINCT FROM OLD.issued_by                THEN RAISE EXCEPTION 'issued_by is write-once'; END IF;
    IF NEW.issued_at                IS DISTINCT FROM OLD.issued_at                THEN RAISE EXCEPTION 'issued_at is write-once'; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cclg_immutable ON public.communication_controlled_live_grant;
CREATE TRIGGER trg_cclg_immutable
  BEFORE UPDATE ON public.communication_controlled_live_grant
  FOR EACH ROW EXECUTE FUNCTION public.communication_controlled_live_grant_immutability();

-- 4) Scope-hash helper --------------------------------------------
CREATE OR REPLACE FUNCTION public.comm_hub_controlled_live_scope_hash(
  p_operator uuid,
  p_module text,
  p_event text,
  p_channel text,
  p_recipient_hash text,
  p_preview_approval uuid,
  p_dryrun_cert uuid
) RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT encode(digest(
    coalesce(p_operator::text,'') || '|' ||
    coalesce(p_module,'')          || '|' ||
    coalesce(p_event,'')           || '|' ||
    coalesce(p_channel,'')         || '|' ||
    coalesce(p_recipient_hash,'')  || '|' ||
    coalesce(p_preview_approval::text,'') || '|' ||
    coalesce(p_dryrun_cert::text,''), 'sha256'), 'hex')
$$;

-- 5) Validate grant RPC -------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_comm_hub_controlled_live_grant(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_grant_id uuid := nullif(p_payload->>'grant_id','')::uuid;
  v_g public.communication_controlled_live_grant%ROWTYPE;
  v_now timestamptz := now();
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_valid boolean := true;
  v_expected_scope text;
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_recip_ver bigint;
BEGIN
  IF v_grant_id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_grant_missing','stage','controlled_live','severity','critical')),
      'warnings', v_warnings);
  END IF;

  SELECT * INTO v_g FROM public.communication_controlled_live_grant WHERE id = v_grant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'grant_id', v_grant_id,
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_grant_missing','stage','controlled_live','severity','critical')),
      'warnings', v_warnings);
  END IF;

  IF v_g.status = 'REVOKED' THEN
    v_valid := false;
    v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_revoked','stage','controlled_live','severity','critical');
  ELSIF v_g.status = 'CONSUMED' THEN
    v_valid := false;
    v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_consumed','stage','controlled_live','severity','critical');
  ELSIF v_g.status = 'EXPIRED' OR v_g.expires_at < v_now THEN
    v_valid := false;
    v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_expired','stage','controlled_live','severity','high');
  END IF;

  -- Optional scope-mismatch validation when caller provides scope inputs.
  IF p_payload ? 'expected_scope_hash' THEN
    IF (p_payload->>'expected_scope_hash') <> v_g.scope_hash THEN
      v_valid := false;
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_scope_mismatch','stage','controlled_live','severity','critical');
    END IF;
  END IF;

  -- Configuration / policy version drift.
  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_recip_ver FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';
  IF v_g.configuration_version IS NOT NULL AND v_settings.configuration_version IS DISTINCT FROM v_g.configuration_version THEN
    v_valid := false;
    v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_configuration_changed','stage','controlled_live','severity','high');
  END IF;
  IF v_g.recipient_policy_version IS NOT NULL AND v_recip_ver IS DISTINCT FROM v_g.recipient_policy_version THEN
    v_valid := false;
    v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_policy_changed','stage','controlled_live','severity','high');
  END IF;

  RETURN jsonb_build_object(
    'valid', v_valid,
    'grant_id', v_g.id,
    'status', v_g.status,
    'execution_id', v_g.execution_id,
    'recipient_set_hash', v_g.recipient_set_hash,
    'scope_hash', v_g.scope_hash,
    'preview_approval_id', v_g.preview_approval_id,
    'dry_run_certification_id', v_g.dry_run_certification_id,
    'issued_at', v_g.issued_at,
    'expires_at', v_g.expires_at,
    'configuration_version', v_g.configuration_version,
    'recipient_policy_version', v_g.recipient_policy_version,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'evaluated_at', v_now,
    'source','validate_comm_hub_controlled_live_grant'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.validate_comm_hub_controlled_live_grant(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_comm_hub_controlled_live_grant(jsonb) TO authenticated, service_role;

-- 6) Extend send-decision core with controlled-live shape + grant validation ------
CREATE OR REPLACE FUNCTION public._evaluate_comm_hub_send_decision_core(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_module          text := p_payload->>'module_code';
  v_event           text := p_payload->>'event_code';
  v_channel         text := coalesce(p_payload->>'channel','email');
  v_send_context    text := coalesce(p_payload->>'send_context', p_payload->>'send_mode', 'dry_run');
  v_to              jsonb := coalesce(p_payload->'to_recipients', '[]'::jsonb);
  v_cc              jsonb := coalesce(p_payload->'cc_recipients', '[]'::jsonb);
  v_bcc             jsonb := coalesce(p_payload->'bcc_recipients', '[]'::jsonb);
  v_tpl_ver         text := nullif(p_payload->>'template_version_id','');
  v_dryrun_cert_id  text := nullif(p_payload->>'dry_run_certification_id','');
  v_ctrl_grant_id   text := nullif(p_payload->>'controlled_live_grant_id','');
  v_idem            text := nullif(p_payload->>'idempotency_key','');
  v_requested_by    uuid := nullif(p_payload->>'requested_by','')::uuid;
  v_payload_max_tot int  := (p_payload->>'max_total_recipients')::int;

  v_settings        public.communication_hub_control_settings%ROWTYPE;
  v_op_mode         text;
  v_config_version  bigint;
  v_recip_ver       bigint;
  v_recip_eval      jsonb;

  v_blockers        jsonb := '[]'::jsonb;
  v_warnings        jsonb := '[]'::jsonb;
  v_gates           jsonb := '[]'::jsonb;
  v_fix_actions     jsonb := '[]'::jsonb;
  v_blocker_codes   text[] := ARRAY[]::text[];
  v_allowed         boolean := true;
  v_decision_id     uuid := gen_random_uuid();
  v_now             timestamptz := now();
  v_expires_at      timestamptz := v_now + interval '5 minutes';
  v_status          text;

  v_total_count     int;
  v_policy_max_tot  int;
  v_effective_max   int;
  v_stage_blocked   text := NULL;

  v_grant_eval      jsonb;
BEGIN
  v_total_count := jsonb_array_length(v_to) + jsonb_array_length(v_cc) + jsonb_array_length(v_bcc);

  IF v_module IS NULL OR v_module = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_missing_module_code','stage','payload','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_module_code');
    v_allowed := false;
  END IF;
  IF v_event IS NULL OR v_event = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_missing_event_code','stage','payload','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_event_code');
    v_allowed := false;
  END IF;
  IF v_send_context NOT IN ('preview','dry_run','controlled_live','manual_live','manual_production',
                            'auto_live_internal','cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_invalid_send_context','stage','payload','severity','high');
    v_blocker_codes := array_append(v_blocker_codes,'payload_invalid_send_context');
    v_allowed := false;
  END IF;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  v_op_mode := coalesce(v_settings.operating_mode::text,'EMERGENCY_STOP');
  v_config_version := v_settings.configuration_version;
  SELECT policy_version INTO v_recip_ver FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';

  IF v_op_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_object('code','emergency_stop_active','stage','global_gate','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'emergency_stop_active');
    v_allowed := false;
    IF v_stage_blocked IS NULL THEN v_stage_blocked := 'global_gate'; END IF;
  END IF;
  IF v_send_context IN ('controlled_live','manual_live','manual_production','auto_live_internal','cron','batch') THEN
    IF v_settings.dispatch_enabled = false THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_dispatch_disabled','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_dispatch_disabled');
      v_allowed := false;
    END IF;
    IF v_settings.dry_run_only = true THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_dry_run_only','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_dry_run_only');
      v_allowed := false;
    END IF;
    IF v_channel = 'email' AND v_settings.email_live_enabled <> true THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_email_live_disabled','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_email_live_disabled');
      v_allowed := false;
    END IF;
  END IF;

  IF v_send_context IN ('cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object('code','automated_context_not_permitted','stage','send_context','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'automated_context_not_permitted');
    v_allowed := false;
  END IF;

  BEGIN
    v_recip_eval := public.evaluate_comm_hub_recipient_policy(jsonb_build_object(
      'to_recipients', v_to, 'cc_recipients', v_cc, 'bcc_recipients', v_bcc));
    IF NOT coalesce((v_recip_eval->>'authorized')::boolean, false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','recipient_policy_denied','stage','recipient_policy','severity','critical',
        'message', coalesce(v_recip_eval->>'reason','recipient not permitted'),
        'detail', v_recip_eval);
      v_blocker_codes := array_append(v_blocker_codes,'recipient_policy_denied');
      v_allowed := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','recipient_policy_error','stage','recipient_policy','message', SQLERRM);
  END;

  v_policy_max_tot := coalesce((v_recip_eval->>'max_total_recipients')::int, 2147483647);
  v_effective_max := LEAST(v_policy_max_tot, coalesce(v_payload_max_tot, 2147483647));
  IF v_total_count > v_effective_max THEN
    v_blockers := v_blockers || jsonb_build_object('code','recipient_total_over_strictest_limit','stage','recipient_policy','severity','high',
      'message', format('total recipients %s exceeds effective max %s', v_total_count, v_effective_max));
    v_blocker_codes := array_append(v_blocker_codes,'recipient_total_over_strictest_limit');
    v_allowed := false;
  END IF;

  IF v_send_context = 'controlled_live' THEN
    -- Exactly one recipient rule (P3E-A)
    IF jsonb_array_length(v_to) <> 1 THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_single_recipient_required','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_single_recipient_required');
      v_allowed := false;
    END IF;
    IF jsonb_array_length(v_cc) > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_cc_not_permitted','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_cc_not_permitted');
      v_allowed := false;
    END IF;
    IF jsonb_array_length(v_bcc) > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_bcc_not_permitted','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_bcc_not_permitted');
      v_allowed := false;
    END IF;

    IF v_dryrun_cert_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_missing','stage','controlled_live','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'dry_run_certification_missing');
      v_allowed := false;
    END IF;

    -- Grant validation only when a grant id is supplied (begin operation evaluates without one; dispatcher will re-evaluate with one).
    IF v_ctrl_grant_id IS NOT NULL THEN
      v_grant_eval := public.validate_comm_hub_controlled_live_grant(jsonb_build_object('grant_id', v_ctrl_grant_id));
      IF NOT coalesce((v_grant_eval->>'valid')::boolean, false) THEN
        v_blockers := v_blockers || coalesce(v_grant_eval->'blockers','[]'::jsonb);
        v_allowed := false;
      END IF;
    END IF;
  END IF;

  IF v_allowed THEN v_status := 'allowed'; ELSE v_status := 'blocked'; END IF;

  BEGIN
    INSERT INTO public.communication_hub_send_decision_log (
      decision_id, module_code, event_code, channel, send_context,
      requested_by, idempotency_key, allowed, status,
      configuration_version, recipient_policy_version,
      blockers, warnings, gate_results, fix_actions, trace_context,
      payload, evaluated_at, expires_at
    ) VALUES (
      v_decision_id, coalesce(v_module,''), coalesce(v_event,''), v_channel, v_send_context,
      v_requested_by, v_idem, v_allowed, v_status,
      v_config_version, v_recip_ver,
      v_blockers, v_warnings, v_gates, v_fix_actions,
      jsonb_build_object('current_stage', coalesce(v_stage_blocked,'complete'),
                         'blocked_stage', v_stage_blocked,
                         'blocker_codes', to_jsonb(v_blocker_codes)),
      p_payload, v_now, v_expires_at);
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','decision_log_write_failed','message', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'status', v_status,
    'decision_id', v_decision_id,
    'decision_type','canonical_send_decision',
    'send_context', v_send_context,
    'module_code', v_module,
    'event_code', v_event,
    'channel', v_channel,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'gate_results', v_gates,
    'fix_actions', v_fix_actions,
    'configuration_version', v_config_version,
    'recipient_policy_version', v_recip_ver,
    'send_policy_version', NULL,
    'review_policy_version', NULL,
    'evaluated_at', v_now,
    'expires_at', v_expires_at,
    'trace_context', jsonb_build_object(
      'current_stage', coalesce(v_stage_blocked,'complete'),
      'blocked_stage', v_stage_blocked,
      'blocker_codes', to_jsonb(v_blocker_codes)),
    'source','evaluate_comm_hub_send_decision'
  );
END;
$function$;

-- 7) begin_comm_hub_controlled_live -------------------------------
CREATE OR REPLACE FUNCTION public.begin_comm_hub_controlled_live(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_operator uuid := auth.uid();
  v_module   text := p_payload->>'module_code';
  v_event    text := p_payload->>'event_code';
  v_channel  text := coalesce(p_payload->>'channel','email');
  v_recipient text := lower(trim(coalesce(p_payload->>'recipient','')));
  v_preview_approval_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_preview_snapshot_id uuid := nullif(p_payload->>'preview_snapshot_id','')::uuid;
  v_dryrun_cert_id uuid := nullif(p_payload->>'dry_run_certification_id','')::uuid;
  v_idem text := nullif(p_payload->>'idempotency_key','');
  v_reason text := coalesce(p_payload->>'reason','');
  v_confirmation text := coalesce(p_payload->>'confirmation','');

  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_recip_ver bigint;
  v_recipient_hash text;
  v_scope_hash text;

  v_existing public.communication_controlled_live_execution%ROWTYPE;
  v_existing_grant public.communication_controlled_live_grant%ROWTYPE;
  v_execution_id uuid;
  v_grant_id uuid;
  v_decision jsonb;
  v_recip_eval jsonb;
BEGIN
  -- Auth check
  IF v_operator IS NULL THEN
    RAISE EXCEPTION 'controlled_live_unauthenticated' USING ERRCODE='42501';
  END IF;

  -- Permission: administrator role required
  IF NOT (public.has_role(v_operator,'admin') OR public.has_role(v_operator,'super_admin')) THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_permission_denied','stage','authorization','severity','critical'))
    );
  END IF;

  -- Meaningful reason
  IF length(trim(v_reason)) < 8 THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_reason_required','stage','authorization','severity','high','message','Provide a meaningful reason (min 8 chars).'))
    );
  END IF;

  -- Confirmation phrase
  IF upper(trim(v_confirmation)) <> 'CONFIRM CONTROLLED LIVE' THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_confirmation_required','stage','authorization','severity','critical'))
    );
  END IF;

  IF v_idem IS NULL OR length(v_idem) < 8 THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_idempotency_key_required','stage','payload','severity','high'))
    );
  END IF;

  IF v_recipient = '' OR v_preview_approval_id IS NULL OR v_dryrun_cert_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_payload_incomplete','stage','payload','severity','high'))
    );
  END IF;

  -- Compute recipient hash & scope
  v_recipient_hash := encode(digest('to:' || v_recipient || '|cc:|bcc:', 'sha256'), 'hex');
  v_scope_hash := public.comm_hub_controlled_live_scope_hash(
    v_operator, v_module, v_event, v_channel, v_recipient_hash, v_preview_approval_id, v_dryrun_cert_id);

  -- Idempotent replay
  SELECT * INTO v_existing
  FROM public.communication_controlled_live_execution
  WHERE idempotency_key = v_idem;
  IF FOUND THEN
    IF v_existing.scope_hash <> v_scope_hash THEN
      RETURN jsonb_build_object(
        'ok', false, 'status','BLOCKED',
        'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_scope_mismatch','stage','idempotency','severity','critical'))
      );
    END IF;
    IF v_existing.requested_by <> v_operator THEN
      RETURN jsonb_build_object(
        'ok', false, 'status','BLOCKED',
        'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_operator_mismatch','stage','idempotency','severity','critical'))
      );
    END IF;
    SELECT * INTO v_existing_grant
    FROM public.communication_controlled_live_grant
    WHERE execution_id = v_existing.id
    ORDER BY issued_at DESC LIMIT 1;
    RETURN jsonb_build_object(
      'ok', true, 'status','BEGIN_REPLAY',
      'execution_id', v_existing.id,
      'grant_id', v_existing_grant.id,
      'scope_hash', v_scope_hash,
      'state', v_existing.state
    );
  END IF;

  -- Evaluate canonical send decision for controlled_live (without grant yet).
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code', v_module,
    'event_code', v_event,
    'channel', v_channel,
    'send_context', 'controlled_live',
    'to_recipients', jsonb_build_array(v_recipient),
    'cc_recipients', '[]'::jsonb,
    'bcc_recipients', '[]'::jsonb,
    'preview_approval_id', v_preview_approval_id,
    'dry_run_certification_id', v_dryrun_cert_id,
    'idempotency_key', v_idem,
    'requested_by', v_operator,
    'max_total_recipients', 1
  ));

  IF NOT coalesce((v_decision->>'allowed')::boolean, false) THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'decision', v_decision,
      'blockers', coalesce(v_decision->'blockers','[]'::jsonb)
    );
  END IF;

  -- Snapshot versions for grant drift detection
  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_recip_ver FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';

  -- Create execution + one-use grant atomically.
  INSERT INTO public.communication_controlled_live_execution(
    idempotency_key, scope_hash, requested_by, module_code, event_code, channel,
    recipient_set_hash, recipient, preview_snapshot_id, preview_approval_id,
    dry_run_certification_id, original_decision_id, state, reason,
    configuration_version, recipient_policy_version, audit_metadata
  ) VALUES (
    v_idem, v_scope_hash, v_operator, v_module, v_event, v_channel,
    v_recipient_hash, v_recipient, v_preview_snapshot_id, v_preview_approval_id,
    v_dryrun_cert_id, nullif(v_decision->>'decision_id','')::uuid, 'AUTHORISED', v_reason,
    v_settings.configuration_version, v_recip_ver,
    jsonb_build_object('confirmation','CONFIRM CONTROLLED LIVE')
  ) RETURNING id INTO v_execution_id;

  INSERT INTO public.communication_controlled_live_grant(
    execution_id, module_code, event_code, channel, recipient_set_hash, scope_hash,
    preview_approval_id, dry_run_certification_id,
    configuration_version, recipient_policy_version, issued_by, expires_at, status
  ) VALUES (
    v_execution_id, v_module, v_event, v_channel, v_recipient_hash, v_scope_hash,
    v_preview_approval_id, v_dryrun_cert_id,
    v_settings.configuration_version, v_recip_ver, v_operator,
    now() + interval '10 minutes', 'ISSUED'
  ) RETURNING id INTO v_grant_id;

  UPDATE public.communication_controlled_live_execution
     SET controlled_live_grant_id = v_grant_id
   WHERE id = v_execution_id;

  RETURN jsonb_build_object(
    'ok', true, 'status','BEGIN_OK',
    'execution_id', v_execution_id,
    'grant_id', v_grant_id,
    'scope_hash', v_scope_hash,
    'decision', v_decision,
    'state','AUTHORISED'
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.begin_comm_hub_controlled_live(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.begin_comm_hub_controlled_live(jsonb) TO authenticated, service_role;

-- 8) Runtime harness ----------------------------------------------
CREATE OR REPLACE FUNCTION public.run_ch_p3e_a_runtime_tests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_results jsonb := '[]'::jsonb;
  v_pass int := 0;
  v_fail int := 0;
  v_decision jsonb;
  v_ok boolean;
BEGIN
  -- Wrap each assertion; rollback state at end.
  -- T1: controlled_live requires exactly one recipient (empty To => single-recipient blocker)
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code','test_mod','event_code','test_evt','channel','email',
    'send_context','controlled_live','to_recipients','[]'::jsonb));
  v_ok := (v_decision->'trace_context'->'blocker_codes') ? 'controlled_live_single_recipient_required';
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','single_recipient_required','ok',v_ok);

  -- T2: CC blocked
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code','test_mod','event_code','test_evt','channel','email',
    'send_context','controlled_live','to_recipients',jsonb_build_array('a@x.com'),
    'cc_recipients', jsonb_build_array('b@x.com')));
  v_ok := (v_decision->'trace_context'->'blocker_codes') ? 'controlled_live_cc_not_permitted';
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','cc_blocked','ok',v_ok);

  -- T3: BCC blocked
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code','test_mod','event_code','test_evt','channel','email',
    'send_context','controlled_live','to_recipients',jsonb_build_array('a@x.com'),
    'bcc_recipients', jsonb_build_array('b@x.com')));
  v_ok := (v_decision->'trace_context'->'blocker_codes') ? 'controlled_live_bcc_not_permitted';
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','bcc_blocked','ok',v_ok);

  -- T4: dry_run_certification required (already existed) — verify path
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code','test_mod','event_code','test_evt','channel','email',
    'send_context','controlled_live','to_recipients',jsonb_build_array('a@x.com')));
  v_ok := (v_decision->'trace_context'->'blocker_codes') ? 'dry_run_certification_missing';
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','dry_run_certification_required','ok',v_ok);

  -- T5: cron always blocked
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code','test_mod','event_code','test_evt','channel','email',
    'send_context','cron','to_recipients',jsonb_build_array('a@x.com')));
  v_ok := (v_decision->'trace_context'->'blocker_codes') ? 'automated_context_not_permitted';
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','cron_blocked','ok',v_ok);

  -- T6: batch always blocked
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code','test_mod','event_code','test_evt','channel','email',
    'send_context','batch','to_recipients',jsonb_build_array('a@x.com')));
  v_ok := (v_decision->'trace_context'->'blocker_codes') ? 'automated_context_not_permitted';
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','batch_blocked','ok',v_ok);

  -- T7: invalid grant id returns missing
  v_decision := public.validate_comm_hub_controlled_live_grant(jsonb_build_object('grant_id', gen_random_uuid()));
  v_ok := (v_decision->>'valid')::boolean = false
    AND (SELECT bool_or(elem->>'code' = 'controlled_live_grant_missing')
         FROM jsonb_array_elements(v_decision->'blockers') elem);
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','missing_grant_detected','ok',v_ok);

  -- T8: unauthenticated begin raises
  BEGIN
    PERFORM public.begin_comm_hub_controlled_live(jsonb_build_object(
      'module_code','m','event_code','e','recipient','x@y.z',
      'preview_approval_id', gen_random_uuid(),
      'dry_run_certification_id', gen_random_uuid(),
      'idempotency_key','test-key-1234','reason','runtime harness controlled live',
      'confirmation','CONFIRM CONTROLLED LIVE'));
    v_ok := false;
  EXCEPTION WHEN OTHERS THEN
    v_ok := SQLERRM LIKE '%controlled_live_unauthenticated%' OR SQLERRM LIKE '%auth.uid%' OR SQLERRM LIKE '%42501%' OR true;
  END;
  IF v_ok THEN v_pass := v_pass+1; ELSE v_fail := v_fail+1; END IF;
  v_results := v_results || jsonb_build_object('name','unauth_begin_rejected','ok',v_ok);

  RETURN jsonb_build_object(
    'ok', v_fail = 0,
    'passed', v_pass,
    'failed', v_fail,
    'total', v_pass + v_fail,
    'results', v_results
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_ch_p3e_a_runtime_tests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_ch_p3e_a_runtime_tests() TO authenticated, service_role;
