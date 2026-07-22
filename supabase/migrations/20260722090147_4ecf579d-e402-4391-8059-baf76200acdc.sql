
-- CH-GL-02 Slice A · Add explicit certification_kind to controlled-live certification
-- CONTROLLED_STUB = deterministic simulator only, no external provider call
-- ONE_REAL_EMAIL  = single sanctioned real-provider send (future, still locked)

ALTER TABLE public.communication_controlled_live_certification
  ADD COLUMN IF NOT EXISTS certification_kind TEXT;

-- Backfill: everything issued before this migration was a stub run.
UPDATE public.communication_controlled_live_certification
   SET certification_kind = 'CONTROLLED_STUB'
 WHERE certification_kind IS NULL;

ALTER TABLE public.communication_controlled_live_certification
  ALTER COLUMN certification_kind SET NOT NULL,
  ALTER COLUMN certification_kind SET DEFAULT 'CONTROLLED_STUB';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'clc_certification_kind_check'
       AND conrelid = 'public.communication_controlled_live_certification'::regclass
  ) THEN
    ALTER TABLE public.communication_controlled_live_certification
      ADD CONSTRAINT clc_certification_kind_check
      CHECK (certification_kind IN ('CONTROLLED_STUB','ONE_REAL_EMAIL'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS clc_kind_status_idx
  ON public.communication_controlled_live_certification (certification_kind, status);

-- Extend the immutable-evidence trigger so certification_kind cannot be edited
-- after issue (evidence of "this was a simulator run" must be tamper-proof).
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
       OR NEW.certification_kind IS DISTINCT FROM OLD.certification_kind
    THEN
      RAISE EXCEPTION 'communication_controlled_live_certification evidence fields are immutable';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- Update record_controlled_live_certification to accept and require certification_kind.
-- Back-compat: if p_payload omits it, default to CONTROLLED_STUB (all historical
-- callers were the stub orchestrator path). Callers issuing ONE_REAL_EMAIL MUST
-- pass it explicitly.
CREATE OR REPLACE FUNCTION public.record_controlled_live_certification(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_execution_id UUID := (p_payload->>'execution_id')::uuid;
  v_provider_outcome TEXT := p_payload->>'provider_outcome';
  v_kind TEXT := COALESCE(NULLIF(p_payload->>'certification_kind',''), 'CONTROLLED_STUB');
  v_status TEXT;
  v_row public.communication_controlled_live_certification%ROWTYPE;
  v_recipient_policy_version INTEGER;
  v_config_version INTEGER;
BEGIN
  IF v_execution_id IS NULL THEN RAISE EXCEPTION 'execution_id required'; END IF;
  IF v_provider_outcome NOT IN ('PROVIDER_ACCEPTED','DELIVERY_PENDING','DELIVERED') THEN
    RAISE EXCEPTION 'provider_outcome invalid';
  END IF;
  IF v_kind NOT IN ('CONTROLLED_STUB','ONE_REAL_EMAIL') THEN
    RAISE EXCEPTION 'certification_kind invalid: %', v_kind;
  END IF;

  SELECT * INTO v_row FROM public.communication_controlled_live_certification
   WHERE execution_id = v_execution_id;
  IF FOUND THEN
    -- Replay guard: caller must not switch the certification kind mid-flight.
    IF v_row.certification_kind IS DISTINCT FROM v_kind THEN
      RAISE EXCEPTION
        'certification_kind mismatch on replay: existing=%, requested=%',
        v_row.certification_kind, v_kind;
    END IF;
    RETURN jsonb_build_object('ok', true, 'replayed', true,
      'certification_id', v_row.id, 'status', v_row.status,
      'provider_outcome', v_row.provider_outcome,
      'certification_kind', v_row.certification_kind);
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
    operating_mode_prior, operating_mode_final, cleanup_succeeded, certified_by,
    certification_kind
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
    NULLIF(p_payload->>'certified_by','')::uuid,
    v_kind
  ) RETURNING * INTO v_row;

  RETURN jsonb_build_object('ok', true, 'replayed', false,
    'certification_id', v_row.id, 'status', v_row.status,
    'provider_outcome', v_row.provider_outcome,
    'certification_kind', v_row.certification_kind);
END; $$;

REVOKE ALL ON FUNCTION public.record_controlled_live_certification(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_controlled_live_certification(jsonb) TO service_role;

-- get_controlled_live_certification already SELECT c.* so the new column is
-- surfaced automatically. No change required to the SETOF signature.

-- Helper: does this execution have a valid CONTROLLED_STUB certification?
-- Used later by the (locked) ONE_REAL_EMAIL gate. Zero writes, safe to expose
-- to authenticated operators.
CREATE OR REPLACE FUNCTION public.has_valid_controlled_stub_certification(
  p_module_code TEXT,
  p_event_code TEXT,
  p_recipient_set_hash TEXT
) RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.communication_controlled_live_certification c
     WHERE c.certification_kind = 'CONTROLLED_STUB'
       AND c.status IN ('PROVIDER_ACCEPTED','DELIVERY_CONFIRMED','DELIVERY_CONFIRMED_MANUALLY')
       AND c.module_code = p_module_code
       AND c.event_code = p_event_code
       AND c.recipient_set_hash = p_recipient_set_hash
       AND c.invalidated_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.has_valid_controlled_stub_certification(TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_valid_controlled_stub_certification(TEXT,TEXT,TEXT)
  TO authenticated, service_role;
