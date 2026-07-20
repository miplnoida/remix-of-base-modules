
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_operating_mode') THEN
    CREATE TYPE public.communication_operating_mode AS ENUM (
      'DRY_RUN','CONTROLLED_LIVE','MANUAL_PRODUCTION','AUTOMATED_PRODUCTION','EMERGENCY_STOP'
    );
  END IF;
END$$;

ALTER TABLE public.communication_hub_control_settings
  ADD COLUMN IF NOT EXISTS singleton_guard text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS operating_mode public.communication_operating_mode NOT NULL DEFAULT 'CONTROLLED_LIVE',
  ADD COLUMN IF NOT EXISTS previous_operating_mode public.communication_operating_mode,
  ADD COLUMN IF NOT EXISTS mode_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS mode_changed_by uuid,
  ADD COLUMN IF NOT EXISTS mode_change_reason text,
  ADD COLUMN IF NOT EXISTS configuration_version bigint NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='communication_hub_control_settings_singleton_key') THEN
    ALTER TABLE public.communication_hub_control_settings
      ADD CONSTRAINT communication_hub_control_settings_singleton_key UNIQUE (singleton_guard);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='communication_hub_control_settings_singleton_check') THEN
    ALTER TABLE public.communication_hub_control_settings
      ADD CONSTRAINT communication_hub_control_settings_singleton_check CHECK (singleton_guard = 'primary');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.communication_hub_operating_mode_audit (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_settings_id   uuid NOT NULL,
  previous_mode         public.communication_operating_mode,
  new_mode              public.communication_operating_mode NOT NULL,
  actor                 uuid,
  reason                text,
  changed_at            timestamptz NOT NULL DEFAULT now(),
  configuration_version bigint NOT NULL,
  settings_snapshot     jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.communication_hub_operating_mode_audit TO authenticated;
GRANT ALL ON public.communication_hub_operating_mode_audit TO service_role;

ALTER TABLE public.communication_hub_operating_mode_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='communication_hub_operating_mode_audit'
      AND policyname='comm_hub_mode_audit_read_admin'
  ) THEN
    CREATE POLICY comm_hub_mode_audit_read_admin
      ON public.communication_hub_operating_mode_audit
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'Admin'::public.app_role));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS communication_hub_operating_mode_audit_changed_at_idx
  ON public.communication_hub_operating_mode_audit (changed_at DESC);

CREATE OR REPLACE FUNCTION public.get_communication_operating_mode()
RETURNS TABLE (
  id uuid, singleton_guard text,
  operating_mode public.communication_operating_mode,
  previous_operating_mode public.communication_operating_mode,
  mode_changed_at timestamptz, mode_changed_by uuid, mode_change_reason text,
  configuration_version bigint,
  dispatch_enabled boolean, dry_run_only boolean,
  email_live_enabled boolean, sms_live_enabled boolean,
  whatsapp_live_enabled boolean, print_enabled boolean, letter_enabled boolean,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.singleton_guard, s.operating_mode, s.previous_operating_mode,
         s.mode_changed_at, s.mode_changed_by, s.mode_change_reason,
         s.configuration_version, s.dispatch_enabled, s.dry_run_only,
         s.email_live_enabled, s.sms_live_enabled, s.whatsapp_live_enabled,
         s.print_enabled, s.letter_enabled, s.updated_at
  FROM public.communication_hub_control_settings s
  WHERE s.singleton_guard = 'primary';
$$;

GRANT EXECUTE ON FUNCTION public.get_communication_operating_mode() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_communication_operating_mode(
  p_new_mode text, p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_new_mode public.communication_operating_mode;
  v_row public.communication_hub_control_settings%ROWTYPE;
  v_prev_mode public.communication_operating_mode;
  v_next_version bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';
  END IF;
  IF NOT public.has_role(v_actor, 'Admin'::public.app_role) THEN
    RAISE EXCEPTION 'admin role required to change operating mode' USING ERRCODE='42501';
  END IF;

  BEGIN
    v_new_mode := p_new_mode::public.communication_operating_mode;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid operating mode: %', p_new_mode USING ERRCODE='22023';
  END;

  IF v_new_mode = 'AUTOMATED_PRODUCTION' THEN
    RAISE EXCEPTION 'AUTOMATED_PRODUCTION is not available' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_row FROM public.communication_hub_control_settings
    WHERE singleton_guard='primary' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'communication hub settings singleton is missing' USING ERRCODE='P0002';
  END IF;

  v_prev_mode := v_row.operating_mode;
  v_next_version := v_row.configuration_version + 1;

  UPDATE public.communication_hub_control_settings
     SET operating_mode = v_new_mode,
         previous_operating_mode = v_prev_mode,
         mode_changed_at = now(),
         mode_changed_by = v_actor,
         mode_change_reason = p_reason,
         configuration_version = v_next_version,
         dispatch_enabled = CASE v_new_mode WHEN 'EMERGENCY_STOP' THEN false ELSE true END,
         dry_run_only = CASE v_new_mode
                          WHEN 'DRY_RUN' THEN true
                          WHEN 'EMERGENCY_STOP' THEN true
                          ELSE false END,
         updated_at = now(),
         updated_by = v_actor
   WHERE singleton_guard='primary';

  INSERT INTO public.communication_hub_operating_mode_audit (
    control_settings_id, previous_mode, new_mode, actor, reason,
    configuration_version, settings_snapshot
  ) VALUES (
    v_row.id, v_prev_mode, v_new_mode, v_actor, p_reason, v_next_version,
    jsonb_build_object(
      'previous_mode', v_prev_mode, 'new_mode', v_new_mode,
      'dispatch_enabled_before', v_row.dispatch_enabled,
      'dry_run_only_before', v_row.dry_run_only,
      'allowed_email_addresses', v_row.allowed_email_addresses,
      'allowed_email_domains', v_row.allowed_email_domains,
      'recipient_release_mode', v_row.recipient_release_mode
    )
  );

  RETURN jsonb_build_object(
    'previous_mode', v_prev_mode, 'new_mode', v_new_mode,
    'configuration_version', v_next_version,
    'changed_at', now(), 'actor', v_actor, 'reason', p_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_communication_operating_mode(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.set_communication_operating_mode(text, text) TO authenticated;
