-- BN-MORT-UI-RECOVERY-2A: additive corrective migration for
-- bn_mortality_integration_readiness. No RLS anywhere; service_role only.

-- ============================================================
-- B. NO-RLS CORRECTIVE LOCKDOWN
-- ============================================================
DROP POLICY IF EXISTS "authenticated_readonly"
  ON public.bn_mortality_integration_readiness;

ALTER TABLE public.bn_mortality_integration_readiness
  DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bn_mortality_integration_readiness FROM anon;
REVOKE ALL ON public.bn_mortality_integration_readiness FROM authenticated;
REVOKE ALL ON public.bn_mortality_integration_readiness FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.bn_mortality_integration_readiness TO service_role;

-- ============================================================
-- C. DATA CONSTRAINTS
-- ============================================================
ALTER TABLE public.bn_mortality_integration_readiness
  DROP CONSTRAINT IF EXISTS bn_mortality_integration_readiness_code_chk;
ALTER TABLE public.bn_mortality_integration_readiness
  ADD CONSTRAINT bn_mortality_integration_readiness_code_chk
  CHECK (integration_code IN ('awards','dms','overpayments','survivor','funeral','legal'));

ALTER TABLE public.bn_mortality_integration_readiness
  DROP CONSTRAINT IF EXISTS bn_mortality_integration_readiness_owning_module_chk;
ALTER TABLE public.bn_mortality_integration_readiness
  ADD CONSTRAINT bn_mortality_integration_readiness_owning_module_chk
  CHECK (length(btrim(owning_module)) > 0);

ALTER TABLE public.bn_mortality_integration_readiness
  DROP CONSTRAINT IF EXISTS bn_mortality_integration_readiness_ready_consistency_chk;
ALTER TABLE public.bn_mortality_integration_readiness
  ADD CONSTRAINT bn_mortality_integration_readiness_ready_consistency_chk
  CHECK (
    (is_ready = false)
    OR (
      is_ready = true
      AND certification_status = 'CERTIFIED'
      AND certified_at IS NOT NULL
      AND certification_reference IS NOT NULL
      AND length(btrim(certification_reference)) > 0
    )
  );

-- ============================================================
-- E. IMMUTABLE READINESS AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_mortality_integration_readiness_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_readiness_id UUID NOT NULL
    REFERENCES public.bn_mortality_integration_readiness(id) ON DELETE RESTRICT,
  integration_code TEXT NOT NULL,
  previous_certification_status TEXT,
  new_certification_status TEXT NOT NULL,
  previous_is_ready BOOLEAN,
  new_is_ready BOOLEAN NOT NULL,
  previous_row_version INTEGER,
  new_row_version INTEGER NOT NULL,
  certification_reference TEXT,
  justification TEXT NOT NULL,
  actor_user_id UUID,
  correlation_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bn_mortality_integration_readiness_history
  DISABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.bn_mortality_integration_readiness_history FROM anon;
REVOKE ALL ON public.bn_mortality_integration_readiness_history FROM authenticated;
REVOKE ALL ON public.bn_mortality_integration_readiness_history FROM PUBLIC;
GRANT SELECT, INSERT ON public.bn_mortality_integration_readiness_history TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_mort_readiness_hist_readiness_id
  ON public.bn_mortality_integration_readiness_history(integration_readiness_id, occurred_at DESC);

-- ============================================================
-- D. CONTROLLED PROMOTION RPC (service_role only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bn_mortality_set_integration_readiness(
  p_integration_code TEXT,
  p_certification_status TEXT,
  p_is_ready BOOLEAN,
  p_certification_reference TEXT,
  p_notes TEXT,
  p_expected_row_version INTEGER,
  p_actor_user_id UUID,
  p_justification TEXT,
  p_correlation_id TEXT
)
RETURNS TABLE (
  status TEXT,
  code TEXT,
  message TEXT,
  new_row_version INTEGER,
  history_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bn_mortality_integration_readiness%ROWTYPE;
  v_prev_status TEXT;
  v_prev_ready BOOLEAN;
  v_prev_ver INTEGER;
  v_new_ver INTEGER;
  v_certified_at TIMESTAMPTZ;
  v_history_id UUID;
BEGIN
  -- Input validation
  IF p_integration_code IS NULL
     OR p_integration_code NOT IN ('awards','dms','overpayments','survivor','funeral','legal') THEN
    RETURN QUERY SELECT 'REJECTED','INVALID_INTEGRATION_CODE',
      'Unknown integration_code.', NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;

  IF p_certification_status IS NULL
     OR p_certification_status NOT IN ('NOT_CERTIFIED','IN_PROGRESS','CERTIFIED','REVOKED') THEN
    RETURN QUERY SELECT 'REJECTED','INVALID_STATUS',
      'Unknown certification_status.', NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;

  IF p_justification IS NULL OR length(btrim(p_justification)) = 0 THEN
    RETURN QUERY SELECT 'REJECTED','MISSING_JUSTIFICATION',
      'A non-empty justification is required.', NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;

  IF p_actor_user_id IS NULL THEN
    RETURN QUERY SELECT 'REJECTED','MISSING_ACTOR',
      'actor_user_id is required.', NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;

  IF p_is_ready = true THEN
    IF p_certification_status <> 'CERTIFIED' THEN
      RETURN QUERY SELECT 'REJECTED','READY_REQUIRES_CERTIFIED',
        'is_ready=true requires certification_status=CERTIFIED.', NULL::INTEGER, NULL::UUID;
      RETURN;
    END IF;
    IF p_certification_reference IS NULL OR length(btrim(p_certification_reference)) = 0 THEN
      RETURN QUERY SELECT 'REJECTED','MISSING_CERTIFICATION_REFERENCE',
        'certification_reference is required when is_ready=true.', NULL::INTEGER, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  IF p_expected_row_version IS NULL OR p_expected_row_version < 1 THEN
    RETURN QUERY SELECT 'REJECTED','INVALID_ROW_VERSION',
      'expected_row_version is required.', NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;

  -- Lock the row
  SELECT * INTO v_row
  FROM public.bn_mortality_integration_readiness
  WHERE integration_code = p_integration_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'REJECTED','NOT_FOUND',
      'Readiness row not found.', NULL::INTEGER, NULL::UUID;
    RETURN;
  END IF;

  IF v_row.row_version <> p_expected_row_version THEN
    RETURN QUERY SELECT 'REJECTED','CONCURRENCY_CONFLICT',
      format('Row version mismatch (expected %s, got %s).',
             p_expected_row_version, v_row.row_version),
      v_row.row_version, NULL::UUID;
    RETURN;
  END IF;

  v_prev_status := v_row.certification_status;
  v_prev_ready := v_row.is_ready;
  v_prev_ver := v_row.row_version;
  v_new_ver := v_prev_ver + 1;

  IF p_certification_status = 'CERTIFIED' THEN
    v_certified_at := COALESCE(v_row.certified_at, now());
  ELSE
    v_certified_at := v_row.certified_at;
  END IF;

  -- Suppress the BEFORE UPDATE trigger's own row_version increment by
  -- writing the expected new value directly; the trigger adds +1 to OLD,
  -- so we set row_version explicitly and let the trigger no-op-adjust it.
  UPDATE public.bn_mortality_integration_readiness
  SET certification_status = p_certification_status,
      is_ready = p_is_ready,
      certified_at = v_certified_at,
      certification_reference = COALESCE(p_certification_reference, certification_reference),
      notes = COALESCE(p_notes, notes),
      updated_by = p_actor_user_id,
      updated_at = now(),
      row_version = v_new_ver - 1  -- trigger will +1
  WHERE id = v_row.id;

  -- Read back the actual new row_version (defensive against trigger drift)
  SELECT row_version INTO v_new_ver
  FROM public.bn_mortality_integration_readiness
  WHERE id = v_row.id;

  INSERT INTO public.bn_mortality_integration_readiness_history (
    integration_readiness_id, integration_code,
    previous_certification_status, new_certification_status,
    previous_is_ready, new_is_ready,
    previous_row_version, new_row_version,
    certification_reference, justification,
    actor_user_id, correlation_id
  ) VALUES (
    v_row.id, p_integration_code,
    v_prev_status, p_certification_status,
    v_prev_ready, p_is_ready,
    v_prev_ver, v_new_ver,
    p_certification_reference, p_justification,
    p_actor_user_id, p_correlation_id
  )
  RETURNING id INTO v_history_id;

  RETURN QUERY SELECT 'OK','APPLIED','Readiness updated.', v_new_ver, v_history_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bn_mortality_set_integration_readiness(
  TEXT, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_mortality_set_integration_readiness(
  TEXT, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT
) FROM anon;
REVOKE ALL ON FUNCTION public.bn_mortality_set_integration_readiness(
  TEXT, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bn_mortality_set_integration_readiness(
  TEXT, TEXT, BOOLEAN, TEXT, TEXT, INTEGER, UUID, TEXT, TEXT
) TO service_role;