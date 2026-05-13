
-- Create a database trigger on c3_calculation_config to auto-log changes 
-- to both c3_unified_audit_log and system_audit_trail

CREATE OR REPLACE FUNCTION public.trg_audit_c3_calculation_config()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
  v_field_name TEXT;
  v_entity_name TEXT;
  v_user_id UUID;
  v_user_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_value := NULL;
    v_new_value := to_jsonb(NEW)::text;
    v_field_name := NULL;
    v_entity_name := NEW.display_name;
    BEGIN v_user_id := NEW.created_by::uuid; EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      IF NEW.is_active THEN v_action := 'ENABLE'; ELSE v_action := 'DISABLE'; END IF;
      v_field_name := 'is_active';
      v_old_value := OLD.is_active::text;
      v_new_value := NEW.is_active::text;
    ELSIF NEW.config_value IS DISTINCT FROM OLD.config_value THEN
      v_action := 'UPDATE';
      v_field_name := 'config_value';
      v_old_value := OLD.config_value::text;
      v_new_value := NEW.config_value::text;
    ELSE
      v_action := 'UPDATE';
      v_field_name := NULL;
      v_old_value := to_jsonb(OLD)::text;
      v_new_value := to_jsonb(NEW)::text;
    END IF;
    v_entity_name := COALESCE(NEW.display_name, OLD.display_name);
    BEGIN v_user_id := NEW.updated_by::uuid; EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_value := to_jsonb(OLD)::text;
    v_new_value := NULL;
    v_field_name := NULL;
    v_entity_name := OLD.display_name;
    BEGIN v_user_id := OLD.updated_by::uuid; EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;

  -- Insert into c3_unified_audit_log (local C3 audit tab)
  INSERT INTO public.c3_unified_audit_log (
    config_type, record_id, action, entity_name, field_name,
    old_value, new_value, changed_by, changed_by_name, changed_at, metadata
  ) VALUES (
    'calculation_config',
    COALESCE(NEW.id, OLD.id)::text,
    v_action,
    v_entity_name,
    v_field_name,
    v_old_value,
    v_new_value,
    v_user_id::text,
    v_user_name,
    NOW(),
    jsonb_build_object('config_key', COALESCE(NEW.config_key, OLD.config_key), 'category', COALESCE(NEW.category, OLD.category))
  );

  -- Insert into system_audit_trail (global System Monitoring)
  INSERT INTO public.system_audit_trail (
    user_id, user_name, action, entity_type, entity_id, module,
    before_value, after_value, severity, timestamp
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'SYSTEM'),
    v_action,
    'C3Configuration',
    COALESCE(NEW.id, OLD.id)::text,
    'C3 Configuration',
    CASE WHEN v_old_value IS NOT NULL THEN jsonb_build_object('config_key', COALESCE(OLD.config_key, NEW.config_key), 'display_name', COALESCE(OLD.display_name, NEW.display_name), 'value', v_old_value) ELSE NULL END,
    CASE WHEN v_new_value IS NOT NULL THEN jsonb_build_object('config_key', COALESCE(NEW.config_key, OLD.config_key), 'display_name', COALESCE(NEW.display_name, OLD.display_name), 'value', v_new_value) ELSE NULL END,
    'info',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in trg_audit_c3_calculation_config: % %', SQLERRM, SQLSTATE;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS audit_c3_calculation_config_trigger ON public.c3_calculation_config;
CREATE TRIGGER audit_c3_calculation_config_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_calculation_config
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_c3_calculation_config();

-- Generic trigger function for other C3 config tables to write to system_audit_trail
CREATE OR REPLACE FUNCTION public.trg_c3_config_to_system_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_user_id UUID;
  v_user_name TEXT;
  v_record_id TEXT;
BEGIN
  v_record_id := COALESCE(NEW.id, OLD.id)::text;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    BEGIN v_user_id := NEW.created_by::uuid; EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for is_active toggle if column exists
    BEGIN
      IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        v_action := CASE WHEN NEW.is_active THEN 'ENABLE' ELSE 'DISABLE' END;
      ELSE
        v_action := 'UPDATE';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_action := 'UPDATE';
    END;
    BEGIN v_user_id := NEW.modified_by::uuid; EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    BEGIN v_user_id := OLD.modified_by::uuid; EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  END IF;

  SELECT full_name INTO v_user_name FROM public.profiles WHERE id = v_user_id;

  INSERT INTO public.system_audit_trail (
    user_id, user_name, action, entity_type, entity_id, module,
    before_value, after_value, severity, timestamp
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, 'SYSTEM'),
    v_action,
    'C3Configuration',
    v_record_id,
    'C3 Configuration',
    CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) ELSE NULL END,
    'info',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in trg_c3_config_to_system_audit for %: % %', TG_TABLE_NAME, SQLERRM, SQLSTATE;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach to c3_config_periods
DROP TRIGGER IF EXISTS audit_c3_config_periods_to_system ON public.c3_config_periods;
CREATE TRIGGER audit_c3_config_periods_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_config_periods
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to c3_config_details
DROP TRIGGER IF EXISTS audit_c3_config_details_to_system ON public.c3_config_details;
CREATE TRIGGER audit_c3_config_details_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_config_details
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to tb_levy_slabs
DROP TRIGGER IF EXISTS audit_tb_levy_slabs_to_system ON public.tb_levy_slabs;
CREATE TRIGGER audit_tb_levy_slabs_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_levy_slabs
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to tb_levy_slab_details
DROP TRIGGER IF EXISTS audit_tb_levy_slab_details_to_system ON public.tb_levy_slab_details;
CREATE TRIGGER audit_tb_levy_slab_details_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.tb_levy_slab_details
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to c3_bonus_policy_default
DROP TRIGGER IF EXISTS audit_c3_bonus_policy_default_to_system ON public.c3_bonus_policy_default;
CREATE TRIGGER audit_c3_bonus_policy_default_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_bonus_policy_default
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to c3_bonus_policy_exceptions
DROP TRIGGER IF EXISTS audit_c3_bonus_policy_exceptions_to_system ON public.c3_bonus_policy_exceptions;
CREATE TRIGGER audit_c3_bonus_policy_exceptions_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_bonus_policy_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to c3_holiday_pay_policy_default
DROP TRIGGER IF EXISTS audit_c3_holiday_pay_default_to_system ON public.c3_holiday_pay_policy_default;
CREATE TRIGGER audit_c3_holiday_pay_default_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_holiday_pay_policy_default
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();

-- Attach to c3_holiday_pay_policy_exceptions
DROP TRIGGER IF EXISTS audit_c3_holiday_pay_exceptions_to_system ON public.c3_holiday_pay_policy_exceptions;
CREATE TRIGGER audit_c3_holiday_pay_exceptions_to_system
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_holiday_pay_policy_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_c3_config_to_system_audit();
