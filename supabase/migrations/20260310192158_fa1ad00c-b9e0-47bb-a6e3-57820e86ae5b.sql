
-- Function 1: Get valid bi-weekly payment weeks for a given year
-- Returns all even ISO week numbers (2,4,6,...,52) for the given year
CREATE OR REPLACE FUNCTION public.get_biweekly_valid_weeks(p_year integer)
RETURNS TABLE(week_number integer, week_start date, week_end date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_weeks integer;
  v_wk integer;
  v_jan4 date;
  v_start_of_w1 date;
BEGIN
  -- Calculate total ISO weeks in the year
  -- ISO 8601: the last week of year is the week containing Dec 28
  v_total_weeks := EXTRACT(isoyear FROM make_date(p_year, 12, 28))::integer;
  -- If Dec 28 doesn't belong to this year's ISO year, use Dec 21
  IF v_total_weeks != p_year THEN
    v_total_weeks := 52;
  ELSE
    v_total_weeks := EXTRACT(week FROM make_date(p_year, 12, 28))::integer;
  END IF;

  -- Calculate start of ISO week 1 (Monday of the week containing Jan 4)
  v_jan4 := make_date(p_year, 1, 4);
  v_start_of_w1 := v_jan4 - ((EXTRACT(isodow FROM v_jan4)::integer - 1) || ' days')::interval;

  -- Return only even week numbers up to 52 (even for 53-week years, max valid even is 52)
  FOR v_wk IN 2..LEAST(v_total_weeks, 52) BY 2 LOOP
    week_number := v_wk;
    week_start := (v_start_of_w1 + ((v_wk - 1) * 7 || ' days')::interval)::date;
    week_end := (week_start + '6 days'::interval)::date;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Function 2: Validate that a given date/week is a valid bi-weekly payment week
CREATE OR REPLACE FUNCTION public.validate_biweekly_week(
  p_year integer,
  p_month integer,  -- 1-indexed
  p_week_index integer  -- 0-indexed Monday index within the month (0-4)
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monday date;
  v_iso_week integer;
  v_is_valid boolean;
  v_month_start date;
  v_day date;
BEGIN
  -- Find the (p_week_index+1)th Monday of the given month
  v_month_start := make_date(p_year, p_month, 1);
  
  -- Find first Monday
  v_day := v_month_start;
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;
  
  -- Advance to the target Monday index
  v_monday := v_day + (p_week_index * 7);
  
  -- Verify it's still in the same month
  IF EXTRACT(month FROM v_monday) != p_month THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Week index %s does not exist in %s/%s', p_week_index, p_year, p_month),
      'iso_week', null
    );
  END IF;
  
  -- Get ISO week number
  v_iso_week := EXTRACT(week FROM v_monday)::integer;
  
  -- Check if it's an even week (and <= 52)
  v_is_valid := (v_iso_week % 2 = 0) AND (v_iso_week <= 52);
  
  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'iso_week', v_iso_week,
    'monday_date', v_monday::text,
    'error', CASE WHEN NOT v_is_valid 
      THEN format('ISO week %s is not a valid bi-weekly payment week. Only even-numbered weeks (2,4,6,...,52) are allowed.', v_iso_week)
      ELSE null 
    END
  );
END;
$$;

-- Function 3: Get enabled bi-weekly week textboxes for a given month
-- Returns which of the 5 possible Monday slots in a month are valid bi-weekly weeks
CREATE OR REPLACE FUNCTION public.get_biweekly_enabled_weeks(
  p_year integer,
  p_month integer  -- 1-indexed
)
RETURNS boolean[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean[] := ARRAY[false, false, false, false, false];
  v_month_start date;
  v_day date;
  v_monday date;
  v_idx integer := 0;
  v_iso_week integer;
BEGIN
  v_month_start := make_date(p_year, p_month, 1);
  
  -- Find first Monday
  v_day := v_month_start;
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;
  
  -- Iterate through all Mondays in the month
  v_monday := v_day;
  WHILE EXTRACT(month FROM v_monday) = p_month AND v_idx < 5 LOOP
    v_iso_week := EXTRACT(week FROM v_monday)::integer;
    v_result[v_idx + 1] := (v_iso_week % 2 = 0) AND (v_iso_week <= 52);  -- PostgreSQL arrays are 1-indexed
    v_idx := v_idx + 1;
    v_monday := v_monday + 7;
  END LOOP;
  
  RETURN v_result;
END;
$$;
