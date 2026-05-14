-- Relax C3 config period deletability: current month is now deletable
-- (C3 for a period is filed in the FOLLOWING month, so the current month
-- has not yet been used in C3 generation). Only strictly past periods stay frozen.

DROP FUNCTION IF EXISTS public.c3_config_period_deletability(uuid);
CREATE OR REPLACE FUNCTION public.c3_config_period_deletability(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period RECORD;
  v_current_month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_submission_count INT;
  v_active_count INT;
BEGIN
  SELECT * INTO v_period FROM c3_config_periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Period not found');
  END IF;

  IF v_period.last_published_at IS NOT NULL THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Already published — cannot be deleted');
  END IF;

  IF v_period.start_date < v_current_month_start THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Period is in the past — already used in C3 generation and frozen');
  END IF;

  SELECT count(*) INTO v_submission_count
    FROM c3_submissions
   WHERE filing_period IS NOT NULL
     AND to_date(filing_period || '-01', 'YYYY-MM-DD') BETWEEN v_period.start_date
         AND COALESCE(v_period.end_date, DATE '9999-12-31');
  IF v_submission_count > 0 THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Period has C3 submissions and cannot be deleted');
  END IF;

  SELECT count(*) INTO v_active_count FROM c3_config_periods WHERE is_active = true;
  IF v_period.is_active AND v_active_count <= 1 THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'At least one active period must remain');
  END IF;

  RETURN jsonb_build_object('can_delete', true, 'reason', null);
END;
$$;

DROP FUNCTION IF EXISTS public.delete_c3_config_period(uuid, character varying);
CREATE OR REPLACE FUNCTION public.delete_c3_config_period(
  p_period_id uuid,
  p_user_code character varying DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period RECORD;
  v_details RECORD;
  v_current_month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_submission_count INT;
  v_active_count INT;
  v_old_values JSONB;
BEGIN
  SELECT * INTO v_period FROM c3_config_periods WHERE id = p_period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Period not found');
  END IF;

  IF v_period.last_published_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Period has already been published to C3-Wizard and cannot be deleted');
  END IF;

  IF v_period.start_date < v_current_month_start THEN
    RETURN jsonb_build_object('error', 'Period is in the past and is already used in C3 generation');
  END IF;

  SELECT count(*) INTO v_submission_count
    FROM c3_submissions
   WHERE filing_period IS NOT NULL
     AND to_date(filing_period || '-01', 'YYYY-MM-DD') BETWEEN v_period.start_date
         AND COALESCE(v_period.end_date, DATE '9999-12-31');
  IF v_submission_count > 0 THEN
    RETURN jsonb_build_object('error', 'Period has C3 submissions and cannot be deleted');
  END IF;

  SELECT count(*) INTO v_active_count FROM c3_config_periods WHERE is_active = true;
  IF v_period.is_active AND v_active_count <= 1 THEN
    RETURN jsonb_build_object('error', 'At least one active configuration period must remain');
  END IF;

  -- Snapshot for audit
  SELECT jsonb_build_object(
    'period', to_jsonb(v_period),
    'details', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM c3_config_details d WHERE d.period_id = p_period_id), '[]'::jsonb)
  ) INTO v_old_values;

  INSERT INTO c3_config_audit (period_id, action, changed_by, old_values, new_values)
  VALUES (p_period_id, 'DELETE', p_user_code, v_old_values, NULL);

  DELETE FROM c3_config_details WHERE period_id = p_period_id;
  DELETE FROM c3_config_periods WHERE id = p_period_id;

  RETURN jsonb_build_object('success', true);
END;
$$;