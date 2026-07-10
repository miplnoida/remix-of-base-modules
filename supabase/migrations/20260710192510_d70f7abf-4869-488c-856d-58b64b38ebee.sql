
CREATE TABLE IF NOT EXISTS public.communication_hub_event_review_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  event_code text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  review_mode text NOT NULL DEFAULT 'preview_required',
  preview_required boolean NOT NULL DEFAULT true,
  allow_operator_edit_tokens boolean NOT NULL DEFAULT false,
  allow_operator_edit_body boolean NOT NULL DEFAULT false,
  allow_operator_change_recipient boolean NOT NULL DEFAULT false,
  show_template_to_operator boolean NOT NULL DEFAULT true,
  show_template_to_recipient_portal boolean NOT NULL DEFAULT false,
  require_template_approval boolean NOT NULL DEFAULT true,
  require_legal_approval boolean NOT NULL DEFAULT false,
  require_business_approval boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'draft',
  approved_template_version_id uuid NULL,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uniq_review_policy_event UNIQUE (module_code, event_code, channel),
  CONSTRAINT chk_review_mode CHECK (review_mode IN ('hidden','preview_optional','preview_required','approval_required','legal_approval_required')),
  CONSTRAINT chk_review_approval_status CHECK (approval_status IN ('draft','under_review','approved_internal','approved_external','rejected','retired'))
);

GRANT SELECT ON public.communication_hub_event_review_policy TO authenticated;
GRANT ALL ON public.communication_hub_event_review_policy TO service_role;

ALTER TABLE public.communication_hub_event_review_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_policy_read_authenticated"
  ON public.communication_hub_event_review_policy FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "review_policy_admin_write"
  ON public.communication_hub_event_review_policy FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_review_policy_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_review_policy_touch ON public.communication_hub_event_review_policy;
CREATE TRIGGER trg_review_policy_touch BEFORE UPDATE
  ON public.communication_hub_event_review_policy
  FOR EACH ROW EXECUTE FUNCTION public.tg_review_policy_touch();

INSERT INTO public.communication_hub_event_review_policy
  (module_code, event_code, channel, review_mode, preview_required,
   allow_operator_edit_tokens, allow_operator_edit_body, allow_operator_change_recipient,
   show_template_to_operator, show_template_to_recipient_portal,
   require_template_approval, require_legal_approval, require_business_approval,
   approval_status, approved_template_version_id, approved_by, approved_at, notes)
VALUES
  ('LEGAL','INTERNAL_CASE_ASSIGNMENT_NOTICE','email','preview_required', true,
   false, false, false, true, false,
   true, false, false,
   'approved_internal', '66a0b2ad-510a-4410-836d-b33f8b085730',
   '00000000-0000-0000-0000-000000000000', now(),
   'CH-T1 seed — approved for internal Misha domain live send.'),
  ('LEGAL','HEARING_SCHEDULE_NOTICE','email','legal_approval_required', true,
   false, false, false, true, false, true, true, false,
   'draft', NULL, NULL, NULL, 'CH-T1 seed — draft, needs legal approval.'),
  ('LEGAL','LEGAL_DECISION_NOTICE','email','legal_approval_required', true,
   false, false, false, true, false, true, true, false,
   'draft', NULL, NULL, NULL, 'CH-T1 seed — draft, needs legal approval.'),
  ('LEGAL','APPEAL_NOTICE','email','legal_approval_required', true,
   false, false, false, true, false, true, true, false,
   'draft', NULL, NULL, NULL, 'CH-T1 seed — draft, needs legal approval.')
ON CONFLICT (module_code, event_code, channel) DO NOTHING;

CREATE OR REPLACE FUNCTION public.render_comm_hub_template_preview(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module text := p_payload->>'module_code';
  v_event  text := p_payload->>'event_code';
  v_channel text := COALESCE(p_payload->>'channel','email');
  v_recipient_email text := lower(coalesce(p_payload->>'recipient_email',''));
  v_recipient_name  text := coalesce(p_payload->>'recipient_name','');
  v_tokens jsonb := coalesce(p_payload->'tokens','{}'::jsonb);
  v_map RECORD;
  v_ver RECORD;
  v_subject text;
  v_body_html text;
  v_body_text text;
  v_review jsonb;
  v_send jsonb;
  v_missing text[] := ARRAY[]::text[];
  v_unresolved text[] := ARRAY[]::text[];
  v_warnings text[] := ARRAY[]::text[];
  v_blockers text[] := ARRAY[]::text[];
  v_token_key text;
  v_token_val text;
  v_pattern text;
  v_dummy_hit text;
BEGIN
  SELECT m.*, sp.from_email, sp.display_name, sp.reply_to_email, sp.is_enabled AS sender_enabled,
         sp.provider_identity_status, sp.domain_verified
    INTO v_map
    FROM communication_hub_event_template_map m
    LEFT JOIN communication_hub_sender_profile sp ON sp.id = m.sender_profile_id
   WHERE m.module_code = v_module AND m.event_code = v_event
     AND m.channel = v_channel AND m.active = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'blockers', ARRAY['event_template_map_missing'],
      'module_code', v_module, 'event_code', v_event, 'channel', v_channel
    );
  END IF;

  SELECT tv.* INTO v_ver
    FROM core_template t
    LEFT JOIN core_template_version tv ON tv.id = t.active_version_id
   WHERE t.id = v_map.template_id;

  IF v_ver.id IS NULL THEN
    v_blockers := v_blockers || 'template_version_missing';
  END IF;

  v_subject := coalesce(v_ver.subject,'');
  v_body_html := coalesce(v_ver.body_html,'');
  v_body_text := coalesce(v_ver.body_text,'');

  FOR v_token_key, v_token_val IN
    SELECT key, coalesce(value #>> '{}','') FROM jsonb_each(v_tokens)
  LOOP
    v_pattern := '\{\{\s*' || regexp_replace(v_token_key,'([.*+?^${}()|[\]\\])','\\\1','g') || '\s*\}\}';
    v_subject := regexp_replace(v_subject, v_pattern, coalesce(v_token_val,''), 'g');
    v_body_html := regexp_replace(v_body_html, v_pattern, coalesce(v_token_val,''), 'g');
    v_body_text := regexp_replace(v_body_text, v_pattern, coalesce(v_token_val,''), 'g');
    IF coalesce(v_token_val,'') = '' THEN
      v_missing := v_missing || v_token_key;
    END IF;
  END LOOP;

  SELECT array_agg(DISTINCT m[1]) INTO v_unresolved
  FROM (
    SELECT regexp_matches(v_subject || ' ' || v_body_text || ' ' || v_body_html,
                          '\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}', 'g') AS m
  ) x;
  IF v_unresolved IS NULL THEN v_unresolved := ARRAY[]::text[]; END IF;

  FOREACH v_dummy_hit IN ARRAY ARRAY['dry-run','dry run','dummy','lorem ipsum','placeholder','test only','sample only'] LOOP
    IF position(lower(v_dummy_hit) IN lower(v_subject || ' ' || v_body_text || ' ' || v_body_html)) > 0 THEN
      v_warnings := v_warnings || ('dummy_wording:' || v_dummy_hit);
    END IF;
  END LOOP;

  SELECT to_jsonb(rp.*) INTO v_review
    FROM communication_hub_event_review_policy rp
   WHERE rp.module_code = v_module AND rp.event_code = v_event AND rp.channel = v_channel
   LIMIT 1;

  BEGIN
    v_send := public.resolve_comm_hub_send_policy(v_module, v_event, v_channel, 'production');
  EXCEPTION WHEN OTHERS THEN v_send := NULL;
  END;

  IF v_review IS NULL THEN v_blockers := v_blockers || 'review_policy_missing'; END IF;
  IF v_review IS NOT NULL AND (v_review->>'approval_status') NOT IN ('approved_internal','approved_external') THEN
    v_blockers := v_blockers || 'template_not_approved';
  END IF;
  IF v_review IS NOT NULL AND (v_review->>'approved_template_version_id') IS NOT NULL
     AND v_ver.id IS NOT NULL
     AND (v_review->>'approved_template_version_id')::uuid <> v_ver.id THEN
    v_warnings := v_warnings || 'active_version_differs_from_approved';
  END IF;
  IF array_length(v_unresolved,1) > 0 THEN
    v_blockers := v_blockers || 'unresolved_tokens_present';
  END IF;
  IF v_recipient_email = '' THEN v_blockers := v_blockers || 'recipient_email_missing'; END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'resolved_template_code', v_map.template_code,
    'template_id', v_map.template_id,
    'template_version_id', v_ver.id,
    'version_no', v_ver.version_no,
    'version_status', v_ver.status,
    'from_email', v_map.from_email,
    'from_display_name', v_map.display_name,
    'reply_to_email', v_map.reply_to_email,
    'sender_profile_id', v_map.sender_profile_id,
    'sender_enabled', v_map.sender_enabled,
    'sender_verified', (v_map.provider_identity_status = 'verified' AND v_map.domain_verified = true),
    'subject_preview', v_subject,
    'html_preview', v_body_html,
    'text_preview', v_body_text,
    'token_values', v_tokens,
    'missing_tokens', to_jsonb(v_missing),
    'unresolved_tokens', to_jsonb(v_unresolved),
    'review_policy', v_review,
    'send_policy', v_send,
    'warnings', to_jsonb(v_warnings),
    'blockers', to_jsonb(v_blockers),
    'recipient_email', v_recipient_email,
    'recipient_name', v_recipient_name,
    'generated_at', now()
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.render_comm_hub_template_preview(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.render_comm_hub_template_preview(jsonb) TO service_role;
