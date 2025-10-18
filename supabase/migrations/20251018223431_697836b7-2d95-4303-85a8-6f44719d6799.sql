-- =====================================================
-- BeMA COMPLIANCE MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- =====================================================

-- Create enums for compliance system
CREATE TYPE compliance_registration_type AS ENUM ('employer', 'self_employed', 'voluntary');
CREATE TYPE compliance_registration_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'inactive', 'suspended');
CREATE TYPE c3_filing_status AS ENUM ('draft', 'submitted', 'validated', 'posted', 'rejected', 'query_raised');
CREATE TYPE audit_type AS ENUM ('random', 'complaint', 'referral', 'follow_up', 'scouting', 'investigation');
CREATE TYPE audit_status AS ENUM ('assigned', 'in_progress', 'completed', 'escalated', 'closed');
CREATE TYPE inspector_activity_type AS ENUM ('inspection', 'audit', 'investigation', 'scouting', 'education', 'notice_service');
CREATE TYPE payment_plan_status AS ENUM ('active', 'completed', 'broken', 'escalated');
CREATE TYPE waiver_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE contribution_category AS ENUM ('cat_a', 'cat_b', 'cat_c', 'cat_d', 'cat_e');

-- =====================================================
-- 1. REGISTRATION & ONBOARDING
-- =====================================================

-- Compliance Registrations Table
CREATE TABLE compliance_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_type compliance_registration_type NOT NULL,
  status compliance_registration_status DEFAULT 'pending',
  
  -- Employer specific
  employer_name TEXT,
  business_type TEXT,
  registration_number TEXT,
  tax_id TEXT,
  
  -- Self-employed/Voluntary specific
  person_name TEXT,
  ssn TEXT,
  date_of_birth DATE,
  
  -- Common fields
  email TEXT,
  phone TEXT,
  address TEXT,
  zone_id UUID,
  
  -- Assignment
  assigned_inspector_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  documents JSONB DEFAULT '[]'::jsonb, -- uploaded documents
  notes TEXT,
  education_completed BOOLEAN DEFAULT false,
  education_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 2. C3 FILING SYSTEM
-- =====================================================

-- C3 Submissions Table
CREATE TABLE c3_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  c3_number TEXT UNIQUE,
  employer_id UUID NOT NULL,
  filing_period TEXT NOT NULL, -- YYYY-MM format
  
  status c3_filing_status DEFAULT 'draft',
  submission_method TEXT, -- 'online', 'paper_scanned', 'paper_manual'
  
  -- Totals
  total_employees INTEGER DEFAULT 0,
  total_wages NUMERIC(12,2) DEFAULT 0,
  total_ss_contribution NUMERIC(12,2) DEFAULT 0,
  total_levy_contribution NUMERIC(12,2) DEFAULT 0,
  total_ei_contribution NUMERIC(12,2) DEFAULT 0,
  
  -- Payment info
  payment_received BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_amount NUMERIC(12,2),
  payment_reference TEXT,
  
  -- Validation
  validation_errors JSONB DEFAULT '[]'::jsonb,
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Query tracking
  query_raised BOOLEAN DEFAULT false,
  query_text TEXT,
  query_response TEXT,
  query_resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Documents
  scanned_document_url TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID,
  posted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- C3 Line Items (employee details)
CREATE TABLE c3_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  c3_id UUID REFERENCES c3_submissions(id) ON DELETE CASCADE,
  
  line_number INTEGER,
  employee_ssn TEXT,
  employee_name TEXT,
  
  weeks_worked INTEGER,
  wages_paid NUMERIC(10,2),
  holidays NUMERIC(10,2) DEFAULT 0,
  overtime NUMERIC(10,2) DEFAULT 0,
  
  ss_contribution NUMERIC(10,2),
  levy_contribution NUMERIC(10,2),
  ei_contribution NUMERIC(10,2),
  
  -- Validation flags
  under_age BOOLEAN DEFAULT false,
  over_age BOOLEAN DEFAULT false,
  invalid_ssn BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. ARREARS & DEBT TRACKING
-- =====================================================

-- Arrears Ledger
CREATE TABLE compliance_arrears (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL,
  
  period TEXT NOT NULL, -- YYYY-MM
  period_type TEXT, -- 'current', 'arrears'
  
  -- Amounts owed
  ss_owed NUMERIC(12,2) DEFAULT 0,
  levy_owed NUMERIC(12,2) DEFAULT 0,
  ei_owed NUMERIC(12,2) DEFAULT 0,
  penalties NUMERIC(12,2) DEFAULT 0,
  interest NUMERIC(12,2) DEFAULT 0,
  
  -- Payments
  amount_paid NUMERIC(12,2) DEFAULT 0,
  outstanding_balance NUMERIC(12,2) DEFAULT 0,
  
  -- Status
  is_estimated BOOLEAN DEFAULT false,
  payment_plan_id UUID,
  escalated_to_legal BOOLEAN DEFAULT false,
  escalation_date TIMESTAMP WITH TIME ZONE,
  
  due_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment Plans
CREATE TABLE compliance_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL,
  
  total_debt NUMERIC(12,2) NOT NULL,
  installment_amount NUMERIC(12,2) NOT NULL,
  frequency TEXT NOT NULL, -- 'weekly', 'bi-weekly', 'monthly'
  number_of_installments INTEGER NOT NULL,
  
  status payment_plan_status DEFAULT 'active',
  
  start_date DATE NOT NULL,
  next_due_date DATE,
  
  -- Agreement
  agreement_document_url TEXT,
  agreement_signed BOOLEAN DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Terms
  terms TEXT,
  conditions JSONB,
  
  -- Tracking
  installments_paid INTEGER DEFAULT 0,
  total_paid NUMERIC(12,2) DEFAULT 0,
  
  broken_date TIMESTAMP WITH TIME ZONE,
  broken_reason TEXT,
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment Plan Installments
CREATE TABLE payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID REFERENCES compliance_payment_plans(id) ON DELETE CASCADE,
  
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  
  paid BOOLEAN DEFAULT false,
  paid_date TIMESTAMP WITH TIME ZONE,
  paid_amount NUMERIC(12,2),
  payment_reference TEXT,
  
  overdue BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 4. AUDITS, SURVEYS, INVESTIGATIONS
-- =====================================================

-- Audit Cases
CREATE TABLE compliance_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE,
  
  audit_type audit_type NOT NULL,
  status audit_status DEFAULT 'assigned',
  
  -- Subject
  employer_id UUID NOT NULL,
  employer_name TEXT,
  
  -- Source
  source_description TEXT,
  complaint_details TEXT,
  referral_source TEXT,
  
  -- Assignment
  assigned_inspector_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  
  -- Findings
  findings TEXT,
  wage_books_reviewed BOOLEAN DEFAULT false,
  employees_interviewed INTEGER DEFAULT 0,
  
  -- Documents
  evidence_documents JSONB DEFAULT '[]'::jsonb,
  wage_book_images JSONB DEFAULT '[]'::jsonb,
  interview_notes JSONB DEFAULT '[]'::jsonb,
  
  -- Outcome
  outcome TEXT,
  penalty_recommended NUMERIC(12,2),
  penalty_approved NUMERIC(12,2),
  
  escalated_to_legal BOOLEAN DEFAULT false,
  escalation_date TIMESTAMP WITH TIME ZONE,
  
  completed_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Interviews
CREATE TABLE audit_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES compliance_audits(id) ON DELETE CASCADE,
  
  employee_name TEXT,
  employee_ssn TEXT,
  position TEXT,
  
  interview_date DATE,
  interviewer_id UUID,
  
  wages_claimed NUMERIC(10,2),
  weeks_worked INTEGER,
  discrepancies TEXT,
  
  notes TEXT,
  signature_data TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 5. INSPECTOR MOBILE WORKFLOW
-- =====================================================

-- Inspector Zones
CREATE TABLE inspector_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL,
  zone_code TEXT UNIQUE,
  description TEXT,
  parishes TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inspector Assignments
CREATE TABLE inspector_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  zone_id UUID REFERENCES inspector_zones(id),
  
  is_primary BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inspector Weekly Plans
CREATE TABLE inspector_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  planned_activities JSONB, -- list of planned visits/audits
  
  submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inspector Activities (field work log)
CREATE TABLE inspector_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  
  activity_type inspector_activity_type NOT NULL,
  activity_date DATE NOT NULL,
  
  -- Subject
  employer_id UUID,
  employer_name TEXT,
  
  -- Location
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  
  -- Details
  purpose TEXT,
  findings TEXT,
  action_taken TEXT,
  
  -- Evidence
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Notice served
  notice_type TEXT,
  notice_served BOOLEAN DEFAULT false,
  employer_signature_data TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 6. SELF-EMPLOYED & VOLUNTARY CONTRIBUTIONS
-- =====================================================

-- Contributor Registrations (links to compliance_registrations)
CREATE TABLE contributor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES compliance_registrations(id),
  
  contributor_type compliance_registration_type NOT NULL, -- 'self_employed' or 'voluntary'
  
  ssn TEXT UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  
  -- Category
  contribution_category contribution_category NOT NULL,
  category_effective_date DATE,
  category_change_count INTEGER DEFAULT 0,
  last_category_change DATE,
  
  -- Status
  active BOOLEAN DEFAULT true,
  enrollment_date DATE,
  cessation_date DATE,
  
  -- Contact
  email TEXT,
  phone TEXT,
  address TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Contribution Vouchers
CREATE TABLE contribution_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT UNIQUE,
  
  contributor_id UUID REFERENCES contributor_profiles(id),
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Category at time of voucher
  contribution_category contribution_category NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  is_prorated BOOLEAN DEFAULT false,
  proration_details TEXT,
  
  -- Payment
  paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  payment_method TEXT,
  
  -- Status
  overdue BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Remittance Calendar
CREATE TABLE remittance_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID REFERENCES contributor_profiles(id),
  
  frequency TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'annually'
  next_due_date DATE NOT NULL,
  
  auto_generate_voucher BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 7. LEGAL & WAIVER ESCALATION
-- =====================================================

-- Compliance Waivers
CREATE TABLE compliance_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_number TEXT UNIQUE,
  
  -- Subject
  employer_id UUID,
  case_reference TEXT,
  
  -- Request
  amount_requested NUMERIC(12,2) NOT NULL,
  penalties_to_waive NUMERIC(12,2),
  interest_to_waive NUMERIC(12,2),
  
  justification TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Approval workflow
  status waiver_status DEFAULT 'pending',
  
  requested_by UUID,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  manager_reviewed BOOLEAN DEFAULT false,
  manager_id UUID,
  manager_decision TEXT,
  manager_comments TEXT,
  manager_reviewed_at TIMESTAMP WITH TIME ZONE,
  
  legal_reviewed BOOLEAN DEFAULT false,
  legal_officer_id UUID,
  legal_decision TEXT,
  legal_comments TEXT,
  legal_reviewed_at TIMESTAMP WITH TIME ZONE,
  
  director_approved BOOLEAN DEFAULT false,
  director_id UUID,
  director_decision TEXT,
  director_comments TEXT,
  director_approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Final outcome
  approved_amount NUMERIC(12,2),
  conditions TEXT,
  
  agreement_signed BOOLEAN DEFAULT false,
  agreement_document_url TEXT,
  signature_data TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 8. REPORTING & ACTIVITY LOGS
-- =====================================================

-- Activity Log (comprehensive audit trail)
CREATE TABLE compliance_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type TEXT NOT NULL, -- 'c3', 'audit', 'payment_plan', 'waiver', etc.
  entity_id UUID NOT NULL,
  
  action TEXT NOT NULL,
  description TEXT,
  
  actor_id UUID,
  actor_name TEXT,
  
  metadata JSONB,
  
  ip_address TEXT,
  user_agent TEXT,
  
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Registration indexes
CREATE INDEX idx_compliance_registrations_type ON compliance_registrations(registration_type);
CREATE INDEX idx_compliance_registrations_status ON compliance_registrations(status);
CREATE INDEX idx_compliance_registrations_inspector ON compliance_registrations(assigned_inspector_id);

-- C3 indexes
CREATE INDEX idx_c3_submissions_employer ON c3_submissions(employer_id);
CREATE INDEX idx_c3_submissions_period ON c3_submissions(filing_period);
CREATE INDEX idx_c3_submissions_status ON c3_submissions(status);
CREATE INDEX idx_c3_line_items_c3 ON c3_line_items(c3_id);
CREATE INDEX idx_c3_line_items_ssn ON c3_line_items(employee_ssn);

-- Arrears indexes
CREATE INDEX idx_compliance_arrears_employer ON compliance_arrears(employer_id);
CREATE INDEX idx_compliance_arrears_period ON compliance_arrears(period);
CREATE INDEX idx_payment_plans_employer ON compliance_payment_plans(employer_id);
CREATE INDEX idx_payment_plans_status ON compliance_payment_plans(status);

-- Audit indexes
CREATE INDEX idx_compliance_audits_employer ON compliance_audits(employer_id);
CREATE INDEX idx_compliance_audits_inspector ON compliance_audits(assigned_inspector_id);
CREATE INDEX idx_compliance_audits_status ON compliance_audits(status);
CREATE INDEX idx_compliance_audits_type ON compliance_audits(audit_type);

-- Inspector indexes
CREATE INDEX idx_inspector_activities_inspector ON inspector_activities(inspector_id);
CREATE INDEX idx_inspector_activities_date ON inspector_activities(activity_date);
CREATE INDEX idx_inspector_weekly_plans_inspector ON inspector_weekly_plans(inspector_id);

-- Contributor indexes
CREATE INDEX idx_contributor_profiles_ssn ON contributor_profiles(ssn);
CREATE INDEX idx_contributor_profiles_type ON contributor_profiles(contributor_type);
CREATE INDEX idx_contribution_vouchers_contributor ON contribution_vouchers(contributor_id);
CREATE INDEX idx_contribution_vouchers_paid ON contribution_vouchers(paid);

-- Activity log indexes
CREATE INDEX idx_activity_log_entity ON compliance_activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_timestamp ON compliance_activity_log(timestamp DESC);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_compliance_registrations_updated_at BEFORE UPDATE ON compliance_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_c3_submissions_updated_at BEFORE UPDATE ON c3_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_arrears_updated_at BEFORE UPDATE ON compliance_arrears
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_payment_plans_updated_at BEFORE UPDATE ON compliance_payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_audits_updated_at BEFORE UPDATE ON compliance_audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspector_zones_updated_at BEFORE UPDATE ON inspector_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspector_weekly_plans_updated_at BEFORE UPDATE ON inspector_weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspector_activities_updated_at BEFORE UPDATE ON inspector_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributor_profiles_updated_at BEFORE UPDATE ON contributor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contribution_vouchers_updated_at BEFORE UPDATE ON contribution_vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_remittance_schedule_updated_at BEFORE UPDATE ON remittance_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_waivers_updated_at BEFORE UPDATE ON compliance_waivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE compliance_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE c3_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE c3_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_arrears ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_activity_log ENABLE ROW LEVEL SECURITY;

-- Compliance staff can view and manage most tables
CREATE POLICY "Compliance staff full access" ON compliance_registrations
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON c3_submissions
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON c3_line_items
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON compliance_arrears
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON compliance_payment_plans
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON payment_plan_installments
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON compliance_audits
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON audit_interviews
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON inspector_zones
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON inspector_assignments
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON inspector_weekly_plans
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON inspector_activities
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON contributor_profiles
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON contribution_vouchers
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON remittance_schedule
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff full access" ON compliance_waivers
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Compliance staff can view activity log" ON compliance_activity_log
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));