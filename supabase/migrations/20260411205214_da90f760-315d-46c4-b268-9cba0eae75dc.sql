
-- Add missing audit columns
ALTER TABLE public.ce_risk_bands 
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

ALTER TABLE public.ce_risk_policy_factors 
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.ce_rule_variable_mappings 
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50);

ALTER TABLE public.ce_settings 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(50);

-- Create audit logging trigger function for compliance settings
CREATE OR REPLACE FUNCTION public.fn_ce_log_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_record_id TEXT;
  v_changed_by TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  v_action := TG_OP;
  
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
    v_changed_by := COALESCE(OLD.updated_by, 'system');
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::TEXT;
    v_changed_by := COALESCE(NEW.created_by, 'system');
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSE
    v_record_id := NEW.id::TEXT;
    v_changed_by := COALESCE(NEW.updated_by, 'system');
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO public.ce_audit_log (
    entity_type, entity_id, action, changed_by, old_values, new_values
  ) VALUES (
    TG_TABLE_NAME, v_record_id, v_action, v_changed_by, v_old_data, v_new_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Apply trigger to all compliance settings tables
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'ce_violation_types', 'ce_detection_rules', 'ce_calculation_rules', 
    'ce_escalation_rules', 'ce_number_templates', 'ce_notice_templates',
    'ce_legal_escalation_policies', 'ce_legal_escalation_policy_rules',
    'ce_risk_bands', 'ce_risk_config', 'ce_risk_policies', 
    'ce_risk_policy_factors', 'ce_rule_variable_mappings', 'ce_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_ce_audit_%I ON public.%I', t, t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_ce_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_ce_log_settings_change()', t, t
    );
  END LOOP;
END;
$$;
