
CREATE OR REPLACE FUNCTION public.assess_comm_hub_template_version_manifests()
RETURNS TABLE(
  template_version_id uuid, template_id uuid, template_code text,
  template_purpose text, governance_status text, classification text,
  manifest_build_status text, current_dependency_hash text,
  missing_dependencies text[], has_certification boolean,
  freshness_status text, recommended_action text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r record; v_manifest jsonb; v_hash text; v_cert_id uuid; v_fresh text;
BEGIN
  FOR r IN
    SELECT gr.entity_id AS tv_id, gr.governance_status AS gs, gr.classification AS cls,
           t.id AS tmpl_id, t.code AS tmpl_code
      FROM public.comm_hub_governance_record gr
      JOIN public.core_template_version tv ON tv.id = gr.entity_id
      JOIN public.core_template t ON t.id = tv.template_id
     WHERE gr.entity_type = 'TEMPLATE_VERSION'
  LOOP
    v_manifest := public.build_comm_hub_dependency_manifest('TEMPLATE_VERSION', r.tv_id, NULL);
    v_hash := CASE WHEN (v_manifest->>'build_status')='OK'
                   THEN public.compute_comm_hub_dependency_hash(v_manifest) ELSE NULL END;
    SELECT c.id INTO v_cert_id FROM public.comm_hub_certification c
     WHERE c.entity_type='TEMPLATE_VERSION' AND c.entity_id = r.tv_id AND c.superseded_by IS NULL
     ORDER BY c.certified_at DESC LIMIT 1;
    v_fresh := COALESCE(
      (SELECT f.freshness_status FROM public.comm_hub_certification_freshness f
        WHERE f.certification_id = v_cert_id), 'NOT_EVALUATED');
    template_version_id := r.tv_id;
    template_id := r.tmpl_id;
    template_code := r.tmpl_code;
    template_purpose := v_manifest->>'template_purpose';
    governance_status := r.gs;
    classification := r.cls;
    manifest_build_status := v_manifest->>'build_status';
    current_dependency_hash := v_hash;
    missing_dependencies := ARRAY(SELECT jsonb_array_elements_text(coalesce(v_manifest->'missing_dependencies','[]'::jsonb)));
    has_certification := (v_cert_id IS NOT NULL);
    freshness_status := v_fresh;
    recommended_action := CASE WHEN (v_manifest->>'build_status')='BLOCKED' THEN 'RESOLVE_MISSING_DEPENDENCIES'
                               WHEN v_cert_id IS NULL THEN 'CERTIFY'
                               WHEN v_fresh IN ('STALE','POSSIBLY_STALE') THEN 'RECERTIFY'
                               ELSE 'NONE' END;
    RETURN NEXT;
  END LOOP;
END $$;
