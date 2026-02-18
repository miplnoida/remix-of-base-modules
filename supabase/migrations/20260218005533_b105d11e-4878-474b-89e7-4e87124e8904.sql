-- Fix: Remove 'Rescheduled' meetings from the slot availability query.
-- Rescheduled meetings are no longer active; they have been replaced by a new meeting.
-- Including them caused released time slots to still appear as blocked.
CREATE OR REPLACE FUNCTION public.get_user_meetings_for_date(p_user_id uuid, p_date date)
RETURNS TABLE(
  id uuid,
  meeting_reference character varying,
  application_reference character varying,
  meeting_time time without time zone,
  meeting_end_time time without time zone,
  status character varying,
  meeting_type character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    -- Only show ACTIVE meetings: Scheduled and InProgress.
    -- Rescheduled meetings are closed/superseded — their slot is free unless a
    -- phantom meeting_slot_reservation was created (releasePreviousSlot=false).
    AND m.status IN ('Scheduled', 'InProgress')
    AND (
      m.assigned_user_id = p_user_id
      OR (m.assigned_user_id IS NULL AND v_user_code IS NOT NULL AND m.contact_person = v_user_code)
    )
  ORDER BY m.meeting_time;
END;
$function$;