
UPDATE public.communication_hub_control_settings
   SET singleton_guard = 'primary'
 WHERE singleton_guard IS DISTINCT FROM 'primary';

ALTER TABLE public.communication_hub_control_settings
  ALTER COLUMN singleton_guard SET NOT NULL,
  ALTER COLUMN singleton_guard SET DEFAULT 'primary';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_hub_control_settings_singleton_guard_chk') THEN
    ALTER TABLE public.communication_hub_control_settings
      ADD CONSTRAINT communication_hub_control_settings_singleton_guard_chk
      CHECK (singleton_guard = 'primary');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_communication_operating_mode(
  p_new_mode public.communication_operating_mode,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prev public.communication_operating_mode;
  v_row  public.communication_hub_control_settings%ROWTYPE;
  v_uid  uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF p_new_mode = 'AUTOMATED_PRODUCTION'::public.communication_operating_mode THEN
    RAISE EXCEPTION 'operating mode AUTOMATED_PRODUCTION is not available';
  END IF;
  SELECT public.has_role(v_uid, 'Admin'::public.app_role) INTO v_is_admin;
  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'only administrators can change the communication operating mode';
  END IF;
  SELECT * INTO v_row FROM public.communication_hub_control_settings
    WHERE singleton_guard = 'primary' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'communication hub singleton missing'; END IF;
  v_prev := v_row.operating_mode;

  UPDATE public.communication_hub_control_settings
     SET operating_mode          = p_new_mode,
         previous_operating_mode = v_prev,
         mode_changed_at         = now(),
         mode_changed_by         = v_uid,
         mode_change_reason      = p_reason,
         configuration_version   = COALESCE(configuration_version, 0) + 1,
         dispatch_enabled        = CASE WHEN p_new_mode = 'EMERGENCY_STOP' THEN false ELSE true END,
         dry_run_only            = CASE WHEN p_new_mode IN ('DRY_RUN','EMERGENCY_STOP') THEN true ELSE false END,
         email_live_enabled      = CASE WHEN p_new_mode IN ('CONTROLLED_LIVE','MANUAL_PRODUCTION') THEN true ELSE false END,
         cron_desired_enabled    = false,
         sms_live_enabled        = false,
         whatsapp_live_enabled   = false,
         updated_by              = v_uid
   WHERE singleton_guard = 'primary'
   RETURNING * INTO v_row;

  INSERT INTO public.communication_hub_operating_mode_audit(
    previous_mode, new_mode, reason, actor, configuration_version, snapshot
  ) VALUES (v_prev, p_new_mode, p_reason, v_uid, v_row.configuration_version, to_jsonb(v_row));

  RETURN jsonb_build_object(
    'previous_mode', v_prev, 'new_mode', v_row.operating_mode,
    'configuration_version', v_row.configuration_version,
    'changed_at', v_row.mode_changed_at, 'actor', v_uid, 'reason', p_reason);
END $$;

UPDATE public.communication_hub_control_settings
   SET dispatch_enabled     = CASE WHEN operating_mode = 'EMERGENCY_STOP' THEN false ELSE true END,
       dry_run_only         = CASE WHEN operating_mode IN ('DRY_RUN','EMERGENCY_STOP') THEN true ELSE false END,
       email_live_enabled   = CASE WHEN operating_mode IN ('CONTROLLED_LIVE','MANUAL_PRODUCTION') THEN true ELSE false END,
       cron_desired_enabled = false,
       sms_live_enabled     = false,
       whatsapp_live_enabled= false
 WHERE singleton_guard = 'primary';

DO $$ BEGIN
  CREATE TYPE public.communication_recipient_policy_mode AS ENUM (
    'SINGLE_CONFIGURED_RECIPIENT','APPROVED_NAMED_RECIPIENTS','APPROVED_DOMAINS',
    'CONTROLLED_EXTERNAL_RECIPIENTS','DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.communication_hub_recipient_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_guard text NOT NULL DEFAULT 'primary' CHECK (singleton_guard = 'primary'),
  active_mode public.communication_recipient_policy_mode NOT NULL DEFAULT 'SINGLE_CONFIGURED_RECIPIENT',
  single_configured_address text,
  approved_named_addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_domains jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_recipients_per_request integer NOT NULL DEFAULT 1,
  max_to_recipients integer NOT NULL DEFAULT 1,
  cc_allowed boolean NOT NULL DEFAULT false,
  max_cc_recipients integer NOT NULL DEFAULT 0,
  bcc_allowed boolean NOT NULL DEFAULT false,
  max_bcc_recipients integer NOT NULL DEFAULT 0,
  external_addresses_permitted boolean NOT NULL DEFAULT false,
  subdomains_permitted boolean NOT NULL DEFAULT false,
  policy_version integer NOT NULL DEFAULT 1,
  configuration_version integer NOT NULL DEFAULT 1,
  change_reason text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT communication_hub_recipient_policy_singleton_uk UNIQUE (singleton_guard),
  CONSTRAINT recipient_policy_limits_chk CHECK (
    max_recipients_per_request BETWEEN 1 AND 200
    AND max_to_recipients BETWEEN 1 AND max_recipients_per_request
    AND max_cc_recipients >= 0 AND max_bcc_recipients >= 0
    AND (cc_allowed OR max_cc_recipients = 0)
    AND (bcc_allowed OR max_bcc_recipients = 0)
  )
);

GRANT SELECT ON public.communication_hub_recipient_policy TO authenticated;
GRANT ALL ON public.communication_hub_recipient_policy TO service_role;
ALTER TABLE public.communication_hub_recipient_policy ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "recipient_policy_admin_read" ON public.communication_hub_recipient_policy
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'Admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.communication_hub_recipient_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id uuid NOT NULL REFERENCES public.communication_hub_recipient_policy(id) ON DELETE CASCADE,
  changed_field text NOT NULL,
  old_value jsonb, new_value jsonb, reason text,
  changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now(),
  policy_version integer NOT NULL, configuration_version integer NOT NULL
);
GRANT SELECT ON public.communication_hub_recipient_policy_audit TO authenticated;
GRANT ALL ON public.communication_hub_recipient_policy_audit TO service_role;
ALTER TABLE public.communication_hub_recipient_policy_audit ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "recipient_policy_audit_admin_read" ON public.communication_hub_recipient_policy_audit
    FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'Admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.communication_hub_recipient_policy(
  singleton_guard, active_mode, max_recipients_per_request, max_to_recipients,
  cc_allowed, max_cc_recipients, bcc_allowed, max_bcc_recipients,
  external_addresses_permitted, subdomains_permitted, change_reason
) VALUES (
  'primary','SINGLE_CONFIGURED_RECIPIENT',1,1,false,0,false,0,false,false,
  'CH-SIMPLE-P2 initial canonical recipient policy'
) ON CONFLICT (singleton_guard) DO NOTHING;

CREATE OR REPLACE FUNCTION public.tg_recipient_policy_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS communication_hub_recipient_policy_touch
  ON public.communication_hub_recipient_policy;
CREATE TRIGGER communication_hub_recipient_policy_touch
  BEFORE UPDATE ON public.communication_hub_recipient_policy
  FOR EACH ROW EXECUTE FUNCTION public.tg_recipient_policy_touch();

CREATE OR REPLACE FUNCTION public.evaluate_comm_hub_recipient_policy(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_policy   public.communication_hub_recipient_policy%ROWTYPE;
  v_settings public.communication_hub_control_settings%ROWTYPE;
  v_to       text[] := ARRAY[]::text[];
  v_cc       text[] := ARRAY[]::text[];
  v_bcc      text[] := ARRAY[]::text[];
  v_matched  jsonb := '[]'::jsonb;
  v_blocked  jsonb := '[]'::jsonb;
  v_matched_by jsonb := '{}'::jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_norm text; v_dom text;
  v_ok boolean; v_reason text;
  e text; seen jsonb := '{}'::jsonb;
  total integer; event_max integer; effective_max integer;
BEGIN
  SELECT * INTO v_policy FROM public.communication_hub_recipient_policy WHERE singleton_guard = 'primary';
  SELECT * INTO v_settings FROM public.communication_hub_control_settings WHERE singleton_guard = 'primary';

  IF jsonb_typeof(p_payload -> 'to') = 'array' THEN
    SELECT COALESCE(array_agg(lower(btrim(x))), ARRAY[]::text[])
      INTO v_to FROM jsonb_array_elements_text(p_payload -> 'to') AS x;
  END IF;
  IF jsonb_typeof(p_payload -> 'cc') = 'array' THEN
    SELECT COALESCE(array_agg(lower(btrim(x))), ARRAY[]::text[])
      INTO v_cc FROM jsonb_array_elements_text(p_payload -> 'cc') AS x;
  END IF;
  IF jsonb_typeof(p_payload -> 'bcc') = 'array' THEN
    SELECT COALESCE(array_agg(lower(btrim(x))), ARRAY[]::text[])
      INTO v_bcc FROM jsonb_array_elements_text(p_payload -> 'bcc') AS x;
  END IF;

  IF NOT v_policy.cc_allowed AND COALESCE(array_length(v_cc,1),0) > 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','cc_not_allowed','message','CC recipients are not permitted');
  END IF;
  IF NOT v_policy.bcc_allowed AND COALESCE(array_length(v_bcc,1),0) > 0 THEN
    v_blockers := v_blockers || jsonb_build_object('code','bcc_not_allowed','message','BCC recipients are not permitted');
  END IF;

  IF COALESCE(array_length(v_to,1),0) > v_policy.max_to_recipients THEN
    v_blockers := v_blockers || jsonb_build_object('code','to_limit_exceeded','limit',v_policy.max_to_recipients);
  END IF;
  IF v_policy.cc_allowed AND COALESCE(array_length(v_cc,1),0) > v_policy.max_cc_recipients THEN
    v_blockers := v_blockers || jsonb_build_object('code','cc_limit_exceeded','limit',v_policy.max_cc_recipients);
  END IF;
  IF v_policy.bcc_allowed AND COALESCE(array_length(v_bcc,1),0) > v_policy.max_bcc_recipients THEN
    v_blockers := v_blockers || jsonb_build_object('code','bcc_limit_exceeded','limit',v_policy.max_bcc_recipients);
  END IF;

  total := COALESCE(array_length(v_to,1),0) + COALESCE(array_length(v_cc,1),0) + COALESCE(array_length(v_bcc,1),0);
  event_max := NULLIF((p_payload ->> 'event_max_recipients'), '')::int;
  effective_max := LEAST(v_policy.max_recipients_per_request, COALESCE(event_max, 200), 200);
  IF total > effective_max THEN
    v_blockers := v_blockers || jsonb_build_object(
      'code','total_recipient_limit_exceeded','limit',effective_max,
      'source', CASE
        WHEN effective_max = v_policy.max_recipients_per_request THEN 'recipient_policy'
        WHEN effective_max = event_max THEN 'event_policy'
        ELSE 'technical_ceiling' END);
  END IF;

  FOR e IN SELECT unnest(v_to || v_cc || v_bcc) LOOP
    IF (seen ? e) THEN
      v_warnings := v_warnings || jsonb_build_object('code','duplicate_recipient','address',e);
    ELSE
      seen := seen || jsonb_build_object(e, true);
    END IF;
  END LOOP;

  IF v_settings.operating_mode = 'EMERGENCY_STOP' THEN
    v_blockers := v_blockers || jsonb_build_object('code','emergency_stop_active');
  END IF;

  IF v_policy.active_mode = 'CONTROLLED_EXTERNAL_RECIPIENTS' THEN
    v_blockers := v_blockers || jsonb_build_object('code','controlled_external_recipients_not_certified');
  END IF;

  FOR e IN SELECT DISTINCT unnest(v_to || v_cc || v_bcc) LOOP
    v_norm := e; v_ok := false; v_reason := NULL;
    IF v_norm IS NULL OR v_norm = '' OR v_norm NOT LIKE '_%@_%._%' THEN
      v_blocked := v_blocked || to_jsonb(v_norm);
      v_blockers := v_blockers || jsonb_build_object('code','invalid_address','address',v_norm);
      CONTINUE;
    END IF;
    v_dom := split_part(v_norm, '@', 2);

    IF v_policy.active_mode = 'DISABLED' THEN
      v_reason := 'disabled_mode';
    ELSIF v_policy.active_mode = 'SINGLE_CONFIGURED_RECIPIENT' THEN
      IF v_policy.single_configured_address IS NOT NULL
         AND lower(btrim(v_policy.single_configured_address)) = v_norm THEN
        v_ok := true; v_matched_by := v_matched_by || jsonb_build_object(v_norm,'single_configured_address');
      ELSE v_reason := 'not_single_configured_address'; END IF;
    ELSIF v_policy.active_mode = 'APPROVED_NAMED_RECIPIENTS' THEN
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_policy.approved_named_addresses) x
        WHERE COALESCE((x->>'active')::boolean, true)
          AND lower(btrim(x->>'address')) = v_norm
      ) THEN v_ok := true; v_matched_by := v_matched_by || jsonb_build_object(v_norm,'approved_named_address');
      ELSE v_reason := 'not_in_approved_named_addresses'; END IF;
    ELSIF v_policy.active_mode = 'APPROVED_DOMAINS' THEN
      IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_policy.approved_domains) x
        WHERE COALESCE((x->>'active')::boolean, true)
          AND ( lower(btrim(x->>'domain')) = v_dom
             OR (v_policy.subdomains_permitted AND v_dom LIKE ('%.' || lower(btrim(x->>'domain')))))
      ) THEN v_ok := true; v_matched_by := v_matched_by || jsonb_build_object(v_norm,'approved_domain');
      ELSE v_reason := 'domain_not_approved'; END IF;
    END IF;

    IF v_ok THEN v_matched := v_matched || to_jsonb(v_norm);
    ELSE
      v_blocked := v_blocked || to_jsonb(v_norm);
      v_blockers := v_blockers || jsonb_build_object('code','recipient_not_authorised','address',v_norm,'reason',v_reason);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'allowed', jsonb_array_length(v_blockers) = 0,
    'release_mode', v_policy.active_mode,
    'matched_recipients', v_matched,
    'blocked_recipients', v_blocked,
    'matched_by', v_matched_by,
    'blockers', v_blockers,
    'warnings', v_warnings,
    'evaluated_at', now(),
    'configuration_version', v_policy.configuration_version,
    'policy_version', v_policy.policy_version
  );
END $$;

GRANT EXECUTE ON FUNCTION public.evaluate_comm_hub_recipient_policy(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_communication_recipient_policy()
RETURNS public.communication_hub_recipient_policy
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.communication_hub_recipient_policy WHERE singleton_guard = 'primary';
$$;
GRANT EXECUTE ON FUNCTION public.get_communication_recipient_policy() TO authenticated, service_role;
