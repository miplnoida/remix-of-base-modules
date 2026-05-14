
-- 1. Safety net trigger: any newly inserted c3_config_periods row must be unpublished.
CREATE OR REPLACE FUNCTION public.c3_config_periods_force_unpublished_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_published_at := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_c3_config_periods_force_unpublished ON public.c3_config_periods;
CREATE TRIGGER trg_c3_config_periods_force_unpublished
BEFORE INSERT ON public.c3_config_periods
FOR EACH ROW
EXECUTE FUNCTION public.c3_config_periods_force_unpublished_on_insert();

-- 2. Deletability helper RPC (used by UI for tooltip / disable state)
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

  IF v_period.start_date <= v_current_month_start THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Period is current or past — already in use for C3 generation');
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

-- 3. Authoritative delete RPC
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

  IF v_period.start_date <= v_current_month_start THEN
    RETURN jsonb_build_object('error', 'Period is current or past and is already in use for C3 generation');
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
  SELECT * INTO v_details FROM c3_config_details WHERE config_period_id = p_period_id;
  v_old_values := jsonb_build_object(
    'period', row_to_json(v_period),
    'details', CASE WHEN v_details.config_period_id IS NOT NULL THEN row_to_json(v_details) ELSE NULL END
  );

  DELETE FROM c3_config_details WHERE config_period_id = p_period_id;
  DELETE FROM c3_config_periods WHERE id = p_period_id;

  -- Audit to c3_config_audit (the existing C3 config audit channel)
  INSERT INTO c3_config_audit (config_period_id, action, old_values, new_values, changed_by, reason)
  VALUES (p_period_id, 'DELETE', v_old_values, NULL, p_user_code, 'Period deleted before publish/use');

  RETURN jsonb_build_object('success', true);
END;
$$;
