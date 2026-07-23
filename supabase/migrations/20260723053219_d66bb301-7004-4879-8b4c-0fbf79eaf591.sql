
-- =============================================================================
-- Phase 4B3 Sub-iter 2 · G → D → B → close-A (UTF8-safe rewrite)
-- Runtime-row delta: 0.
-- =============================================================================

-- G. Canonical JSON + SHA-256 helpers ----------------------------------------

CREATE OR REPLACE FUNCTION public.comm_hub_canonicalization_version()
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
$$ SELECT 'comm-hub-canonical-json/v1'::text $$;

CREATE OR REPLACE FUNCTION public.comm_hub_canonicalize_jsonb(p_value jsonb)
RETURNS text
LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
SET search_path = public, extensions
AS $$
DECLARE
  v_type text; v_key text; v_keys text[]; v_parts text[];
BEGIN
  IF p_value IS NULL THEN RETURN 'null'; END IF;
  v_type := jsonb_typeof(p_value);
  IF v_type = 'null'    THEN RETURN 'null'; END IF;
  IF v_type = 'boolean' THEN RETURN CASE WHEN p_value = 'true'::jsonb THEN 'true' ELSE 'false' END; END IF;
  IF v_type = 'number'  THEN RETURN p_value::text; END IF;
  IF v_type = 'string'  THEN RETURN to_jsonb(p_value #>> '{}')::text; END IF;
  IF v_type = 'array' THEN
    v_parts := ARRAY[]::text[];
    FOR v_key IN
      SELECT public.comm_hub_canonicalize_jsonb(elem)
        FROM jsonb_array_elements(p_value) WITH ORDINALITY AS t(elem, idx)
       ORDER BY t.idx
    LOOP v_parts := v_parts || v_key; END LOOP;
    RETURN '[' || array_to_string(v_parts, ',') || ']';
  END IF;
  IF v_type = 'object' THEN
    SELECT array_agg(k ORDER BY k) INTO v_keys FROM jsonb_object_keys(p_value) AS k;
    v_parts := ARRAY[]::text[];
    IF v_keys IS NOT NULL THEN
      FOREACH v_key IN ARRAY v_keys LOOP
        v_parts := v_parts || (to_jsonb(v_key)::text || ':' || public.comm_hub_canonicalize_jsonb(p_value -> v_key));
      END LOOP;
    END IF;
    RETURN '{' || array_to_string(v_parts, ',') || '}';
  END IF;
  RETURN 'null';
END $$;

CREATE OR REPLACE FUNCTION public.comm_hub_sha256_hex(p_text text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions
AS $$ SELECT lower(encode(extensions.digest(p_text, 'sha256'), 'hex')); $$;

-- Domain-separated hash. Separator is ASCII Unit Separator (0x1F), UTF8-safe.
CREATE OR REPLACE FUNCTION public.comm_hub_evidence_hash(p_domain text, p_value jsonb)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public, extensions
AS $$
  SELECT public.comm_hub_sha256_hex(
    coalesce(p_domain,'')
    || E'\x1f'
    || public.comm_hub_canonicalization_version()
    || E'\x1f'
    || public.comm_hub_canonicalize_jsonb(p_value)
  );
$$;

REVOKE ALL ON FUNCTION public.comm_hub_canonicalize_jsonb(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comm_hub_sha256_hex(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comm_hub_evidence_hash(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comm_hub_canonicalize_jsonb(jsonb)   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_hub_sha256_hex(text)            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_hub_evidence_hash(text, jsonb)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comm_hub_canonicalization_version()  TO authenticated, service_role;

-- D. Three-layer certification identity model (additive) ---------------------

ALTER TABLE public.comm_hub_certification
  ADD COLUMN IF NOT EXISTS certification_layer       text,
  ADD COLUMN IF NOT EXISTS provenance_state          text,
  ADD COLUMN IF NOT EXISTS producer_function         text,
  ADD COLUMN IF NOT EXISTS producer_version          text,
  ADD COLUMN IF NOT EXISTS diagnostic_function       text,
  ADD COLUMN IF NOT EXISTS diagnostic_version        text,
  ADD COLUMN IF NOT EXISTS canonicalization_version  text,
  ADD COLUMN IF NOT EXISTS hash_algorithm            text,
  ADD COLUMN IF NOT EXISTS manifest_hash             text,
  ADD COLUMN IF NOT EXISTS superseded_at             timestamptz;

UPDATE public.comm_hub_certification
   SET certification_layer = CASE
         WHEN certification_kind = 'STANDARD'               THEN 'TEMPLATE_STRUCTURE_CERTIFICATION'
         WHEN certification_kind LIKE 'go_live_readiness_%' THEN 'EVENT_CAPABILITY_CERTIFICATION'
         WHEN certification_kind IN ('CONTROLLED_LIVE','CONTROLLED_STUB') THEN 'RUNTIME_TRANSITION_CERTIFICATION'
         ELSE 'EVENT_CAPABILITY_CERTIFICATION'
       END
 WHERE certification_layer IS NULL;

UPDATE public.comm_hub_certification
   SET provenance_state = CASE
         WHEN id = '6a5dcbae-0e72-4170-a2f2-fa24c6ff04e0'::uuid THEN 'NON_AUTHORITATIVE'
         WHEN certification_reason = 'test certification'       THEN 'NON_AUTHORITATIVE'
         ELSE 'LEGACY_UNVERIFIED'
       END
 WHERE provenance_state IS NULL;

ALTER TABLE public.comm_hub_certification
  DROP CONSTRAINT IF EXISTS comm_hub_certification_layer_check,
  DROP CONSTRAINT IF EXISTS comm_hub_certification_provenance_check,
  DROP CONSTRAINT IF EXISTS comm_hub_certification_hash_algorithm_check;

ALTER TABLE public.comm_hub_certification
  ADD CONSTRAINT comm_hub_certification_layer_check CHECK (
    certification_layer IN (
      'TEMPLATE_STRUCTURE_CERTIFICATION',
      'EVENT_CAPABILITY_CERTIFICATION',
      'RUNTIME_TRANSITION_CERTIFICATION'
    )
  );
ALTER TABLE public.comm_hub_certification
  ADD CONSTRAINT comm_hub_certification_provenance_check CHECK (
    provenance_state IN ('AUTHORITATIVE','NON_AUTHORITATIVE','LEGACY_UNVERIFIED','REVOKED')
  );
ALTER TABLE public.comm_hub_certification
  ADD CONSTRAINT comm_hub_certification_hash_algorithm_check CHECK (
    hash_algorithm IS NULL OR hash_algorithm IN ('SHA-256','MD5')
  );

DROP INDEX IF EXISTS public.ux_comm_hub_cert_active_authoritative;
CREATE UNIQUE INDEX ux_comm_hub_cert_active_authoritative
  ON public.comm_hub_certification (
    certification_layer, certification_kind, entity_type, entity_id, coalesce(channel,'')
  )
  WHERE is_stale = false AND superseded_by IS NULL AND provenance_state = 'AUTHORITATIVE';

CREATE INDEX IF NOT EXISTS idx_chg_cert_layer_provenance
  ON public.comm_hub_certification (certification_layer, provenance_state, entity_type, entity_id);

-- Immutability trigger — extended to lock new evidence columns.
CREATE OR REPLACE FUNCTION public.trg_comm_hub_certification_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_CERTIFICATION_DELETE_FORBIDDEN';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.governance_record_id IS DISTINCT FROM OLD.governance_record_id
       OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
       OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
       OR NEW.entity_version IS DISTINCT FROM OLD.entity_version
       OR NEW.certification_kind IS DISTINCT FROM OLD.certification_kind
       OR NEW.result IS DISTINCT FROM OLD.result
       OR NEW.dependency_manifest::text IS DISTINCT FROM OLD.dependency_manifest::text
       OR NEW.dependency_hash IS DISTINCT FROM OLD.dependency_hash
       OR NEW.renderer_version IS DISTINCT FROM OLD.renderer_version
       OR NEW.template_purpose IS DISTINCT FROM OLD.template_purpose
       OR NEW.channel IS DISTINCT FROM OLD.channel
       OR NEW.template_type IS DISTINCT FROM OLD.template_type
       OR NEW.validation_findings::text IS DISTINCT FROM OLD.validation_findings::text
       OR NEW.error_count IS DISTINCT FROM OLD.error_count
       OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
       OR NEW.certified_by IS DISTINCT FROM OLD.certified_by
       OR NEW.certified_at IS DISTINCT FROM OLD.certified_at
       OR NEW.certification_reason IS DISTINCT FROM OLD.certification_reason
       OR NEW.correlation_id IS DISTINCT FROM OLD.correlation_id
       OR NEW.certification_layer IS DISTINCT FROM OLD.certification_layer
       OR NEW.producer_function IS DISTINCT FROM OLD.producer_function
       OR NEW.producer_version IS DISTINCT FROM OLD.producer_version
       OR NEW.diagnostic_function IS DISTINCT FROM OLD.diagnostic_function
       OR NEW.diagnostic_version IS DISTINCT FROM OLD.diagnostic_version
       OR NEW.canonicalization_version IS DISTINCT FROM OLD.canonicalization_version
       OR NEW.hash_algorithm IS DISTINCT FROM OLD.hash_algorithm
       OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash
    THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_CERTIFICATION_IMMUTABLE'; END IF;
    IF NEW.provenance_state IS DISTINCT FROM OLD.provenance_state
       AND NOT (OLD.provenance_state = 'AUTHORITATIVE' AND NEW.provenance_state = 'REVOKED')
    THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='COMM_HUB_CERTIFICATION_PROVENANCE_LOCKED'; END IF;
  END IF;
  RETURN NEW;
END $$;

-- B. Canonical writer --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_comm_hub_template_version_certification(
  p_template_version_id uuid,
  p_reason              text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_ver record; v_tpl record; v_map record;
  v_gov_id uuid;
  v_diag jsonb; v_diag_result text; v_blockers jsonb; v_warnings jsonb;
  v_channel text; v_purpose text;
  v_manifest jsonb; v_manifest_hash text; v_dep_hash text;
  v_existing record; v_new_id uuid;
  v_producer            constant text := 'record_comm_hub_template_version_certification';
  v_producer_version    constant text := 'template-cert-writer/v1';
  v_diagnostic          constant text := 'certify_comm_hub_template_version';
  v_diagnostic_version  constant text := 'template-cert-diagnostic/v1';
  v_layer               constant text := 'TEMPLATE_STRUCTURE_CERTIFICATION';
  v_kind                constant text := 'STANDARD';
BEGIN
  IF p_template_version_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'template_version_missing');
  END IF;

  SELECT * INTO v_ver FROM public.core_template_version WHERE id = p_template_version_id FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'template_version_not_found');
  END IF;

  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_ver.template_id;
  v_purpose := public.comm_hub_classify_template_purpose(v_ver.template_id);

  v_diag        := public.certify_comm_hub_template_version(p_template_version_id);
  v_diag_result := coalesce(v_diag->>'result','UNKNOWN');
  v_blockers    := coalesce(v_diag->'blockers', '[]'::jsonb);
  v_warnings    := coalesce(v_diag->'warnings', '[]'::jsonb);

  SELECT * INTO v_map FROM public.communication_hub_event_template_map
   WHERE template_id = v_tpl.id AND active = true
   ORDER BY updated_at DESC NULLS LAST LIMIT 1;
  v_channel := lower(coalesce(v_map.channel, ''));

  v_manifest := jsonb_build_object(
    'template_id',            v_tpl.id,
    'template_code',          v_tpl.code,
    'template_version_id',    v_ver.id,
    'template_version_status', v_ver.status,
    'template_purpose',       v_purpose,
    'subject_hash',           public.comm_hub_sha256_hex(coalesce(v_ver.subject,'')),
    'body_html_hash',         public.comm_hub_sha256_hex(coalesce(v_ver.body_html,'')),
    'body_text_hash',         public.comm_hub_sha256_hex(coalesce(v_ver.body_text,'')),
    'variable_contract_count', (
      SELECT count(*) FROM public.communication_hub_template_variable_contract
       WHERE template_version_id = v_ver.id OR template_id = v_tpl.id OR template_code = v_tpl.code),
    'event_mapping', CASE WHEN v_map.id IS NULL THEN NULL::jsonb
        ELSE jsonb_build_object('module_code',v_map.module_code,'event_code',v_map.event_code,'channel',v_map.channel) END,
    'diagnostic', jsonb_build_object(
        'function', v_diagnostic, 'version', v_diagnostic_version,
        'result', v_diag_result,
        'blocker_count', jsonb_array_length(v_blockers),
        'warning_count', jsonb_array_length(v_warnings))
  );

  v_manifest_hash := public.comm_hub_evidence_hash('comm-hub/template-certification-manifest/v1', v_manifest);
  v_dep_hash := public.comm_hub_evidence_hash(
    'comm-hub/template-dependency-manifest/v1',
    jsonb_build_object(
      'template_version_id', v_ver.id,
      'template_version_status', v_ver.status,
      'subject_hash',   v_manifest->>'subject_hash',
      'body_html_hash', v_manifest->>'body_html_hash',
      'body_text_hash', v_manifest->>'body_text_hash',
      'variable_contract_count', v_manifest->'variable_contract_count'
    )
  );

  SELECT * INTO v_existing FROM public.comm_hub_certification
   WHERE entity_type = 'TEMPLATE_VERSION' AND entity_id = v_ver.id
     AND certification_layer = v_layer AND certification_kind = v_kind
     AND provenance_state = 'AUTHORITATIVE'
     AND is_stale = false AND superseded_by IS NULL
   ORDER BY certified_at DESC LIMIT 1
   FOR UPDATE;

  IF FOUND AND v_existing.dependency_hash = v_dep_hash AND v_existing.manifest_hash = v_manifest_hash THEN
    RETURN jsonb_build_object(
      'ok', true, 'idempotent_replay', true,
      'certification_id', v_existing.id,
      'template_version_id', v_ver.id,
      'certification_layer', v_layer, 'certification_kind', v_kind,
      'result', v_existing.result,
      'dependency_hash', v_dep_hash, 'manifest_hash', v_manifest_hash,
      'producer_function', v_producer, 'producer_version', v_producer_version,
      'diagnostic_function', v_diagnostic, 'diagnostic_version', v_diagnostic_version,
      'canonicalization_version', public.comm_hub_canonicalization_version(),
      'blocker_count', jsonb_array_length(v_blockers),
      'warning_count', jsonb_array_length(v_warnings)
    );
  END IF;

  IF jsonb_array_length(v_blockers) > 0 OR v_diag_result NOT IN ('CERTIFIED','PASS') THEN
    RETURN jsonb_build_object(
      'ok', false, 'code', 'diagnostic_blocked',
      'template_version_id', v_ver.id,
      'diagnostic_result', v_diag_result,
      'blockers', v_blockers, 'warnings', v_warnings,
      'dependency_hash', v_dep_hash, 'manifest_hash', v_manifest_hash
    );
  END IF;

  SELECT id INTO v_gov_id FROM public.comm_hub_governance_record
   WHERE entity_type = 'TEMPLATE_VERSION' AND entity_id = v_ver.id
   ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  UPDATE public.comm_hub_certification
     SET superseded_at   = now(),
         is_stale        = true,
         stale_reason    = coalesce(stale_reason, 'SUPERSEDED_BY_CANONICAL_WRITER'),
         stale_detected_at = coalesce(stale_detected_at, now())
   WHERE entity_type = 'TEMPLATE_VERSION' AND entity_id = v_ver.id
     AND certification_layer = v_layer AND certification_kind = v_kind
     AND provenance_state = 'AUTHORITATIVE'
     AND is_stale = false AND superseded_by IS NULL;

  INSERT INTO public.comm_hub_certification (
    governance_record_id, entity_type, entity_id, entity_version,
    certification_kind, result,
    dependency_manifest, dependency_hash,
    renderer_version, template_purpose, channel,
    validation_findings, error_count, warning_count,
    certified_by, certified_at, certification_reason, is_stale,
    certification_layer, provenance_state,
    producer_function, producer_version,
    diagnostic_function, diagnostic_version,
    canonicalization_version, hash_algorithm, manifest_hash
  ) VALUES (
    v_gov_id, 'TEMPLATE_VERSION', v_ver.id, v_ver.id::text,
    v_kind, 'PASS',
    v_manifest, v_dep_hash,
    'comm-hub-render/1', v_purpose, nullif(v_channel,''),
    jsonb_build_object('blockers', v_blockers, 'warnings', v_warnings, 'diagnostic_result', v_diag_result),
    jsonb_array_length(v_blockers), jsonb_array_length(v_warnings),
    auth.uid(), now(), coalesce(p_reason, 'canonical writer'), false,
    v_layer, 'AUTHORITATIVE',
    v_producer, v_producer_version,
    v_diagnostic, v_diagnostic_version,
    public.comm_hub_canonicalization_version(), 'SHA-256', v_manifest_hash
  ) RETURNING id INTO v_new_id;

  UPDATE public.comm_hub_certification
     SET superseded_by = v_new_id
   WHERE entity_type = 'TEMPLATE_VERSION' AND entity_id = v_ver.id
     AND certification_layer = v_layer AND certification_kind = v_kind
     AND id <> v_new_id AND superseded_by IS NULL AND superseded_at IS NOT NULL;

  RETURN jsonb_build_object(
    'ok', true, 'idempotent_replay', false,
    'certification_id', v_new_id,
    'template_version_id', v_ver.id,
    'certification_layer', v_layer, 'certification_kind', v_kind,
    'result', 'PASS',
    'dependency_hash', v_dep_hash, 'manifest_hash', v_manifest_hash,
    'producer_function', v_producer, 'producer_version', v_producer_version,
    'diagnostic_function', v_diagnostic, 'diagnostic_version', v_diagnostic_version,
    'canonicalization_version', public.comm_hub_canonicalization_version(),
    'blocker_count', jsonb_array_length(v_blockers),
    'warning_count', jsonb_array_length(v_warnings)
  );
END $$;

REVOKE ALL ON FUNCTION public.record_comm_hub_template_version_certification(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_comm_hub_template_version_certification(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_comm_hub_template_version_certification(uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.record_comm_hub_template_version_certification(uuid, text) TO service_role;

-- M. Runner template-cert lookup patch ---------------------------------------

CREATE OR REPLACE FUNCTION public.run_comm_hub_go_live_certification(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email',
  p_target_stage text DEFAULT 'READINESS_ONLY', p_execute boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_manifest jsonb; v_hash text; v_blockers jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb;
  v_stage text := upper(p_target_stage); v_channel text := lower(p_channel);
  v_tv_id uuid; v_scenario_id uuid; v_sender_id uuid; v_gov_record_id uuid;
  v_map_id uuid; v_schema_id uuid; v_schema_ver int; v_recipient_ver int;
  v_readiness_state text; v_readiness_stale boolean;
  v_ready_readiness boolean; v_ready_preview boolean; v_ready_dry_run boolean; v_ready_stub boolean; v_ready_stage boolean;
  v_render_subject jsonb; v_render_html jsonb; v_render_text jsonb; v_resolution jsonb; v_gov_check jsonb;
  v_recipient_ctx jsonb; v_request_ctx jsonb; v_system_ctx jsonb;
  v_cert_id uuid;
  v_reg record; v_map record; v_tv record; v_schema record; v_fixture record;
  v_sender record; v_readiness record; v_recipient record; v_gov record; v_cert record; v_live record;
  v_has_map boolean := false; v_has_recipient boolean := false; v_has_readiness boolean := false; v_has_schema boolean := false;
  v_template_cert_found boolean := false;
BEGIN
  IF v_stage NOT IN ('READINESS_ONLY','PREVIEW_READY','DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_target_stage','message',v_stage);
  END IF;
  IF p_execute IS true THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','execute_ignored','message','p_execute=true ignored in foundation iteration'));
  END IF;

  SELECT * INTO v_reg FROM communication_hub_module_event_registry WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','module_event_registration','code','event_not_registered')); END IF;
  SELECT * INTO v_live FROM communication_hub_event_live_control WHERE module_code=p_module_code AND event_code=p_event_code LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_live_control','code','event_live_control_missing')); END IF;
  SELECT * INTO v_map FROM communication_hub_event_template_map WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=v_channel AND active=true LIMIT 1;
  IF FOUND THEN v_has_map:=true; v_map_id:=v_map.id; ELSE v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_template_map','code','event_template_map_missing_or_inactive')); END IF;

  IF v_has_map THEN
    SELECT v.*, t.status AS template_status, t.code AS template_code, t.active_version_id INTO v_tv
      FROM core_template t JOIN core_template_version v ON v.id=t.active_version_id WHERE t.id=v_map.template_id LIMIT 1;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_active_version_missing'));
    ELSE
      v_tv_id := v_tv.id;
      IF upper(v_tv.status::text) NOT IN ('ACTIVE','PUBLISHED') THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_version_not_published','details',v_tv.status)); END IF;
      IF coalesce(length(v_tv.subject),0)=0 THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_subject_empty')); END IF;
      IF coalesce(length(v_tv.body_html),0)=0 AND coalesce(length(v_tv.body_text),0)=0 THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','template_version','code','template_body_empty')); END IF;
    END IF;
  END IF;

  SELECT * INTO v_schema FROM communication_hub_event_payload_schema WHERE module_code=p_module_code AND event_code=p_event_code ORDER BY schema_version DESC LIMIT 1;
  IF FOUND THEN v_has_schema:=true; v_schema_id:=v_schema.id; v_schema_ver:=v_schema.schema_version;
    IF upper(v_schema.status)<>'ENFORCED' AND v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_not_enforced','details',v_schema.status));
    END IF;
  ELSE v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','event_payload_schema','code','event_payload_schema_missing')); END IF;

  IF v_tv_id IS NOT NULL THEN
    PERFORM 1 FROM communication_hub_template_variable_contract WHERE module_code=p_module_code AND event_code=p_event_code AND template_version_id=v_tv_id LIMIT 1;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_contract','code','variable_contract_missing_for_active_version')); END IF;
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') THEN
      PERFORM 1 FROM communication_hub_template_variable_contract WHERE module_code=p_module_code AND event_code=p_event_code AND template_version_id=v_tv_id AND contract_status<>'ENFORCED' LIMIT 1;
      IF FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_contract','code','variable_contract_not_enforced')); END IF;
    END IF;
  END IF;

  SELECT * INTO v_fixture FROM communication_hub_event_test_scenario WHERE module_code=p_module_code AND event_code=p_event_code AND lower(channel)=v_channel AND is_active=true ORDER BY updated_at DESC LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','governed_test_scenario_missing'));
  ELSE
    v_scenario_id := v_fixture.id;
    IF v_fixture.tokens ? 'appeal_reference' OR v_fixture.tokens ? 'case_reference' OR v_fixture.tokens ? 'submitted_at'
       OR v_fixture.tokens ? 'recipient_name' OR v_fixture.tokens ? 'request_no' OR v_fixture.tokens ? 'generated_at' THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','test_scenario','code','test_scenario_uses_flat_template_tokens'));
    END IF;
  END IF;

  SELECT * INTO v_recipient FROM communication_hub_recipient_policy LIMIT 1;
  IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_missing'));
  ELSE
    v_has_recipient:=true; v_recipient_ver := v_recipient.policy_version;
    IF v_stage IN ('DRY_RUN_READY','CONTROLLED_STUB_READY') AND
       (v_recipient.active_mode<>'SINGLE_CONFIGURED_RECIPIENT' OR coalesce(v_recipient.single_configured_address,'')='') THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_policy_not_configured_for_controlled_stub'));
    END IF;
    IF v_stage='CONTROLLED_STUB_READY' AND coalesce(v_recipient.single_configured_display_name_confirmed,false)=false THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','recipient_policy','code','recipient_display_name_not_confirmed'));
    END IF;
  END IF;

  IF v_has_map AND v_map.sender_profile_id IS NOT NULL THEN
    v_sender_id := v_map.sender_profile_id;
    SELECT * INTO v_sender FROM communication_hub_sender_profile WHERE id=v_sender_id;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_missing'));
    ELSE
      IF v_sender.is_enabled IS DISTINCT FROM true THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_disabled')); END IF;
      IF v_sender.domain_verified IS DISTINCT FROM true THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_domain_not_verified')); END IF;
      IF v_sender.provider_identity_status IS DISTINCT FROM 'verified' THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_provider_identity_not_verified','details',v_sender.provider_identity_status)); END IF;
    END IF;
    SELECT * INTO v_readiness FROM comm_hub_sender_readiness WHERE sender_profile_id=v_sender_id ORDER BY computed_at DESC LIMIT 1;
    IF FOUND THEN v_has_readiness:=true; v_readiness_state:=v_readiness.readiness_state; v_readiness_stale:=v_readiness.is_stale; END IF;
    IF v_stage='CONTROLLED_STUB_READY' THEN
      IF NOT v_has_readiness OR v_readiness_state<>'TEST_READY' OR v_readiness_stale=true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_readiness','code','sender_not_test_ready'));
      END IF;
    ELSIF NOT v_has_readiness OR v_readiness_state<>'TEST_READY' THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','sender_test_readiness_missing_or_stale'));
    END IF;
  ELSE
    v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','sender_profile','code','sender_profile_not_bound_to_mapping'));
  END IF;

  -- Sub-iter 2 · exact authoritative template-cert lookup
  IF v_tv_id IS NOT NULL THEN
    SELECT * INTO v_gov FROM comm_hub_governance_record WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_tv_id ORDER BY updated_at DESC LIMIT 1;
    IF NOT FOUND THEN v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','governance','code','template_version_governance_missing')); END IF;

    SELECT * INTO v_cert FROM comm_hub_certification
     WHERE entity_type = 'TEMPLATE_VERSION' AND entity_id = v_tv_id
       AND certification_layer = 'TEMPLATE_STRUCTURE_CERTIFICATION'
       AND certification_kind  = 'STANDARD'
       AND provenance_state    = 'AUTHORITATIVE'
       AND is_stale = false AND superseded_by IS NULL
       AND result IN ('PASS','CERTIFIED')
     ORDER BY certified_at DESC LIMIT 1;

    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
        'stage','governance','code','template_version_certification_missing',
        'details', jsonb_build_object(
          'template_version_id', v_tv_id,
          'required_layer','TEMPLATE_STRUCTURE_CERTIFICATION',
          'required_kind','STANDARD',
          'required_provenance','AUTHORITATIVE')));
    ELSE
      v_template_cert_found := true;
      IF v_cert.is_stale = true THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object(
          'stage','governance','code','template_version_certification_stale','details',v_cert.stale_reason));
      END IF;
    END IF;
  END IF;

  v_recipient_ctx := CASE WHEN NOT v_has_recipient THEN '{}'::jsonb
    ELSE jsonb_build_object('display_name',v_recipient.single_configured_display_name,'email',v_recipient.single_configured_address,'policy_version',v_recipient.policy_version) END;
  v_request_ctx := jsonb_build_object('request_no','REQ-CERT-'||to_char(now(),'YYYYMMDDHH24MISS'),'correlation_id',gen_random_uuid()::text,'timestamp',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  v_system_ctx := jsonb_build_object('generated_at',to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"'),'module_code',p_module_code,'event_code',p_event_code,'channel',v_channel,'platform','secureserve');

  IF v_tv_id IS NOT NULL AND v_scenario_id IS NOT NULL THEN
    BEGIN
      v_resolution := resolve_comm_hub_template_variables(
        p_template_version_id:=v_tv_id, p_module_code:=p_module_code, p_event_code:=p_event_code, p_channel:=v_channel,
        p_resolution_mode:=CASE WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST' ELSE 'CONTROLLED_STUB' END,
        p_test_scenario_id:=v_scenario_id, p_event_payload:=coalesce(v_fixture.tokens,'{}'::jsonb),
        p_recipient_context:=v_recipient_ctx, p_request_context:=v_request_ctx, p_system_context:=v_system_ctx);
      IF jsonb_array_length(coalesce(v_resolution->'unresolved_required','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','required_variables_unresolved','details',v_resolution->'unresolved_required'));
      END IF;
      IF jsonb_array_length(coalesce(v_resolution->'raw_tokens','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','raw_tokens_present','details',v_resolution->'raw_tokens'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','variable_resolution','code','resolver_error','details',SQLERRM));
    END;
  END IF;

  IF v_tv_id IS NOT NULL AND v_resolution IS NOT NULL THEN
    BEGIN
      v_render_subject := comm_hub_render_template(v_tv.subject, coalesce(v_resolution->'context','{}'::jsonb));
      IF jsonb_array_length(coalesce(v_render_subject->'raw_tokens','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','subject_raw_tokens_present'));
      END IF;
      IF coalesce(length(v_tv.body_html),0)>0 THEN
        v_render_html := comm_hub_render_template(v_tv.body_html, coalesce(v_resolution->'context','{}'::jsonb));
        IF jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb))>0 THEN
          v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','body_html_raw_tokens_present'));
        END IF;
      END IF;
      IF coalesce(length(v_tv.body_text),0)>0 THEN
        v_render_text := comm_hub_render_template(v_tv.body_text, coalesce(v_resolution->'context','{}'::jsonb));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('stage','render_check','code','render_error','details',SQLERRM));
    END;
  END IF;

  IF v_tv_id IS NOT NULL AND v_has_map THEN
    BEGIN
      v_gov_check := check_comm_hub_runtime_governance(
        p_module_code:=p_module_code, p_event_code:=p_event_code, p_channel:=v_channel,
        p_target_stage:=CASE WHEN v_stage='PREVIEW_READY' THEN 'PREVIEW_TEST'
                             WHEN v_stage='DRY_RUN_READY' THEN 'DRY_RUN'
                             WHEN v_stage='CONTROLLED_STUB_READY' THEN 'CONTROLLED_STUB'
                             ELSE 'PREVIEW_TEST' END);
      IF jsonb_array_length(coalesce(v_gov_check->'blockers','[]'::jsonb))>0 THEN
        v_blockers := v_blockers || (SELECT jsonb_agg(jsonb_build_object('stage','runtime_governance','code',coalesce(b->>'code','governance_blocker'),'details',b))
                                     FROM jsonb_array_elements(v_gov_check->'blockers') b);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code','runtime_governance_check_error','message',SQLERRM));
    END;
  END IF;

  v_manifest := _comm_hub_build_event_manifest(p_module_code,p_event_code,v_channel);
  v_hash := _comm_hub_hash_manifest(v_manifest);

  v_ready_readiness := NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) b
    WHERE (b->>'code') IN ('event_not_registered','event_template_map_missing_or_inactive','template_active_version_missing'));
  v_ready_preview := jsonb_array_length(v_blockers)=0;
  v_ready_dry_run := v_ready_preview; v_ready_stub := v_ready_preview;
  v_ready_stage := CASE v_stage WHEN 'READINESS_ONLY' THEN v_ready_readiness
    WHEN 'PREVIEW_READY' THEN v_ready_preview WHEN 'DRY_RUN_READY' THEN v_ready_dry_run
    WHEN 'CONTROLLED_STUB_READY' THEN v_ready_stub END;

  v_gov_record_id := _comm_hub_ensure_event_governance_record(v_map_id, v_hash);

  INSERT INTO comm_hub_certification(
    governance_record_id, entity_type, entity_id, entity_version, certification_kind, result,
    dependency_manifest, dependency_hash, renderer_version, channel,
    validation_findings, error_count, warning_count, is_stale, certified_at, certified_by, certification_reason,
    certification_layer, provenance_state,
    producer_function, producer_version,
    diagnostic_function, diagnostic_version,
    canonicalization_version, hash_algorithm, manifest_hash
  ) VALUES (
    v_gov_record_id, 'EVENT_TEMPLATE_MAPPING', coalesce(v_map_id, gen_random_uuid()),
    coalesce(v_tv_id::text,'unversioned'),
    'go_live_readiness_'||v_stage, CASE WHEN v_ready_stage THEN 'PASS' ELSE 'FAIL' END,
    v_manifest, v_hash, 'comm-hub-render/1', v_channel,
    jsonb_build_object('blockers',v_blockers,'warnings',v_warnings,'stage',v_stage),
    jsonb_array_length(v_blockers), jsonb_array_length(v_warnings), false, now(), auth.uid(),
    'run_comm_hub_go_live_certification',
    'EVENT_CAPABILITY_CERTIFICATION', 'LEGACY_UNVERIFIED',
    'run_comm_hub_go_live_certification', 'go-live-runner/1',
    NULL, NULL, NULL, NULL, NULL
  ) RETURNING id INTO v_cert_id;

  RETURN jsonb_build_object(
    'ok',true,'module_code',p_module_code,'event_code',p_event_code,'channel',v_channel,
    'requested_stage',v_stage,'ready_for_requested_stage',v_ready_stage,
    'ready_by_stage',jsonb_build_object('READINESS_ONLY',v_ready_readiness,'PREVIEW_READY',v_ready_preview,'DRY_RUN_READY',v_ready_dry_run,'CONTROLLED_STUB_READY',v_ready_stub),
    'blockers',v_blockers,'warnings',v_warnings,
    'manifest_hash',v_hash,'certification_id',v_cert_id,'governance_record_id',v_gov_record_id,
    'mapping_id',v_map_id,'template_version_id',v_tv_id,
    'payload_schema_id',v_schema_id,'payload_schema_version',v_schema_ver,
    'sender_profile_id',v_sender_id,'sender_readiness_state',coalesce(v_readiness_state,'MISSING'),
    'recipient_policy_version',v_recipient_ver,
    'unresolved_required_count',jsonb_array_length(coalesce(v_resolution->'unresolved_required','[]'::jsonb)),
    'raw_token_count',jsonb_array_length(coalesce(v_resolution->'raw_tokens','[]'::jsonb))
      + jsonb_array_length(coalesce(v_render_subject->'raw_tokens','[]'::jsonb))
      + jsonb_array_length(coalesce(v_render_html->'raw_tokens','[]'::jsonb)),
    'template_certification', jsonb_build_object(
       'template_certification_found',    v_template_cert_found,
       'template_certification_id',       v_cert.id,
       'template_certification_layer',    v_cert.certification_layer,
       'template_certification_kind',     v_cert.certification_kind,
       'template_certification_result',   v_cert.result,
       'template_certification_provenance', v_cert.provenance_state,
       'certified_dependency_hash',       v_cert.dependency_hash,
       'current_dependency_hash',         NULL,
       'hash_match',                      NULL,
       'producer_function',               v_cert.producer_function,
       'producer_version',                v_cert.producer_version),
    'executed',false,'schema_version','go-live-runner/2');
END; $$;

-- Close A · produce authoritative APPEALS certification and link the manual seed.
DO $close_a$
DECLARE
  v_template_version_id CONSTANT uuid := '8d1fd9cb-2248-4ff4-86a4-bc42a4995f87';
  v_manual_seed_id      CONSTANT uuid := '6a5dcbae-0e72-4170-a2f2-fa24c6ff04e0';
  v_writer_result jsonb;
  v_new_cert_id uuid;
BEGIN
  v_writer_result := public.record_comm_hub_template_version_certification(
    v_template_version_id,
    'Sub-iter 2 close-A canonical certification via record_comm_hub_template_version_certification');
  RAISE NOTICE 'CLOSE_A_WRITER_RESULT: %', v_writer_result;
  IF coalesce((v_writer_result->>'ok')::boolean, false) THEN
    v_new_cert_id := (v_writer_result->>'certification_id')::uuid;
    UPDATE public.comm_hub_certification
       SET superseded_by = v_new_cert_id, superseded_at = now()
     WHERE id = v_manual_seed_id AND superseded_by IS NULL;
  ELSE
    RAISE NOTICE 'CLOSE_A_SKIPPED: writer did not return ok=true; manual seed superseded_by left NULL by design';
  END IF;
END $close_a$;

-- Inline deterministic tests
DO $tests$
DECLARE h1 text; h2 text;
BEGIN
  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":1,"b":2}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{"b":2,"a":1}'::jsonb);
  IF h1 <> h2 THEN RAISE EXCEPTION 'TEST_FAIL: object key reordering: % vs %', h1, h2; END IF;

  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":{"x":1,"y":2},"b":[1,2]}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{"b":[1,2],"a":{"y":2,"x":1}}'::jsonb);
  IF h1 <> h2 THEN RAISE EXCEPTION 'TEST_FAIL: nested reordering'; END IF;

  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"xs":[1,2,3]}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{"xs":[3,2,1]}'::jsonb);
  IF h1 = h2 THEN RAISE EXCEPTION 'TEST_FAIL: array order not distinguished'; END IF;

  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":null}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{}'::jsonb);
  IF h1 = h2 THEN RAISE EXCEPTION 'TEST_FAIL: null vs missing'; END IF;

  h1 := public.comm_hub_evidence_hash('domain/a/v1', '{"x":1}'::jsonb);
  h2 := public.comm_hub_evidence_hash('domain/b/v1', '{"x":1}'::jsonb);
  IF h1 = h2 THEN RAISE EXCEPTION 'TEST_FAIL: domain separation'; END IF;

  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":"1"}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":1}'::jsonb);
  IF h1 = h2 THEN RAISE EXCEPTION 'TEST_FAIL: string vs number'; END IF;

  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":false}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":null}'::jsonb);
  IF h1 = h2 THEN RAISE EXCEPTION 'TEST_FAIL: false vs null'; END IF;

  h1 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":1,"b":[2,3]}'::jsonb);
  h2 := public.comm_hub_evidence_hash('t/domain/v1', '{"a":1,"b":[2,3]}'::jsonb);
  IF h1 <> h2 THEN RAISE EXCEPTION 'TEST_FAIL: idempotence'; END IF;
  IF length(h1) <> 64 THEN RAISE EXCEPTION 'TEST_FAIL: SHA-256 hex length'; END IF;
  IF public.comm_hub_canonicalization_version() <> 'comm-hub-canonical-json/v1'
     THEN RAISE EXCEPTION 'TEST_FAIL: canonicalisation version'; END IF;
  RAISE NOTICE 'ALL_HASHING_TESTS_PASSED';
END $tests$;
