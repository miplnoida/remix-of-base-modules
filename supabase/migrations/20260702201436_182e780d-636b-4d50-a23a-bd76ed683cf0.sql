
-- 1. Extend lg_hearing
ALTER TABLE public.lg_hearing
  ADD COLUMN IF NOT EXISTS hearing_number varchar(50),
  ADD COLUMN IF NOT EXISTS hearing_stage varchar(50),
  ADD COLUMN IF NOT EXISTS court_code varchar(50),
  ADD COLUMN IF NOT EXISTS court_file_number varchar(100),
  ADD COLUMN IF NOT EXISTS division_code varchar(50),
  ADD COLUMN IF NOT EXISTS magistrate_name text,
  ADD COLUMN IF NOT EXISTS court_clerk_name text,
  ADD COLUMN IF NOT EXISTS venue_code varchar(50),
  ADD COLUMN IF NOT EXISTS session_number varchar(50),
  ADD COLUMN IF NOT EXISTS jurisdiction varchar(50),
  ADD COLUMN IF NOT EXISTS officer_code varchar(50),
  ADD COLUMN IF NOT EXISTS lead_counsel_code varchar(50),
  ADD COLUMN IF NOT EXISTS co_counsel_code varchar(50),
  ADD COLUMN IF NOT EXISTS priority varchar(20) DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS adjournment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS judgment_reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS judgment_delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_status varchar(30) DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS evidence_status varchar(30) DEFAULT 'NOT_READY',
  ADD COLUMN IF NOT EXISTS documents_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_impact_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS adjournment_reason text,
  ADD COLUMN IF NOT EXISTS next_hearing_id uuid REFERENCES public.lg_hearing(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prep_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

CREATE INDEX IF NOT EXISTS idx_lg_hearing_court_code ON public.lg_hearing(court_code);
CREATE INDEX IF NOT EXISTS idx_lg_hearing_officer_code ON public.lg_hearing(officer_code);
CREATE INDEX IF NOT EXISTS idx_lg_hearing_stage ON public.lg_hearing(hearing_stage);
CREATE INDEX IF NOT EXISTS idx_lg_hearing_date_status ON public.lg_hearing(hearing_date, status);

-- 2. Sequence-based hearing number generator
CREATE SEQUENCE IF NOT EXISTS public.lg_hearing_no_seq START 1;

CREATE OR REPLACE FUNCTION public.gen_lg_hearing_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  n bigint;
BEGIN
  n := nextval('public.lg_hearing_no_seq');
  RETURN 'HRG-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_lg_hearing_set_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hearing_number IS NULL OR NEW.hearing_number = '' THEN
    NEW.hearing_number := public.gen_lg_hearing_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_hearing_set_number ON public.lg_hearing;
CREATE TRIGGER trg_lg_hearing_set_number
  BEFORE INSERT ON public.lg_hearing
  FOR EACH ROW EXECUTE FUNCTION public.trg_lg_hearing_set_number();

-- 3. lg_hearing_evidence
CREATE TABLE IF NOT EXISTS public.lg_hearing_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_hearing_id uuid NOT NULL REFERENCES public.lg_hearing(id) ON DELETE CASCADE,
  lg_case_id uuid,
  evidence_type varchar(30) NOT NULL,
  title text NOT NULL,
  description text,
  document_link_id uuid,
  version varchar(20),
  submitted boolean NOT NULL DEFAULT false,
  accepted boolean,
  rejected boolean,
  rejection_reason text,
  witness_name text,
  exhibit_number varchar(50),
  submitted_at timestamptz,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing_evidence TO authenticated;
GRANT ALL ON public.lg_hearing_evidence TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_hearing_evidence_hearing ON public.lg_hearing_evidence(lg_hearing_id);

-- 4. lg_hearing_prep_checklist
CREATE TABLE IF NOT EXISTS public.lg_hearing_prep_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_hearing_id uuid NOT NULL REFERENCES public.lg_hearing(id) ON DELETE CASCADE,
  item_code varchar(50) NOT NULL,
  item_label text NOT NULL,
  mandatory boolean NOT NULL DEFAULT true,
  completed boolean NOT NULL DEFAULT false,
  completed_by varchar(50),
  completed_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lg_hearing_id, item_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing_prep_checklist TO authenticated;
GRANT ALL ON public.lg_hearing_prep_checklist TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_hearing_prep_hearing ON public.lg_hearing_prep_checklist(lg_hearing_id);

-- 5. lg_hearing_adjournment
CREATE TABLE IF NOT EXISTS public.lg_hearing_adjournment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_hearing_id uuid NOT NULL REFERENCES public.lg_hearing(id) ON DELETE CASCADE,
  adjournment_number integer NOT NULL DEFAULT 1,
  reason_code varchar(50),
  reason_notes text,
  requested_by varchar(50),
  granted_by varchar(50),
  next_hearing_date date,
  next_hearing_id uuid,
  recovery_delay_days integer,
  impact_notes text,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing_adjournment TO authenticated;
GRANT ALL ON public.lg_hearing_adjournment TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_hearing_adj_hearing ON public.lg_hearing_adjournment(lg_hearing_id);

-- 6. lg_hearing_communication
CREATE TABLE IF NOT EXISTS public.lg_hearing_communication (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_hearing_id uuid NOT NULL REFERENCES public.lg_hearing(id) ON DELETE CASCADE,
  comm_type varchar(30) NOT NULL,
  channel varchar(20),
  subject text,
  body text,
  recipient text,
  dispatch_status varchar(20) NOT NULL DEFAULT 'DRAFT',
  dispatched_at timestamptz,
  dispatched_by varchar(50),
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing_communication TO authenticated;
GRANT ALL ON public.lg_hearing_communication TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_hearing_comm_hearing ON public.lg_hearing_communication(lg_hearing_id);

-- 7. Auto-task trigger on outcome/adjournment
CREATE OR REPLACE FUNCTION public.trg_lg_hearing_auto_task()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_priority varchar := 'NORMAL';
  v_due date;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Adjourned: create follow-up
    IF NEW.status = 'ADJOURNED' AND COALESCE(OLD.status, '') <> 'ADJOURNED' THEN
      v_title := 'Follow up on adjourned hearing ' || COALESCE(NEW.hearing_number, NEW.id::text);
      v_due := COALESCE(NEW.next_hearing_date, (CURRENT_DATE + INTERVAL '7 days')::date);
      INSERT INTO public.lg_case_task (
        lg_case_id, title, description, priority_code, due_date, status, created_by, source_type, source_id
      ) VALUES (
        NEW.lg_case_id,
        v_title,
        'Auto-created by hearing adjournment. Reason: ' || COALESCE(NEW.adjournment_reason, 'N/A'),
        'HIGH', v_due, 'OPEN', COALESCE(NEW.created_by, 'SYSTEM'),
        'HEARING_ADJOURNMENT', NEW.id
      );
    END IF;
    -- Judgment reserved: reminder
    IF NEW.outcome_code = 'JUDGMENT_RESERVED' AND COALESCE(OLD.outcome_code, '') <> 'JUDGMENT_RESERVED' THEN
      INSERT INTO public.lg_case_task (
        lg_case_id, title, description, priority_code, due_date, status, created_by, source_type, source_id
      ) VALUES (
        NEW.lg_case_id,
        'Reminder: judgment reserved for hearing ' || COALESCE(NEW.hearing_number, NEW.id::text),
        'Auto-created by JUDGMENT_RESERVED outcome. Follow up with court for judgment date.',
        'HIGH', (CURRENT_DATE + INTERVAL '14 days')::date, 'OPEN', COALESCE(NEW.created_by, 'SYSTEM'),
        'HEARING_JUDGMENT_RESERVED', NEW.id
      );
    END IF;
    -- Order issued: recovery follow-up
    IF NEW.outcome_code = 'ORDER_ISSUED' AND COALESCE(OLD.outcome_code, '') <> 'ORDER_ISSUED' THEN
      INSERT INTO public.lg_case_task (
        lg_case_id, title, description, priority_code, due_date, status, created_by, source_type, source_id
      ) VALUES (
        NEW.lg_case_id,
        'Recovery follow-up for order issued at hearing ' || COALESCE(NEW.hearing_number, NEW.id::text),
        'Auto-created by ORDER_ISSUED outcome. Ensure court order recorded and recovery scheduled.',
        'HIGH', (CURRENT_DATE + INTERVAL '3 days')::date, 'OPEN', COALESCE(NEW.created_by, 'SYSTEM'),
        'HEARING_ORDER_ISSUED', NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_hearing_auto_task ON public.lg_hearing;
CREATE TRIGGER trg_lg_hearing_auto_task
  AFTER UPDATE ON public.lg_hearing
  FOR EACH ROW EXECUTE FUNCTION public.trg_lg_hearing_auto_task();

-- 8. Increment adjournment_count trigger
CREATE OR REPLACE FUNCTION public.trg_lg_hearing_adj_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.lg_hearing
    SET adjournment_count = COALESCE(adjournment_count,0) + 1,
        updated_at = now()
    WHERE id = NEW.lg_hearing_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_hearing_adj_count ON public.lg_hearing_adjournment;
CREATE TRIGGER trg_lg_hearing_adj_count
  AFTER INSERT ON public.lg_hearing_adjournment
  FOR EACH ROW EXECUTE FUNCTION public.trg_lg_hearing_adj_count();
