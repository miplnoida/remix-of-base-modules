-- CH-SIMPLE-P3D-A
CREATE TABLE IF NOT EXISTS public.communication_dry_run_certification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_no text NOT NULL UNIQUE,
  module_code text NOT NULL,
  event_code text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  preview_snapshot_id uuid NULL REFERENCES public.communication_preview_snapshot(id),
  preview_approval_id uuid NULL REFERENCES public.communication_preview_approval(id),
  communication_request_id uuid NULL,
  communication_message_id uuid NULL,
  communication_delivery_attempt_id uuid NULL,
  trace_id uuid NULL,
  recipient_set_hash text NOT NULL,
  template_id uuid NULL,
  template_version_id uuid NULL,
  sender_profile_id uuid NULL,
  rendered_subject_hash text NULL,
  rendered_body_hash text NULL,
  content_hash text NULL,
  configuration_version bigint NULL,
  recipient_policy_version bigint NULL,
  send_policy_version bigint NULL,
  review_policy_version bigint NULL,
  original_decision_id uuid NULL,
  dispatcher_revalidation_decision_id uuid NULL,
  result text NOT NULL DEFAULT 'DRY_RUN_PASSED' CHECK (result IN ('DRY_RUN_PASSED','DRY_RUN_FAILED','BLOCKED')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','FAILED','EXPIRED','INVALIDATED','SUPERSEDED','REVOKED')),
  provider_call_attempted boolean NOT NULL DEFAULT false,
  certified_by uuid NULL,
  certified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  invalidation_reason text NULL,
  invalidated_at timestamptz NULL,
  invalidated_by uuid NULL,
  superseded_by uuid NULL REFERENCES public.communication_dry_run_certification(id),
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dry_run_cert_idempotency
  ON public.communication_dry_run_certification(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dry_run_cert_module_event
  ON public.communication_dry_run_certification(module_code, event_code, channel, status, certified_at DESC);
CREATE INDEX IF NOT EXISTS idx_dry_run_cert_recipient_hash
  ON public.communication_dry_run_certification(recipient_set_hash, status);

GRANT SELECT ON public.communication_dry_run_certification TO authenticated;
GRANT ALL ON public.communication_dry_run_certification TO service_role;
ALTER TABLE public.communication_dry_run_certification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dry_run_cert_admin_read" ON public.communication_dry_run_certification;
CREATE POLICY "dry_run_cert_admin_read"
  ON public.communication_dry_run_certification FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'Admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.communication_dry_run_cert_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
   OR NEW.certification_no IS DISTINCT FROM OLD.certification_no
   OR NEW.module_code IS DISTINCT FROM OLD.module_code
   OR NEW.event_code IS DISTINCT FROM OLD.event_code
   OR NEW.channel IS DISTINCT FROM OLD.channel
   OR NEW.preview_snapshot_id IS DISTINCT FROM OLD.preview_snapshot_id
   OR NEW.preview_approval_id IS DISTINCT FROM OLD.preview_approval_id
   OR NEW.communication_request_id IS DISTINCT FROM OLD.communication_request_id
   OR NEW.communication_message_id IS DISTINCT FROM OLD.communication_message_id
   OR NEW.communication_delivery_attempt_id IS DISTINCT FROM OLD.communication_delivery_attempt_id
   OR NEW.trace_id IS DISTINCT FROM OLD.trace_id
   OR NEW.recipient_set_hash IS DISTINCT FROM OLD.recipient_set_hash
   OR NEW.template_id IS DISTINCT FROM OLD.template_id
   OR NEW.template_version_id IS DISTINCT FROM OLD.template_version_id
   OR NEW.sender_profile_id IS DISTINCT FROM OLD.sender_profile_id
   OR NEW.rendered_subject_hash IS DISTINCT FROM OLD.rendered_subject_hash
   OR NEW.rendered_body_hash IS DISTINCT FROM OLD.rendered_body_hash
   OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
   OR NEW.configuration_version IS DISTINCT FROM OLD.configuration_version
   OR NEW.recipient_policy_version IS DISTINCT FROM OLD.recipient_policy_version
   OR NEW.original_decision_id IS DISTINCT FROM OLD.original_decision_id
   OR NEW.provider_call_attempted IS DISTINCT FROM OLD.provider_call_attempted
   OR NEW.certified_by IS DISTINCT FROM OLD.certified_by
   OR NEW.certified_at IS DISTINCT FROM OLD.certified_at
   OR NEW.result IS DISTINCT FROM OLD.result
  THEN RAISE EXCEPTION 'communication_dry_run_certification evidence fields are immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_dry_run_cert_immutability ON public.communication_dry_run_certification;
CREATE TRIGGER trg_dry_run_cert_immutability
  BEFORE UPDATE ON public.communication_dry_run_certification
  FOR EACH ROW EXECUTE FUNCTION public.communication_dry_run_cert_immutability();

CREATE OR REPLACE FUNCTION public.validate_comm_hub_dry_run_certification(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cert_id uuid := nullif(p_payload->>'certification_id','')::uuid;
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_to jsonb := coalesce(p_payload->'to_recipients','[]'::jsonb);
  v_cc jsonb := coalesce(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := coalesce(p_payload->'bcc_recipients','[]'::jsonb);
  v_exp_tpl_ver uuid := nullif(p_payload->>'expected_template_version_id','')::uuid;
  v_exp_sender  uuid := nullif(p_payload->>'expected_sender_profile_id','')::uuid;
  v_exp_content text := nullif(p_payload->>'expected_content_hash','');
  v_current_recip_hash text := nullif(p_payload->>'current_recipient_set_hash','');
  v_current_cfg_ver bigint := nullif(p_payload->>'current_configuration_version','')::bigint;
  v_current_recip_ver bigint := nullif(p_payload->>'current_recipient_policy_version','')::bigint;
  v_cert public.communication_dry_run_certification%ROWTYPE;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_valid boolean := true;
  v_now timestamptz := now();
  v_approval_check jsonb;
  v_computed text;
BEGIN
  IF v_cert_id IS NULL THEN
    RETURN jsonb_build_object('valid',false,'certification_id',NULL,'status','MISSING',
      'blockers', jsonb_build_array(jsonb_build_object('code','dry_run_certification_missing','stage','dry_run','severity','critical','message','No dry_run_certification_id was supplied.')),
      'warnings','[]'::jsonb,'validated_at',v_now);
  END IF;

  SELECT * INTO v_cert FROM public.communication_dry_run_certification WHERE id = v_cert_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid',false,'certification_id',v_cert_id,'status','MISSING',
      'blockers', jsonb_build_array(jsonb_build_object('code','dry_run_certification_missing','stage','dry_run','severity','critical','message','Dry-run certification not found.')),
      'warnings','[]'::jsonb,'validated_at',v_now);
  END IF;

  IF v_cert.status = 'REVOKED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_revoked','stage','dry_run','severity','critical'); v_valid := false;
  ELSIF v_cert.status = 'EXPIRED' OR v_cert.expires_at < v_now THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_expired','stage','dry_run','severity','high'); v_valid := false;
  ELSIF v_cert.status = 'INVALIDATED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','severity','high','message',coalesce(v_cert.invalidation_reason,'invalidated')); v_valid := false;
  ELSIF v_cert.status = 'SUPERSEDED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','severity','high','message','superseded'); v_valid := false;
  ELSIF v_cert.status = 'FAILED' OR v_cert.result <> 'DRY_RUN_PASSED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','severity','high'); v_valid := false;
  ELSIF v_cert.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  IF v_module IS NOT NULL AND v_cert.module_code <> v_module THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','message','module mismatch'); v_valid := false;
  END IF;
  IF v_event IS NOT NULL AND v_cert.event_code <> v_event THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','message','event mismatch'); v_valid := false;
  END IF;
  IF v_channel IS NOT NULL AND v_cert.channel <> v_channel THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','message','channel mismatch'); v_valid := false;
  END IF;

  IF v_current_recip_hash IS NOT NULL AND v_current_recip_hash <> v_cert.recipient_set_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_recipient_mismatch','stage','dry_run','severity','high'); v_valid := false;
  ELSIF (jsonb_array_length(v_to) + jsonb_array_length(v_cc) + jsonb_array_length(v_bcc)) > 0 THEN
    BEGIN
      SELECT (public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc)->>'recipient_set_hash') INTO v_computed;
      IF v_computed IS NOT NULL AND v_computed <> v_cert.recipient_set_hash THEN
        v_blockers := v_blockers || jsonb_build_object('code','dry_run_recipient_mismatch','stage','dry_run','severity','high'); v_valid := false;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_object('code','recipient_normalizer_unavailable','message',SQLERRM);
    END;
  END IF;

  IF v_exp_tpl_ver IS NOT NULL AND v_cert.template_version_id IS NOT NULL AND v_exp_tpl_ver <> v_cert.template_version_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_template_version_mismatch','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_exp_sender IS NOT NULL AND v_cert.sender_profile_id IS NOT NULL AND v_exp_sender <> v_cert.sender_profile_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_sender_mismatch','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_exp_content IS NOT NULL AND v_cert.content_hash IS NOT NULL AND v_exp_content <> v_cert.content_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_content_mismatch','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  IF v_current_cfg_ver IS NOT NULL AND v_cert.configuration_version IS NOT NULL AND v_current_cfg_ver <> v_cert.configuration_version THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_configuration_changed','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_current_recip_ver IS NOT NULL AND v_cert.recipient_policy_version IS NOT NULL AND v_current_recip_ver <> v_cert.recipient_policy_version THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_recipient_policy_changed','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  IF v_cert.preview_approval_id IS NOT NULL THEN
    BEGIN
      v_approval_check := public.validate_comm_hub_preview_approval(jsonb_build_object(
        'approval_id', v_cert.preview_approval_id,
        'module_code', v_cert.module_code, 'event_code', v_cert.event_code, 'channel', v_cert.channel,
        'send_context','controlled_live',
        'to_recipients', v_to, 'cc_recipients', v_cc, 'bcc_recipients', v_bcc,
        'expected_template_version_id', v_cert.template_version_id,
        'expected_sender_profile_id',   v_cert.sender_profile_id,
        'expected_content_hash',        v_cert.content_hash));
      IF NOT coalesce((v_approval_check->>'valid')::boolean,false) THEN
        v_blockers := v_blockers || jsonb_build_object('code','dry_run_preview_approval_invalid','stage','dry_run','severity','high','detail',v_approval_check);
        v_valid := false;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_object('code','preview_validator_unavailable','message',SQLERRM);
    END;
  END IF;

  IF v_cert.communication_request_id IS NULL OR v_cert.communication_message_id IS NULL OR v_cert.communication_delivery_attempt_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_evidence_incomplete','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  RETURN jsonb_build_object(
    'valid', v_valid, 'certification_id', v_cert.id, 'certification_no', v_cert.certification_no,
    'status', v_cert.status, 'result', v_cert.result,
    'blockers', v_blockers, 'warnings', v_warnings,
    'module_code', v_cert.module_code, 'event_code', v_cert.event_code, 'channel', v_cert.channel,
    'recipient_set_hash', v_cert.recipient_set_hash,
    'template_version_id', v_cert.template_version_id, 'sender_profile_id', v_cert.sender_profile_id,
    'content_hash', v_cert.content_hash,
    'rendered_subject_hash', v_cert.rendered_subject_hash, 'rendered_body_hash', v_cert.rendered_body_hash,
    'configuration_version', v_cert.configuration_version,
    'recipient_policy_version', v_cert.recipient_policy_version,
    'send_policy_version', v_cert.send_policy_version, 'review_policy_version', v_cert.review_policy_version,
    'original_decision_id', v_cert.original_decision_id,
    'dispatcher_revalidation_decision_id', v_cert.dispatcher_revalidation_decision_id,
    'preview_snapshot_id', v_cert.preview_snapshot_id, 'preview_approval_id', v_cert.preview_approval_id,
    'communication_request_id', v_cert.communication_request_id,
    'communication_message_id', v_cert.communication_message_id,
    'communication_delivery_attempt_id', v_cert.communication_delivery_attempt_id,
    'trace_id', v_cert.trace_id,
    'certified_at', v_cert.certified_at, 'expires_at', v_cert.expires_at,
    'validated_at', v_now);
END; $$;

GRANT EXECUTE ON FUNCTION public.validate_comm_hub_dry_run_certification(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fetch_comm_hub_dry_run_certification(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cert_id uuid := nullif(p_payload->>'certification_id','')::uuid;
  v_module text := p_payload->>'module_code';
  v_event text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_row public.communication_dry_run_certification%ROWTYPE;
BEGIN
  IF v_cert_id IS NOT NULL THEN
    SELECT * INTO v_row FROM public.communication_dry_run_certification WHERE id = v_cert_id;
  ELSIF v_module IS NOT NULL AND v_event IS NOT NULL THEN
    SELECT * INTO v_row FROM public.communication_dry_run_certification
      WHERE module_code = v_module AND event_code = v_event AND channel = v_channel AND status = 'ACTIVE'
      ORDER BY certified_at DESC LIMIT 1;
  END IF;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  RETURN to_jsonb(v_row) || jsonb_build_object('found', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.fetch_comm_hub_dry_run_certification(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_comm_hub_dry_run_certification(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cert_id uuid := nullif(p_payload->>'certification_id','')::uuid;
  v_reason text := coalesce(p_payload->>'revocation_reason','');
  v_actor uuid := auth.uid();
  v_row public.communication_dry_run_certification%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR NOT public.has_role(v_actor,'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'not authorised to revoke dry-run certifications';
  END IF;
  IF v_cert_id IS NULL THEN RAISE EXCEPTION 'certification_id required'; END IF;
  IF length(v_reason) < 6 THEN RAISE EXCEPTION 'revocation_reason must be at least 6 characters'; END IF;

  UPDATE public.communication_dry_run_certification
     SET status='REVOKED', invalidation_reason=v_reason, invalidated_at=now(), invalidated_by=v_actor
   WHERE id=v_cert_id AND status IN ('ACTIVE','EXPIRED')
   RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'certification not revocable in current status'; END IF;

  RETURN jsonb_build_object('certification_id',v_row.id,'status',v_row.status,
    'invalidation_reason',v_row.invalidation_reason,'invalidated_at',v_row.invalidated_at);
END; $$;
GRANT EXECUTE ON FUNCTION public.revoke_comm_hub_dry_run_certification(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_decision(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev_result jsonb;
  v_result jsonb;
  v_legacy_flag boolean := coalesce((p_payload->>'preview_confirmed')::boolean, false)
                          OR coalesce((p_payload->>'preview_shown')::boolean, false)
                          OR coalesce(((p_payload->'review_context')->>'preview_confirmed')::boolean, false)
                          OR coalesce(((p_payload->'metadata')->>'preview_confirmed')::boolean, false)
                          OR coalesce(((p_payload->'context')->>'preview_confirmed')::boolean, false);
  v_ctx text := coalesce(p_payload->>'send_context', p_payload->>'send_mode','dry_run');
  v_appr_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_cert_id uuid := nullif(p_payload->>'dry_run_certification_id','')::uuid;
  v_validator jsonb;
  v_cert_validator jsonb;
  v_blockers jsonb;
  v_warnings jsonb;
  v_allowed boolean;
  v_needs_preview boolean;
BEGIN
  v_prev_result := public._evaluate_comm_hub_send_decision_core(p_payload);
  v_result := v_prev_result;
  v_blockers := coalesce(v_result->'blockers','[]'::jsonb);
  v_warnings := coalesce(v_result->'warnings','[]'::jsonb);
  v_allowed  := coalesce((v_result->>'allowed')::boolean, false);

  IF v_legacy_flag THEN
    v_warnings := v_warnings || jsonb_build_object('code','legacy_preview_confirmation_ignored','stage','preview_approval',
      'message','Legacy preview_confirmed/preview_shown flags are ignored; require a preview_approval_id.');
  END IF;

  v_needs_preview := v_ctx IN ('controlled_live','manual_live','manual_production');
  IF v_needs_preview THEN
    IF v_appr_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','preview_approval_missing','stage','preview_approval','severity','critical',
        'message','A valid preview_approval_id is required for this send context.','fix_route','/admin/communication-hub/pilots');
      v_allowed := false;
    ELSE
      v_validator := public.validate_comm_hub_preview_approval(jsonb_build_object(
        'approval_id', v_appr_id,
        'module_code', p_payload->>'module_code',
        'event_code',  p_payload->>'event_code',
        'channel',     coalesce(p_payload->>'channel','email'),
        'send_context', v_ctx,
        'to_recipients', coalesce(p_payload->'to_recipients','[]'::jsonb),
        'cc_recipients', coalesce(p_payload->'cc_recipients','[]'::jsonb),
        'bcc_recipients', coalesce(p_payload->'bcc_recipients','[]'::jsonb),
        'expected_template_version_id', p_payload->>'template_version_id',
        'expected_sender_profile_id',   p_payload->>'sender_profile_id',
        'expected_content_hash',        p_payload->>'expected_content_hash'));
      IF NOT coalesce((v_validator->>'valid')::boolean,false) THEN
        v_blockers := v_blockers || coalesce(v_validator->'blockers','[]'::jsonb);
        v_allowed := false;
      END IF;
      v_result := jsonb_set(v_result, '{preview_validator}', v_validator, true);
    END IF;
  END IF;

  IF v_ctx = 'controlled_live' THEN
    IF v_cert_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_missing','stage','dry_run','severity','high',
        'message','A valid dry_run_certification_id is required for controlled_live.',
        'fix_route','/admin/communication-hub/pilots');
      v_allowed := false;
    ELSE
      v_cert_validator := public.validate_comm_hub_dry_run_certification(jsonb_build_object(
        'certification_id', v_cert_id,
        'module_code', p_payload->>'module_code',
        'event_code',  p_payload->>'event_code',
        'channel',     coalesce(p_payload->>'channel','email'),
        'to_recipients', coalesce(p_payload->'to_recipients','[]'::jsonb),
        'cc_recipients', coalesce(p_payload->'cc_recipients','[]'::jsonb),
        'bcc_recipients', coalesce(p_payload->'bcc_recipients','[]'::jsonb),
        'expected_template_version_id', p_payload->>'template_version_id',
        'expected_sender_profile_id',   p_payload->>'sender_profile_id',
        'expected_content_hash',        p_payload->>'expected_content_hash'));
      IF NOT coalesce((v_cert_validator->>'valid')::boolean,false) THEN
        v_blockers := v_blockers || coalesce(v_cert_validator->'blockers','[]'::jsonb);
        v_allowed := false;
      END IF;
      v_result := jsonb_set(v_result, '{dry_run_certification_validator}', v_cert_validator, true);
    END IF;
  END IF;

  v_result := jsonb_set(v_result, '{blockers}', v_blockers, true);
  v_result := jsonb_set(v_result, '{warnings}', v_warnings, true);
  v_result := jsonb_set(v_result, '{allowed}', to_jsonb(v_allowed), true);
  v_result := jsonb_set(v_result, '{status}',  to_jsonb(CASE WHEN v_allowed THEN 'allowed' ELSE 'blocked' END), true);
  RETURN v_result;
END; $$;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_send_decision(jsonb) TO authenticated, service_role;