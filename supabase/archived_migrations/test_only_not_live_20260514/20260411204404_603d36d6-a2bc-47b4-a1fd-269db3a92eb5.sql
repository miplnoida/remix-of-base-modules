
-- 1. CRM Interactions table
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type TEXT NOT NULL,
  officer TEXT,
  outcome TEXT,
  resolution_time_days NUMERIC(5,1),
  notes TEXT,
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  insured_ssn TEXT,
  employer_regno TEXT,
  data_origin TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- 2. Claims to Benefits table
CREATE TABLE IF NOT EXISTS public.claims_to_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id TEXT NOT NULL,
  received_at_crd DATE NOT NULL,
  submitted_to_benefits DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  officer TEXT,
  notes TEXT,
  data_origin TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- 3. Electronic C3 Uploads table
CREATE TABLE IF NOT EXISTS public.electronic_c3_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  c3_period TEXT NOT NULL,
  upload_date DATE NOT NULL,
  upload_method TEXT NOT NULL DEFAULT 'Portal',
  status TEXT NOT NULL DEFAULT 'Pending',
  record_count INTEGER DEFAULT 0,
  data_origin TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- 4. Legal workflow stages table
CREATE TABLE IF NOT EXISTS public.legal_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  colour TEXT,
  description TEXT,
  data_origin TEXT DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

-- Seed CRM interactions
INSERT INTO public.crm_interactions (interaction_type, officer, outcome, resolution_time_days, interaction_date, insured_ssn, notes, data_origin) VALUES
('Phone Call', 'J. Williams', 'Resolved', 1.0, '2024-05-15', '100234', 'Contribution enquiry resolved', 'seed'),
('Phone Call', 'M. Charles', 'Resolved', 0.5, '2024-05-14', '100567', 'Benefits status check', 'seed'),
('Phone Call', 'A. Herbert', 'Escalated', 2.0, '2024-05-13', '100890', 'Dispute on payment amount', 'seed'),
('Walk-in', 'J. Williams', 'Resolved', 0.0, '2024-05-15', '101234', 'C3 form submission assistance', 'seed'),
('Walk-in', 'K. Francis', 'Resolved', 0.0, '2024-05-14', '101567', 'Registration update', 'seed'),
('Walk-in', 'M. Charles', 'Pending', NULL, '2024-05-13', '101890', 'Document collection pending', 'seed'),
('Walk-in', 'A. Herbert', 'Resolved', 0.0, '2024-05-12', '102234', 'Address change processed', 'seed'),
('Email', 'K. Francis', 'Resolved', 1.5, '2024-05-15', '102567', 'Employer registration query', 'seed'),
('Email', 'J. Williams', 'Resolved', 2.0, '2024-05-14', '102890', 'Pension eligibility question', 'seed'),
('Email', 'M. Charles', 'Pending', NULL, '2024-05-13', '103234', 'Awaiting supporting documents', 'seed'),
('Complaint', 'A. Herbert', 'Resolved', 3.5, '2024-05-15', '103567', 'Late payment complaint', 'seed'),
('Complaint', 'K. Francis', 'Escalated', 5.0, '2024-05-14', '103890', 'Service quality complaint', 'seed'),
('Complaint', 'J. Williams', 'Resolved', 2.5, '2024-05-13', '104234', 'Incorrect benefit amount', 'seed'),
('Phone Call', 'K. Francis', 'Resolved', 1.0, '2024-05-12', '104567', 'Contribution history request', 'seed'),
('Phone Call', 'A. Herbert', 'Resolved', 0.5, '2024-05-11', '104890', 'SSN verification', 'seed'),
('Walk-in', 'J. Williams', 'Resolved', 0.0, '2024-05-10', '105234', 'New registration', 'seed'),
('Email', 'M. Charles', 'Resolved', 3.0, '2024-05-09', '105567', 'Maternity benefit query', 'seed'),
('Complaint', 'K. Francis', 'Pending', NULL, '2024-05-08', '105890', 'Delay in cheque issuance', 'seed'),
('Phone Call', 'M. Charles', 'Resolved', 1.0, '2024-04-30', '106234', 'Sickness benefit enquiry', 'seed'),
('Walk-in', 'A. Herbert', 'Resolved', 0.0, '2024-04-29', '106567', 'Funeral grant application', 'seed');

-- Seed claims to benefits
INSERT INTO public.claims_to_benefits (claim_id, received_at_crd, submitted_to_benefits, status, officer, data_origin) VALUES
('CLM-2024-001', '2024-05-10', '2024-05-12', 'Submitted', 'J. Williams', 'seed'),
('CLM-2024-002', '2024-05-11', NULL, 'Pending', 'M. Charles', 'seed'),
('CLM-2024-003', '2024-05-08', '2024-05-09', 'Submitted', 'A. Herbert', 'seed'),
('CLM-2024-004', '2024-05-07', '2024-05-10', 'Submitted', 'K. Francis', 'seed'),
('CLM-2024-005', '2024-05-06', NULL, 'Pending', 'J. Williams', 'seed'),
('CLM-2024-006', '2024-04-28', '2024-04-30', 'Submitted', 'M. Charles', 'seed'),
('CLM-2024-007', '2024-04-25', '2024-04-28', 'Submitted', 'A. Herbert', 'seed'),
('CLM-2024-008', '2024-04-22', '2024-04-24', 'Submitted', 'K. Francis', 'seed'),
('CLM-2024-009', '2024-04-20', NULL, 'Pending', 'J. Williams', 'seed'),
('CLM-2024-010', '2024-04-18', '2024-04-20', 'Submitted', 'M. Charles', 'seed');

-- Seed electronic C3 uploads
INSERT INTO public.electronic_c3_uploads (employer_id, employer_name, c3_period, upload_date, upload_method, status, record_count, data_origin) VALUES
('E-1001', 'Four Seasons Resort', '2024-Q1', '2024-04-05', 'Portal', 'Processed', 145, 'seed'),
('E-1002', 'St. Kitts Marriott', '2024-Q1', '2024-04-08', 'API', 'Processed', 230, 'seed'),
('E-1003', 'SKELEC', '2024-Q1', '2024-04-10', 'Portal', 'Processed', 89, 'seed'),
('E-1004', 'National Bank of SKN', '2024-Q1', '2024-04-12', 'Portal', 'Processed', 112, 'seed'),
('E-1005', 'TDC Group', '2024-Q1', '2024-04-15', 'API', 'Processed', 78, 'seed'),
('E-1001', 'Four Seasons Resort', '2024-Q2', '2024-07-05', 'Portal', 'Processed', 152, 'seed'),
('E-1002', 'St. Kitts Marriott', '2024-Q2', '2024-07-08', 'API', 'Processed', 225, 'seed'),
('E-1003', 'SKELEC', '2024-Q2', '2024-07-10', 'Portal', 'Pending', 91, 'seed'),
('E-1006', 'Ross University', '2024-Q1', '2024-04-18', 'Portal', 'Processed', 310, 'seed'),
('E-1007', 'Kittitian Hill', '2024-Q1', '2024-04-20', 'API', 'Processed', 65, 'seed'),
('E-1008', 'Caribbean Cinemas', '2024-Q1', '2024-04-22', 'Portal', 'Processed', 28, 'seed'),
('E-1006', 'Ross University', '2024-Q2', '2024-07-18', 'Portal', 'Pending', 315, 'seed');

-- Seed legal workflow stages
INSERT INTO public.legal_workflow_stages (name, code, sort_order, active, colour, data_origin) VALUES
('Pre-Legal Review', 'PRE_LEGAL', 1, true, '#94a3b8', 'seed'),
('Filing', 'FILING', 2, true, '#60a5fa', 'seed'),
('Court Proceedings', 'PROCEEDINGS', 3, true, '#a78bfa', 'seed'),
('Judgment', 'JUDGMENT', 4, true, '#f59e0b', 'seed'),
('Enforcement', 'ENFORCEMENT', 5, true, '#ef4444', 'seed'),
('Recovery', 'RECOVERY', 6, true, '#10b981', 'seed'),
('Closure', 'CLOSURE', 7, true, '#6b7280', 'seed');
