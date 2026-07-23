
-- PART 1: PREVIEW/APPROVAL SECURITY CLOSURES
-- ============================================================================
-- A. Actor derivation hardening (server-authoritative), C. correlation, redacted context
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assert_comm_hub_runtime_transition(p_action text, p_context jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE
  v_allowed_actions text[] := ARRAY[
    'PREPARE_PREVIEW','APPROVE_PREVIEW','START_DRY_RUN','CERTIFY_DRY_RUN',
    'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
    'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB','REVALIDATE_SEND_DECISION'
  ];
  v_reasons jsonb := '[]'::jsonb;
  v_uid uuid := auth.uid();
  v_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_actor_type text;
  v_expected_actor uuid := NULLIF(p_context->>'expected_actor_id','')::uuid;
  v_service_op text := NULLIF(p_context->>'service_operation','');
  v_actor uuid;
  v_module text := p_context->>'module_code';
  v_event text := p_context->>'event_code';
  v_channel text := COALESCE(p_context->>'channel','email');
  v_correlation uuid := NULLIF(p_context->>'correlation_id','')::uuid;
  v_allowed boolean := true;
  v_snap_id uuid := NULLIF(p_context->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := NULLIF(p_context->>'preview_approval_id','')::uuid;
  v_snap RECORD; v_appr RECORD;
  v_safe jsonb;
BEGIN
  -- SERVER-DERIVED actor: caller cannot select USER vs SERVICE_ROLE
  IF v_uid IS NOT NULL THEN
    v_actor_type := 'USER';
    v_actor := v_uid;
    IF v_expected_actor IS NOT NULL AND v_expected_actor <> v_uid THEN
      v_reasons := v_reasons || jsonb_build_object('code','ACTOR_IDENTITY_MISMATCH');
      v_allowed := false;
    END IF;
  ELSIF v_role = 'service_role' THEN
    v_actor_type := 'SERVICE_ROLE';
    v_actor := NULL;
    IF v_service_op IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','SERVICE_OPERATION_IDENTITY_REQUIRED');
      v_allowed := false;
    END IF;
  ELSE
    v_actor_type := 'UNAUTHENTICATED';
    v_reasons := v_reasons || jsonb_build_object('code','UNAUTHENTICATED_TRANSITION');
    v_allowed := false;
  END IF;

  -- Distinct denial codes for forbidden production transitions
  IF p_action IN ('START_ONE_REAL_EMAIL','DISPATCH_ONE_REAL_EMAIL','SEND_ONE_REAL_EMAIL') THEN
    v_reasons := v_reasons || jsonb_build_object('code','ONE_REAL_EMAIL_TRANSITION_DENIED'); v_allowed := false;
  ELSIF p_action = 'START_MANUAL_PRODUCTION' THEN
    v_reasons := v_reasons || jsonb_build_object('code','MANUAL_PRODUCTION_TRANSITION_DENIED'); v_allowed := false;
  ELSIF p_action = 'START_AUTOMATED_PRODUCTION' THEN
    v_reasons := v_reasons || jsonb_build_object('code','AUTOMATED_PRODUCTION_TRANSITION_DENIED'); v_allowed := false;
  ELSIF NOT (p_action = ANY(v_allowed_actions)) THEN
    v_reasons := v_reasons || jsonb_build_object('code','UNKNOWN_RUNTIME_TRANSITION','action',p_action); v_allowed := false;
  END IF;

  IF v_module IS NULL OR v_event IS NULL THEN
    v_reasons := v_reasons || jsonb_build_object('code','MODULE_EVENT_REQUIRED'); v_allowed := false;
  END IF;

  IF v_correlation IS NULL AND p_action = ANY(v_allowed_actions) AND p_action <> 'PREPARE_PREVIEW' THEN
    v_reasons := v_reasons || jsonb_build_object('code','CORRELATION_ID_REQUIRED'); v_allowed := false;
  END IF;

  -- Preview snapshot binding (scanner v2 evidence enforced)
  IF v_allowed AND p_action IN ('APPROVE_PREVIEW','START_DRY_RUN','CERTIFY_DRY_RUN',
                                'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE',
                                'CLAIM_TARGETED_MESSAGE','DISPATCH_CONTROLLED_STUB',
                                'CERTIFY_CONTROLLED_STUB','REVALIDATE_SEND_DECISION') THEN
    IF v_snap_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,status,module_code,event_code,channel,content_hash,recipient_set_hash,
             template_version_id,expires_at,raw_placeholder_count,correlation_id,
             placeholder_scanner_version,raw_placeholders,renderer_unresolved_variables,unresolved_variables
        INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_snap_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND'); v_allowed := false;
      ELSIF v_snap.module_code<>v_module OR v_snap.event_code<>v_event OR v_snap.channel<>v_channel THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SCOPE_MISMATCH'); v_allowed := false;
      ELSIF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_EXPIRED'); v_allowed := false;
      ELSIF v_snap.status = 'SUPERSEDED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_SUPERSEDED'); v_allowed := false;
      ELSIF v_snap.status NOT IN ('PREPARED','APPROVED') THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_USABLE','status',v_snap.status); v_allowed := false;
      ELSIF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_RAW_PLACEHOLDERS_PRESENT','count',v_snap.raw_placeholder_count); v_allowed := false;
      ELSIF v_snap.correlation_id IS NOT NULL AND v_correlation IS NOT NULL AND v_snap.correlation_id <> v_correlation THEN
        v_reasons := v_reasons || jsonb_build_object('code','CORRELATION_ID_MISMATCH'); v_allowed := false;
      END IF;

      -- E. Legacy/defaulted evidence rejection (scanner v2 required for APPROVE and downstream)
      IF v_snap.id IS NOT NULL AND (
           v_snap.placeholder_scanner_version IS NULL
           OR v_snap.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2'
           OR v_snap.raw_placeholders IS NULL
           OR v_snap.renderer_unresolved_variables IS NULL
           OR v_snap.unresolved_variables IS NULL
      ) THEN
        v_reasons := v_reasons || jsonb_build_object(
          'code','PREVIEW_PLACEHOLDER_EVIDENCE_MISSING_OR_LEGACY',
          'scanner_version', v_snap.placeholder_scanner_version);
        v_allowed := false;
      END IF;
    END IF;
  END IF;

  -- Approval binding
  IF v_allowed AND p_action IN ('START_DRY_RUN','CERTIFY_DRY_RUN','START_CONTROLLED_STUB',
                                'CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
                                'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB',
                                'REVALIDATE_SEND_DECISION') THEN
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
      ELSIF v_appr.expires_at IS NOT NULL AND v_appr.expires_at <= now() THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_APPROVAL_EXPIRED'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  v_safe := jsonb_strip_nulls(jsonb_build_object(
    'actor_type', v_actor_type,
    'service_operation', v_service_op,
    'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
    'correlation_id', v_correlation,
    'preview_snapshot_id', v_snap_id,
    'preview_approval_id', v_appr_id,
    'dry_run_certification_id', NULLIF(p_context->>'dry_run_certification_id','')::uuid,
    'execution_id', NULLIF(p_context->>'execution_id','')::uuid,
    'grant_id', NULLIF(p_context->>'grant_id','')::uuid,
    'message_id', NULLIF(p_context->>'message_id','')::uuid,
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
    'evaluator_version','4b3.security-closure-v1',
    'evaluated_at', now()
  );
END; $function$;

-- ============================================================================
-- B. Revoke direct INSERT on transition log (definer writes only)
-- ============================================================================
DROP POLICY IF EXISTS comm_hub_transition_log_insert ON public.comm_hub_runtime_transition_log;
DROP POLICY IF EXISTS comm_hub_transition_log_admin_select ON public.comm_hub_runtime_transition_log;

REVOKE INSERT, UPDATE, DELETE ON public.comm_hub_runtime_transition_log FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.comm_hub_runtime_transition_log FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.comm_hub_runtime_transition_log FROM authenticated;
REVOKE SELECT ON public.comm_hub_runtime_transition_log FROM anon;
-- Keep SELECT for authenticated but gate via policy below

ALTER TABLE public.comm_hub_runtime_transition_log ENABLE ROW LEVEL SECURITY;

-- Only Admins can SELECT via RLS
CREATE POLICY comm_hub_transition_log_admin_select
  ON public.comm_hub_runtime_transition_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- Explicitly forbid any insert/update/delete via RLS for authenticated
CREATE POLICY comm_hub_transition_log_no_insert
  ON public.comm_hub_runtime_transition_log
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY comm_hub_transition_log_no_update
  ON public.comm_hub_runtime_transition_log
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY comm_hub_transition_log_no_delete
  ON public.comm_hub_runtime_transition_log
  FOR DELETE TO authenticated USING (false);

GRANT ALL ON public.comm_hub_runtime_transition_log TO service_role;

-- ============================================================================
-- C. Admin-only safe-column reader RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_comm_hub_transition_log(
  p_limit int DEFAULT 100, p_offset int DEFAULT 0, p_correlation_id uuid DEFAULT NULL
) RETURNS TABLE(
  id uuid, action text, allowed boolean, actor_id uuid,
  module_code text, event_code text, channel text,
  correlation_id uuid, denied_reasons jsonb, created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'Admin'::app_role) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;
  RETURN QUERY
    SELECT l.id, l.action, l.allowed, l.actor_id,
           l.module_code, l.event_code, l.channel,
           l.correlation_id, l.denied_reasons, l.created_at
      FROM public.comm_hub_runtime_transition_log l
     WHERE (p_correlation_id IS NULL OR l.correlation_id = p_correlation_id)
     ORDER BY l.created_at DESC
     LIMIT GREATEST(1, LEAST(p_limit, 500)) OFFSET GREATEST(0, p_offset);
END; $$;
REVOKE ALL ON FUNCTION public.list_comm_hub_transition_log(int,int,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_comm_hub_transition_log(int,int,uuid) TO authenticated, service_role;

-- ============================================================================
-- D. Scanner v2 — fail-closed non-brace matcher, malformed detection, escape support
-- Escape mechanism: literal double braces expressed as \{{ ... \}} in source are
-- stripped BEFORE scanning; anything else counts.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.scan_comm_hub_raw_placeholders(
  p_subject text, p_body_html text, p_body_text text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public'
AS $function$
DECLARE
  v_pattern text := '\{\{([^{}]*)\}\}';               -- bounded non-brace body
  v_malformed_pattern text := '(\{\{\{|\}\}\}|\{\{[^}]*\{|\}[^{]*\}\})';
  v_result jsonb := '[]'::jsonb;
  v_names jsonb := '{}'::jsonb;
  v_field text; v_content text; v_raw text; v_m text[];
  v_total int := 0; v_uniq int := 0; v_malformed int := 0;
  v_name text; v_trim text;
BEGIN
  FOR v_field, v_raw IN
    SELECT * FROM (VALUES
      ('subject',   COALESCE(p_subject,'')),
      ('body_html', COALESCE(p_body_html,'')),
      ('body_text', COALESCE(p_body_text,''))) t(field, content)
  LOOP
    -- Strip escaped literal braces first: \{{ ... \}}
    v_content := regexp_replace(v_raw, '\\\{\{[^{}]*\\\}\}', '', 'g');

    -- Count malformed brace patterns
    v_malformed := v_malformed + (SELECT count(*) FROM regexp_matches(v_content, v_malformed_pattern, 'g'));

    FOR v_m IN SELECT regexp_matches(v_content, v_pattern, 'g') LOOP
      v_name := v_m[1];
      v_trim := btrim(v_name);
      IF v_trim = '' THEN
        v_malformed := v_malformed + 1;
        CONTINUE;
      END IF;
      v_total := v_total + 1;
      v_names := v_names || jsonb_build_object(v_trim, COALESCE((v_names->>v_trim)::int,0) + 1);
      v_result := v_result || jsonb_build_object('name', v_trim, 'field', v_field, 'raw', v_name);
    END LOOP;
  END LOOP;

  v_uniq := (SELECT count(*) FROM jsonb_object_keys(v_names));
  RETURN jsonb_build_object(
    'placeholders', v_result,
    'by_name', v_names,
    'total_occurrences', v_total,
    'unique_count', v_uniq,
    'malformed_brace_count', v_malformed,
    'scanner_version', 'comm-hub-raw-placeholder-scanner/v2'
  );
END; $function$;

-- ============================================================================
-- E. approve_comm_hub_preview: enforce scanner v2 evidence and malformed=0
-- ============================================================================
CREATE OR REPLACE FUNCTION public.approve_comm_hub_preview(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
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
  v_scan_rescan jsonb;
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

  -- Scanner v2 evidence required
  IF v_snap.placeholder_scanner_version IS NULL
     OR v_snap.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2' THEN
    RAISE EXCEPTION 'PREVIEW_PLACEHOLDER_EVIDENCE_MISSING_OR_LEGACY: scanner=%', v_snap.placeholder_scanner_version;
  END IF;
  IF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_PRESENT: count=%', v_snap.raw_placeholder_count;
  END IF;
  IF v_snap.unresolved_variables IS NOT NULL AND jsonb_array_length(v_snap.unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_UNRESOLVED_REQUIRED_VARIABLES: %', v_snap.unresolved_variables::text;
  END IF;
  IF v_snap.renderer_unresolved_variables IS NOT NULL
     AND jsonb_typeof(v_snap.renderer_unresolved_variables)='array'
     AND jsonb_array_length(v_snap.renderer_unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RENDERER_UNRESOLVED_VARIABLES: %', v_snap.renderer_unresolved_variables::text;
  END IF;

  -- Defence-in-depth: re-scan frozen content and require count=0 and malformed=0
  v_scan_rescan := public.scan_comm_hub_raw_placeholders(
    v_snap.rendered_subject, v_snap.rendered_body_html, v_snap.rendered_body_text);
  IF COALESCE((v_scan_rescan->>'total_occurrences')::int,0) > 0
     OR COALESCE((v_scan_rescan->>'malformed_brace_count')::int,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_DETECTED_ON_APPROVAL: %', v_scan_rescan::text;
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
    jsonb_build_object('correlation_id', v_correlation, 'gate', v_gate,
                       'placeholder_rescan', v_scan_rescan)
  ) RETURNING id INTO v_appr_id;

  BEGIN
    UPDATE public.communication_preview_snapshot SET status='APPROVED' WHERE id = v_snap.id;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'approval_id', v_appr_id, 'snapshot_id', v_snap.id, 'status', 'ACTIVE',
    'expires_at', v_expires, 'correlation_id', v_correlation,
    'placeholder_rescan', v_scan_rescan
  );
END; $function$;
