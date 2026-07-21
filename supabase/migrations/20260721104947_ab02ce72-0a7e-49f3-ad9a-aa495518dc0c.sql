
CREATE SEQUENCE IF NOT EXISTS public.clc_no_seq;

CREATE TABLE IF NOT EXISTS public.communication_controlled_live_certification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_no BIGINT NOT NULL DEFAULT nextval('public.clc_no_seq'),
  execution_id UUID NOT NULL,
  module_code TEXT NOT NULL,
  event_code TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  recipient_set_hash TEXT NOT NULL,
  preview_snapshot_id UUID,
  preview_approval_id UUID NOT NULL,
  dry_run_certification_id UUID NOT NULL,
  request_id UUID,
  message_id UUID,
  delivery_attempt_id UUID,
  trace_id UUID,
  provider_name TEXT,
  provider_message_id TEXT,
  provider_outcome TEXT NOT NULL,
  provider_status TEXT,
  status TEXT NOT NULL DEFAULT 'PROVIDER_ACCEPTED',
  manual_verification_status TEXT,
  manual_verification_received_at TIMESTAMPTZ,
  manual_verification_recipient TEXT,
  manual_verification_note TEXT,
  manual_verified_by UUID,
  manual_verified_at TIMESTAMPTZ,
  recipient_policy_version INTEGER,
  configuration_version INTEGER,
  operating_mode_prior TEXT,
  operating_mode_final TEXT,
  cleanup_succeeded BOOLEAN,
  certified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certified_by UUID,
  invalidation_reason TEXT,
  invalidated_at TIMESTAMPTZ,
  invalidated_by UUID,
  CONSTRAINT clc_status_check CHECK (status IN (
    'PROVIDER_ACCEPTED','DELIVERY_CONFIRMED','DELIVERY_CONFIRMED_MANUALLY','INVALIDATED','REVOKED'
  )),
  CONSTRAINT clc_provider_outcome_check CHECK (provider_outcome IN (
    'PROVIDER_ACCEPTED','DELIVERY_PENDING','DELIVERED'
  )),
  CONSTRAINT clc_manual_status_check CHECK (
    manual_verification_status IS NULL OR manual_verification_status IN ('CONFIRMED','NOT_RECEIVED')
  ),
  CONSTRAINT clc_execution_unique UNIQUE (execution_id)
);

ALTER SEQUENCE public.clc_no_seq OWNED BY public.communication_controlled_live_certification.certification_no;

CREATE INDEX IF NOT EXISTS clc_module_event_idx
  ON public.communication_controlled_live_certification (module_code, event_code);
CREATE INDEX IF NOT EXISTS clc_certified_at_idx
  ON public.communication_controlled_live_certification (certified_at DESC);

GRANT ALL ON public.communication_controlled_live_certification TO service_role;
REVOKE ALL ON public.communication_controlled_live_certification FROM authenticated, anon;
GRANT USAGE, SELECT ON SEQUENCE public.clc_no_seq TO service_role;

CREATE OR REPLACE FUNCTION public._clc_immutable_evidence()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.execution_id IS DISTINCT FROM OLD.execution_id
       OR NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id
       OR NEW.provider_outcome IS DISTINCT FROM OLD.provider_outcome
       OR NEW.request_id IS DISTINCT FROM OLD.request_id
       OR NEW.message_id IS DISTINCT FROM OLD.message_id
       OR NEW.delivery_attempt_id IS DISTINCT FROM OLD.delivery_attempt_id
       OR NEW.recipient_set_hash IS DISTINCT FROM OLD.recipient_set_hash
       OR NEW.preview_approval_id IS DISTINCT FROM OLD.preview_approval_id
       OR NEW.dry_run_certification_id IS DISTINCT FROM OLD.dry_run_certification_id
       OR NEW.certified_at IS DISTINCT FROM OLD.certified_at
    THEN
      RAISE EXCEPTION 'communication_controlled_live_certification evidence fields are immutable';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS clc_immutable_evidence ON public.communication_controlled_live_certification;
CREATE TRIGGER clc_immutable_evidence
  BEFORE UPDATE ON public.communication_controlled_live_certification
  FOR EACH ROW EXECUTE FUNCTION public._clc_immutable_evidence();

CREATE OR REPLACE FUNCTION public.record_controlled_live_certification(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_execution_id UUID := (p_payload->>'execution_id')::uuid;
  v_provider_outcome TEXT := p_payload->>'provider_outcome';
  v_status TEXT;
  v_row public.communication_controlled_live_certification%ROWTYPE;
  v_recipient_policy_version INTEGER;
  v_config_version INTEGER;
BEGIN
  IF v_execution_id IS NULL THEN RAISE EXCEPTION 'execution_id required'; END IF;
  IF v_provider_outcome NOT IN ('PROVIDER_ACCEPTED','DELIVERY_PENDING','DELIVERED') THEN
    RAISE EXCEPTION 'provider_outcome invalid';
  END IF;

  SELECT * INTO v_row FROM public.communication_controlled_live_certification
   WHERE execution_id = v_execution_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'replayed', true,
      'certification_id', v_row.id, 'status', v_row.status,
      'provider_outcome', v_row.provider_outcome);
  END IF;

  v_status := CASE WHEN v_provider_outcome = 'DELIVERED' THEN 'DELIVERY_CONFIRMED' ELSE 'PROVIDER_ACCEPTED' END;

  SELECT policy_version INTO v_recipient_policy_version
    FROM public.communication_hub_recipient_policy WHERE singleton_guard = 'primary';

  BEGIN
    SELECT configuration_version INTO v_config_version
      FROM public.communication_hub_control_settings WHERE singleton_guard = 'primary';
  EXCEPTION WHEN OTHERS THEN v_config_version := NULL; END;

  INSERT INTO public.communication_controlled_live_certification (
    execution_id, module_code, event_code, channel, recipient_set_hash,
    preview_snapshot_id, preview_approval_id, dry_run_certification_id,
    request_id, message_id, delivery_attempt_id, trace_id,
    provider_name, provider_message_id, provider_outcome, provider_status,
    status, recipient_policy_version, configuration_version,
    operating_mode_prior, operating_mode_final, cleanup_succeeded, certified_by
  ) VALUES (
    v_execution_id, p_payload->>'module_code', p_payload->>'event_code',
    COALESCE(p_payload->>'channel','email'), p_payload->>'recipient_set_hash',
    NULLIF(p_payload->>'preview_snapshot_id','')::uuid,
    (p_payload->>'preview_approval_id')::uuid,
    (p_payload->>'dry_run_certification_id')::uuid,
    NULLIF(p_payload->>'request_id','')::uuid,
    NULLIF(p_payload->>'message_id','')::uuid,
    NULLIF(p_payload->>'delivery_attempt_id','')::uuid,
    NULLIF(p_payload->>'trace_id','')::uuid,
    p_payload->>'provider_name', p_payload->>'provider_message_id',
    v_provider_outcome, p_payload->>'provider_status', v_status,
    v_recipient_policy_version, v_config_version,
    p_payload->>'operating_mode_prior', p_payload->>'operating_mode_final',
    NULLIF(p_payload->>'cleanup_succeeded','')::boolean,
    NULLIF(p_payload->>'certified_by','')::uuid
  ) RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'replayed', false,
    'certification_id', v_row.id, 'status', v_row.status,
    'provider_outcome', v_row.provider_outcome);
END; $$;

REVOKE ALL ON FUNCTION public.record_controlled_live_certification(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_controlled_live_certification(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.record_controlled_live_manual_verification(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cert_id UUID := (p_payload->>'certification_id')::uuid;
  v_received BOOLEAN := (p_payload->>'received')::boolean;
  v_recipient TEXT := lower(trim(p_payload->>'verified_recipient'));
  v_note TEXT := p_payload->>'note';
  v_received_at TIMESTAMPTZ := COALESCE(NULLIF(p_payload->>'received_at','')::timestamptz, now());
  v_uid UUID := auth.uid();
  v_row public.communication_controlled_live_certification%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin role required for manual controlled-live verification';
  END IF;
  IF v_cert_id IS NULL THEN RAISE EXCEPTION 'certification_id required'; END IF;

  SELECT * INTO v_row FROM public.communication_controlled_live_certification
   WHERE id = v_cert_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'certification not found'; END IF;

  IF v_row.status <> 'PROVIDER_ACCEPTED' THEN
    RAISE EXCEPTION 'manual verification only permitted while status = PROVIDER_ACCEPTED (current: %)', v_row.status;
  END IF;

  IF v_received IS TRUE AND (v_recipient IS NULL OR length(v_recipient) = 0) THEN
    RAISE EXCEPTION 'verified_recipient required when received = true';
  END IF;

  UPDATE public.communication_controlled_live_certification
     SET manual_verification_status = CASE WHEN v_received THEN 'CONFIRMED' ELSE 'NOT_RECEIVED' END,
         manual_verification_received_at = CASE WHEN v_received THEN v_received_at ELSE NULL END,
         manual_verification_recipient = CASE WHEN v_received THEN v_recipient ELSE NULL END,
         manual_verification_note = v_note,
         manual_verified_by = v_uid,
         manual_verified_at = now(),
         status = CASE WHEN v_received THEN 'DELIVERY_CONFIRMED_MANUALLY' ELSE status END
   WHERE id = v_cert_id
   RETURNING * INTO v_row;

  BEGIN
    INSERT INTO public.communication_hub_control_audit (action, actor_id, reason, payload)
    VALUES (
      'controlled_live_manual_verification', v_uid,
      COALESCE(v_note,'manual inbox verification'),
      jsonb_build_object(
        'certification_id', v_row.id, 'execution_id', v_row.execution_id,
        'received', v_received, 'verified_recipient', v_recipient,
        'received_at', v_received_at)
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  RETURN jsonb_build_object('ok', true,
    'certification_id', v_row.id, 'status', v_row.status,
    'manual_verification_status', v_row.manual_verification_status,
    'manual_verified_at', v_row.manual_verified_at);
END; $$;

REVOKE ALL ON FUNCTION public.record_controlled_live_manual_verification(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_controlled_live_manual_verification(jsonb)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_controlled_live_certification(p_certification_id uuid)
RETURNS SETOF public.communication_controlled_live_certification
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  v_is_admin := public.has_role(v_uid, 'admin'::app_role);
  RETURN QUERY
  SELECT c.* FROM public.communication_controlled_live_certification c
    LEFT JOIN public.communication_controlled_live_execution e ON e.id = c.execution_id
   WHERE c.id = p_certification_id
     AND (v_is_admin OR e.requested_by = v_uid);
END; $$;

REVOKE ALL ON FUNCTION public.get_controlled_live_certification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_controlled_live_certification(uuid) TO authenticated, service_role;
