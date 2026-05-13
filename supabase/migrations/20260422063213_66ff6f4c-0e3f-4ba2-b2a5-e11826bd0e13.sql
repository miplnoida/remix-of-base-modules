
-- 1. Add timestamp + snapshot columns to ce_risk_profiles (additive, nullable)
ALTER TABLE public.ce_risk_profiles
  ADD COLUMN IF NOT EXISTS last_inherent_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_audit_priority_calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS audit_priority_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS audit_priority_band varchar(20),
  ADD COLUMN IF NOT EXISTS inherent_band varchar(20),
  ADD COLUMN IF NOT EXISTS last_recalc_policy_id uuid,
  ADD COLUMN IF NOT EXISTS audit_priority_reasons jsonb,
  ADD COLUMN IF NOT EXISTS audit_priority_why text;

-- Backfill timestamp from existing last_calculated_at so UI doesn't show empty
UPDATE public.ce_risk_profiles
   SET last_inherent_calculated_at = COALESCE(last_inherent_calculated_at, last_calculated_at)
 WHERE last_inherent_calculated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ce_risk_profiles_audit_priority
  ON public.ce_risk_profiles (audit_priority_score DESC NULLS LAST);

-- 2. Trigger: keep last_inherent_calculated_at in sync whenever the legacy total_score is updated
CREATE OR REPLACE FUNCTION public.fn_ce_touch_inherent_calc_ts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.total_score IS DISTINCT FROM OLD.total_score
     OR NEW.last_calculated_at IS DISTINCT FROM OLD.last_calculated_at THEN
    NEW.last_inherent_calculated_at := COALESCE(NEW.last_calculated_at, now());
    NEW.inherent_band := NEW.risk_band;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_risk_profiles_touch_inherent ON public.ce_risk_profiles;
CREATE TRIGGER trg_ce_risk_profiles_touch_inherent
BEFORE UPDATE ON public.ce_risk_profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_ce_touch_inherent_calc_ts();

-- 3. Per-employer audit priority recalc using the v3 engine (so weights/policy honored)
CREATE OR REPLACE FUNCTION public.fn_ce_recalc_audit_priority_for_employer(
  p_employer_id varchar,
  p_policy_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_band varchar(20);
BEGIN
  -- Pull the v3 row for this employer
  SELECT *
    INTO v_row
    FROM public.fn_ce_score_candidates_v3(NULL, NULL, 5000)
   WHERE employer_id = p_employer_id
   LIMIT 1;

  IF v_row IS NULL THEN
    -- No live signals — clear the audit-priority snapshot but keep timestamp
    UPDATE public.ce_risk_profiles
       SET audit_priority_score = 0,
           audit_priority_band  = 'Low',
           audit_priority_reasons = '[]'::jsonb,
           audit_priority_why = 'No active triggers',
           last_audit_priority_calculated_at = now(),
           last_recalc_policy_id = p_policy_id
     WHERE employer_id = p_employer_id;
    RETURN jsonb_build_object('employer_id', p_employer_id, 'audit_priority_score', 0);
  END IF;

  v_band := CASE
              WHEN v_row.audit_priority_score >= 75 THEN 'Critical'
              WHEN v_row.audit_priority_score >= 50 THEN 'High'
              WHEN v_row.audit_priority_score >= 25 THEN 'Medium'
              ELSE 'Low'
            END;

  UPDATE public.ce_risk_profiles
     SET audit_priority_score = v_row.audit_priority_score,
         audit_priority_band  = v_band,
         audit_priority_reasons = v_row.recommendation_reasons,
         audit_priority_why     = v_row.why_selected,
         last_audit_priority_calculated_at = now(),
         last_recalc_policy_id = p_policy_id
   WHERE employer_id = p_employer_id;

  RETURN jsonb_build_object(
    'employer_id', p_employer_id,
    'audit_priority_score', v_row.audit_priority_score,
    'audit_priority_band',  v_band
  );
END;
$$;

-- 4. Batch refresh
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
  SELECT id INTO v_policy_id FROM public.ce_risk_policies WHERE is_active = true ORDER BY created_at DESC LIMIT 1;

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
    'ok', true,
    'dry_run', p_dry_run,
    'policy_id', v_policy_id,
    'processed', v_processed,
    'affected',  v_affected,
    'errors',    v_errors,
    'started_at',  v_started,
    'completed_at', now()
  );
END;
$$;

-- 5. Seed automation jobs (one for each score type)
INSERT INTO public.ce_automation_jobs (job_code, name, description, job_type, schedule_cron, frequency, is_enabled, parameters)
VALUES
  ('JOB-INHERENT-RISK-RECALC',
   'Inherent Risk Score Recalculation',
   'Refreshes ce_risk_profiles long-term inherent scores using the active policy and factors.',
   'risk_recalculation',
   '0 5 * * *',
   'daily',
   false,
   jsonb_build_object('has_runtime', true, 'rpc_name', 'ce_run_employer_risk_refresh', 'score_type', 'INHERENT')),
  ('JOB-AUDIT-PRIORITY-RECALC',
   'Audit Priority Score Recalculation',
   'Refreshes short-term planning priority scores (audit_priority_score) for all employers, honoring active policy weights.',
   'risk_recalculation',
   '0 6 * * *',
   'daily',
   false,
   jsonb_build_object('has_runtime', true, 'rpc_name', 'fn_ce_run_audit_priority_refresh', 'score_type', 'AUDIT_PRIORITY'))
ON CONFLICT (job_code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    parameters = EXCLUDED.parameters,
    schedule_cron = EXCLUDED.schedule_cron,
    frequency = EXCLUDED.frequency;
