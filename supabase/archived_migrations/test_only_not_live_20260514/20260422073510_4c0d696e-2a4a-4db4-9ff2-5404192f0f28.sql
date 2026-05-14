-- ============================================================================
-- ce_audit_comm_trigger_rules
-- Configurable rule store for the Audit Communication Trigger Engine.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ce_audit_comm_trigger_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code       text NOT NULL UNIQUE,
  rule_name       text NOT NULL,
  description     text,

  -- WHERE this rule applies
  field_stage     text NOT NULL CHECK (field_stage IN (
    'visit_created','pre_visit_reminder',
    'during_audit_missing_documents','during_audit_clarification_required','during_audit_interim_findings',
    'post_review_draft_findings','final_report_issuance',
    'enforcement_stage','reminder_stage','escalation_stage'
  )),

  -- WHAT to produce
  -- Either pin a specific template, OR resolve at runtime by comm_type via
  -- the existing field-stage→template mapping table.
  comm_type       text NOT NULL,
  template_id     uuid REFERENCES public.ce_audit_communication_templates(id) ON DELETE SET NULL,

  -- HOW to react
  trigger_mode    text NOT NULL DEFAULT 'SUGGEST'
                  CHECK (trigger_mode IN ('SUGGEST','AUTO_CREATE_DRAFT','AUTO_SEND')),

  -- WHEN to fire — typed JSON predicate evaluated by the engine.
  -- Shape: { all?: Predicate[], any?: Predicate[], not?: Predicate }
  -- Predicate: { field: string, op: 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'truthy'|'falsy'|'in', value?: any }
  condition_json  jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Guards
  cooldown_hours        integer NOT NULL DEFAULT 24,
  max_per_visit         integer NOT NULL DEFAULT 1,
  requires_approval     boolean NOT NULL DEFAULT true,

  -- Ordering / control
  priority        integer NOT NULL DEFAULT 100,
  is_active       boolean NOT NULL DEFAULT true,

  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      text,
  updated_by      text
);

CREATE INDEX IF NOT EXISTS idx_ce_trig_rules_stage  ON public.ce_audit_comm_trigger_rules (field_stage);
CREATE INDEX IF NOT EXISTS idx_ce_trig_rules_active ON public.ce_audit_comm_trigger_rules (is_active);

-- updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.touch_ce_audit_comm_trigger_rules()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_ce_audit_comm_trigger_rules ON public.ce_audit_comm_trigger_rules;
CREATE TRIGGER trg_touch_ce_audit_comm_trigger_rules
BEFORE UPDATE ON public.ce_audit_comm_trigger_rules
FOR EACH ROW EXECUTE FUNCTION public.touch_ce_audit_comm_trigger_rules();

-- ============================================================================
-- Baseline rules (idempotent: keyed by rule_code)
-- ============================================================================

INSERT INTO public.ce_audit_comm_trigger_rules
  (rule_code, rule_name, description, field_stage, comm_type, trigger_mode,
   condition_json, cooldown_hours, max_per_visit, requires_approval, priority)
VALUES
  ('VISIT_CREATED_INTIMATION',
   'Send Audit Intimation on visit creation',
   'When a visit is created and the session has not started yet, suggest sending the Audit Intimation.',
   'visit_created', 'audit_intimation', 'SUGGEST',
   '{"all":[{"field":"sessionStarted","op":"falsy"}]}', 168, 1, true, 10),

  ('VISIT_CREATED_PBC',
   'Send Books Required (PBC) on visit creation',
   'When a visit is created, suggest sending the books-required / PBC checklist alongside the intimation.',
   'visit_created', 'books_required', 'SUGGEST',
   '{"all":[{"field":"sessionStarted","op":"falsy"}]}', 168, 1, true, 20),

  ('PRE_VISIT_REMINDER_AUTO',
   'Auto-send Pre-Visit Reminder',
   'When the visit is within 3 days and not yet started, auto-create a Reminder draft for review.',
   'pre_visit_reminder', 'visit_reminder', 'AUTO_CREATE_DRAFT',
   '{"all":[{"field":"sessionStarted","op":"falsy"},{"field":"daysUntilScheduled","op":"lte","value":3},{"field":"daysUntilScheduled","op":"gte","value":0}]}',
   48, 2, true, 30),

  ('CHECKLIST_INCOMPLETE_INFO_REQUEST',
   'Suggest Additional Information Request',
   'During audit, if checklist is incomplete or evidence is missing, suggest an Additional Information Request.',
   'during_audit_missing_documents', 'additional_info_request', 'SUGGEST',
   '{"any":[{"field":"hasMissingDocuments","op":"truthy"},{"field":"hasMissingEvidence","op":"truthy"}]}',
   24, 3, true, 40),

  ('FINDING_NEEDS_CLARIFICATION',
   'Suggest Clarification Request',
   'When a finding is flagged as needing employer clarification, suggest a Clarification Request.',
   'during_audit_clarification_required', 'clarification_request', 'SUGGEST',
   '{"all":[{"field":"hasOpenClarifications","op":"truthy"}]}',
   24, 5, true, 50),

  ('INTERIM_FINDINGS_PENDING_REVIEW',
   'Suggest Interim Findings',
   'When fieldwork is complete but report review is pending, suggest sharing Interim Findings.',
   'during_audit_interim_findings', 'interim_findings', 'SUGGEST',
   '{"all":[{"field":"sessionClosed","op":"truthy"},{"field":"reportStatus","op":"in","value":["DRAFT","IN_REVIEW",""]}]}',
   72, 1, true, 60),

  ('FINAL_REPORT_ON_APPROVAL',
   'Allow Final Audit Report on approval',
   'When the report is approved/published, allow sending the Final Audit Report.',
   'final_report_issuance', 'final_report', 'SUGGEST',
   '{"any":[{"field":"reportStatus","op":"eq","value":"PUBLISHED"},{"field":"reportStatus","op":"eq","value":"FINALIZED"}]}',
   168, 1, true, 70),

  ('VIOLATION_NOTICE_ON_SEVERITY',
   'Suggest Violation Notice / Corrective Action',
   'When medium or high severity findings exist on a finalized report, suggest the Violation Notice / Corrective Action flow.',
   'enforcement_stage', 'violation_notice', 'SUGGEST',
   '{"all":[{"field":"hasViolations","op":"truthy"},{"field":"maxSeverity","op":"in","value":["MEDIUM","HIGH","CRITICAL"]}]}',
   168, 1, true, 80),

  ('REMINDER_ON_OVERDUE',
   'Auto-send Reminder when response is overdue',
   'When the employer response due-date lapses, auto-create a Reminder draft.',
   'reminder_stage', 'due_date_reminder', 'AUTO_CREATE_DRAFT',
   '{"all":[{"field":"hasOverdueItems","op":"truthy"},{"field":"reminderCount","op":"lt","value":2}]}',
   48, 2, true, 90),

  ('ESCALATION_AFTER_REMINDERS',
   'Auto-trigger Escalation Notice after reminders lapse',
   'When the employer has not responded after two reminders, auto-create an Escalation Notice draft.',
   'escalation_stage', 'escalation_notice', 'AUTO_CREATE_DRAFT',
   '{"all":[{"field":"hasOverdueItems","op":"truthy"},{"field":"reminderCount","op":"gte","value":2}]}',
   168, 1, true, 100)
ON CONFLICT (rule_code) DO NOTHING;