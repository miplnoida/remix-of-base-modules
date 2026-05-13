
-- 1. Create the filing config periods table
CREATE TABLE public.c3_filing_config_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date_from DATE NOT NULL,
  date_to DATE,
  week_start_day INTEGER NOT NULL DEFAULT 1,
  filing_window_unit INTEGER NOT NULL DEFAULT 1,
  filing_window_value INTEGER NOT NULL DEFAULT 1,
  penalty_initial_threshold INTEGER NOT NULL DEFAULT 1,
  penalty_subsequent_threshold INTEGER NOT NULL DEFAULT 12,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index for date range lookups
CREATE INDEX idx_filing_config_periods_dates ON public.c3_filing_config_periods (date_from, date_to) WHERE is_active = true;

-- 3. Validation trigger: overlap checks, date validation
CREATE OR REPLACE FUNCTION public.validate_filing_config_period()
RETURNS TRIGGER AS $$
BEGIN
  -- date_from is required (enforced by NOT NULL but be explicit)
  IF NEW.date_from IS NULL THEN
    RAISE EXCEPTION 'date_from is required';
  END IF;

  -- date_to must be >= date_from if provided
  IF NEW.date_to IS NOT NULL AND NEW.date_to < NEW.date_from THEN
    RAISE EXCEPTION 'date_to (%) cannot be earlier than date_from (%)', NEW.date_to, NEW.date_from;
  END IF;

  -- Only one open-ended (NULL date_to) active record allowed
  IF NEW.date_to IS NULL AND NEW.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM public.c3_filing_config_periods
      WHERE date_to IS NULL
        AND is_active = true
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'Only one open-ended (no end date) active period is allowed. Please close the existing open-ended period first.';
    END IF;
  END IF;

  -- No overlapping date ranges for active records
  IF NEW.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM public.c3_filing_config_periods
      WHERE is_active = true
        AND id IS DISTINCT FROM NEW.id
        AND NEW.date_from <= COALESCE(date_to, '9999-12-31'::DATE)
        AND COALESCE(NEW.date_to, '9999-12-31'::DATE) >= date_from
    ) THEN
      RAISE EXCEPTION 'This date range overlaps with an existing active period. Overlapping date ranges are not allowed.';
    END IF;
  END IF;

  -- Set updated_at on update
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_filing_config_period
  BEFORE INSERT OR UPDATE ON public.c3_filing_config_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_filing_config_period();

-- 4. RPC: get_filing_config_for_date
CREATE OR REPLACE FUNCTION public.get_filing_config_for_date(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Find the active period that contains the given date
  SELECT jsonb_build_object(
    'id', id,
    'date_from', date_from,
    'date_to', date_to,
    'week_start_day', week_start_day,
    'filing_window_unit', filing_window_unit,
    'filing_window_value', filing_window_value,
    'penalty_initial_threshold', penalty_initial_threshold,
    'penalty_subsequent_threshold', penalty_subsequent_threshold,
    'is_active', is_active
  ) INTO v_result
  FROM public.c3_filing_config_periods
  WHERE is_active = true
    AND date_from <= p_date
    AND (date_to >= p_date OR date_to IS NULL)
  ORDER BY date_from DESC
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'No active filing configuration found for date ' || p_date::TEXT);
  END IF;

  RETURN v_result;
END;
$$;

-- 5. RPC: upsert_filing_config_period
CREATE OR REPLACE FUNCTION public.upsert_filing_config_period(
  p_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_week_start_day INTEGER DEFAULT 1,
  p_filing_window_unit INTEGER DEFAULT 1,
  p_filing_window_value INTEGER DEFAULT 1,
  p_penalty_initial_threshold INTEGER DEFAULT 1,
  p_penalty_subsequent_threshold INTEGER DEFAULT 12,
  p_is_active BOOLEAN DEFAULT true,
  p_user_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result RECORD;
  v_id UUID;
BEGIN
  IF p_date_from IS NULL THEN
    RETURN jsonb_build_object('error', 'date_from is required');
  END IF;

  IF p_date_to IS NOT NULL AND p_date_to < p_date_from THEN
    RETURN jsonb_build_object('error', 'date_to cannot be earlier than date_from');
  END IF;

  IF p_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.c3_filing_config_periods
    SET date_from = p_date_from,
        date_to = p_date_to,
        week_start_day = p_week_start_day,
        filing_window_unit = p_filing_window_unit,
        filing_window_value = p_filing_window_value,
        penalty_initial_threshold = p_penalty_initial_threshold,
        penalty_subsequent_threshold = p_penalty_subsequent_threshold,
        is_active = p_is_active,
        updated_by = p_user_code,
        updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Period not found with id ' || p_id::TEXT);
    END IF;

    v_id := p_id;
  ELSE
    -- Insert new
    INSERT INTO public.c3_filing_config_periods (
      date_from, date_to, week_start_day, filing_window_unit,
      filing_window_value, penalty_initial_threshold, penalty_subsequent_threshold,
      is_active, created_by, updated_by
    ) VALUES (
      p_date_from, p_date_to, p_week_start_day, p_filing_window_unit,
      p_filing_window_value, p_penalty_initial_threshold, p_penalty_subsequent_threshold,
      p_is_active, p_user_code, p_user_code
    )
    RETURNING * INTO v_result;

    v_id := v_result.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_id,
    'date_from', v_result.date_from,
    'date_to', v_result.date_to
  );

EXCEPTION WHEN raise_exception THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- 6. Migrate existing filing data from c3_calculation_config
INSERT INTO public.c3_filing_config_periods (
  date_from, date_to,
  week_start_day, filing_window_unit, filing_window_value,
  penalty_initial_threshold, penalty_subsequent_threshold,
  is_active, created_by
)
SELECT
  COALESCE(MIN(effective_from), CURRENT_DATE) AS date_from,
  NULL AS date_to,
  COALESCE(MAX(CASE WHEN config_key = 'week_start_day' THEN config_value::INTEGER END), 1),
  COALESCE(MAX(CASE WHEN config_key = 'filing_window_unit' THEN config_value::INTEGER END), 1),
  COALESCE(MAX(CASE WHEN config_key = 'filing_window_value' THEN config_value::INTEGER END), 1),
  COALESCE(MAX(CASE WHEN config_key = 'penalty_initial_threshold' THEN config_value::INTEGER END), 1),
  COALESCE(MAX(CASE WHEN config_key = 'penalty_subsequent_threshold' THEN config_value::INTEGER END), 12),
  true,
  'SYSTEM'
FROM public.c3_calculation_config
WHERE category = 'filing' AND is_active = true;
