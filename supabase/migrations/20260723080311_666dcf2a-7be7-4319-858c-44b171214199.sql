CREATE OR REPLACE FUNCTION public.build_comm_hub_certification_dependency_hash(p_template_version_id uuid)
RETURNS TABLE(dependency_hash text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_manifest jsonb;
  v_hash text;
BEGIN
  IF p_template_version_id IS NULL THEN
    RETURN QUERY SELECT NULL::text; RETURN;
  END IF;
  BEGIN
    v_manifest := public.build_comm_hub_template_dependency_manifest(p_template_version_id);
    v_hash := public.compute_comm_hub_dependency_hash(v_manifest);
  EXCEPTION WHEN OTHERS THEN
    v_hash := NULL;
  END;
  RETURN QUERY SELECT v_hash;
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_comm_hub_certification_dependency_hash(uuid) TO authenticated, service_role;