-- Phase 4B3 — Preview/Approval Evidence Closure
-- Rewrites prepare_comm_hub_preview and approve_comm_hub_preview so newly
-- created Previews carry a complete, internally consistent evidence package
-- (authoritative dependency hash + canonical governance_evidence bag) and
-- approvals refuse Previews that would inevitably fail preflight.

CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
  v_scan jsonb; v_raw_count int; v_malformed_count int; v_gate jsonb;
  v_resolver_unresolved jsonb; v_renderer_unresolved jsonb;
  v_resolver_required_unresolved int;
  v_dep_hash text;
  v_governance_evidence jsonb;
BEGIN
  IF v_module_code IS NULL OR v_event_code IS NULL THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;

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

  -- Scanner v2 (must return malformed_brace_count)
  v_scan := public.scan_comm_hub_raw_placeholders(
    v_render->>'rendered_subject',
    v_render->>'rendered_body_html',
    v_render->>'rendered_body_text');

  IF v_scan IS NULL OR (v_scan->>'scanner_version') IS DISTINCT FROM 'comm-hub-raw-placeholder-scanner/v2' THEN
    RETURN jsonb_build_object(
      'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_MISSING',
                                                       'detail','scanner_version_missing_or_not_v2')),
      'correlation_id', v_correlation);
  END IF;
  IF (v_scan->'malformed_brace_count') IS NULL
     OR jsonb_typeof(v_scan->'malformed_brace_count') <> 'number' THEN
    RETURN jsonb_build_object(
      'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_MISSING',
                                                       'detail','scanner_missing_malformed_brace_count')),
      'correlation_id', v_correlation);
  END IF;
  v_raw_count       := COALESCE((v_scan->>'total_occurrences')::int, 0);
  v_malformed_count := COALESCE((v_scan->>'malformed_brace_count')::int, 0);

  IF v_malformed_count > 0 THEN
    RETURN jsonb_build_object(
      'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','MALFORMED_BRACES_PRESENT',
                                                       'detail', jsonb_build_object('count', v_malformed_count))),
      'correlation_id', v_correlation);
  END IF;
  IF v_raw_count > 0 THEN
    RETURN jsonb_build_object(
      'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_RAW_PLACEHOLDERS_PRESENT',
                                                       'detail', jsonb_build_object('count', v_raw_count))),
      'correlation_id', v_correlation);
  END IF;

  v_resolver_unresolved := COALESCE(v_resolver->'unresolved_variables', '[]'::jsonb);
  v_renderer_unresolved := COALESCE(v_render->'unresolved_variables', '[]'::jsonb);
  v_resolver_required_unresolved := CASE
    WHEN jsonb_typeof(v_resolver_unresolved) = 'array' THEN jsonb_array_length(v_resolver_unresolved)
    ELSE 0
  END;

  -- Authoritative dependency hash (reuses Go Live certification helper)
  SELECT dependency_hash INTO v_dep_hash
    FROM public.build_comm_hub_certification_dependency_hash(v_ver.id);
  IF v_dep_hash IS NULL OR length(trim(v_dep_hash)) = 0 THEN
    RETURN jsonb_build_object(
      'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_DEPENDENCY_HASH_UNAVAILABLE',
                                                       'detail','authoritative_hash_builder_returned_null',
                                                       'template_version_id', v_ver.id::text)),
      'correlation_id', v_correlation);
  END IF;

  v_governance_evidence := jsonb_build_object(
    'evidence_version','comm-hub-preview-governance-evidence/v1',
    'raw_placeholders',   jsonb_build_object('count', v_raw_count),
    'malformed_braces',   jsonb_build_object('count', v_malformed_count),
    'renderer',           jsonb_build_object('unresolved_count',
                            CASE WHEN jsonb_typeof(v_renderer_unresolved)='array'
                                 THEN jsonb_array_length(v_renderer_unresolved) ELSE 0 END),
    'resolver',           jsonb_build_object('required_unresolved_count', v_resolver_required_unresolved),
    'dependency',         jsonb_build_object(
                            'certified_dependency_hash', v_dep_hash,
                            'current_dependency_hash',   v_dep_hash,
                            'template_version_id', v_ver.id::text,
                            'template_id',         v_tpl.id::text,
                            'schema_version',      'comm-hub-template-dependency-manifest/v1'),
    'scanner',            jsonb_build_object('version', v_scan->>'scanner_version'),
    'built_at',           to_char(v_generated_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

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
    raw_placeholders, raw_placeholder_count, placeholder_scanner_version,
    certified_dependency_hash, current_dependency_hash,
    governance_evidence, event_template_map_id
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
    v_scan->>'scanner_version',
    v_dep_hash,
    v_dep_hash,
    v_governance_evidence,
    v_map.id
  ) RETURNING id INTO v_snapshot_id;

  RETURN (SELECT to_jsonb(s.*) || jsonb_build_object(
            'status','PREPARED',
            'correlation_id', v_correlation,
            'raw_placeholder_scan', v_scan)
          FROM public.communication_preview_snapshot s WHERE s.id = v_snapshot_id);
END; $function$;


CREATE OR REPLACE FUNCTION public.approve_comm_hub_preview(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_snap_id uuid := (p_payload->>'snapshot_id')::uuid;
  v_reason text := trim(coalesce(p_payload->>'approval_reason',''));
  v_expected_hash text := nullif(p_payload->>'expected_content_hash','');
  v_expected_recip text := nullif(p_payload->>'expected_recipient_set_hash','');
  v_correlation uuid := NULLIF(p_payload->>'correlation_id','')::uuid;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr_id uuid; v_expires timestamptz; v_approved_at timestamptz;
  v_gate jsonb; v_scan_rescan jsonb;
  v_placeholder_hash text; v_canonical_hash text;
  v_blockers jsonb := '[]'::jsonb;
  v_ge jsonb; v_mb jsonb; v_mb_count int;
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

  v_gate := public.check_comm_hub_runtime_transition_safe('APPROVE_PREVIEW', jsonb_build_object(
    'module_code', v_snap.module_code, 'event_code', v_snap.event_code, 'channel', v_snap.channel,
    'correlation_id', v_correlation, 'preview_snapshot_id', v_snap_id,
    'content_hash', v_snap.content_hash, 'recipient_set_hash', v_snap.recipient_set_hash,
    'invoked_from', 'approve_comm_hub_preview'
  ));
  IF COALESCE((v_gate->>'allowed')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'status','BLOCKED', 'approval_id', NULL,
      'blockers', COALESCE(v_gate->'blockers', v_gate->'denied_reasons', '[]'::jsonb),
      'transition_log_id', v_gate->>'transition_log_id', 'gate', v_gate);
  END IF;

  IF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
    UPDATE public.communication_preview_snapshot SET status='EXPIRED' WHERE id = v_snap.id;
    RAISE EXCEPTION 'PREVIEW_SNAPSHOT_EXPIRED';
  END IF;
  IF v_snap.status = 'SUPERSEDED' THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_SUPERSEDED'; END IF;
  IF v_snap.status <> 'PREPARED' THEN
    RAISE EXCEPTION 'preview_snapshot_not_approvable: status=%', v_snap.status;
  END IF;

  -- Evidence completeness pre-checks (structured BLOCKED, no insert)
  IF COALESCE(v_snap.certified_dependency_hash,'') = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_CONFIGURATION_HASH_MISSING');
  END IF;
  IF COALESCE(v_snap.current_dependency_hash,'') = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_CONFIGURATION_HASH_MISSING',
                                                   'detail','current_dependency_hash_missing');
  END IF;
  IF COALESCE(v_snap.certified_dependency_hash,'') <> ''
     AND COALESCE(v_snap.current_dependency_hash,'') <> ''
     AND v_snap.certified_dependency_hash <> v_snap.current_dependency_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_DEPENDENCY_HASH_DRIFT');
  END IF;

  v_ge := COALESCE(v_snap.governance_evidence, '{}'::jsonb);
  IF (v_ge->>'evidence_version') IS NULL OR jsonb_typeof(v_ge) <> 'object' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_GOVERNANCE_EVIDENCE_INCOMPLETE',
                                                   'detail','evidence_version_missing');
  END IF;
  v_mb := v_ge->'malformed_braces';
  IF v_mb IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_MISSING');
  ELSIF jsonb_typeof(v_mb) <> 'object' OR jsonb_typeof(v_mb->'count') <> 'number' THEN
    v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACE_EVIDENCE_INVALID');
  ELSE
    v_mb_count := (v_mb->>'count')::int;
    IF v_mb_count > 0 THEN
      v_blockers := v_blockers || jsonb_build_object('code','MALFORMED_BRACES_PRESENT',
                                                     'detail', jsonb_build_object('count', v_mb_count));
    END IF;
  END IF;

  IF v_snap.placeholder_scanner_version IS NULL
     OR v_snap.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_PLACEHOLDER_EVIDENCE_MISSING_OR_LEGACY');
  END IF;

  IF jsonb_array_length(v_blockers) > 0 THEN
    RETURN jsonb_build_object(
      'status','BLOCKED', 'approval_id', NULL,
      'snapshot_id', v_snap.id,
      'blockers', v_blockers,
      'correlation_id', v_correlation);
  END IF;

  -- Legacy per-error guards preserved
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

  v_approved_at := now();
  v_expires     := v_approved_at + interval '30 minutes';

  v_placeholder_hash := public._comm_hub_compute_placeholder_evidence_v1(
    v_snap.placeholder_scanner_version, v_scan_rescan);
  v_canonical_hash := public._comm_hub_compute_canonical_approval_evidence_v1(
    v_snap.id, v_correlation, v_snap.content_hash,
    v_snap.recipient_set_hash, v_snap.template_version_id,
    v_snap.certified_dependency_hash, v_snap.placeholder_scanner_version,
    v_placeholder_hash, v_uid, v_approved_at, v_expires);

  INSERT INTO public.communication_preview_approval(
    snapshot_id, approved_by, approved_at, approval_reason, status, expires_at,
    configuration_version, recipient_policy_version,
    content_hash_at_approval, audit_metadata,
    snapshot_id_at_approval, correlation_id_at_approval,
    recipient_set_hash_at_approval, template_version_id_at_approval,
    configuration_hash_at_approval, scanner_version_at_approval,
    placeholder_evidence_hash_at_approval,
    canonical_approval_evidence_hash, evidence_version
  ) VALUES (
    v_snap.id, v_uid, v_approved_at, v_reason, 'ACTIVE', v_expires,
    v_snap.configuration_version, v_snap.recipient_policy_version,
    v_snap.content_hash,
    jsonb_build_object('correlation_id', v_correlation, 'gate', v_gate,
                       'placeholder_rescan', v_scan_rescan,
                       'evidence_version','comm-hub-approval-evidence/v1'),
    v_snap.id, v_correlation,
    v_snap.recipient_set_hash, v_snap.template_version_id,
    v_snap.certified_dependency_hash, v_snap.placeholder_scanner_version,
    v_placeholder_hash,
    v_canonical_hash, 'comm-hub-approval-evidence/v1'
  ) RETURNING id INTO v_appr_id;

  RETURN jsonb_build_object(
    'status','ACTIVE',
    'approval_id', v_appr_id, 'snapshot_id', v_snap.id,
    'expires_at', v_expires, 'approved_at', v_approved_at,
    'correlation_id', v_correlation,
    'canonical_approval_evidence_hash', v_canonical_hash,
    'placeholder_evidence_hash', v_placeholder_hash,
    'evidence_version', 'comm-hub-approval-evidence/v1',
    'placeholder_rescan', v_scan_rescan,
    'configuration_hash_at_approval', v_snap.certified_dependency_hash
  );
END; $function$;