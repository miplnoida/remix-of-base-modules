
ALTER TABLE public.lg_case_task
  ADD COLUMN IF NOT EXISTS sla_status VARCHAR(20) NOT NULL DEFAULT 'ON_TIME',
  ADD COLUMN IF NOT EXISTS sla_hours INTEGER,
  ADD COLUMN IF NOT EXISTS at_risk_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS escalation_level SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS assigned_team_code VARCHAR(80),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS close_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_lg_task_assigned_user ON public.lg_case_task(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_lg_task_assigned_team ON public.lg_case_task(assigned_team_code);
CREATE INDEX IF NOT EXISTS idx_lg_task_status_due ON public.lg_case_task(status, due_date);

-- Compute SLA status helper (pure)
CREATE OR REPLACE FUNCTION public.lg_task_compute_sla(
  p_status TEXT,
  p_due_date DATE,
  p_escalation_level SMALLINT,
  p_at_risk_hours INTEGER
) RETURNS VARCHAR(20)
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_status IN ('COMPLETED','DONE','CLOSED','CANCELLED') THEN
    RETURN 'CLOSED';
  END IF;
  IF COALESCE(p_escalation_level,0) > 0 THEN
    RETURN 'ESCALATED';
  END IF;
  IF p_due_date IS NULL THEN
    RETURN 'ON_TIME';
  END IF;
  IF p_due_date < CURRENT_DATE THEN
    RETURN 'OVERDUE';
  END IF;
  IF (p_due_date - CURRENT_DATE) * 24 <= COALESCE(p_at_risk_hours, 24) THEN
    RETURN 'AT_RISK';
  END IF;
  RETURN 'ON_TIME';
END;
$$;

-- Auto-refresh sla_status on insert/update
CREATE OR REPLACE FUNCTION public.lg_task_set_sla_status()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.sla_status := public.lg_task_compute_sla(
    NEW.status, NEW.due_date, NEW.escalation_level, NEW.at_risk_hours
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_task_sla ON public.lg_case_task;
CREATE TRIGGER trg_lg_task_sla
BEFORE INSERT OR UPDATE ON public.lg_case_task
FOR EACH ROW EXECUTE FUNCTION public.lg_task_set_sla_status();

-- Backfill
UPDATE public.lg_case_task
   SET sla_status = public.lg_task_compute_sla(status, due_date, escalation_level, at_risk_hours);

-- Audit trail
CREATE TABLE IF NOT EXISTS public.lg_case_task_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.lg_case_task(id) ON DELETE CASCADE,
  lg_case_id UUID NOT NULL,
  action VARCHAR(40) NOT NULL,
  from_value JSONB,
  to_value JSONB,
  note TEXT,
  performed_by VARCHAR(50),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lg_case_task_audit TO authenticated;
GRANT ALL ON public.lg_case_task_audit TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_task_audit_task ON public.lg_case_task_audit(task_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lg_task_audit_case ON public.lg_case_task_audit(lg_case_id, performed_at DESC);

-- Automatic audit on any change (best-effort; explicit richer entries also inserted by services)
CREATE OR REPLACE FUNCTION public.lg_task_audit_change()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_actor  TEXT;
  v_from   JSONB;
  v_to     JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATED';
    v_actor  := NEW.created_by;
    v_to     := jsonb_build_object(
      'status', NEW.status, 'priority_code', NEW.priority_code,
      'assigned_to_user_id', NEW.assigned_to_user_id,
      'assigned_team_code', NEW.assigned_team_code,
      'due_date', NEW.due_date
    );
    INSERT INTO public.lg_case_task_audit(task_id, lg_case_id, action, to_value, performed_by)
    VALUES (NEW.id, NEW.lg_case_id, v_action, v_to, v_actor);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Skip trivial updates (only updated_at / sla_status recompute)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status IN ('COMPLETED','DONE') THEN v_action := 'COMPLETED';
      ELSIF NEW.status IN ('CLOSED') THEN v_action := 'CLOSED';
      ELSIF NEW.status = 'CANCELLED' THEN v_action := 'CANCELLED';
      ELSIF NEW.status IN ('OPEN','IN_PROGRESS') AND OLD.status IN ('COMPLETED','DONE','CLOSED','CANCELLED') THEN v_action := 'REOPENED';
      ELSE v_action := 'STATUS_CHANGED';
      END IF;
      v_actor := COALESCE(NEW.completed_by, NEW.closed_by, NEW.escalated_by, NEW.created_by);
      INSERT INTO public.lg_case_task_audit(task_id, lg_case_id, action, from_value, to_value, performed_by)
      VALUES (NEW.id, NEW.lg_case_id, v_action,
              jsonb_build_object('status', OLD.status),
              jsonb_build_object('status', NEW.status),
              v_actor);
    END IF;

    IF NEW.assigned_to_user_id IS DISTINCT FROM OLD.assigned_to_user_id
       OR NEW.assigned_team_code IS DISTINCT FROM OLD.assigned_team_code THEN
      INSERT INTO public.lg_case_task_audit(task_id, lg_case_id, action, from_value, to_value, performed_by)
      VALUES (NEW.id, NEW.lg_case_id, 'ASSIGNED',
              jsonb_build_object('assigned_to_user_id', OLD.assigned_to_user_id, 'assigned_team_code', OLD.assigned_team_code),
              jsonb_build_object('assigned_to_user_id', NEW.assigned_to_user_id, 'assigned_team_code', NEW.assigned_team_code),
              COALESCE(NEW.created_by, NEW.escalated_by));
    END IF;

    IF NEW.escalation_level IS DISTINCT FROM OLD.escalation_level
       AND COALESCE(NEW.escalation_level,0) > COALESCE(OLD.escalation_level,0) THEN
      INSERT INTO public.lg_case_task_audit(task_id, lg_case_id, action, from_value, to_value, note, performed_by)
      VALUES (NEW.id, NEW.lg_case_id, 'ESCALATED',
              jsonb_build_object('escalation_level', OLD.escalation_level),
              jsonb_build_object('escalation_level', NEW.escalation_level),
              NEW.escalation_reason,
              NEW.escalated_by);
    END IF;

    IF NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.priority_code IS DISTINCT FROM OLD.priority_code
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO public.lg_case_task_audit(task_id, lg_case_id, action, from_value, to_value, performed_by)
      VALUES (NEW.id, NEW.lg_case_id, 'UPDATED',
              jsonb_build_object('due_date', OLD.due_date, 'priority_code', OLD.priority_code, 'title', OLD.title),
              jsonb_build_object('due_date', NEW.due_date, 'priority_code', NEW.priority_code, 'title', NEW.title),
              COALESCE(NEW.created_by, NEW.escalated_by));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_task_audit ON public.lg_case_task;
CREATE TRIGGER trg_lg_task_audit
AFTER INSERT OR UPDATE ON public.lg_case_task
FOR EACH ROW EXECUTE FUNCTION public.lg_task_audit_change();
