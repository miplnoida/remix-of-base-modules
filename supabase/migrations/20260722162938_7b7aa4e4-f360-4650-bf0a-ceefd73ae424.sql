
CREATE OR REPLACE FUNCTION public.comm_hub_diff_manifests(p_certified jsonb, p_current jsonb)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  v_changes text[] := ARRAY[]::text[];
  cd jsonb := coalesce(p_certified->'dependencies','{}'::jsonb);
  nd jsonb := coalesce(p_current->'dependencies','{}'::jsonb);
BEGIN
  IF (p_certified->>'manifest_builder_version') IS DISTINCT FROM (p_current->>'manifest_builder_version') THEN v_changes := v_changes || ARRAY['MANIFEST_BUILDER_CHANGED']::text[]; END IF;
  IF (p_certified->>'canonical_renderer_version') IS DISTINCT FROM (p_current->>'canonical_renderer_version') THEN v_changes := v_changes || ARRAY['RENDERER_VERSION_CHANGED']::text[]; END IF;
  IF (p_certified->>'security_policy_version') IS DISTINCT FROM (p_current->>'security_policy_version') THEN v_changes := v_changes || ARRAY['SECURITY_POLICY_CHANGED']::text[]; END IF;
  IF (p_certified->>'template_type_policy_version') IS DISTINCT FROM (p_current->>'template_type_policy_version') THEN v_changes := v_changes || ARRAY['TYPE_CHANNEL_POLICY_CHANGED']::text[]; END IF;
  IF (cd->>'subject_hash') IS DISTINCT FROM (nd->>'subject_hash')
     OR (cd->>'body_html_hash') IS DISTINCT FROM (nd->>'body_html_hash')
     OR (cd->>'body_text_hash') IS DISTINCT FROM (nd->>'body_text_hash') THEN v_changes := v_changes || ARRAY['TEMPLATE_CONTENT_CHANGED']::text[]; END IF;
  IF (cd->>'template_version_no') IS DISTINCT FROM (nd->>'template_version_no')
     OR (cd->>'template_version_status') IS DISTINCT FROM (nd->>'template_version_status') THEN v_changes := v_changes || ARRAY['TEMPLATE_VERSION_CHANGED']::text[]; END IF;
  IF (cd->>'template_purpose') IS DISTINCT FROM (nd->>'template_purpose') THEN v_changes := v_changes || ARRAY['TEMPLATE_PURPOSE_CHANGED']::text[]; END IF;
  IF (cd->>'template_type') IS DISTINCT FROM (nd->>'template_type') THEN v_changes := v_changes || ARRAY['TEMPLATE_TYPE_CHANGED']::text[]; END IF;
  IF (cd->>'layout_id') IS DISTINCT FROM (nd->>'layout_id') THEN v_changes := v_changes || ARRAY['LAYOUT_CHANGED']::text[]; END IF;
  IF (cd->'sections') IS DISTINCT FROM (nd->'sections') THEN v_changes := v_changes || ARRAY['SECTION_CHANGED']::text[]; END IF;
  IF (cd->'variable_bindings') IS DISTINCT FROM (nd->'variable_bindings') THEN v_changes := v_changes || ARRAY['VARIABLE_CONTRACT_CHANGED']::text[]; END IF;
  IF (cd->'event_mapping') IS DISTINCT FROM (nd->'event_mapping') THEN v_changes := v_changes || ARRAY['EVENT_MAPPING_CHANGED']::text[]; END IF;
  IF (cd->'sender_readiness') IS DISTINCT FROM (nd->'sender_readiness') THEN v_changes := v_changes || ARRAY['SENDER_READINESS_CHANGED']::text[]; END IF;
  IF array_length(v_changes,1) IS NULL
     AND public.compute_comm_hub_dependency_hash(p_certified) IS DISTINCT FROM public.compute_comm_hub_dependency_hash(p_current)
  THEN v_changes := v_changes || ARRAY['DEPENDENCY_HASH_MISMATCH_UNCATEGORISED']::text[]; END IF;
  RETURN v_changes;
END $$;
