-- CH-SIMPLE-P3F-UX.6L — Immediate recipient display-name safeguard.
-- Adds provenance/confirmation metadata to Recipient Policy so a seeded
-- display name cannot silently satisfy a required recipient_name variable.
-- Full engine generalisation lands in later phases; this migration only
-- protects the current environment from treating unconfirmed seed data
-- as authoritative.

ALTER TABLE public.communication_hub_recipient_policy
  ADD COLUMN IF NOT EXISTS single_configured_display_name_source text
    NOT NULL DEFAULT 'unknown'
    CHECK (single_configured_display_name_source IN (
      'unknown','operator_configured','directory','linked_user','migration_seed'
    )),
  ADD COLUMN IF NOT EXISTS single_configured_display_name_confirmed boolean
    NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS single_configured_display_name_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS single_configured_display_name_confirmed_by uuid;

-- Reclassify the earlier seed as migration_seed / unconfirmed so the
-- resolver treats it as unavailable until an administrator confirms it.
UPDATE public.communication_hub_recipient_policy
SET single_configured_display_name_source = 'migration_seed',
    single_configured_display_name_confirmed = false,
    single_configured_display_name_confirmed_at = NULL,
    single_configured_display_name_confirmed_by = NULL
WHERE single_configured_display_name = 'Rohit Mishra'
  AND single_configured_display_name_confirmed = false;

-- Update prepare_comm_hub_preview to only use the display name when it
-- has been operator-confirmed. When unconfirmed, recipient_name remains
-- unresolved and the operator sees a precise blocker
-- (recipient_display_name_required) instead of silently rendering a
-- seed value.
CREATE OR REPLACE FUNCTION public.prepare_comm_hub_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_module_code text := p_payload->>'module_code';
  v_event_code  text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel','email');
  v_send_ctx    text := COALESCE(p_payload->>'send_context','preview');
  v_to          jsonb := COALESCE(p_payload->'to_recipients','[]'::jsonb);
  v_cc          jsonb := COALESCE(p_payload->'cc_recipients','[]'::jsonb);
  v_bcc         jsonb := COALESCE(p_payload->'bcc_recipients','[]'::jsonb);
  v_sender_id   uuid  := NULLIF(p_payload->>'sender_profile_id','')::uuid;
  v_ctx_in      jsonb := COALESCE(p_payload->'context_data','{}'::jsonb);
  v_map         RECORD;
  v_tpl         RECORD;
  v_ver         RECORD;
  v_policy      RECORD;
  v_scenario    RECORD;
  v_recipient_name text;
  v_recipient_name_confirmed boolean := false;
  v_request_no  text;
  v_generated_at timestamptz := now();
  v_tokens      jsonb;
  v_scenario_tokens jsonb := '{}'::jsonb;
  v_render_subject jsonb;
  v_render_html    jsonb;
  v_render_text    jsonb;
  v_unresolved  jsonb := '[]'::jsonb;
  v_snapshot_id uuid;
  v_recipient_hash text;
  v_content_hash text;
  v_first_to text;
BEGIN
  IF v_module_code IS NULL OR v_event_code IS NULL THEN
    RAISE EXCEPTION 'module_code and event_code are required';
  END IF;

  -- Resolve template mapping + active version
  SELECT * INTO v_map
  FROM public.communication_hub_event_template_map
  WHERE module_code = v_module_code
    AND event_code  = v_event_code
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no template mapped for %/%', v_module_code, v_event_code;
  END IF;

  SELECT * INTO v_tpl FROM public.core_template WHERE id = v_map.template_id;
  SELECT * INTO v_ver FROM public.core_template_version WHERE id = v_tpl.active_version_id;

  -- Recipient policy (single-row singleton)
  SELECT * INTO v_policy FROM public.communication_hub_recipient_policy LIMIT 1;

  v_first_to := CASE WHEN jsonb_array_length(v_to) > 0
                     THEN lower(trim(v_to->>0)) ELSE NULL END;

  -- Recipient display name: only trust operator-confirmed values.
  IF v_policy.active_mode = 'SINGLE_CONFIGURED_RECIPIENT'
     AND v_policy.single_configured_display_name IS NOT NULL
     AND v_policy.single_configured_display_name_confirmed = true THEN
    v_recipient_name := v_policy.single_configured_display_name;
    v_recipient_name_confirmed := true;
  ELSE
    v_recipient_name := NULL;
  END IF;

  -- Server-minted stable request number (idempotent per snapshot).
  v_request_no := 'TEST-COMM-' || to_char(v_generated_at,'YYYYMMDD') || '-' ||
                  substr(replace(gen_random_uuid()::text,'-',''),1,8);

  -- Active default scenario (if any) — event-owned business tokens only.
  SELECT * INTO v_scenario
  FROM public.communication_hub_event_test_scenario
  WHERE module_code = v_module_code
    AND event_code  = v_event_code
    AND channel     = v_channel
    AND is_active   = true
  ORDER BY scenario_key = 'default' DESC, updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_scenario_tokens := COALESCE(v_scenario.tokens,'{}'::jsonb);
    -- Strip protected keys so a scenario cannot override system/recipient/request context.
    v_scenario_tokens := v_scenario_tokens
      - 'module_code' - 'event_code' - 'channel'
      - 'generated_at' - 'current_date'
      - 'recipient_name' - 'recipient_email'
      - 'request_no' - 'preview_reference';
  END IF;

  -- Merge with source ownership precedence:
  -- user context (lowest) < scenario < system/recipient/request (highest, protected).
  v_tokens := v_ctx_in
           || v_scenario_tokens
           || jsonb_build_object(
                'module_code', v_module_code,
                'event_code',  v_event_code,
                'channel',     v_channel,
                'generated_at', to_char(v_generated_at,'YYYY-MM-DD HH24:MI:SS TZ'),
                'current_date', to_char(v_generated_at,'YYYY-MM-DD'),
                'request_no',  v_request_no
              );
  IF v_recipient_name IS NOT NULL THEN
    v_tokens := v_tokens || jsonb_build_object('recipient_name', v_recipient_name);
  END IF;
  IF v_first_to IS NOT NULL THEN
    v_tokens := v_tokens || jsonb_build_object('recipient_email', v_first_to);
  END IF;

  -- Render each surface
  v_render_subject := public.comm_hub_render_template(COALESCE(v_ver.subject,''),   v_tokens);
  v_render_html    := public.comm_hub_render_template(COALESCE(v_ver.body_html,''), v_tokens);
  v_render_text    := public.comm_hub_render_template(COALESCE(v_ver.body_text,''), v_tokens);

  -- Union of unresolved placeholders from all surfaces
  SELECT COALESCE(jsonb_agg(DISTINCT v ORDER BY v), '[]'::jsonb)
  INTO v_unresolved
  FROM (
    SELECT jsonb_array_elements_text(v_render_subject->'unresolved') AS v
    UNION
    SELECT jsonb_array_elements_text(v_render_html->'unresolved')
    UNION
    SELECT jsonb_array_elements_text(v_render_text->'unresolved')
  ) u;

  -- If recipient_name was required but unconfirmed, surface a precise blocker.
  IF NOT v_recipient_name_confirmed
     AND v_unresolved ? 'recipient_name' THEN
    -- keep in unresolved list; the resolver blocker is reported via the
    -- preview snapshot's unresolved_variables and the UI translates it
    -- to `recipient_display_name_required`.
    NULL;
  END IF;

  v_recipient_hash := encode(digest(coalesce(v_first_to,''),'sha256'),'hex');
  v_content_hash   := encode(digest(
                        coalesce(v_render_subject->>'rendered','') || '||' ||
                        coalesce(v_render_html->>'rendered','')    || '||' ||
                        coalesce(v_render_text->>'rendered',''),
                        'sha256'),'hex');

  -- Supersede any prior PREPARED snapshot for the same (module,event,channel,recipient_hash).
  UPDATE public.communication_preview_snapshot
     SET status = 'SUPERSEDED', updated_at = now()
   WHERE module_code = v_module_code
     AND event_code  = v_event_code
     AND channel     = v_channel
     AND recipient_set_hash = v_recipient_hash
     AND status = 'PREPARED';

  INSERT INTO public.communication_preview_snapshot(
    id, module_code, event_code, channel, send_context,
    to_recipients, cc_recipients, bcc_recipients, recipient_set_hash,
    template_id, template_version_id, sender_profile_id,
    rendered_subject, rendered_body_html, rendered_body_text,
    content_hash, context_hash, unresolved_variables,
    context_data, status, expires_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_module_code, v_event_code, v_channel, v_send_ctx,
    v_to, v_cc, v_bcc, v_recipient_hash,
    v_tpl.id, v_ver.id, v_sender_id,
    v_render_subject->>'rendered', v_render_html->>'rendered', v_render_text->>'rendered',
    v_content_hash,
    encode(digest(v_tokens::text,'sha256'),'hex'),
    v_unresolved,
    v_tokens || jsonb_build_object(
      'request_no', v_request_no,
      'recipient_name_confirmed', v_recipient_name_confirmed,
      'scenario_id', COALESCE(v_scenario.id::text, NULL),
      'scenario_key', COALESCE(v_scenario.scenario_key, NULL)
    ),
    'PREPARED',
    now() + interval '24 hours',
    now(), now()
  ) RETURNING id INTO v_snapshot_id;

  RETURN (
    SELECT to_jsonb(s.*) FROM public.communication_preview_snapshot s
    WHERE s.id = v_snapshot_id
  );
END;
$fn$;