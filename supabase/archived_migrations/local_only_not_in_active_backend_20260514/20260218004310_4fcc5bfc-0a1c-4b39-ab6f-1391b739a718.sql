-- Fix: Remove 'Paused' from check_meeting_overlap — meeting_status enum does not include 'Paused'
CREATE OR REPLACE FUNCTION public.check_meeting_overlap(
  p_assigned_user_id uuid,
  p_meeting_date date,
  p_meeting_start_time time without time zone,
  p_buffer_minutes integer DEFAULT 20,
  p_exclude_meeting_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(has_overlap boolean, conflicting_meeting_id uuid, conflicting_reference text, conflicting_start_time time without time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slot_end_time TIME;
  v_meeting_row   RECORD;
  v_reserve_row   RECORD;
BEGIN
  v_slot_end_time := p_meeting_start_time + (p_buffer_minutes || ' minutes')::INTERVAL;

  -- 1. Check active scheduled meetings
  --    'Paused' was removed — it is NOT a valid meeting_status enum value.
  --    Valid statuses: Scheduled, Rescheduled, InProgress, Closed, Cancelled, Rejected
  SELECT m.id, m.meeting_reference, m.meeting_time
  INTO v_meeting_row
  FROM public.meetings m
  WHERE
    m.assigned_user_id = p_assigned_user_id
    AND m.meeting_date  = p_meeting_date
    AND m.status IN ('Scheduled', 'InProgress')
    AND (p_exclude_meeting_id IS NULL OR m.id <> p_exclude_meeting_id)
    AND p_meeting_start_time < (m.meeting_time + (p_buffer_minutes || ' minutes')::INTERVAL)
    AND v_slot_end_time > m.meeting_time
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, v_meeting_row.id, v_meeting_row.meeting_reference, v_meeting_row.meeting_time;
    RETURN;
  END IF;

  -- 2. Check phantom slot reservations (releasePreviousSlot=false)
  SELECT r.id, r.meeting_time
  INTO v_reserve_row
  FROM public.meeting_slot_reservations r
  WHERE
    r.assigned_user_id = p_assigned_user_id
    AND r.meeting_date  = p_meeting_date
    AND r.is_active     = TRUE
    AND p_meeting_start_time < (r.meeting_time + (p_buffer_minutes || ' minutes')::INTERVAL)
    AND v_slot_end_time > r.meeting_time
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, NULL::UUID, 'Reserved Slot'::TEXT, v_reserve_row.meeting_time;
    RETURN;
  END IF;

  -- 3. No conflict
  RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIME;
END;
$function$;