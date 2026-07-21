
-- =========================================================================
-- CH-SIMPLE-P3D-B.1
-- Part 1.1 (Option B) lifecycle rework + Part 1.2 drift validation
-- Parts 2-4 orchestrator core (execute_comm_hub_dry_run)
-- Part 5 permanent dry-run classification columns
-- =========================================================================

-- ---- 1) Lifecycle columns on certification --------------------------------
ALTER TABLE public.communication_dry_run_certification
  ADD COLUMN IF NOT EXISTS revoked_by uuid NULL,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS revocation_reason text NULL,
  ADD COLUMN IF NOT EXISTS lifecycle_updated_at timestamptz NOT NULL DEFAULT now();

-- ---- 2) Replace immutability trigger with Option B ------------------------
-- Evidence fields immutable. Lifecycle field set writable only when the
-- effective role is service_role (i.e. SECURITY DEFINER RPCs / edge fn).
CREATE OR REPLACE FUNCTION public.communication_dry_run_cert_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_evidence_changed boolean := false;
  v_lifecycle_changed boolean := false;
  v_is_service boolean := (current_setting('role', true) = 'service_role')
                       OR (session_user = 'service_role')
                       OR (current_user = 'postgres');
BEGIN
  -- Evidence immutability
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
   OR NEW.send_policy_version IS DISTINCT FROM OLD.send_policy_version
   OR NEW.review_policy_version IS DISTINCT FROM OLD.review_policy_version
   OR NEW.original_decision_id IS DISTINCT FROM OLD.original_decision_id
   OR NEW.dispatcher_revalidation_decision_id IS DISTINCT FROM OLD.dispatcher_revalidation_decision_id
   OR NEW.provider_call_attempted IS DISTINCT FROM OLD.provider_call_attempted
   OR NEW.certified_by IS DISTINCT FROM OLD.certified_by
   OR NEW.certified_at IS DISTINCT FROM OLD.certified_at
   OR NEW.result IS DISTINCT FROM OLD.result
   OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
   OR NEW.audit_metadata IS DISTINCT FROM OLD.audit_metadata
  THEN
    RAISE EXCEPTION 'communication_dry_run_certification evidence fields are immutable';
  END IF;

  -- Any lifecycle changes must come from service_role/definer context.
  IF NEW.status IS DISTINCT FROM OLD.status
   OR NEW.revoked_by IS DISTINCT FROM OLD.revoked_by
   OR NEW.revoked_at IS DISTINCT FROM OLD.revoked_at
   OR NEW.revocation_reason IS DISTINCT FROM OLD.revocation_reason
   OR NEW.invalidation_reason IS DISTINCT FROM OLD.invalidation_reason
   OR NEW.invalidated_at IS DISTINCT FROM OLD.invalidated_at
   OR NEW.invalidated_by IS DISTINCT FROM OLD.invalidated_by
   OR NEW.superseded_by IS DISTINCT FROM OLD.superseded_by
  THEN
    v_lifecycle_changed := true;
    IF NOT v_is_service THEN
      RAISE EXCEPTION 'communication_dry_run_certification lifecycle fields may only be updated via authorised RPC';
    END IF;
    NEW.lifecycle_updated_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END; $$;

-- ---- 3) Expanded validator with precise drift blockers --------------------
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
  v_current_send_ver bigint := nullif(p_payload->>'current_send_policy_version','')::bigint;
  v_current_review_ver bigint := nullif(p_payload->>'current_review_policy_version','')::bigint;
  v_cert public.communication_dry_run_certification%ROWTYPE;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_valid boolean := true;
  v_now timestamptz := now();
  v_approval_check jsonb;
  v_computed text;
  v_cfg record;
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

  -- Lifecycle status
  IF v_cert.status = 'REVOKED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_revoked','stage','dry_run','severity','critical','message',coalesce(v_cert.revocation_reason,'revoked')); v_valid := false;
  ELSIF v_cert.status = 'EXPIRED' OR v_cert.expires_at < v_now THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_expired','stage','dry_run','severity','high'); v_valid := false;
  ELSIF v_cert.status = 'INVALIDATED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_invalidated','stage','dry_run','severity','high','message',coalesce(v_cert.invalidation_reason,'invalidated')); v_valid := false;
  ELSIF v_cert.status = 'SUPERSEDED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_superseded','stage','dry_run','severity','high'); v_valid := false;
  ELSIF v_cert.status = 'FAILED' OR v_cert.result <> 'DRY_RUN_PASSED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','severity','high'); v_valid := false;
  ELSIF v_cert.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_failed','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  -- Scope
  IF v_module IS NOT NULL AND v_cert.module_code <> v_module THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_scope_mismatch','stage','dry_run','severity','high','message','module mismatch'); v_valid := false;
  END IF;
  IF v_event IS NOT NULL AND v_cert.event_code <> v_event THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_scope_mismatch','stage','dry_run','severity','high','message','event mismatch'); v_valid := false;
  END IF;
  IF v_channel IS NOT NULL AND v_cert.channel <> v_channel THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_scope_mismatch','stage','dry_run','severity','high','message','channel mismatch'); v_valid := false;
  END IF;

  -- Recipient drift
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

  -- Template / sender / content
  IF v_exp_tpl_ver IS NOT NULL AND v_cert.template_version_id IS NOT NULL AND v_exp_tpl_ver <> v_cert.template_version_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_template_version_mismatch','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_exp_sender IS NOT NULL AND v_cert.sender_profile_id IS NOT NULL AND v_exp_sender <> v_cert.sender_profile_id THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_sender_mismatch','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_exp_content IS NOT NULL AND v_cert.content_hash IS NOT NULL AND v_exp_content <> v_cert.content_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_content_mismatch','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  -- Policy / configuration drift
  IF v_current_cfg_ver IS NOT NULL AND v_cert.configuration_version IS NOT NULL AND v_current_cfg_ver <> v_cert.configuration_version THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_configuration_changed','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_current_recip_ver IS NOT NULL AND v_cert.recipient_policy_version IS NOT NULL AND v_current_recip_ver <> v_cert.recipient_policy_version THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_recipient_policy_changed','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_current_send_ver IS NOT NULL AND v_cert.send_policy_version IS NOT NULL AND v_current_send_ver <> v_cert.send_policy_version THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_send_policy_changed','stage','dry_run','severity','high'); v_valid := false;
  END IF;
  IF v_current_review_ver IS NOT NULL AND v_cert.review_policy_version IS NOT NULL AND v_current_review_ver <> v_cert.review_policy_version THEN
    v_blockers := v_blockers || jsonb_build_object('code','dry_run_review_policy_changed','stage','dry_run','severity','high'); v_valid := false;
  END IF;

  -- Template active + approved (best-effort against core_template + core_template_version)
  IF v_cert.template_version_id IS NOT NULL THEN
    BEGIN
      SELECT ctv.status AS version_status, ct.status AS template_status
        INTO v_cfg
        FROM public.core_template_version ctv
        LEFT JOIN public.core_template ct ON ct.id = ctv.template_id
       WHERE ctv.id = v_cert.template_version_id;
      IF FOUND THEN
        IF coalesce(v_cfg.template_status,'active') NOT IN ('active','ACTIVE','published','PUBLISHED') THEN
          v_blockers := v_blockers || jsonb_build_object('code','dry_run_template_inactive','stage','dry_run','severity','high'); v_valid := false;
        END IF;
        IF coalesce(v_cfg.version_status,'approved') NOT IN ('approved','APPROVED','active','ACTIVE','published','PUBLISHED') THEN
          v_blockers := v_blockers || jsonb_build_object('code','dry_run_template_unapproved','stage','dry_run','severity','high'); v_valid := false;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_object('code','template_status_probe_unavailable','message',SQLERRM);
    END;
  END IF;

  -- Sender active + verified
  IF v_cert.sender_profile_id IS NOT NULL THEN
    BEGIN
      SELECT is_active, verification_status
        INTO v_cfg
        FROM public.communication_hub_sender_profile
       WHERE id = v_cert.sender_profile_id;
      IF FOUND THEN
        IF NOT coalesce(v_cfg.is_active, true) THEN
          v_blockers := v_blockers || jsonb_build_object('code','dry_run_sender_inactive','stage','dry_run','severity','high'); v_valid := false;
        END IF;
        IF coalesce(v_cfg.verification_status,'verified') NOT IN ('verified','VERIFIED','ok','OK') THEN
          v_blockers := v_blockers || jsonb_build_object('code','dry_run_sender_unverified','stage','dry_run','severity','high'); v_valid := false;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_object('code','sender_status_probe_unavailable','message',SQLERRM);
    END;
  END IF;

  -- Event still eligible in send-decision core (fast probe)
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM public.communication_hub_event_send_policy
       WHERE module_code = v_cert.module_code AND event_code = v_cert.event_code AND channel = v_cert.channel
    ) THEN
      v_blockers := v_blockers || jsonb_build_object('code','dry_run_event_no_longer_eligible','stage','dry_run','severity','high'); v_valid := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','event_probe_unavailable','message',SQLERRM);
  END;

  -- Preview approval revalidation
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

  -- Evidence completeness
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

-- ---- 4) Revoke RPC updated for new lifecycle fields ----------------------
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
     SET status='REVOKED',
         revoked_by = v_actor,
         revoked_at = now(),
         revocation_reason = v_reason,
         invalidation_reason = v_reason,
         invalidated_at = now(),
         invalidated_by = v_actor
   WHERE id = v_cert_id AND status IN ('ACTIVE','EXPIRED')
   RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'certification not revocable in current status'; END IF;

  RETURN jsonb_build_object(
    'certification_id', v_row.id,
    'status', v_row.status,
    'revocation_reason', v_row.revocation_reason,
    'revoked_at', v_row.revoked_at,
    'revoked_by', v_row.revoked_by);
END; $$;
GRANT EXECUTE ON FUNCTION public.revoke_comm_hub_dry_run_certification(jsonb) TO authenticated, service_role;

-- ---- 5) Permanent dry-run classification on message + attempt ------------
ALTER TABLE public.communication_message
  ADD COLUMN IF NOT EXISTS send_context text NULL,
  ADD COLUMN IF NOT EXISTS dry_run_locked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.communication_message_send_context_immutability()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.dry_run_locked IS TRUE THEN
    IF NEW.send_context IS DISTINCT FROM OLD.send_context THEN
      RAISE EXCEPTION 'communication_message.send_context is immutable for dry-run-locked messages';
    END IF;
    IF NEW.dry_run_locked IS DISTINCT FROM OLD.dry_run_locked THEN
      RAISE EXCEPTION 'communication_message.dry_run_locked is immutable once set';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_comm_message_send_context_immutable ON public.communication_message;
CREATE TRIGGER trg_comm_message_send_context_immutable
  BEFORE UPDATE ON public.communication_message
  FOR EACH ROW EXECUTE FUNCTION public.communication_message_send_context_immutability();

ALTER TABLE public.communication_delivery_attempt
  ADD COLUMN IF NOT EXISTS send_context text NULL,
  ADD COLUMN IF NOT EXISTS attempt_type text NULL,
  ADD COLUMN IF NOT EXISTS provider_call_attempted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recipient_set_hash text NULL,
  ADD COLUMN IF NOT EXISTS subject_hash text NULL,
  ADD COLUMN IF NOT EXISTS body_hash text NULL,
  ADD COLUMN IF NOT EXISTS blockers jsonb NULL,
  ADD COLUMN IF NOT EXISTS warnings jsonb NULL;

-- ---- 6) Canonical dry-run orchestrator -----------------------------------
CREATE OR REPLACE FUNCTION public.execute_comm_hub_dry_run(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := coalesce(nullif(p_payload->>'requested_by','')::uuid, auth.uid());
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_to  jsonb := coalesce(p_payload->'to_recipients','[]'::jsonb);
  v_cc  jsonb := coalesce(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := coalesce(p_payload->'bcc_recipients','[]'::jsonb);
  v_snap_id uuid := nullif(p_payload->>'preview_snapshot_id','')::uuid;
  v_appr_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_idem text := nullif(p_payload->>'idempotency_key','');
  v_reason text := coalesce(p_payload->>'operator_reason','');
  v_started timestamptz := now();
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_norm jsonb;
  v_recipient_hash text;
  v_decision jsonb;
  v_allowed boolean;
  v_request_id uuid;
  v_request_no text;
  v_message_id uuid;
  v_attempt_id uuid;
  v_trace_id uuid;
  v_trace_no text;
  v_cert_id uuid;
  v_cert_no text;
  v_existing public.communication_dry_run_certification%ROWTYPE;
  v_blockers jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_final_status text;
  v_orig_decision_id uuid;
  v_reval_decision_id uuid;
  v_cfg_ver bigint; v_recip_ver bigint; v_send_ver bigint; v_review_ver bigint;
  v_expires_at timestamptz;
  v_expiry_days integer := 7;
  v_operating_mode text;
BEGIN
  -- Part 4.1 — authentication
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','not_authenticated','stage','auth','severity','critical')));
  END IF;

  -- Part 4.3 — idempotency key required
  IF v_idem IS NULL OR length(v_idem) < 8 THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_required','stage','idempotency','severity','critical')));
  END IF;

  -- Part 4.4/4.5 — idempotency lookup: return existing certification if scope matches
  SELECT * INTO v_existing FROM public.communication_dry_run_certification WHERE idempotency_key = v_idem;
  IF FOUND THEN
    IF v_existing.module_code <> coalesce(v_module,v_existing.module_code)
       OR v_existing.event_code <> coalesce(v_event,v_existing.event_code)
       OR v_existing.channel     <> coalesce(v_channel,v_existing.channel)
    THEN
      RETURN jsonb_build_object('status','BLOCKED','passed',false,
        'blockers', jsonb_build_array(jsonb_build_object('code','idempotency_key_scope_mismatch','stage','idempotency','severity','critical')));
    END IF;
    v_final_status := CASE WHEN v_existing.status='ACTIVE' AND v_existing.result='DRY_RUN_PASSED' THEN 'DRY_RUN_PASSED'
                          WHEN v_existing.result='BLOCKED' THEN 'BLOCKED'
                          ELSE 'DRY_RUN_FAILED' END;
    RETURN jsonb_build_object(
      'status', v_final_status,
      'passed', v_final_status='DRY_RUN_PASSED',
      'idempotent_replay', true,
      'dry_run_certification_id', v_existing.id,
      'request_id', v_existing.communication_request_id,
      'message_id', v_existing.communication_message_id,
      'delivery_attempt_id', v_existing.communication_delivery_attempt_id,
      'trace_id', v_existing.trace_id,
      'original_decision_id', v_existing.original_decision_id,
      'dispatcher_revalidation_decision_id', v_existing.dispatcher_revalidation_decision_id,
      'preview_snapshot_id', v_existing.preview_snapshot_id,
      'preview_approval_id', v_existing.preview_approval_id,
      'provider_call_attempted', v_existing.provider_call_attempted,
      'provider_message_id', NULL,
      'certification_expires_at', v_existing.expires_at,
      'started_at', v_existing.certified_at,
      'completed_at', v_existing.certified_at,
      'message','Dry test passed — no real email was sent.'
    );
  END IF;

  -- Snapshot load + scope match
  IF v_snap_id IS NULL THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_required','stage','preview','severity','critical')));
  END IF;
  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_missing','stage','preview','severity','critical')));
  END IF;
  IF v_snap.module_code <> v_module OR v_snap.event_code <> v_event OR v_snap.channel <> v_channel THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_scope_mismatch','stage','preview','severity','critical')));
  END IF;

  v_norm := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);
  v_recipient_hash := v_norm->>'recipient_set_hash';
  IF v_snap.recipient_set_hash IS NOT NULL AND v_snap.recipient_set_hash <> v_recipient_hash THEN
    RETURN jsonb_build_object('status','BLOCKED','passed',false,
      'blockers', jsonb_build_array(jsonb_build_object('code','preview_snapshot_recipient_mismatch','stage','preview','severity','critical')));
  END IF;

  -- Canonical send decision (dry_run context)
  v_decision := public.evaluate_comm_hub_send_decision(jsonb_build_object(
    'module_code', v_module,
    'event_code',  v_event,
    'channel',     v_channel,
    'send_context','dry_run',
    'to_recipients', v_to,
    'cc_recipients', v_cc,
    'bcc_recipients', v_bcc,
    'template_version_id', v_snap.template_version_id,
    'sender_profile_id',   v_snap.sender_profile_id,
    'expected_content_hash', v_snap.content_hash,
    'preview_approval_id', v_appr_id,
    'idempotency_key', v_idem,
    'requested_by', v_actor));

  v_allowed := coalesce((v_decision->>'allowed')::boolean,false);
  v_blockers := coalesce(v_decision->'blockers','[]'::jsonb);
  v_warnings := v_warnings || coalesce(v_decision->'warnings','[]'::jsonb);
  v_orig_decision_id := nullif(v_decision->>'decision_id','')::uuid;
  v_cfg_ver    := nullif(v_decision->>'configuration_version','')::bigint;
  v_recip_ver  := nullif(v_decision->>'recipient_policy_version','')::bigint;
  v_send_ver   := nullif(v_decision->>'send_policy_version','')::bigint;
  v_review_ver := nullif(v_decision->>'review_policy_version','')::bigint;

  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'status','BLOCKED','passed',false,
      'idempotent_replay', false,
      'original_decision_id', v_orig_decision_id,
      'preview_snapshot_id', v_snap_id,
      'preview_approval_id', v_appr_id,
      'blockers', v_blockers, 'warnings', v_warnings,
      'started_at', v_started, 'completed_at', now(),
      'provider_call_attempted', false, 'provider_message_id', NULL,
      'message','Dry run blocked by canonical send decision.');
  END IF;

  -- Create request
  INSERT INTO public.communication_request(
    request_no, module_code, event_code, channels, status, payload, context,
    idempotency_key, requested_by,
    original_decision_id, decision_send_context,
    configuration_version, recipient_policy_version, send_policy_version, review_policy_version,
    decision_expires_at, decision_blocker_snapshot,
    template_id, core_template_id)
  VALUES (
    'DRYRUN-' || to_char(v_started at time zone 'utc','YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
    v_module, v_event, ARRAY[v_channel], 'dry_run',
    jsonb_build_object('preview_snapshot_id',v_snap_id,'operator_reason',v_reason),
    jsonb_build_object('send_context','dry_run','preview_approval_id',v_appr_id,'idempotency_key',v_idem),
    v_idem, v_actor,
    v_orig_decision_id, 'dry_run',
    v_cfg_ver, v_recip_ver, v_send_ver, v_review_ver,
    nullif(v_decision->>'expires_at','')::timestamptz, v_blockers,
    v_snap.template_id, v_snap.template_id)
  RETURNING id, request_no INTO v_request_id, v_request_no;

  -- Recipients
  INSERT INTO public.communication_recipient(request_id, role, email, name)
  SELECT v_request_id, 'to', r->>'email', r->>'name' FROM jsonb_array_elements(v_to) r;
  INSERT INTO public.communication_recipient(request_id, role, email, name)
  SELECT v_request_id, 'cc', r->>'email', r->>'name' FROM jsonb_array_elements(v_cc) r;
  INSERT INTO public.communication_recipient(request_id, role, email, name)
  SELECT v_request_id, 'bcc', r->>'email', r->>'name' FROM jsonb_array_elements(v_bcc) r;

  -- Single dry-run message with permanent classification
  INSERT INTO public.communication_message(
    request_id, channel, template_version_id, sender_profile_id,
    subject, body_text, body_html, status, test_mode, origin,
    send_context, dry_run_locked)
  VALUES (
    v_request_id, v_channel, v_snap.template_version_id, v_snap.sender_profile_id,
    v_snap.rendered_subject, v_snap.rendered_body_text, v_snap.rendered_body_html,
    'dry_run', true, 'comm-hub-dry-run',
    'dry_run', true)
  RETURNING id INTO v_message_id;

  -- Trace (best-effort)
  BEGIN
    SELECT (r->>'trace_id')::uuid, r->>'trace_no' INTO v_trace_id, v_trace_no
      FROM public.start_comm_hub_trace(jsonb_build_object(
        'module_code', v_module, 'event_code', v_event, 'channel', v_channel,
        'source_action','dry_run', 'correlation_id', v_idem,
        'current_stage','DRY_RUN_STARTED')) r;
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','trace_unavailable','message',SQLERRM);
  END;

  -- Delivery attempt (dry-run, provider NOT called)
  v_reval_decision_id := v_orig_decision_id; -- best-effort in B.1; dispatcher revalidates in B.2
  INSERT INTO public.communication_delivery_attempt(
    message_id, attempt_no, started_at, finished_at, status,
    original_decision_id, revalidation_decision_id, revalidation_result,
    send_context, attempt_type, provider_call_attempted,
    recipient_set_hash, subject_hash, body_hash, blockers, warnings)
  VALUES (
    v_message_id, 1, v_started, now(), 'success',
    v_orig_decision_id, v_reval_decision_id, 'allowed',
    'dry_run', 'dry_run', false,
    v_recipient_hash, v_snap.rendered_subject_hash, v_snap.rendered_body_hash,
    NULL, v_warnings)
  RETURNING id INTO v_attempt_id;

  -- Operating mode snapshot
  BEGIN
    SELECT operating_mode INTO v_operating_mode FROM public.communication_hub_control_settings WHERE singleton_guard = true;
  EXCEPTION WHEN OTHERS THEN v_operating_mode := NULL; END;

  -- Certification: create ACTIVE and supersede any prior ACTIVE for the same scope
  v_expires_at := now() + make_interval(days => v_expiry_days);
  INSERT INTO public.communication_dry_run_certification(
    certification_no, module_code, event_code, channel,
    preview_snapshot_id, preview_approval_id,
    communication_request_id, communication_message_id, communication_delivery_attempt_id, trace_id,
    recipient_set_hash, template_id, template_version_id, sender_profile_id,
    rendered_subject_hash, rendered_body_hash, content_hash,
    configuration_version, recipient_policy_version, send_policy_version, review_policy_version,
    original_decision_id, dispatcher_revalidation_decision_id,
    result, status, provider_call_attempted,
    certified_by, certified_at, expires_at,
    idempotency_key, audit_metadata)
  VALUES (
    'DRC-' || to_char(now() at time zone 'utc','YYYYMMDDHH24MISS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8),
    v_module, v_event, v_channel,
    v_snap_id, v_appr_id,
    v_request_id, v_message_id, v_attempt_id, v_trace_id,
    v_recipient_hash, v_snap.template_id, v_snap.template_version_id, v_snap.sender_profile_id,
    v_snap.rendered_subject_hash, v_snap.rendered_body_hash, v_snap.content_hash,
    v_cfg_ver, v_recip_ver, v_send_ver, v_review_ver,
    v_orig_decision_id, v_reval_decision_id,
    'DRY_RUN_PASSED','ACTIVE', false,
    v_actor, now(), v_expires_at,
    v_idem, jsonb_build_object('operator_reason', v_reason, 'operating_mode', v_operating_mode))
  RETURNING id, certification_no INTO v_cert_id, v_cert_no;

  -- Supersede prior ACTIVE certifications for the same scope
  UPDATE public.communication_dry_run_certification
     SET status = 'SUPERSEDED', superseded_by = v_cert_id
   WHERE id <> v_cert_id
     AND module_code = v_module AND event_code = v_event AND channel = v_channel
     AND status = 'ACTIVE';

  RETURN jsonb_build_object(
    'status','DRY_RUN_PASSED','passed', true,
    'idempotent_replay', false,
    'dry_run_certification_id', v_cert_id,
    'certification_no', v_cert_no,
    'request_id', v_request_id, 'request_number', v_request_no,
    'message_id', v_message_id,
    'delivery_attempt_id', v_attempt_id,
    'trace_id', v_trace_id,
    'original_decision_id', v_orig_decision_id,
    'dispatcher_revalidation_decision_id', v_reval_decision_id,
    'preview_snapshot_id', v_snap_id,
    'preview_approval_id', v_appr_id,
    'blockers', '[]'::jsonb, 'warnings', v_warnings,
    'started_at', v_started, 'completed_at', now(),
    'certification_expires_at', v_expires_at,
    'provider_call_attempted', false,
    'provider_message_id', NULL,
    'final_operating_mode', v_operating_mode,
    'message','Dry test passed — no real email was sent.');
EXCEPTION WHEN unique_violation THEN
  -- Concurrent same-key: reload and return existing
  SELECT * INTO v_existing FROM public.communication_dry_run_certification WHERE idempotency_key = v_idem;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', CASE WHEN v_existing.result='DRY_RUN_PASSED' THEN 'DRY_RUN_PASSED' ELSE 'DRY_RUN_FAILED' END,
      'passed', v_existing.result='DRY_RUN_PASSED',
      'idempotent_replay', true,
      'dry_run_certification_id', v_existing.id,
      'request_id', v_existing.communication_request_id,
      'message_id', v_existing.communication_message_id,
      'delivery_attempt_id', v_existing.communication_delivery_attempt_id,
      'trace_id', v_existing.trace_id,
      'certification_expires_at', v_existing.expires_at,
      'provider_call_attempted', v_existing.provider_call_attempted,
      'message','Dry test passed — no real email was sent.');
  END IF;
  RAISE;
END; $$;

GRANT EXECUTE ON FUNCTION public.execute_comm_hub_dry_run(jsonb) TO authenticated, service_role;
