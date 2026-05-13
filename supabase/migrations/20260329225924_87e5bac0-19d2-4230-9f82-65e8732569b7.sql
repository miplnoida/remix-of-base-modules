CREATE OR REPLACE FUNCTION public.fn_audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_entity_id text;
  v_before_value jsonb;
  v_after_value jsonb;
  v_old_json jsonb;
  v_new_json jsonb;
  v_changed_fields jsonb := '[]'::jsonb;
  v_key text;
  v_has_changes boolean := false;
  v_skip_fields text[] := ARRAY['updated_at','modified_date','updated_by','modified_by','created_at','created_by'];
  v_user_id uuid;
  v_user_code text := 'SYSTEM';
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
  END IF;

  -- Resolve entity_id from common PK patterns
  IF TG_OP IN ('UPDATE','DELETE') THEN
    v_old_json := to_jsonb(OLD);
    v_entity_id := COALESCE(
      v_old_json->>'id',
      v_old_json->>'receipt_id',
      v_old_json->>'payment_id',
      v_old_json->>'batch_number',
      v_old_json->>'setting_key',
      v_old_json->>'audit_id'
    );
  END IF;

  IF TG_OP IN ('INSERT','UPDATE') THEN
    v_new_json := to_jsonb(NEW);
    IF v_entity_id IS NULL THEN
      v_entity_id := COALESCE(
        v_new_json->>'id',
        v_new_json->>'receipt_id',
        v_new_json->>'payment_id',
        v_new_json->>'batch_number',
        v_new_json->>'setting_key',
        v_new_json->>'audit_id'
      );
    END IF;
  END IF;

  -- Resolve user identity
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Try to resolve user_code from modified_by or profiles
  IF TG_OP = 'UPDATE' AND v_new_json IS NOT NULL AND v_new_json->>'modified_by' IS NOT NULL THEN
    v_user_code := v_new_json->>'modified_by';
  ELSIF TG_OP = 'INSERT' AND v_new_json IS NOT NULL AND v_new_json->>'created_by' IS NOT NULL THEN
    v_user_code := v_new_json->>'created_by';
  ELSIF v_user_id IS NOT NULL THEN
    SELECT COALESCE(p.user_code, 'SYSTEM') INTO v_user_code
    FROM public.profiles p WHERE p.id = v_user_id;
  END IF;

  -- Compute before/after values
  IF TG_OP = 'UPDATE' THEN
    -- Store FULL rows for complete context
    v_before_value := v_old_json;
    v_after_value := v_new_json;

    -- Compute changed_fields array for UI highlighting
    FOR v_key IN SELECT jsonb_object_keys(v_new_json) LOOP
      IF v_key = ANY(v_skip_fields) THEN CONTINUE; END IF;
      IF (v_old_json->v_key)::text IS DISTINCT FROM (v_new_json->v_key)::text THEN
        v_changed_fields := v_changed_fields || to_jsonb(v_key);
        v_has_changes := true;
      END IF;
    END LOOP;

    -- Skip audit if no actual changes
    IF NOT v_has_changes THEN
      RETURN NEW;
    END IF;

  ELSIF TG_OP = 'INSERT' THEN
    v_before_value := NULL;
    v_after_value := v_new_json;
  ELSIF TG_OP = 'DELETE' THEN
    v_before_value := v_old_json;
    v_after_value := NULL;
  END IF;

  -- Insert audit record with changed_fields in payload_json
  INSERT INTO public.system_audit_trail (
    id, timestamp, user_id, user_name, action,
    entity_type, entity_id, module,
    before_value, after_value, payload_json, severity
  ) VALUES (
    gen_random_uuid(), now(), v_user_id, v_user_code, v_action,
    TG_TABLE_NAME, v_entity_id, TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_before_value, v_after_value,
    jsonb_build_object(
      'source', 'db_trigger',
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'changed_fields', v_changed_fields
    ),
    'info'
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;