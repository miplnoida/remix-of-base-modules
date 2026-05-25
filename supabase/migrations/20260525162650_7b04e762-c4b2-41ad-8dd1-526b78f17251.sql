-- ════════════════════════════════════════════════════════════════════
-- Compliance Rule Engine hardening: history, change requests, triggers
-- ════════════════════════════════════════════════════════════════════

-- 1. Rule history (versioning)
CREATE TABLE IF NOT EXISTS public.ce_rule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_table text NOT NULL,
  rule_id uuid NOT NULL,
  rule_code text,
  action text NOT NULL, -- INSERT | UPDATE | DELETE | ACTIVATE | DEACTIVATE
  before_value jsonb,
  after_value jsonb,
  changed_by varchar(50),
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS ix_ce_rule_history_rule
  ON public.ce_rule_history (rule_table, rule_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS ix_ce_rule_history_changed_at
  ON public.ce_rule_history (changed_at DESC);

-- 2. Pending change requests (approval gate)
CREATE TABLE IF NOT EXISTS public.ce_rule_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_table text NOT NULL,
  rule_id uuid NOT NULL,
  rule_code text,
  requested_action text NOT NULL, -- ACTIVATE | DEACTIVATE | UPDATE
  proposed_payload jsonb NOT NULL,
  current_snapshot jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected | cancelled | applied
  requested_by varchar(50),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by varchar(50),
  decided_at timestamptz,
  decision_notes text,
  workflow_instance_id uuid, -- TODO: wire to workflow_instances when integration is ready
  applied_at timestamptz
);

CREATE INDEX IF NOT EXISTS ix_ce_rule_change_requests_rule
  ON public.ce_rule_change_requests (rule_table, rule_id);

CREATE INDEX IF NOT EXISTS ix_ce_rule_change_requests_status
  ON public.ce_rule_change_requests (status, requested_at DESC);

-- 3. Trigger function: capture every change to a rule
CREATE OR REPLACE FUNCTION public.ce_rule_history_record_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_by varchar(50);
  v_code text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_by := COALESCE(NEW.created_by, NEW.updated_by);
    v_code := NEW.rule_code;
    INSERT INTO public.ce_rule_history
      (rule_table, rule_id, rule_code, action, before_value, after_value, changed_by)
    VALUES
      (TG_TABLE_NAME, NEW.id, v_code, v_action, NULL, to_jsonb(NEW), v_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.is_enabled, false) = false AND COALESCE(NEW.is_enabled, false) = true THEN
      v_action := 'ACTIVATE';
    ELSIF COALESCE(OLD.is_enabled, false) = true AND COALESCE(NEW.is_enabled, false) = false THEN
      v_action := 'DEACTIVATE';
    ELSE
      v_action := 'UPDATE';
    END IF;
    v_by := COALESCE(NEW.updated_by, OLD.updated_by);
    v_code := COALESCE(NEW.rule_code, OLD.rule_code);
    INSERT INTO public.ce_rule_history
      (rule_table, rule_id, rule_code, action, before_value, after_value, changed_by)
    VALUES
      (TG_TABLE_NAME, NEW.id, v_code, v_action, to_jsonb(OLD), to_jsonb(NEW), v_by);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.ce_rule_history
      (rule_table, rule_id, rule_code, action, before_value, after_value, changed_by)
    VALUES
      (TG_TABLE_NAME, OLD.id, OLD.rule_code, 'DELETE', to_jsonb(OLD), NULL, OLD.updated_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END
$$;

-- 4. Attach triggers to all three rule tables
DROP TRIGGER IF EXISTS trg_ce_detection_rules_history ON public.ce_detection_rules;
CREATE TRIGGER trg_ce_detection_rules_history
AFTER INSERT OR UPDATE OR DELETE ON public.ce_detection_rules
FOR EACH ROW EXECUTE FUNCTION public.ce_rule_history_record_change();

DROP TRIGGER IF EXISTS trg_ce_calculation_rules_history ON public.ce_calculation_rules;
CREATE TRIGGER trg_ce_calculation_rules_history
AFTER INSERT OR UPDATE OR DELETE ON public.ce_calculation_rules
FOR EACH ROW EXECUTE FUNCTION public.ce_rule_history_record_change();

DROP TRIGGER IF EXISTS trg_ce_escalation_rules_history ON public.ce_escalation_rules;
CREATE TRIGGER trg_ce_escalation_rules_history
AFTER INSERT OR UPDATE OR DELETE ON public.ce_escalation_rules
FOR EACH ROW EXECUTE FUNCTION public.ce_rule_history_record_change();
