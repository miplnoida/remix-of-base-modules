-- Create a function to validate meeting date is not on a non-working day
CREATE OR REPLACE FUNCTION public.validate_meeting_working_day()
RETURNS TRIGGER AS $$
DECLARE
  v_non_working_days text;
  v_day_of_week int;
  v_days int[];
  v_day int;
BEGIN
  -- Get non-working days from system_settings
  SELECT setting_value INTO v_non_working_days
  FROM public.system_settings
  WHERE setting_key = 'non_working_days';

  IF v_non_working_days IS NULL OR v_non_working_days = '' THEN
    RETURN NEW;
  END IF;

  -- Get the day of week for the meeting date (0=Sunday in JS, but Postgres EXTRACT DOW: 0=Sunday)
  v_day_of_week := EXTRACT(DOW FROM NEW.meeting_date::date);

  -- Parse comma-separated string into int array
  v_days := string_to_array(v_non_working_days, ',')::int[];

  -- Check if meeting day is in non-working days
  IF v_day_of_week = ANY(v_days) THEN
    RAISE EXCEPTION 'Meeting cannot be scheduled on a non-working day (day % is configured as non-working)', v_day_of_week;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS trg_validate_meeting_working_day_insert ON public.meetings;
CREATE TRIGGER trg_validate_meeting_working_day_insert
  BEFORE INSERT ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_meeting_working_day();

-- Create trigger for UPDATE
DROP TRIGGER IF EXISTS trg_validate_meeting_working_day_update ON public.meetings;
CREATE TRIGGER trg_validate_meeting_working_day_update
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  WHEN (OLD.meeting_date IS DISTINCT FROM NEW.meeting_date)
  EXECUTE FUNCTION public.validate_meeting_working_day();
