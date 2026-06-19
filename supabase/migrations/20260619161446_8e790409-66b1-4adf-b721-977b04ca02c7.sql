
-- Extend lg_hearing
ALTER TABLE public.lg_hearing
  ADD COLUMN IF NOT EXISTS hearing_date DATE,
  ADD COLUMN IF NOT EXISTS hearing_time TIME,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS next_hearing_time TIME,
  ADD COLUMN IF NOT EXISTS minutes TEXT;

-- Backfill hearing_date/hearing_time from scheduled_at
UPDATE public.lg_hearing
   SET hearing_date = COALESCE(hearing_date, (scheduled_at AT TIME ZONE 'UTC')::date),
       hearing_time = COALESCE(hearing_time, (scheduled_at AT TIME ZONE 'UTC')::time)
 WHERE scheduled_at IS NOT NULL AND (hearing_date IS NULL OR hearing_time IS NULL);

-- Extend lg_case_task
ALTER TABLE public.lg_case_task
  ADD COLUMN IF NOT EXISTS priority_code VARCHAR(40) NOT NULL DEFAULT 'MEDIUM';

-- Extend lg_case_deadline
ALTER TABLE public.lg_case_deadline
  ADD COLUMN IF NOT EXISTS status_code VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS reminder_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_days_json JSONB;

CREATE INDEX IF NOT EXISTS idx_lg_hearing_date ON public.lg_hearing(hearing_date);
CREATE INDEX IF NOT EXISTS idx_lg_task_due ON public.lg_case_task(due_date);
CREATE INDEX IF NOT EXISTS idx_lg_deadline_due ON public.lg_case_deadline(due_date);

-- Sync lg_case.next_hearing_date from earliest scheduled hearing
CREATE OR REPLACE FUNCTION public.lg_sync_case_next_hearing()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_case UUID; v_next DATE;
BEGIN
  v_case := COALESCE(NEW.lg_case_id, OLD.lg_case_id);
  SELECT MIN(COALESCE(hearing_date, (scheduled_at AT TIME ZONE 'UTC')::date))
    INTO v_next
    FROM public.lg_hearing
   WHERE lg_case_id = v_case
     AND status = 'SCHEDULED'
     AND COALESCE(hearing_date, (scheduled_at AT TIME ZONE 'UTC')::date) >= CURRENT_DATE;
  UPDATE public.lg_case SET next_hearing_date = v_next WHERE id = v_case;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_lg_hearing_sync_next ON public.lg_hearing;
CREATE TRIGGER trg_lg_hearing_sync_next
AFTER INSERT OR UPDATE OR DELETE ON public.lg_hearing
FOR EACH ROW EXECUTE FUNCTION public.lg_sync_case_next_hearing();

-- Activity log + auto follow-up
CREATE OR REPLACE FUNCTION public.lg_hearing_workflow()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_next_date DATE;
  v_next_time TIME;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lg_case_activity(lg_case_id, activity_type, description, payload, performed_by)
    VALUES (NEW.lg_case_id, 'HEARING_SCHEDULED',
            'Hearing scheduled on ' || COALESCE(NEW.hearing_date::text, NEW.scheduled_at::text),
            jsonb_build_object('hearing_id', NEW.id, 'hearing_type_code', NEW.hearing_type_code),
            NEW.created_by);
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.outcome_code IS DISTINCT FROM OLD.outcome_code OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lg_case_activity(lg_case_id, activity_type, description, payload, performed_by)
    VALUES (NEW.lg_case_id, 'HEARING_UPDATED',
            'Hearing ' || COALESCE(NEW.status, '') || COALESCE(' / ' || NEW.outcome_code, ''),
            jsonb_build_object('hearing_id', NEW.id, 'outcome_code', NEW.outcome_code,
                               'next_hearing_date', NEW.next_hearing_date),
            NEW.created_by);
  END IF;

  -- Auto follow-up when this hearing has a recorded outcome AND a future date and we haven't already created one
  IF NEW.outcome_code IS NOT NULL
     AND NEW.next_hearing_date IS NOT NULL
     AND (OLD.outcome_code IS NULL OR OLD.next_hearing_date IS DISTINCT FROM NEW.next_hearing_date)
  THEN
    v_next_date := NEW.next_hearing_date;
    v_next_time := COALESCE(NEW.next_hearing_time, NEW.hearing_time, TIME '09:00');

    IF NOT EXISTS (
      SELECT 1 FROM public.lg_hearing h
       WHERE h.lg_case_id = NEW.lg_case_id
         AND h.status = 'SCHEDULED'
         AND COALESCE(h.hearing_date, (h.scheduled_at AT TIME ZONE 'UTC')::date) = v_next_date
    ) THEN
      INSERT INTO public.lg_hearing(
        lg_case_id, hearing_type_code, hearing_date, hearing_time,
        scheduled_at, court_name, court_room, location, status, created_by)
      VALUES (
        NEW.lg_case_id, COALESCE(NEW.hearing_type_code, 'MENTION'),
        v_next_date, v_next_time,
        (v_next_date::text || ' ' || v_next_time::text)::timestamptz,
        NEW.court_name, NEW.court_room, NEW.location, 'SCHEDULED', NEW.created_by);

      INSERT INTO public.lg_case_task(
        lg_case_id, task_type_code, title, description, due_date, status, priority_code, created_by)
      VALUES (
        NEW.lg_case_id, 'ATTEND_HEARING',
        'Attend hearing on ' || v_next_date::text,
        'Follow-up hearing scheduled after outcome ' || NEW.outcome_code,
        v_next_date, 'OPEN', 'HIGH', NEW.created_by);

      INSERT INTO public.lg_case_deadline(
        lg_case_id, deadline_type, due_date, description,
        status_code, reminder_required, reminder_days_json)
      VALUES (
        NEW.lg_case_id, 'HEARING', v_next_date,
        'Hearing on ' || v_next_date::text,
        'PENDING', TRUE, '[7,3,1]'::jsonb);
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lg_hearing_workflow ON public.lg_hearing;
CREATE TRIGGER trg_lg_hearing_workflow
AFTER INSERT OR UPDATE ON public.lg_hearing
FOR EACH ROW EXECUTE FUNCTION public.lg_hearing_workflow();
