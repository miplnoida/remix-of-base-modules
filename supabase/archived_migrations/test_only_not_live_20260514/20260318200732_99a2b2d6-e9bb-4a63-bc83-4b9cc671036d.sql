
-- 1. Add route column to system_audit_trail
ALTER TABLE public.system_audit_trail ADD COLUMN IF NOT EXISTS route TEXT;

-- 2. Create reusable audit trigger function
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_id UUID;
  v_before JSONB;
  v_after JSONB;
  v_entity_id TEXT;
BEGIN
  -- Resolve user identity
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(user_code, full_name) INTO v_user_name 
    FROM public.profiles WHERE id = v_user_id;
  END IF;
  v_user_name := COALESCE(v_user_name, 'SYSTEM');

  -- Set before/after values
  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_entity_id := OLD.id::text;
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_entity_id := NEW.id::text;
  ELSE
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_entity_id := NEW.id::text;
  END IF;

  INSERT INTO public.system_audit_trail (
    action, entity_type, entity_id, before_value, after_value,
    user_name, user_id, module, timestamp
  ) VALUES (
    TG_OP, TG_TABLE_NAME, v_entity_id,
    v_before, v_after, v_user_name, v_user_id,
    COALESCE(TG_ARGV[0], TG_TABLE_NAME),
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach triggers to critical tables
CREATE TRIGGER trg_audit_er_master
  AFTER INSERT OR UPDATE OR DELETE ON public.er_master
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Employer');

CREATE TRIGGER trg_audit_ip_master
  AFTER INSERT OR UPDATE OR DELETE ON public.ip_master
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Insured Person');

CREATE TRIGGER trg_audit_cn_batch
  AFTER INSERT OR UPDATE OR DELETE ON public.cn_batch
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Cashier');

CREATE TRIGGER trg_audit_cn_receipt
  AFTER INSERT OR UPDATE OR DELETE ON public.cn_receipt
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Cashier');

CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('User Management');

CREATE TRIGGER trg_audit_system_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('System Settings');

CREATE TRIGGER trg_audit_tb_currencies
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_currencies
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Configuration');

CREATE TRIGGER trg_audit_workflow_instances
  AFTER INSERT OR UPDATE OR DELETE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Workflow');

CREATE TRIGGER trg_audit_ip_self_employ
  AFTER INSERT OR UPDATE OR DELETE ON public.ip_self_employ
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Self Employed');

CREATE TRIGGER trg_audit_bema_registrations
  AFTER INSERT OR UPDATE OR DELETE ON public.bema_registrations
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('BEMA Registration');

CREATE TRIGGER trg_audit_bema_audit_cases
  AFTER INSERT OR UPDATE OR DELETE ON public.bema_audit_cases
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('BEMA Audit');

CREATE TRIGGER trg_audit_cn_cash_count
  AFTER INSERT OR UPDATE OR DELETE ON public.cn_cash_count
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('Cashier');

CREATE TRIGGER trg_audit_api_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.api_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('API Configuration');

CREATE TRIGGER trg_audit_api_registry
  AFTER INSERT OR UPDATE OR DELETE ON public.api_registry
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('API Configuration');
