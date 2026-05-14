
-- ============================================
-- COMPLIANCE & ENFORCEMENT MODULE - ALL 27 TABLES
-- ============================================

-- 1. ce_violation_types
CREATE TABLE ce_violation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  fund_type VARCHAR(10),
  severity_default VARCHAR(20) DEFAULT 'Medium',
  auto_detect BOOLEAN DEFAULT false,
  grace_period_days INTEGER DEFAULT 0,
  applicable_funds TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ce_number_templates
CREATE TABLE ce_number_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  template_pattern VARCHAR(100) NOT NULL,
  description TEXT,
  applies_to VARCHAR(50) DEFAULT 'violation',
  is_default BOOLEAN DEFAULT false,
  padding_length INTEGER DEFAULT 5,
  prefix VARCHAR(20),
  reset_frequency VARCHAR(20) DEFAULT 'yearly',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ce_number_sequences
CREATE TABLE ce_number_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES ce_number_templates(id),
  year INTEGER NOT NULL,
  month INTEGER,
  current_value INTEGER DEFAULT 0,
  UNIQUE(template_id, year, month)
);

-- 4. ce_detection_rules
CREATE TABLE ce_detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  violation_type_id UUID REFERENCES ce_violation_types(id),
  trigger_event VARCHAR(100) NOT NULL,
  condition_expression TEXT,
  parameters JSONB DEFAULT '{}',
  auto_create_violation BOOLEAN DEFAULT true,
  frequency VARCHAR(30) DEFAULT 'daily',
  priority VARCHAR(20) DEFAULT 'Medium',
  is_enabled BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ce_calculation_rules
CREATE TABLE ce_calculation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  applies_to VARCHAR(50) NOT NULL,
  fund_type VARCHAR(10),
  formula_expression TEXT NOT NULL,
  source_config VARCHAR(100),
  parameters JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ce_escalation_rules
CREATE TABLE ce_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  condition_expression TEXT,
  days_threshold INTEGER,
  amount_threshold NUMERIC(15,2),
  auto_escalate BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  notification_template_id UUID,
  is_enabled BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ce_violations
CREATE TABLE ce_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20),
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  violation_type_id UUID REFERENCES ce_violation_types(id),
  fund_type VARCHAR(10),
  status VARCHAR(30) DEFAULT 'OPEN',
  priority VARCHAR(20) DEFAULT 'Medium',
  severity VARCHAR(20) DEFAULT 'Medium',
  summary TEXT NOT NULL,
  description TEXT,
  principal_amount NUMERIC(15,2) DEFAULT 0,
  penalty_amount NUMERIC(15,2) DEFAULT 0,
  interest_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  source_type VARCHAR(50),
  source_rule_id UUID,
  inspection_id UUID,
  c3_submission_id UUID,
  is_unlinked BOOLEAN DEFAULT false,
  candidate_business_name VARCHAR(200),
  candidate_location VARCHAR(200),
  candidate_activity_type VARCHAR(100),
  estimated_employees INTEGER,
  assigned_to_user_id VARCHAR(10),
  assigned_to_name VARCHAR(100),
  assigned_at TIMESTAMPTZ,
  discovered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  discovered_by VARCHAR(10),
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(10),
  resolution_notes TEXT,
  escalated_at TIMESTAMPTZ,
  escalated_to VARCHAR(100),
  period_from VARCHAR(7),
  period_to VARCHAR(7),
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- 8. ce_violation_history
CREATE TABLE ce_violation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID REFERENCES ce_violations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  from_value VARCHAR(100),
  to_value VARCHAR(100),
  notes TEXT,
  performed_by VARCHAR(10),
  performed_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ce_cases
CREATE TABLE ce_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  status VARCHAR(50) DEFAULT 'OPEN',
  priority VARCHAR(20) DEFAULT 'Medium',
  case_type VARCHAR(50),
  fund_type VARCHAR(10),
  summary TEXT,
  total_principal NUMERIC(15,2) DEFAULT 0,
  total_penalties NUMERIC(15,2) DEFAULT 0,
  total_interest NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  amount_collected NUMERIC(15,2) DEFAULT 0,
  assigned_officer_id VARCHAR(10),
  assigned_officer_name VARCHAR(100),
  risk_band VARCHAR(20),
  risk_score NUMERIC(5,2),
  opened_date DATE DEFAULT CURRENT_DATE,
  target_resolution_date DATE,
  closed_date DATE,
  closure_reason TEXT,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

-- 10. ce_case_history
CREATE TABLE ce_case_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES ce_cases(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  notes TEXT,
  performed_by VARCHAR(10),
  performed_at TIMESTAMPTZ DEFAULT now()
);

-- 11. ce_case_violations
CREATE TABLE ce_case_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES ce_cases(id) ON DELETE CASCADE,
  violation_id UUID REFERENCES ce_violations(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by VARCHAR(10),
  UNIQUE(case_id, violation_id)
);

-- 12. ce_risk_profiles
CREATE TABLE ce_risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id VARCHAR(20) UNIQUE NOT NULL,
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  arrears_score NUMERIC(5,2) DEFAULT 0,
  violation_score NUMERIC(5,2) DEFAULT 0,
  filing_score NUMERIC(5,2) DEFAULT 0,
  legal_history_score NUMERIC(5,2) DEFAULT 0,
  payment_behavior_score NUMERIC(5,2) DEFAULT 0,
  total_score NUMERIC(5,2) DEFAULT 0,
  risk_band VARCHAR(20) DEFAULT 'Low',
  last_calculated_at TIMESTAMPTZ,
  next_review_date DATE,
  override_band VARCHAR(20),
  override_reason TEXT,
  override_by VARCHAR(10),
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. ce_risk_score_history
CREATE TABLE ce_risk_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_profile_id UUID REFERENCES ce_risk_profiles(id) ON DELETE CASCADE,
  previous_score NUMERIC(5,2),
  new_score NUMERIC(5,2),
  previous_band VARCHAR(20),
  new_band VARCHAR(20),
  calculation_details JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  calculated_by VARCHAR(10)
);

-- 14. ce_risk_config
CREATE TABLE ce_risk_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_code VARCHAR(50) UNIQUE NOT NULL,
  factor_name VARCHAR(150) NOT NULL,
  description TEXT,
  weight NUMERIC(5,2) DEFAULT 1.0,
  max_score NUMERIC(5,2) DEFAULT 100,
  scoring_method VARCHAR(50),
  thresholds JSONB,
  is_enabled BOOLEAN DEFAULT true,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. ce_inspections
CREATE TABLE ce_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  territory VARCHAR(20),
  case_id UUID REFERENCES ce_cases(id),
  inspection_type VARCHAR(50),
  status VARCHAR(30) DEFAULT 'SCHEDULED',
  inspector_id VARCHAR(10),
  inspector_name VARCHAR(100),
  scheduled_date DATE,
  scheduled_time TIME,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  location_address TEXT,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  findings_summary TEXT,
  wage_books_reviewed BOOLEAN DEFAULT false,
  employees_interviewed INTEGER DEFAULT 0,
  documents_collected JSONB DEFAULT '[]',
  photos JSONB DEFAULT '[]',
  employer_signature_data TEXT,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. ce_inspection_findings
CREATE TABLE ce_inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES ce_inspections(id) ON DELETE CASCADE,
  finding_type VARCHAR(50),
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'Medium',
  violation_created BOOLEAN DEFAULT false,
  violation_id UUID REFERENCES ce_violations(id),
  evidence_documents JSONB DEFAULT '[]',
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. ce_payment_arrangements
CREATE TABLE ce_payment_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  case_id UUID REFERENCES ce_cases(id),
  status VARCHAR(30) DEFAULT 'DRAFT',
  total_debt NUMERIC(15,2) NOT NULL,
  down_payment NUMERIC(15,2) DEFAULT 0,
  installment_amount NUMERIC(15,2) NOT NULL,
  number_of_installments INTEGER NOT NULL,
  frequency VARCHAR(20) DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,
  total_paid NUMERIC(15,2) DEFAULT 0,
  installments_paid INTEGER DEFAULT 0,
  next_due_date DATE,
  missed_payments INTEGER DEFAULT 0,
  terms_text TEXT,
  conditions JSONB DEFAULT '[]',
  agreement_document_url TEXT,
  agreement_signed BOOLEAN DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  max_missed_before_breach INTEGER DEFAULT 2,
  breach_detected BOOLEAN DEFAULT false,
  breach_date DATE,
  breach_reason TEXT,
  approved_by VARCHAR(10),
  approved_at TIMESTAMPTZ,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. ce_installments
CREATE TABLE ce_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID REFERENCES ce_payment_arrangements(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  paid_date DATE,
  payment_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'PENDING',
  is_overdue BOOLEAN DEFAULT false,
  overdue_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. ce_arrangement_breaches
CREATE TABLE ce_arrangement_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID REFERENCES ce_payment_arrangements(id) ON DELETE CASCADE,
  breach_type VARCHAR(50),
  description TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  detected_by VARCHAR(20),
  resolution VARCHAR(50),
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(10),
  resolution_notes TEXT
);

-- 20. ce_legal_escalations
CREATE TABLE ce_legal_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_number VARCHAR(50) UNIQUE NOT NULL,
  case_id UUID REFERENCES ce_cases(id),
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  current_stage VARCHAR(50) DEFAULT 'WARNING_NOTICE',
  amount_in_dispute NUMERIC(15,2),
  court_name VARCHAR(200),
  court_case_number VARCHAR(100),
  hearing_date DATE,
  judgment_amount NUMERIC(15,2),
  judgment_date DATE,
  legal_officer_id VARCHAR(10),
  legal_officer_name VARCHAR(100),
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. ce_legal_documents
CREATE TABLE ce_legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id UUID REFERENCES ce_legal_escalations(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by VARCHAR(10),
  sent_at TIMESTAMPTZ,
  sent_method VARCHAR(30),
  acknowledged_at TIMESTAMPTZ,
  notes TEXT
);

-- 22. ce_notices
CREATE TABLE ce_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  employer_name VARCHAR(200),
  case_id UUID REFERENCES ce_cases(id),
  violation_id UUID REFERENCES ce_violations(id),
  notice_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'DRAFT',
  subject VARCHAR(200),
  body TEXT,
  template_id UUID,
  delivery_method VARCHAR(30),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  due_response_date DATE,
  response_received BOOLEAN DEFAULT false,
  response_date DATE,
  response_notes TEXT,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 23. ce_waivers
CREATE TABLE ce_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_number VARCHAR(50) UNIQUE NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  case_id UUID REFERENCES ce_cases(id),
  waiver_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) DEFAULT 'PENDING',
  amount_requested NUMERIC(15,2),
  amount_approved NUMERIC(15,2),
  justification TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]',
  requested_by VARCHAR(10),
  requested_at TIMESTAMPTZ DEFAULT now(),
  reviewer_id VARCHAR(10),
  reviewer_decision VARCHAR(20),
  reviewer_comments TEXT,
  reviewed_at TIMESTAMPTZ,
  approver_id VARCHAR(10),
  approver_decision VARCHAR(20),
  approver_comments TEXT,
  approved_at TIMESTAMPTZ,
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. ce_automation_jobs
CREATE TABLE ce_automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  job_type VARCHAR(50) NOT NULL,
  schedule_cron VARCHAR(50),
  frequency VARCHAR(30),
  is_enabled BOOLEAN DEFAULT false,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  next_scheduled_at TIMESTAMPTZ,
  parameters JSONB DEFAULT '{}',
  created_by VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. ce_automation_runs
CREATE TABLE ce_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES ce_automation_jobs(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'RUNNING',
  records_processed INTEGER DEFAULT 0,
  records_affected INTEGER DEFAULT 0,
  error_message TEXT,
  execution_log JSONB DEFAULT '[]',
  triggered_by VARCHAR(20) DEFAULT 'system'
);

-- 26. ce_settings
CREATE TABLE ce_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  data_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  category VARCHAR(50),
  updated_by VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 27. ce_audit_log
CREATE TABLE ce_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  old_values JSONB,
  new_values JSONB,
  performed_by VARCHAR(10),
  performed_at TIMESTAMPTZ DEFAULT now(),
  ip_address VARCHAR(50),
  user_agent TEXT
);

-- INDEXES
CREATE INDEX idx_ce_violations_employer ON ce_violations(employer_id);
CREATE INDEX idx_ce_violations_status ON ce_violations(status);
CREATE INDEX idx_ce_violations_type ON ce_violations(violation_type_id);
CREATE INDEX idx_ce_cases_employer ON ce_cases(employer_id);
CREATE INDEX idx_ce_cases_status ON ce_cases(status);
CREATE INDEX idx_ce_risk_profiles_band ON ce_risk_profiles(risk_band);
CREATE INDEX idx_ce_inspections_inspector ON ce_inspections(inspector_id);
CREATE INDEX idx_ce_installments_due ON ce_installments(due_date, status);
CREATE INDEX idx_ce_audit_log_entity ON ce_audit_log(entity_type, entity_id);
