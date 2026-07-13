-- EPIC PROD-2A — Additive runtime gate parity RPC.
-- READ-ONLY. Composes existing evaluators; does not change their behavior
-- and does not enforce any new blocker. Callers of the legacy evaluator
-- (send_communication_v1, comm-hub-enqueue, comm-hub-event-pilot) are
-- unaffected.
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_runtime_gate_status(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module     text := p_payload->>'module_code';
  v_event      text := p_payload->>'event_code';
  v_channel    text := coalesce(p_payload->>'channel','email');
  v_send_mode  text := coalesce(p_payload->>'send_mode', p_payload->>'mode', 'dry_run');
  v_recipient  text := lower(coalesce(p_payload->>'recipient_email',''));
  v_rec_count  int  := coalesce((p_payload->>'recipient_count')::int, CASE WHEN v_recipient <> '' THEN 1 ELSE 0 END);
  v_tpl_ver    text := coalesce(p_payload->>'template_version_id','');
  v_preview_ok boolean := coalesce((p_payload->>'preview_confirmed')::boolean, false);

  v_blockers   jsonb := '[]'::jsonb;
  v_warnings   jsonb := '[]'::jsonb;
  v_gates      jsonb := '[]'::jsonb;
  v_needs_review jsonb := '[]'::jsonb;

  v_legacy     jsonb;
  v_legacy_ok  boolean := false;
  v_legacy_blockers jsonb;

  v_review     jsonb;
  v_review_ok  boolean;

  v_live       jsonb;
  v_live_reasons jsonb;
  v_live_ok    boolean;

  v_map_row    public.communication_hub_event_template_map%ROWTYPE;
  v_sender     public.communication_hub_sender_profile%ROWTYPE;

  v_tv_status  text;
  v_current_stage text := 'payload';
  v_blocked_stage text := NULL;
  v_blocker_codes text[] := ARRAY[]::text[];
  v_allowed    boolean := true;

  v_txt        text;
BEGIN
  ---------------------------------------------------------------
  -- Gate 1: payload
  ---------------------------------------------------------------
  IF v_module IS NULL OR v_module = '' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','payload_missing_module_code','severity','critical','stage','payload',
      'message','module_code is required','fix_hint','Include module_code in the runtime evaluation payload.');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_module_code');
  END IF;
  IF v_event IS NULL OR v_event = '' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','payload_missing_event_code','severity','critical','stage','payload',
      'message','event_code is required','fix_hint','Include event_code in the runtime evaluation payload.');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_event_code');
  END IF;
  IF v_channel IS NULL OR v_channel = '' THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','payload_missing_channel','severity','high','stage','payload',
      'message','channel is required','fix_hint','Default to "email" if the caller does not care.');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_channel');
  END IF;

  v_gates := v_gates || jsonb_build_object(
    'gate','payload',
    'status', CASE WHEN jsonb_array_length(v_blockers) = 0 THEN 'pass' ELSE 'blocked' END,
    'reason', CASE WHEN jsonb_array_length(v_blockers) = 0 THEN 'payload complete' ELSE 'missing required payload fields' END);

  IF jsonb_array_length(v_blockers) > 0 THEN
    v_blocked_stage := 'payload';
    v_allowed := false;
    -- Cannot safely evaluate downstream gates without module/event.
    RETURN jsonb_build_object(
      'allowed', false,
      'source','evaluate_comm_hub_runtime_gate_status',
      'legacy_authorization_allowed', false,
      'send_mode', v_send_mode,
      'module_code', v_module,
      'event_code', v_event,
      'channel', v_channel,
      'recipient_count', v_rec_count,
      'blockers', v_blockers,
      'warnings', v_warnings,
      'gate_results', v_gates,
      'trace_context', jsonb_build_object(
        'current_stage','payload',
        'blocked_stage','payload',
        'blocker_codes', to_jsonb(v_blocker_codes)),
      'needs_review', v_needs_review);
  END IF;

  ---------------------------------------------------------------
  -- Gate 2: legacy canonical authorization
  ---------------------------------------------------------------
  v_current_stage := 'legacy_authorization';
  BEGIN
    v_legacy := public.evaluate_comm_hub_send_authorization(p_payload);
    v_legacy_ok := coalesce((v_legacy->>'allowed')::boolean, false);
    v_legacy_blockers := coalesce(v_legacy->'blockers','[]'::jsonb);
    IF NOT v_legacy_ok THEN
      IF jsonb_typeof(v_legacy_blockers) = 'array' THEN
        FOR v_txt IN SELECT jsonb_array_elements_text(v_legacy_blockers)
        LOOP
          v_blockers := v_blockers || jsonb_build_object(
            'code', v_txt,'severity','high','stage','legacy_authorization',
            'message','Legacy canonical authorization denied: ' || v_txt,
            'fix_hint','Resolve reason via the existing gate that owns this code.');
          v_blocker_codes := array_append(v_blocker_codes, v_txt);
        END LOOP;
      END IF;
      IF v_blocked_stage IS NULL THEN v_blocked_stage := 'legacy_authorization'; END IF;
      v_allowed := false;
    END IF;
    v_gates := v_gates || jsonb_build_object(
      'gate','legacy_authorization',
      'status', CASE WHEN v_legacy_ok THEN 'pass' ELSE 'blocked' END,
      'reason', coalesce(v_legacy->>'note', CASE WHEN v_legacy_ok THEN 'legacy evaluator authorized' ELSE 'legacy evaluator denied' END));
  EXCEPTION WHEN OTHERS THEN
    v_gates := v_gates || jsonb_build_object(
      'gate','legacy_authorization','status','unknown',
      'reason','evaluate_comm_hub_send_authorization raised: ' || SQLERRM);
    v_needs_review := v_needs_review || jsonb_build_object(
      'gate','legacy_authorization','reason', SQLERRM);
  END;

  ---------------------------------------------------------------
  -- Gate 3: event live-control gate (only meaningful for live modes)
  ---------------------------------------------------------------
  v_current_stage := 'live_control';
  IF v_send_mode IN ('live','auto_live_internal','cron','batch') THEN
    BEGIN
      v_live := public.evaluate_comm_hub_live_gate(v_module, v_event, v_recipient, v_send_mode, NULL);
      v_live_reasons := coalesce(v_live->'reasons','[]'::jsonb);
      v_live_ok := coalesce((v_live->>'allowed')::boolean, false);
      IF NOT v_live_ok THEN
        IF jsonb_typeof(v_live_reasons) = 'array' THEN
          FOR v_txt IN SELECT jsonb_array_elements_text(v_live_reasons)
          LOOP
            v_blockers := v_blockers || jsonb_build_object(
              'code', v_txt,'severity','high','stage','live_control',
              'message','Live gate denied: ' || v_txt,
              'fix_hint','Resolve via Control Center / Event Live Control.');
            v_blocker_codes := array_append(v_blocker_codes, v_txt);
          END LOOP;
        END IF;
        IF v_blocked_stage IS NULL THEN v_blocked_stage := 'live_control'; END IF;
        v_allowed := false;
      END IF;
      v_gates := v_gates || jsonb_build_object(
        'gate','live_control',
        'status', CASE WHEN v_live_ok THEN 'pass' ELSE 'blocked' END,
        'reason', CASE WHEN v_live_ok THEN 'live-control approved' ELSE 'live-control denied' END);
    EXCEPTION WHEN OTHERS THEN
      v_gates := v_gates || jsonb_build_object(
        'gate','live_control','status','unknown',
        'reason','evaluate_comm_hub_live_gate raised: ' || SQLERRM);
      v_needs_review := v_needs_review || jsonb_build_object(
        'gate','live_control','reason', SQLERRM);
    END;
  ELSE
    v_gates := v_gates || jsonb_build_object(
      'gate','live_control','status','skipped',
      'reason','send_mode is not live/auto_live_internal/cron/batch');
  END IF;

  ---------------------------------------------------------------
  -- Gate 4: review policy
  ---------------------------------------------------------------
  v_current_stage := 'review_policy';
  BEGIN
    v_review := public.evaluate_comm_hub_review_policy(p_payload);
    v_review_ok := coalesce((v_review->>'allowed')::boolean, false);
    IF NOT v_review_ok THEN
      IF jsonb_typeof(v_review->'blockers') = 'array' THEN
        FOR v_txt IN SELECT jsonb_array_elements_text(v_review->'blockers')
        LOOP
          v_blockers := v_blockers || jsonb_build_object(
            'code',
              CASE v_txt
                WHEN 'preview_required' THEN 'review_preview_required'
                WHEN 'template_version_not_approved' THEN 'review_template_version_mismatch'
                ELSE v_txt
              END,
            'severity','high','stage','review_policy',
            'message','Review policy denied: ' || v_txt,
            'fix_hint','Open Review Policy for the module/event and satisfy the requirement.');
          v_blocker_codes := array_append(v_blocker_codes, v_txt);
        END LOOP;
      END IF;
      IF v_blocked_stage IS NULL THEN v_blocked_stage := 'review_policy'; END IF;
      v_allowed := false;
    END IF;
    IF jsonb_typeof(v_review->'warnings') = 'array' THEN
      FOR v_txt IN SELECT jsonb_array_elements_text(v_review->'warnings')
      LOOP
        v_warnings := v_warnings || jsonb_build_object('code', v_txt, 'message','Review policy warning: ' || v_txt);
      END LOOP;
    END IF;
    v_gates := v_gates || jsonb_build_object(
      'gate','review_policy',
      'status', CASE WHEN v_review_ok THEN 'pass' ELSE 'blocked' END,
      'reason', coalesce(v_review->>'note','review policy evaluated'));
  EXCEPTION WHEN OTHERS THEN
    v_gates := v_gates || jsonb_build_object(
      'gate','review_policy','status','unknown',
      'reason','evaluate_comm_hub_review_policy raised: ' || SQLERRM);
    v_needs_review := v_needs_review || jsonb_build_object(
      'gate','review_policy','reason', SQLERRM);
  END;

  ---------------------------------------------------------------
  -- Gate 5: automation setting (module scope only in this schema)
  --   Table communication_hub_module_automation_setting has no event_code
  --   column. Enforcement is therefore module-level. Event-specific
  --   automation is NEEDS_REVIEW.
  ---------------------------------------------------------------
  v_current_stage := 'automation';
  DECLARE
    v_auto_enabled boolean;
    v_auto_value   text;
  BEGIN
    SELECT bool_and(is_enabled), max(setting_value)
      INTO v_auto_enabled, v_auto_value
      FROM public.communication_hub_module_automation_setting
     WHERE module_code = v_module;
    IF v_auto_enabled IS NULL THEN
      v_gates := v_gates || jsonb_build_object(
        'gate','automation','status','unknown',
        'reason','no module-level automation setting rows for this module');
      v_needs_review := v_needs_review || jsonb_build_object(
        'gate','automation','reason','no rows found; event-scoped automation not modelled');
    ELSIF v_auto_enabled = false AND v_send_mode IN ('live','auto_live_internal','cron','batch') THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','automation_disabled','severity','high','stage','automation',
        'message','Module automation is disabled for live send.',
        'fix_hint','Open Automation Settings and enable the required setting for this module.');
      v_blocker_codes := array_append(v_blocker_codes,'automation_disabled');
      IF v_blocked_stage IS NULL THEN v_blocked_stage := 'automation'; END IF;
      v_allowed := false;
      v_gates := v_gates || jsonb_build_object('gate','automation','status','blocked','reason','module automation disabled');
    ELSIF v_auto_value = 'prepare_only' AND v_send_mode = 'live' THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','automation_prepare_only','severity','high','stage','automation',
        'message','Module automation is set to prepare_only; live send not permitted.',
        'fix_hint','Change automation setting to auto_live_internal or manual.');
      v_blocker_codes := array_append(v_blocker_codes,'automation_prepare_only');
      IF v_blocked_stage IS NULL THEN v_blocked_stage := 'automation'; END IF;
      v_allowed := false;
      v_gates := v_gates || jsonb_build_object('gate','automation','status','blocked','reason','prepare_only');
    ELSE
      v_gates := v_gates || jsonb_build_object('gate','automation','status','pass','reason','module automation permits current send_mode');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_gates := v_gates || jsonb_build_object('gate','automation','status','unknown','reason', SQLERRM);
    v_needs_review := v_needs_review || jsonb_build_object('gate','automation','reason', SQLERRM);
  END;

  ---------------------------------------------------------------
  -- Gate 6: event-specific sender via event_template_map.sender_profile_id
  ---------------------------------------------------------------
  v_current_stage := 'sender';
  SELECT * INTO v_map_row
    FROM public.communication_hub_event_template_map
   WHERE module_code = v_module AND event_code = v_event AND channel = v_channel
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 1;

  IF v_map_row.id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','event_template_mapping_missing','severity','critical','stage','sender',
      'message','No event → template mapping row for module/event/channel.',
      'fix_hint','Open Event → Template Mapping and create the mapping.');
    v_blocker_codes := array_append(v_blocker_codes,'event_template_mapping_missing');
    IF v_blocked_stage IS NULL THEN v_blocked_stage := 'sender'; END IF;
    v_allowed := false;
    v_gates := v_gates || jsonb_build_object('gate','sender','status','blocked','reason','no mapping row');
  ELSIF v_map_row.sender_profile_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','mapped_sender_missing','severity','critical','stage','sender',
      'message','Event mapping has no sender_profile_id.',
      'fix_hint','Assign a verified sender profile to the event mapping.');
    v_blocker_codes := array_append(v_blocker_codes,'mapped_sender_missing');
    IF v_blocked_stage IS NULL THEN v_blocked_stage := 'sender'; END IF;
    v_allowed := false;
    v_gates := v_gates || jsonb_build_object('gate','sender','status','blocked','reason','sender_profile_id missing on mapping');
  ELSE
    SELECT * INTO v_sender FROM public.communication_hub_sender_profile WHERE id = v_map_row.sender_profile_id;
    IF v_sender.id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','mapped_sender_missing','severity','critical','stage','sender',
        'message','Sender profile referenced by mapping does not exist.',
        'fix_hint','Fix mapping or restore sender profile.');
      v_blocker_codes := array_append(v_blocker_codes,'mapped_sender_missing');
      IF v_blocked_stage IS NULL THEN v_blocked_stage := 'sender'; END IF;
      v_allowed := false;
      v_gates := v_gates || jsonb_build_object('gate','sender','status','blocked','reason','sender profile not found');
    ELSE
      IF v_sender.is_enabled IS DISTINCT FROM true THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','mapped_sender_disabled','severity','high','stage','sender',
          'message','Mapped sender profile is disabled.',
          'fix_hint','Enable the sender profile or map a different one.');
        v_blocker_codes := array_append(v_blocker_codes,'mapped_sender_disabled');
      END IF;
      IF v_sender.domain_verified IS DISTINCT FROM true THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','mapped_sender_domain_not_verified','severity','high','stage','sender',
          'message','Sender domain is not verified.',
          'fix_hint','Complete SPF/DKIM/DMARC and mark domain_verified.');
        v_blocker_codes := array_append(v_blocker_codes,'mapped_sender_domain_not_verified');
      END IF;
      IF coalesce(v_sender.provider_identity_status,'') <> 'verified' THEN
        v_blockers := v_blockers || jsonb_build_object(
          'code','mapped_sender_provider_not_verified','severity','high','stage','sender',
          'message','Sender provider identity is not verified.',
          'fix_hint','Verify the sending identity in the provider console.');
        v_blocker_codes := array_append(v_blocker_codes,'mapped_sender_provider_not_verified');
      END IF;
      IF v_sender.is_enabled IS true AND v_sender.domain_verified IS true AND v_sender.provider_identity_status = 'verified' THEN
        v_gates := v_gates || jsonb_build_object('gate','sender','status','pass','reason','sender enabled, domain + provider verified');
      ELSE
        IF v_blocked_stage IS NULL THEN v_blocked_stage := 'sender'; END IF;
        v_allowed := false;
        v_gates := v_gates || jsonb_build_object('gate','sender','status','blocked','reason','sender not fully verified');
      END IF;
    END IF;
  END IF;

  ---------------------------------------------------------------
  -- Gate 7: template version status
  ---------------------------------------------------------------
  v_current_stage := 'template_version';
  IF v_map_row.template_id IS NOT NULL THEN
    BEGIN
      SELECT status INTO v_tv_status
        FROM public.core_template_version
       WHERE template_id = v_map_row.template_id
       ORDER BY version_no DESC NULLS LAST
       LIMIT 1;
      IF v_tv_status IS NULL THEN
        v_gates := v_gates || jsonb_build_object('gate','template_version','status','unknown','reason','no core_template_version rows for template');
        v_needs_review := v_needs_review || jsonb_build_object('gate','template_version','reason','no version rows');
      ELSIF upper(v_tv_status) IN ('APPROVED','PUBLISHED','ACTIVE') THEN
        v_gates := v_gates || jsonb_build_object('gate','template_version','status','pass','reason','latest version status: ' || v_tv_status);
      ELSE
        v_blockers := v_blockers || jsonb_build_object(
          'code','template_version_not_approved','severity','high','stage','template_version',
          'message','Latest template version status is ' || v_tv_status || '.',
          'fix_hint','Publish/approve the template version before live send.');
        v_blocker_codes := array_append(v_blocker_codes,'template_version_not_approved');
        IF v_blocked_stage IS NULL THEN v_blocked_stage := 'template_version'; END IF;
        v_allowed := false;
        v_gates := v_gates || jsonb_build_object('gate','template_version','status','blocked','reason','status ' || v_tv_status);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_gates := v_gates || jsonb_build_object('gate','template_version','status','unknown','reason', SQLERRM);
      v_needs_review := v_needs_review || jsonb_build_object('gate','template_version','reason', SQLERRM);
    END;
  ELSE
    v_gates := v_gates || jsonb_build_object('gate','template_version','status','skipped','reason','no template_id on mapping');
  END IF;

  ---------------------------------------------------------------
  -- Gate 8: bulk
  ---------------------------------------------------------------
  v_current_stage := 'bulk';
  IF v_rec_count > 1 THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','bulk_not_enabled','severity','critical','stage','bulk',
      'message','Recipient count is ' || v_rec_count || ' but bulk send is not enabled.',
      'fix_hint','Bulk sending must be explicitly enabled via a documented control before multi-recipient live sends.');
    v_blocker_codes := array_append(v_blocker_codes,'bulk_not_enabled');
    IF v_blocked_stage IS NULL THEN v_blocked_stage := 'bulk'; END IF;
    v_allowed := false;
    v_gates := v_gates || jsonb_build_object('gate','bulk','status','blocked','reason','multi-recipient without explicit bulk approval');
  ELSE
    v_gates := v_gates || jsonb_build_object('gate','bulk','status','pass','reason','single-recipient send');
  END IF;

  ---------------------------------------------------------------
  -- Gate 9: runtime env — cannot be evaluated from SQL layer
  ---------------------------------------------------------------
  v_gates := v_gates || jsonb_build_object(
    'gate','runtime_env','status','unknown',
    'reason','runtime env is enforced by the dispatcher edge function and cannot be introspected from SQL');
  v_needs_review := v_needs_review || jsonb_build_object(
    'gate','runtime_env','reason','edge dispatcher must be exercised to verify env');

  ---------------------------------------------------------------
  -- Final assembly
  ---------------------------------------------------------------
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'source','evaluate_comm_hub_runtime_gate_status',
    'legacy_authorization_allowed', v_legacy_ok,
    'send_mode', v_send_mode,
    'module_code', v_module,
    'event_code', v_event,
    'channel', v_channel,
    'recipient_count', v_rec_count,
    'preview_confirmed', v_preview_ok,
    'template_version_id', nullif(v_tpl_ver,''),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'gate_results', v_gates,
    'needs_review', v_needs_review,
    'trace_context', jsonb_build_object(
      'current_stage', v_current_stage,
      'blocked_stage', v_blocked_stage,
      'blocker_codes', to_jsonb(v_blocker_codes)));
END;
$$;

COMMENT ON FUNCTION public.evaluate_comm_hub_runtime_gate_status(jsonb) IS
'EPIC PROD-2A: additive read-only runtime gate parity evaluator. Composes existing send-authorization, live-gate and review-policy functions plus schema-visible sender / template-version / bulk checks. Does not replace evaluate_comm_hub_send_authorization; does not enforce new blockers on any send path. Callers use it purely for parity readout in the Production Readiness and Test & Diagnostics UIs.';

REVOKE ALL ON FUNCTION public.evaluate_comm_hub_runtime_gate_status(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_runtime_gate_status(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_runtime_gate_status(jsonb) TO service_role;
