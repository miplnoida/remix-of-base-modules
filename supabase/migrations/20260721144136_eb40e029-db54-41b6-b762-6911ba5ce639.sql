
-- 1) Recipient policy: optional display name for single configured recipient
ALTER TABLE public.communication_hub_recipient_policy
  ADD COLUMN IF NOT EXISTS single_configured_display_name text;

-- 2) Authoritative test-scenario store
CREATE TABLE IF NOT EXISTS public.communication_hub_event_test_scenario (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code   text NOT NULL,
  event_code    text NOT NULL,
  channel       text NOT NULL DEFAULT 'email',
  scenario_key  text NOT NULL DEFAULT 'default',
  label         text NOT NULL,
  description   text NULL,
  tokens        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, event_code, channel, scenario_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_event_test_scenario TO authenticated;
GRANT ALL ON public.communication_hub_event_test_scenario TO service_role;
ALTER TABLE public.communication_hub_event_test_scenario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_test_scenario_admin_read" ON public.communication_hub_event_test_scenario;
CREATE POLICY "event_test_scenario_admin_read"
  ON public.communication_hub_event_test_scenario FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

DROP POLICY IF EXISTS "event_test_scenario_admin_write" ON public.communication_hub_event_test_scenario;
CREATE POLICY "event_test_scenario_admin_write"
  ON public.communication_hub_event_test_scenario FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE INDEX IF NOT EXISTS event_test_scenario_lookup_idx
  ON public.communication_hub_event_test_scenario (module_code, event_code, channel, is_active);

-- 3) Seed display name + scenario
UPDATE public.communication_hub_recipient_policy
   SET single_configured_display_name = 'Rohit Mishra'
 WHERE singleton_guard = 'primary'
   AND single_configured_display_name IS NULL
   AND single_configured_address IS NOT NULL;

INSERT INTO public.communication_hub_event_test_scenario
  (module_code, event_code, channel, scenario_key, label, description, tokens, is_active)
VALUES
  ('COMM_HUB', 'OPERATOR_REHEARSAL_RESULT_NOTICE', 'email', 'default',
   'Default rehearsal scenario',
   'Safe default token set for operator rehearsal readiness testing.',
   jsonb_build_object('rehearsal_reference','REH-TEST-001','result_status','Passed'),
   true)
ON CONFLICT (module_code, event_code, channel, scenario_key) DO UPDATE
  SET tokens = EXCLUDED.tokens,
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      is_active = true,
      updated_at = now();

-- 4) prepare_comm_hub_preview — auto-inject system/recipient/scenario tokens
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
  v_user_data jsonb := coalesce(p_payload->'context_data', p_payload->'data', '{}'::jsonb);
  v_data jsonb;
  v_sys_data jsonb;
  v_sender_id_in uuid := nullif(p_payload->>'sender_profile_id','')::uuid;
  v_norm jsonb;
  v_map RECORD;
  v_ver RECORD;
  v_pol RECORD;
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
  v_generated_at timestamptz := now();
  v_request_no text;
  v_recipient_name text := NULL;
  v_first_to text := NULL;
  v_named jsonb;
  v_scenario_tokens jsonb := '{}'::jsonb;
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
    SELECT ctv.* INTO v_ver
      FROM public.core_template ct
      JOIN public.core_template_version ctv ON ctv.id = ct.active_version_id
     WHERE ct.id = v_map.template_id
     LIMIT 1;
  END IF;

  v_sender_id := coalesce(v_sender_id_in, v_map.sender_profile_id);

  -- Server-authoritative system tokens
  -- request_no: stable across Preview→Approval→Dry Run. If caller re-uses an
  -- existing request_no via context_data we preserve it, otherwise we mint one.
  v_request_no := coalesce(nullif(v_user_data->>'request_no',''),
                           'REQ-' || to_char(v_generated_at,'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,10));

  -- Recipient display name resolution (authoritative order)
  v_first_to := (SELECT jsonb_array_elements_text(v_norm->'to') LIMIT 1);

  SELECT * INTO v_pol
    FROM public.communication_hub_recipient_policy
   WHERE singleton_guard = 'primary';

  IF v_first_to IS NOT NULL AND v_pol.id IS NOT NULL THEN
    -- 1) approved named recipient display_name (if matching)
    SELECT nullif(elem->>'display_name','') INTO v_recipient_name
      FROM jsonb_array_elements(coalesce(v_pol.approved_named_addresses,'[]'::jsonb)) elem
     WHERE lower(elem->>'address') = lower(v_first_to)
       AND coalesce((elem->>'active')::boolean,false)
     LIMIT 1;

    -- 2) single configured display name
    IF v_recipient_name IS NULL
       AND lower(coalesce(v_pol.single_configured_address,'')) = lower(v_first_to) THEN
      v_recipient_name := nullif(v_pol.single_configured_display_name,'');
    END IF;
  END IF;

  -- 3) explicit user context override wins over derived-from-policy? No —
  --    authoritative order says policy display name comes first. Only fall
  --    through to user-supplied recipient_name when policy has none.
  IF v_recipient_name IS NULL THEN
    v_recipient_name := nullif(v_user_data->>'recipient_name','');
  END IF;

  -- Test scenario tokens (authoritative saved scenario)
  SELECT tokens INTO v_scenario_tokens
    FROM public.communication_hub_event_test_scenario
   WHERE module_code = v_module
     AND event_code = v_event
     AND channel = v_channel
     AND is_active = true
   ORDER BY (scenario_key = 'default') DESC, updated_at DESC
   LIMIT 1;
  v_scenario_tokens := coalesce(v_scenario_tokens,'{}'::jsonb);

  -- Build server-authoritative token bundle
  v_sys_data := jsonb_build_object(
    'module_code',   v_module,
    'event_code',    v_event,
    'generated_at',  to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'),
    'request_no',    v_request_no
  );
  IF v_recipient_name IS NOT NULL THEN
    v_sys_data := v_sys_data || jsonb_build_object('recipient_name', v_recipient_name);
  END IF;

  -- Merge precedence: user context < scenario tokens < system tokens
  v_data := v_user_data || v_scenario_tokens || v_sys_data;

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

  SELECT configuration_version INTO v_cfg_ver
    FROM public.communication_hub_control_settings WHERE singleton_guard='primary';
  SELECT policy_version INTO v_rp_ver
    FROM public.communication_hub_recipient_policy WHERE singleton_guard='primary';

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
    'context_data', v_data,
    'request_no', v_request_no,
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
