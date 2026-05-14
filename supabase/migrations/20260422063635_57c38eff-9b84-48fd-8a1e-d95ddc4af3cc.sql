
CREATE OR REPLACE FUNCTION public.fn_ce_run_audit_priority_refresh(
  p_dry_run boolean DEFAULT false,
  p_zone_id uuid DEFAULT NULL,
  p_changed_only boolean DEFAULT false,
  p_batch_size integer DEFAULT 1000
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_processed int := 0;
  v_affected  int := 0;
  v_errors    int := 0;
  v_emp RECORD;
  v_policy_id uuid;
  v_started timestamptz := now();
BEGIN
  SELECT id INTO v_policy_id
    FROM public.ce_risk_policies
   WHERE status = 'ACTIVE'
   ORDER BY updated_at DESC NULLS LAST, created_at DESC
   LIMIT 1;

  FOR v_emp IN
    SELECT rp.employer_id
      FROM public.ce_risk_profiles rp
     WHERE (p_zone_id IS NULL OR rp.zone_id = p_zone_id)
       AND (p_changed_only = false
            OR rp.last_calculated_at IS NULL
            OR rp.last_audit_priority_calculated_at IS NULL
            OR rp.last_calculated_at > rp.last_audit_priority_calculated_at)
     LIMIT p_batch_size
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      IF NOT p_dry_run THEN
        PERFORM public.fn_ce_recalc_audit_priority_for_employer(v_emp.employer_id, v_policy_id);
        v_affected := v_affected + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true, 'dry_run', p_dry_run, 'policy_id', v_policy_id,
    'processed', v_processed, 'affected', v_affected, 'errors', v_errors,
    'started_at', v_started, 'completed_at', now()
  );
END;
$$;
