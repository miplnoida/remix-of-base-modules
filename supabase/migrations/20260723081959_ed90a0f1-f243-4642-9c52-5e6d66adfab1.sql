-- Phase 4B3 Sub-iteration 4/5: Runtime transition assertion + evidence log

CREATE TABLE IF NOT EXISTS public.comm_hub_runtime_transition_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  allowed boolean NOT NULL,
  actor_id uuid,
  module_code text,
  event_code text,
  channel text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  denied_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comm_hub_runtime_transition_log TO authenticated;
GRANT ALL ON public.comm_hub_runtime_transition_log TO service_role;
CREATE INDEX IF NOT EXISTS comm_hub_runtime_transition_log_corr_idx
  ON public.comm_hub_runtime_transition_log(correlation_id, created_at);
CREATE INDEX IF NOT EXISTS comm_hub_runtime_transition_log_action_idx
  ON public.comm_hub_runtime_transition_log(action, created_at DESC);

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
  v_denied_actions text[] := ARRAY[
    'START_ONE_REAL_EMAIL','DISPATCH_ONE_REAL_EMAIL',
    'START_MANUAL_PRODUCTION','START_AUTOMATED_PRODUCTION'
  ];
  v_reasons jsonb := '[]'::jsonb;
  v_actor uuid := NULLIF(p_context->>'actor_id','')::uuid;
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
BEGIN
  IF p_action = ANY(v_denied_actions) THEN
    v_reasons := v_reasons || jsonb_build_object('code','REAL_EMAIL_TRANSITION_DENIED_IN_THIS_ITERATION');
    v_allowed := false;
  ELSIF NOT (p_action = ANY(v_allowed_actions)) THEN
    v_reasons := v_reasons || jsonb_build_object('code','UNKNOWN_RUNTIME_TRANSITION','action',p_action);
    v_allowed := false;
  END IF;
  IF v_actor IS NULL THEN
    v_reasons := v_reasons || jsonb_build_object('code','ACTOR_REQUIRED'); v_allowed := false;
  END IF;
  IF v_module IS NULL OR v_event IS NULL THEN
    v_reasons := v_reasons || jsonb_build_object('code','MODULE_EVENT_REQUIRED'); v_allowed := false;
  END IF;

  IF v_allowed AND p_action IN ('APPROVE_PREVIEW','START_DRY_RUN','CERTIFY_DRY_RUN',
                                'START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE',
                                'CLAIM_TARGETED_MESSAGE','DISPATCH_CONTROLLED_STUB',
                                'CERTIFY_CONTROLLED_STUB') THEN
    IF v_snap_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,status,module_code,event_code,channel,content_hash,recipient_set_hash,template_version_id,expires_at
        INTO v_snap FROM public.communication_preview_snapshot WHERE id=v_snap_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND'); v_allowed := false;
      ELSIF v_snap.module_code<>v_module OR v_snap.event_code<>v_event OR v_snap.channel<>v_channel THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_SCOPE_MISMATCH'); v_allowed := false;
      ELSIF v_snap.status <> 'PREPARED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_USABLE','status',v_snap.status); v_allowed := false;
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

  IF v_allowed AND p_action IN ('START_CONTROLLED_STUB','CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
                                'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB') THEN
    IF v_dry_cert_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','DRY_RUN_CERTIFICATION_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,status,result,expires_at,preview_approval_id INTO v_dry
        FROM public.communication_dry_run_certification WHERE id=v_dry_cert_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','DRY_RUN_CERTIFICATION_NOT_FOUND'); v_allowed := false;
      ELSIF v_dry.status<>'ACTIVE' OR v_dry.result<>'DRY_RUN_PASSED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','DRY_RUN_CERTIFICATION_NOT_VALID'); v_allowed := false;
      ELSIF v_dry.expires_at<=now() THEN
        v_reasons := v_reasons || jsonb_build_object('code','DRY_RUN_CERTIFICATION_EXPIRED'); v_allowed := false;
      ELSIF v_dry.preview_approval_id IS DISTINCT FROM v_appr_id THEN
        v_reasons := v_reasons || jsonb_build_object('code','DRY_RUN_APPROVAL_MISMATCH'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  IF v_allowed AND p_action IN ('CREATE_TARGETED_MESSAGE','CLAIM_TARGETED_MESSAGE',
                                'DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB') THEN
    IF v_exec_id IS NULL OR v_grant_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','EXECUTION_OR_GRANT_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,state,controlled_live_grant_id INTO v_exec
        FROM public.communication_controlled_live_execution WHERE id=v_exec_id;
      SELECT id,status,execution_id,expires_at INTO v_grant
        FROM public.communication_controlled_live_grant WHERE id=v_grant_id;
      IF v_exec.id IS NULL OR v_grant.id IS NULL THEN
        v_reasons := v_reasons || jsonb_build_object('code','EXECUTION_OR_GRANT_NOT_FOUND'); v_allowed := false;
      ELSIF v_grant.execution_id<>v_exec.id THEN
        v_reasons := v_reasons || jsonb_build_object('code','GRANT_EXECUTION_MISMATCH'); v_allowed := false;
      ELSIF v_grant.status::text NOT IN ('ISSUED','RESERVED','CONSUMED') THEN
        v_reasons := v_reasons || jsonb_build_object('code','GRANT_NOT_USABLE','status',v_grant.status::text); v_allowed := false;
      ELSIF v_grant.expires_at<=now() AND v_grant.status::text<>'CONSUMED' THEN
        v_reasons := v_reasons || jsonb_build_object('code','GRANT_EXPIRED'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  IF v_allowed AND p_action IN ('CLAIM_TARGETED_MESSAGE','DISPATCH_CONTROLLED_STUB','CERTIFY_CONTROLLED_STUB') THEN
    IF v_msg_id IS NULL THEN
      v_reasons := v_reasons || jsonb_build_object('code','MESSAGE_REQUIRED'); v_allowed := false;
    ELSE
      SELECT id,status,targeted_dispatch_only,controlled_live_execution_id,controlled_live_grant_id
        INTO v_msg FROM public.communication_message WHERE id=v_msg_id;
      IF NOT FOUND THEN
        v_reasons := v_reasons || jsonb_build_object('code','MESSAGE_NOT_FOUND'); v_allowed := false;
      ELSIF v_msg.controlled_live_execution_id<>v_exec_id
            OR v_msg.controlled_live_grant_id<>v_grant_id
            OR v_msg.targeted_dispatch_only IS DISTINCT FROM true THEN
        v_reasons := v_reasons || jsonb_build_object('code','MESSAGE_BINDING_MISMATCH'); v_allowed := false;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.comm_hub_runtime_transition_log(
    action,allowed,actor_id,module_code,event_code,channel,context,denied_reasons,correlation_id
  ) VALUES (
    p_action, v_allowed, v_actor, v_module, v_event, v_channel,
    p_context, v_reasons, v_correlation
  );

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'action', p_action,
    'denied_reasons', v_reasons,
    'evaluator_version', '4b3.subiter4-5',
    'evaluated_at', now()
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.assert_comm_hub_runtime_transition(text,jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.assert_comm_hub_runtime_transition IS
'Phase 4B3 canonical runtime-transition gate. Denies real-email and production transitions. Called at each runtime boundary; every invocation is logged to comm_hub_runtime_transition_log for evidence.';