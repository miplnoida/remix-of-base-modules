-- =====================================================
-- BeMA COMPLIANCE MANAGEMENT - SEPARATE MODULE
-- =====================================================

-- New enums for BeMA compliance (different from legal module)
CREATE TYPE bema_registration_type AS ENUM ('employer', 'self_employed', 'voluntary');
CREATE TYPE bema_registration_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'inactive', 'suspended');
CREATE TYPE bema_c3_status AS ENUM ('draft', 'submitted', 'validated', 'posted', 'rejected', 'query_raised');
CREATE TYPE bema_audit_type AS ENUM ('random', 'complaint', 'referral', 'follow_up', 'scouting', 'investigation');
CREATE TYPE bema_audit_status AS ENUM ('assigned', 'in_progress', 'completed', 'escalated', 'closed');
CREATE TYPE bema_inspector_activity AS ENUM ('inspection', 'audit', 'investigation', 'scouting', 'education', 'notice_service');
CREATE TYPE bema_plan_status AS ENUM ('active', 'completed', 'broken', 'escalated');
CREATE TYPE bema_waiver_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE bema_category AS ENUM ('cat_a', 'cat_b', 'cat_c', 'cat_d', 'cat_e');

-- =====================================================
-- 1. REGISTRATION & ONBOARDING
-- =====================================================

CREATE TABLE bema_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_type bema_registration_type NOT NULL,
  status bema_registration_status DEFAULT 'pending',
  
  -- Employer specific
  employer_name TEXT,
  business_type TEXT,
  registration_number TEXT,
  tax_id TEXT,
  
  -- Self-employed/Voluntary specific
  person_name TEXT,
  ssn TEXT,
  date_of_birth DATE,
  
  -- Common
  email TEXT,
  phone TEXT,
  address TEXT,
  zone_id UUID,
  
  -- Assignment
  assigned_inspector_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  documents JSONB DEFAULT '[]'::jsonb,
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

CREATE TABLE bema_c3_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  c3_number TEXT UNIQUE,
  employer_id UUID NOT NULL,
  filing_period TEXT NOT NULL,
  
  status bema_c3_status DEFAULT 'draft',
  submission_method TEXT,
  
  -- Totals
  total_employees INTEGER DEFAULT 0,
  total_wages NUMERIC(12,2) DEFAULT 0,
  total_ss_contribution NUMERIC(12,2) DEFAULT 0,
  total_levy_contribution NUMERIC(12,2) DEFAULT 0,
  total_ei_contribution NUMERIC(12,2) DEFAULT 0,
  
  -- Payment
  payment_received BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_amount NUMERIC(12,2),
  payment_reference TEXT,
  
  -- Validation
  validation_errors JSONB DEFAULT '[]'::jsonb,
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Queries
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

CREATE TABLE bema_c3_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  c3_id UUID REFERENCES bema_c3_submissions(id) ON DELETE CASCADE,
  
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
  
  under_age BOOLEAN DEFAULT false,
  over_age BOOLEAN DEFAULT false,
  invalid_ssn BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. ARREARS & DEBT TRACKING
-- =====================================================

CREATE TABLE bema_arrears_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL,
  
  period TEXT NOT NULL,
  period_type TEXT,
  
  ss_owed NUMERIC(12,2) DEFAULT 0,
  levy_owed NUMERIC(12,2) DEFAULT 0,
  ei_owed NUMERIC(12,2) DEFAULT 0,
  penalties NUMERIC(12,2) DEFAULT 0,
  interest NUMERIC(12,2) DEFAULT 0,
  
  amount_paid NUMERIC(12,2) DEFAULT 0,
  outstanding_balance NUMERIC(12,2) DEFAULT 0,
  
  is_estimated BOOLEAN DEFAULT false,
  payment_plan_id UUID,
  escalated_to_legal BOOLEAN DEFAULT false,
  escalation_date TIMESTAMP WITH TIME ZONE,
  
  due_date TIMESTAMP WITH TIME ZONE,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL,
  
  total_debt NUMERIC(12,2) NOT NULL,
  installment_amount NUMERIC(12,2) NOT NULL,
  frequency TEXT NOT NULL,
  number_of_installments INTEGER NOT NULL,
  
  status bema_plan_status DEFAULT 'active',
  
  start_date DATE NOT NULL,
  next_due_date DATE,
  
  agreement_document_url TEXT,
  agreement_signed BOOLEAN DEFAULT false,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  
  terms TEXT,
  conditions JSONB,
  
  installments_paid INTEGER DEFAULT 0,
  total_paid NUMERIC(12,2) DEFAULT 0,
  
  broken_date TIMESTAMP WITH TIME ZONE,
  broken_reason TEXT,
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID REFERENCES bema_payment_plans(id) ON DELETE CASCADE,
  
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
-- 4. AUDITS & INVESTIGATIONS
-- =====================================================

CREATE TABLE bema_audit_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE,
  
  audit_type bema_audit_type NOT NULL,
  status bema_audit_status DEFAULT 'assigned',
  
  employer_id UUID NOT NULL,
  employer_name TEXT,
  
  source_description TEXT,
  complaint_details TEXT,
  referral_source TEXT,
  
  assigned_inspector_id UUID,
  assigned_at TIMESTAMP WITH TIME ZONE,
  due_date DATE,
  
  findings TEXT,
  wage_books_reviewed BOOLEAN DEFAULT false,
  employees_interviewed INTEGER DEFAULT 0,
  
  evidence_documents JSONB DEFAULT '[]'::jsonb,
  wage_book_images JSONB DEFAULT '[]'::jsonb,
  interview_notes JSONB DEFAULT '[]'::jsonb,
  
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

CREATE TABLE bema_employee_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID REFERENCES bema_audit_cases(id) ON DELETE CASCADE,
  
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
-- 5. INSPECTOR WORKFLOW
-- =====================================================

CREATE TABLE bema_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name TEXT NOT NULL,
  zone_code TEXT UNIQUE,
  description TEXT,
  parishes TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_inspector_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  zone_id UUID REFERENCES bema_zones(id),
  
  is_primary BOOLEAN DEFAULT true,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  planned_activities JSONB,
  
  submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  
  approved BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_field_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id UUID NOT NULL,
  
  activity_type bema_inspector_activity NOT NULL,
  activity_date DATE NOT NULL,
  
  employer_id UUID,
  employer_name TEXT,
  
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  location_lat NUMERIC(10, 8),
  location_lng NUMERIC(11, 8),
  
  purpose TEXT,
  findings TEXT,
  action_taken TEXT,
  
  photos JSONB DEFAULT '[]'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  
  notice_type TEXT,
  notice_served BOOLEAN DEFAULT false,
  employer_signature_data TEXT,
  
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 6. SELF-EMPLOYED & VOLUNTARY
-- =====================================================

CREATE TABLE bema_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES bema_registrations(id),
  
  contributor_type bema_registration_type NOT NULL,
  
  ssn TEXT UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  
  contribution_category bema_category NOT NULL,
  category_effective_date DATE,
  category_change_count INTEGER DEFAULT 0,
  last_category_change DATE,
  
  active BOOLEAN DEFAULT true,
  enrollment_date DATE,
  cessation_date DATE,
  
  email TEXT,
  phone TEXT,
  address TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number TEXT UNIQUE,
  
  contributor_id UUID REFERENCES bema_contributors(id),
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  contribution_category bema_category NOT NULL,
  amount_due NUMERIC(10,2) NOT NULL,
  is_prorated BOOLEAN DEFAULT false,
  proration_details TEXT,
  
  paid BOOLEAN DEFAULT false,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  payment_method TEXT,
  
  overdue BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  generated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE bema_remittance_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID REFERENCES bema_contributors(id),
  
  frequency TEXT NOT NULL,
  next_due_date DATE NOT NULL,
  
  auto_generate_voucher BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 7. WAIVERS
-- =====================================================

CREATE TABLE bema_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_number TEXT UNIQUE,
  
  employer_id UUID,
  case_reference TEXT,
  
  amount_requested NUMERIC(12,2) NOT NULL,
  penalties_to_waive NUMERIC(12,2),
  interest_to_waive NUMERIC(12,2),
  
  justification TEXT NOT NULL,
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  status bema_waiver_status DEFAULT 'pending',
  
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
  
  approved_amount NUMERIC(12,2),
  conditions TEXT,
  
  agreement_signed BOOLEAN DEFAULT false,
  agreement_document_url TEXT,
  signature_data TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 8. ACTIVITY LOG
-- =====================================================

CREATE TABLE bema_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_type TEXT NOT NULL,
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

CREATE INDEX idx_bema_registrations_type ON bema_registrations(registration_type);
CREATE INDEX idx_bema_registrations_status ON bema_registrations(status);
CREATE INDEX idx_bema_c3_employer ON bema_c3_submissions(employer_id);
CREATE INDEX idx_bema_c3_period ON bema_c3_submissions(filing_period);
CREATE INDEX idx_bema_c3_status ON bema_c3_submissions(status);
CREATE INDEX idx_bema_arrears_employer ON bema_arrears_ledger(employer_id);
CREATE INDEX idx_bema_audits_employer ON bema_audit_cases(employer_id);
CREATE INDEX idx_bema_audits_inspector ON bema_audit_cases(assigned_inspector_id);
CREATE INDEX idx_bema_activities_inspector ON bema_field_activities(inspector_id);
CREATE INDEX idx_bema_contributors_ssn ON bema_contributors(ssn);
CREATE INDEX idx_bema_vouchers_contributor ON bema_vouchers(contributor_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_bema_registrations_updated_at BEFORE UPDATE ON bema_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_c3_submissions_updated_at BEFORE UPDATE ON bema_c3_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_arrears_ledger_updated_at BEFORE UPDATE ON bema_arrears_ledger
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_payment_plans_updated_at BEFORE UPDATE ON bema_payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_audit_cases_updated_at BEFORE UPDATE ON bema_audit_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_zones_updated_at BEFORE UPDATE ON bema_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_weekly_plans_updated_at BEFORE UPDATE ON bema_weekly_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_field_activities_updated_at BEFORE UPDATE ON bema_field_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_contributors_updated_at BEFORE UPDATE ON bema_contributors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_vouchers_updated_at BEFORE UPDATE ON bema_vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_remittance_calendar_updated_at BEFORE UPDATE ON bema_remittance_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bema_waivers_updated_at BEFORE UPDATE ON bema_waivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE bema_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_c3_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_c3_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_arrears_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_audit_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_employee_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_inspector_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_field_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_remittance_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bema_activity_log ENABLE ROW LEVEL SECURITY;

-- Staff access policies
CREATE POLICY "Staff full access" ON bema_registrations
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_c3_submissions
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_c3_line_items
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_arrears_ledger
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_payment_plans
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_installments
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_audit_cases
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_employee_interviews
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_zones
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_inspector_assignments
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_weekly_plans
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_field_activities
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_contributors
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_vouchers
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_remittance_calendar
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff full access" ON bema_waivers
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));

CREATE POLICY "Staff can view activity log" ON bema_activity_log
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['Admin'::app_role, 'LegalOfficer'::app_role, 'Supervisor'::app_role, 'Clerk'::app_role]));