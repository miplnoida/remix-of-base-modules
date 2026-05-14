
-- Fix audit_table_changes() to dynamically resolve entity_id for tables without an "id" column
CREATE OR REPLACE FUNCTION public.audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_user_name TEXT;
  v_before JSONB;
  v_after JSONB;
  v_row JSONB;
  v_entity_id TEXT;
BEGIN
  v_action := TG_OP;

  -- For UPDATEs, skip if no actual data changed (ignore updated_at/modified_date)
  IF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    -- Remove meta fields that always change
    v_before := v_before - 'updated_at' - 'modified_date' - 'updated_by' - 'modified_by';
    v_after := v_after - 'updated_at' - 'modified_date' - 'updated_by' - 'modified_by';
    -- If remaining fields are identical, skip the audit entry
    IF v_before = v_after THEN
      RETURN NEW;
    END IF;
    -- Reset to full values for logging
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  END IF;

  -- Resolve user from profiles
  SELECT user_code INTO v_user_name FROM public.profiles WHERE id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_before := NULL;
    v_after := to_jsonb(NEW);
  END IF;

  -- Dynamic entity_id resolution: check common PK column names
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_entity_id := COALESCE(
    v_row->>'id',
    v_row->>'receipt_id',
    v_row->>'payment_id',
    v_row->>'batch_id',
    v_row->>'audit_id',
    'unknown'
  );

  INSERT INTO public.system_audit_trail (
    action, entity_type, entity_id,
    before_value, after_value,
    user_name, user_id, module, severity
  ) VALUES (
    v_action, TG_TABLE_NAME,
    v_entity_id,
    v_before, v_after,
    COALESCE(v_user_name, 'SYSTEM'),
    auth.uid(),
    COALESCE(TG_ARGV[0], TG_TABLE_NAME),
    'info'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
