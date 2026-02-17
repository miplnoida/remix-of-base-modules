-- =====================================================================
-- meeting_slot_reservations table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.meeting_slot_reservations (
  id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_user_id  UUID         NOT NULL,
  contact_person    TEXT,
  meeting_date      DATE         NOT NULL,
  meeting_time      TIME         NOT NULL,
  source_meeting_id UUID         REFERENCES public.meetings(id) ON DELETE CASCADE,
  reserved_by       UUID,
  reason            TEXT,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (assigned_user_id, meeting_date, meeting_time)
);

CREATE INDEX IF NOT EXISTS idx_msr_user_date ON public.meeting_slot_reservations (assigned_user_id, meeting_date, is_active);

ALTER TABLE public.meeting_slot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read slot reservations"
  ON public.meeting_slot_reservations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages slot reservations"
  ON public.meeting_slot_reservations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_slot_reservation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_msr_updated_at
  BEFORE UPDATE ON public.meeting_slot_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_slot_reservation_updated_at();

-- =====================================================================
-- Drop and recreate check_meeting_overlap to add slot reservation check
-- =====================================================================
DROP FUNCTION IF EXISTS public.check_meeting_overlap(UUID, DATE, TIME, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.check_meeting_overlap(
  p_assigned_user_id   UUID,
  p_meeting_date       DATE,
  p_meeting_start_time TIME,
  p_buffer_minutes     INTEGER DEFAULT 20,
  p_exclude_meeting_id UUID    DEFAULT NULL
)
RETURNS TABLE (
  has_overlap            BOOLEAN,
  conflicting_meeting_id UUID,
  conflicting_reference  TEXT,
  conflicting_start_time TIME
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_slot_end_time TIME;
  v_meeting_row   RECORD;
  v_reserve_row   RECORD;
BEGIN
  v_slot_end_time := p_meeting_start_time + (p_buffer_minutes || ' minutes')::INTERVAL;

  -- 1. Check active scheduled meetings
  SELECT m.id, m.meeting_reference, m.meeting_time
  INTO v_meeting_row
  FROM public.meetings m
  WHERE
    m.assigned_user_id = p_assigned_user_id
    AND m.meeting_date  = p_meeting_date
    AND m.status IN ('Scheduled', 'InProgress', 'Paused')
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
$$;