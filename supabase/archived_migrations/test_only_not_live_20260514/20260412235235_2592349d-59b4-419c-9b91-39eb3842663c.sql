
-- =============================================
-- Phase 1: Follow-Up Actions Foundation
-- =============================================

-- 1. Main follow-up actions table
CREATE TABLE public.ce_follow_up_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES public.ce_violations(id) ON DELETE CASCADE,
  employer_id VARCHAR(20),
  employer_name VARCHAR(200),
  action_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  assigned_to_user_id UUID,
  assigned_to_name VARCHAR(200),
  assigned_queue_id UUID REFERENCES public.ce_assignment_queues(id),
  due_date DATE,
  scheduled_date TIMESTAMPTZ,
  notes TEXT,
  outcome TEXT,
  source VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(100),
  created_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  updated_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- 2. History / audit table
CREATE TABLE public.ce_follow_up_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.ce_follow_up_actions(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  changed_by_name VARCHAR(200),
  notes TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_ce_follow_up_actions_violation ON public.ce_follow_up_actions(violation_id) WHERE is_deleted = false;
CREATE INDEX idx_ce_follow_up_actions_assigned ON public.ce_follow_up_actions(assigned_to_user_id) WHERE is_deleted = false AND status NOT IN ('COMPLETED','CANCELLED');
CREATE INDEX idx_ce_follow_up_actions_due ON public.ce_follow_up_actions(due_date) WHERE is_deleted = false AND status NOT IN ('COMPLETED','CANCELLED');
CREATE INDEX idx_ce_follow_up_actions_employer ON public.ce_follow_up_actions(employer_id) WHERE is_deleted = false;
CREATE INDEX idx_ce_follow_up_action_history_action ON public.ce_follow_up_action_history(action_id);

-- 4. Dedupe partial unique index: one active action per violation+type
CREATE UNIQUE INDEX idx_ce_follow_up_actions_dedupe
  ON public.ce_follow_up_actions(violation_id, action_type)
  WHERE is_deleted = false AND status NOT IN ('COMPLETED', 'CANCELLED');

-- 5. Auto-audit trigger on status change
CREATE OR REPLACE FUNCTION public.fn_ce_follow_up_action_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ce_follow_up_action_history (
      action_id, old_status, new_status, changed_by, changed_by_name, notes
    ) VALUES (
      NEW.id, OLD.status, NEW.status, NEW.updated_by, NULL, NULL
    );
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ce_follow_up_action_audit
  BEFORE UPDATE ON public.ce_follow_up_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_ce_follow_up_action_audit();

-- 6. Auto-create follow-up on violation creation
CREATE OR REPLACE FUNCTION public.fn_ce_auto_create_follow_up()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action_type VARCHAR(50);
  v_description TEXT;
  v_source VARCHAR(30);
  v_priority VARCHAR(20);
BEGIN
  -- Determine action type based on violation status
  IF NEW.status = 'OPEN' THEN
    v_action_type := 'VISIT';
    v_description := 'Initial operational follow-up for violation ' || NEW.violation_number;
    v_source := 'AUTO_OPEN';
    v_priority := CASE
      WHEN NEW.priority IN ('Critical','High') THEN 'URGENT'
      WHEN NEW.priority = 'Medium' THEN 'HIGH'
      ELSE 'NORMAL'
    END;
  ELSIF NEW.status = 'UNDER_REVIEW' THEN
    v_action_type := 'REVIEW';
    v_description := 'Review follow-up for violation ' || NEW.violation_number;
    v_source := 'AUTO_REVIEW';
    v_priority := 'HIGH';
  ELSE
    RETURN NEW;
  END IF;

  -- Dedupe check: skip if active follow-up already exists
  IF NOT EXISTS (
    SELECT 1 FROM public.ce_follow_up_actions
    WHERE violation_id = NEW.id
      AND action_type = v_action_type
      AND is_deleted = false
      AND status NOT IN ('COMPLETED', 'CANCELLED')
  ) THEN
    INSERT INTO public.ce_follow_up_actions (
      violation_id, employer_id, employer_name,
      action_type, description, priority, status,
      assigned_to_user_id, assigned_to_name, assigned_queue_id,
      due_date, source, created_by
    ) VALUES (
      NEW.id, NEW.employer_id, NEW.employer_name,
      v_action_type, v_description, v_priority, 'PLANNED',
      NEW.assigned_to_user_id, NEW.assigned_to_name, NEW.assigned_queue_id,
      COALESCE(NEW.due_date::date, (now() + interval '7 days')::date),
      v_source, 'SYSTEM-AUTO'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ce_auto_create_follow_up
  AFTER INSERT ON public.ce_violations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_ce_auto_create_follow_up();
