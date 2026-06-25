
-- =========================================================
-- Legal Referrals SLA + Atomic Request Info + Realtime
-- =========================================================

-- 1. SLA Rule table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_referral_sla_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module text NOT NULL CHECK (source_module IN ('BENEFITS','COMPLIANCE','ALL')),
  request_type  text NOT NULL CHECK (request_type IN ('INFO_REQUEST','DOCUMENT_REQUEST','CLARIFICATION','APPROVAL','ALL')),
  default_due_days        integer NOT NULL DEFAULT 5,
  reminder_before_days    integer NOT NULL DEFAULT 1,
  escalation_after_days   integer NOT NULL DEFAULT 2,
  escalation_workbasket   text,
  escalation_team         text,
  notify_original_submitter boolean NOT NULL DEFAULT true,
  notify_supervisor         boolean NOT NULL DEFAULT true,
  email_enabled             boolean NOT NULL DEFAULT true,
  active                    boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_module, request_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_referral_sla_rule TO authenticated;
GRANT ALL ON public.legal_referral_sla_rule TO service_role;

-- 2. SLA Event table ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_referral_sla_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  info_request_id uuid NOT NULL REFERENCES public.legal_referral_info_request(id) ON DELETE CASCADE,
  legal_referral_id uuid NOT NULL REFERENCES public.legal_referral(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('DUE_SOON','OVERDUE','ESCALATED','REMINDED','RESET')),
  prior_status text,
  new_status   text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lrse_req ON public.legal_referral_sla_event(info_request_id, occurred_at DESC);
GRANT SELECT, INSERT ON public.legal_referral_sla_event TO authenticated;
GRANT ALL ON public.legal_referral_sla_event TO service_role;

-- 3. Extend info_request with SLA columns --------------------------
ALTER TABLE public.legal_referral_info_request
  ADD COLUMN IF NOT EXISTS reminder_at  timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_status   text NOT NULL DEFAULT 'ON_TIME'
    CHECK (sla_status IN ('ON_TIME','DUE_SOON','OVERDUE','ESCALATED','COMPLETED')),
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_to_workbasket text,
  ADD COLUMN IF NOT EXISTS escalated_to_team text,
  ADD COLUMN IF NOT EXISTS sla_rule_id uuid REFERENCES public.legal_referral_sla_rule(id),
  ADD COLUMN IF NOT EXISTS due_date_override_by text,
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'INFO_REQUEST';

-- Backfill due_date if missing (created_at + 5 days)
UPDATE public.legal_referral_info_request
SET due_date = (created_at::date + INTERVAL '5 days')::date
WHERE due_date IS NULL;

-- 4. Seed default SLA rules ----------------------------------------
INSERT INTO public.legal_referral_sla_rule
  (source_module, request_type, default_due_days, reminder_before_days, escalation_after_days, notes, created_by)
VALUES
  ('ALL','INFO_REQUEST',5,1,2,'SEED- default info request SLA','SYSTEM'),
  ('ALL','DOCUMENT_REQUEST',7,2,3,'SEED- default document request SLA','SYSTEM'),
  ('ALL','CLARIFICATION',3,1,1,'SEED- default clarification SLA','SYSTEM'),
  ('ALL','APPROVAL',2,1,1,'SEED- default approval SLA','SYSTEM')
ON CONFLICT (source_module, request_type) DO NOTHING;

-- 5. Helper: resolve SLA rule ---------------------------------------
CREATE OR REPLACE FUNCTION public.legal_resolve_sla_rule(
  p_source_module text,
  p_request_type  text
) RETURNS public.legal_referral_sla_rule
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rule public.legal_referral_sla_rule;
BEGIN
  SELECT * INTO v_rule FROM public.legal_referral_sla_rule
   WHERE active = true
     AND (source_module = p_source_module OR source_module = 'ALL')
     AND (request_type  = p_request_type  OR request_type  = 'ALL')
   ORDER BY (source_module = p_source_module) DESC,
            (request_type  = p_request_type ) DESC,
            priority ASC, created_at ASC
   LIMIT 1;
  RETURN v_rule;
END $$;

-- 6. Atomic Request Info RPC ---------------------------------------
CREATE OR REPLACE FUNCTION public.lr_request_info_atomic(
  p_legal_referral_id uuid,
  p_requested_by      text,
  p_requested_to_module text,
  p_request_reason    text,
  p_requested_items   jsonb DEFAULT '[]'::jsonb,
  p_requested_to_workbasket text DEFAULT NULL,
  p_requested_to_team text DEFAULT NULL,
  p_requested_to_user text DEFAULT NULL,
  p_request_type      text DEFAULT 'INFO_REQUEST',
  p_due_date_override date DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referral public.legal_referral;
  v_rule     public.legal_referral_sla_rule;
  v_request_no text;
  v_request_id uuid;
  v_task_id    uuid;
  v_due_date   date;
  v_reminder_at timestamptz;
  v_escalation_at timestamptz;
BEGIN
  SELECT * INTO v_referral FROM public.legal_referral WHERE id = p_legal_referral_id FOR UPDATE;
  IF v_referral.id IS NULL THEN
    RAISE EXCEPTION 'Legal referral % not found', p_legal_referral_id;
  END IF;

  v_rule := public.legal_resolve_sla_rule(p_requested_to_module, p_request_type);

  IF p_due_date_override IS NOT NULL THEN
    v_due_date := p_due_date_override;
  ELSIF v_rule.id IS NOT NULL THEN
    v_due_date := (now()::date + (v_rule.default_due_days || ' days')::interval)::date;
  ELSE
    v_due_date := (now()::date + INTERVAL '5 days')::date;
  END IF;

  IF v_rule.id IS NOT NULL THEN
    v_reminder_at   := (v_due_date::timestamptz - (v_rule.reminder_before_days || ' days')::interval);
    v_escalation_at := (v_due_date::timestamptz + (v_rule.escalation_after_days || ' days')::interval);
  END IF;

  v_request_no := 'IR-' || to_char(now(),'YYYYMMDD') || '-' || lpad(floor(random()*100000)::text,5,'0');

  INSERT INTO public.legal_referral_info_request(
    legal_referral_id, request_no, requested_by, requested_to_module,
    requested_to_workbasket_code, requested_to_team_code, requested_to_user,
    request_reason, requested_items, due_date, status,
    request_type, sla_rule_id, reminder_at, escalation_at, sla_status
  ) VALUES (
    p_legal_referral_id, v_request_no, p_requested_by, p_requested_to_module,
    p_requested_to_workbasket, p_requested_to_team, p_requested_to_user,
    p_request_reason, COALESCE(p_requested_items,'[]'::jsonb), v_due_date, 'PENDING_SOURCE_RESPONSE',
    p_request_type, v_rule.id, v_reminder_at, v_escalation_at, 'ON_TIME'
  ) RETURNING id INTO v_request_id;

  -- Source task
  INSERT INTO public.legal_referral_source_task(
    legal_referral_id, info_request_id, task_type, source_module,
    assigned_workbasket_code, assigned_team_code, assigned_user,
    due_date, status
  ) VALUES (
    p_legal_referral_id, v_request_id, 'LEGAL_INFO_REQUEST', p_requested_to_module,
    p_requested_to_workbasket, p_requested_to_team, p_requested_to_user,
    v_due_date, 'OPEN'
  ) RETURNING id INTO v_task_id;

  -- Referral status
  UPDATE public.legal_referral
     SET status = 'INFO_REQUESTED', last_status_at = now(), updated_at = now()
   WHERE id = p_legal_referral_id;

  -- Audit
  INSERT INTO public.legal_referral_audit(legal_referral_id, info_request_id, event_type, actor, payload)
  VALUES (p_legal_referral_id, v_request_id, 'INFO_REQUESTED', p_requested_by,
          jsonb_build_object('request_no', v_request_no, 'due_date', v_due_date, 'task_id', v_task_id));

  -- Notification (best effort)
  BEGIN
    INSERT INTO public.in_app_notifications(user_id, title, message, type, link, metadata)
    VALUES (
      p_requested_to_user,
      'New Legal Information Request',
      'Legal has requested information for referral ' || v_referral.referral_no,
      'LEGAL_INFO_REQUEST',
      '/legal/referrals-workbench?tab=info-requested&id=' || v_request_id::text,
      jsonb_build_object('referral_id', p_legal_referral_id, 'request_id', v_request_id, 'due_date', v_due_date)
    );
  EXCEPTION WHEN OTHERS THEN
    -- non-blocking
    NULL;
  END;

  RETURN jsonb_build_object(
    'info_request_id', v_request_id,
    'source_task_id',  v_task_id,
    'request_no',      v_request_no,
    'due_date',        v_due_date,
    'sla_rule_id',     v_rule.id
  );
END $$;

GRANT EXECUTE ON FUNCTION public.lr_request_info_atomic(uuid,text,text,text,jsonb,text,text,text,text,date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.legal_resolve_sla_rule(text,text) TO authenticated, service_role;

-- 7. SLA processing function (called by cron) ----------------------
CREATE OR REPLACE FUNCTION public.legal_referral_process_sla()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_due_soon int := 0;
  v_overdue  int := 0;
  v_escalated int := 0;
  r record;
BEGIN
  -- DUE_SOON: reminder_at <= now < due_date and currently ON_TIME
  UPDATE public.legal_referral_info_request
     SET sla_status = 'DUE_SOON'
   WHERE status = 'PENDING_SOURCE_RESPONSE'
     AND sla_status = 'ON_TIME'
     AND reminder_at IS NOT NULL
     AND reminder_at <= now()
     AND (due_date IS NULL OR due_date >= now()::date);
  GET DIAGNOSTICS v_due_soon = ROW_COUNT;

  -- OVERDUE: past due_date, not yet escalated
  UPDATE public.legal_referral_info_request
     SET sla_status = 'OVERDUE'
   WHERE status = 'PENDING_SOURCE_RESPONSE'
     AND sla_status IN ('ON_TIME','DUE_SOON')
     AND due_date IS NOT NULL
     AND due_date < now()::date;
  GET DIAGNOSTICS v_overdue = ROW_COUNT;

  -- ESCALATE: past escalation_at
  FOR r IN
    SELECT ir.*, sr.escalation_workbasket, sr.escalation_team
      FROM public.legal_referral_info_request ir
      LEFT JOIN public.legal_referral_sla_rule sr ON sr.id = ir.sla_rule_id
     WHERE ir.status = 'PENDING_SOURCE_RESPONSE'
       AND ir.sla_status <> 'ESCALATED'
       AND ir.escalation_at IS NOT NULL
       AND ir.escalation_at <= now()
  LOOP
    UPDATE public.legal_referral_info_request
       SET sla_status='ESCALATED',
           escalated_at = now(),
           escalated_to_workbasket = COALESCE(r.escalation_workbasket, escalated_to_workbasket),
           escalated_to_team       = COALESCE(r.escalation_team, escalated_to_team)
     WHERE id = r.id;

    INSERT INTO public.legal_referral_sla_event(info_request_id, legal_referral_id, event_type, prior_status, new_status, actor, payload)
    VALUES (r.id, r.legal_referral_id, 'ESCALATED', r.sla_status, 'ESCALATED', 'SYSTEM',
            jsonb_build_object('escalation_workbasket', r.escalation_workbasket, 'escalation_team', r.escalation_team));

    v_escalated := v_escalated + 1;
  END LOOP;

  RETURN jsonb_build_object('due_soon', v_due_soon, 'overdue', v_overdue, 'escalated', v_escalated, 'ran_at', now());
END $$;
GRANT EXECUTE ON FUNCTION public.legal_referral_process_sla() TO authenticated, service_role;

-- 8. Enable Realtime ------------------------------------------------
DO $$ BEGIN
  PERFORM 1;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_referral; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_referral_info_request; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_referral_source_task; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.core_generated_document; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 9. updated_at triggers --------------------------------------------
CREATE OR REPLACE FUNCTION public.legal_sla_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_lr_sla_rule_touch ON public.legal_referral_sla_rule;
CREATE TRIGGER trg_lr_sla_rule_touch BEFORE UPDATE ON public.legal_referral_sla_rule
  FOR EACH ROW EXECUTE FUNCTION public.legal_sla_touch_updated_at();
