
-- Redefine: week number = sequential Monday count in the year (1st Monday = week 1, 2nd = week 2, etc.)
-- Valid bi-weekly weeks = even-numbered Mondays (2nd, 4th, 6th, ...)

CREATE OR REPLACE FUNCTION public.get_biweekly_valid_weeks(p_year integer)
RETURNS TABLE(week_number integer, week_start date, week_end date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
  v_monday_seq integer := 0;
BEGIN
  -- Find the first Monday of the year
  v_day := make_date(p_year, 1, 1);
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;

  -- Iterate all Mondays in the year
  WHILE EXTRACT(year FROM v_day) = p_year LOOP
    v_monday_seq := v_monday_seq + 1;
    -- Only return even-numbered Mondays
    IF v_monday_seq % 2 = 0 THEN
      week_number := v_monday_seq;
      week_start := v_day;
      week_end := (v_day + '6 days'::interval)::date;
      RETURN NEXT;
    END IF;
    v_day := v_day + 7;
  END LOOP;
END;
$$;

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
  v_first_monday_of_year date;
  v_first_monday_of_month date;
  v_target_monday date;
  v_day date;
  v_monday_seq integer;
BEGIN
  -- Find first Monday of the year
  v_day := make_date(p_year, 1, 1);
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;
  v_first_monday_of_year := v_day;

  -- Find first Monday of the target month
  v_day := make_date(p_year, p_month, 1);
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;
  v_first_monday_of_month := v_day;

  -- Target Monday = first Monday of month + (week_index * 7)
  v_target_monday := v_first_monday_of_month + (p_week_index * 7);

  -- Verify still in same month
  IF EXTRACT(month FROM v_target_monday) != p_month THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Week index %s does not exist in %s/%s', p_week_index, p_year, p_month),
      'monday_number', null
    );
  END IF;

  -- Calculate sequential Monday number in the year
  v_monday_seq := ((v_target_monday - v_first_monday_of_year) / 7) + 1;

  RETURN jsonb_build_object(
    'valid', (v_monday_seq % 2 = 0),
    'monday_number', v_monday_seq,
    'monday_date', v_target_monday::text,
    'error', CASE WHEN v_monday_seq % 2 != 0
      THEN format('Monday #%s in %s is not a valid bi-weekly payment week. Only even-numbered Mondays (2nd, 4th, 6th, ...) are allowed.', v_monday_seq, p_year)
      ELSE null
    END
  );
END;
$$;

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
  v_first_monday_of_year date;
  v_first_monday_of_month date;
  v_day date;
  v_monday date;
  v_idx integer := 0;
  v_monday_seq integer;
BEGIN
  -- Find first Monday of the year
  v_day := make_date(p_year, 1, 1);
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;
  v_first_monday_of_year := v_day;

  -- Find first Monday of the month
  v_day := make_date(p_year, p_month, 1);
  WHILE EXTRACT(isodow FROM v_day) != 1 LOOP
    v_day := v_day + 1;
  END LOOP;

  -- Iterate Mondays in this month
  v_monday := v_day;
  WHILE EXTRACT(month FROM v_monday) = p_month AND v_idx < 5 LOOP
    v_monday_seq := ((v_monday - v_first_monday_of_year) / 7) + 1;
    v_result[v_idx + 1] := (v_monday_seq % 2 = 0);
    v_idx := v_idx + 1;
    v_monday := v_monday + 7;
  END LOOP;

  RETURN v_result;
END;
$$;
