
CREATE OR REPLACE FUNCTION public._comm_hub_ensure_event_governance_record(p_mapping_id uuid, p_manifest_hash text)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_mapping_id IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM comm_hub_governance_record
   WHERE entity_type='EVENT_TEMPLATE_MAPPING' AND entity_id=p_mapping_id
   ORDER BY updated_at DESC LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO comm_hub_governance_record(entity_type,entity_id,governance_status,dependency_hash,dependency_manifest,reason)
    VALUES ('EVENT_TEMPLATE_MAPPING',p_mapping_id,'DRAFT',p_manifest_hash,'{}'::jsonb,'auto-created by go-live runner')
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END; $$;
