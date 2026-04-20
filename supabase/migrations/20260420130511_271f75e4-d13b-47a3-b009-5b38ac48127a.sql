-- 1) Lifecycle taxonomy on CE communication templates (additive)
ALTER TABLE public.ce_audit_communication_templates
  ADD COLUMN IF NOT EXISTS lifecycle_stage text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ce_act_lifecycle_stage_chk'
  ) THEN
    ALTER TABLE public.ce_audit_communication_templates
      ADD CONSTRAINT ce_act_lifecycle_stage_chk
      CHECK (lifecycle_stage IS NULL OR lifecycle_stage IN
        ('pre_visit','during_audit','post_review','final_enforcement','reminders_escalation'));
  END IF;
END $$;

-- 2) Explicit Communication -> Report linkage (additive)
ALTER TABLE public.ce_audit_communication_templates
  ADD COLUMN IF NOT EXISTS linked_report_template_type text;

-- 3) Backfill lifecycle_stage from comm_type / category (best-effort)
UPDATE public.ce_audit_communication_templates SET lifecycle_stage = CASE
  WHEN comm_type IN ('audit_intimation','books_required','visit_reminder')               THEN 'pre_visit'
  WHEN comm_type IN ('additional_info_request','clarification_request','interim_findings','evidence_summary') THEN 'during_audit'
  WHEN comm_type IN ('draft_findings','acknowledgment_request','dispute_instructions')   THEN 'post_review'
  WHEN comm_type IN ('final_report','violation_notice','corrective_action')              THEN 'final_enforcement'
  WHEN comm_type IN ('due_date_reminder','escalation_notice')                            THEN 'reminders_escalation'
  ELSE 'during_audit'
END
WHERE lifecycle_stage IS NULL;

-- 4) Backfill linked_report_template_type for known comm_types
UPDATE public.ce_audit_communication_templates SET linked_report_template_type = CASE comm_type
  WHEN 'final_report'      THEN 'employer_audit_report'
  WHEN 'violation_notice'  THEN 'violation_notice'
  WHEN 'evidence_summary'  THEN 'evidence_summary'
  WHEN 'interim_findings'  THEN 'findings_memo'
  WHEN 'draft_findings'    THEN 'findings_memo'
  WHEN 'escalation_notice' THEN 'enforcement_pack'
END
WHERE linked_report_template_type IS NULL
  AND comm_type IN ('final_report','violation_notice','evidence_summary','interim_findings','draft_findings','escalation_notice');

-- 5) Lifecycle tags on the CE shared section library (additive)
ALTER TABLE public.ce_document_section_library
  ADD COLUMN IF NOT EXISTS lifecycle_tags text[] NOT NULL DEFAULT '{}';

-- 6) Seed shared section library blocks for employer-audit lifecycle (idempotent)
INSERT INTO public.ce_document_section_library
  (section_key, label, applies_to, is_shared, default_enabled, default_order, display_mode, is_mandatory, category, description, default_include_in_toc, default_start_on_new_page, lifecycle_tags)
VALUES
  ('statutory_authority',          'Statutory Authority',                 ARRAY['employer_audit_report','findings_memo','violation_notice','enforcement_pack']::text[], true, true, 100, 'block', false, 'legal',     'Citation of statutory authority for employer audit', false, false, ARRAY['pre_visit','during_audit','post_review','final_enforcement']),
  ('audit_purpose',                'Audit Purpose & Scope',                ARRAY['employer_audit_report','findings_memo']::text[],                                       true, true, 110, 'block', false, 'audit',     'Purpose and scope of the employer audit',           true,  false, ARRAY['pre_visit','during_audit']),
  ('employer_obligations_pre_visit','Employer Obligations Prior to Visit', ARRAY['employer_audit_report']::text[],                                                       true, true, 120, 'block', false, 'employer',  'What the employer must prepare before the visit',   false, false, ARRAY['pre_visit']),
  ('books_required_checklist',     'Books / Records Required Checklist',   ARRAY['employer_audit_report','evidence_summary']::text[],                                    true, true, 130, 'list',  false, 'evidence',  'Checklist of books/records the employer must produce', false, false, ARRAY['pre_visit','during_audit']),
  ('payroll_records_checklist',    'Payroll & Contribution Records Checklist', ARRAY['employer_audit_report','evidence_summary']::text[],                                true, true, 140, 'list',  false, 'evidence',  'Payroll/contribution records the inspector will review', false, false, ARRAY['pre_visit','during_audit']),
  ('pre_visit_preparation',        'Pre-Visit Preparation Instructions',   ARRAY['employer_audit_report']::text[],                                                       true, true, 150, 'block', false, 'employer',  'Practical preparation steps for the employer',      false, false, ARRAY['pre_visit']),
  ('contact_reschedule',           'Contact & Reschedule Instructions',    ARRAY['employer_audit_report','findings_memo','violation_notice']::text[],                    true, true, 160, 'block', false, 'employer',  'How to contact the inspector / request reschedule', false, false, ARRAY['pre_visit','during_audit']),
  ('confidentiality_cooperation',  'Confidentiality & Cooperation',        ARRAY['employer_audit_report','findings_memo','enforcement_pack']::text[],                    true, true, 170, 'block', false, 'legal',     'Confidentiality and cooperation expectations',      false, false, ARRAY['pre_visit','during_audit']),
  ('acknowledgment_block',         'Acknowledgment Block',                 ARRAY['employer_audit_report','findings_memo','violation_notice','enforcement_pack','management_summary']::text[], true, true, 180, 'block', false, 'foundation','Standard employer acknowledgment wording',          false, false, ARRAY['post_review','final_enforcement']),
  ('dispute_objection',            'Dispute / Objection Instructions',     ARRAY['employer_audit_report','findings_memo','violation_notice']::text[],                    true, true, 190, 'block', false, 'legal',     'How the employer may dispute findings',             false, false, ARRAY['post_review','final_enforcement']),
  ('corrective_action',            'Corrective Action Wording',            ARRAY['employer_audit_report','findings_memo','enforcement_pack']::text[],                    true, true, 200, 'block', false, 'remediation','Standard corrective action language',              false, false, ARRAY['final_enforcement']),
  ('follow_up_instructions',       'Follow-Up Instructions',               ARRAY['employer_audit_report','findings_memo']::text[],                                       true, true, 210, 'block', false, 'employer',  'What happens next / follow-up',                     false, false, ARRAY['post_review','reminders_escalation']),
  ('payment_instructions',         'Payment Instructions',                 ARRAY['employer_audit_report','enforcement_pack']::text[],                                    true, true, 220, 'block', false, 'financial', 'How to pay assessed amounts',                       false, false, ARRAY['final_enforcement']),
  ('escalation_warning',           'Escalation Warning',                   ARRAY['violation_notice','enforcement_pack']::text[],                                         true, true, 230, 'block', false, 'legal',     'Warning of escalation/legal action on non-response',false, false, ARRAY['reminders_escalation','final_enforcement'])
ON CONFLICT (section_key) DO NOTHING;

-- 7) Seed default schedule policies (only if missing) for 5 key auto-flow templates
INSERT INTO public.ce_audit_communication_schedule_policies
  (template_id, trigger_mode, trigger_event, relative_to_field, offset_days, recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences)
SELECT t.id, 'TIME_RELATIVE', NULL, 'inspection.visit_date', -10, false, NULL, NULL
FROM public.ce_audit_communication_templates t
WHERE t.template_code = 'AUD_INTIM'
  AND NOT EXISTS (SELECT 1 FROM public.ce_audit_communication_schedule_policies p WHERE p.template_id = t.id);

INSERT INTO public.ce_audit_communication_schedule_policies
  (template_id, trigger_mode, trigger_event, relative_to_field, offset_days, recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences)
SELECT t.id, 'TIME_RELATIVE', NULL, 'inspection.visit_date', -7, false, NULL, NULL
FROM public.ce_audit_communication_templates t
WHERE t.template_code = 'AUD_BOOKS'
  AND NOT EXISTS (SELECT 1 FROM public.ce_audit_communication_schedule_policies p WHERE p.template_id = t.id);

INSERT INTO public.ce_audit_communication_schedule_policies
  (template_id, trigger_mode, trigger_event, relative_to_field, offset_days, recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences)
SELECT t.id, 'TIME_RELATIVE', NULL, 'inspection.visit_date', -1, false, NULL, NULL
FROM public.ce_audit_communication_templates t
WHERE t.template_code = 'AUD_VST_REM'
  AND NOT EXISTS (SELECT 1 FROM public.ce_audit_communication_schedule_policies p WHERE p.template_id = t.id);

INSERT INTO public.ce_audit_communication_schedule_policies
  (template_id, trigger_mode, trigger_event, relative_to_field, offset_days, recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences)
SELECT t.id, 'TIME_RELATIVE', NULL, 'case.due_date', 0, true, 7, 4
FROM public.ce_audit_communication_templates t
WHERE t.template_code = 'AUD_DUE_REM'
  AND NOT EXISTS (SELECT 1 FROM public.ce_audit_communication_schedule_policies p WHERE p.template_id = t.id);

INSERT INTO public.ce_audit_communication_schedule_policies
  (template_id, trigger_mode, trigger_event, relative_to_field, offset_days, recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences)
SELECT t.id, 'EVENT', 'communication.no_response', NULL, NULL, false, NULL, NULL
FROM public.ce_audit_communication_templates t
WHERE t.template_code = 'AUD_ESC'
  AND NOT EXISTS (SELECT 1 FROM public.ce_audit_communication_schedule_policies p WHERE p.template_id = t.id);

-- 8) Helpful index for stage filtering
CREATE INDEX IF NOT EXISTS idx_ce_act_lifecycle_stage
  ON public.ce_audit_communication_templates (lifecycle_stage);
