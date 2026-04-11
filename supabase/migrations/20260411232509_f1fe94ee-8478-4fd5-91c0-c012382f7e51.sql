
CREATE OR REPLACE FUNCTION public.fn_ce_log_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
    entity_type, entity_id, action, performed_by, old_values, new_values
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
