
-- ============================================================
-- EPIC-06D: Recovery Assignment & Operational Work Management
-- ============================================================

-- 1) Strategy types (admin config)
CREATE TABLE public.lg_recovery_strategy_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  playbook_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_sla_policy_code VARCHAR(50),
  sort_order INT DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_strategy_type TO authenticated;
GRANT ALL ON public.lg_recovery_strategy_type TO service_role;

-- 2) Campaign types (admin config)
CREATE TABLE public.lg_recovery_campaign_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_campaign_type TO authenticated;
GRANT ALL ON public.lg_recovery_campaign_type TO service_role;

-- 3) Workload rules (admin config)
CREATE TABLE public.lg_recovery_workload_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  max_active_assignments INT NOT NULL DEFAULT 50,
  max_high_priority INT NOT NULL DEFAULT 10,
  warning_threshold_pct INT NOT NULL DEFAULT 80,
  critical_threshold_pct INT NOT NULL DEFAULT 100,
  escalation_rule_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_workload_rule TO authenticated;
GRANT ALL ON public.lg_recovery_workload_rule TO service_role;

-- 4) Recovery campaigns
CREATE TABLE public.lg_recovery_campaign (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  campaign_type_code VARCHAR(50) REFERENCES public.lg_recovery_campaign_type(code),
  description TEXT,
  from_date DATE,
  to_date DATE,
  target_amount NUMERIC(18,2) DEFAULT 0,
  target_liability_count INT DEFAULT 0,
  owner_team_code VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  actual_recovered_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_assignment_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_campaign TO authenticated;
GRANT ALL ON public.lg_recovery_campaign TO service_role;

-- 5) Recovery assignments (core)
CREATE TABLE public.lg_recovery_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  health VARCHAR(20) NOT NULL DEFAULT 'HEALTHY',
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  assigned_officer_id UUID,
  assigned_officer_code VARCHAR(50),
  assigned_team_code VARCHAR(50),
  strategy_type_code VARCHAR(50) REFERENCES public.lg_recovery_strategy_type(code),
  campaign_id UUID REFERENCES public.lg_recovery_campaign(id) ON DELETE SET NULL,
  sla_policy_code VARCHAR(50),
  target_recovery_amount NUMERIC(18,2) DEFAULT 0,
  target_date DATE,
  next_action_code VARCHAR(50),
  next_action_at TIMESTAMPTZ,
  next_action_due_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ,
  escalation_reason TEXT,
  transfer_pending BOOLEAN NOT NULL DEFAULT false,
  -- rollups
  liability_count INT NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  appeal_count INT NOT NULL DEFAULT 0,
  enforcement_count INT NOT NULL DEFAULT 0,
  total_principal NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_interest NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_penalty NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_assessed NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_outstanding NUMERIC(18,2) NOT NULL DEFAULT 0,
  recovery_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  assigned_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);
CREATE INDEX idx_lg_ra_status ON public.lg_recovery_assignment(status);
CREATE INDEX idx_lg_ra_officer ON public.lg_recovery_assignment(assigned_officer_id);
CREATE INDEX idx_lg_ra_team ON public.lg_recovery_assignment(assigned_team_code);
CREATE INDEX idx_lg_ra_campaign ON public.lg_recovery_assignment(campaign_id);
CREATE INDEX idx_lg_ra_health ON public.lg_recovery_assignment(health);
CREATE INDEX idx_lg_ra_next_due ON public.lg_recovery_assignment(next_action_due_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_assignment TO authenticated;
GRANT ALL ON public.lg_recovery_assignment TO service_role;

-- 6) Assignment ⇄ Liability junction
CREATE TABLE public.lg_recovery_assignment_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.lg_recovery_assignment(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by VARCHAR(50),
  remarks TEXT,
  UNIQUE(assignment_id, liability_id)
);
CREATE INDEX idx_lg_ral_assignment ON public.lg_recovery_assignment_liability(assignment_id);
CREATE INDEX idx_lg_ral_liability ON public.lg_recovery_assignment_liability(liability_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_assignment_liability TO authenticated;
GRANT ALL ON public.lg_recovery_assignment_liability TO service_role;

-- 7) Status/transfer history
CREATE TABLE public.lg_recovery_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.lg_recovery_assignment(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL, -- STATUS_CHANGE|TRANSFER|ESCALATION|ASSIGN|STRATEGY_CHANGE|CAMPAIGN_CHANGE
  from_value TEXT,
  to_value TEXT,
  reason TEXT,
  actor_code VARCHAR(50),
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lg_rah_assignment ON public.lg_recovery_assignment_history(assignment_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_assignment_history TO authenticated;
GRANT ALL ON public.lg_recovery_assignment_history TO service_role;

-- 8) Diary / actions
CREATE TABLE public.lg_recovery_assignment_action (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.lg_recovery_assignment(id) ON DELETE CASCADE,
  action_type VARCHAR(30) NOT NULL, -- CALL|VISIT|LETTER|MEETING|NEGOTIATION|NOTE|OTHER
  action_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  subject TEXT,
  notes TEXT,
  outcome_code VARCHAR(30),
  contact_person TEXT,
  contact_channel VARCHAR(20),
  linked_task_id UUID,
  linked_document_id UUID,
  linked_hearing_id UUID,
  amount_promised NUMERIC(18,2),
  promise_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50)
);
CREATE INDEX idx_lg_raa_assignment ON public.lg_recovery_assignment_action(assignment_id, action_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_assignment_action TO authenticated;
GRANT ALL ON public.lg_recovery_assignment_action TO service_role;

-- 9) Transfer requests
CREATE TABLE public.lg_recovery_assignment_transfer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.lg_recovery_assignment(id) ON DELETE CASCADE,
  from_officer_id UUID,
  from_officer_code VARCHAR(50),
  to_officer_id UUID,
  to_officer_code VARCHAR(50),
  to_team_code VARCHAR(50),
  reason TEXT NOT NULL,
  approval_state VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED|CANCELLED
  requested_by VARCHAR(50),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by VARCHAR(50),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT
);
CREATE INDEX idx_lg_rat_assignment ON public.lg_recovery_assignment_transfer(assignment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_assignment_transfer TO authenticated;
GRANT ALL ON public.lg_recovery_assignment_transfer TO service_role;

-- 10) Audit trail (value diffs)
CREATE TABLE public.lg_recovery_assignment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.lg_recovery_assignment(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL, -- INSERT|UPDATE|DELETE
  changed_fields JSONB,
  before_json JSONB,
  after_json JSONB,
  actor_code VARCHAR(50),
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lg_raaud_assignment ON public.lg_recovery_assignment_audit(assignment_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recovery_assignment_audit TO authenticated;
GRANT ALL ON public.lg_recovery_assignment_audit TO service_role;

-- ============================================================
-- Triggers
-- ============================================================

-- Rollup from linked liabilities
CREATE OR REPLACE FUNCTION public.lg_recompute_assignment_rollup(p_assignment UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liab_count INT := 0;
  v_principal NUMERIC := 0;
  v_interest NUMERIC := 0;
  v_penalty NUMERIC := 0;
  v_assessed NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_outstanding NUMERIC := 0;
  v_order_count INT := 0;
  v_appeal_count INT := 0;
  v_enforce_count INT := 0;
  v_recovery_pct NUMERIC := 0;
BEGIN
  SELECT COUNT(*),
         COALESCE(SUM(l.principal),0),
         COALESCE(SUM(l.interest),0),
         COALESCE(SUM(l.penalty),0),
         COALESCE(SUM(l.total_assessed),0),
         COALESCE(SUM(l.paid),0),
         COALESCE(SUM(l.outstanding),0)
  INTO v_liab_count, v_principal, v_interest, v_penalty, v_assessed, v_paid, v_outstanding
  FROM public.lg_recovery_assignment_liability j
  JOIN public.lg_recoverable_liability l ON l.id = j.liability_id
  WHERE j.assignment_id = p_assignment;

  SELECT COUNT(DISTINCT ol.order_id) INTO v_order_count
    FROM public.lg_recovery_assignment_liability j
    JOIN public.lg_order_liability ol ON ol.liability_id = j.liability_id
    WHERE j.assignment_id = p_assignment;

  SELECT COUNT(DISTINCT al.appeal_id) INTO v_appeal_count
    FROM public.lg_recovery_assignment_liability j
    JOIN public.lg_appeal_liability al ON al.liability_id = j.liability_id
    WHERE j.assignment_id = p_assignment;

  SELECT COUNT(DISTINCT el.enforcement_id) INTO v_enforce_count
    FROM public.lg_recovery_assignment_liability j
    JOIN public.lg_enforcement_liability el ON el.liability_id = j.liability_id
    WHERE j.assignment_id = p_assignment;

  IF v_assessed > 0 THEN
    v_recovery_pct := ROUND((v_paid / v_assessed) * 100, 2);
  END IF;

  UPDATE public.lg_recovery_assignment
     SET liability_count = v_liab_count,
         total_principal = v_principal,
         total_interest = v_interest,
         total_penalty = v_penalty,
         total_assessed = v_assessed,
         total_paid = v_paid,
         total_outstanding = v_outstanding,
         order_count = v_order_count,
         appeal_count = v_appeal_count,
         enforcement_count = v_enforce_count,
         recovery_pct = v_recovery_pct,
         updated_at = now()
   WHERE id = p_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_lg_assignment_rollup_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.lg_recompute_assignment_rollup(OLD.assignment_id);
    RETURN OLD;
  ELSE
    PERFORM public.lg_recompute_assignment_rollup(NEW.assignment_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_lg_assignment_rollup
AFTER INSERT OR UPDATE OR DELETE ON public.lg_recovery_assignment_liability
FOR EACH ROW EXECUTE FUNCTION public.trg_lg_assignment_rollup_fn();

-- Health computation
CREATE OR REPLACE FUNCTION public.trg_lg_assignment_health_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_days_since_action INT;
  v_outstanding_pct NUMERIC := 0;
BEGIN
  IF NEW.total_assessed > 0 THEN
    v_outstanding_pct := (NEW.total_outstanding / NEW.total_assessed) * 100;
  END IF;
  v_days_since_action := COALESCE(EXTRACT(DAY FROM (now() - NEW.last_action_at))::int, 999);

  IF NEW.status IN ('COMPLETED','CLOSED') THEN
    NEW.health := 'HEALTHY';
  ELSIF v_outstanding_pct > 80 AND v_days_since_action > 30 THEN
    NEW.health := 'CRITICAL';
  ELSIF v_outstanding_pct > 50 AND v_days_since_action > 14 THEN
    NEW.health := 'AT_RISK';
  ELSIF NEW.next_action_due_at IS NOT NULL AND NEW.next_action_due_at < now() THEN
    NEW.health := 'AT_RISK';
  ELSE
    NEW.health := 'HEALTHY';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lg_assignment_health
BEFORE UPDATE ON public.lg_recovery_assignment
FOR EACH ROW EXECUTE FUNCTION public.trg_lg_assignment_health_fn();

-- Audit trigger
CREATE OR REPLACE FUNCTION public.trg_lg_assignment_audit_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_changed JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, jsonb_build_object('before', to_jsonb(OLD) -> key, 'after', to_jsonb(NEW) -> key))
      INTO v_changed
      FROM jsonb_object_keys(to_jsonb(NEW)) AS key
     WHERE to_jsonb(OLD) -> key IS DISTINCT FROM to_jsonb(NEW) -> key
       AND key NOT IN ('updated_at');
    IF v_changed IS NOT NULL AND v_changed <> '{}'::jsonb THEN
      INSERT INTO public.lg_recovery_assignment_audit(assignment_id, action, changed_fields, before_json, after_json, actor_code)
      VALUES (NEW.id, 'UPDATE', v_changed, to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.lg_recovery_assignment_audit(assignment_id, action, after_json, actor_code)
    VALUES (NEW.id, 'INSERT', to_jsonb(NEW), NEW.created_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.lg_recovery_assignment_audit(assignment_id, action, before_json, actor_code)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), OLD.updated_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_lg_assignment_audit
AFTER INSERT OR UPDATE OR DELETE ON public.lg_recovery_assignment
FOR EACH ROW EXECUTE FUNCTION public.trg_lg_assignment_audit_fn();

-- ============================================================
-- Seed defaults
-- ============================================================
INSERT INTO public.lg_recovery_strategy_type (code, name, description, playbook_json, sort_order) VALUES
  ('DEMAND',      'Demand Letter',        'Formal demand letter issued to debtor.',           '[{"step":1,"action":"ISSUE_DEMAND"},{"step":2,"action":"WAIT_14_DAYS"}]'::jsonb, 10),
  ('PHONE',       'Phone Outreach',       'Telephone contact and follow-up.',                 '[{"step":1,"action":"CALL"},{"step":2,"action":"LOG_OUTCOME"}]'::jsonb, 20),
  ('VISIT',       'Field Visit',          'On-site officer visit to employer/debtor.',        '[{"step":1,"action":"SCHEDULE_VISIT"},{"step":2,"action":"CONDUCT_VISIT"}]'::jsonb, 30),
  ('NEGOTIATION', 'Negotiation',          'Structured settlement/arrangement discussion.',    '[{"step":1,"action":"OPEN_NEGOTIATION"},{"step":2,"action":"RECORD_OFFER"}]'::jsonb, 40),
  ('INSTALLMENT', 'Installment Plan',     'Formal installment arrangement.',                  '[{"step":1,"action":"DRAFT_ARRANGEMENT"},{"step":2,"action":"OBTAIN_APPROVAL"}]'::jsonb, 50),
  ('COURT_FU',    'Court Follow-up',      'Track court order compliance and enforcement.',    '[{"step":1,"action":"MONITOR_ORDER"},{"step":2,"action":"TRIGGER_ENFORCEMENT"}]'::jsonb, 60),
  ('ESCALATION',  'Escalation',           'Escalate to supervisor / legal.',                  '[{"step":1,"action":"NOTIFY_SUPERVISOR"}]'::jsonb, 70)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.lg_recovery_campaign_type (code, name, description) VALUES
  ('ARREARS_DRIVE',      'Arrears Drive',           'Focused campaign to recover employer arrears.'),
  ('OVERPAYMENT_RECOV',  'Overpayment Recovery',    'Recovery of benefit overpayments.'),
  ('COURT_ORDERED',      'Court Ordered Recovery',  'Recovery driven by court orders/judgments.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.lg_recovery_workload_rule (code, name, max_active_assignments, max_high_priority, warning_threshold_pct, critical_threshold_pct, is_default)
VALUES ('DEFAULT', 'Default Workload Policy', 50, 10, 80, 100, true)
ON CONFLICT (code) DO NOTHING;
