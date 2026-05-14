
DROP FUNCTION IF EXISTS public.check_meeting_overlap(UUID, DATE, TIME, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.check_meeting_overlap(
  p_assigned_user_id UUID,
  p_meeting_date DATE,
  p_meeting_start_time TIME,
  p_buffer_minutes INTEGER,
  p_exclude_meeting_id UUID DEFAULT NULL
)
RETURNS TABLE(
  has_overlap BOOLEAN,
  conflicting_meeting_id UUID,
  conflicting_start_time TIME,
  conflicting_end_time TIME,
  conflicting_reference VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS has_overlap,
    m.id AS conflicting_meeting_id,
    m.meeting_time AS conflicting_start_time,
    COALESCE(m.meeting_end_time, m.meeting_time + (p_buffer_minutes || ' minutes')::INTERVAL) AS conflicting_end_time,
    m.meeting_reference AS conflicting_reference
  FROM public.meetings m
  WHERE m.assigned_user_id = p_assigned_user_id
    AND m.meeting_date = p_meeting_date
    AND m.status IN ('Scheduled', 'Rescheduled', 'InProgress')
    AND (p_exclude_meeting_id IS NULL OR m.id != p_exclude_meeting_id)
    AND (
      -- True overlap: new slot [T, T+buffer) intersects existing slot [E, E_end)
      p_meeting_start_time < COALESCE(m.meeting_end_time, m.meeting_time + (p_buffer_minutes || ' minutes')::INTERVAL)
      AND (p_meeting_start_time + (p_buffer_minutes || ' minutes')::INTERVAL) > m.meeting_time
    )
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TIME, NULL::TIME, NULL::VARCHAR;
  END IF;
END;
$$;
