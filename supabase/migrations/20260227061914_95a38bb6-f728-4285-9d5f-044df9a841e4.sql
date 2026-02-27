
-- ============================================
-- Internal Audit Module - Core Database Tables
-- Prefix: ia_ (Internal Audit)
-- No RLS per architectural rule
-- ============================================

-- 1. Departments
CREATE TABLE public.ia_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  head TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  risk_rating TEXT DEFAULT 'Medium',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 2. Department Functions (Function Master)
CREATE TABLE public.ia_department_functions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.ia_departments(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  description TEXT,
  risk_rating TEXT DEFAULT 'Medium',
  likelihood TEXT DEFAULT 'Medium',
  impact TEXT DEFAULT 'Medium',
  control_effectiveness TEXT DEFAULT 'Effective',
  last_audit_date DATE,
  next_audit_date DATE,
  responsible_person TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 3. Auditor Profiles
CREATE TABLE public.ia_auditors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  employee_no TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Auditor',
  seniority_level TEXT DEFAULT 'Junior',
  employment_status TEXT DEFAULT 'Active',
  work_location TEXT,
  supervisor_id UUID,
  skills TEXT[] DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  signature_image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 4. Holidays
CREATE TABLE public.ia_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  country TEXT DEFAULT 'St. Kitts & Nevis',
  is_ssb_specific BOOLEAN DEFAULT false,
  year INTEGER GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)::INTEGER) STORED,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 5. Leave Requests
CREATE TABLE public.ia_leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  auditor_id UUID NOT NULL REFERENCES public.ia_auditors(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL DEFAULT 'Annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  attachment_url TEXT,
  status TEXT DEFAULT 'Draft',
  approver_id UUID REFERENCES public.ia_auditors(id),
  decision_note TEXT,
  submitted_date TIMESTAMPTZ,
  decided_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 6. Annual Audit Plans
CREATE TABLE public.ia_annual_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  scope TEXT,
  methodology TEXT,
  status TEXT DEFAULT 'Draft',
  -- Phase 3 workflow fields
  internally_approved BOOLEAN DEFAULT false,
  internally_approved_by TEXT,
  internally_approved_date TIMESTAMPTZ,
  committee_noted BOOLEAN DEFAULT false,
  committee_minutes_url TEXT,
  committee_email_proof_url TEXT,
  auto_notify_on_approval BOOLEAN DEFAULT false,
  -- Standard audit fields
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  submitted_date TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_date TIMESTAMPTZ,
  approved_by TEXT,
  approved_date TIMESTAMPTZ,
  approval_comments TEXT,
  total_department_audits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 7. Department Audit Plans (within annual plan)
CREATE TABLE public.ia_department_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_plan_id UUID NOT NULL REFERENCES public.ia_annual_plans(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.ia_departments(id),
  department_name TEXT,
  period TEXT,
  month_year TEXT,
  functions TEXT[] DEFAULT '{}',
  objective TEXT,
  scope TEXT,
  risk_rating TEXT DEFAULT 'Medium',
  lead_auditor_id UUID REFERENCES public.ia_auditors(id),
  lead_auditor_name TEXT,
  team_member_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'Draft',
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  is_closed BOOLEAN DEFAULT false,
  closed_by TEXT,
  closed_date TIMESTAMPTZ,
  admin_override_close BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 8. Audit Activities
CREATE TABLE public.ia_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_audit_id UUID REFERENCES public.ia_department_audits(id) ON DELETE CASCADE,
  annual_plan_id UUID REFERENCES public.ia_annual_plans(id),
  department_id UUID REFERENCES public.ia_departments(id),
  function_area TEXT,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  control_area TEXT,
  activity_type TEXT,
  assigned_auditor_ids UUID[] DEFAULT '{}',
  auditor_id UUID REFERENCES public.ia_auditors(id),
  auditor_name TEXT,
  start_date DATE,
  end_date DATE,
  planned_date_from DATE,
  planned_date_to DATE,
  actual_date_from DATE,
  actual_date_to DATE,
  location TEXT,
  status TEXT DEFAULT 'Planned',
  priority TEXT DEFAULT 'Medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 9. Evidence Management
CREATE TABLE public.ia_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id TEXT NOT NULL UNIQUE,
  annual_plan_id UUID REFERENCES public.ia_annual_plans(id),
  department_audit_id UUID REFERENCES public.ia_department_audits(id),
  activity_id UUID REFERENCES public.ia_activities(id),
  finding_id UUID,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  description TEXT,
  reference_no TEXT,
  hash TEXT,
  tags TEXT[] DEFAULT '{}',
  uploaded_by TEXT,
  upload_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 10. Working Papers
CREATE TABLE public.ia_working_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  working_paper_id TEXT NOT NULL UNIQUE,
  annual_plan_id UUID REFERENCES public.ia_annual_plans(id),
  department_audit_id UUID REFERENCES public.ia_department_audits(id),
  activity_id UUID REFERENCES public.ia_activities(id),
  title TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  audit_area TEXT,
  procedure TEXT,
  test_performed TEXT,
  evidence_ids UUID[] DEFAULT '{}',
  results TEXT,
  observations TEXT,
  conclusion TEXT,
  linked_finding_ids UUID[] DEFAULT '{}',
  prepared_by TEXT,
  prepared_date TIMESTAMPTZ DEFAULT now(),
  reviewed_by TEXT,
  reviewed_date TIMESTAMPTZ,
  approved_by TEXT,
  approved_date TIMESTAMPTZ,
  status TEXT DEFAULT 'Draft',
  version INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 11. Findings & Recommendations
CREATE TABLE public.ia_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finding_id TEXT NOT NULL UNIQUE,
  annual_plan_id UUID REFERENCES public.ia_annual_plans(id),
  department_audit_id UUID REFERENCES public.ia_department_audits(id),
  activity_id UUID REFERENCES public.ia_activities(id),
  department_id UUID REFERENCES public.ia_departments(id),
  department_name TEXT,
  function_area TEXT,
  title TEXT NOT NULL,
  condition TEXT,
  criteria TEXT,
  cause TEXT,
  effect TEXT,
  risk_rating TEXT DEFAULT 'Medium',
  impact_area TEXT,
  owner_role TEXT,
  department_head_name TEXT,
  status TEXT DEFAULT 'Draft',
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT now(),
  submitted_for_response_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 12. Recommendations (linked to findings)
CREATE TABLE public.ia_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finding_id UUID NOT NULL REFERENCES public.ia_findings(id) ON DELETE CASCADE,
  recommendation_text TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  suggested_target_date DATE,
  official_target_date DATE,
  target_date_set_by TEXT,
  responsible_party TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 13. Management Responses
CREATE TABLE public.ia_management_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finding_id UUID NOT NULL REFERENCES public.ia_findings(id) ON DELETE CASCADE,
  response_text TEXT,
  action_plan TEXT,
  responsible_person TEXT,
  target_date DATE,
  official_target_date DATE,
  supporting_docs TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'Draft',
  submitted_by TEXT,
  submitted_date TIMESTAMPTZ,
  due_date DATE,
  is_overdue BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  last_reminder_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 14. Action Tracking
CREATE TABLE public.ia_action_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  finding_id UUID NOT NULL REFERENCES public.ia_findings(id) ON DELETE CASCADE,
  response_id UUID REFERENCES public.ia_management_responses(id),
  action_status TEXT DEFAULT 'Not Started',
  evidence_of_implementation TEXT[] DEFAULT '{}',
  verified_by TEXT,
  verification_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 15. Follow-Up Tracker
CREATE TABLE public.ia_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_plan_id UUID REFERENCES public.ia_annual_plans(id),
  department_audit_id UUID REFERENCES public.ia_department_audits(id),
  activity_id UUID REFERENCES public.ia_activities(id),
  finding_id UUID REFERENCES public.ia_findings(id),
  department_id UUID REFERENCES public.ia_departments(id),
  department_name TEXT,
  action_required TEXT NOT NULL,
  due_date DATE NOT NULL,
  responsible_party TEXT,
  responsible_name TEXT,
  status TEXT DEFAULT 'Open',
  priority TEXT DEFAULT 'Medium',
  description TEXT,
  resolution TEXT,
  resolved_date TIMESTAMPTZ,
  follow_up_type TEXT DEFAULT 'NEXT_AUDIT',
  scheduled_follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 16. Document Templates (Letter Generation)
CREATE TABLE public.ia_document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  content TEXT,
  merge_fields TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 17. Communications (Communication Center + Generated Letters)
CREATE TABLE public.ia_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_audit_id UUID REFERENCES public.ia_department_audits(id),
  annual_plan_id UUID REFERENCES public.ia_annual_plans(id),
  template_id UUID REFERENCES public.ia_document_templates(id),
  template_type TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  subject TEXT,
  content TEXT,
  status TEXT DEFAULT 'Draft',
  sent_date TIMESTAMPTZ,
  acknowledged_date TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 18. Audit System Configuration
CREATE TABLE public.ia_audit_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  config_type TEXT DEFAULT 'text',
  display_name TEXT,
  description TEXT,
  category TEXT DEFAULT 'General',
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 19. Workload tracking
CREATE TABLE public.ia_auditor_workload (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auditor_id UUID NOT NULL REFERENCES public.ia_auditors(id) ON DELETE CASCADE,
  fiscal_year TEXT NOT NULL,
  assigned_hours NUMERIC DEFAULT 0,
  booked_hours NUMERIC DEFAULT 0,
  remaining_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auditor_id, fiscal_year)
);

-- ============================================
-- Seed default audit config settings
-- ============================================
INSERT INTO public.ia_audit_config (config_key, config_value, config_type, display_name, description, category) VALUES
  ('autoNotifyOnPlanApproval', 'false', 'boolean', 'Auto-Notify on Plan Approval', 'When enabled, automatically sends notifications when a plan is approved', 'Workflow'),
  ('defaultResponseDays', '14', 'number', 'Default Response Days', 'Number of days allowed for management response', 'Workflow'),
  ('reminderDaysBefore', '3', 'number', 'Reminder Days Before Due', 'Days before due date to send a reminder', 'Workflow'),
  ('enableEmployerAudit', 'false', 'boolean', 'Enable Employer Audit', 'Enable employer-focused audit legacy screens', 'Feature');

-- ============================================
-- Updated_at trigger function (reuse if exists)
-- ============================================
CREATE OR REPLACE FUNCTION public.ia_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers to all ia_ tables
CREATE TRIGGER trg_ia_departments_updated_at BEFORE UPDATE ON public.ia_departments FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_department_functions_updated_at BEFORE UPDATE ON public.ia_department_functions FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_auditors_updated_at BEFORE UPDATE ON public.ia_auditors FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_holidays_updated_at BEFORE UPDATE ON public.ia_holidays FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_leave_requests_updated_at BEFORE UPDATE ON public.ia_leave_requests FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_annual_plans_updated_at BEFORE UPDATE ON public.ia_annual_plans FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_department_audits_updated_at BEFORE UPDATE ON public.ia_department_audits FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_activities_updated_at BEFORE UPDATE ON public.ia_activities FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_evidence_updated_at BEFORE UPDATE ON public.ia_evidence FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_working_papers_updated_at BEFORE UPDATE ON public.ia_working_papers FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_findings_updated_at BEFORE UPDATE ON public.ia_findings FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_recommendations_updated_at BEFORE UPDATE ON public.ia_recommendations FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_management_responses_updated_at BEFORE UPDATE ON public.ia_management_responses FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_action_tracking_updated_at BEFORE UPDATE ON public.ia_action_tracking FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_follow_ups_updated_at BEFORE UPDATE ON public.ia_follow_ups FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_document_templates_updated_at BEFORE UPDATE ON public.ia_document_templates FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_communications_updated_at BEFORE UPDATE ON public.ia_communications FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_audit_config_updated_at BEFORE UPDATE ON public.ia_audit_config FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();
CREATE TRIGGER trg_ia_auditor_workload_updated_at BEFORE UPDATE ON public.ia_auditor_workload FOR EACH ROW EXECUTE FUNCTION public.ia_update_updated_at();

-- Indexes for common queries
CREATE INDEX idx_ia_dept_functions_dept ON public.ia_department_functions(department_id);
CREATE INDEX idx_ia_leave_requests_auditor ON public.ia_leave_requests(auditor_id);
CREATE INDEX idx_ia_dept_audits_plan ON public.ia_department_audits(annual_plan_id);
CREATE INDEX idx_ia_activities_dept_audit ON public.ia_activities(department_audit_id);
CREATE INDEX idx_ia_findings_dept_audit ON public.ia_findings(department_audit_id);
CREATE INDEX idx_ia_findings_activity ON public.ia_findings(activity_id);
CREATE INDEX idx_ia_mgmt_responses_finding ON public.ia_management_responses(finding_id);
CREATE INDEX idx_ia_action_tracking_finding ON public.ia_action_tracking(finding_id);
CREATE INDEX idx_ia_follow_ups_finding ON public.ia_follow_ups(finding_id);
CREATE INDEX idx_ia_evidence_activity ON public.ia_evidence(activity_id);
CREATE INDEX idx_ia_working_papers_activity ON public.ia_working_papers(activity_id);
CREATE INDEX idx_ia_holidays_year ON public.ia_holidays(year);
CREATE INDEX idx_ia_communications_dept_audit ON public.ia_communications(department_audit_id);
