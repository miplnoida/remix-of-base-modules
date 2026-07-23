
-- =====================================================================
-- Phase 4B3 — Preview/Approval runtime boundary integration
-- =====================================================================

-- A. Snapshot evidence columns (additive, nullable) ---------------------
ALTER TABLE public.communication_preview_snapshot
  ADD COLUMN IF NOT EXISTS correlation_id uuid,
  ADD COLUMN IF NOT EXISTS renderer_unresolved_variables jsonb,
  ADD COLUMN IF NOT EXISTS raw_placeholders jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_placeholder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placeholder_scanner_version text;

CREATE INDEX IF NOT EXISTS communication_preview_snapshot_corr_idx
  ON public.communication_preview_snapshot(correlation_id);

-- B. Append-only + RLS on transition log --------------------------------
ALTER TABLE public.comm_hub_runtime_transition_log ENABLE ROW LEVEL SECURITY;

REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.comm_hub_runtime_transition_log FROM PUBLIC;
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON public.comm_hub_runtime_transition_log FROM authenticated, anon;
GRANT INSERT ON public.comm_hub_runtime_transition_log TO authenticated;
GRANT ALL ON public.comm_hub_runtime_transition_log TO service_role;

DROP POLICY IF EXISTS comm_hub_transition_log_admin_select ON public.comm_hub_runtime_transition_log;
CREATE POLICY comm_hub_transition_log_admin_select
  ON public.comm_hub_runtime_transition_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

DROP POLICY IF EXISTS comm_hub_transition_log_insert ON public.comm_hub_runtime_transition_log;
CREATE POLICY comm_hub_transition_log_insert
  ON public.comm_hub_runtime_transition_log FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.comm_hub_transition_log_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'comm_hub_runtime_transition_log is append-only (op=%)', TG_OP;
END; $$;

DROP TRIGGER IF EXISTS trg_comm_hub_transition_log_no_update ON public.comm_hub_runtime_transition_log;
CREATE TRIGGER trg_comm_hub_transition_log_no_update
  BEFORE UPDATE ON public.comm_hub_runtime_transition_log
  FOR EACH ROW EXECUTE FUNCTION public.comm_hub_transition_log_immutable();

DROP TRIGGER IF EXISTS trg_comm_hub_transition_log_no_delete ON public.comm_hub_runtime_transition_log;
CREATE TRIGGER trg_comm_hub_transition_log_no_delete
  BEFORE DELETE ON public.comm_hub_runtime_transition_log
  FOR EACH ROW EXECUTE FUNCTION public.comm_hub_transition_log_immutable();

-- C. Redacted admin view ------------------------------------------------
CREATE OR REPLACE VIEW public.v_comm_hub_transition_log_safe AS
SELECT id, action, allowed, actor_id,
       (context->>'actor_type') AS actor_type,
       module_code, event_code, channel, correlation_id,
       context - 'context_data' - 'to_recipients' - 'cc_recipients' - 'bcc_recipients'
               - 'subject' - 'body_html' - 'body_text' - 'tokens' - 'payload'
               - 'raw_placeholders'
         AS safe_context,
       denied_reasons, created_at
FROM public.comm_hub_runtime_transition_log;

GRANT SELECT ON public.v_comm_hub_transition_log_safe TO authenticated;

-- D. Generic raw-placeholder scanner -----------------------------------
CREATE OR REPLACE FUNCTION public.scan_comm_hub_raw_placeholders(
  p_subject text, p_body_html text, p_body_text text
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_pattern text := '\{\{\s*([A-Za-z0-9_$:\.\-\[\]\(\)]+)\s*\}\}';
  v_result jsonb := '[]'::jsonb;
  v_by_name jsonb := '{}'::jsonb;
  v_field text; v_content text; v_m text[];
  v_total int := 0;
  v_uniq int := 0;
  v_name text;
  v_names jsonb := '{}'::jsonb;
BEGIN
  FOR v_field, v_content IN
    SELECT * FROM (VALUES
      ('subject',   COALESCE(p_subject,'')),
      ('body_html', COALESCE(p_body_html,'')),
      ('body_text', COALESCE(p_body_text,''))) t(field, content)
  LOOP
    FOR v_m IN SELECT regexp_matches(v_content, v_pattern, 'g') LOOP
      v_name := v_m[1];
      v_total := v_total + 1;
      v_names := v_names || jsonb_build_object(v_name, COALESCE((v_names->>v_name)::int,0) + 1);
      v_result := v_result || jsonb_build_object('name', v_name, 'field', v_field);
    END LOOP;
  END LOOP;
  v_uniq := (SELECT count(*) FROM jsonb_object_keys(v_names));
  RETURN jsonb_build_object(
    'placeholders', v_result,
    'by_name', v_names,
    'total_occurrences', v_total,
    'unique_count', v_uniq,
    'scanner_version', 'comm-hub-raw-placeholder-scanner/v1'
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.scan_comm_hub_raw_placeholders(text,text,text)
  TO authenticated, service_role;

-- E. Hardened assert_comm_hub_runtime_transition -----------------------
CREATE OR REPLACE FUNCTION public.assert_comm_hub_runtime_transition(
  p_action text,
  p_context jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_allowed_actions text[] := ARRAY[
    'PREPARE_PREVIEW','APPROVE_PREVIEW','START_DRY_RUN','CERTIFY_DRY_RUN',
    'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
    'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB'
  ];
  v_reasons jsonb := '[]'::jsonb;
  v_uid uuid := auth.uid();
  v_actor_type text := COALESCE(NULLIF(p_context->>'actor_type',''), CASE WHEN v_uid IS NULL THEN 'SERVICE_ROLE' ELSE 'USER' END);
  v_expected_actor uuid := NULLIF(p_context->>'expected_actor_id','')::uuid;
  v_actor uuid;
  v_module text := p_context->>'module_code';
  v_event text := p_context->>'event_code';
  v_channel text := COALESCE(p_context->>'channel','email');
  v_correlation uuid := NULLIF(p_context->>'correlation_id','')::uuid;
  v_allowed boolean := true;
  v_snap_id uuid := NULLIF(p_context->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := NULLIF(p_context->>'preview_approval_id','')::uuid;
  v_dry_cert_id uuid := NULLIF(p_context->>'dry_run_certification_id','')::uuid;
  v_exec_id uuid := NULLIF(p_context->>'execution_id','')::uuid;
  v_grant_id uuid := NULLIF(p_context->>'grant_id','')::uuid;
  v_msg_id uuid := NULLIF(p_context->>'message_id','')::uuid;
  v_snap RECORD; v_appr RECORD; v_dry RECORD; v_exec RECORD; v_grant RECORD; v_msg RECORD;
  v_safe jsonb;
BEGIN
  -- Distinct denial codes
  IF p_action IN ('START_ONE_REAL_EMAIL','DISPATCH_ONE_REAL_EMAIL') THEN
    v_reasons := v_reasons || jsonb_build_object('code','ONE_REAL_EMAIL_TRANSITION_DENIED'); v_allowed := false;
  ELSIF p_action = 'START_MANUAL_PRODUCTION' THEN
    v_reasons := v_reasons || jsonb_build_object('code','MANUAL_PRODUCTION_TRANSITION_DENIED'); v_allowed := false;
  ELSIF p_action = 'START_AUTOMATED_PRODUCTION' THEN
    v_reasons := v_reasons || jsonb_build_object('code','AUTOMATED_PRODUCTION_TRANSITION_DENIED'); v_allowed := false;
  ELSIF NOT (p_action = ANY(v_allowed_actions)) THEN
    v_reasons := v_reasons || jsonb_build_object('code','UNKNOWN_RUNTIME_TRANSITION','action',p_action); v_allowed := false;
  END IF;

  -- Server-derived actor
  IF v_actor_type = 'USER' THEN
    IF v_uid IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','UNAUTHENTICATED_TRANSITION'); v_allowed := false;
      v_actor := NULL;
    ELSE
      v_actor := v_uid;
      IF v_expected_actor IS NOT NULL AND v_expected_actor <> v_uid THEN
        v_reasons := v_reasons || jsonb_build_object('code','ACTOR_IDENTITY_MISMATCH'); v_allowed := false;
      END IF;
    END IF;
  ELSIF v_actor_type = 'SERVICE_ROLE' THEN
    v_actor := NULL;
  ELSE
    v_reasons := v_reasons || jsonb_build_object('code','UNSUPPORTED_ACTOR_TYPE','actor_type',v_actor_type);
    v_allowed := false;
  END IF;

  IF v_module IS NULL OR v_event IS NULL THEN
    v_reasons := v_reasons || jsonb_build_object('code','MODULE_EVENT_REQUIRED'); v_allowed := false;
  END IF;

  -- Correlation required for every gated transition
  IF v_correlation IS NULL AND p_action = ANY(v_allowed_actions) AND p_action <> 'PREPARE_PREVIEW' THEN
    v_reasons := v_reasons || jsonb_build_object('code','CORRELATION_ID_REQUIRED'); v_allowed := false;
  END IF;

  IF v_allowed AND p_action IN ('APPROVE_PREVIEW','START_DRY_RUN','CERTIFY_DRY_RUN',
                                'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE',
                                'CLAIM_TARGETED_MESSAGE','DISPATCH_CONTROLLED_STUB',
                                'CERTIFY_CONTROLLED_STUB') THEN
    IF v_snap_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,status,module_code,event_code,channel,content_hash,recipient_set_hash,
             template_version_id,expires_at,raw_placeholder_count,correlation_id
        INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_snap_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND'); v_allowed := false;
      ELSIF v_snap.module_code<>v_module OR v_snap.event_code<>v_event OR v_snap.channel<>v_channel THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SCOPE_MISMATCH'); v_allowed := false;
      ELSIF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_EXPIRED'); v_allowed := false;
      ELSIF v_snap.status = 'SUPERSEDED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_SUPERSEDED'); v_allowed := false;
      ELSIF v_snap.status <> 'PREPARED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_USABLE','status',v_snap.status); v_allowed := false;
      ELSIF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_RAW_PLACEHOLDERS_PRESENT','count',v_snap.raw_placeholder_count); v_allowed := false;
      ELSIF v_snap.correlation_id IS NOT NULL AND v_correlation IS NOT NULL AND v_snap.correlation_id <> v_correlation THEN
        v_reasons := v_reasons || jsonb_build_object('code','CORRELATION_ID_MISMATCH'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  IF v_allowed AND p_action IN ('START_DRY_RUN','CERTIFY_DRY_RUN','START_CONTROLLED_STUB',
                                'CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
                                'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB') THEN
    IF v_appr_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,snapshot_id,status,expires_at,content_hash_at_approval INTO v_appr
        FROM public.communication_preview_approval WHERE id=v_appr_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND'); v_allowed := false;
      ELSIF v_appr.status NOT IN ('ACTIVE','RESERVED','CONSUMED') THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_USABLE','status',v_appr.status); v_allowed := false;
      ELSIF v_appr.snapshot_id IS DISTINCT FROM v_snap_id THEN
        v_reasons := v_reasons || jsonb_build_object('code','APPROVAL_SNAPSHOT_MISMATCH'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  -- Build redacted persisted context (identifiers/hashes only)
  v_safe := jsonb_strip_nulls(jsonb_build_object(
    'actor_type', v_actor_type,
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'correlation_id', v_correlation,
    'preview_snapshot_id', v_snap_id,
    'preview_approval_id', v_appr_id,
    'dry_run_certification_id', v_dry_cert_id,
    'execution_id', v_exec_id, 'grant_id', v_grant_id, 'message_id', v_msg_id,
    'content_hash', p_context->>'content_hash',
    'recipient_set_hash', p_context->>'recipient_set_hash',
    'manifest_hash', p_context->>'manifest_hash',
    'invoked_from', p_context->>'invoked_from'
  ));

  INSERT INTO public.comm_hub_runtime_transition_log(
    action,allowed,actor_id,module_code,event_code,channel,context,denied_reasons,correlation_id
  ) VALUES (
    p_action, v_allowed, v_actor, v_module, v_event, v_channel,
    v_safe, v_reasons, v_correlation
  );

  RETURN jsonb_build_object(
    'allowed', v_allowed, 'action', p_action,
    'denied_reasons', v_reasons,
    'actor_id', v_actor, 'actor_type', v_actor_type,
    'correlation_id', v_correlation,
    'evaluator_version','4b3.preview-approval-boundary',
    'evaluated_at', now()
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.assert_comm_hub_runtime_transition(text,jsonb)
  TO authenticated, service_role;

-- F. Wire PREPARE_PREVIEW ---------------------------------------------
CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_module_code text := p_payload->>'module_code';
  v_event_code  text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel','email');
  v_send_ctx    text := COALESCE(p_payload->>'send_context','preview');
  v_to  jsonb := COALESCE(p_payload->'to_recipients','[]'::jsonb);
  v_cc  jsonb := COALESCE(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := COALESCE(p_payload->'bcc_recipients','[]'::jsonb);
  v_sender_id uuid := NULLIF(p_payload->>'sender_profile_id','')::uuid;
  v_sender RECORD;
  v_ctx_in jsonb := public.comm_hub_scrub_protected_keys(COALESCE(p_payload->'context_data','{}'::jsonb));
  v_map RECORD; v_tpl RECORD; v_ver RECORD; v_policy RECORD; v_scenario RECORD;
  v_recipient_name text; v_recipient_name_confirmed boolean := false;
  v_request_no text;
  v_generated_at timestamptz := now();
  v_tokens jsonb;
  v_system_tokens jsonb; v_request_tokens jsonb; v_recipient_tokens jsonb := '{}'::jsonb;
  v_resolver jsonb;
  v_render jsonb;
  v_snapshot_id uuid; v_recipient_hash text; v_first_to text;
  v_correlation uuid := COALESCE(NULLIF(p_payload->>'correlation_id','')::uuid, gen_random_uuid());
  v_scan jsonb; v_raw_count int; v_gate jsonb;
  v_resolver_unresolved jsonb; v_renderer_unresolved jsonb;
BEGIN
  IF v_module_code IS NULL OR v_event_code IS NULL THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;

  -- Runtime transition gate (actor derived server-side)
  v_gate := public.assert_comm_hub_runtime_transition('PREPARE_PREVIEW', jsonb_build_object(
    'module_code', v_module_code, 'event_code', v_event_code, 'channel', v_channel,
    'correlation_id', v_correlation, 'invoked_from', 'prepare_comm_hub_preview'
  ));
  IF (v_gate->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'runtime_transition_denied: %', v_gate->'denied_reasons';
  END IF;

  SELECT * INTO v_map FROM public.communication_hub_event_template_map
    WHERE module_code = v_module_code AND event_code = v_event_code AND active = true LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no active template mapped for %/%', v_module_code, v_event_code; END IF;
  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_map.template_id;
  SELECT * INTO v_ver FROM public.core_template_version WHERE id = v_tpl.active_version_id;
  SELECT * INTO v_policy FROM public.communication_hub_recipient_policy LIMIT 1;

  IF v_sender_id IS NULL THEN v_sender_id := NULLIF(v_map.sender_profile_id::text,'')::uuid; END IF;
  IF v_sender_id IS NULL THEN
    SELECT id INTO v_sender_id FROM public.communication_hub_sender_profile
     WHERE is_enabled=true AND is_default=true AND (channel IS NULL OR channel = v_channel)
     ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF v_sender_id IS NULL THEN
    SELECT id INTO v_sender_id FROM public.communication_hub_sender_profile
     WHERE is_enabled=true AND (channel IS NULL OR channel = v_channel)
     ORDER BY is_default DESC NULLS LAST, updated_at DESC LIMIT 1;
  END IF;
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'sender_profile_missing: no active sender profile is configured for channel %', v_channel;
  END IF;
  SELECT * INTO v_sender FROM public.communication_hub_sender_profile WHERE id = v_sender_id;
  IF NOT FOUND OR COALESCE(v_sender.is_enabled,false)=false
     OR NULLIF(trim(COALESCE(v_sender.from_email,'')),'') IS NULL THEN
    RAISE EXCEPTION 'sender_profile_invalid: sender profile % is unusable', v_sender_id;
  END IF;

  v_first_to := CASE WHEN jsonb_array_length(v_to) > 0 THEN lower(trim(v_to->>0)) ELSE NULL END;

  IF v_policy.active_mode = 'SINGLE_CONFIGURED_RECIPIENT'
     AND v_policy.single_configured_display_name IS NOT NULL
     AND v_policy.single_configured_display_name_confirmed = true THEN
    v_recipient_name := v_policy.single_configured_display_name;
    v_recipient_name_confirmed := true;
  END IF;

  v_request_no := 'TEST-COMM-' || to_char(v_generated_at,'YYYYMMDD') || '-' ||
                  substr(replace(gen_random_uuid()::text,'-',''),1,8);

  v_system_tokens := jsonb_build_object(
    'module_code', v_module_code, 'event_code', v_event_code, 'channel', v_channel,
    'generated_at', to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'),
    'current_date', to_char(v_generated_at,'YYYY-MM-DD'),
    'correlation_id', v_correlation::text);
  v_request_tokens := jsonb_build_object(
    'request_no', v_request_no,
    'request_id', gen_random_uuid()::text,
    'requested_at', to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'));
  IF v_recipient_name IS NOT NULL THEN
    v_recipient_tokens := v_recipient_tokens || jsonb_build_object('display_name', v_recipient_name);
  END IF;
  IF v_first_to IS NOT NULL THEN
    v_recipient_tokens := v_recipient_tokens || jsonb_build_object('email', v_first_to);
  END IF;

  SELECT * INTO v_scenario FROM public.communication_hub_event_test_scenario
    WHERE module_code=v_module_code AND event_code=v_event_code
      AND channel=v_channel AND is_active=true
    ORDER BY (scenario_key='default') DESC, updated_at DESC LIMIT 1;

  v_resolver := public.resolve_comm_hub_template_variables(
    v_ver.id, v_module_code, v_event_code, v_channel, 'PREVIEW_TEST',
    v_scenario.id,
    COALESCE(v_scenario.tokens,'{}'::jsonb),
    v_recipient_tokens, v_request_tokens, v_system_tokens
  );

  v_tokens := (v_resolver->'tokens') || v_ctx_in || v_recipient_tokens || v_system_tokens || v_request_tokens;
  v_render := public.render_comm_hub_template_version(v_ver.id, v_tokens, v_channel, 'PREVIEW_TEST');
  v_recipient_hash := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);

  -- Generic raw-placeholder scan (module-agnostic)
  v_scan := public.scan_comm_hub_raw_placeholders(
    v_render->>'rendered_subject',
    v_render->>'rendered_body_html',
    v_render->>'rendered_body_text');
  v_raw_count := COALESCE((v_scan->>'total_occurrences')::int, 0);

  v_resolver_unresolved := COALESCE(v_resolver->'unresolved_variables', '[]'::jsonb);
  v_renderer_unresolved := COALESCE(v_render->'unresolved_variables', '[]'::jsonb);

  UPDATE public.communication_preview_snapshot
     SET status = 'SUPERSEDED'
   WHERE module_code=v_module_code AND event_code=v_event_code
     AND channel=v_channel AND recipient_set_hash=v_recipient_hash AND status='PREPARED';

  INSERT INTO public.communication_preview_snapshot(
    id, module_code, event_code, channel, send_context,
    to_recipients, cc_recipients, bcc_recipients, recipient_set_hash,
    template_id, template_version_id, sender_profile_id,
    rendered_subject, rendered_body_html, rendered_body_text,
    subject_hash, body_hash, content_hash, context_hash,
    unresolved_variables, context_data, status, expires_at, created_at,
    resolver_version, resolved_token_bundle, variable_evidence,
    unresolved_variables_normalised, test_scenario_id, test_scenario_hash,
    request_context_values, correlation_id, renderer_unresolved_variables,
    raw_placeholders, raw_placeholder_count, placeholder_scanner_version
  ) VALUES (
    gen_random_uuid(), v_module_code, v_event_code, v_channel, v_send_ctx,
    v_to, v_cc, v_bcc, v_recipient_hash,
    v_tpl.id, v_ver.id, v_sender_id,
    v_render->>'rendered_subject', v_render->>'rendered_body_html', v_render->>'rendered_body_text',
    v_render->>'subject_hash', v_render->>'body_hash', v_render->>'content_hash',
    encode(extensions.digest(v_tokens::text,'sha256'),'hex'),
    COALESCE(v_resolver->'unresolved_variables', v_render->'unresolved_variables'),
    v_tokens || jsonb_build_object(
      'request_no', v_request_no,
      'recipient_name_confirmed', v_recipient_name_confirmed,
      'scenario_id',  COALESCE(v_scenario.id::text, NULL),
      'scenario_key', COALESCE(v_scenario.scenario_key, NULL),
      'template_purpose', v_render->>'template_purpose',
      'canonical_renderer_version', v_render->>'canonical_renderer_version'
    ),
    'PREPARED', now() + interval '24 hours', now(),
    v_resolver->>'resolver_version',
    v_resolver->'tokens',
    v_resolver->'evidence',
    v_resolver->'unresolved_variables',
    (v_resolver->>'test_scenario_id')::uuid,
    v_resolver->>'test_scenario_hash',
    v_request_tokens,
    v_correlation,
    v_renderer_unresolved,
    v_scan->'placeholders',
    v_raw_count,
    v_scan->>'scanner_version'
  ) RETURNING id INTO v_snapshot_id;

  RETURN (SELECT to_jsonb(s.*) || jsonb_build_object('correlation_id', v_correlation, 'raw_placeholder_scan', v_scan)
          FROM public.communication_preview_snapshot s WHERE s.id = v_snapshot_id);
END; $$;

GRANT EXECUTE ON FUNCTION public.prepare_comm_hub_preview(jsonb) TO authenticated, service_role;

-- G. Wire APPROVE_PREVIEW ---------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_snap_id uuid := (p_payload->>'snapshot_id')::uuid;
  v_reason text := trim(coalesce(p_payload->>'approval_reason',''));
  v_expected_hash text := nullif(p_payload->>'expected_content_hash','');
  v_expected_recip text := nullif(p_payload->>'expected_recipient_set_hash','');
  v_correlation uuid := NULLIF(p_payload->>'correlation_id','')::uuid;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr_id uuid; v_expires timestamptz;
  v_cfg_now bigint; v_rp_now integer;
  v_gate jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid,'Admin'::app_role) THEN
    RAISE EXCEPTION 'preview approval requires Admin role';
  END IF;
  IF v_snap_id IS NULL THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_REQUIRED'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'approval_reason is required and cannot be empty'; END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_NOT_FOUND'; END IF;

  IF v_correlation IS NULL THEN v_correlation := v_snap.correlation_id; END IF;

  v_gate := public.assert_comm_hub_runtime_transition('APPROVE_PREVIEW', jsonb_build_object(
    'module_code', v_snap.module_code, 'event_code', v_snap.event_code, 'channel', v_snap.channel,
    'correlation_id', v_correlation, 'preview_snapshot_id', v_snap_id,
    'content_hash', v_snap.content_hash, 'recipient_set_hash', v_snap.recipient_set_hash,
    'invoked_from', 'approve_comm_hub_preview'
  ));
  IF (v_gate->>'allowed')::boolean = false THEN
    RAISE EXCEPTION 'runtime_transition_denied: %', v_gate->'denied_reasons';
  END IF;

  IF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
    UPDATE public.communication_preview_snapshot SET status='EXPIRED' WHERE id = v_snap.id;
    RAISE EXCEPTION 'PREVIEW_SNAPSHOT_EXPIRED';
  END IF;
  IF v_snap.status = 'SUPERSEDED' THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_SUPERSEDED'; END IF;
  IF v_snap.status <> 'PREPARED' THEN RAISE EXCEPTION 'preview_snapshot_not_approvable: status=%', v_snap.status; END IF;
  IF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_PRESENT: count=% placeholders=%', v_snap.raw_placeholder_count, v_snap.raw_placeholders::text;
  END IF;
  IF v_snap.unresolved_variables IS NOT NULL AND jsonb_array_length(v_snap.unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_UNRESOLVED_REQUIRED_VARIABLES: %', v_snap.unresolved_variables::text;
  END IF;
  IF v_snap.renderer_unresolved_variables IS NOT NULL
     AND jsonb_typeof(v_snap.renderer_unresolved_variables) = 'array'
     AND jsonb_array_length(v_snap.renderer_unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RENDERER_UNRESOLVED_VARIABLES: %', v_snap.renderer_unresolved_variables::text;
  END IF;
  IF v_expected_hash IS NOT NULL AND v_expected_hash <> v_snap.content_hash THEN
    RAISE EXCEPTION 'PREVIEW_CONTENT_HASH_MISMATCH';
  END IF;
  IF v_expected_recip IS NOT NULL AND v_expected_recip <> v_snap.recipient_set_hash THEN
    RAISE EXCEPTION 'PREVIEW_RECIPIENT_HASH_MISMATCH';
  END IF;
  IF v_correlation IS NOT NULL AND v_snap.correlation_id IS NOT NULL AND v_snap.correlation_id <> v_correlation THEN
    RAISE EXCEPTION 'CORRELATION_ID_MISMATCH';
  END IF;

  SELECT configuration_version INTO v_cfg_now FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_rp_now FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';
  IF v_cfg_now IS DISTINCT FROM v_snap.configuration_version THEN
    RAISE EXCEPTION 'preview_configuration_changed';
  END IF;
  IF v_rp_now IS DISTINCT FROM v_snap.recipient_policy_version THEN
    RAISE EXCEPTION 'preview_policy_changed';
  END IF;

  v_expires := now() + interval '30 minutes';

  INSERT INTO public.communication_preview_approval(
    snapshot_id, approved_by, approval_reason, status, expires_at,
    configuration_version, recipient_policy_version,
    content_hash_at_approval, audit_metadata
  ) VALUES (
    v_snap.id, v_uid, v_reason, 'ACTIVE', v_expires,
    v_snap.configuration_version, v_snap.recipient_policy_version,
    v_snap.content_hash,
    jsonb_build_object('correlation_id', v_correlation, 'gate', v_gate)
  ) RETURNING id INTO v_appr_id;

  BEGIN
    INSERT INTO public.communication_hub_control_audit(setting_key,new_value,reason,changed_by,source)
    VALUES ('preview_approval_created:'||v_snap.module_code||':'||v_snap.event_code,
      jsonb_build_object('approval_id',v_appr_id,'snapshot_id',v_snap.id,
        'content_hash',v_snap.content_hash,'recipient_set_hash',v_snap.recipient_set_hash,
        'correlation_id', v_correlation),
      v_reason, v_uid, 'approve_comm_hub_preview');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'ok', true, 'approval_id', v_appr_id, 'snapshot_id', v_snap.id,
    'status', 'ACTIVE', 'expires_at', v_expires,
    'content_hash', v_snap.content_hash,
    'recipient_set_hash', v_snap.recipient_set_hash,
    'correlation_id', v_correlation
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.approve_comm_hub_preview(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.assert_comm_hub_runtime_transition IS
'Phase 4B3 canonical runtime-transition gate: server-derived actor, correlation-id enforced, distinct denial codes, redacted persisted context.';
COMMENT ON FUNCTION public.scan_comm_hub_raw_placeholders IS
'Generic {{token}} scanner — module/event/template/channel agnostic. Returns placeholders, per-name counts, totals, unique count, and scanner_version.';
