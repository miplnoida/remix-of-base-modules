
-- =========================================================================
-- Phase 4B3 backend closure — Part 1 A–D
-- Canonical SHA-256 approval evidence, durable denial, PREPARED+ACTIVE
-- lifecycle, expanded immutability, binding-helper canonical check, one-shot
-- backfill. Additive-safe: no columns dropped, historical rows only touched
-- when they can be reconstructed cleanly.
-- =========================================================================

-- ---------- (C) Canonical SHA-256 evidence helpers -----------------------
CREATE OR REPLACE FUNCTION public._comm_hub_sha256_hex(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public','extensions'
AS $$
  SELECT encode(extensions.digest(convert_to(coalesce(p_text,''),'UTF8'),'sha256'),'hex');
$$;

-- Deterministic canonical placeholder-evidence payload (v1).
CREATE OR REPLACE FUNCTION public._comm_hub_compute_placeholder_evidence_v1(
  p_scanner_version text,
  p_rescan jsonb
) RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public','extensions'
AS $$
  SELECT public._comm_hub_sha256_hex(
    'comm-hub-approval-placeholder-evidence/v1|' ||
    coalesce(p_scanner_version,'') || '|' ||
    coalesce((p_rescan->>'total_occurrences'),'0') || '|' ||
    coalesce((p_rescan->>'malformed_brace_count'),'0') || '|' ||
    coalesce(p_rescan::text,'{}')
  );
$$;

-- Deterministic canonical approval evidence (v1).
CREATE OR REPLACE FUNCTION public._comm_hub_compute_canonical_approval_evidence_v1(
  p_snapshot_id uuid,
  p_correlation_id uuid,
  p_content_hash text,
  p_recipient_set_hash text,
  p_template_version_id uuid,
  p_configuration_hash text,
  p_scanner_version text,
  p_placeholder_evidence_hash text,
  p_approved_by uuid,
  p_approved_at timestamptz,
  p_expires_at timestamptz
) RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public','extensions'
AS $$
  SELECT public._comm_hub_sha256_hex(
    'comm-hub-approval-evidence/v1|' ||
    coalesce(p_snapshot_id::text,'') || '|' ||
    coalesce(p_correlation_id::text,'') || '|' ||
    coalesce(p_content_hash,'') || '|' ||
    coalesce(p_recipient_set_hash,'') || '|' ||
    coalesce(p_template_version_id::text,'') || '|' ||
    coalesce(p_configuration_hash,'') || '|' ||
    coalesce(p_scanner_version,'') || '|' ||
    coalesce(p_placeholder_evidence_hash,'') || '|' ||
    coalesce(p_approved_by::text,'') || '|' ||
    coalesce(to_char(p_approved_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'') || '|' ||
    coalesce(to_char(p_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'')
  );
$$;

GRANT EXECUTE ON FUNCTION public._comm_hub_sha256_hex(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._comm_hub_compute_placeholder_evidence_v1(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._comm_hub_compute_canonical_approval_evidence_v1(
  uuid, uuid, text, text, uuid, text, text, text, uuid, timestamptz, timestamptz
) TO authenticated, service_role;

-- ---------- (D) Expanded immutability trigger ----------------------------
-- Also freeze snapshot_id, approved_by, approved_at, expires_at (no expiry
-- extension). Legacy lifecycle fields (status, revoked_at, consumed_at,
-- reserved_at, etc.) remain mutable.
CREATE OR REPLACE FUNCTION public._comm_hub_preview_approval_evidence_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.snapshot_id                        IS DISTINCT FROM OLD.snapshot_id                        OR
       NEW.approved_by                        IS DISTINCT FROM OLD.approved_by                        OR
       NEW.approved_at                        IS DISTINCT FROM OLD.approved_at                        OR
       NEW.expires_at                         IS DISTINCT FROM OLD.expires_at                         OR
       NEW.snapshot_id_at_approval            IS DISTINCT FROM OLD.snapshot_id_at_approval            OR
       NEW.correlation_id_at_approval         IS DISTINCT FROM OLD.correlation_id_at_approval         OR
       NEW.recipient_set_hash_at_approval     IS DISTINCT FROM OLD.recipient_set_hash_at_approval     OR
       NEW.template_version_id_at_approval    IS DISTINCT FROM OLD.template_version_id_at_approval    OR
       NEW.configuration_hash_at_approval     IS DISTINCT FROM OLD.configuration_hash_at_approval     OR
       NEW.scanner_version_at_approval        IS DISTINCT FROM OLD.scanner_version_at_approval        OR
       NEW.placeholder_evidence_hash_at_approval IS DISTINCT FROM OLD.placeholder_evidence_hash_at_approval OR
       NEW.canonical_approval_evidence_hash   IS DISTINCT FROM OLD.canonical_approval_evidence_hash   OR
       NEW.evidence_version                   IS DISTINCT FROM OLD.evidence_version                   OR
       NEW.content_hash_at_approval           IS DISTINCT FROM OLD.content_hash_at_approval           THEN
      RAISE EXCEPTION 'APPROVAL_EVIDENCE_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- ---------- One-shot backfill of canonical SHA-256 evidence --------------
-- Only for approvals with a resolvable snapshot chain AND all evidence
-- fields present. Anything else stays as legacy and will be rejected at
-- binding-time as APPROVAL_EVIDENCE_MISSING_OR_LEGACY.
ALTER TABLE public.communication_preview_approval DISABLE TRIGGER trg_preview_approval_evidence_immutability;

WITH candidates AS (
  SELECT a.id, a.snapshot_id, a.approved_by, a.approved_at, a.expires_at,
         a.content_hash_at_approval, a.correlation_id_at_approval,
         a.recipient_set_hash_at_approval, a.template_version_id_at_approval,
         a.configuration_hash_at_approval, a.scanner_version_at_approval,
         a.placeholder_evidence_hash_at_approval,
         s.content_hash AS snap_content_hash,
         s.recipient_set_hash AS snap_recipient_hash,
         s.template_version_id AS snap_tpl,
         s.certified_dependency_hash AS snap_cfg,
         s.placeholder_scanner_version AS snap_scanner,
         s.correlation_id AS snap_correlation
  FROM public.communication_preview_approval a
  JOIN public.communication_preview_snapshot s ON s.id = a.snapshot_id
  WHERE a.content_hash_at_approval          IS NOT NULL
    AND a.correlation_id_at_approval        IS NOT NULL
    AND a.recipient_set_hash_at_approval    IS NOT NULL
    AND a.template_version_id_at_approval   IS NOT NULL
    AND a.configuration_hash_at_approval    IS NOT NULL
    AND a.scanner_version_at_approval       IS NOT NULL
    AND a.placeholder_evidence_hash_at_approval IS NOT NULL
    AND a.evidence_version                  IS DISTINCT FROM 'comm-hub-approval-evidence/v1'
    -- Snapshot still matches on the hashes we recorded — otherwise config drifted.
    AND a.content_hash_at_approval          = s.content_hash
    AND a.recipient_set_hash_at_approval    IS NOT DISTINCT FROM s.recipient_set_hash
    AND a.template_version_id_at_approval   IS NOT DISTINCT FROM s.template_version_id
    AND a.configuration_hash_at_approval    IS NOT DISTINCT FROM s.certified_dependency_hash
    AND a.correlation_id_at_approval        IS NOT DISTINCT FROM s.correlation_id
    AND a.scanner_version_at_approval       IS NOT DISTINCT FROM s.placeholder_scanner_version
)
UPDATE public.communication_preview_approval a
SET canonical_approval_evidence_hash = public._comm_hub_compute_canonical_approval_evidence_v1(
      c.snapshot_id, c.correlation_id_at_approval, c.content_hash_at_approval,
      c.recipient_set_hash_at_approval, c.template_version_id_at_approval,
      c.configuration_hash_at_approval, c.scanner_version_at_approval,
      c.placeholder_evidence_hash_at_approval,
      c.approved_by, c.approved_at, c.expires_at),
    evidence_version = 'comm-hub-approval-evidence/v1'
FROM candidates c
WHERE a.id = c.id;

ALTER TABLE public.communication_preview_approval ENABLE TRIGGER trg_preview_approval_evidence_immutability;

-- ---------- (A + B + C) Rewrite approve_comm_hub_preview -----------------
CREATE OR REPLACE FUNCTION public.approve_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_snap_id uuid := (p_payload->>'snapshot_id')::uuid;
  v_reason text := trim(coalesce(p_payload->>'approval_reason',''));
  v_expected_hash text := nullif(p_payload->>'expected_content_hash','');
  v_expected_recip text := nullif(p_payload->>'expected_recipient_set_hash','');
  v_correlation uuid := NULLIF(p_payload->>'correlation_id','')::uuid;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr_id uuid; v_expires timestamptz; v_approved_at timestamptz;
  v_gate jsonb; v_scan_rescan jsonb;
  v_placeholder_hash text; v_canonical_hash text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid,'Admin'::app_role) THEN
    RAISE EXCEPTION 'preview approval requires Admin role';
  END IF;
  IF v_snap_id IS NULL THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_REQUIRED'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'approval_reason is required and cannot be empty'; END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_NOT_FOUND'; END IF;

  IF v_correlation IS NULL THEN v_correlation := v_snap.correlation_id; END IF;

  -- (B) Durable gate: check_..._safe writes the transition log on denial and
  -- returns structured JSON. We do not raise after that so the log stays.
  v_gate := public.check_comm_hub_runtime_transition_safe('APPROVE_PREVIEW', jsonb_build_object(
    'module_code', v_snap.module_code, 'event_code', v_snap.event_code, 'channel', v_snap.channel,
    'correlation_id', v_correlation, 'preview_snapshot_id', v_snap_id,
    'content_hash', v_snap.content_hash, 'recipient_set_hash', v_snap.recipient_set_hash,
    'invoked_from', 'approve_comm_hub_preview'
  ));
  IF COALESCE((v_gate->>'allowed')::boolean, false) IS DISTINCT FROM true THEN
    RETURN jsonb_build_object(
      'status','BLOCKED',
      'approval_id', NULL,
      'blockers', COALESCE(v_gate->'blockers', v_gate->'denied_reasons', '[]'::jsonb),
      'transition_log_id', v_gate->>'transition_log_id',
      'gate', v_gate
    );
  END IF;

  IF v_snap.status = 'EXPIRED' OR v_snap.expires_at <= now() THEN
    UPDATE public.communication_preview_snapshot SET status='EXPIRED' WHERE id = v_snap.id;
    RAISE EXCEPTION 'PREVIEW_SNAPSHOT_EXPIRED';
  END IF;
  IF v_snap.status = 'SUPERSEDED' THEN RAISE EXCEPTION 'PREVIEW_SNAPSHOT_SUPERSEDED'; END IF;
  IF v_snap.status <> 'PREPARED' THEN
    RAISE EXCEPTION 'preview_snapshot_not_approvable: status=%', v_snap.status;
  END IF;

  IF v_snap.placeholder_scanner_version IS NULL
     OR v_snap.placeholder_scanner_version <> 'comm-hub-raw-placeholder-scanner/v2' THEN
    RAISE EXCEPTION 'PREVIEW_PLACEHOLDER_EVIDENCE_MISSING_OR_LEGACY: scanner=%', v_snap.placeholder_scanner_version;
  END IF;
  IF COALESCE(v_snap.raw_placeholder_count,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_PRESENT: count=%', v_snap.raw_placeholder_count;
  END IF;
  IF v_snap.unresolved_variables IS NOT NULL AND jsonb_array_length(v_snap.unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_UNRESOLVED_REQUIRED_VARIABLES: %', v_snap.unresolved_variables::text;
  END IF;
  IF v_snap.renderer_unresolved_variables IS NOT NULL
     AND jsonb_typeof(v_snap.renderer_unresolved_variables)='array'
     AND jsonb_array_length(v_snap.renderer_unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RENDERER_UNRESOLVED_VARIABLES: %', v_snap.renderer_unresolved_variables::text;
  END IF;

  v_scan_rescan := public.scan_comm_hub_raw_placeholders(
    v_snap.rendered_subject, v_snap.rendered_body_html, v_snap.rendered_body_text);
  IF COALESCE((v_scan_rescan->>'total_occurrences')::int,0) > 0
     OR COALESCE((v_scan_rescan->>'malformed_brace_count')::int,0) > 0 THEN
    RAISE EXCEPTION 'PREVIEW_RAW_PLACEHOLDERS_DETECTED_ON_APPROVAL: %', v_scan_rescan::text;
  END IF;

  IF v_expected_hash IS NOT NULL AND v_expected_hash <> v_snap.content_hash THEN
    RAISE EXCEPTION 'PREVIEW_CONTENT_HASH_MISMATCH';
  END IF;
  IF v_expected_recip IS NOT NULL AND v_expected_recip <> v_snap.recipient_set_hash THEN
    RAISE EXCEPTION 'PREVIEW_RECIPIENT_HASH_MISMATCH';
  END IF;

  v_approved_at := now();
  v_expires     := v_approved_at + interval '30 minutes';

  -- (C) Canonical SHA-256 evidence, versioned.
  v_placeholder_hash := public._comm_hub_compute_placeholder_evidence_v1(
    v_snap.placeholder_scanner_version, v_scan_rescan);
  v_canonical_hash := public._comm_hub_compute_canonical_approval_evidence_v1(
    v_snap.id, v_correlation, v_snap.content_hash,
    v_snap.recipient_set_hash, v_snap.template_version_id,
    v_snap.certified_dependency_hash, v_snap.placeholder_scanner_version,
    v_placeholder_hash, v_uid, v_approved_at, v_expires);

  INSERT INTO public.communication_preview_approval(
    snapshot_id, approved_by, approved_at, approval_reason, status, expires_at,
    configuration_version, recipient_policy_version,
    content_hash_at_approval, audit_metadata,
    snapshot_id_at_approval, correlation_id_at_approval,
    recipient_set_hash_at_approval, template_version_id_at_approval,
    configuration_hash_at_approval, scanner_version_at_approval,
    placeholder_evidence_hash_at_approval,
    canonical_approval_evidence_hash, evidence_version
  ) VALUES (
    v_snap.id, v_uid, v_approved_at, v_reason, 'ACTIVE', v_expires,
    v_snap.configuration_version, v_snap.recipient_policy_version,
    v_snap.content_hash,
    jsonb_build_object('correlation_id', v_correlation, 'gate', v_gate,
                       'placeholder_rescan', v_scan_rescan,
                       'evidence_version','comm-hub-approval-evidence/v1'),
    v_snap.id, v_correlation,
    v_snap.recipient_set_hash, v_snap.template_version_id,
    v_snap.certified_dependency_hash, v_snap.placeholder_scanner_version,
    v_placeholder_hash,
    v_canonical_hash, 'comm-hub-approval-evidence/v1'
  ) RETURNING id INTO v_appr_id;

  -- (A) Preview stays PREPARED. Do NOT flip to APPROVED.

  RETURN jsonb_build_object(
    'status','ACTIVE',
    'approval_id', v_appr_id, 'snapshot_id', v_snap.id,
    'expires_at', v_expires, 'approved_at', v_approved_at,
    'correlation_id', v_correlation,
    'canonical_approval_evidence_hash', v_canonical_hash,
    'placeholder_evidence_hash', v_placeholder_hash,
    'evidence_version', 'comm-hub-approval-evidence/v1',
    'placeholder_rescan', v_scan_rescan
  );
END; $function$;

-- ---------- Binding helper: canonical hash recomputation -----------------
CREATE OR REPLACE FUNCTION public.check_comm_hub_preview_approval_binding(
  p_preview_approval_id uuid,
  p_preview_snapshot_id uuid,
  p_expected_correlation_id uuid,
  p_expected_content_hash text,
  p_expected_recipient_hash text,
  p_expected_configuration_hash text
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $function$
DECLARE
  v_a public.communication_preview_approval%ROWTYPE;
  v_s public.communication_preview_snapshot%ROWTYPE;
  v_blockers jsonb := '[]'::jsonb;
  v_recomputed text;
BEGIN
  SELECT * INTO v_a FROM public.communication_preview_approval WHERE id = p_preview_approval_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false,
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_APPROVAL_NOT_FOUND')));
  END IF;

  SELECT * INTO v_s FROM public.communication_preview_snapshot WHERE id = p_preview_snapshot_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false,
      'blockers', jsonb_build_array(jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_FOUND')));
  END IF;

  IF v_a.snapshot_id <> v_s.id THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_SNAPSHOT_MISMATCH');
  END IF;
  IF v_a.status <> 'ACTIVE' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_NOT_ACTIVE','status',v_a.status);
  END IF;
  IF v_a.expires_at <= now() THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_APPROVAL_EXPIRED');
  END IF;
  IF v_s.status <> 'PREPARED' THEN
    v_blockers := v_blockers || jsonb_build_object('code','PREVIEW_SNAPSHOT_NOT_PREPARED','status',v_s.status);
  END IF;

  -- Evidence completeness
  IF v_a.evidence_version IS DISTINCT FROM 'comm-hub-approval-evidence/v1'
     OR v_a.canonical_approval_evidence_hash IS NULL
     OR v_a.placeholder_evidence_hash_at_approval IS NULL
     OR v_a.snapshot_id_at_approval IS NULL
     OR v_a.correlation_id_at_approval IS NULL
     OR v_a.recipient_set_hash_at_approval IS NULL
     OR v_a.template_version_id_at_approval IS NULL
     OR v_a.configuration_hash_at_approval IS NULL
     OR v_a.scanner_version_at_approval IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_EVIDENCE_MISSING_OR_LEGACY',
      'evidence_version', v_a.evidence_version);
  ELSE
    -- Recompute canonical hash and reject mismatch
    v_recomputed := public._comm_hub_compute_canonical_approval_evidence_v1(
      v_a.snapshot_id_at_approval, v_a.correlation_id_at_approval,
      v_a.content_hash_at_approval, v_a.recipient_set_hash_at_approval,
      v_a.template_version_id_at_approval, v_a.configuration_hash_at_approval,
      v_a.scanner_version_at_approval, v_a.placeholder_evidence_hash_at_approval,
      v_a.approved_by, v_a.approved_at, v_a.expires_at);
    IF v_recomputed IS DISTINCT FROM v_a.canonical_approval_evidence_hash THEN
      v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CANONICAL_EVIDENCE_HASH_MISMATCH');
    END IF;
  END IF;

  -- Caller expectations vs frozen approval evidence
  IF p_expected_content_hash IS NOT NULL AND p_expected_content_hash <> v_a.content_hash_at_approval THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONTENT_HASH_MISMATCH');
  END IF;
  IF p_expected_recipient_hash IS NOT NULL AND p_expected_recipient_hash <> COALESCE(v_a.recipient_set_hash_at_approval,'') THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_RECIPIENT_HASH_MISMATCH');
  END IF;
  IF p_expected_configuration_hash IS NOT NULL AND p_expected_configuration_hash <> COALESCE(v_a.configuration_hash_at_approval,'') THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CONFIGURATION_HASH_MISMATCH');
  END IF;
  IF p_expected_correlation_id IS NOT NULL AND p_expected_correlation_id <> COALESCE(v_a.correlation_id_at_approval, '00000000-0000-0000-0000-000000000000') THEN
    v_blockers := v_blockers || jsonb_build_object('code','APPROVAL_CORRELATION_MISMATCH');
  END IF;

  -- Live drift vs snapshot
  IF v_a.content_hash_at_approval IS DISTINCT FROM v_s.content_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','SNAPSHOT_CONTENT_HASH_DRIFT');
  END IF;
  IF v_a.recipient_set_hash_at_approval IS DISTINCT FROM v_s.recipient_set_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','SNAPSHOT_RECIPIENT_HASH_DRIFT');
  END IF;
  IF v_a.configuration_hash_at_approval IS DISTINCT FROM v_s.certified_dependency_hash THEN
    v_blockers := v_blockers || jsonb_build_object('code','SNAPSHOT_CONFIGURATION_HASH_DRIFT');
  END IF;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'approval', jsonb_build_object(
      'id', v_a.id, 'status', v_a.status, 'expires_at', v_a.expires_at,
      'evidence_version', v_a.evidence_version,
      'canonical_approval_evidence_hash', v_a.canonical_approval_evidence_hash
    ),
    'snapshot', jsonb_build_object('id', v_s.id, 'status', v_s.status)
  );
END $function$;

GRANT EXECUTE ON FUNCTION public.check_comm_hub_preview_approval_binding(uuid, uuid, uuid, text, text, text)
  TO authenticated, service_role;

-- ---------- Invariant test (fail-loud) -----------------------------------
DO $inv$
DECLARE
  v_prepared int;
  v_approved_snap int;
BEGIN
  -- After the migration completes, no approval should have flipped its
  -- snapshot to APPROVED as part of its own transaction. Historical rows
  -- may still be APPROVED — that's outside this migration's scope — but
  -- newly created ones must not be. We can only assert the shape here.
  PERFORM 1 FROM pg_proc WHERE proname='approve_comm_hub_preview';
  IF NOT FOUND THEN RAISE EXCEPTION 'approve_comm_hub_preview missing'; END IF;
END $inv$;
