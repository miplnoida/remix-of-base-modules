
DROP FUNCTION IF EXISTS public.get_user_meetings_for_date(UUID, DATE);

CREATE FUNCTION public.get_user_meetings_for_date(p_user_id UUID, p_date DATE)
RETURNS TABLE(
  id UUID,
  meeting_reference VARCHAR,
  application_reference VARCHAR,
  meeting_time TIME,
  meeting_end_time TIME,
  status VARCHAR,
  meeting_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_code TEXT;
BEGIN
  -- Get the user_code for backward compatibility with older meetings
  SELECT p.user_code INTO v_user_code
  FROM public.profiles p
  WHERE p.id = p_user_id;

  RETURN QUERY
  SELECT 
    m.id,
    m.meeting_reference,
    m.application_reference,
    m.meeting_time,
    m.meeting_end_time,
    m.status::VARCHAR,
    m.meeting_type::VARCHAR
  FROM public.meetings m
  WHERE m.meeting_date = p_date
    AND m.status IN ('Scheduled', 'Rescheduled', 'InProgress')
    AND (
      m.assigned_user_id = p_user_id
      OR (m.assigned_user_id IS NULL AND v_user_code IS NOT NULL AND m.contact_person = v_user_code)
    )
  ORDER BY m.meeting_time;
END;
$$;
