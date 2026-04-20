
-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE ce_comm_type AS ENUM (
    'audit_intimation','books_required','visit_reminder',
    'additional_info_request','clarification_request','interim_findings',
    'evidence_summary','draft_findings',
    'final_report','violation_notice','corrective_action',
    'acknowledgment_request','dispute_instructions','due_date_reminder','escalation_notice'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ce_comm_channel AS ENUM ('email','sms','both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ce_comm_status AS ENUM (
    'draft','pending_approval','approved','rejected',
    'sending','sent','partial','failed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ce_comm_approval_role AS ENUM ('inspector','lead_inspector','supervisor','legal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ce_comm_delivery_status AS ENUM (
    'queued','sent','delivered','opened','clicked','bounced','failed','suppressed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ce_comm_recipient_source AS ENUM (
    'visit_contact','compliance_contact','er_master','manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_audit_communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code text NOT NULL UNIQUE,
  template_name text NOT NULL,
  comm_type ce_comm_type NOT NULL,
  channel ce_comm_channel NOT NULL DEFAULT 'email',
  email_subject text,
  email_body text,
  sms_body text,
  approval_rule_json jsonb NOT NULL DEFAULT '{"roles":[]}'::jsonb,
  attachment_rule_json jsonb NOT NULL DEFAULT '{"include_report_pdf":false,"include_evidence":false,"include_violations":false,"use_secure_link":true}'::jsonb,
  recipient_rule_json jsonb NOT NULL DEFAULT '{"priority":["visit_contact","compliance_contact","er_master"]}'::jsonb,
  branding_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  category text NOT NULL DEFAULT 'general',
  version_no integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_templates_type ON public.ce_audit_communication_templates(comm_type);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_templates_active ON public.ce_audit_communication_templates(is_active);
ALTER TABLE public.ce_audit_communication_templates DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_communication_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.ce_audit_communication_templates(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_label text,
  body_html text,
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, section_key)
);
ALTER TABLE public.ce_audit_communication_template_sections DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- COMMUNICATION INSTANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_audit_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid,
  employer_id text NOT NULL,
  template_id uuid REFERENCES public.ce_audit_communication_templates(id) ON DELETE SET NULL,
  comm_type ce_comm_type NOT NULL,
  channel ce_comm_channel NOT NULL,
  status ce_comm_status NOT NULL DEFAULT 'draft',
  subject_snapshot text,
  email_body_snapshot text,
  sms_body_snapshot text,
  context_data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  attachment_summary_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  report_version_id uuid,
  scheduled_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_inspection ON public.ce_audit_communications(inspection_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_employer ON public.ce_audit_communications(employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_status ON public.ce_audit_communications(status);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_type ON public.ce_audit_communications(comm_type);
ALTER TABLE public.ce_audit_communications DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- RECIPIENTS, APPROVALS, DELIVERIES, EVENTS, ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_audit_communication_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.ce_audit_communications(id) ON DELETE CASCADE,
  recipient_name text,
  recipient_email text,
  recipient_mobile text,
  recipient_role text,
  source ce_comm_recipient_source NOT NULL DEFAULT 'er_master',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_recipients_comm ON public.ce_audit_communication_recipients(communication_id);
ALTER TABLE public.ce_audit_communication_recipients DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_communication_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.ce_audit_communications(id) ON DELETE CASCADE,
  step_no integer NOT NULL DEFAULT 1,
  required_role ce_comm_approval_role NOT NULL,
  approver_user_id text,
  approver_name text,
  status text NOT NULL DEFAULT 'pending',
  comments text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_approvals_comm ON public.ce_audit_communication_approvals(communication_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_approvals_status ON public.ce_audit_communication_approvals(status);
ALTER TABLE public.ce_audit_communication_approvals DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_communication_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.ce_audit_communications(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.ce_audit_communication_recipients(id) ON DELETE SET NULL,
  channel text NOT NULL,
  recipient_address text NOT NULL,
  notification_log_id uuid,
  status ce_comm_delivery_status NOT NULL DEFAULT 'queued',
  failure_reason text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_deliveries_comm ON public.ce_audit_communication_deliveries(communication_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_deliveries_status ON public.ce_audit_communication_deliveries(status);
ALTER TABLE public.ce_audit_communication_deliveries DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_communication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.ce_audit_communications(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_id text,
  actor_name text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_events_comm ON public.ce_audit_communication_events(communication_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_events_type ON public.ce_audit_communication_events(event_type);
ALTER TABLE public.ce_audit_communication_events DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_communication_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.ce_audit_communications(id) ON DELETE CASCADE,
  attachment_kind text NOT NULL,
  filename text,
  file_url text,
  mime_type text,
  size_bytes bigint,
  source_ref_id uuid,
  is_external boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_attachments_comm ON public.ce_audit_communication_attachments(communication_id);
ALTER TABLE public.ce_audit_communication_attachments DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_communication_secure_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid NOT NULL REFERENCES public.ce_audit_communications(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  scope_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_comm_tokens_comm ON public.ce_audit_communication_secure_tokens(communication_id);
ALTER TABLE public.ce_audit_communication_secure_tokens DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- EMPLOYER RESPONSES, UPLOADS, DISPUTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_audit_employer_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid REFERENCES public.ce_audit_communications(id) ON DELETE SET NULL,
  inspection_id uuid,
  employer_id text NOT NULL,
  response_kind text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_via_token uuid REFERENCES public.ce_audit_communication_secure_tokens(id) ON DELETE SET NULL,
  submitted_by text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_emp_responses_comm ON public.ce_audit_employer_responses(communication_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_emp_responses_employer ON public.ce_audit_employer_responses(employer_id);
ALTER TABLE public.ce_audit_employer_responses DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_employer_uploaded_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid REFERENCES public.ce_audit_communications(id) ON DELETE SET NULL,
  inspection_id uuid,
  employer_id text NOT NULL,
  document_kind text,
  filename text,
  file_url text,
  mime_type text,
  size_bytes bigint,
  uploaded_via_token uuid REFERENCES public.ce_audit_communication_secure_tokens(id) ON DELETE SET NULL,
  uploaded_by text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_emp_uploads_comm ON public.ce_audit_employer_uploaded_documents(communication_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_emp_uploads_employer ON public.ce_audit_employer_uploaded_documents(employer_id);
ALTER TABLE public.ce_audit_employer_uploaded_documents DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ce_audit_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id uuid REFERENCES public.ce_audit_communications(id) ON DELETE SET NULL,
  inspection_id uuid,
  employer_id text NOT NULL,
  finding_id uuid,
  violation_id uuid,
  dispute_reason text NOT NULL,
  body text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  resolved_at timestamptz,
  resolved_by text,
  raised_via_token uuid REFERENCES public.ce_audit_communication_secure_tokens(id) ON DELETE SET NULL,
  raised_by text,
  raised_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_audit_disputes_comm ON public.ce_audit_disputes(communication_id);
CREATE INDEX IF NOT EXISTS idx_ce_audit_disputes_status ON public.ce_audit_disputes(status);
ALTER TABLE public.ce_audit_disputes DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_ce_audit_comm_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ce_audit_comm_templates_touch ON public.ce_audit_communication_templates;
CREATE TRIGGER trg_ce_audit_comm_templates_touch BEFORE UPDATE ON public.ce_audit_communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_touch();

DROP TRIGGER IF EXISTS trg_ce_audit_comm_template_sections_touch ON public.ce_audit_communication_template_sections;
CREATE TRIGGER trg_ce_audit_comm_template_sections_touch BEFORE UPDATE ON public.ce_audit_communication_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_touch();

DROP TRIGGER IF EXISTS trg_ce_audit_comm_touch ON public.ce_audit_communications;
CREATE TRIGGER trg_ce_audit_comm_touch BEFORE UPDATE ON public.ce_audit_communications
  FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_comm_touch();

-- ============================================================
-- SEED 14 default templates
-- ============================================================
INSERT INTO public.ce_audit_communication_templates
  (template_code, template_name, comm_type, channel, email_subject, email_body, sms_body,
   approval_rule_json, attachment_rule_json, category, sort_order, description)
VALUES
 ('AUD_INTIM','Audit Intimation Notice','audit_intimation','email',
  'Audit Intimation — {{employer_name}}',
  '<p>Dear {{employer_name}},</p><p>This is to inform you that an audit visit is scheduled on <strong>{{visit_date}}</strong> at <strong>{{visit_location}}</strong>. Please ensure the records listed in the attached notice are available.</p><p>Inspector: {{inspector_name}}</p>',
  'Audit visit scheduled {{visit_date}}. Please keep records ready. — SSB',
  '{"roles":["lead_inspector"]}','{"include_report_pdf":false,"use_secure_link":false}','pre_audit',1,'Sent to employer announcing the upcoming audit visit'),
 ('AUD_BOOKS','Books / Records Required Notice','books_required','email',
  'Books and Records Required for Audit — {{employer_name}}',
  '<p>Dear {{employer_name}},</p><p>Please prepare the following records for the upcoming audit:</p>{{books_list_html}}<p>Visit date: {{visit_date}}</p>',
  'Books required for audit on {{visit_date}}. Check email for details.',
  '{"roles":["lead_inspector"]}','{"include_report_pdf":false,"use_secure_link":true}','pre_audit',2,NULL),
 ('AUD_VST_REM','Visit Reminder','visit_reminder','both',
  'Reminder: Audit Visit on {{visit_date}}',
  '<p>This is a reminder that the audit visit is scheduled on <strong>{{visit_date}}</strong>.</p>',
  'Reminder: SSB audit visit on {{visit_date}}.',
  '{"roles":[]}','{"use_secure_link":false}','pre_audit',3,NULL),
 ('AUD_INFO_REQ','Additional Information Request','additional_info_request','email',
  'Additional Information Required — {{employer_name}}',
  '<p>During the ongoing audit we need the following additional information:</p>{{info_list_html}}<p>Please submit by <strong>{{due_date}}</strong>.</p>',
  'Additional info needed for audit. Due {{due_date}}.',
  '{"roles":["lead_inspector"]}','{"use_secure_link":true}','during_audit',4,NULL),
 ('AUD_CLAR_REQ','Clarification Request','clarification_request','email',
  'Clarification Required — {{employer_name}}',
  '<p>We require clarification on the following matters:</p>{{clarification_list_html}}',
  'Clarification needed for audit. See email.',
  '{"roles":["lead_inspector"]}','{"use_secure_link":true}','during_audit',5,NULL),
 ('AUD_INTERIM','Interim Findings Communication','interim_findings','email',
  'Interim Audit Findings — {{employer_name}}',
  '<p>Please find below the interim findings from the ongoing audit. These are preliminary and subject to final review.</p>{{findings_summary_html}}',
  'Interim audit findings shared. Please review email.',
  '{"roles":["lead_inspector"]}','{"include_report_pdf":false,"use_secure_link":true}','during_audit',6,NULL),
 ('AUD_EVID_SUM','Evidence Summary Communication','evidence_summary','email',
  'Evidence Collected Summary — {{employer_name}}',
  '<p>Summary of evidence collected during the audit:</p>{{evidence_summary_html}}',
  'Evidence summary shared.',
  '{"roles":["lead_inspector"]}','{"include_evidence":true,"use_secure_link":true}','during_audit',7,NULL),
 ('AUD_DRAFT','Draft Findings / Draft Report','draft_findings','email',
  'Draft Audit Report for Review — {{employer_name}}',
  '<p>Please find attached the draft audit report. Kindly review and provide your feedback by <strong>{{response_due_date}}</strong>.</p>',
  'Draft audit report shared. Respond by {{response_due_date}}.',
  '{"roles":["lead_inspector"]}','{"include_report_pdf":true,"use_secure_link":true}','during_audit',8,NULL),
 ('AUD_FINAL','Final Audit Report','final_report','email',
  'Final Audit Report — {{employer_name}}',
  '<p>Please find attached the final audit report. Kindly acknowledge receipt.</p>',
  'Final audit report issued. Check email.',
  '{"roles":["lead_inspector","supervisor"]}','{"include_report_pdf":true,"include_violations":true,"use_secure_link":true}','post_approval',9,NULL),
 ('AUD_VIOL','Violation Notice','violation_notice','email',
  'Violation Notice — {{employer_name}}',
  '<p>Following the audit, the following violations have been recorded:</p>{{violations_html}}<p>Corrective action is required by <strong>{{corrective_due_date}}</strong>.</p>',
  'Violation notice issued. See email for details.',
  '{"roles":["lead_inspector","supervisor"]}','{"include_violations":true,"include_report_pdf":true,"use_secure_link":true}','post_approval',10,NULL),
 ('AUD_CORR','Corrective Action Request','corrective_action','email',
  'Corrective Action Required — {{employer_name}}',
  '<p>Please complete the following corrective actions by <strong>{{corrective_due_date}}</strong>:</p>{{corrective_actions_html}}',
  'Corrective action required by {{corrective_due_date}}.',
  '{"roles":["lead_inspector","supervisor"]}','{"use_secure_link":true}','post_approval',11,NULL),
 ('AUD_ACK','Acknowledgment Request','acknowledgment_request','both',
  'Please Acknowledge Audit Report — {{employer_name}}',
  '<p>Please acknowledge receipt of the audit report by clicking the secure link below.</p>',
  'Please acknowledge audit report. Check email.',
  '{"roles":[]}','{"use_secure_link":true}','post_approval',12,NULL),
 ('AUD_DISP','Dispute Instructions','dispute_instructions','email',
  'How to Dispute Audit Findings — {{employer_name}}',
  '<p>If you wish to dispute any audit finding, please follow the instructions below within <strong>{{dispute_window_days}}</strong> days of issue.</p>',
  'Dispute instructions sent. See email.',
  '{"roles":["legal"]}','{"use_secure_link":true}','post_approval',13,NULL),
 ('AUD_DUE_REM','Due Date Reminder','due_date_reminder','both',
  'Reminder: Action Due on {{due_date}}',
  '<p>This is a reminder that the action requested in our previous communication is due on <strong>{{due_date}}</strong>.</p>',
  'Reminder: action due {{due_date}}.',
  '{"roles":[]}','{"use_secure_link":true}','post_approval',14,NULL),
 ('AUD_ESC','Escalation Notice','escalation_notice','email',
  'Escalation Notice — {{employer_name}}',
  '<p>This matter has been escalated due to non-compliance. Further action will follow as per regulation.</p>',
  'Audit matter escalated. Check email.',
  '{"roles":["lead_inspector","supervisor"]}','{"include_report_pdf":true,"use_secure_link":true}','post_approval',15,NULL)
ON CONFLICT (template_code) DO NOTHING;
