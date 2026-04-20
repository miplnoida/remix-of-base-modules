-- Phase 1: Audit Communication Templates v2 — schema extensions, scheduling policies, structured actions, instance recurrence/dispatch fields, and back-compat data migration auto-classified by comm_type.

-- 3.1 Extend templates
ALTER TABLE public.ce_audit_communication_templates
  ADD COLUMN IF NOT EXISTS send_mode text NOT NULL DEFAULT 'MANUAL_ONLY'
    CHECK (send_mode IN ('MANUAL_ONLY','MANUAL_OR_SCHEDULED','AUTO_EVENT_DRIVEN','AUTO_TIME_DRIVEN')),
  ADD COLUMN IF NOT EXISTS merge_fields_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preview_sample_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_approval_before_send boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reschedule_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancel_on_status_change_json jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3.2 Structured actions table
CREATE TABLE IF NOT EXISTS public.ce_audit_communication_template_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.ce_audit_communication_templates(id) ON DELETE CASCADE,
  action_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, action_key)
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_template_actions_tpl
  ON public.ce_audit_communication_template_actions(template_id);

-- 3.3 Schedule policies (1:1 with template)
CREATE TABLE IF NOT EXISTS public.ce_audit_communication_schedule_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL UNIQUE REFERENCES public.ce_audit_communication_templates(id) ON DELETE CASCADE,
  trigger_mode text NOT NULL DEFAULT 'NONE'
    CHECK (trigger_mode IN ('NONE','EVENT','TIME_RELATIVE','EXACT_DATETIME')),
  trigger_event text,
  relative_to_field text,
  offset_days int,
  offset_hours int,
  exact_datetime timestamptz,
  recurrence_enabled boolean NOT NULL DEFAULT false,
  recurrence_interval_days int,
  recurrence_max_occurrences int,
  recurrence_stop_conditions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3.4 Extend communications (instances)
ALTER TABLE public.ce_audit_communications
  ADD COLUMN IF NOT EXISTS parent_communication_id uuid
    REFERENCES public.ce_audit_communications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_no int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_interval_days int,
  ADD COLUMN IF NOT EXISTS recurrence_max_occurrences int,
  ADD COLUMN IF NOT EXISTS recurrence_stop_conditions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dispatch_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_dispatch_error text,
  ADD COLUMN IF NOT EXISTS dispatch_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS materialized_by_policy_id uuid
    REFERENCES public.ce_audit_communication_schedule_policies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_due
  ON public.ce_audit_communications(scheduled_at)
  WHERE status='approved' AND sent_at IS NULL AND cancelled_at IS NULL;

-- Idempotency for materialized drafts
CREATE UNIQUE INDEX IF NOT EXISTS uq_ce_audit_comm_materialized
  ON public.ce_audit_communications(template_id, employer_id, inspection_id, occurrence_no, materialized_by_policy_id)
  WHERE materialized_by_policy_id IS NOT NULL;

-- Touch trigger for new tables
CREATE OR REPLACE FUNCTION public.fn_ce_audit_comm_v2_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ce_audit_comm_actions_touch ON public.ce_audit_communication_template_actions;
CREATE TRIGGER trg_ce_audit_comm_actions_touch
  BEFORE UPDATE ON public.ce_audit_communication_template_actions
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_v2_touch();

DROP TRIGGER IF EXISTS trg_ce_audit_comm_schedule_touch ON public.ce_audit_communication_schedule_policies;
CREATE TRIGGER trg_ce_audit_comm_schedule_touch
  BEFORE UPDATE ON public.ce_audit_communication_schedule_policies
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_v2_touch();

-- 3.5 Auto-classify existing templates by comm_type
UPDATE public.ce_audit_communication_templates
SET send_mode = CASE comm_type::text
  WHEN 'final_report'      THEN 'MANUAL_ONLY'
  WHEN 'violation_notice'  THEN 'MANUAL_ONLY'
  WHEN 'corrective_action' THEN 'MANUAL_ONLY'
  ELSE 'MANUAL_OR_SCHEDULED'
END;

-- Seed schedule policies (one per template)
INSERT INTO public.ce_audit_communication_schedule_policies
  (template_id, trigger_mode, trigger_event, relative_to_field, offset_days,
   recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences, recurrence_stop_conditions_json)
SELECT
  t.id,
  CASE t.comm_type::text
    WHEN 'audit_intimation'  THEN 'TIME_RELATIVE'
    WHEN 'books_required'    THEN 'TIME_RELATIVE'
    WHEN 'visit_reminder'    THEN 'TIME_RELATIVE'
    WHEN 'due_date_reminder' THEN 'TIME_RELATIVE'
    WHEN 'escalation_notice' THEN 'EVENT'
    ELSE 'NONE'
  END,
  CASE t.comm_type::text
    WHEN 'escalation_notice' THEN 'communication.no_response'
    ELSE NULL
  END,
  CASE t.comm_type::text
    WHEN 'audit_intimation'  THEN 'inspection.visit_date'
    WHEN 'books_required'    THEN 'inspection.visit_date'
    WHEN 'visit_reminder'    THEN 'inspection.visit_date'
    WHEN 'due_date_reminder' THEN 'case.due_date'
    ELSE NULL
  END,
  CASE t.comm_type::text
    WHEN 'audit_intimation'  THEN -7
    WHEN 'books_required'    THEN -5
    WHEN 'visit_reminder'    THEN -1
    WHEN 'due_date_reminder' THEN 0
    WHEN 'escalation_notice' THEN 7
    ELSE NULL
  END,
  CASE t.comm_type::text WHEN 'due_date_reminder' THEN true ELSE false END,
  CASE t.comm_type::text WHEN 'due_date_reminder' THEN 3 ELSE NULL END,
  CASE t.comm_type::text WHEN 'due_date_reminder' THEN 5 ELSE NULL END,
  CASE t.comm_type::text WHEN 'due_date_reminder' THEN '["acknowledged","employer_responded"]'::jsonb ELSE '[]'::jsonb END
FROM public.ce_audit_communication_templates t
ON CONFLICT (template_id) DO NOTHING;

-- Seed structured actions from legacy attachment_rule_json
INSERT INTO public.ce_audit_communication_template_actions (template_id, action_key, is_enabled, sort_order)
SELECT t.id, k.action_key, COALESCE((t.attachment_rule_json ->> k.action_key)::boolean, false), k.sort_order
FROM public.ce_audit_communication_templates t
CROSS JOIN (VALUES
  ('include_report_pdf',    10),
  ('include_evidence',      20),
  ('include_violations',    30),
  ('include_findings_memo', 40),
  ('include_books_annexure',50),
  ('include_payment_summary',60),
  ('use_secure_link',       70)
) AS k(action_key, sort_order)
ON CONFLICT (template_id, action_key) DO NOTHING;