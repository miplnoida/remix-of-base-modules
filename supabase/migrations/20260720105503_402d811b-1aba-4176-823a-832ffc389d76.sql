
-- BN-MORT-UI-RECOVERY-2C — Corrective replacement of the readiness RPC.
-- Additive: previous function signature is preserved.

DROP FUNCTION IF EXISTS public.bn_mortality_set_integration_readiness(
  text, text, boolean, text, text, integer, uuid, text, text
);

CREATE OR REPLACE FUNCTION public.bn_mortality_set_integration_readiness(
  p_integration_code text,
  p_certification_status text,
  p_is_ready boolean,
  p_certification_reference text,
  p_notes text,
  p_expected_row_version integer,
  p_actor_user_id uuid,
  p_justification text,
  p_correlation_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid_codes    text[] := ARRAY['awards','dms','overpayments','survivor','funeral','legal'];
  v_valid_statuses text[] := ARRAY['NOT_CERTIFIED','IN_PROGRESS','CERTIFIED','REVOKED'];
  v_max_ref_len    int    := 200;
  v_max_notes_len  int    := 4000;
  v_max_just_len   int    := 4000;
  v_max_corr_len   int    := 128;
  v_corr_re        text   := '^[A-Za-z0-9._:-]{8,128}$';
  v_row            public.bn_mortality_integration_readiness%ROWTYPE;
  v_new_certified_at timestamptz;
  v_new_reference    text;
  v_prev_status  text;
  v_prev_ready   boolean;
  v_prev_ver     integer;
  v_perm         jsonb;
  v_history_id   uuid;
BEGIN
  -- Baseline validation ---------------------------------------------------
  IF p_is_ready IS NULL THEN
    RETURN jsonb_build_object('status','REJECTED','code','MISSING_READY_FLAG');
  END IF;
  IF p_actor_user_id IS NULL THEN
    RETURN jsonb_build_object('status','REJECTED','code','MISSING_ACTOR');
  END IF;
  IF p_expected_row_version IS NULL OR p_expected_row_version < 1 THEN
    RETURN jsonb_build_object('status','REJECTED','code','INVALID_ROW_VERSION');
  END IF;
  IF p_justification IS NULL OR btrim(p_justification) = '' THEN
    RETURN jsonb_build_object('status','REJECTED','code','MISSING_JUSTIFICATION');
  END IF;
  IF char_length(p_justification) > v_max_just_len THEN
    RETURN jsonb_build_object('status','REJECTED','code','JUSTIFICATION_TOO_LONG');
  END IF;
  IF p_correlation_id IS NULL OR btrim(p_correlation_id) = '' THEN
    RETURN jsonb_build_object('status','REJECTED','code','MISSING_CORRELATION_ID');
  END IF;
  IF char_length(p_correlation_id) > v_max_corr_len OR p_correlation_id !~ v_corr_re THEN
    RETURN jsonb_build_object('status','REJECTED','code','INVALID_CORRELATION_ID');
  END IF;
  IF p_notes IS NOT NULL AND char_length(p_notes) > v_max_notes_len THEN
    RETURN jsonb_build_object('status','REJECTED','code','NOTES_TOO_LONG');
  END IF;
  IF p_certification_reference IS NOT NULL
     AND char_length(p_certification_reference) > v_max_ref_len THEN
    RETURN jsonb_build_object('status','REJECTED','code','CERTIFICATION_REFERENCE_TOO_LONG');
  END IF;
  IF p_integration_code IS NULL OR NOT (p_integration_code = ANY (v_valid_codes)) THEN
    RETURN jsonb_build_object('status','REJECTED','code','INVALID_INTEGRATION_CODE');
  END IF;
  IF p_certification_status IS NULL OR NOT (p_certification_status = ANY (v_valid_statuses)) THEN
    RETURN jsonb_build_object('status','REJECTED','code','INVALID_STATUS');
  END IF;

  -- Actor permission walk (rollout-admin: is_mutation=false so the business
  -- actions_enabled gate does NOT apply, but every other gate does) --------
  v_perm := public.bn_mortality_check_actor_permission(
    p_actor_user_id := p_actor_user_id,
    p_action_name   := 'admin',
    p_is_mutation   := false
  );
  IF NOT COALESCE((v_perm ->> 'ok')::boolean, false) THEN
    RETURN jsonb_build_object(
      'status','REJECTED',
      'code','ACTOR_NOT_AUTHORISED',
      'reason', COALESCE(v_perm ->> 'code','CAPABILITY_DENIED')
    );
  END IF;

  -- Lock, verify row version --------------------------------------------
  SELECT * INTO v_row
  FROM public.bn_mortality_integration_readiness
  WHERE integration_code = p_integration_code
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','REJECTED','code','NOT_FOUND');
  END IF;
  IF v_row.row_version <> p_expected_row_version THEN
    RETURN jsonb_build_object(
      'status','REJECTED','code','CONCURRENCY_CONFLICT',
      'currentRowVersion', v_row.row_version
    );
  END IF;

  v_prev_status := v_row.certification_status;
  v_prev_ready  := v_row.is_ready;
  v_prev_ver    := v_row.row_version;

  -- Reset policy ---------------------------------------------------------
  IF p_certification_status = 'CERTIFIED' AND p_is_ready = true THEN
    IF p_certification_reference IS NULL OR btrim(p_certification_reference) = '' THEN
      RETURN jsonb_build_object('status','REJECTED','code','MISSING_CERTIFICATION_REFERENCE');
    END IF;
    v_new_reference := p_certification_reference;
    v_new_certified_at := COALESCE(v_row.certified_at, now());
  ELSIF p_certification_status = 'CERTIFIED' AND p_is_ready = false THEN
    v_new_reference := COALESCE(NULLIF(btrim(p_certification_reference), ''), v_row.certification_reference);
    v_new_certified_at := v_row.certified_at;
  ELSIF p_certification_status = 'REVOKED' THEN
    IF p_is_ready = true THEN
      RETURN jsonb_build_object('status','REJECTED','code','READY_REQUIRES_CERTIFIED');
    END IF;
    v_new_reference := v_row.certification_reference;
    v_new_certified_at := v_row.certified_at;
  ELSE
    IF p_is_ready = true THEN
      RETURN jsonb_build_object('status','REJECTED','code','READY_REQUIRES_CERTIFIED');
    END IF;
    v_new_reference := NULL;
    v_new_certified_at := NULL;
  END IF;

  -- Apply update. BEFORE UPDATE trigger increments row_version exactly once.
  UPDATE public.bn_mortality_integration_readiness
  SET certification_status    = p_certification_status,
      is_ready                = p_is_ready,
      certification_reference = v_new_reference,
      certified_at            = v_new_certified_at,
      notes                   = COALESCE(NULLIF(btrim(p_notes), ''), notes),
      updated_by              = p_actor_user_id,
      updated_at              = now()
  WHERE integration_code = p_integration_code
    AND row_version = p_expected_row_version;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','REJECTED','code','CONCURRENCY_CONFLICT');
  END IF;

  SELECT * INTO v_row
  FROM public.bn_mortality_integration_readiness
  WHERE integration_code = p_integration_code;

  -- Immutable history insert now includes integration_code (previously
  -- missing → NOT NULL exception rolled back the entire function). Any
  -- failure here rolls back the UPDATE above because both statements run
  -- in the single plpgsql transaction.
  INSERT INTO public.bn_mortality_integration_readiness_history (
    integration_readiness_id,
    integration_code,
    previous_certification_status, new_certification_status,
    previous_is_ready, new_is_ready,
    previous_row_version, new_row_version,
    certification_reference, justification,
    actor_user_id, correlation_id, occurred_at
  ) VALUES (
    v_row.id,
    p_integration_code,
    v_prev_status, v_row.certification_status,
    v_prev_ready,  v_row.is_ready,
    v_prev_ver,    v_row.row_version,
    v_row.certification_reference, p_justification,
    p_actor_user_id, p_correlation_id, now()
  )
  RETURNING id INTO v_history_id;

  RETURN jsonb_build_object(
    'status','OK',
    'code','APPLIED',
    'integrationCode', v_row.integration_code,
    'certificationStatus', v_row.certification_status,
    'isReady', v_row.is_ready,
    'rowVersion', v_row.row_version,
    'previousRowVersion', v_prev_ver,
    'historyId', v_history_id,
    'correlationId', p_correlation_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bn_mortality_set_integration_readiness(
  text, text, boolean, text, text, integer, uuid, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_mortality_set_integration_readiness(
  text, text, boolean, text, text, integer, uuid, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.bn_mortality_set_integration_readiness(
  text, text, boolean, text, text, integer, uuid, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bn_mortality_set_integration_readiness(
  text, text, boolean, text, text, integer, uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.bn_mortality_set_integration_readiness IS
  'BN-MORT-UI-RECOVERY-2C: writes readiness row and immutable history in one transaction. Enforces module/routes/admin-action/is_granted permission walk for the actor. Rollout-admin only — NOT subject to bn_mortality.actions_enabled and NOT a member of the 26-command business catalogue.';
