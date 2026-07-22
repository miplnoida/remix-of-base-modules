
-- Same B2 migration as before, with pgcrypto digest qualified as extensions.digest.

CREATE TABLE IF NOT EXISTS public.comm_hub_certification_freshness (
  certification_id uuid PRIMARY KEY REFERENCES public.comm_hub_certification(id) ON DELETE CASCADE,
  freshness_status text NOT NULL DEFAULT 'NOT_EVALUATED'
    CHECK (freshness_status IN ('CURRENT','POSSIBLY_STALE','STALE','NOT_EVALUATED','SUPERSEDED')),
  certified_dependency_hash text NOT NULL,
  current_dependency_hash text,
  current_manifest_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_dependency_categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  stale_reason_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_evaluated_at timestamptz,
  last_evaluated_source text,
  stale_detected_at timestamptz,
  evaluation_version text NOT NULL DEFAULT '1',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chg_freshness_status
  ON public.comm_hub_certification_freshness(freshness_status)
  WHERE freshness_status IN ('POSSIBLY_STALE','STALE');
GRANT SELECT ON public.comm_hub_certification_freshness TO authenticated;
GRANT ALL   ON public.comm_hub_certification_freshness TO service_role;
ALTER TABLE public.comm_hub_certification_freshness ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chg_freshness_admin_read ON public.comm_hub_certification_freshness;
CREATE POLICY chg_freshness_admin_read
  ON public.comm_hub_certification_freshness
  FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid())
         OR EXISTS (SELECT 1 FROM public.user_roles
                    WHERE user_id = auth.uid() AND role = 'Admin'));

CREATE OR REPLACE FUNCTION public.comm_hub_canonical_jsonb(p jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p) = 'object' THEN
      COALESCE((SELECT jsonb_object_agg(k, public.comm_hub_canonical_jsonb(v) ORDER BY k)
                  FROM jsonb_each(p) AS e(k, v)
                 WHERE v IS NOT NULL AND jsonb_typeof(v) <> 'null'),
               '{}'::jsonb)
    WHEN jsonb_typeof(p) = 'array' THEN
      COALESCE((SELECT jsonb_agg(public.comm_hub_canonical_jsonb(v))
                  FROM jsonb_array_elements(p) AS a(v)),
               '[]'::jsonb)
    ELSE p
  END
$$;

CREATE OR REPLACE FUNCTION public.compute_comm_hub_dependency_hash(p_manifest jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public, extensions
AS $$
  SELECT encode(extensions.digest(convert_to(public.comm_hub_canonical_jsonb(p_manifest)::text, 'UTF8'), 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.build_comm_hub_dependency_manifest(
  p_entity_type text, p_entity_id uuid, p_entity_version_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public, extensions
AS $$
DECLARE
  v_manifest jsonb := jsonb_build_object(
    'manifest_schema_version', 1,
    'manifest_builder_version', '2026.07.22.b2.1',
    'canonical_renderer_version', '2026.07.22.canonical.1',
    'security_policy_version', '1',
    'template_type_policy_version', '1',
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'entity_version_id', p_entity_version_id,
    'dependencies', '{}'::jsonb,
    'dependency_categories', '[]'::jsonb,
    'warnings', '[]'::jsonb,
    'build_status', 'OK'
  );
  v_missing text[] := ARRAY[]::text[];
  v_deps jsonb := '{}'::jsonb;
  v_cats text[] := ARRAY[]::text[];
  v_purpose text;
  v_template record;
  v_version record;
  v_mapping record;
BEGIN
  IF p_entity_type = 'TEMPLATE_VERSION' THEN
    SELECT id, template_id, version_no, status, subject, body_html, body_text, layout_id
      INTO v_version FROM public.core_template_version WHERE id = p_entity_id;

    IF NOT FOUND THEN
      v_missing := v_missing || 'DEPENDENCY_TEMPLATE_VERSION_MISSING';
    ELSE
      SELECT id, code, template_type, status, module_code, country_code, institution_code
        INTO v_template FROM public.core_template WHERE id = v_version.template_id;

      v_purpose := public.comm_hub_classify_template_purpose(v_template.id);

      v_deps := jsonb_build_object(
        'template_id', v_template.id,
        'template_code', v_template.code,
        'template_type', v_template.template_type,
        'template_status', upper(coalesce(v_template.status,'')),
        'module_code', v_template.module_code,
        'country_code', v_template.country_code,
        'institution_code', v_template.institution_code,
        'template_purpose', v_purpose,
        'template_version_id', v_version.id,
        'template_version_no', v_version.version_no,
        'template_version_status', upper(coalesce(v_version.status,'')),
        'subject_hash', encode(extensions.digest(convert_to(coalesce(v_version.subject,''),'UTF8'),'sha256'),'hex'),
        'body_html_hash', encode(extensions.digest(convert_to(coalesce(v_version.body_html,''),'UTF8'),'sha256'),'hex'),
        'body_text_hash', encode(extensions.digest(convert_to(coalesce(v_version.body_text,''),'UTF8'),'sha256'),'hex'),
        'layout_id', v_version.layout_id
      );
      v_cats := ARRAY['TEMPLATE_CONTENT','TEMPLATE_VERSION','TEMPLATE_PURPOSE','TEMPLATE_TYPE'];

      v_deps := v_deps || jsonb_build_object(
        'sections', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', s.id,
            'section_key', s.section_key,
            'section_order', s.section_order,
            'content_hash', encode(extensions.digest(convert_to(coalesce(s.content,''),'UTF8'),'sha256'),'hex')
          ) ORDER BY s.section_order NULLS LAST, s.id)
          FROM public.core_template_section s WHERE s.version_id = v_version.id
        ), '[]'::jsonb));
      v_cats := v_cats || 'SECTION';

      v_deps := v_deps || jsonb_build_object(
        'variable_bindings', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', vb.id,
            'variable_name', vb.variable_name,
            'binding_hash', encode(extensions.digest(convert_to(coalesce(vb.binding_expression,''),'UTF8'),'sha256'),'hex')
          ) ORDER BY vb.variable_name, vb.id)
          FROM public.core_template_variable_binding vb WHERE vb.template_version_id = v_version.id
        ), '[]'::jsonb));
      v_cats := v_cats || 'VARIABLE_CONTRACT';

      IF v_purpose = 'EVENT_COMMUNICATION' THEN
        SELECT id, module_code, event_code, channel, sender_profile_id, active, risk_level
          INTO v_mapping FROM public.communication_hub_event_template_map
         WHERE template_id = v_template.id AND active = true
         ORDER BY module_code, event_code, channel LIMIT 1;
        IF NOT FOUND THEN
          v_missing := v_missing || 'DEPENDENCY_MAPPING_MISSING';
        ELSE
          v_deps := v_deps || jsonb_build_object(
            'event_mapping', jsonb_build_object(
              'id', v_mapping.id,
              'module_code', v_mapping.module_code,
              'event_code', v_mapping.event_code,
              'channel', lower(v_mapping.channel),
              'sender_profile_id', v_mapping.sender_profile_id,
              'risk_level', v_mapping.risk_level
            ));
          v_cats := v_cats || ARRAY['EVENT_MAPPING','SENDER_CONFIGURATION'];

          v_deps := v_deps || jsonb_build_object(
            'sender_readiness', COALESCE((
              SELECT jsonb_build_object(
                'sender_profile_id', sr.sender_profile_id,
                'sender_version', sr.sender_version,
                'readiness_state', sr.readiness_state,
                'state_hash', encode(extensions.digest(convert_to(coalesce(sr.readiness_state::text,''),'UTF8'),'sha256'),'hex')
              )
              FROM public.comm_hub_sender_readiness sr
              WHERE sr.sender_profile_id = v_mapping.sender_profile_id
              ORDER BY sr.computed_at DESC LIMIT 1
            ), 'null'::jsonb));
          v_cats := v_cats || 'SENDER_READINESS';
        END IF;
      ELSIF v_purpose IS NULL OR v_purpose = 'UNCLASSIFIED' THEN
        v_missing := v_missing || 'TEMPLATE_PURPOSE_UNCLASSIFIED';
      END IF;

      v_manifest := v_manifest
        || jsonb_build_object('template_purpose', v_purpose)
        || jsonb_build_object('module_code', v_template.module_code)
        || jsonb_build_object('dependencies', v_deps)
        || jsonb_build_object('dependency_categories', to_jsonb(
             (SELECT array_agg(DISTINCT c ORDER BY c) FROM unnest(v_cats) c)));
    END IF;
  ELSE
    v_manifest := v_manifest || jsonb_build_object(
      'dependencies', jsonb_build_object(
        'entity_type', p_entity_type,
        'entity_id', p_entity_id,
        'entity_version_id', p_entity_version_id));
  END IF;

  IF array_length(v_missing,1) IS NOT NULL THEN
    v_manifest := v_manifest
      || jsonb_build_object('build_status','BLOCKED')
      || jsonb_build_object('missing_dependencies', to_jsonb(v_missing));
  END IF;

  RETURN v_manifest;
END $$;

REVOKE ALL ON FUNCTION public.build_comm_hub_dependency_manifest(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_comm_hub_dependency_manifest(text,uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.comm_hub_diff_manifests(p_certified jsonb, p_current jsonb)
RETURNS text[] LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  v_changes text[] := ARRAY[]::text[];
  cd jsonb := coalesce(p_certified->'dependencies','{}'::jsonb);
  nd jsonb := coalesce(p_current->'dependencies','{}'::jsonb);
BEGIN
  IF (p_certified->>'manifest_builder_version') IS DISTINCT FROM (p_current->>'manifest_builder_version') THEN v_changes := v_changes || 'MANIFEST_BUILDER_CHANGED'; END IF;
  IF (p_certified->>'canonical_renderer_version') IS DISTINCT FROM (p_current->>'canonical_renderer_version') THEN v_changes := v_changes || 'RENDERER_VERSION_CHANGED'; END IF;
  IF (p_certified->>'security_policy_version') IS DISTINCT FROM (p_current->>'security_policy_version') THEN v_changes := v_changes || 'SECURITY_POLICY_CHANGED'; END IF;
  IF (p_certified->>'template_type_policy_version') IS DISTINCT FROM (p_current->>'template_type_policy_version') THEN v_changes := v_changes || 'TYPE_CHANNEL_POLICY_CHANGED'; END IF;
  IF (cd->>'subject_hash') IS DISTINCT FROM (nd->>'subject_hash')
     OR (cd->>'body_html_hash') IS DISTINCT FROM (nd->>'body_html_hash')
     OR (cd->>'body_text_hash') IS DISTINCT FROM (nd->>'body_text_hash') THEN v_changes := v_changes || 'TEMPLATE_CONTENT_CHANGED'; END IF;
  IF (cd->>'template_version_no') IS DISTINCT FROM (nd->>'template_version_no')
     OR (cd->>'template_version_status') IS DISTINCT FROM (nd->>'template_version_status') THEN v_changes := v_changes || 'TEMPLATE_VERSION_CHANGED'; END IF;
  IF (cd->>'template_purpose') IS DISTINCT FROM (nd->>'template_purpose') THEN v_changes := v_changes || 'TEMPLATE_PURPOSE_CHANGED'; END IF;
  IF (cd->>'template_type') IS DISTINCT FROM (nd->>'template_type') THEN v_changes := v_changes || 'TEMPLATE_TYPE_CHANGED'; END IF;
  IF (cd->>'layout_id') IS DISTINCT FROM (nd->>'layout_id') THEN v_changes := v_changes || 'LAYOUT_CHANGED'; END IF;
  IF (cd->'sections') IS DISTINCT FROM (nd->'sections') THEN v_changes := v_changes || 'SECTION_CHANGED'; END IF;
  IF (cd->'variable_bindings') IS DISTINCT FROM (nd->'variable_bindings') THEN v_changes := v_changes || 'VARIABLE_CONTRACT_CHANGED'; END IF;
  IF (cd->'event_mapping') IS DISTINCT FROM (nd->'event_mapping') THEN v_changes := v_changes || 'EVENT_MAPPING_CHANGED'; END IF;
  IF (cd->'sender_readiness') IS DISTINCT FROM (nd->'sender_readiness') THEN v_changes := v_changes || 'SENDER_READINESS_CHANGED'; END IF;
  IF array_length(v_changes,1) IS NULL
     AND public.compute_comm_hub_dependency_hash(p_certified) IS DISTINCT FROM public.compute_comm_hub_dependency_hash(p_current)
  THEN v_changes := v_changes || 'DEPENDENCY_HASH_MISMATCH_UNCATEGORISED'; END IF;
  RETURN v_changes;
END $$;

REVOKE ALL ON FUNCTION public.comm_hub_diff_manifests(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comm_hub_diff_manifests(jsonb,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_comm_hub_certification_freshness(p_certification_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_cert record; v_current jsonb; v_current_hash text; v_status text; v_changes text[];
BEGIN
  SELECT id, entity_type::text AS entity_type, entity_id, entity_version,
         dependency_manifest, dependency_hash, superseded_by
    INTO v_cert FROM public.comm_hub_certification WHERE id = p_certification_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='CERTIFICATION_NOT_FOUND'; END IF;
  IF v_cert.superseded_by IS NOT NULL THEN
    RETURN jsonb_build_object(
      'certification_id', v_cert.id, 'entity_type', v_cert.entity_type,
      'entity_id', v_cert.entity_id, 'certified_hash', v_cert.dependency_hash,
      'freshness_status', 'SUPERSEDED', 'changed_dependency_categories', '[]'::jsonb,
      'recommended_action', 'REVIEW_SUCCESSOR_CERTIFICATION', 'evaluated_at', now());
  END IF;
  v_current := public.build_comm_hub_dependency_manifest(v_cert.entity_type, v_cert.entity_id, NULL);
  v_current_hash := public.compute_comm_hub_dependency_hash(v_current);
  v_changes := public.comm_hub_diff_manifests(v_cert.dependency_manifest, v_current);
  IF (v_current->>'build_status') = 'BLOCKED' THEN v_status := 'STALE';
  ELSIF v_current_hash = v_cert.dependency_hash THEN v_status := 'CURRENT';
  ELSE v_status := 'STALE'; END IF;
  RETURN jsonb_build_object(
    'certification_id', v_cert.id, 'entity_type', v_cert.entity_type,
    'entity_id', v_cert.entity_id, 'entity_version', v_cert.entity_version,
    'certified_hash', v_cert.dependency_hash, 'current_hash', v_current_hash,
    'freshness_status', v_status,
    'changed_dependency_categories', to_jsonb(v_changes),
    'stale_reason_codes', coalesce(v_current->'missing_dependencies','[]'::jsonb),
    'evaluated_at', now(),
    'recommended_action', CASE WHEN v_status='CURRENT' THEN 'NONE' ELSE 'RECERTIFY' END);
END $$;

REVOKE ALL ON FUNCTION public.check_comm_hub_certification_freshness(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_comm_hub_certification_freshness(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_comm_hub_certification_freshness(
  p_certification_id uuid, p_source text DEFAULT 'manual'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_eval jsonb; v_status text;
BEGIN
  v_eval := public.check_comm_hub_certification_freshness(p_certification_id);
  v_status := v_eval->>'freshness_status';
  INSERT INTO public.comm_hub_certification_freshness(
    certification_id, freshness_status, certified_dependency_hash,
    current_dependency_hash, current_manifest_summary,
    changed_dependency_categories, stale_reason_codes,
    last_evaluated_at, last_evaluated_source, stale_detected_at, updated_at)
  VALUES (p_certification_id, v_status,
    v_eval->>'certified_hash', v_eval->>'current_hash',
    jsonb_build_object('categories', v_eval->'changed_dependency_categories'),
    ARRAY(SELECT jsonb_array_elements_text(coalesce(v_eval->'changed_dependency_categories','[]'::jsonb))),
    ARRAY(SELECT jsonb_array_elements_text(coalesce(v_eval->'stale_reason_codes','[]'::jsonb))),
    now(), p_source,
    CASE WHEN v_status IN ('STALE','POSSIBLY_STALE') THEN now() ELSE NULL END, now())
  ON CONFLICT (certification_id) DO UPDATE
    SET freshness_status = EXCLUDED.freshness_status,
        current_dependency_hash = EXCLUDED.current_dependency_hash,
        current_manifest_summary = EXCLUDED.current_manifest_summary,
        changed_dependency_categories = EXCLUDED.changed_dependency_categories,
        stale_reason_codes = EXCLUDED.stale_reason_codes,
        last_evaluated_at = EXCLUDED.last_evaluated_at,
        last_evaluated_source = EXCLUDED.last_evaluated_source,
        stale_detected_at = CASE
          WHEN EXCLUDED.freshness_status IN ('STALE','POSSIBLY_STALE')
               AND public.comm_hub_certification_freshness.stale_detected_at IS NULL THEN now()
          WHEN EXCLUDED.freshness_status = 'CURRENT' THEN NULL
          ELSE public.comm_hub_certification_freshness.stale_detected_at
        END,
        updated_at = now();
  RETURN v_eval;
END $$;
REVOKE ALL ON FUNCTION public.refresh_comm_hub_certification_freshness(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_comm_hub_certification_freshness(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_comm_hub_certifications_possibly_stale(
  p_entity_type text, p_entity_id uuid, p_category text DEFAULT 'DEPENDENCY_CHANGED'
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer := 0; v_cert_id uuid;
BEGIN
  FOR v_cert_id IN
    SELECT c.id FROM public.comm_hub_certification c
     WHERE c.entity_type::text = p_entity_type AND c.entity_id = p_entity_id AND c.superseded_by IS NULL
  LOOP
    INSERT INTO public.comm_hub_certification_freshness(
      certification_id, freshness_status, certified_dependency_hash,
      changed_dependency_categories, stale_reason_codes,
      last_evaluated_source, stale_detected_at, updated_at)
    SELECT v_cert_id, 'POSSIBLY_STALE', c.dependency_hash,
           ARRAY[p_category], ARRAY[p_category], 'trigger_invalidation', now(), now()
      FROM public.comm_hub_certification c WHERE c.id = v_cert_id
    ON CONFLICT (certification_id) DO UPDATE
      SET freshness_status = CASE WHEN public.comm_hub_certification_freshness.freshness_status='CURRENT'
                                  THEN 'POSSIBLY_STALE'
                                  ELSE public.comm_hub_certification_freshness.freshness_status END,
          changed_dependency_categories =
            (SELECT array_agg(DISTINCT c) FROM unnest(public.comm_hub_certification_freshness.changed_dependency_categories || ARRAY[p_category]) c),
          stale_reason_codes =
            (SELECT array_agg(DISTINCT c) FROM unnest(public.comm_hub_certification_freshness.stale_reason_codes || ARRAY[p_category]) c),
          stale_detected_at = COALESCE(public.comm_hub_certification_freshness.stale_detected_at, now()),
          updated_at = now();
    v_count := v_count + 1;
  END LOOP;

  IF p_entity_type IN ('CORE_TEMPLATE','CORE_TEMPLATE_SECTION','CORE_TEMPLATE_LAYOUT',
                       'EVENT_TEMPLATE_MAP','EVENT_PAYLOAD_SCHEMA','EVENT_PAYLOAD_FIELD',
                       'EVENT_TEST_SCENARIO','SENDER_PROFILE','EVENT_SEND_POLICY',
                       'EVENT_REVIEW_POLICY','TEMPLATE_VARIABLE_CONTRACT','SENDER_READINESS') THEN
    FOR v_cert_id IN
      SELECT c.id FROM public.comm_hub_certification c
       WHERE c.entity_type = 'TEMPLATE_VERSION' AND c.superseded_by IS NULL
         AND (
           c.dependency_manifest #>> '{dependencies,template_id}' = p_entity_id::text
           OR c.dependency_manifest #>> '{dependencies,layout_id}' = p_entity_id::text
           OR c.dependency_manifest #>> '{dependencies,event_mapping,id}' = p_entity_id::text
           OR c.dependency_manifest #>> '{dependencies,event_mapping,sender_profile_id}' = p_entity_id::text
           OR c.dependency_manifest -> 'dependencies' -> 'sections' @> jsonb_build_array(jsonb_build_object('id', p_entity_id))
           OR c.dependency_manifest -> 'dependencies' -> 'variable_bindings' @> jsonb_build_array(jsonb_build_object('id', p_entity_id))
         )
    LOOP
      INSERT INTO public.comm_hub_certification_freshness(
        certification_id, freshness_status, certified_dependency_hash,
        changed_dependency_categories, stale_reason_codes,
        last_evaluated_source, stale_detected_at, updated_at)
      SELECT v_cert_id, 'POSSIBLY_STALE', c.dependency_hash,
             ARRAY[p_category], ARRAY[p_category], 'trigger_invalidation', now(), now()
        FROM public.comm_hub_certification c WHERE c.id = v_cert_id
      ON CONFLICT (certification_id) DO UPDATE
        SET freshness_status = CASE WHEN public.comm_hub_certification_freshness.freshness_status='CURRENT'
                                    THEN 'POSSIBLY_STALE'
                                    ELSE public.comm_hub_certification_freshness.freshness_status END,
            changed_dependency_categories =
              (SELECT array_agg(DISTINCT c) FROM unnest(public.comm_hub_certification_freshness.changed_dependency_categories || ARRAY[p_category]) c),
            stale_reason_codes =
              (SELECT array_agg(DISTINCT c) FROM unnest(public.comm_hub_certification_freshness.stale_reason_codes || ARRAY[p_category]) c),
            stale_detected_at = COALESCE(public.comm_hub_certification_freshness.stale_detected_at, now()),
            updated_at = now();
      v_count := v_count + 1;
    END LOOP;
  END IF;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.mark_comm_hub_certifications_possibly_stale(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_comm_hub_certifications_possibly_stale(text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_comm_hub_invalidate_dependency()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type text := TG_ARGV[0]; v_category text := TG_ARGV[1]; v_id uuid;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  PERFORM public.mark_comm_hub_certifications_possibly_stale(v_type, v_id, v_category);
  IF v_type = 'CORE_TEMPLATE_SECTION' THEN
    PERFORM public.mark_comm_hub_certifications_possibly_stale(
      'TEMPLATE_VERSION', COALESCE(NEW.version_id, OLD.version_id), v_category);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_chg_inv_core_template_version') THEN
    CREATE TRIGGER trg_chg_inv_core_template_version AFTER INSERT OR UPDATE OR DELETE ON public.core_template_version
      FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_invalidate_dependency('TEMPLATE_VERSION','TEMPLATE_CONTENT_CHANGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_chg_inv_core_template_section') THEN
    CREATE TRIGGER trg_chg_inv_core_template_section AFTER INSERT OR UPDATE OR DELETE ON public.core_template_section
      FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_invalidate_dependency('CORE_TEMPLATE_SECTION','SECTION_CHANGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_chg_inv_evt_map') THEN
    CREATE TRIGGER trg_chg_inv_evt_map AFTER INSERT OR UPDATE OR DELETE ON public.communication_hub_event_template_map
      FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_invalidate_dependency('EVENT_TEMPLATE_MAP','EVENT_MAPPING_CHANGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_chg_inv_sender_readiness') THEN
    CREATE TRIGGER trg_chg_inv_sender_readiness AFTER INSERT OR UPDATE ON public.comm_hub_sender_readiness
      FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_invalidate_dependency('SENDER_READINESS','SENDER_READINESS_CHANGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_chg_inv_var_binding') THEN
    CREATE TRIGGER trg_chg_inv_var_binding AFTER INSERT OR UPDATE OR DELETE ON public.core_template_variable_binding
      FOR EACH ROW EXECUTE FUNCTION public.trg_comm_hub_invalidate_dependency('TEMPLATE_VARIABLE_CONTRACT','VARIABLE_CONTRACT_CHANGED');
  END IF;
END $$;

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
    SELECT gr.entity_id AS tv_id, gr.governance_status, gr.classification,
           t.id AS tmpl_id, t.code AS tmpl_code
      FROM public.comm_hub_governance_record gr
      JOIN public.core_template_version tv ON tv.id = gr.entity_id
      JOIN public.core_template t ON t.id = tv.template_id
     WHERE gr.entity_type = 'TEMPLATE_VERSION'
  LOOP
    v_manifest := public.build_comm_hub_dependency_manifest('TEMPLATE_VERSION', r.tv_id, NULL);
    v_hash := CASE WHEN (v_manifest->>'build_status')='OK'
                   THEN public.compute_comm_hub_dependency_hash(v_manifest) ELSE NULL END;
    SELECT id INTO v_cert_id FROM public.comm_hub_certification
     WHERE entity_type='TEMPLATE_VERSION' AND entity_id = r.tv_id AND superseded_by IS NULL
     ORDER BY certified_at DESC LIMIT 1;
    v_fresh := COALESCE((SELECT freshness_status FROM public.comm_hub_certification_freshness
                          WHERE certification_id = v_cert_id), 'NOT_EVALUATED');
    RETURN QUERY SELECT
      r.tv_id, r.tmpl_id, r.tmpl_code,
      v_manifest->>'template_purpose', r.governance_status, r.classification,
      v_manifest->>'build_status', v_hash,
      ARRAY(SELECT jsonb_array_elements_text(coalesce(v_manifest->'missing_dependencies','[]'::jsonb))),
      (v_cert_id IS NOT NULL), v_fresh,
      CASE WHEN (v_manifest->>'build_status')='BLOCKED' THEN 'RESOLVE_MISSING_DEPENDENCIES'
           WHEN v_cert_id IS NULL THEN 'CERTIFY'
           WHEN v_fresh IN ('STALE','POSSIBLY_STALE') THEN 'RECERTIFY'
           ELSE 'NONE' END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.assess_comm_hub_template_version_manifests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assess_comm_hub_template_version_manifests() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
