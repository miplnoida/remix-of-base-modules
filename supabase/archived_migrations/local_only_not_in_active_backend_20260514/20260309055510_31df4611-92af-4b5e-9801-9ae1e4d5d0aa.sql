
-- ==========================================
-- PHASE 1: Audit Universe
-- ==========================================
CREATE TABLE public.ia_audit_universe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name TEXT NOT NULL,
  entity_code TEXT,
  entity_type TEXT NOT NULL DEFAULT 'Department',
  department_id UUID REFERENCES public.ia_departments(id),
  function_id UUID,
  process_owner TEXT,
  risk_category TEXT DEFAULT 'Medium',
  inherent_risk_score NUMERIC(5,2) DEFAULT 0,
  residual_risk_score NUMERIC(5,2) DEFAULT 0,
  materiality TEXT,
  regulatory_impact TEXT,
  last_audit_date DATE,
  next_audit_due DATE,
  audit_frequency TEXT DEFAULT 'Annual',
  status TEXT DEFAULT 'Active',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

-- ==========================================
-- PHASE 1: Risk Assessment
-- ==========================================
CREATE TABLE public.ia_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_universe_id UUID REFERENCES public.ia_audit_universe(id),
  assessment_date DATE DEFAULT CURRENT_DATE,
  assessed_by TEXT,
  impact_score NUMERIC(5,2) DEFAULT 0,
  likelihood_score NUMERIC(5,2) DEFAULT 0,
  control_effectiveness_score NUMERIC(5,2) DEFAULT 0,
  velocity_score NUMERIC(5,2) DEFAULT 0,
  regulatory_score NUMERIC(5,2) DEFAULT 0,
  reputational_score NUMERIC(5,2) DEFAULT 0,
  overall_risk_score NUMERIC(5,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'Medium',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_risk_assessment_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.ia_risk_assessments(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  factor_category TEXT,
  weight NUMERIC(5,2) DEFAULT 1,
  score NUMERIC(5,2) DEFAULT 0,
  weighted_score NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Risk Scoring Models
CREATE TABLE public.ia_risk_scoring_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  critical_threshold NUMERIC(5,2) DEFAULT 80,
  high_threshold NUMERIC(5,2) DEFAULT 60,
  medium_threshold NUMERIC(5,2) DEFAULT 40,
  low_threshold NUMERIC(5,2) DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_risk_criteria_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.ia_risk_scoring_models(id) ON DELETE CASCADE,
  criterion_name TEXT NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1,
  max_score NUMERIC(5,2) DEFAULT 10,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 2: Audit Engagements
-- ==========================================
CREATE TABLE public.ia_audit_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_plan_id UUID,
  department_audit_id UUID,
  engagement_name TEXT NOT NULL,
  engagement_code TEXT,
  department_id UUID REFERENCES public.ia_departments(id),
  scope TEXT,
  objectives TEXT,
  methodology TEXT,
  criteria TEXT,
  engagement_risk_rating TEXT DEFAULT 'Medium',
  lead_auditor_id UUID,
  team_member_ids JSONB DEFAULT '[]'::jsonb,
  estimated_hours NUMERIC(8,2) DEFAULT 0,
  budgeted_hours NUMERIC(8,2) DEFAULT 0,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  status TEXT DEFAULT 'Draft',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

-- Carry-forward
CREATE TABLE public.ia_plan_carry_forward (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_plan_id UUID,
  source_type TEXT NOT NULL,
  source_id UUID,
  source_reference TEXT,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Pending',
  carried_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ia_planning_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_plan_id UUID,
  assumption_text TEXT NOT NULL,
  category TEXT,
  impact TEXT,
  created_by TEXT DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 3: Audit Programs
-- ==========================================
CREATE TABLE public.ia_audit_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  program_code TEXT,
  audit_area TEXT,
  objective TEXT,
  scope TEXT,
  methodology TEXT,
  procedure_steps_json JSONB DEFAULT '[]'::jsonb,
  expected_evidence_json JSONB DEFAULT '[]'::jsonb,
  linked_risks_json JSONB DEFAULT '[]'::jsonb,
  linked_controls_json JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'Draft',
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM',
  approved_by TEXT
);

CREATE TABLE public.ia_audit_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_program_id UUID REFERENCES public.ia_audit_programs(id) ON DELETE CASCADE,
  procedure_no TEXT,
  title TEXT NOT NULL,
  description TEXT,
  expected_result TEXT,
  evidence_required TEXT,
  test_type TEXT DEFAULT 'Substantive',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 3: Risk Control Matrix (RCM)
-- ==========================================
CREATE TABLE public.ia_rcm_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_name TEXT NOT NULL,
  sub_process_name TEXT,
  owner TEXT,
  department_id UUID REFERENCES public.ia_departments(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_rcm_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES public.ia_rcm_processes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  likelihood NUMERIC(5,2) DEFAULT 0,
  impact NUMERIC(5,2) DEFAULT 0,
  risk_score NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_rcm_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_id UUID REFERENCES public.ia_rcm_risks(id) ON DELETE CASCADE,
  control_name TEXT NOT NULL,
  control_type TEXT DEFAULT 'Preventive',
  frequency TEXT DEFAULT 'Daily',
  owner TEXT,
  effectiveness TEXT DEFAULT 'Effective',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_rcm_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_id UUID REFERENCES public.ia_rcm_controls(id) ON DELETE CASCADE,
  test_procedure TEXT,
  expected_result TEXT,
  tester TEXT,
  review_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 3: Control Testing
-- ==========================================
CREATE TABLE public.ia_control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rcm_control_id UUID REFERENCES public.ia_rcm_controls(id),
  engagement_id UUID REFERENCES public.ia_audit_engagements(id),
  test_date DATE DEFAULT CURRENT_DATE,
  tested_by TEXT,
  sample_size INT DEFAULT 0,
  exceptions_found INT DEFAULT 0,
  result TEXT DEFAULT 'Not Tested',
  remarks TEXT,
  linked_evidence_ids JSONB DEFAULT '[]'::jsonb,
  reviewer_id TEXT,
  reviewed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_control_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_test_id UUID REFERENCES public.ia_control_tests(id) ON DELETE CASCADE,
  test_item_no INT DEFAULT 1,
  sample_reference TEXT,
  observation TEXT,
  result TEXT DEFAULT 'Pass',
  exception_detail TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 5: SLA & Escalation Engine
-- ==========================================
CREATE TABLE public.ia_sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  threshold_days INT DEFAULT 7,
  escalation_level INT DEFAULT 1,
  notify_roles JSONB DEFAULT '[]'::jsonb,
  notification_channel TEXT DEFAULT 'in-app',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_rule_id UUID REFERENCES public.ia_sla_rules(id) ON DELETE CASCADE,
  level INT DEFAULT 1,
  escalate_after_days INT DEFAULT 3,
  notify_roles JSONB DEFAULT '[]'::jsonb,
  action_type TEXT DEFAULT 'notify',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ia_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_rule_id UUID REFERENCES public.ia_sla_rules(id),
  entity_type TEXT,
  entity_id UUID,
  recipient_user_code TEXT,
  channel TEXT DEFAULT 'in-app',
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ia_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.ia_notification_queue(id),
  channel TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 7: Time Tracking
-- ==========================================
CREATE TABLE public.ia_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditor_id UUID,
  engagement_id UUID REFERENCES public.ia_audit_engagements(id),
  activity_id UUID,
  work_date DATE DEFAULT CURRENT_DATE,
  hours_spent NUMERIC(5,2) DEFAULT 0,
  work_type TEXT DEFAULT 'Fieldwork',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

-- ==========================================
-- PHASE 8: Quality Assurance Review
-- ==========================================
CREATE TABLE public.ia_quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID REFERENCES public.ia_audit_engagements(id),
  reviewer_id TEXT,
  review_date DATE DEFAULT CURRENT_DATE,
  review_type TEXT DEFAULT 'Post-Engagement',
  quality_rating TEXT DEFAULT 'Satisfactory',
  checklist_results JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  required_rework BOOLEAN DEFAULT false,
  final_disposition TEXT DEFAULT 'Pending',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_quality_review_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.ia_quality_reviews(id) ON DELETE CASCADE,
  checklist_item TEXT NOT NULL,
  category TEXT,
  is_compliant BOOLEAN DEFAULT false,
  remarks TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- PHASE 5: Action Plan Milestones & Updates
-- ==========================================
CREATE TABLE public.ia_action_plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID,
  milestone_name TEXT NOT NULL,
  target_date DATE,
  owner TEXT,
  completion_percent INT DEFAULT 0,
  evidence TEXT,
  update_notes TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE public.ia_action_plan_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID,
  update_date DATE DEFAULT CURRENT_DATE,
  updated_by_user TEXT,
  progress_percent INT DEFAULT 0,
  notes TEXT,
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
