
-- EPIC CH-S1 — Sender Profile Registry and Event-Level From Email Mapping
-- Part A: Sender profile table
CREATE TABLE IF NOT EXISTS public.communication_hub_sender_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code text NOT NULL UNIQUE,
  profile_name text NOT NULL,
  from_email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  reply_to_email text NULL,
  sender_category text NOT NULL,
  audience_type text NOT NULL,
  risk_level text NOT NULL DEFAULT 'low',
  provider_code text NOT NULL DEFAULT 'resend',
  provider_identity_status text NOT NULL DEFAULT 'pending',
  domain_verified boolean NOT NULL DEFAULT false,
  is_enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT chub_sender_category_chk CHECK (sender_category IN ('registration','identity','notifications','contributions','finance','compliance','benefits','claims','medical','doctors','internal','workflow','legal','audit','reports')),
  CONSTRAINT chub_sender_audience_chk CHECK (audience_type IN ('internal','external','mixed')),
  CONSTRAINT chub_sender_risk_chk CHECK (risk_level IN ('low','medium','high')),
  CONSTRAINT chub_sender_identity_status_chk CHECK (provider_identity_status IN ('pending','verified','rejected','disabled'))
);

GRANT SELECT ON public.communication_hub_sender_profile TO authenticated;
GRANT ALL ON public.communication_hub_sender_profile TO service_role;

ALTER TABLE public.communication_hub_sender_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chub_sender_read_admin" ON public.communication_hub_sender_profile
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'Admin'::app_role));

-- writes via SECURITY DEFINER RPC (below) — service_role bypasses RLS

-- Only one is_default
CREATE UNIQUE INDEX IF NOT EXISTS chub_sender_only_one_default
  ON public.communication_hub_sender_profile ((true)) WHERE is_default = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_chub_sender_updated_at ON public.communication_hub_sender_profile;
CREATE TRIGGER trg_chub_sender_updated_at BEFORE UPDATE ON public.communication_hub_sender_profile
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

-- Part B: Seed 15 sender profiles
INSERT INTO public.communication_hub_sender_profile
  (profile_code, profile_name, from_email, display_name, sender_category, audience_type, risk_level, is_default)
VALUES
  ('SENDER_REGISTRATION',  'Registration',            'registration@secureserve.biz',           'SecureServe Registration',            'registration',  'external', 'low',    false),
  ('SENDER_IDENTITY',      'Identity',                'identity@secureserve.biz',               'SecureServe Identity',                'identity',      'external', 'medium', false),
  ('SENDER_NOTIFICATIONS', 'Notifications',           'notifications@secureserve.biz',          'SecureServe Notifications',           'notifications', 'external', 'low',    true),
  ('SENDER_CONTRIBUTIONS', 'Contributions',           'contributions@secureserve.biz',          'SecureServe Contributions',           'contributions', 'external', 'medium', false),
  ('SENDER_FINANCE',       'Finance',                 'finance@secureserve.biz',                'SecureServe Finance',                 'finance',       'external', 'high',   false),
  ('SENDER_COMPLIANCE',    'Compliance',              'compliance@secureserve.biz',             'SecureServe Compliance',              'compliance',    'external', 'high',   false),
  ('SENDER_BENEFITS',      'Benefits',                'benefits@secureserve.biz',               'SecureServe Benefits',                'benefits',      'external', 'high',   false),
  ('SENDER_CLAIMS',        'Claims',                  'claims@secureserve.biz',                 'SecureServe Claims',                  'claims',        'external', 'medium', false),
  ('SENDER_MEDICAL',       'Medical',                 'medical@secureserve.biz',                'SecureServe Medical',                 'medical',       'external', 'high',   false),
  ('SENDER_DOCTORS',       'Doctors',                 'doctors@secureserve.biz',                'SecureServe Doctors',                 'doctors',       'external', 'medium', false),
  ('SENDER_INTERNAL',      'Internal Notifications',  'internal-notifications@secureserve.biz', 'SecureServe Internal Notifications',  'internal',      'internal', 'low',    false),
  ('SENDER_WORKFLOW',      'Workflow',                'workflow@secureserve.biz',               'SecureServe Workflow',                'workflow',      'internal', 'low',    false),
  ('SENDER_LEGAL',         'Legal',                   'legal@secureserve.biz',                  'SecureServe Legal',                   'legal',         'mixed',    'high',   false),
  ('SENDER_AUDIT',         'Audit',                   'audit@secureserve.biz',                  'SecureServe Audit',                   'audit',         'internal', 'medium', false),
  ('SENDER_REPORTS',       'Reports',                 'reports@secureserve.biz',                'SecureServe Reports',                 'reports',       'mixed',    'medium', false)
ON CONFLICT (profile_code) DO NOTHING;

-- Part C: Add sender_profile_id to event-template mapping
ALTER TABLE public.communication_hub_event_template_map
  ADD COLUMN IF NOT EXISTS sender_profile_id uuid NULL REFERENCES public.communication_hub_sender_profile(id) ON DELETE SET NULL;

-- Part L: Logical default sender per existing mapping
UPDATE public.communication_hub_event_template_map m
   SET sender_profile_id = sp.id
  FROM public.communication_hub_sender_profile sp
 WHERE m.sender_profile_id IS NULL
   AND sp.profile_code = CASE
     WHEN m.module_code = 'EMPLOYER_REGISTRATION' THEN 'SENDER_REGISTRATION'
     WHEN m.module_code = 'INSURED_PERSON' AND m.event_code IN ('REGISTRATION_ACKNOWLEDGEMENT_NOTICE','PROFILE_UPDATE_NOTICE','DOCUMENT_REQUEST_NOTICE','INTERNAL_PROFILE_REVIEW_NOTICE') THEN 'SENDER_IDENTITY'
     WHEN m.module_code = 'INSURED_PERSON' AND m.event_code = 'CONTRIBUTION_HISTORY_NOTICE' THEN 'SENDER_CONTRIBUTIONS'
     WHEN m.module_code = 'INSURED_PERSON' THEN 'SENDER_NOTIFICATIONS'
     WHEN m.module_code = 'BENEFITS' AND m.event_code IN ('CLAIM_APPROVAL_NOTICE','CLAIM_REJECTION_NOTICE') THEN 'SENDER_BENEFITS'
     WHEN m.module_code = 'BENEFITS' THEN 'SENDER_CLAIMS'
     WHEN m.module_code = 'COMPLIANCE' AND m.event_code = 'INTERNAL_CASE_STATUS_NOTICE' THEN 'SENDER_INTERNAL'
     WHEN m.module_code = 'COMPLIANCE' THEN 'SENDER_COMPLIANCE'
     WHEN m.module_code = 'LEGAL' AND m.event_code = 'INTERNAL_CASE_ASSIGNMENT_NOTICE' THEN 'SENDER_INTERNAL'
     WHEN m.module_code = 'LEGAL' THEN 'SENDER_LEGAL'
     WHEN m.module_code = 'APPEALS' AND m.event_code = 'INTERNAL_REVIEW_ASSIGNMENT_NOTICE' THEN 'SENDER_INTERNAL'
     WHEN m.module_code = 'APPEALS' THEN 'SENDER_LEGAL'
     WHEN m.module_code = 'WORKFLOW' AND m.event_code = 'APPROVER_ASSIGNMENT_NOTICE' THEN 'SENDER_INTERNAL'
     WHEN m.module_code = 'WORKFLOW' THEN 'SENDER_WORKFLOW'
     WHEN m.module_code = 'COMM_HUB' THEN 'SENDER_INTERNAL'
     ELSE 'SENDER_NOTIFICATIONS'
   END;

-- Part H/I: Add sender snapshot columns to communication_message
ALTER TABLE public.communication_message
  ADD COLUMN IF NOT EXISTS sender_profile_id uuid NULL REFERENCES public.communication_hub_sender_profile(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_email text NULL,
  ADD COLUMN IF NOT EXISTS from_display_name text NULL,
  ADD COLUMN IF NOT EXISTS reply_to_email text NULL;

-- Part D (RPCs): admin-only sender-profile write operations
CREATE OR REPLACE FUNCTION public.upsert_comm_hub_sender_profile(
  p_id uuid,
  p_profile_code text,
  p_profile_name text,
  p_from_email text,
  p_display_name text,
  p_reply_to_email text,
  p_sender_category text,
  p_audience_type text,
  p_risk_level text,
  p_notes text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_row public.communication_hub_sender_profile%ROWTYPE;
  v_old jsonb;
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden_admin_only';
  END IF;
  IF p_from_email !~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    RAISE EXCEPTION 'invalid_from_email';
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_row FROM public.communication_hub_sender_profile WHERE id = p_id;
    v_old := to_jsonb(v_row);
    UPDATE public.communication_hub_sender_profile SET
      profile_code = p_profile_code,
      profile_name = p_profile_name,
      from_email = lower(p_from_email),
      display_name = p_display_name,
      reply_to_email = NULLIF(p_reply_to_email,''),
      sender_category = p_sender_category,
      audience_type = p_audience_type,
      risk_level = coalesce(p_risk_level,'low'),
      notes = p_notes,
      updated_by = p_actor_user_id
    WHERE id = p_id
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.communication_hub_sender_profile
      (profile_code, profile_name, from_email, display_name, reply_to_email, sender_category, audience_type, risk_level, notes, created_by, updated_by)
    VALUES (p_profile_code, p_profile_name, lower(p_from_email), p_display_name, NULLIF(p_reply_to_email,''), p_sender_category, p_audience_type, coalesce(p_risk_level,'low'), p_notes, p_actor_user_id, p_actor_user_id)
    RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('sender_profile_upsert:'||v_row.profile_code, v_old, to_jsonb(v_row), 'sender profile upsert', p_actor_user_id, 'upsert_comm_hub_sender_profile');

  RETURN jsonb_build_object('ok', true, 'profile', to_jsonb(v_row));
END;
$fn$;

REVOKE ALL ON FUNCTION public.upsert_comm_hub_sender_profile(uuid,text,text,text,text,text,text,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_comm_hub_sender_profile(uuid,text,text,text,text,text,text,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_comm_hub_sender_profile_flags(
  p_id uuid,
  p_is_enabled boolean,
  p_provider_identity_status text,
  p_domain_verified boolean,
  p_is_default boolean,
  p_reason text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_row public.communication_hub_sender_profile%ROWTYPE;
  v_old jsonb;
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden_admin_only';
  END IF;
  IF coalesce(trim(p_reason),'')='' THEN RAISE EXCEPTION 'reason_required'; END IF;

  SELECT * INTO v_row FROM public.communication_hub_sender_profile WHERE id = p_id;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'sender_profile_not_found'; END IF;
  v_old := to_jsonb(v_row);

  IF p_is_default IS TRUE THEN
    UPDATE public.communication_hub_sender_profile SET is_default = false, updated_by = p_actor_user_id
      WHERE id <> p_id AND is_default = true;
  END IF;

  UPDATE public.communication_hub_sender_profile SET
    is_enabled = coalesce(p_is_enabled, is_enabled),
    provider_identity_status = coalesce(p_provider_identity_status, provider_identity_status),
    domain_verified = coalesce(p_domain_verified, domain_verified),
    is_default = coalesce(p_is_default, is_default),
    updated_by = p_actor_user_id
  WHERE id = p_id
  RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('sender_profile_flags:'||v_row.profile_code, v_old, to_jsonb(v_row), p_reason, p_actor_user_id, 'set_comm_hub_sender_profile_flags');

  RETURN jsonb_build_object('ok', true, 'profile', to_jsonb(v_row));
END;
$fn$;

REVOKE ALL ON FUNCTION public.set_comm_hub_sender_profile_flags(uuid,boolean,text,boolean,boolean,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_comm_hub_sender_profile_flags(uuid,boolean,text,boolean,boolean,text,uuid) TO authenticated;

-- Extend upsert mapping RPC to accept sender_profile_id
CREATE OR REPLACE FUNCTION public.upsert_comm_hub_event_template_mapping_v2(
  p_module_code text,
  p_event_code text,
  p_channel text,
  p_template_code text,
  p_reason text,
  p_actor_user_id uuid,
  p_risk_level text DEFAULT 'low',
  p_sender_profile_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_tpl_id uuid;
  v_tpl_active boolean;
  v_tpl_active_ver uuid;
  v_row public.communication_hub_event_template_map%ROWTYPE;
  v_old jsonb;
  v_sender public.communication_hub_sender_profile%ROWTYPE;
BEGIN
  IF NOT has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden_admin_only';
  END IF;
  IF coalesce(trim(p_reason),'')='' THEN RAISE EXCEPTION 'reason_required'; END IF;
  IF coalesce(trim(p_module_code),'')='' OR coalesce(trim(p_event_code),'')='' OR coalesce(trim(p_channel),'')='' OR coalesce(trim(p_template_code),'')='' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  SELECT id, is_active, active_version_id INTO v_tpl_id, v_tpl_active, v_tpl_active_ver
    FROM public.core_template WHERE code = p_template_code LIMIT 1;
  IF v_tpl_id IS NULL THEN RAISE EXCEPTION 'template_not_found:%', p_template_code; END IF;
  IF v_tpl_active IS NOT TRUE OR v_tpl_active_ver IS NULL THEN
    RAISE EXCEPTION 'template_inactive_or_no_active_version:%', p_template_code;
  END IF;

  IF p_sender_profile_id IS NOT NULL THEN
    SELECT * INTO v_sender FROM public.communication_hub_sender_profile WHERE id = p_sender_profile_id;
    IF v_sender.id IS NULL THEN RAISE EXCEPTION 'sender_profile_not_found'; END IF;
    IF v_sender.is_enabled IS NOT TRUE THEN RAISE EXCEPTION 'sender_profile_disabled'; END IF;
  END IF;

  SELECT * INTO v_row FROM public.communication_hub_event_template_map
    WHERE module_code=p_module_code AND event_code=p_event_code AND channel=lower(p_channel);
  v_old := CASE WHEN v_row.id IS NULL THEN NULL ELSE to_jsonb(v_row) END;

  INSERT INTO public.communication_hub_event_template_map
    (module_code, event_code, channel, template_code, template_id, active, risk_level, mapping_source, reason, created_by, updated_by, sender_profile_id)
  VALUES
    (p_module_code, p_event_code, lower(p_channel), p_template_code, v_tpl_id, true, coalesce(p_risk_level,'low'), 'admin', p_reason, p_actor_user_id, p_actor_user_id, p_sender_profile_id)
  ON CONFLICT (module_code, event_code, channel) DO UPDATE
    SET template_code=EXCLUDED.template_code,
        template_id=EXCLUDED.template_id,
        active=true,
        risk_level=EXCLUDED.risk_level,
        mapping_source=EXCLUDED.mapping_source,
        reason=EXCLUDED.reason,
        updated_by=EXCLUDED.updated_by,
        sender_profile_id=COALESCE(EXCLUDED.sender_profile_id, communication_hub_event_template_map.sender_profile_id),
        updated_at=now()
  RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_control_audit(setting_key, old_value, new_value, reason, changed_by, source)
  VALUES ('event_template_mapping_upsert:'||p_module_code||'/'||p_event_code||'/'||lower(p_channel), v_old, to_jsonb(v_row), p_reason, p_actor_user_id, 'upsert_comm_hub_event_template_mapping_v2');

  RETURN jsonb_build_object('ok', true, 'mapping', to_jsonb(v_row));
END;
$fn$;

REVOKE ALL ON FUNCTION public.upsert_comm_hub_event_template_mapping_v2(text,text,text,text,text,uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_comm_hub_event_template_mapping_v2(text,text,text,text,text,uuid,text,uuid) TO authenticated;

-- Resolver helper (read-only)
CREATE OR REPLACE FUNCTION public.resolve_comm_hub_sender_for_event(
  p_module_code text, p_event_code text, p_channel text DEFAULT 'email'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE
  v_sender public.communication_hub_sender_profile%ROWTYPE;
  v_source text := 'none';
BEGIN
  SELECT sp.* INTO v_sender
    FROM public.communication_hub_event_template_map m
    JOIN public.communication_hub_sender_profile sp ON sp.id = m.sender_profile_id
   WHERE m.module_code = p_module_code
     AND m.event_code = p_event_code
     AND m.channel = lower(p_channel)
     AND m.active = true
   LIMIT 1;
  IF v_sender.id IS NOT NULL THEN v_source := 'event_mapping';
  ELSE
    SELECT * INTO v_sender FROM public.communication_hub_sender_profile
     WHERE is_default = true AND is_enabled = true LIMIT 1;
    IF v_sender.id IS NOT NULL THEN v_source := 'system_default'; END IF;
  END IF;
  IF v_sender.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'source', 'none', 'reason', 'no_sender_resolved');
  END IF;
  RETURN jsonb_build_object(
    'ok', true, 'source', v_source,
    'sender_profile_id', v_sender.id,
    'from_email', v_sender.from_email,
    'from_display_name', v_sender.display_name,
    'reply_to_email', v_sender.reply_to_email,
    'is_enabled', v_sender.is_enabled,
    'provider_identity_status', v_sender.provider_identity_status,
    'domain_verified', v_sender.domain_verified,
    'audience_type', v_sender.audience_type,
    'sender_category', v_sender.sender_category
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_comm_hub_sender_for_event(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_comm_hub_sender_for_event(text,text,text) TO authenticated, service_role;
