
-- 1. Add override columns to ia_risk_register
ALTER TABLE public.ia_risk_register
  ADD COLUMN IF NOT EXISTS is_score_overridden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_justification TEXT,
  ADD COLUMN IF NOT EXISTS override_by TEXT,
  ADD COLUMN IF NOT EXISTS override_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS override_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS override_approved_at TIMESTAMPTZ;

-- 2. Update the recalculation function to skip overridden risks
CREATE OR REPLACE FUNCTION public.ia_recalculate_all_risks(p_reason TEXT DEFAULT 'config_changed', p_triggered_by TEXT DEFAULT 'SYSTEM')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_formula_type TEXT;
  v_count INTEGER := 0;
  v_risk RECORD;
  v_new_inherent_score NUMERIC;
  v_new_residual_score NUMERIC;
  v_new_inherent_level TEXT;
  v_new_residual_level TEXT;
  v_band RECORD;
BEGIN
  SELECT formula_type INTO v_formula_type
  FROM ia_risk_config_master
  WHERE is_active = true
  ORDER BY version DESC
  LIMIT 1;

  IF v_formula_type IS NULL THEN
    v_formula_type := 'likelihood_x_impact';
  END IF;

  FOR v_risk IN
    SELECT id, inherent_likelihood, inherent_impact, residual_likelihood, residual_impact,
           inherent_risk_score, inherent_risk_level, residual_risk_score, residual_risk_level,
           is_score_overridden
    FROM ia_risk_register
    WHERE is_active = true
  LOOP
    -- Skip manually overridden risks — log but do not change
    IF v_risk.is_score_overridden THEN
      INSERT INTO ia_risk_recalc_log (
        risk_id, trigger_reason,
        old_inherent_score, new_inherent_score, old_inherent_level, new_inherent_level,
        old_residual_score, new_residual_score, old_residual_level, new_residual_level,
        recalculated_by
      ) VALUES (
        v_risk.id, 'skipped_override: ' || p_reason,
        v_risk.inherent_risk_score, v_risk.inherent_risk_score, v_risk.inherent_risk_level, v_risk.inherent_risk_level,
        v_risk.residual_risk_score, v_risk.residual_risk_score, v_risk.residual_risk_level, v_risk.residual_risk_level,
        p_triggered_by
      );
      CONTINUE;
    END IF;

    CASE v_formula_type
      WHEN 'likelihood_x_impact' THEN
        v_new_inherent_score := COALESCE(v_risk.inherent_likelihood, 0) * COALESCE(v_risk.inherent_impact, 0);
        v_new_residual_score := COALESCE(v_risk.residual_likelihood, 0) * COALESCE(v_risk.residual_impact, 0);
      WHEN 'likelihood_plus_impact' THEN
        v_new_inherent_score := COALESCE(v_risk.inherent_likelihood, 0) + COALESCE(v_risk.inherent_impact, 0);
        v_new_residual_score := COALESCE(v_risk.residual_likelihood, 0) + COALESCE(v_risk.residual_impact, 0);
      WHEN 'weighted_average' THEN
        v_new_inherent_score := ROUND((COALESCE(v_risk.inherent_likelihood, 0) + COALESCE(v_risk.inherent_impact, 0)) / 2.0);
        v_new_residual_score := ROUND((COALESCE(v_risk.residual_likelihood, 0) + COALESCE(v_risk.residual_impact, 0)) / 2.0);
      ELSE
        v_new_inherent_score := COALESCE(v_risk.inherent_likelihood, 0) * COALESCE(v_risk.inherent_impact, 0);
        v_new_residual_score := COALESCE(v_risk.residual_likelihood, 0) * COALESCE(v_risk.residual_impact, 0);
    END CASE;

    v_new_inherent_level := 'Unknown';
    FOR v_band IN
      SELECT label, min_score, max_score FROM ia_risk_classification_thresholds WHERE is_active = true ORDER BY sort_order
    LOOP
      IF v_new_inherent_score >= v_band.min_score AND v_new_inherent_score <= v_band.max_score THEN
        v_new_inherent_level := v_band.label; EXIT;
      END IF;
    END LOOP;

    v_new_residual_level := 'Unknown';
    FOR v_band IN
      SELECT label, min_score, max_score FROM ia_risk_classification_thresholds WHERE is_active = true ORDER BY sort_order
    LOOP
      IF v_new_residual_score >= v_band.min_score AND v_new_residual_score <= v_band.max_score THEN
        v_new_residual_level := v_band.label; EXIT;
      END IF;
    END LOOP;

    IF v_new_inherent_score IS DISTINCT FROM v_risk.inherent_risk_score
       OR v_new_inherent_level IS DISTINCT FROM v_risk.inherent_risk_level
       OR v_new_residual_score IS DISTINCT FROM v_risk.residual_risk_score
       OR v_new_residual_level IS DISTINCT FROM v_risk.residual_risk_level
    THEN
      INSERT INTO ia_risk_recalc_log (
        risk_id, trigger_reason,
        old_inherent_score, new_inherent_score, old_inherent_level, new_inherent_level,
        old_residual_score, new_residual_score, old_residual_level, new_residual_level,
        recalculated_by
      ) VALUES (
        v_risk.id, p_reason,
        v_risk.inherent_risk_score, v_new_inherent_score, v_risk.inherent_risk_level, v_new_inherent_level,
        v_risk.residual_risk_score, v_new_residual_score, v_risk.residual_risk_level, v_new_residual_level,
        p_triggered_by
      );

      UPDATE ia_risk_register SET
        inherent_risk_score = v_new_inherent_score,
        inherent_risk_level = v_new_inherent_level,
        residual_risk_score = v_new_residual_score,
        residual_risk_level = v_new_residual_level,
        updated_at = now(),
        updated_by = p_triggered_by
      WHERE id = v_risk.id;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
