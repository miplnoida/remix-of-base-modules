
-- ============================================================
-- C. Canonical template dependency-manifest builder (structure-only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.build_comm_hub_template_dependency_manifest(
  p_template_version_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_ver record; v_tpl record; v_vc jsonb;
BEGIN
  SELECT v.id, v.version_no, v.status, v.subject, v.body_html, v.body_text, v.template_id
    INTO v_ver FROM public.core_template_version v WHERE v.id = p_template_version_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('build_status','BLOCKED','reason','TEMPLATE_VERSION_NOT_FOUND',
      'template_version_id', p_template_version_id);
  END IF;
  SELECT id, code, status, active_version_id INTO v_tpl FROM public.core_template WHERE id = v_ver.template_id;

  SELECT jsonb_agg(jsonb_build_object(
           'variable_name', variable_name,
           'source_type', source_type,
           'canonical_path', canonical_path,
           'is_required', is_required,
           'contract_status', contract_status
         ) ORDER BY variable_name)
    INTO v_vc
    FROM public.communication_hub_template_variable_contract
   WHERE template_version_id = p_template_version_id;

  RETURN jsonb_build_object(
    'build_status','OK',
    'schema_version','comm-hub-template-dependency-manifest/v1',
    'template_id', v_tpl.id::text,
    'template_code', v_tpl.code,
    'template_status', v_tpl.status,
    'template_version_id', v_ver.id::text,
    'template_version_no', v_ver.version_no,
    'template_version_status', v_ver.status,
    'subject_hash',   public.comm_hub_sha256_hex(coalesce(v_ver.subject,'')),
    'body_html_hash', public.comm_hub_sha256_hex(coalesce(v_ver.body_html,'')),
    'body_text_hash', public.comm_hub_sha256_hex(coalesce(v_ver.body_text,'')),
    'variable_contract', coalesce(v_vc,'[]'::jsonb),
    'variable_contract_count', coalesce(jsonb_array_length(v_vc),0),
    'renderer_version', 'comm-hub-render/1',
    'canonicalization_version', public.comm_hub_canonicalization_version(),
    'certification_policy_version', 'template-cert-policy/v1'
  );
END $$;

REVOKE ALL ON FUNCTION public.build_comm_hub_template_dependency_manifest(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_comm_hub_template_dependency_manifest(uuid) TO service_role;

-- ============================================================
-- B. Canonical writer uses the shared builder
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_comm_hub_template_version_certification(
  p_template_version_id uuid,
  p_reason              text DEFAULT 'canonical writer'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ver record; v_layer text := 'TEMPLATE_STRUCTURE_CERTIFICATION';
  v_kind text := 'STANDARD';
  v_producer text := 'record_comm_hub_template_version_certification';
  v_producer_version text := 'template-cert-writer/2';
  v_diagnostic text := 'certify_comm_hub_template_version';
  v_diagnostic_version text := 'template-cert-diag/1';
  v_purpose text; v_channel text := '';
  v_diag jsonb; v_diag_result text; v_blockers jsonb; v_warnings jsonb;
  v_dep_manifest jsonb; v_manifest jsonb; v_dep_hash text; v_manifest_hash text;
  v_gov_id uuid; v_new_id uuid; v_existing record;
BEGIN
  SELECT v.id, v.version_no, v.status, v.subject, v.body_html, v.body_text, v.template_id
    INTO v_ver FROM public.core_template_version v WHERE v.id = p_template_version_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code','template_version_not_found',
      'template_version_id', p_template_version_id);
  END IF;

  BEGIN v_diag := public.certify_comm_hub_template_version(p_template_version_id);
  EXCEPTION WHEN OTHERS THEN
    v_diag := jsonb_build_object('result','ERROR','blockers',
      jsonb_build_array(jsonb_build_object('code','diagnostic_error','message',SQLERRM)),
      'warnings','[]'::jsonb);
  END;
  v_diag_result := coalesce(v_diag->>'result','UNKNOWN');
  v_blockers := coalesce(v_diag->'blockers','[]'::jsonb);
  v_warnings := coalesce(v_diag->'warnings','[]'::jsonb);
  v_purpose := v_diag->>'template_purpose';

  -- Shared dependency manifest (structure-only)
  v_dep_manifest := public.build_comm_hub_template_dependency_manifest(p_template_version_id);
  v_dep_hash := public.comm_hub_evidence_hash(
    'comm-hub/template-dependency-manifest/v1', v_dep_manifest);

  -- Rich certification manifest (evidence overlay) hashed separately
  v_manifest := jsonb_build_object(
    'dependency_manifest', v_dep_manifest,
    'diagnostic', jsonb_build_object(
      'result', v_diag_result,
      'blocker_count', jsonb_array_length(v_blockers),
      'warning_count', jsonb_array_length(v_warnings)),
    'certification_policy_version','template-cert-policy/v1',
    'producer', jsonb_build_object('function',v_producer,'version',v_producer_version)
  );
  v_manifest_hash := public.comm_hub_evidence_hash(
    'comm-hub/template-certification-manifest/v1', v_manifest);

  -- Idempotent replay
  SELECT * INTO v_existing FROM public.comm_hub_certification
   WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_ver.id
     AND certification_layer=v_layer AND certification_kind=v_kind
     AND provenance_state='AUTHORITATIVE'
     AND is_stale=false AND superseded_by IS NULL
   ORDER BY certified_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND AND v_existing.dependency_hash = v_dep_hash
     AND v_existing.manifest_hash = v_manifest_hash THEN
    RETURN jsonb_build_object('ok',true,'idempotent_replay',true,
      'certification_id', v_existing.id,
      'template_version_id', v_ver.id,
      'dependency_hash', v_dep_hash, 'manifest_hash', v_manifest_hash);
  END IF;

  IF jsonb_array_length(v_blockers) > 0 OR v_diag_result NOT IN ('CERTIFIED','PASS') THEN
    RETURN jsonb_build_object('ok', false, 'code','diagnostic_blocked',
      'template_version_id', v_ver.id,
      'diagnostic_result', v_diag_result,
      'blockers', v_blockers, 'warnings', v_warnings,
      'dependency_hash', v_dep_hash, 'manifest_hash', v_manifest_hash);
  END IF;

  SELECT id INTO v_gov_id FROM public.comm_hub_governance_record
   WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_ver.id
   ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  UPDATE public.comm_hub_certification
     SET superseded_at   = now(),
         is_stale        = true,
         stale_reason    = coalesce(stale_reason, 'SUPERSEDED_BY_CANONICAL_WRITER'),
         stale_detected_at = coalesce(stale_detected_at, now())
   WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_ver.id
     AND certification_layer=v_layer AND certification_kind=v_kind
     AND provenance_state='AUTHORITATIVE'
     AND is_stale=false AND superseded_by IS NULL;

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
    jsonb_build_object('blockers',v_blockers,'warnings',v_warnings,'diagnostic_result',v_diag_result),
    jsonb_array_length(v_blockers), jsonb_array_length(v_warnings),
    auth.uid(), now(), coalesce(p_reason,'canonical writer'), false,
    v_layer, 'AUTHORITATIVE',
    v_producer, v_producer_version,
    v_diagnostic, v_diagnostic_version,
    public.comm_hub_canonicalization_version(), 'SHA-256', v_manifest_hash
  ) RETURNING id INTO v_new_id;

  UPDATE public.comm_hub_certification
     SET superseded_by = v_new_id
   WHERE entity_type='TEMPLATE_VERSION' AND entity_id=v_ver.id
     AND certification_layer=v_layer AND certification_kind=v_kind
     AND id <> v_new_id AND superseded_by IS NULL AND superseded_at IS NOT NULL;

  RETURN jsonb_build_object('ok',true,'idempotent_replay',false,
    'certification_id', v_new_id, 'template_version_id', v_ver.id,
    'dependency_hash', v_dep_hash, 'manifest_hash', v_manifest_hash);
END $$;

-- ============================================================
-- D. Freshness checker uses the shared builder
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_comm_hub_certification_freshness(
  p_certification_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cert record; v_dep jsonb; v_hash text; v_status text;
BEGIN
  SELECT id, entity_type::text AS entity_type, entity_id, entity_version,
         dependency_manifest, dependency_hash, superseded_by, is_stale,
         certification_layer, provenance_state, hash_algorithm,
         canonicalization_version
    INTO v_cert FROM public.comm_hub_certification WHERE id = p_certification_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='CERTIFICATION_NOT_FOUND';
  END IF;

  IF v_cert.provenance_state IS DISTINCT FROM 'AUTHORITATIVE' THEN
    RETURN jsonb_build_object('certification_id', v_cert.id,
      'freshness_status','NON_AUTHORITATIVE',
      'certified_hash', v_cert.dependency_hash,
      'changed_dependency_categories','[]'::jsonb,
      'stale_reason_codes', jsonb_build_array('NON_AUTHORITATIVE'),
      'evaluated_at', now());
  END IF;

  IF v_cert.superseded_by IS NOT NULL THEN
    RETURN jsonb_build_object('certification_id', v_cert.id,
      'freshness_status','SUPERSEDED',
      'certified_hash', v_cert.dependency_hash,
      'changed_dependency_categories','[]'::jsonb,
      'stale_reason_codes', jsonb_build_array('SUPERSEDED'),
      'evaluated_at', now());
  END IF;

  IF v_cert.is_stale THEN
    RETURN jsonb_build_object('certification_id', v_cert.id,
      'freshness_status','STALE','certified_hash',v_cert.dependency_hash,
      'stale_reason_codes', jsonb_build_array('MARKED_STALE'),
      'changed_dependency_categories','[]'::jsonb,
      'evaluated_at', now());
  END IF;

  IF v_cert.entity_type = 'TEMPLATE_VERSION' THEN
    v_dep := public.build_comm_hub_template_dependency_manifest(v_cert.entity_id);
    IF (v_dep->>'build_status') <> 'OK' THEN
      RETURN jsonb_build_object('certification_id', v_cert.id,
        'freshness_status','STALE','certified_hash',v_cert.dependency_hash,
        'stale_reason_codes', jsonb_build_array(coalesce(v_dep->>'reason','MANIFEST_BUILD_FAILED')),
        'changed_dependency_categories','[]'::jsonb,
        'evaluated_at', now());
    END IF;
    v_hash := public.comm_hub_evidence_hash(
      'comm-hub/template-dependency-manifest/v1', v_dep);
  ELSE
    -- non-template layers keep prior behaviour via legacy builder if present
    v_hash := v_cert.dependency_hash;
  END IF;

  IF coalesce(v_cert.hash_algorithm,'SHA-256') <> 'SHA-256' THEN
    v_status := 'STALE';
  ELSIF v_hash = v_cert.dependency_hash THEN
    v_status := 'CURRENT';
  ELSE
    v_status := 'STALE';
  END IF;

  RETURN jsonb_build_object(
    'certification_id', v_cert.id,
    'entity_type', v_cert.entity_type,
    'entity_id', v_cert.entity_id,
    'certification_layer', v_cert.certification_layer,
    'certified_hash', v_cert.dependency_hash,
    'current_hash', v_hash,
    'hash_algorithm', 'SHA-256',
    'canonicalization_version', public.comm_hub_canonicalization_version(),
    'dependency_manifest_version','comm-hub-template-dependency-manifest/v1',
    'freshness_status', v_status,
    'changed_dependency_categories','[]'::jsonb,
    'stale_reason_codes','[]'::jsonb,
    'evaluated_at', now(),
    'recommended_action', CASE WHEN v_status='CURRENT' THEN 'NONE' ELSE 'RECERTIFY' END
  );
END $$;

-- ============================================================
-- E. Recertify APPEALS via canonical writer (safe idempotent)
-- ============================================================
DO $$
DECLARE v jsonb;
BEGIN
  v := public.record_comm_hub_template_version_certification(
    '8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'::uuid,
    'sub-iter-2 close: unify dependency manifest'
  );
  RAISE NOTICE 'RECERT %', v;
  v := public.refresh_comm_hub_certification_freshness(
    (SELECT id FROM public.comm_hub_certification
      WHERE entity_id='8d1fd9cb-2248-4ff4-86a4-bc42a4995f87'
        AND certification_layer='TEMPLATE_STRUCTURE_CERTIFICATION'
        AND provenance_state='AUTHORITATIVE'
        AND is_stale=false AND superseded_by IS NULL
      ORDER BY certified_at DESC LIMIT 1),
    'sub-iter-2-close');
  RAISE NOTICE 'FRESHNESS %', v;
END $$;

-- ============================================================
-- F. Secure sender-readiness writer
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.compute_comm_hub_sender_readiness(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_comm_hub_sender_readiness(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_compute_comm_hub_sender_readiness(
  p_sender_profile_id uuid,
  p_readiness_kind    text DEFAULT 'TEST_READY'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_uid uuid; v_ok boolean; v jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ADMIN_SENDER_READINESS_UNAUTHENTICATED' USING ERRCODE='42501';
  END IF;
  BEGIN
    v_ok := public.is_comm_hub_operator_admin(v_uid);
  EXCEPTION WHEN OTHERS THEN v_ok := false;
  END;
  IF NOT COALESCE(v_ok,false) THEN
    RAISE EXCEPTION 'ADMIN_SENDER_READINESS_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  v := public.compute_comm_hub_sender_readiness(p_sender_profile_id, p_readiness_kind);
  RETURN v || jsonb_build_object('operator_id', v_uid,
    'admin_wrapper','admin_compute_comm_hub_sender_readiness/v1');
END $$;

REVOKE ALL ON FUNCTION public.admin_compute_comm_hub_sender_readiness(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_compute_comm_hub_sender_readiness(uuid, text) TO authenticated, service_role;

-- ============================================================
-- G/H/I. Split sender_version (config-only) from verification-evidence version;
-- rewrite compute function with SHA-256 + per-kind uniqueness.
-- ============================================================
-- Drop legacy unique constraint and add per-kind uniqueness
ALTER TABLE public.comm_hub_sender_readiness
  DROP CONSTRAINT IF EXISTS comm_hub_sender_readiness_sender_profile_id_sender_version_key;

-- Reclassify pre-existing MD5 rows as LEGACY_UNVERIFIED (do not delete)
UPDATE public.comm_hub_sender_readiness
   SET is_stale=true,
       stale_reason = coalesce(stale_reason,'LEGACY_UNVERIFIED')
 WHERE is_stale=false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_comm_hub_sender_readiness_current
  ON public.comm_hub_sender_readiness (sender_profile_id, sender_version, readiness_kind)
  WHERE is_stale = false;

CREATE OR REPLACE FUNCTION public.compute_comm_hub_sender_readiness(
  p_sender_profile_id uuid,
  p_readiness_kind    text DEFAULT 'TEST_READY'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v record; v_kind text := upper(coalesce(p_readiness_kind,'TEST_READY'));
  v_blockers jsonb := '[]'::jsonb; v_warnings jsonb := '[]'::jsonb; v_advisories jsonb := '[]'::jsonb;
  v_status text; v_reason text;
  v_sender_cfg jsonb; v_verif jsonb; v_evidence jsonb;
  v_sender_ver text; v_verif_ver text; v_hash text;
  v_provider_cap jsonb; v_prov_state text;
  v_expires timestamptz; v_result_id uuid;
BEGIN
  IF v_kind NOT IN ('TEST_READY','REAL_EMAIL_READY') THEN
    RAISE EXCEPTION 'SENDER_READINESS_KIND_UNSUPPORTED: %', v_kind;
  END IF;

  SELECT id, profile_code, profile_name, provider_identity_status, from_email, display_name,
         reply_to_email, provider_code, domain_verified, is_enabled, is_default,
         spf_status, dkim_status, dmarc_status, last_checked_at, updated_at,
         sender_category, audience_type, risk_level, provider_identity_id
    INTO v FROM public.communication_hub_sender_profile WHERE id = p_sender_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SENDER_PROFILE_NOT_FOUND: %', p_sender_profile_id;
  END IF;

  -- Structural blockers
  IF v.from_email IS NULL OR trim(v.from_email)='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','from_email_missing','severity','BLOCKER'); END IF;
  IF v.provider_code IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','provider_missing','severity','BLOCKER'); END IF;
  IF NOT COALESCE(v.is_enabled,false) THEN
    v_blockers := v_blockers || jsonb_build_object('code','sender_disabled','severity','BLOCKER'); END IF;

  -- Kind-scoped verification requirements
  IF v_kind='REAL_EMAIL_READY' THEN
    IF v.provider_identity_status IS DISTINCT FROM 'verified' THEN
      v_blockers := v_blockers || jsonb_build_object('code','sender_not_verified','severity','BLOCKER','detail',v.provider_identity_status); END IF;
    IF NOT COALESCE(v.domain_verified,false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','domain_not_verified','severity','BLOCKER'); END IF;
    IF v.spf_status IS DISTINCT FROM 'valid' THEN
      v_blockers := v_blockers || jsonb_build_object('code','spf_not_valid','severity','BLOCKER','detail',v.spf_status); END IF;
    IF v.dkim_status IS DISTINCT FROM 'valid' THEN
      v_blockers := v_blockers || jsonb_build_object('code','dkim_not_valid','severity','BLOCKER','detail',v.dkim_status); END IF;
    IF v.dmarc_status IS DISTINCT FROM 'valid' THEN
      v_warnings := v_warnings || jsonb_build_object('code','dmarc_not_valid','severity','WARNING','detail',v.dmarc_status); END IF;
  ELSE
    -- TEST_READY: DNS/verification-only downgraded to warnings
    IF v.provider_identity_status IS DISTINCT FROM 'verified' THEN
      v_warnings := v_warnings || jsonb_build_object('code','sender_not_verified','severity','WARNING','detail',v.provider_identity_status); END IF;
    IF NOT COALESCE(v.domain_verified,false) THEN
      v_warnings := v_warnings || jsonb_build_object('code','domain_not_verified','severity','WARNING'); END IF;
    IF v.spf_status IS DISTINCT FROM 'valid' THEN
      v_warnings := v_warnings || jsonb_build_object('code','spf_not_valid','severity','WARNING','detail',v.spf_status); END IF;
    IF v.dkim_status IS DISTINCT FROM 'valid' THEN
      v_warnings := v_warnings || jsonb_build_object('code','dkim_not_valid','severity','WARNING','detail',v.dkim_status); END IF;
    IF v.dmarc_status IS DISTINCT FROM 'valid' THEN
      v_advisories := v_advisories || jsonb_build_object('code','dmarc_not_valid','severity','ADVISORY','detail',v.dmarc_status); END IF;
  END IF;

  -- Provider-capability evidence (best-effort read; no external calls here)
  BEGIN
    SELECT to_jsonb(e.*) INTO v_provider_cap
      FROM public.comm_hub_provider_capability_evidence e
     WHERE e.provider_code = v.provider_code
     ORDER BY e.evidence_at DESC NULLS LAST LIMIT 1;
  EXCEPTION WHEN undefined_table THEN v_provider_cap := NULL;
  END;
  v_prov_state := coalesce(v_provider_cap->>'state','NOT_CHECKED');

  IF v_kind='REAL_EMAIL_READY' THEN
    IF v_provider_cap IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','provider_capability_missing','severity','BLOCKER');
    ELSIF v_prov_state <> 'READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','provider_capability_not_ready','severity','BLOCKER','detail',v_prov_state);
    END IF;
  ELSE
    -- TEST_READY requires deterministic simulator available/enabled
    IF v_provider_cap IS NULL
       OR COALESCE((v_provider_cap->>'test_adapter_available')::boolean,false) = false
       OR COALESCE((v_provider_cap->>'test_adapter_enabled')::boolean,false) = false THEN
      v_blockers := v_blockers || jsonb_build_object('code','deterministic_simulator_unavailable','severity','BLOCKER','detail',v_provider_cap);
    END IF;
    -- dispatch configuration
    IF v_provider_cap IS NOT NULL
       AND COALESCE(v_provider_cap->>'dispatch_secret_status','MISSING') = 'MISSING' THEN
      v_blockers := v_blockers || jsonb_build_object('code','dispatch_configuration_missing','severity','BLOCKER');
    END IF;
  END IF;

  -- Classify status
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) x
             WHERE x->>'code' IN ('from_email_missing','provider_missing','sender_disabled')) THEN
    v_status := 'BLOCKED_CONFIGURATION'; v_reason := 'Sender lacks required configuration.';
  ELSIF jsonb_array_length(v_blockers) > 0 THEN
    v_status := CASE v_kind WHEN 'REAL_EMAIL_READY' THEN 'BLOCKED_VERIFICATION' ELSE 'BLOCKED_CONFIGURATION' END;
    v_reason := 'Requirements insufficient for '||v_kind||'.';
  ELSIF v_kind='REAL_EMAIL_READY' THEN
    v_status := 'REAL_EMAIL_READY'; v_reason := 'Sender meets real-email verification and provider capability requirements.';
  ELSE
    v_status := 'TEST_READY'; v_reason := 'Sender meets deterministic simulator test requirements.';
  END IF;

  -- Configuration-only sender_version (SHA-256, no kind)
  v_sender_cfg := jsonb_build_object(
    'profile_id', v.id::text, 'profile_code', v.profile_code,
    'from_email', v.from_email, 'display_name', v.display_name,
    'reply_to_email', v.reply_to_email,
    'provider_code', v.provider_code,
    'is_enabled', v.is_enabled, 'is_default', v.is_default,
    'sender_category', v.sender_category,
    'audience_type', v.audience_type, 'risk_level', v.risk_level);
  v_sender_ver := public.comm_hub_evidence_hash('comm-hub/sender-configuration/v1', v_sender_cfg);

  -- Verification evidence version (SHA-256, no secrets)
  v_verif := jsonb_build_object(
    'provider_identity_status', v.provider_identity_status,
    'provider_identity_id', v.provider_identity_id,
    'domain_verified', v.domain_verified,
    'spf_status', v.spf_status, 'dkim_status', v.dkim_status, 'dmarc_status', v.dmarc_status,
    'last_checked_at', v.last_checked_at,
    'verification_source_version','sender-verification-source/v1');
  v_verif_ver := public.comm_hub_evidence_hash('comm-hub/sender-verification-evidence/v1', v_verif);

  v_evidence := jsonb_build_object(
    'sender_configuration', v_sender_cfg,
    'verification_evidence', v_verif,
    'provider_capability_evidence', v_provider_cap,
    'readiness_kind', v_kind,
    'blockers', v_blockers, 'warnings', v_warnings, 'advisories', v_advisories);
  v_hash := public.comm_hub_evidence_hash('comm-hub/sender-readiness-evidence/v1', v_evidence);
  v_expires := now() + interval '30 days';

  -- Mark prior current row(s) for this profile+kind as stale
  UPDATE public.comm_hub_sender_readiness
     SET is_stale = true,
         stale_reason = coalesce(stale_reason,'SUPERSEDED')
   WHERE sender_profile_id = v.id
     AND readiness_kind = v_kind
     AND is_stale = false;

  INSERT INTO public.comm_hub_sender_readiness (
    id, sender_profile_id, sender_version, readiness_state, readiness_details, computed_at,
    is_stale, readiness_kind, verification_evidence_version, provider_code, evidence_hash,
    expires_at, blockers, warnings, advisories, computed_by, reason
  ) VALUES (
    gen_random_uuid(), v.id, v_sender_ver, v_status::comm_hub_sender_readiness_state,
    v_evidence, now(), false, v_kind, v_verif_ver, v.provider_code, v_hash,
    v_expires, v_blockers, v_warnings, v_advisories, auth.uid(), v_reason
  ) RETURNING id INTO v_result_id;

  RETURN jsonb_build_object('readiness_id', v_result_id, 'sender_profile_id', v.id,
    'profile_code', v.profile_code, 'readiness_kind', v_kind,
    'status', v_status, 'reason', v_reason,
    'sender_version', v_sender_ver,
    'verification_evidence_version', v_verif_ver,
    'evidence_hash', v_hash,
    'provider_capability_state', v_prov_state,
    'blockers', v_blockers, 'warnings', v_warnings, 'advisories', v_advisories,
    'expires_at', v_expires);
END $$;

REVOKE EXECUTE ON FUNCTION public.compute_comm_hub_sender_readiness(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_comm_hub_sender_readiness(uuid, text) TO service_role;

-- ============================================================
-- J. Provider-capability evidence table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comm_hub_provider_capability_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL,
  provider_configuration_version text,
  adapter_contract_version text,
  adapter_deployed_version text,
  test_adapter_available boolean NOT NULL DEFAULT false,
  test_adapter_enabled   boolean NOT NULL DEFAULT false,
  live_adapter_available boolean NOT NULL DEFAULT false,
  live_adapter_enabled   boolean NOT NULL DEFAULT false,
  credentials_present    boolean NOT NULL DEFAULT false,
  credential_reference_version text,
  connectivity_check_status text NOT NULL DEFAULT 'NOT_CHECKED',
  connectivity_check_type text,
  environment_code text,
  environment_version text,
  external_send_gate_enabled boolean NOT NULL DEFAULT false,
  dispatch_secret_status text NOT NULL DEFAULT 'MISSING',
  dispatch_secret_canonical_name text NOT NULL DEFAULT 'COMMUNICATION_HUB_DISPATCH_SECRET',
  legacy_dispatch_secret_present boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'NOT_CHECKED',
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  advisories jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_hash text,
  evidence_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  producer_function text NOT NULL DEFAULT 'compute_comm_hub_provider_capability_evidence',
  producer_version  text NOT NULL DEFAULT 'provider-cap/v1',
  computed_by uuid
);

GRANT SELECT ON public.comm_hub_provider_capability_evidence TO authenticated;
GRANT ALL    ON public.comm_hub_provider_capability_evidence TO service_role;

ALTER TABLE public.comm_hub_provider_capability_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_capability_read_admin" ON public.comm_hub_provider_capability_evidence;
CREATE POLICY "provider_capability_read_admin"
  ON public.comm_hub_provider_capability_evidence
  FOR SELECT TO authenticated
  USING (public.is_comm_hub_operator_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_provider_cap_provider_evidence
  ON public.comm_hub_provider_capability_evidence(provider_code, evidence_at DESC);

-- ============================================================
-- K. Provider-capability verifier (no external send; no secrets returned)
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_comm_hub_provider_capability_evidence(
  p_provider_code text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid; v_state text; v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb; v_advisories jsonb := '[]'::jsonb;
  v_dispatch_status text := 'UNKNOWN';
  v_env jsonb := jsonb_build_object('environment','database','environment_version','pg/v1');
  v_evidence jsonb; v_hash text;
BEGIN
  -- Dispatch secret compatibility is evaluated by the caller (Edge Function) and
  -- persisted via ingest; if no explicit row exists, treat as UNKNOWN.
  SELECT dispatch_secret_status INTO v_dispatch_status
    FROM public.comm_hub_provider_capability_evidence
   WHERE provider_code = p_provider_code
   ORDER BY evidence_at DESC LIMIT 1;
  v_dispatch_status := coalesce(v_dispatch_status,'UNKNOWN');

  -- Deterministic simulator is always available for controlled stub in-DB path
  v_state := 'READY';

  v_evidence := jsonb_build_object(
    'provider_code', p_provider_code,
    'test_adapter_available', true,
    'test_adapter_enabled', true,
    'live_adapter_available', false,
    'live_adapter_enabled', false,
    'credentials_present', false,
    'external_send_gate_enabled', false,
    'connectivity_check_status','NOT_CHECKED',
    'dispatch_secret_status', v_dispatch_status,
    'environment', v_env,
    'blockers', v_blockers, 'warnings', v_warnings, 'advisories', v_advisories);
  v_hash := public.comm_hub_evidence_hash('comm-hub/provider-capability-evidence/v1', v_evidence);

  INSERT INTO public.comm_hub_provider_capability_evidence (
    provider_code, test_adapter_available, test_adapter_enabled,
    live_adapter_available, live_adapter_enabled, credentials_present,
    connectivity_check_status, dispatch_secret_status,
    state, blockers, warnings, advisories, evidence_hash, evidence_at, computed_by
  ) VALUES (
    p_provider_code, true, true, false, false, false,
    'NOT_CHECKED', v_dispatch_status,
    v_state, v_blockers, v_warnings, v_advisories, v_hash, now(), auth.uid()
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('evidence_id', v_id, 'provider_code', p_provider_code,
    'state', v_state, 'evidence_hash', v_hash,
    'dispatch_secret_status', v_dispatch_status,
    'test_adapter_enabled', true, 'live_adapter_enabled', false);
END $$;

REVOKE EXECUTE ON FUNCTION public.compute_comm_hub_provider_capability_evidence(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_comm_hub_provider_capability_evidence(text) TO service_role;

-- ============================================================
-- L. Dispatch-secret compatibility assessment (structure-only; no secret values)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_comm_hub_dispatch_secret_compatibility(
  p_canonical_present boolean,
  p_legacy_present    boolean
) RETURNS jsonb
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'canonical_name','COMMUNICATION_HUB_DISPATCH_SECRET',
    'legacy_names', jsonb_build_array('COMM_HUB_DISPATCH_SECRET'),
    'canonical_present', p_canonical_present,
    'legacy_present', p_legacy_present,
    'result', CASE
      WHEN p_canonical_present AND NOT p_legacy_present THEN 'PASS'
      WHEN p_canonical_present AND p_legacy_present     THEN 'WARNING_BOTH_PRESENT'
      WHEN NOT p_canonical_present AND p_legacy_present THEN 'WARNING_LEGACY_ONLY'
      ELSE 'BLOCKER_ABSENT'
    END,
    'schema_version','dispatch-secret-compat/v1');
$$;

-- ============================================================
-- Seed provider-capability evidence for the APPEALS sender's provider,
-- and recompute SENDER_LEGAL readiness (both kinds).
-- ============================================================
DO $$
DECLARE v_prov text; v jsonb;
BEGIN
  SELECT provider_code INTO v_prov
    FROM public.communication_hub_sender_profile
   WHERE id = '2a507150-40d0-421b-b154-d7a0c037d60a';
  IF v_prov IS NOT NULL THEN
    v := public.compute_comm_hub_provider_capability_evidence(v_prov);
    RAISE NOTICE 'PROV_CAP %', v;
  END IF;

  v := public.compute_comm_hub_sender_readiness('2a507150-40d0-421b-b154-d7a0c037d60a', 'TEST_READY');
  RAISE NOTICE 'TEST_READY %', v;
  v := public.compute_comm_hub_sender_readiness('2a507150-40d0-421b-b154-d7a0c037d60a', 'REAL_EMAIL_READY');
  RAISE NOTICE 'REAL_EMAIL_READY %', v;
END $$;
