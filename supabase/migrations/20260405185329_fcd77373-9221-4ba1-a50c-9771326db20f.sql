CREATE OR REPLACE FUNCTION public.validate_meeting_working_day()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_non_working_days text;
  v_day_of_week int;
  v_days int[];
BEGIN
  -- Skip working-day validation when meeting is being started (InProgress)
  -- This allows users to explicitly start meetings on any day
  IF NEW.status = 'InProgress' THEN
    RETURN NEW;
  END IF;

  -- Get non-working days from system_settings
  SELECT setting_value INTO v_non_working_days
  FROM public.system_settings
  WHERE setting_key = 'non_working_days';

  IF v_non_working_days IS NULL OR v_non_working_days = '' THEN
    RETURN NEW;
  END IF;

  -- Get the day of week for the meeting date (0=Sunday in Postgres EXTRACT DOW)
  v_day_of_week := EXTRACT(DOW FROM NEW.meeting_date::date);

  -- Parse comma-separated string into int array
  v_days := string_to_array(v_non_working_days, ',')::int[];

  -- Check if meeting day is in non-working days
  IF v_day_of_week = ANY(v_days) THEN
    RAISE EXCEPTION 'Meeting cannot be scheduled on a non-working day (day % is configured as non-working)', v_day_of_week;
  END IF;

  RETURN NEW;
END;
$$;