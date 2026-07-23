
CREATE OR REPLACE FUNCTION public.compute_comm_hub_sender_readiness(
  p_sender_profile_id uuid,
  p_readiness_kind text DEFAULT 'TEST_READY'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v record;
  v_kind text := upper(coalesce(p_readiness_kind,'TEST_READY'));
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_advisories jsonb := '[]'::jsonb;
  v_status text;
  v_reason text;
  v_hash text;
  v_verif_ver text;
  v_sender_ver text;
  v_evidence jsonb;
  v_expires timestamptz;
  v_result_id uuid;
BEGIN
  IF v_kind NOT IN ('TEST_READY','REAL_EMAIL_READY') THEN
    RAISE EXCEPTION 'SENDER_READINESS_KIND_UNSUPPORTED: %', v_kind;
  END IF;

  SELECT id, profile_code, profile_name, provider_identity_status, from_email, display_name,
         provider_code, domain_verified, is_enabled, spf_status, dkim_status, dmarc_status,
         last_checked_at, updated_at
    INTO v
  FROM communication_hub_sender_profile
  WHERE id = p_sender_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SENDER_PROFILE_NOT_FOUND: %', p_sender_profile_id;
  END IF;

  -- Configuration blockers
  IF v.from_email IS NULL OR trim(v.from_email)='' THEN
    v_blockers := v_blockers || jsonb_build_object('code','from_email_missing','severity','BLOCKER','stage','SENDER');
  END IF;
  IF v.provider_code IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','provider_missing','severity','BLOCKER','stage','SENDER');
  END IF;
  IF NOT COALESCE(v.is_enabled,false) THEN
    v_blockers := v_blockers || jsonb_build_object('code','sender_disabled','severity','BLOCKER','stage','SENDER');
  END IF;
  IF v.provider_identity_status IS DISTINCT FROM 'verified' THEN
    v_blockers := v_blockers || jsonb_build_object('code','sender_not_verified','severity','BLOCKER','stage','SENDER','detail',v.provider_identity_status);
  END IF;

  -- Verification evidence (SPF/DKIM/DMARC use 'valid' as PASS)
  IF v.spf_status IS DISTINCT FROM 'valid' THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','spf_not_valid','severity','BLOCKER','detail',v.spf_status);
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','spf_not_valid','severity','WARNING','detail',v.spf_status);
    END IF;
  END IF;
  IF v.dkim_status IS DISTINCT FROM 'valid' THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','dkim_not_valid','severity','BLOCKER','detail',v.dkim_status);
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','dkim_not_valid','severity','WARNING','detail',v.dkim_status);
    END IF;
  END IF;
  IF v.dmarc_status IS DISTINCT FROM 'valid' THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_warnings := v_warnings || jsonb_build_object('code','dmarc_not_valid','severity','WARNING','detail',v.dmarc_status);
    ELSE
      v_advisories := v_advisories || jsonb_build_object('code','dmarc_not_valid','severity','ADVISORY','detail',v.dmarc_status);
    END IF;
  END IF;
  IF NOT COALESCE(v.domain_verified,false) THEN
    IF v_kind='REAL_EMAIL_READY' THEN
      v_blockers := v_blockers || jsonb_build_object('code','domain_not_verified','severity','BLOCKER');
    ELSE
      v_warnings := v_warnings || jsonb_build_object('code','domain_not_verified','severity','WARNING');
    END IF;
  END IF;

  -- Status resolution
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_blockers) x
             WHERE x->>'code' IN ('from_email_missing','provider_missing','sender_disabled')) THEN
    v_status := 'BLOCKED_CONFIGURATION';
    v_reason := 'Sender lacks required configuration.';
  ELSIF jsonb_array_length(v_blockers) > 0 THEN
    v_status := 'BLOCKED_VERIFICATION';
    v_reason := 'Verification evidence insufficient for '||v_kind||'.';
  ELSIF v_kind='REAL_EMAIL_READY' THEN
    v_status := 'REAL_EMAIL_READY';
    v_reason := 'Sender meets real-email verification requirements.';
  ELSE
    v_status := 'TEST_READY';
    v_reason := 'Sender meets test-mode requirements.';
  END IF;

  v_verif_ver := md5(concat_ws('|',
    coalesce(v.spf_status,''), coalesce(v.dkim_status,''), coalesce(v.dmarc_status,''),
    coalesce(v.domain_verified::text,''), coalesce(v.provider_identity_status,'')));
  v_sender_ver := md5(concat_ws('|',
    coalesce(v.profile_code,''), coalesce(v.from_email,''), coalesce(v.display_name,''),
    coalesce(v.provider_code,''), coalesce(v.is_enabled::text,'')));
  v_evidence := jsonb_build_object(
    'profile_code', v.profile_code, 'profile_name', v.profile_name,
    'from_email', v.from_email, 'display_name', v.display_name,
    'provider_code', v.provider_code, 'provider_identity_status', v.provider_identity_status,
    'domain_verified', v.domain_verified, 'is_enabled', v.is_enabled,
    'spf_status', v.spf_status, 'dkim_status', v.dkim_status, 'dmarc_status', v.dmarc_status,
    'last_checked_at', v.last_checked_at, 'readiness_kind', v_kind);
  v_hash := md5(v_evidence::text);
  v_expires := now() + interval '30 days';

  INSERT INTO comm_hub_sender_readiness(
    id, sender_profile_id, sender_version, readiness_state, readiness_details, computed_at,
    is_stale, readiness_kind, verification_evidence_version, provider_code, evidence_hash,
    expires_at, blockers, warnings, advisories, computed_by, reason)
  VALUES (
    gen_random_uuid(), v.id, v_sender_ver, v_status::comm_hub_sender_readiness_state, v_evidence, now(),
    false, v_kind, v_verif_ver, v.provider_code, v_hash,
    v_expires, v_blockers, v_warnings, v_advisories, auth.uid(), v_reason)
  RETURNING id INTO v_result_id;

  RETURN jsonb_build_object(
    'readiness_id', v_result_id,
    'sender_profile_id', v.id,
    'profile_code', v.profile_code,
    'readiness_kind', v_kind,
    'status', v_status,
    'reason', v_reason,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'advisories', v_advisories,
    'evidence_hash', v_hash,
    'evidence_version', v_verif_ver,
    'sender_version', v_sender_ver,
    'expires_at', v_expires,
    'evidence', v_evidence);
END;$$;

GRANT EXECUTE ON FUNCTION public.compute_comm_hub_sender_readiness(uuid,text) TO authenticated, service_role;
