
-- =========================================================================
-- CH-SIMPLE-P3D-B.2.a — Immutable dry-run classification + transport guard
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Safety audit table (immutable append-only)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communication_hub_transport_guard_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NULL,
  message_id uuid NULL,
  authoritative_send_context text NULL,
  dry_run_locked boolean NULL,
  request_dry_run boolean NULL,
  attempted_provider text NULL,
  caller_function text NULL,
  caller_context text NULL,
  block_code text NOT NULL,
  correlation_id text NULL,
  trace_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_hub_transport_guard_audit_block_code_chk
    CHECK (block_code IN (
      'DRY_RUN_PROVIDER_INVOCATION_BLOCKED',
      'PROVIDER_EVIDENCE_NOT_FOUND',
      'PROVIDER_CONTEXT_MISMATCH',
      'PROVIDER_CONTEXT_UNVERIFIABLE'
    ))
);

GRANT SELECT ON public.communication_hub_transport_guard_audit TO authenticated;
GRANT ALL ON public.communication_hub_transport_guard_audit TO service_role;

ALTER TABLE public.communication_hub_transport_guard_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transport_guard_audit_admin_read" ON public.communication_hub_transport_guard_audit;
CREATE POLICY "transport_guard_audit_admin_read"
  ON public.communication_hub_transport_guard_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','system_admin','communication_admin','communication_operator')
    )
  );

DROP POLICY IF EXISTS "transport_guard_audit_service_all" ON public.communication_hub_transport_guard_audit;
CREATE POLICY "transport_guard_audit_service_all"
  ON public.communication_hub_transport_guard_audit
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_transport_guard_audit_message
  ON public.communication_hub_transport_guard_audit(message_id);
CREATE INDEX IF NOT EXISTS idx_transport_guard_audit_request
  ON public.communication_hub_transport_guard_audit(request_id);
CREATE INDEX IF NOT EXISTS idx_transport_guard_audit_blocked_at
  ON public.communication_hub_transport_guard_audit(blocked_at DESC);

-- Immutability: transport-guard audit rows are append-only.
CREATE OR REPLACE FUNCTION public.communication_hub_transport_guard_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'communication_hub_transport_guard_audit is append-only'
      USING ERRCODE = '42501';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'communication_hub_transport_guard_audit is append-only'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transport_guard_audit_immutable
  ON public.communication_hub_transport_guard_audit;
CREATE TRIGGER trg_transport_guard_audit_immutable
  BEFORE UPDATE OR DELETE ON public.communication_hub_transport_guard_audit
  FOR EACH ROW EXECUTE FUNCTION public.communication_hub_transport_guard_audit_immutable();

-- -------------------------------------------------------------------------
-- 2. Dry-run classification immutability triggers
--
-- Migration-only bypass: a session GUC
-- `communication_hub.dry_run_immutability_bypass = 'migration'` set via
-- `SET LOCAL` inside a migration transaction. It is NOT wired into any
-- runtime code path (frontend, edge functions, RPCs). A governance test
-- proves the literal string does not appear in any runtime source file.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_message_dry_run_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass text := current_setting('communication_hub.dry_run_immutability_bypass', true);
BEGIN
  IF v_bypass = 'migration' THEN
    RETURN NEW;
  END IF;

  -- Once dry_run_locked = true, it may never be cleared at runtime.
  IF OLD.dry_run_locked IS TRUE AND (NEW.dry_run_locked IS DISTINCT FROM TRUE) THEN
    RAISE EXCEPTION 'dry_run_classification_is_immutable: dry_run_locked cannot be cleared'
      USING ERRCODE = '42501';
  END IF;

  -- Once classified as dry_run, send_context may not be changed away from it.
  IF OLD.send_context = 'dry_run' AND (NEW.send_context IS DISTINCT FROM 'dry_run') THEN
    RAISE EXCEPTION 'dry_run_classification_is_immutable: send_context cannot be changed from dry_run'
      USING ERRCODE = '42501';
  END IF;

  -- If already dry-run-locked, send_context must remain 'dry_run'.
  IF OLD.dry_run_locked IS TRUE AND NEW.send_context IS DISTINCT FROM 'dry_run' THEN
    RAISE EXCEPTION 'dry_run_classification_is_immutable: locked message must remain dry_run'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_dry_run_immutability
  ON public.communication_message;
CREATE TRIGGER trg_enforce_message_dry_run_immutability
  BEFORE UPDATE ON public.communication_message
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_dry_run_immutability();

-- Insert-time consistency: a dry-run-locked message must declare send_context='dry_run'
-- and its parent request must also be classified as dry_run.
CREATE OR REPLACE FUNCTION public.enforce_message_dry_run_insert_consistency()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass text := current_setting('communication_hub.dry_run_immutability_bypass', true);
  v_req_ctx text;
BEGIN
  IF v_bypass = 'migration' THEN
    RETURN NEW;
  END IF;

  IF NEW.dry_run_locked IS TRUE AND NEW.send_context IS DISTINCT FROM 'dry_run' THEN
    RAISE EXCEPTION 'dry_run_classification_is_immutable: locked message must have send_context=dry_run'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.send_context = 'dry_run' THEN
    SELECT decision_send_context INTO v_req_ctx
      FROM public.communication_request WHERE id = NEW.request_id;
    IF v_req_ctx IS NOT NULL AND v_req_ctx IS DISTINCT FROM 'dry_run' THEN
      RAISE EXCEPTION 'dry_run_classification_is_immutable: parent request is not dry_run (got %)', v_req_ctx
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_message_dry_run_insert
  ON public.communication_message;
CREATE TRIGGER trg_enforce_message_dry_run_insert
  BEFORE INSERT ON public.communication_message
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_dry_run_insert_consistency();

-- Request-level immutability: once decision_send_context = 'dry_run', never change it.
CREATE OR REPLACE FUNCTION public.enforce_request_dry_run_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_bypass text := current_setting('communication_hub.dry_run_immutability_bypass', true);
BEGIN
  IF v_bypass = 'migration' THEN
    RETURN NEW;
  END IF;

  IF OLD.decision_send_context = 'dry_run'
     AND NEW.decision_send_context IS DISTINCT FROM 'dry_run' THEN
    RAISE EXCEPTION 'dry_run_classification_is_immutable: request decision_send_context cannot be changed from dry_run'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_request_dry_run_immutability
  ON public.communication_request;
CREATE TRIGGER trg_enforce_request_dry_run_immutability
  BEFORE UPDATE ON public.communication_request
  FOR EACH ROW EXECUTE FUNCTION public.enforce_request_dry_run_immutability();

-- -------------------------------------------------------------------------
-- 3. Server-side resolver for transport-boundary guard
--
-- Frontend / edge callers never supply "isDryRun" — they supply message id
-- (and optional request id). The resolver returns the authoritative
-- classification and records a safety audit row when it fails closed.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_comm_hub_transport_guard(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid := NULLIF(p_payload->>'message_id','')::uuid;
  v_request_id uuid := NULLIF(p_payload->>'request_id','')::uuid;
  v_attempted_provider text := p_payload->>'attempted_provider';
  v_caller_function text := p_payload->>'caller_function';
  v_caller_context text := p_payload->>'caller_context';
  v_correlation_id text := p_payload->>'correlation_id';
  v_trace_id uuid := NULLIF(p_payload->>'trace_id','')::uuid;

  v_msg record;
  v_req record;
  v_block_code text;
  v_audit_id uuid;
BEGIN
  IF v_message_id IS NULL THEN
    v_block_code := 'PROVIDER_EVIDENCE_NOT_FOUND';
    INSERT INTO public.communication_hub_transport_guard_audit
      (request_id, message_id, block_code, attempted_provider, caller_function,
       caller_context, correlation_id, trace_id, metadata)
    VALUES
      (v_request_id, v_message_id, v_block_code, v_attempted_provider,
       v_caller_function, v_caller_context, v_correlation_id, v_trace_id,
       jsonb_build_object('reason','missing_message_id'))
    RETURNING id INTO v_audit_id;
    RETURN jsonb_build_object('allowed', false, 'code', v_block_code, 'audit_id', v_audit_id);
  END IF;

  SELECT id, request_id, send_context, dry_run_locked
    INTO v_msg FROM public.communication_message WHERE id = v_message_id;

  IF NOT FOUND THEN
    v_block_code := 'PROVIDER_EVIDENCE_NOT_FOUND';
    INSERT INTO public.communication_hub_transport_guard_audit
      (request_id, message_id, block_code, attempted_provider, caller_function,
       caller_context, correlation_id, trace_id, metadata)
    VALUES
      (v_request_id, v_message_id, v_block_code, v_attempted_provider,
       v_caller_function, v_caller_context, v_correlation_id, v_trace_id,
       jsonb_build_object('reason','message_not_found'))
    RETURNING id INTO v_audit_id;
    RETURN jsonb_build_object('allowed', false, 'code', v_block_code,
      'message_id', v_message_id, 'audit_id', v_audit_id);
  END IF;

  IF v_request_id IS NOT NULL AND v_request_id IS DISTINCT FROM v_msg.request_id THEN
    v_block_code := 'PROVIDER_CONTEXT_MISMATCH';
    INSERT INTO public.communication_hub_transport_guard_audit
      (request_id, message_id, authoritative_send_context, dry_run_locked,
       block_code, attempted_provider, caller_function, caller_context,
       correlation_id, trace_id, metadata)
    VALUES
      (v_msg.request_id, v_message_id, v_msg.send_context, v_msg.dry_run_locked,
       v_block_code, v_attempted_provider, v_caller_function, v_caller_context,
       v_correlation_id, v_trace_id,
       jsonb_build_object('supplied_request_id', v_request_id,
                          'authoritative_request_id', v_msg.request_id))
    RETURNING id INTO v_audit_id;
    RETURN jsonb_build_object('allowed', false, 'code', v_block_code,
      'message_id', v_message_id, 'request_id', v_msg.request_id,
      'authoritative_send_context', v_msg.send_context, 'audit_id', v_audit_id);
  END IF;

  SELECT id, decision_send_context INTO v_req
    FROM public.communication_request WHERE id = v_msg.request_id;

  IF NOT FOUND THEN
    v_block_code := 'PROVIDER_EVIDENCE_NOT_FOUND';
    INSERT INTO public.communication_hub_transport_guard_audit
      (request_id, message_id, authoritative_send_context, dry_run_locked,
       block_code, attempted_provider, caller_function, caller_context,
       correlation_id, trace_id, metadata)
    VALUES
      (v_msg.request_id, v_message_id, v_msg.send_context, v_msg.dry_run_locked,
       v_block_code, v_attempted_provider, v_caller_function, v_caller_context,
       v_correlation_id, v_trace_id,
       jsonb_build_object('reason','request_not_found'))
    RETURNING id INTO v_audit_id;
    RETURN jsonb_build_object('allowed', false, 'code', v_block_code,
      'message_id', v_message_id, 'audit_id', v_audit_id);
  END IF;

  -- Fail closed on classification mismatch between message and request.
  IF (v_msg.send_context = 'dry_run')
       <> (v_req.decision_send_context = 'dry_run') THEN
    v_block_code := 'PROVIDER_CONTEXT_MISMATCH';
    INSERT INTO public.communication_hub_transport_guard_audit
      (request_id, message_id, authoritative_send_context, dry_run_locked,
       request_dry_run, block_code, attempted_provider, caller_function,
       caller_context, correlation_id, trace_id, metadata)
    VALUES
      (v_req.id, v_message_id, v_msg.send_context, v_msg.dry_run_locked,
       v_req.decision_send_context = 'dry_run', v_block_code,
       v_attempted_provider, v_caller_function, v_caller_context,
       v_correlation_id, v_trace_id,
       jsonb_build_object('message_send_context', v_msg.send_context,
                          'request_decision_send_context', v_req.decision_send_context))
    RETURNING id INTO v_audit_id;
    RETURN jsonb_build_object('allowed', false, 'code', v_block_code,
      'message_id', v_message_id, 'request_id', v_req.id,
      'authoritative_send_context', v_msg.send_context, 'audit_id', v_audit_id);
  END IF;

  -- Dry-run: block provider invocation and record safety-audit row.
  IF v_msg.send_context = 'dry_run'
     OR v_msg.dry_run_locked IS TRUE
     OR v_req.decision_send_context = 'dry_run' THEN
    v_block_code := 'DRY_RUN_PROVIDER_INVOCATION_BLOCKED';
    INSERT INTO public.communication_hub_transport_guard_audit
      (request_id, message_id, authoritative_send_context, dry_run_locked,
       request_dry_run, block_code, attempted_provider, caller_function,
       caller_context, correlation_id, trace_id, metadata)
    VALUES
      (v_req.id, v_message_id, v_msg.send_context, v_msg.dry_run_locked,
       v_req.decision_send_context = 'dry_run', v_block_code,
       v_attempted_provider, v_caller_function, v_caller_context,
       v_correlation_id, v_trace_id, '{}'::jsonb)
    RETURNING id INTO v_audit_id;
    RETURN jsonb_build_object('allowed', false, 'code', v_block_code,
      'message_id', v_message_id, 'request_id', v_req.id,
      'authoritative_send_context', COALESCE(v_msg.send_context,'dry_run'),
      'audit_id', v_audit_id);
  END IF;

  -- Allowed: live path.
  RETURN jsonb_build_object(
    'allowed', true,
    'request_id', v_req.id,
    'message_id', v_message_id,
    'authoritative_send_context', COALESCE(v_msg.send_context, 'live')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_comm_hub_transport_guard(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_comm_hub_transport_guard(jsonb) TO service_role;
