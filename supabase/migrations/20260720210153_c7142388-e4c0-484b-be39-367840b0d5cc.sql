
-- =========================================================================
-- CH-SIMPLE-P3C — Server-Verifiable Preview and Approval
-- =========================================================================

-- 1) Snapshot table (immutable server-rendered preview evidence).
CREATE TABLE IF NOT EXISTS public.communication_preview_snapshot (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code                 text NOT NULL,
  event_code                  text NOT NULL,
  channel                     text NOT NULL DEFAULT 'email',
  send_context                text NOT NULL,
  to_recipients               jsonb NOT NULL DEFAULT '[]'::jsonb,
  cc_recipients               jsonb NOT NULL DEFAULT '[]'::jsonb,
  bcc_recipients              jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipient_set_hash          text NOT NULL,
  template_id                 uuid NULL,
  template_version_id         uuid NULL,
  sender_profile_id           uuid NULL,
  rendered_subject            text NULL,
  rendered_body_html          text NULL,
  rendered_body_text          text NULL,
  subject_hash                text NOT NULL,
  body_hash                   text NOT NULL,
  content_hash                text NOT NULL,
  context_data                jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_hash                text NOT NULL,
  unresolved_variables        jsonb NOT NULL DEFAULT '[]'::jsonb,
  configuration_version       bigint NULL,
  recipient_policy_version    integer NULL,
  send_policy_version         integer NULL,
  review_policy_version       integer NULL,
  status                      text NOT NULL DEFAULT 'PREPARED'
    CHECK (status IN ('PREPARED','SUPERSEDED','EXPIRED','REVOKED')),
  created_by                  uuid NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  expires_at                  timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.communication_preview_snapshot TO authenticated;
GRANT ALL ON public.communication_preview_snapshot TO service_role;
ALTER TABLE public.communication_preview_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preview_snapshot_admin_read"
  ON public.communication_preview_snapshot FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE INDEX IF NOT EXISTS communication_preview_snapshot_event_idx
  ON public.communication_preview_snapshot(module_code, event_code, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS communication_preview_snapshot_creator_idx
  ON public.communication_preview_snapshot(created_by, created_at DESC);

-- 2) Approval table
CREATE TABLE IF NOT EXISTS public.communication_preview_approval (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id                 uuid NOT NULL REFERENCES public.communication_preview_snapshot(id) ON DELETE RESTRICT,
  approved_by                 uuid NOT NULL,
  approved_at                 timestamptz NOT NULL DEFAULT now(),
  approval_reason             text NOT NULL,
  status                      text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','RESERVED','CONSUMED','REVOKED','EXPIRED','INVALIDATED')),
  expires_at                  timestamptz NOT NULL,
  revoked_by                  uuid NULL,
  revoked_at                  timestamptz NULL,
  revocation_reason           text NULL,
  reserved_at                 timestamptz NULL,
  reserved_by                 uuid NULL,
  reservation_token           uuid NULL,
  consumed_at                 timestamptz NULL,
  consumed_by                 uuid NULL,
  consumed_request_id         uuid NULL,
  -- Version evidence copied from snapshot at approval time
  configuration_version       bigint NULL,
  recipient_policy_version    integer NULL,
  send_policy_version         integer NULL,
  review_policy_version       integer NULL,
  content_hash_at_approval    text NOT NULL,
  audit_metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.communication_preview_approval TO authenticated;
GRANT ALL ON public.communication_preview_approval TO service_role;
ALTER TABLE public.communication_preview_approval ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preview_approval_admin_read"
  ON public.communication_preview_approval FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE INDEX IF NOT EXISTS communication_preview_approval_snapshot_idx
  ON public.communication_preview_approval(snapshot_id);
CREATE INDEX IF NOT EXISTS communication_preview_approval_status_idx
  ON public.communication_preview_approval(status, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS communication_preview_approval_one_active_per_snapshot
  ON public.communication_preview_approval(snapshot_id)
  WHERE status IN ('ACTIVE','RESERVED');

-- 3) Immutability trigger — approval rows cannot be edited after creation
-- (state transitions happen via dedicated columns via RPC only, using specific fields).
-- We enforce that reason/snapshot/approved_by/approved_at/content_hash never change.
CREATE OR REPLACE FUNCTION public.communication_preview_approval_immutability()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approval_reason IS DISTINCT FROM OLD.approval_reason
     OR NEW.content_hash_at_approval IS DISTINCT FROM OLD.content_hash_at_approval
     OR NEW.configuration_version IS DISTINCT FROM OLD.configuration_version
     OR NEW.recipient_policy_version IS DISTINCT FROM OLD.recipient_policy_version THEN
    RAISE EXCEPTION 'communication_preview_approval is immutable for approval evidence fields';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_preview_approval_immutability ON public.communication_preview_approval;
CREATE TRIGGER trg_preview_approval_immutability
  BEFORE UPDATE ON public.communication_preview_approval
  FOR EACH ROW EXECUTE FUNCTION public.communication_preview_approval_immutability();

-- 4) Helper: normalise + hash recipient set
CREATE OR REPLACE FUNCTION public.comm_hub_normalize_recipient_set(
  p_to jsonb, p_cc jsonb, p_bcc jsonb
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_to  jsonb;
  v_cc  jsonb;
  v_bcc jsonb;
  v_hash text;
  v_norm text;
BEGIN
  SELECT coalesce(jsonb_agg(distinct lower(trim(x)) ORDER BY lower(trim(x))), '[]'::jsonb)
    INTO v_to FROM jsonb_array_elements_text(coalesce(p_to,'[]'::jsonb)) x WHERE trim(x) <> '';
  SELECT coalesce(jsonb_agg(distinct lower(trim(x)) ORDER BY lower(trim(x))), '[]'::jsonb)
    INTO v_cc FROM jsonb_array_elements_text(coalesce(p_cc,'[]'::jsonb)) x WHERE trim(x) <> '';
  SELECT coalesce(jsonb_agg(distinct lower(trim(x)) ORDER BY lower(trim(x))), '[]'::jsonb)
    INTO v_bcc FROM jsonb_array_elements_text(coalesce(p_bcc,'[]'::jsonb)) x WHERE trim(x) <> '';
  v_norm := 'TO:'||coalesce(v_to::text,'[]')||'|CC:'||coalesce(v_cc::text,'[]')||'|BCC:'||coalesce(v_bcc::text,'[]');
  v_hash := md5(v_norm);
  RETURN jsonb_build_object('to', v_to, 'cc', v_cc, 'bcc', v_bcc, 'hash', v_hash);
END;
$$;

-- 5) Helper: render tokens {{key}} from context data
CREATE OR REPLACE FUNCTION public.comm_hub_render_template(
  p_source text, p_context jsonb
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_out text := coalesce(p_source,'');
  v_key text;
  v_val text;
  v_unresolved text[] := ARRAY[]::text[];
  v_match text;
BEGIN
  IF p_context IS NOT NULL AND jsonb_typeof(p_context) = 'object' THEN
    FOR v_key IN SELECT jsonb_object_keys(p_context) LOOP
      v_val := coalesce(p_context->>v_key, '');
      v_out := regexp_replace(v_out, '\{\{\s*'||regexp_replace(v_key,'([\.\+\*\?\(\)\[\]\{\}\|\^\$\\])','\\\1','g')||'\s*\}\}', v_val, 'g');
    END LOOP;
  END IF;
  -- Collect remaining unresolved {{tokens}}
  FOR v_match IN SELECT (regexp_matches(v_out, '\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}','g'))[1] LOOP
    IF NOT (v_match = ANY (v_unresolved)) THEN
      v_unresolved := v_unresolved || v_match;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('rendered', v_out, 'unresolved', to_jsonb(v_unresolved));
END;
$$;

-- 6) prepare_comm_hub_preview
CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_ctx    text := coalesce(p_payload->>'send_context','preview');
  v_to jsonb := coalesce(p_payload->'to_recipients','[]'::jsonb);
  v_cc jsonb := coalesce(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := coalesce(p_payload->'bcc_recipients','[]'::jsonb);
  v_data jsonb := coalesce(p_payload->'context_data', p_payload->'data', '{}'::jsonb);
  v_sender_id_in uuid := nullif(p_payload->>'sender_profile_id','')::uuid;
  v_norm jsonb;
  v_map RECORD;
  v_ver RECORD;
  v_subj_out jsonb;
  v_body_out jsonb;
  v_text_out jsonb;
  v_unresolved jsonb := '[]'::jsonb;
  v_subject_r text := NULL;
  v_body_html_r text := NULL;
  v_body_text_r text := NULL;
  v_content_hash text;
  v_ctx_hash text;
  v_snap_id uuid;
  v_sender_id uuid;
  v_cfg_ver bigint;
  v_rp_ver integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF NOT public.has_role(v_uid,'Admin'::app_role) THEN
    RAISE EXCEPTION 'preview preparation requires Admin role';
  END IF;
  IF v_module IS NULL OR v_module = '' OR v_event IS NULL OR v_event = '' THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;

  v_norm := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);

  -- Resolve mapping (active preferred)
  SELECT * INTO v_map
    FROM public.communication_hub_event_template_map
   WHERE module_code = v_module AND event_code = v_event AND channel = v_channel
   ORDER BY active DESC, updated_at DESC
   LIMIT 1;

  IF v_map.id IS NOT NULL THEN
    -- Resolve template version: prefer active_version_id
    SELECT ctv.* INTO v_ver
      FROM public.core_template ct
      JOIN public.core_template_version ctv ON ctv.id = ct.active_version_id
     WHERE ct.id = v_map.template_id
     LIMIT 1;
  END IF;

  v_sender_id := coalesce(v_sender_id_in, v_map.sender_profile_id);

  IF v_ver.id IS NOT NULL THEN
    v_subj_out := public.comm_hub_render_template(v_ver.subject, v_data);
    v_body_out := public.comm_hub_render_template(v_ver.body_html, v_data);
    v_text_out := public.comm_hub_render_template(v_ver.body_text, v_data);
    v_subject_r  := v_subj_out->>'rendered';
    v_body_html_r := v_body_out->>'rendered';
    v_body_text_r := v_text_out->>'rendered';
    v_unresolved := (
      SELECT coalesce(jsonb_agg(distinct x), '[]'::jsonb)
        FROM (
          SELECT jsonb_array_elements_text(v_subj_out->'unresolved') x
          UNION ALL
          SELECT jsonb_array_elements_text(v_body_out->'unresolved') x
          UNION ALL
          SELECT jsonb_array_elements_text(v_text_out->'unresolved') x
        ) s WHERE x IS NOT NULL AND x <> ''
    );
  END IF;

  v_content_hash := md5(coalesce(v_subject_r,'') || E'\n' || coalesce(v_body_html_r,'') || E'\n' || coalesce(v_body_text_r,''));
  v_ctx_hash := md5(coalesce(v_data::text,'{}'));

  -- Config + policy versions
  SELECT configuration_version INTO v_cfg_ver
    FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_rp_ver
    FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';

  -- Mark previous unapproved snapshots as SUPERSEDED (same operator/event/channel).
  UPDATE public.communication_preview_snapshot
     SET status = 'SUPERSEDED'
   WHERE created_by = v_uid AND module_code = v_module
     AND event_code = v_event AND channel = v_channel
     AND status = 'PREPARED';

  INSERT INTO public.communication_preview_snapshot(
    module_code, event_code, channel, send_context,
    to_recipients, cc_recipients, bcc_recipients, recipient_set_hash,
    template_id, template_version_id, sender_profile_id,
    rendered_subject, rendered_body_html, rendered_body_text,
    subject_hash, body_hash, content_hash,
    context_data, context_hash, unresolved_variables,
    configuration_version, recipient_policy_version,
    status, created_by, expires_at
  ) VALUES (
    v_module, v_event, v_channel, v_ctx,
    v_norm->'to', v_norm->'cc', v_norm->'bcc', v_norm->>'hash',
    v_map.template_id, v_ver.id, v_sender_id,
    v_subject_r, v_body_html_r, v_body_text_r,
    md5(coalesce(v_subject_r,'')),
    md5(coalesce(v_body_html_r,'') || E'\n' || coalesce(v_body_text_r,'')),
    v_content_hash,
    v_data, v_ctx_hash, coalesce(v_unresolved,'[]'::jsonb),
    v_cfg_ver, v_rp_ver,
    'PREPARED', v_uid, now() + interval '30 minutes'
  )
  RETURNING id INTO v_snap_id;

  RETURN jsonb_build_object(
    'ok', true,
    'snapshot_id', v_snap_id,
    'module_code', v_module,
    'event_code', v_event,
    'channel', v_channel,
    'send_context', v_ctx,
    'to_recipients', v_norm->'to',
    'cc_recipients', v_norm->'cc',
    'bcc_recipients', v_norm->'bcc',
    'recipient_set_hash', v_norm->>'hash',
    'template_id', v_map.template_id,
    'template_version_id', v_ver.id,
    'sender_profile_id', v_sender_id,
    'rendered_subject', v_subject_r,
    'rendered_body_html', v_body_html_r,
    'rendered_body_text', v_body_text_r,
    'content_hash', v_content_hash,
    'context_hash', v_ctx_hash,
    'unresolved_variables', coalesce(v_unresolved,'[]'::jsonb),
    'configuration_version', v_cfg_ver,
    'recipient_policy_version', v_rp_ver,
    'expires_at', (now() + interval '30 minutes'),
    'status', 'PREPARED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_comm_hub_preview(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_comm_hub_preview(jsonb) TO authenticated, service_role;

-- 7) approve_comm_hub_preview
CREATE OR REPLACE FUNCTION public.approve_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_snap_id uuid := (p_payload->>'snapshot_id')::uuid;
  v_reason text := trim(coalesce(p_payload->>'approval_reason',''));
  v_expected_hash text := nullif(p_payload->>'expected_content_hash','');
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_appr_id uuid;
  v_expires timestamptz;
  v_cfg_now bigint;
  v_rp_now integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid,'Admin'::app_role) THEN
    RAISE EXCEPTION 'preview approval requires Admin role';
  END IF;
  IF v_snap_id IS NULL THEN RAISE EXCEPTION 'snapshot_id is required'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'approval_reason is required and cannot be empty'; END IF;

  SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_snap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'preview_snapshot_not_found'; END IF;
  IF v_snap.status <> 'PREPARED' THEN
    RAISE EXCEPTION 'preview_snapshot_not_approvable: status=%', v_snap.status;
  END IF;
  IF v_snap.expires_at <= now() THEN
    UPDATE public.communication_preview_snapshot SET status='EXPIRED' WHERE id = v_snap.id;
    RAISE EXCEPTION 'preview_snapshot_expired';
  END IF;
  IF jsonb_array_length(v_snap.unresolved_variables) > 0 THEN
    RAISE EXCEPTION 'preview_required_variables_unresolved: %', v_snap.unresolved_variables::text;
  END IF;
  IF v_expected_hash IS NOT NULL AND v_expected_hash <> v_snap.content_hash THEN
    RAISE EXCEPTION 'preview_content_hash_mismatch';
  END IF;

  -- Recompute current versions and refuse if the underlying config has drifted
  SELECT configuration_version INTO v_cfg_now FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_rp_now FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';
  IF v_cfg_now IS DISTINCT FROM v_snap.configuration_version THEN
    RAISE EXCEPTION 'preview_configuration_changed';
  END IF;
  IF v_rp_now IS DISTINCT FROM v_snap.recipient_policy_version THEN
    RAISE EXCEPTION 'preview_policy_changed';
  END IF;

  v_expires := now() + interval '30 minutes';

  INSERT INTO public.communication_preview_approval(
    snapshot_id, approved_by, approval_reason, status, expires_at,
    configuration_version, recipient_policy_version,
    content_hash_at_approval, audit_metadata
  ) VALUES (
    v_snap.id, v_uid, v_reason, 'ACTIVE', v_expires,
    v_snap.configuration_version, v_snap.recipient_policy_version,
    v_snap.content_hash,
    jsonb_build_object(
      'module_code', v_snap.module_code, 'event_code', v_snap.event_code,
      'channel', v_snap.channel, 'recipient_set_hash', v_snap.recipient_set_hash,
      'template_version_id', v_snap.template_version_id
    )
  )
  RETURNING id INTO v_appr_id;

  -- Best-effort audit
  BEGIN
    INSERT INTO public.communication_hub_control_audit(setting_key,new_value,reason,changed_by,source)
    VALUES ('preview_approval_created:'||v_snap.module_code||':'||v_snap.event_code,
      jsonb_build_object('approval_id',v_appr_id,'snapshot_id',v_snap.id,
        'content_hash',v_snap.content_hash,'recipient_set_hash',v_snap.recipient_set_hash),
      v_reason, v_uid, 'approve_comm_hub_preview');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object(
    'ok', true, 'approval_id', v_appr_id, 'snapshot_id', v_snap.id,
    'status', 'ACTIVE', 'expires_at', v_expires,
    'content_hash', v_snap.content_hash,
    'recipient_set_hash', v_snap.recipient_set_hash
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_comm_hub_preview(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_comm_hub_preview(jsonb) TO authenticated, service_role;

-- 8) revoke_comm_hub_preview_approval
CREATE OR REPLACE FUNCTION public.revoke_comm_hub_preview_approval(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_appr_id uuid := (p_payload->>'approval_id')::uuid;
  v_reason text := trim(coalesce(p_payload->>'revocation_reason',''));
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid,'Admin'::app_role) THEN
    RAISE EXCEPTION 'revocation requires Admin role';
  END IF;
  IF v_appr_id IS NULL THEN RAISE EXCEPTION 'approval_id is required'; END IF;
  IF v_reason = '' THEN RAISE EXCEPTION 'revocation_reason is required'; END IF;

  UPDATE public.communication_preview_approval
     SET status='REVOKED', revoked_by=v_uid, revoked_at=now(), revocation_reason=v_reason
   WHERE id=v_appr_id AND status IN ('ACTIVE','RESERVED');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval_not_active';
  END IF;

  BEGIN
    INSERT INTO public.communication_hub_control_audit(setting_key,new_value,reason,changed_by,source)
    VALUES ('preview_approval_revoked', jsonb_build_object('approval_id',v_appr_id), v_reason, v_uid, 'revoke_comm_hub_preview_approval');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object('ok',true,'approval_id',v_appr_id,'status','REVOKED');
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_comm_hub_preview_approval(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_comm_hub_preview_approval(jsonb) TO authenticated, service_role;

-- 9) validate_comm_hub_preview_approval
CREATE OR REPLACE FUNCTION public.validate_comm_hub_preview_approval(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appr_id uuid := nullif(p_payload->>'approval_id','')::uuid;
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := coalesce(p_payload->>'channel','email');
  v_ctx    text := coalesce(p_payload->>'send_context', p_payload->>'send_mode', 'controlled_live');
  v_to jsonb := coalesce(p_payload->'to_recipients','[]'::jsonb);
  v_cc jsonb := coalesce(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc jsonb := coalesce(p_payload->'bcc_recipients','[]'::jsonb);
  v_expected_content_hash text := nullif(p_payload->>'expected_content_hash','');
  v_expected_tpl_ver uuid := nullif(p_payload->>'expected_template_version_id','')::uuid;
  v_expected_sender uuid := nullif(p_payload->>'expected_sender_profile_id','')::uuid;

  v_appr public.communication_preview_approval%ROWTYPE;
  v_snap public.communication_preview_snapshot%ROWTYPE;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_norm jsonb;
  v_cfg_now bigint;
  v_rp_now integer;
  v_valid boolean := true;
  v_now timestamptz := now();
BEGIN
  IF v_appr_id IS NULL THEN
    v_blockers := v_blockers || jsonb_build_object('code','preview_approval_missing','message','approval_id required');
    v_valid := false;
  ELSE
    SELECT * INTO v_appr FROM public.communication_preview_approval WHERE id = v_appr_id;
    IF NOT FOUND THEN
      v_blockers := v_blockers || jsonb_build_object('code','preview_approval_missing','message','approval not found');
      v_valid := false;
    ELSE
      SELECT * INTO v_snap FROM public.communication_preview_snapshot WHERE id = v_appr.snapshot_id;
      IF v_appr.status = 'REVOKED' THEN
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_revoked','message','approval revoked');
        v_valid := false;
      ELSIF v_appr.status = 'CONSUMED' THEN
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_consumed','message','approval already consumed');
        v_valid := false;
      ELSIF v_appr.status = 'EXPIRED' OR v_appr.expires_at <= v_now THEN
        UPDATE public.communication_preview_approval SET status='EXPIRED' WHERE id=v_appr.id AND status IN ('ACTIVE','RESERVED');
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_expired','message','approval expired');
        v_valid := false;
      ELSIF v_appr.status = 'INVALIDATED' THEN
        v_blockers := v_blockers || jsonb_build_object('code','preview_approval_invalidated','message','approval invalidated');
        v_valid := false;
      END IF;

      IF v_snap.id IS NOT NULL THEN
        -- Recipient match
        v_norm := public.comm_hub_normalize_recipient_set(v_to, v_cc, v_bcc);
        IF (v_norm->>'hash') IS DISTINCT FROM v_snap.recipient_set_hash THEN
          -- Distinguish which set changed
          IF (v_norm->'to')::text IS DISTINCT FROM v_snap.to_recipients::text THEN
            v_blockers := v_blockers || jsonb_build_object('code','preview_recipient_mismatch','stage','preview_approval','message','To recipients differ');
          END IF;
          IF (v_norm->'cc')::text IS DISTINCT FROM v_snap.cc_recipients::text THEN
            v_blockers := v_blockers || jsonb_build_object('code','preview_recipient_mismatch','stage','preview_approval','message','CC recipients differ');
          END IF;
          IF (v_norm->'bcc')::text IS DISTINCT FROM v_snap.bcc_recipients::text THEN
            v_blockers := v_blockers || jsonb_build_object('code','preview_recipient_mismatch','stage','preview_approval','message','BCC recipients differ');
          END IF;
          v_valid := false;
        END IF;

        IF v_module IS NOT NULL AND v_module <> v_snap.module_code THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_event_mismatch','message','module changed');
          v_valid := false;
        END IF;
        IF v_event IS NOT NULL AND v_event <> v_snap.event_code THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_event_mismatch','message','event changed');
          v_valid := false;
        END IF;
        IF v_channel IS NOT NULL AND v_channel <> v_snap.channel THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_channel_mismatch','message','channel changed');
          v_valid := false;
        END IF;
        IF v_expected_tpl_ver IS NOT NULL AND v_expected_tpl_ver IS DISTINCT FROM v_snap.template_version_id THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_template_version_mismatch','message','template version changed');
          v_valid := false;
        END IF;
        IF v_expected_sender IS NOT NULL AND v_expected_sender IS DISTINCT FROM v_snap.sender_profile_id THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_sender_mismatch','message','sender profile changed');
          v_valid := false;
        END IF;
        IF v_expected_content_hash IS NOT NULL AND v_expected_content_hash <> v_snap.content_hash THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_content_changed','message','rendered content changed');
          v_valid := false;
        END IF;

        -- Recompute policy drift
        SELECT configuration_version INTO v_cfg_now FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
        SELECT policy_version INTO v_rp_now FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';
        IF v_cfg_now IS DISTINCT FROM v_snap.configuration_version THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_configuration_changed','message','global configuration changed');
          v_valid := false;
        END IF;
        IF v_rp_now IS DISTINCT FROM v_snap.recipient_policy_version THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_policy_changed','message','recipient policy changed');
          v_valid := false;
        END IF;

        -- Template still active/approved
        PERFORM 1 FROM public.core_template_version WHERE id = v_snap.template_version_id AND status IN ('APPROVED','ACTIVE','PUBLISHED');
        IF NOT FOUND AND v_snap.template_version_id IS NOT NULL THEN
          v_blockers := v_blockers || jsonb_build_object('code','preview_template_deactivated','message','template version no longer active/approved');
          v_valid := false;
        END IF;

        -- Sender still enabled
        IF v_snap.sender_profile_id IS NOT NULL THEN
          PERFORM 1 FROM public.communication_hub_sender_profile WHERE id = v_snap.sender_profile_id AND is_enabled = true;
          IF NOT FOUND THEN
            v_blockers := v_blockers || jsonb_build_object('code','preview_sender_disabled','message','sender profile disabled or unverified');
            v_valid := false;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', v_valid,
    'approval_id', v_appr.id,
    'snapshot_id', v_snap.id,
    'status', COALESCE(v_appr.status, 'MISSING'),
    'blockers', v_blockers,
    'warnings', v_warnings,
    'approved_by', v_appr.approved_by,
    'approved_at', v_appr.approved_at,
    'expires_at', v_appr.expires_at,
    'configuration_version_at_approval', v_appr.configuration_version,
    'recipient_policy_version_at_approval', v_appr.recipient_policy_version,
    'content_hash_at_approval', v_appr.content_hash_at_approval,
    'current_content_hash', v_snap.content_hash,
    'recipient_set_hash', v_snap.recipient_set_hash,
    'validated_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_comm_hub_preview_approval(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_comm_hub_preview_approval(jsonb) TO authenticated, service_role;

-- 10) Reservation + consumption + release
CREATE OR REPLACE FUNCTION public.reserve_comm_hub_preview_approval(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_appr_id uuid := (p_payload->>'approval_id')::uuid;
  v_token uuid := gen_random_uuid();
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF v_appr_id IS NULL THEN RAISE EXCEPTION 'approval_id is required'; END IF;

  -- Atomic transition ACTIVE -> RESERVED; will 0-rows on any other state
  UPDATE public.communication_preview_approval
     SET status='RESERVED', reserved_at=v_now, reserved_by=v_uid, reservation_token=v_token
   WHERE id=v_appr_id AND status='ACTIVE' AND expires_at > v_now;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval_not_reservable';
  END IF;
  RETURN jsonb_build_object('ok',true,'approval_id',v_appr_id,'reservation_token',v_token,'status','RESERVED');
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_comm_hub_preview_approval(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_comm_hub_preview_approval(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.consume_comm_hub_preview_approval(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_appr_id uuid := (p_payload->>'approval_id')::uuid;
  v_token uuid := nullif(p_payload->>'reservation_token','')::uuid;
  v_req_id uuid := nullif(p_payload->>'request_id','')::uuid;
  v_now timestamptz := now();
BEGIN
  IF v_appr_id IS NULL THEN RAISE EXCEPTION 'approval_id is required'; END IF;
  IF v_token IS NULL THEN RAISE EXCEPTION 'reservation_token is required'; END IF;

  UPDATE public.communication_preview_approval
     SET status='CONSUMED', consumed_at=v_now, consumed_by=v_uid, consumed_request_id=v_req_id
   WHERE id=v_appr_id AND status='RESERVED' AND reservation_token=v_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval_not_consumable';
  END IF;
  RETURN jsonb_build_object('ok',true,'approval_id',v_appr_id,'status','CONSUMED','consumed_at',v_now);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_comm_hub_preview_approval(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_comm_hub_preview_approval(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_comm_hub_preview_reservation(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_appr_id uuid := (p_payload->>'approval_id')::uuid;
  v_token uuid := nullif(p_payload->>'reservation_token','')::uuid;
BEGIN
  IF v_appr_id IS NULL OR v_token IS NULL THEN RAISE EXCEPTION 'approval_id and reservation_token required'; END IF;
  UPDATE public.communication_preview_approval
     SET status='ACTIVE', reserved_at=NULL, reserved_by=NULL, reservation_token=NULL
   WHERE id=v_appr_id AND status='RESERVED' AND reservation_token=v_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reservation_not_releasable';
  END IF;
  RETURN jsonb_build_object('ok',true,'approval_id',v_appr_id,'status','ACTIVE');
END;
$$;
REVOKE ALL ON FUNCTION public.release_comm_hub_preview_reservation(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_comm_hub_preview_reservation(jsonb) TO authenticated, service_role;

-- 11) Update evaluate_comm_hub_send_decision to consult the validator for
-- live send contexts and demote legacy preview_confirmed to an ignored warning.
CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_decision(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_result jsonb;
  v_result jsonb;
  v_legacy_flag boolean := coalesce((p_payload->>'preview_confirmed')::boolean, false)
                          OR coalesce((p_payload->>'preview_shown')::boolean, false)
                          OR coalesce(((p_payload->'review_context')->>'preview_confirmed')::boolean, false)
                          OR coalesce(((p_payload->'metadata')->>'preview_confirmed')::boolean, false)
                          OR coalesce(((p_payload->'context')->>'preview_confirmed')::boolean, false);
  v_ctx text := coalesce(p_payload->>'send_context', p_payload->>'send_mode','dry_run');
  v_appr_id uuid := nullif(p_payload->>'preview_approval_id','')::uuid;
  v_validator jsonb;
  v_blockers jsonb;
  v_warnings jsonb;
  v_allowed boolean;
  v_needs_preview boolean;
BEGIN
  -- Delegate to the legacy body first (via inline copy). To keep this migration
  -- self-contained without duplicating the full evaluator body, we invoke the
  -- prior function definition by calling ourselves recursively is not possible.
  -- Instead we execute the original logic by extracting the essential result
  -- through a helper: we call an internal function that mirrors the prior
  -- evaluator. To avoid the large duplication we keep the prior evaluator
  -- logic under a helper name.
  v_prev_result := public._evaluate_comm_hub_send_decision_core(p_payload);

  v_result := v_prev_result;
  v_blockers := coalesce(v_result->'blockers','[]'::jsonb);
  v_warnings := coalesce(v_result->'warnings','[]'::jsonb);
  v_allowed  := coalesce((v_result->>'allowed')::boolean, false);

  -- Demote any legacy client-side positive-approval flag to an ignored warning.
  IF v_legacy_flag THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code','legacy_preview_confirmation_ignored',
      'stage','preview_approval',
      'message','Legacy preview_confirmed/preview_shown flags are ignored; require a preview_approval_id.');
  END IF;

  -- Contexts that require a real preview approval
  v_needs_preview := v_ctx IN ('controlled_live','manual_live','manual_production');
  IF v_needs_preview THEN
    IF v_appr_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object(
        'code','preview_approval_missing','stage','preview_approval','severity','critical',
        'message','A valid preview_approval_id is required for this send context.',
        'fix_route','/admin/communication-hub/pilots');
      v_allowed := false;
    ELSE
      v_validator := public.validate_comm_hub_preview_approval(jsonb_build_object(
        'approval_id', v_appr_id,
        'module_code', p_payload->>'module_code',
        'event_code',  p_payload->>'event_code',
        'channel',     coalesce(p_payload->>'channel','email'),
        'send_context', v_ctx,
        'to_recipients', coalesce(p_payload->'to_recipients','[]'::jsonb),
        'cc_recipients', coalesce(p_payload->'cc_recipients','[]'::jsonb),
        'bcc_recipients', coalesce(p_payload->'bcc_recipients','[]'::jsonb),
        'expected_template_version_id', p_payload->>'template_version_id',
        'expected_sender_profile_id',   p_payload->>'sender_profile_id',
        'expected_content_hash',        p_payload->>'expected_content_hash'
      ));
      IF NOT coalesce((v_validator->>'valid')::boolean,false) THEN
        v_blockers := v_blockers || coalesce(v_validator->'blockers','[]'::jsonb);
        v_allowed := false;
      END IF;
      -- Attach validator evidence to trace_context
      v_result := jsonb_set(v_result, '{preview_validator}', v_validator, true);
    END IF;
  END IF;

  v_result := jsonb_set(v_result, '{blockers}', v_blockers, true);
  v_result := jsonb_set(v_result, '{warnings}', v_warnings, true);
  v_result := jsonb_set(v_result, '{allowed}', to_jsonb(v_allowed), true);
  v_result := jsonb_set(v_result, '{status}',  to_jsonb(CASE WHEN v_allowed THEN 'allowed' ELSE 'blocked' END), true);
  RETURN v_result;
END;
$function$;

-- Preserve the previous evaluator body under a core helper.
-- We copy the definition captured before this migration.
CREATE OR REPLACE FUNCTION public._evaluate_comm_hub_send_decision_core(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $core$
DECLARE
  v_module          text := p_payload->>'module_code';
  v_event           text := p_payload->>'event_code';
  v_channel         text := coalesce(p_payload->>'channel','email');
  v_send_context    text := coalesce(p_payload->>'send_context', p_payload->>'send_mode', 'dry_run');
  v_to              jsonb := coalesce(p_payload->'to_recipients', '[]'::jsonb);
  v_cc              jsonb := coalesce(p_payload->'cc_recipients', '[]'::jsonb);
  v_bcc             jsonb := coalesce(p_payload->'bcc_recipients', '[]'::jsonb);
  v_all_recipients  jsonb;
  v_tpl_ver         text := nullif(p_payload->>'template_version_id','');
  v_sender_id       text := nullif(p_payload->>'sender_profile_id','');
  v_preview_id      text := nullif(p_payload->>'preview_approval_id','');
  v_dryrun_cert_id  text := nullif(p_payload->>'dry_run_certification_id','');
  v_ctrl_grant_id   text := nullif(p_payload->>'controlled_live_grant_id','');
  v_idem            text := nullif(p_payload->>'idempotency_key','');
  v_requested_by    uuid := nullif(p_payload->>'requested_by','')::uuid;
  v_payload_max_tot int  := (p_payload->>'max_total_recipients')::int;

  v_settings        public.communication_hub_control_settings%ROWTYPE;
  v_op_mode         text;
  v_config_version  bigint;
  v_recip_ver       bigint;

  v_recip_eval      jsonb;

  v_blockers        jsonb := '[]'::jsonb;
  v_warnings        jsonb := '[]'::jsonb;
  v_gates           jsonb := '[]'::jsonb;
  v_fix_actions     jsonb := '[]'::jsonb;
  v_blocker_codes   text[] := ARRAY[]::text[];
  v_allowed         boolean := true;
  v_decision_id     uuid := gen_random_uuid();
  v_now             timestamptz := now();
  v_expires_at      timestamptz := v_now + interval '5 minutes';
  v_status          text;

  v_total_count     int;
  v_policy_max_tot  int;
  v_effective_max   int;
  v_stage_blocked   text := NULL;
BEGIN
  v_all_recipients :=
      (SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM
         (SELECT jsonb_array_elements_text(v_to)  AS x UNION ALL
          SELECT jsonb_array_elements_text(v_cc)  AS x UNION ALL
          SELECT jsonb_array_elements_text(v_bcc) AS x) s);
  v_total_count := jsonb_array_length(v_to) + jsonb_array_length(v_cc) + jsonb_array_length(v_bcc);

  IF v_module IS NULL OR v_module = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_missing_module_code','stage','payload','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_module_code');
    v_allowed := false;
  END IF;
  IF v_event IS NULL OR v_event = '' THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_missing_event_code','stage','payload','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'payload_missing_event_code');
    v_allowed := false;
  END IF;
  IF v_send_context NOT IN ('preview','dry_run','controlled_live','manual_live','manual_production',
                            'auto_live_internal','cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object('code','payload_invalid_send_context','stage','payload','severity','high');
    v_blocker_codes := array_append(v_blocker_codes,'payload_invalid_send_context');
    v_allowed := false;
  END IF;

  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  v_op_mode := coalesce(v_settings.operating_mode::text,'EMERGENCY_STOP');
  v_config_version := v_settings.configuration_version;
  SELECT policy_version INTO v_recip_ver FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';

  IF v_op_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_object('code','emergency_stop_active','stage','global_gate','severity','critical');
    v_blocker_codes := array_append(v_blocker_codes,'emergency_stop_active');
    v_allowed := false;
    IF v_stage_blocked IS NULL THEN v_stage_blocked := 'global_gate'; END IF;
  END IF;
  IF v_send_context IN ('controlled_live','manual_live','manual_production','auto_live_internal','cron','batch') THEN
    IF v_settings.dispatch_enabled = false THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_dispatch_disabled','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_dispatch_disabled');
      v_allowed := false;
    END IF;
    IF v_settings.dry_run_only = true THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_dry_run_only','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_dry_run_only');
      v_allowed := false;
    END IF;
    IF v_channel = 'email' AND v_settings.email_live_enabled <> true THEN
      v_blockers := v_blockers || jsonb_build_object('code','global_email_live_disabled','stage','global_gate','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'global_email_live_disabled');
      v_allowed := false;
    END IF;
  END IF;

  IF v_send_context IN ('cron','batch') THEN
    v_blockers := v_blockers || jsonb_build_object('code','automated_context_not_permitted','stage','send_context','severity','critical',
      'message','automated production not available');
    v_blocker_codes := array_append(v_blocker_codes,'automated_context_not_permitted');
    v_allowed := false;
  END IF;

  -- Recipient policy evaluation
  BEGIN
    v_recip_eval := public.evaluate_comm_hub_recipient_policy(jsonb_build_object(
      'to_recipients', v_to, 'cc_recipients', v_cc, 'bcc_recipients', v_bcc));
    IF NOT coalesce((v_recip_eval->>'authorized')::boolean, false) THEN
      v_blockers := v_blockers || jsonb_build_object('code','recipient_policy_denied','stage','recipient_policy','severity','critical',
        'message', coalesce(v_recip_eval->>'reason','recipient not permitted'),
        'detail', v_recip_eval);
      v_blocker_codes := array_append(v_blocker_codes,'recipient_policy_denied');
      v_allowed := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','recipient_policy_error','stage','recipient_policy','message', SQLERRM);
  END;

  -- Strictest total-recipients wins
  v_policy_max_tot := coalesce((v_recip_eval->>'max_total_recipients')::int, 2147483647);
  v_effective_max := LEAST(v_policy_max_tot, coalesce(v_payload_max_tot, 2147483647));
  IF v_total_count > v_effective_max THEN
    v_blockers := v_blockers || jsonb_build_object('code','recipient_limit_exceeded','stage','recipient_policy','severity','high',
      'message', format('total recipients %s exceeds effective max %s', v_total_count, v_effective_max));
    v_blocker_codes := array_append(v_blocker_codes,'recipient_limit_exceeded');
    v_allowed := false;
  END IF;

  IF v_send_context = 'controlled_live' THEN
    IF v_dryrun_cert_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','dry_run_certification_missing','stage','controlled_live','severity','high');
      v_blocker_codes := array_append(v_blocker_codes,'dry_run_certification_missing');
      v_allowed := false;
    END IF;
    IF v_ctrl_grant_id IS NULL THEN
      v_blockers := v_blockers || jsonb_build_object('code','controlled_live_grant_missing','stage','controlled_live','severity','critical');
      v_blocker_codes := array_append(v_blocker_codes,'controlled_live_grant_missing');
      v_allowed := false;
    END IF;
  END IF;

  IF v_allowed THEN v_status := 'allowed'; ELSE v_status := 'blocked'; END IF;

  BEGIN
    INSERT INTO public.communication_hub_send_decision_log (
      decision_id, module_code, event_code, channel, send_context,
      requested_by, idempotency_key, allowed, status,
      configuration_version, recipient_policy_version,
      blockers, warnings, gate_results, fix_actions, trace_context,
      payload, evaluated_at, expires_at
    ) VALUES (
      v_decision_id, coalesce(v_module,''), coalesce(v_event,''), v_channel, v_send_context,
      v_requested_by, v_idem, v_allowed, v_status,
      v_config_version, v_recip_ver,
      v_blockers, v_warnings, v_gates, v_fix_actions,
      jsonb_build_object('current_stage', coalesce(v_stage_blocked,'complete'),
                         'blocked_stage', v_stage_blocked,
                         'blocker_codes', to_jsonb(v_blocker_codes)),
      p_payload, v_now, v_expires_at);
  EXCEPTION WHEN OTHERS THEN
    v_warnings := v_warnings || jsonb_build_object('code','decision_log_write_failed','message', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'status', v_status,
    'decision_id', v_decision_id,
    'decision_type','canonical_send_decision',
    'send_context', v_send_context,
    'module_code', v_module,
    'event_code', v_event,
    'channel', v_channel,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'gate_results', v_gates,
    'fix_actions', v_fix_actions,
    'configuration_version', v_config_version,
    'recipient_policy_version', v_recip_ver,
    'send_policy_version', NULL,
    'review_policy_version', NULL,
    'evaluated_at', v_now,
    'expires_at', v_expires_at,
    'trace_context', jsonb_build_object(
      'current_stage', coalesce(v_stage_blocked,'complete'),
      'blocked_stage', v_stage_blocked,
      'blocker_codes', to_jsonb(v_blocker_codes)),
    'source','evaluate_comm_hub_send_decision'
  );
END;
$core$;

REVOKE ALL ON FUNCTION public._evaluate_comm_hub_send_decision_core(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._evaluate_comm_hub_send_decision_core(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_send_decision(jsonb) TO authenticated, service_role;
