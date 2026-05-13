-- Drop the existing trigger on c3_config_periods that only writes to system_audit_trail
DROP TRIGGER IF EXISTS audit_c3_config_periods_to_system ON public.c3_config_periods;

-- Create a new combined trigger function that dual-writes to both audit tables
-- and properly resolves user_code (not UUID) from modified_by
CREATE OR REPLACE FUNCTION public.trg_c3_config_periods_dual_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
  v_field_name TEXT;
  v_entity_name TEXT;
  v_user_code TEXT;
  v_user_name TEXT;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_value := NULL;
    v_new_value := to_jsonb(NEW)::text;
    v_field_name := NULL;
    v_user_code := NEW.created_by;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      v_action := CASE WHEN NEW.is_active THEN 'ENABLE' ELSE 'DISABLE' END;
      v_field_name := 'is_active';
      v_old_value := OLD.is_active::text;
      v_new_value := NEW.is_active::text;
    ELSE
      v_action := 'UPDATE';
      v_field_name := NULL;
      v_old_value := to_jsonb(OLD)::text;
      v_new_value := to_jsonb(NEW)::text;
    END IF;
    v_user_code := NEW.modified_by;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_value := to_jsonb(OLD)::text;
    v_new_value := NULL;
    v_field_name := NULL;
    v_user_code := OLD.modified_by;
  END IF;

  v_entity_name := 'Period Config (' || 
    COALESCE(to_char(COALESCE(NEW.start_date, OLD.start_date), 'DD Mon YYYY'), '?') || ' - ' ||
    COALESCE(to_char(COALESCE(NEW.end_date, OLD.end_date), 'DD Mon YYYY'), 'Current') || ')';

  -- Resolve user_code to full_name and user id from profiles
  IF v_user_code IS NOT NULL AND v_user_code <> '' THEN
    SELECT id, full_name INTO v_user_id, v_user_name
    FROM public.profiles
    WHERE user_code = v_user_code
    LIMIT 1;
  END IF;

  -- Fallback to auth.uid()
  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := auth.uid();
      IF v_user_id IS NOT NULL THEN
        SELECT user_code, full_name INTO v_user_code, v_user_name
        FROM public.profiles WHERE id = v_user_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 1) Insert into c3_unified_audit_log (C3 Config audit tab)
  INSERT INTO public.c3_unified_audit_log (
    config_type, record_id, action, entity_name, field_name,
    old_value, new_value, changed_by, changed_by_name, changed_at, metadata
  ) VALUES (
    'period_config',
    COALESCE(NEW.id, OLD.id)::text,
    v_action,
    v_entity_name,
    v_field_name,
    v_old_value,
    v_new_value,
    COALESCE(v_user_code, v_user_id::text),
    v_user_name,
    NOW(),
    jsonb_build_object(
      'start_date', COALESCE(NEW.start_date, OLD.start_date),
      'end_date', COALESCE(NEW.end_date, OLD.end_date),
      'route', '/admin/c3-configuration',
      'module', 'C3 Configuration'
    )
  );

  -- 2) Insert into system_audit_trail (global System Monitoring)
  INSERT INTO public.system_audit_trail (
    user_id, user_name, action, entity_type, entity_id, module,
    before_value, after_value, severity, timestamp
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, v_user_code, 'SYSTEM'),
    v_action,
    'C3Configuration',
    COALESCE(NEW.id, OLD.id)::text,
    'C3 Configuration',
    CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) ELSE NULL END,
    'info',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in trg_c3_config_periods_dual_audit: % %', SQLERRM, SQLSTATE;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_c3_config_periods_dual
  AFTER INSERT OR UPDATE OR DELETE ON public.c3_config_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_c3_config_periods_dual_audit();

-- Fix c3_calculation_config trigger to resolve user_code properly (not just UUID)
CREATE OR REPLACE FUNCTION public.trg_audit_c3_calculation_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_old_value TEXT;
  v_new_value TEXT;
  v_field_name TEXT;
  v_entity_name TEXT;
  v_user_id UUID;
  v_user_code TEXT;
  v_user_name TEXT;
  v_raw_user TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_value := NULL;
    v_new_value := to_jsonb(NEW)::text;
    v_field_name := NULL;
    v_entity_name := NEW.display_name;
    v_raw_user := NEW.created_by;
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
    v_raw_user := NEW.updated_by;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_value := to_jsonb(OLD)::text;
    v_new_value := NULL;
    v_field_name := NULL;
    v_entity_name := OLD.display_name;
    v_raw_user := OLD.updated_by;
  END IF;

  -- Resolve user: try as user_code first, then UUID
  IF v_raw_user IS NOT NULL AND v_raw_user <> '' THEN
    SELECT id, user_code, full_name INTO v_user_id, v_user_code, v_user_name
    FROM public.profiles WHERE user_code = v_raw_user LIMIT 1;
    
    IF v_user_id IS NULL THEN
      BEGIN
        v_user_id := v_raw_user::uuid;
        SELECT user_code, full_name INTO v_user_code, v_user_name
        FROM public.profiles WHERE id = v_user_id;
      EXCEPTION WHEN OTHERS THEN v_user_id := NULL;
      END;
    END IF;
  END IF;

  -- Fallback to auth.uid()
  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := auth.uid();
      IF v_user_id IS NOT NULL THEN
        SELECT user_code, full_name INTO v_user_code, v_user_name
        FROM public.profiles WHERE id = v_user_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  INSERT INTO public.c3_unified_audit_log (
    config_type, record_id, action, entity_name, field_name,
    old_value, new_value, changed_by, changed_by_name, changed_at, metadata
  ) VALUES (
    'calculation_config',
    COALESCE(NEW.id, OLD.id)::text,
    v_action, v_entity_name, v_field_name,
    v_old_value, v_new_value,
    COALESCE(v_user_code, v_user_id::text),
    v_user_name,
    NOW(),
    jsonb_build_object('config_key', COALESCE(NEW.config_key, OLD.config_key), 'category', COALESCE(NEW.category, OLD.category), 'route', '/admin/c3-configuration', 'module', 'C3 Configuration')
  );

  INSERT INTO public.system_audit_trail (
    user_id, user_name, action, entity_type, entity_id, module,
    before_value, after_value, severity, timestamp
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, v_user_code, 'SYSTEM'),
    v_action, 'C3Configuration',
    COALESCE(NEW.id, OLD.id)::text,
    'C3 Configuration',
    CASE WHEN v_old_value IS NOT NULL THEN jsonb_build_object('config_key', COALESCE(OLD.config_key, NEW.config_key), 'display_name', COALESCE(OLD.display_name, NEW.display_name), 'value', v_old_value) ELSE NULL END,
    CASE WHEN v_new_value IS NOT NULL THEN jsonb_build_object('config_key', COALESCE(NEW.config_key, OLD.config_key), 'display_name', COALESCE(NEW.display_name, OLD.display_name), 'value', v_new_value) ELSE NULL END,
    'info', NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in trg_audit_c3_calculation_config: % %', SQLERRM, SQLSTATE;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix the generic trg_c3_config_to_system_audit to resolve user_code properly
CREATE OR REPLACE FUNCTION public.trg_c3_config_to_system_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_user_id UUID;
  v_user_code TEXT;
  v_user_name TEXT;
  v_record_id TEXT;
  v_modified_by TEXT;
BEGIN
  v_record_id := COALESCE(NEW.id, OLD.id)::text;

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    BEGIN v_modified_by := NEW.created_by; EXCEPTION WHEN OTHERS THEN v_modified_by := NULL; END;
  ELSIF TG_OP = 'UPDATE' THEN
    BEGIN
      IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        v_action := CASE WHEN NEW.is_active THEN 'ENABLE' ELSE 'DISABLE' END;
      ELSE
        v_action := 'UPDATE';
      END IF;
    EXCEPTION WHEN OTHERS THEN v_action := 'UPDATE'; END;
    BEGIN v_modified_by := NEW.modified_by; EXCEPTION WHEN OTHERS THEN v_modified_by := NULL; END;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    BEGIN v_modified_by := OLD.modified_by; EXCEPTION WHEN OTHERS THEN v_modified_by := NULL; END;
  END IF;

  -- Resolve: try user_code first, then UUID
  IF v_modified_by IS NOT NULL AND v_modified_by <> '' THEN
    SELECT id, full_name INTO v_user_id, v_user_name
    FROM public.profiles WHERE user_code = v_modified_by LIMIT 1;
    IF v_user_id IS NOT NULL THEN
      v_user_code := v_modified_by;
    ELSE
      BEGIN
        v_user_id := v_modified_by::uuid;
        SELECT user_code, full_name INTO v_user_code, v_user_name FROM public.profiles WHERE id = v_user_id;
      EXCEPTION WHEN OTHERS THEN v_user_id := NULL;
      END;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := auth.uid();
      IF v_user_id IS NOT NULL THEN
        SELECT user_code, full_name INTO v_user_code, v_user_name FROM public.profiles WHERE id = v_user_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  INSERT INTO public.system_audit_trail (
    user_id, user_name, action, entity_type, entity_id, module,
    before_value, after_value, severity, timestamp
  ) VALUES (
    v_user_id,
    COALESCE(v_user_name, v_user_code, v_modified_by, 'SYSTEM'),
    v_action, 'C3Configuration', v_record_id, 'C3 Configuration',
    CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) ELSE NULL END,
    'info', NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in trg_c3_config_to_system_audit for %: % %', TG_TABLE_NAME, SQLERRM, SQLSTATE;
  RETURN COALESCE(NEW, OLD);
END;
$$;