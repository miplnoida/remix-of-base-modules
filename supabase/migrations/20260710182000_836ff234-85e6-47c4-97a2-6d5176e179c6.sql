
CREATE TABLE public.communication_hub_event_send_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  event_code text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  send_policy text NOT NULL,
  environment_scope text NOT NULL DEFAULT 'production',
  recipient_policy text NOT NULL,
  requires_template_approval boolean NOT NULL DEFAULT true,
  requires_sender_verified boolean NOT NULL DEFAULT true,
  requires_recipient_validation boolean NOT NULL DEFAULT true,
  allow_internal_recipients boolean NOT NULL DEFAULT false,
  allow_external_recipients boolean NOT NULL DEFAULT false,
  allowed_internal_domains text[] NOT NULL DEFAULT '{}',
  allowed_external_domains text[] NOT NULL DEFAULT '{}',
  max_recipients_per_send integer NOT NULL DEFAULT 1,
  max_sends_per_entity_per_event integer NOT NULL DEFAULT 1,
  duplicate_window_minutes integer NOT NULL DEFAULT 1440,
  require_preview_before_manual_send boolean NOT NULL DEFAULT true,
  require_typed_confirmation_for_send boolean NOT NULL DEFAULT false,
  require_typed_confirmation_for_policy_change boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  approval_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ch_esp_policy_valid CHECK (send_policy IN (
    'disabled','dry_run_only','prepare_only','manual_review',
    'manual_live','auto_live_internal','auto_live_external'
  )),
  CONSTRAINT ch_esp_recipient_valid CHECK (recipient_policy IN (
    'internal_only','external_allowed','mixed','system_only'
  )),
  CONSTRAINT ch_esp_unique UNIQUE (module_code, event_code, channel, environment_scope)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_hub_event_send_policy TO authenticated;
GRANT ALL ON public.communication_hub_event_send_policy TO service_role;

ALTER TABLE public.communication_hub_event_send_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ch_esp_admin_select" ON public.communication_hub_event_send_policy
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "ch_esp_admin_write" ON public.communication_hub_event_send_policy
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE OR REPLACE FUNCTION public.ch_esp_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER ch_esp_touch_updated_at
BEFORE UPDATE ON public.communication_hub_event_send_policy
FOR EACH ROW EXECUTE FUNCTION public.ch_esp_touch_updated_at();

INSERT INTO public.communication_hub_event_send_policy
  (module_code, event_code, channel, send_policy, recipient_policy,
   allow_internal_recipients, allow_external_recipients,
   allowed_internal_domains,
   require_typed_confirmation_for_send,
   require_typed_confirmation_for_policy_change,
   approval_notes)
VALUES
  ('LEGAL','INTERNAL_CASE_ASSIGNMENT_NOTICE','email','manual_live','internal_only',
   true, false, ARRAY['mishainfotech.com'],
   false, true,
   'Seeded by CH-P1: ready for manual_live internal-only; auto_live_internal pending explicit approval.'),
  ('LEGAL','CASE_STAGE_TRANSITION','email','manual_review','internal_only',
   true, false, ARRAY['mishainfotech.com'],
   false, true, 'Seeded by CH-P1: manual_review.'),
  ('LEGAL','CASE_CLOSURE_NOTICE','email','manual_review','internal_only',
   true, false, ARRAY['mishainfotech.com'],
   false, true, 'Seeded by CH-P1: manual_review (high risk).'),
  ('LEGAL','EXTERNAL_PARTY_NOTICE','email','dry_run_only','external_allowed',
   false, false, ARRAY['mishainfotech.com'],
   false, true, 'Seeded by CH-P1: dry_run_only until external rollout approved.')
ON CONFLICT (module_code, event_code, channel, environment_scope) DO NOTHING;

CREATE OR REPLACE FUNCTION public.resolve_comm_hub_send_policy(
  p_module_code text,
  p_event_code text,
  p_channel text DEFAULT 'email',
  p_environment_scope text DEFAULT 'production'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.communication_hub_event_send_policy%ROWTYPE;
BEGIN
  SELECT * INTO v_row
    FROM public.communication_hub_event_send_policy
   WHERE module_code = p_module_code
     AND event_code = p_event_code
     AND channel = p_channel
     AND environment_scope = p_environment_scope
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'send_policy', 'dry_run_only',
      'recipient_policy', 'internal_only',
      'allowed_internal_domains', '[]'::jsonb,
      'allowed_external_domains', '[]'::jsonb,
      'blockers', jsonb_build_array('no_policy_configured'),
      'approved', false,
      'is_enabled', false
    );
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'id', v_row.id,
    'send_policy', v_row.send_policy,
    'recipient_policy', v_row.recipient_policy,
    'allowed_internal_domains', to_jsonb(v_row.allowed_internal_domains),
    'allowed_external_domains', to_jsonb(v_row.allowed_external_domains),
    'allow_internal_recipients', v_row.allow_internal_recipients,
    'allow_external_recipients', v_row.allow_external_recipients,
    'max_recipients_per_send', v_row.max_recipients_per_send,
    'max_sends_per_entity_per_event', v_row.max_sends_per_entity_per_event,
    'duplicate_window_minutes', v_row.duplicate_window_minutes,
    'requires_template_approval', v_row.requires_template_approval,
    'requires_sender_verified', v_row.requires_sender_verified,
    'require_typed_confirmation_for_send', v_row.require_typed_confirmation_for_send,
    'require_typed_confirmation_for_policy_change', v_row.require_typed_confirmation_for_policy_change,
    'is_enabled', v_row.is_enabled,
    'approved', v_row.approved_by IS NOT NULL,
    'approved_by', v_row.approved_by,
    'approved_at', v_row.approved_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_comm_hub_send_policy(text,text,text,text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_send_authorization(
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module      text := p_payload->>'module_code';
  v_event       text := p_payload->>'event_code';
  v_channel     text := COALESCE(p_payload->>'channel', 'email');
  v_env         text := COALESCE(p_payload->>'environment_scope', 'production');
  v_recipients  jsonb := COALESCE(p_payload->'recipients', '[]'::jsonb);
  v_entity_id   text  := p_payload->>'entity_id';

  v_policy jsonb;
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_sender_ok boolean := false;
  v_template_ok boolean := false;

  v_blockers jsonb := '[]'::jsonb;
  v_required_action text := NULL;
  v_mode text;
  v_authorized boolean := false;

  v_recipient text;
  v_domain text;
  v_allowed_int text[];
  v_allowed_ext text[];
  v_allow_int boolean;
  v_allow_ext boolean;
  v_max_recip int;
  v_dup_window int;
  v_send_policy text;
  v_is_enabled boolean;
  v_approved boolean;
  v_req_sender_verified boolean;
  v_recipient_count int := 0;
  v_dup_count int := 0;
BEGIN
  v_policy := public.resolve_comm_hub_send_policy(v_module, v_event, v_channel, v_env);
  v_send_policy := v_policy->>'send_policy';
  v_is_enabled := COALESCE((v_policy->>'is_enabled')::boolean, false);
  v_approved := COALESCE((v_policy->>'approved')::boolean, false);
  v_allow_int := COALESCE((v_policy->>'allow_internal_recipients')::boolean, false);
  v_allow_ext := COALESCE((v_policy->>'allow_external_recipients')::boolean, false);
  v_max_recip := COALESCE((v_policy->>'max_recipients_per_send')::int, 1);
  v_dup_window := COALESCE((v_policy->>'duplicate_window_minutes')::int, 1440);
  v_req_sender_verified := COALESCE((v_policy->>'requires_sender_verified')::boolean, true);

  SELECT COALESCE(array_agg(x), ARRAY[]::text[])
    INTO v_allowed_int
    FROM jsonb_array_elements_text(COALESCE(v_policy->'allowed_internal_domains','[]'::jsonb)) AS x;
  SELECT COALESCE(array_agg(x), ARRAY[]::text[])
    INTO v_allowed_ext
    FROM jsonb_array_elements_text(COALESCE(v_policy->'allowed_external_domains','[]'::jsonb)) AS x;

  SELECT * INTO v_settings
    FROM public.communication_hub_control_settings
   ORDER BY created_at ASC LIMIT 1;

  IF NOT FOUND OR v_settings.dispatch_enabled = false THEN
    v_blockers := v_blockers || to_jsonb('dispatch_disabled'::text);
  END IF;

  IF FOUND AND v_settings.dry_run_only = true
     AND v_send_policy IN ('manual_live','auto_live_internal','auto_live_external') THEN
    v_blockers := v_blockers || to_jsonb('global_dry_run_only'::text);
  END IF;

  IF NOT COALESCE((v_policy->>'found')::boolean, false) THEN
    v_blockers := v_blockers || to_jsonb('no_policy_configured'::text);
  END IF;

  IF NOT v_is_enabled THEN
    v_blockers := v_blockers || to_jsonb('policy_disabled'::text);
  END IF;

  IF v_send_policy IN ('disabled','dry_run_only','prepare_only') THEN
    v_blockers := v_blockers || to_jsonb('policy_forbids_live_send'::text);
  END IF;

  IF v_send_policy IN ('manual_live','auto_live_internal','auto_live_external') AND NOT v_approved THEN
    v_blockers := v_blockers || to_jsonb('policy_not_approved'::text);
    v_required_action := COALESCE(v_required_action, 'policy_approval_required');
  END IF;

  IF v_req_sender_verified THEN
    SELECT EXISTS(
      SELECT 1 FROM public.communication_hub_sender_profile
       WHERE module_code = v_module
         AND is_verified = true
         AND is_active = true
       LIMIT 1
    ) INTO v_sender_ok;
    IF NOT v_sender_ok THEN
      v_blockers := v_blockers || to_jsonb('sender_not_verified'::text);
      v_required_action := COALESCE(v_required_action, 'sender_verification_required');
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.communication_hub_event_template_map
     WHERE module_code = v_module
       AND event_code = v_event
       AND channel = v_channel
       AND is_active = true
     LIMIT 1
  ) INTO v_template_ok;
  IF NOT v_template_ok THEN
    v_blockers := v_blockers || to_jsonb('template_not_mapped'::text);
    v_required_action := COALESCE(v_required_action, 'template_approval_required');
  END IF;

  v_recipient_count := jsonb_array_length(v_recipients);
  IF v_recipient_count = 0 THEN
    v_blockers := v_blockers || to_jsonb('no_recipients'::text);
  END IF;
  IF v_recipient_count > v_max_recip THEN
    v_blockers := v_blockers || to_jsonb('too_many_recipients'::text);
  END IF;

  FOR v_recipient IN SELECT jsonb_array_elements_text(v_recipients) LOOP
    v_domain := lower(split_part(v_recipient, '@', 2));
    IF v_domain = '' THEN
      v_blockers := v_blockers || to_jsonb('invalid_recipient'::text);
      CONTINUE;
    END IF;
    IF v_domain = ANY(v_allowed_int) THEN
      IF NOT v_allow_int THEN
        v_blockers := v_blockers || to_jsonb('internal_not_allowed'::text);
        v_required_action := COALESCE(v_required_action, 'recipient_not_allowed');
      END IF;
    ELSIF v_domain = ANY(v_allowed_ext) THEN
      IF NOT v_allow_ext THEN
        v_blockers := v_blockers || to_jsonb('external_not_allowed'::text);
        v_required_action := COALESCE(v_required_action, 'recipient_not_allowed');
      END IF;
    ELSE
      v_blockers := v_blockers || to_jsonb('recipient_domain_not_allowlisted'::text);
      v_required_action := COALESCE(v_required_action, 'recipient_not_allowed');
    END IF;
  END LOOP;

  IF v_entity_id IS NOT NULL AND v_dup_window > 0 THEN
    SELECT COUNT(*) INTO v_dup_count
      FROM public.communication_request
     WHERE module_code = v_module
       AND event_code = v_event
       AND entity_id::text = v_entity_id
       AND created_at > (now() - make_interval(mins => v_dup_window));
    IF v_dup_count >= COALESCE((v_policy->>'max_sends_per_entity_per_event')::int, 1) THEN
      v_blockers := v_blockers || to_jsonb('duplicate_within_window'::text);
      v_required_action := COALESCE(v_required_action, 'duplicate_blocked');
    END IF;
  END IF;

  v_mode := v_send_policy;
  v_authorized := (jsonb_array_length(v_blockers) = 0)
                  AND v_send_policy IN ('manual_live','auto_live_internal','auto_live_external');

  RETURN jsonb_build_object(
    'authorized', v_authorized,
    'mode', v_mode,
    'blockers', v_blockers,
    'required_action', v_required_action,
    'policy', v_policy,
    'sender_verified', v_sender_ok,
    'template_mapped', v_template_ok,
    'recipient_count', v_recipient_count,
    'duplicate_count', v_dup_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_send_authorization(jsonb) TO authenticated, service_role;
