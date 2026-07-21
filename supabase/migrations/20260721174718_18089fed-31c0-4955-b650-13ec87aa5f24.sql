
-- Canonical helper: Communication Hub operator admin check
CREATE OR REPLACE FUNCTION public.is_comm_hub_operator_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_user_id IS NOT NULL
     AND public.has_role(p_user_id, 'Admin'::public.app_role);
$$;

GRANT EXECUTE ON FUNCTION public.is_comm_hub_operator_admin(uuid) TO authenticated, service_role;

-- Patch controlled-live BEGIN to use the canonical helper (valid enum literal)
CREATE OR REPLACE FUNCTION public.begin_comm_hub_controlled_live(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
BEGIN
  IF v_operator IS NULL THEN
    RAISE EXCEPTION 'controlled_live_unauthenticated' USING ERRCODE='42501';
  END IF;

  -- Permission: administrator role required (canonical helper, exact enum label)
  IF NOT public.is_comm_hub_operator_admin(v_operator) THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_permission_denied','stage','authorization','severity','critical'))
    );
  END IF;

  IF length(trim(v_reason)) < 8 THEN
    RETURN jsonb_build_object(
      'ok', false, 'status','BLOCKED',
      'blockers', jsonb_build_array(jsonb_build_object('code','controlled_live_reason_required','stage','authorization','severity','high','message','Provide a meaningful reason (min 8 chars).'))
    );
  END IF;

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

  v_recipient_hash := encode(digest('to:' || v_recipient || '|cc:|bcc:', 'sha256'), 'hex');
  v_scope_hash := public.comm_hub_controlled_live_scope_hash(
    v_operator, v_module, v_event, v_channel, v_recipient_hash, v_preview_approval_id, v_dryrun_cert_id);

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

  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_recip_ver FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';

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
$function$;
