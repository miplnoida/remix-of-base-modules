
-- ============================================================
-- EPIC-06C Phase 1 — Judicial foundations
-- ============================================================

-- 1) SLA policy ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_sla_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_code text NOT NULL UNIQUE,
  scope_label text NOT NULL,
  hours integer NOT NULL DEFAULT 48,
  reminder_frequency_hours integer,
  escalation_level_1_hours integer,
  escalation_level_2_hours integer,
  active boolean NOT NULL DEFAULT true,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_sla_policy TO authenticated;
GRANT ALL ON public.lg_sla_policy TO service_role;

INSERT INTO public.lg_sla_policy (scope_code, scope_label, hours, reminder_frequency_hours, escalation_level_1_hours, escalation_level_2_hours) VALUES
  ('ORDER_REVIEW',        'Order Review',           48, 24, 72, 168),
  ('APPEAL_FILING',       'Appeal Filing Window',   336, 72, 168, 336),
  ('COMPLIANCE_REVIEW',   'Compliance Review',      72, 24, 96, 168),
  ('COMPLIANCE_FOLLOWUP', 'Compliance Follow-up',   168, 48, 240, 336),
  ('BREACH_REVIEW',       'Breach Review',          24, 12, 48, 96),
  ('ENFORCEMENT_PREP',    'Enforcement Preparation',72, 24, 120, 240),
  ('ORDER_CLOSURE',       'Order Closure',          120, 48, 168, 336),
  ('SETTLEMENT_REVIEW',   'Settlement Review',      96, 24, 168, 336)
ON CONFLICT (scope_code) DO NOTHING;

-- 2) Notification rules ---------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_notification_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code text NOT NULL UNIQUE,
  event_label text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  doc_queue boolean NOT NULL DEFAULT false,
  task_queue boolean NOT NULL DEFAULT false,
  template_code text,
  recipients_json jsonb NOT NULL DEFAULT '{"roles":["Handler","Reviewer"]}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_notification_rule TO authenticated;
GRANT ALL ON public.lg_notification_rule TO service_role;

INSERT INTO public.lg_notification_rule (event_code, event_label, in_app, email, doc_queue, task_queue, template_code) VALUES
  ('ORDER_CREATED',         'Order Created',          true, false, true,  true,  'LG_COURT_ORDER'),
  ('ORDER_GRANTED',         'Order Granted',          true, false, true,  true,  'LG_JUDGMENT'),
  ('COMPLIANCE_DUE',        'Compliance Due',         true, false, false, true,  'LG_COMPLIANCE_NOTICE'),
  ('COMPLIANCE_BREACHED',   'Compliance Breached',    true, false, true,  true,  'LG_BREACH_NOTICE'),
  ('APPEAL_FILED',          'Appeal Filed',           true, false, true,  true,  'LG_APPEAL_NOTICE'),
  ('APPEAL_DECISION',       'Appeal Decision',        true, false, true,  false, NULL),
  ('ENFORCEMENT_STARTED',   'Enforcement Started',    true, false, true,  true,  'LG_ENFORCEMENT_NOTICE'),
  ('ENFORCEMENT_COMPLETED', 'Enforcement Completed',  true, false, false, false, NULL),
  ('RECOVERY_COMPLETED',    'Recovery Completed',     true, false, true,  false, 'LG_RECOVERY_CLOSURE'),
  ('MATTER_CLOSED',         'Matter Closed',          true, false, true,  false, NULL)
ON CONFLICT (event_code) DO NOTHING;

-- 3) Document template registry -------------------------------
CREATE TABLE IF NOT EXISTS public.lg_document_template_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text NOT NULL UNIQUE,
  template_label text NOT NULL,
  core_template_id uuid,
  configured boolean NOT NULL DEFAULT false,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_document_template_registry TO authenticated;
GRANT ALL ON public.lg_document_template_registry TO service_role;

INSERT INTO public.lg_document_template_registry (template_code, template_label) VALUES
  ('LG_COURT_ORDER',        'Court Order'),
  ('LG_JUDGMENT',           'Judgment'),
  ('LG_COMPLIANCE_NOTICE',  'Compliance Notice'),
  ('LG_BREACH_NOTICE',      'Breach Notice'),
  ('LG_APPEAL_NOTICE',      'Appeal Notice'),
  ('LG_ENFORCEMENT_NOTICE', 'Enforcement Notice'),
  ('LG_SETTLEMENT_LETTER',  'Settlement Letter'),
  ('LG_RECOVERY_CLOSURE',   'Recovery Closure Letter')
ON CONFLICT (template_code) DO NOTHING;

-- 4) Timeline dedupe ------------------------------------------
-- Guarantee (case, entity, event, occurred_at) uniqueness so
-- routed judicial events cannot double-post from multiple call sites.
DO $$
DECLARE
  has_entity_type boolean;
  has_entity_id   boolean;
  has_event_code  boolean;
  has_occurred_at boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lg_case_activity' AND column_name='entity_type') INTO has_entity_type;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lg_case_activity' AND column_name='entity_id')   INTO has_entity_id;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lg_case_activity' AND column_name='event_code')  INTO has_event_code;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='lg_case_activity' AND column_name='occurred_at') INTO has_occurred_at;

  IF NOT has_entity_type THEN EXECUTE 'ALTER TABLE public.lg_case_activity ADD COLUMN entity_type text'; END IF;
  IF NOT has_entity_id   THEN EXECUTE 'ALTER TABLE public.lg_case_activity ADD COLUMN entity_id uuid'; END IF;
  IF NOT has_event_code  THEN EXECUTE 'ALTER TABLE public.lg_case_activity ADD COLUMN event_code text'; END IF;
  IF NOT has_occurred_at THEN EXECUTE 'ALTER TABLE public.lg_case_activity ADD COLUMN occurred_at timestamptz NOT NULL DEFAULT now()'; END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS lg_case_activity_dedupe_idx
  ON public.lg_case_activity (lg_case_id, entity_type, entity_id, event_code, occurred_at)
  WHERE event_code IS NOT NULL;

-- 5) updated_at trigger helper --------------------------------
CREATE OR REPLACE FUNCTION public.lg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_lg_sla_policy_updated_at ON public.lg_sla_policy;
CREATE TRIGGER trg_lg_sla_policy_updated_at BEFORE UPDATE ON public.lg_sla_policy
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

DROP TRIGGER IF EXISTS trg_lg_notification_rule_updated_at ON public.lg_notification_rule;
CREATE TRIGGER trg_lg_notification_rule_updated_at BEFORE UPDATE ON public.lg_notification_rule
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

DROP TRIGGER IF EXISTS trg_lg_document_template_registry_updated_at ON public.lg_document_template_registry;
CREATE TRIGGER trg_lg_document_template_registry_updated_at BEFORE UPDATE ON public.lg_document_template_registry
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();
