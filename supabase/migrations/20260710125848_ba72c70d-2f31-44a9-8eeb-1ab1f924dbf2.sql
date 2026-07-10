
-- EPIC 4B: Self-Service Event & Template Onboarding Engine
-- Adds token_metadata column and admin-only SECURITY DEFINER RPCs for the wizard.
-- Dry-run only. No live promotion allowed. Audit trail on every write.

-- 1. Extend registry with token_metadata jsonb
ALTER TABLE public.communication_hub_module_event_registry
  ADD COLUMN IF NOT EXISTS token_metadata jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.communication_hub_module_event_registry.token_metadata IS
  'Rich token definitions: [{key,label,sample,required,server_provided,data_type,sensitive,description}]';

-- 2. Helper: assert admin
CREATE OR REPLACE FUNCTION public._chub_assert_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'Admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied: admin role required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- 3. Upsert module event registry
CREATE OR REPLACE FUNCTION public.upsert_comm_hub_module_event_registry(
  p_payload jsonb,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := COALESCE(p_payload->>'channel', 'email');
  v_risk text := COALESCE(p_payload->>'risk_level', 'low');
  v_old jsonb;
  v_new jsonb;
  v_row public.communication_hub_module_event_registry%ROWTYPE;
BEGIN
  PERFORM public._chub_assert_admin();
  IF p_reason IS NULL OR length(btrim(p_reason)) < 4 THEN
    RAISE EXCEPTION 'reason required (min 4 chars)';
  END IF;
  IF v_module IS NULL OR v_module !~ '^[A-Z][A-Z0-9_]*$' THEN
    RAISE EXCEPTION 'module_code must be UPPER_SNAKE_CASE';
  END IF;
  IF v_event IS NULL OR v_event !~ '^[A-Z][A-Z0-9_]*$' THEN
    RAISE EXCEPTION 'event_code must be UPPER_SNAKE_CASE';
  END IF;
  IF v_risk NOT IN ('low','medium','high') THEN
    RAISE EXCEPTION 'risk_level must be low|medium|high';
  END IF;
  IF v_channel <> 'email' THEN
    RAISE EXCEPTION 'only channel=email supported in wizard for now';
  END IF;

  SELECT to_jsonb(r.*) INTO v_old
  FROM public.communication_hub_module_event_registry r
  WHERE r.module_code = v_module AND r.event_code = v_event AND r.channel = v_channel;

  INSERT INTO public.communication_hub_module_event_registry (
    module_code, module_name, event_code, event_name, description,
    trigger_description, current_communication_method, channel,
    recipient_type, entity_type, template_code, required_tokens, token_metadata,
    risk_level, integration_status, template_status, mapping_status, live_status,
    recommended_phase, notes
  )
  VALUES (
    v_module,
    p_payload->>'module_name',
    v_event,
    p_payload->>'event_name',
    p_payload->>'description',
    p_payload->>'trigger_description',
    COALESCE(p_payload->>'current_communication_method','communication_hub_planned'),
    v_channel,
    p_payload->>'recipient_type',
    p_payload->>'entity_type',
    p_payload->>'template_code',
    COALESCE(p_payload->'required_tokens', '[]'::jsonb),
    COALESCE(p_payload->'token_metadata', '[]'::jsonb),
    v_risk,
    COALESCE(p_payload->>'integration_status','template_required'),
    COALESCE(p_payload->>'template_status','not_created'),
    COALESCE(p_payload->>'mapping_status','not_mapped'),
    'not_live',
    p_payload->>'recommended_phase',
    p_payload->>'notes'
  )
  ON CONFLICT (module_code, event_code, channel) DO UPDATE SET
    module_name = COALESCE(EXCLUDED.module_name, communication_hub_module_event_registry.module_name),
    event_name = COALESCE(EXCLUDED.event_name, communication_hub_module_event_registry.event_name),
    description = COALESCE(EXCLUDED.description, communication_hub_module_event_registry.description),
    trigger_description = COALESCE(EXCLUDED.trigger_description, communication_hub_module_event_registry.trigger_description),
    recipient_type = COALESCE(EXCLUDED.recipient_type, communication_hub_module_event_registry.recipient_type),
    entity_type = COALESCE(EXCLUDED.entity_type, communication_hub_module_event_registry.entity_type),
    template_code = COALESCE(EXCLUDED.template_code, communication_hub_module_event_registry.template_code),
    required_tokens = EXCLUDED.required_tokens,
    token_metadata = EXCLUDED.token_metadata,
    risk_level = EXCLUDED.risk_level,
    recommended_phase = COALESCE(EXCLUDED.recommended_phase, communication_hub_module_event_registry.recommended_phase),
    notes = COALESCE(EXCLUDED.notes, communication_hub_module_event_registry.notes),
    -- Never allow wizard to touch live_status
    live_status = 'not_live'
  RETURNING * INTO v_row;

  v_new := to_jsonb(v_row);

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('registry.' || v_module || '.' || v_event, v_old, v_new, p_reason, auth.uid(), 'event-template-onboarding-wizard');

  RETURN v_new;
END;
$$;

-- 4. Update token metadata (mirrors keys into required_tokens[])
CREATE OR REPLACE FUNCTION public.update_comm_hub_registry_token_metadata(
  p_module_code text,
  p_event_code text,
  p_channel text,
  p_token_metadata jsonb,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_keys jsonb;
  v_old jsonb;
  v_new jsonb;
  v_row public.communication_hub_module_event_registry%ROWTYPE;
BEGIN
  PERFORM public._chub_assert_admin();
  IF p_reason IS NULL OR length(btrim(p_reason)) < 4 THEN
    RAISE EXCEPTION 'reason required';
  END IF;
  IF jsonb_typeof(p_token_metadata) <> 'array' THEN
    RAISE EXCEPTION 'token_metadata must be an array';
  END IF;

  SELECT jsonb_agg(elem->>'key') INTO v_keys
  FROM jsonb_array_elements(p_token_metadata) elem
  WHERE elem->>'key' IS NOT NULL;

  SELECT to_jsonb(r.*) INTO v_old
  FROM public.communication_hub_module_event_registry r
  WHERE r.module_code = p_module_code AND r.event_code = p_event_code AND r.channel = p_channel;

  UPDATE public.communication_hub_module_event_registry
     SET token_metadata = p_token_metadata,
         required_tokens = COALESCE(v_keys, '[]'::jsonb)
   WHERE module_code = p_module_code AND event_code = p_event_code AND channel = p_channel
   RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'registry row not found for %/%/%', p_module_code, p_event_code, p_channel;
  END IF;

  v_new := to_jsonb(v_row);

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('registry_tokens.' || p_module_code || '.' || p_event_code, v_old, v_new, p_reason, auth.uid(), 'event-template-onboarding-wizard');

  RETURN v_new;
END;
$$;

-- 5. Create template + version (published, active)
CREATE OR REPLACE FUNCTION public.create_comm_hub_template_with_version(
  p_template jsonb,
  p_version jsonb,
  p_reason text,
  p_confirm text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := p_template->>'template_code';
  v_tid uuid;
  v_ver_no integer;
  v_ver_id uuid;
  v_existing_active uuid;
  v_actor text := COALESCE(auth.uid()::text, 'system');
BEGIN
  PERFORM public._chub_assert_admin();
  IF p_reason IS NULL OR length(btrim(p_reason)) < 4 THEN
    RAISE EXCEPTION 'reason required';
  END IF;
  IF v_code IS NULL OR v_code !~ '^[A-Z][A-Z0-9_]*$' THEN
    RAISE EXCEPTION 'template_code must be UPPER_SNAKE_CASE';
  END IF;
  IF COALESCE(p_version->>'subject','') = '' THEN
    RAISE EXCEPTION 'subject required';
  END IF;
  IF COALESCE(p_version->>'body_html','') = '' AND COALESCE(p_version->>'body_text','') = '' THEN
    RAISE EXCEPTION 'body required (html or text)';
  END IF;

  SELECT id, active_version_id INTO v_tid, v_existing_active
  FROM public.core_template WHERE code = v_code;

  IF v_tid IS NULL THEN
    INSERT INTO public.core_template(
      code, name, description, module_code, module_name, template_type,
      template_category, status, source_system, tags, is_active, created_by, updated_by
    )
    VALUES(
      v_code,
      COALESCE(p_template->>'template_name', v_code),
      p_template->>'description',
      COALESCE(p_template->>'module_code','COMM_HUB'),
      p_template->>'module_name',
      COALESCE(p_template->>'template_type','EMAIL'),
      p_template->>'template_category',
      'ACTIVE',
      'CORE',
      ARRAY['comm-hub-wizard']::text[],
      true,
      v_actor,
      v_actor
    )
    RETURNING id INTO v_tid;
  ELSE
    IF v_existing_active IS NOT NULL AND p_confirm <> 'CREATE NEW TEMPLATE VERSION' THEN
      RAISE EXCEPTION 'template % already has active version; typed confirmation required', v_code;
    END IF;
  END IF;

  SELECT COALESCE(MAX(version_no),0) + 1 INTO v_ver_no
  FROM public.core_template_version WHERE template_id = v_tid;

  INSERT INTO public.core_template_version(
    template_id, version_no, status, subject, body_html, body_text,
    change_summary, published_at, published_by, body_metadata, created_by, updated_by
  )
  VALUES(
    v_tid, v_ver_no, 'PUBLISHED',
    p_version->>'subject',
    p_version->>'body_html',
    COALESCE(p_version->>'body_text', regexp_replace(p_version->>'body_html', '<[^>]+>', '', 'g')),
    COALESCE(p_version->>'change_summary','Created via Event & Template Onboarding Wizard'),
    now(), v_actor,
    COALESCE(p_version->'body_metadata', '{}'::jsonb) || jsonb_build_object('required_tokens', COALESCE(p_version->'required_tokens', '[]'::jsonb)),
    v_actor, v_actor
  )
  RETURNING id INTO v_ver_id;

  UPDATE public.core_template
     SET active_version_id = v_ver_id, status = 'ACTIVE', updated_by = v_actor
   WHERE id = v_tid;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('template.' || v_code, jsonb_build_object('previous_active', v_existing_active),
          jsonb_build_object('template_id', v_tid, 'version_id', v_ver_id, 'version_no', v_ver_no),
          p_reason, auth.uid(), 'event-template-onboarding-wizard');

  RETURN jsonb_build_object('template_id', v_tid, 'template_code', v_code, 'version_id', v_ver_id, 'version_no', v_ver_no);
END;
$$;

-- 6. Ensure live-control (dry_run_only)
CREATE OR REPLACE FUNCTION public.ensure_comm_hub_event_live_control(
  p_module_code text,
  p_event_code text,
  p_channel text,
  p_risk_level text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.communication_hub_event_live_control%ROWTYPE;
BEGIN
  PERFORM public._chub_assert_admin();
  IF p_reason IS NULL OR length(btrim(p_reason)) < 4 THEN
    RAISE EXCEPTION 'reason required';
  END IF;
  IF p_risk_level NOT IN ('low','medium','high','sensitive') THEN
    RAISE EXCEPTION 'invalid risk';
  END IF;

  INSERT INTO public.communication_hub_event_live_control(
    module_code, event_code, status, risk_level, reason, changed_by
  )
  VALUES (p_module_code, p_event_code, 'dry_run_only', p_risk_level, p_reason, auth.uid())
  ON CONFLICT (module_code, event_code) DO UPDATE
    SET risk_level = EXCLUDED.risk_level,
        reason = EXCLUDED.reason,
        changed_by = EXCLUDED.changed_by,
        changed_at = now()
        -- deliberately NOT touching status: wizard never promotes live
  RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('live_control.' || p_module_code || '.' || p_event_code, NULL, to_jsonb(v_row), p_reason, auth.uid(), 'event-template-onboarding-wizard');

  RETURN to_jsonb(v_row);
END;
$$;

-- 7. Grants — SECURITY DEFINER functions still need EXECUTE
GRANT EXECUTE ON FUNCTION public.upsert_comm_hub_module_event_registry(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_comm_hub_registry_token_metadata(text, text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_comm_hub_template_with_version(jsonb, jsonb, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_comm_hub_event_live_control(text, text, text, text, text) TO authenticated;
