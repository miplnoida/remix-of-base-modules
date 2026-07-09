
CREATE TABLE IF NOT EXISTS public.communication_hub_event_live_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  event_code  text NOT NULL,
  status      text NOT NULL DEFAULT 'dry_run_only'
              CHECK (status IN ('disabled','dry_run_only','live_manual_only','live_cron_allowed')),
  risk_level  text NOT NULL DEFAULT 'low'
              CHECK (risk_level IN ('low','medium','high','sensitive')),
  reason      text,
  changed_by  uuid,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_code, event_code)
);

GRANT SELECT ON public.communication_hub_event_live_control TO authenticated;
GRANT ALL    ON public.communication_hub_event_live_control TO service_role;

ALTER TABLE public.communication_hub_event_live_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_live_control_read_admin"
  ON public.communication_hub_event_live_control
  FOR SELECT TO authenticated
  USING ( public.has_role(auth.uid(), 'Admin'::app_role) );

CREATE OR REPLACE FUNCTION public.tg_update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_event_live_control_updated_at
  ON public.communication_hub_event_live_control;
CREATE TRIGGER trg_event_live_control_updated_at
  BEFORE UPDATE ON public.communication_hub_event_live_control
  FOR EACH ROW EXECUTE FUNCTION public.tg_update_updated_at();

INSERT INTO public.communication_hub_event_live_control(
  module_code, event_code, status, risk_level, reason, changed_by
) VALUES (
  'COMM_HUB', 'ADMIN_TEST_NOTICE', 'dry_run_only', 'low',
  'Initial seed — internal admin test notice, safe default.',
  NULL
) ON CONFLICT (module_code, event_code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_event_live_status(
  p_module_code text, p_event_code text
) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status FROM public.communication_hub_event_live_control
   WHERE module_code = p_module_code AND event_code = p_event_code
   LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_event_live_status(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_event_live_control(
  p_module_code text,
  p_event_code  text,
  p_new_status  text,
  p_reason      text,
  p_risk_level  text,
  p_typed_confirmation text,
  p_actor_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_expected_typed text;
  v_prev_status text;
  v_prev_risk   text;
  v_prev_reason text;
  v_found boolean := false;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'set_event_live_control: actor required';
  END IF;
  IF NOT public.has_role(p_actor_user_id, 'Admin'::app_role) THEN
    RAISE EXCEPTION 'set_event_live_control: forbidden — admin only';
  END IF;
  IF p_new_status NOT IN ('disabled','dry_run_only','live_manual_only','live_cron_allowed') THEN
    RAISE EXCEPTION 'set_event_live_control: invalid status %', p_new_status;
  END IF;
  IF coalesce(trim(p_reason),'') = '' THEN
    RAISE EXCEPTION 'set_event_live_control: reason required';
  END IF;

  IF p_new_status = 'live_cron_allowed' THEN
    RAISE EXCEPTION 'set_event_live_control: live_cron_allowed is not permitted in this phase';
  END IF;
  IF p_new_status = 'live_manual_only'
     AND NOT (p_module_code = 'COMM_HUB' AND p_event_code = 'ADMIN_TEST_NOTICE') THEN
    RAISE EXCEPTION 'set_event_live_control: only COMM_HUB/ADMIN_TEST_NOTICE may be set to live_manual_only in this phase';
  END IF;

  IF p_new_status IN ('live_manual_only','live_cron_allowed') THEN
    v_expected_typed := 'ENABLE ' || p_new_status || ' FOR ' || p_module_code || '/' || p_event_code;
    IF p_typed_confirmation IS DISTINCT FROM v_expected_typed THEN
      RAISE EXCEPTION 'set_event_live_control: typed confirmation must equal "%"', v_expected_typed;
    END IF;
  END IF;

  SELECT status, risk_level, reason INTO v_prev_status, v_prev_risk, v_prev_reason
    FROM public.communication_hub_event_live_control
   WHERE module_code = p_module_code AND event_code = p_event_code LIMIT 1;
  v_found := FOUND;

  IF NOT v_found THEN
    INSERT INTO public.communication_hub_event_live_control(
      module_code, event_code, status, risk_level, reason, changed_by, changed_at
    ) VALUES (
      p_module_code, p_event_code, p_new_status,
      COALESCE(NULLIF(p_risk_level,''),'low'), p_reason, p_actor_user_id, now()
    );
  ELSE
    UPDATE public.communication_hub_event_live_control
       SET status = p_new_status,
           risk_level = COALESCE(NULLIF(p_risk_level,''), risk_level),
           reason = p_reason,
           changed_by = p_actor_user_id,
           changed_at = now()
     WHERE module_code = p_module_code AND event_code = p_event_code;
  END IF;

  INSERT INTO public.communication_hub_control_audit(
    setting_key, old_value, new_value, reason, changed_by, source
  ) VALUES (
    'event_live_control:' || p_module_code || '/' || p_event_code,
    CASE WHEN v_found THEN jsonb_build_object('status', v_prev_status, 'risk_level', v_prev_risk, 'reason', v_prev_reason)
         ELSE NULL END,
    jsonb_build_object('status', p_new_status, 'risk_level', COALESCE(NULLIF(p_risk_level,''),'low'), 'reason', p_reason),
    p_reason, p_actor_user_id, 'communication-hub-control-center'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'module_code', p_module_code, 'event_code', p_event_code,
    'previous_status', v_prev_status,
    'new_status', p_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_event_live_control(text,text,text,text,text,text,uuid)
  TO authenticated, service_role;
