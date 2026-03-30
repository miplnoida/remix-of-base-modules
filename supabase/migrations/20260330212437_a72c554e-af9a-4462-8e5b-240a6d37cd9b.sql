
-- ============================
-- Checklist Template Tables
-- ============================

-- Master template table
CREATE TABLE IF NOT EXISTS public.ia_checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.ia_departments(id),
  audit_type TEXT,
  engagement_type TEXT,
  risk_category TEXT,
  control_area TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Template items
CREATE TABLE IF NOT EXISTS public.ia_checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.ia_checklist_templates(id) ON DELETE CASCADE,
  category TEXT,
  question TEXT NOT NULL,
  description TEXT,
  evidence_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add category + template_id columns to checklist
ALTER TABLE public.ia_audit_checklists
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.ia_checklist_templates(id),
  ADD COLUMN IF NOT EXISTS evidence_required BOOLEAN DEFAULT false;

-- ============================
-- Seed Checklist Templates
-- ============================

-- Finance & Accounts template
INSERT INTO public.ia_checklist_templates (id, template_name, description, department_id, audit_type, control_area) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Finance & Accounts — Internal Controls', 'Standard checklist for finance department audits covering financial reporting, controls, and compliance.', '600ca58e-6ad2-4b84-aba8-d453e0411989', 'Planned Audit', 'Financial Controls'),
  ('a1000002-0000-0000-0000-000000000002', 'Treasury & Cash Management', 'Checklist for treasury operations, cash handling, bank reconciliations, and investment controls.', '600ca58e-6ad2-4b84-aba8-d453e0411989', 'Planned Audit', 'Treasury'),
  ('a1000003-0000-0000-0000-000000000003', 'Contributions & Compliance', 'Checklist for employer compliance, C3 submissions, contribution verification, and arrears management.', '21e086d5-0aa4-4081-9ccb-5e247266b170', 'Planned Audit', 'Compliance'),
  ('a1000004-0000-0000-0000-000000000004', 'Benefits & Claims Processing', 'Checklist for benefits processing, claims verification, payment accuracy, and fraud prevention.', '62e712ce-1ea5-414f-ace6-669a1516c0ce', 'Planned Audit', 'Benefits'),
  ('a1000005-0000-0000-0000-000000000005', 'Information Technology', 'IT audit checklist covering access controls, data security, change management, and disaster recovery.', '99c661ad-4030-4400-aaef-859034d7e189', 'Planned Audit', 'IT Controls'),
  ('a1000006-0000-0000-0000-000000000006', 'Human Resources', 'HR audit checklist covering recruitment, payroll, leave management, and employee records.', 'fa78d911-4298-41d9-9ffe-5e15f583e927', 'Planned Audit', 'HR'),
  ('a1000007-0000-0000-0000-000000000007', 'Procurement & Contract Management', 'Checklist for procurement processes, vendor management, contract compliance, and asset tracking.', NULL, 'Planned Audit', 'Procurement'),
  ('a1000008-0000-0000-0000-000000000008', 'General Compliance Audit', 'General-purpose audit checklist suitable for any department review.', NULL, 'Planned Audit', 'General');

-- Finance template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Financial Reporting', 'Are financial statements prepared in accordance with applicable standards?', true, 1),
  ('a1000001-0000-0000-0000-000000000001', 'Financial Reporting', 'Are monthly reconciliations performed and reviewed timely?', true, 2),
  ('a1000001-0000-0000-0000-000000000001', 'Financial Reporting', 'Are journal entries properly authorized and supported?', true, 3),
  ('a1000001-0000-0000-0000-000000000001', 'Internal Controls', 'Is there adequate segregation of duties in financial processes?', true, 4),
  ('a1000001-0000-0000-0000-000000000001', 'Internal Controls', 'Are approval limits documented and enforced?', true, 5),
  ('a1000001-0000-0000-0000-000000000001', 'Internal Controls', 'Are access controls to financial systems adequate?', true, 6),
  ('a1000001-0000-0000-0000-000000000001', 'Budget Management', 'Are budget variances monitored and explained?', true, 7),
  ('a1000001-0000-0000-0000-000000000001', 'Budget Management', 'Are budget transfers properly authorized?', true, 8),
  ('a1000001-0000-0000-0000-000000000001', 'Compliance', 'Are financial policies and procedures current and accessible?', false, 9),
  ('a1000001-0000-0000-0000-000000000001', 'Compliance', 'Is there compliance with statutory reporting requirements?', true, 10);

-- Treasury template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000002-0000-0000-0000-000000000002', 'Cash Management', 'Are daily cash counts performed and reconciled?', true, 1),
  ('a1000002-0000-0000-0000-000000000002', 'Cash Management', 'Is physical access to cash restricted to authorized personnel?', true, 2),
  ('a1000002-0000-0000-0000-000000000002', 'Cash Management', 'Are cash overages/shortages investigated and reported?', true, 3),
  ('a1000002-0000-0000-0000-000000000002', 'Bank Reconciliation', 'Are bank reconciliations prepared monthly?', true, 4),
  ('a1000002-0000-0000-0000-000000000002', 'Bank Reconciliation', 'Are outstanding items aged and investigated?', true, 5),
  ('a1000002-0000-0000-0000-000000000002', 'Bank Reconciliation', 'Are bank signatories current and properly authorized?', true, 6),
  ('a1000002-0000-0000-0000-000000000002', 'Investment Controls', 'Are investment decisions properly authorized?', true, 7),
  ('a1000002-0000-0000-0000-000000000002', 'Investment Controls', 'Are investment returns monitored against benchmarks?', true, 8);

-- Compliance template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000003-0000-0000-0000-000000000003', 'Employer Registration', 'Are employer registrations processed within target timelines?', true, 1),
  ('a1000003-0000-0000-0000-000000000003', 'Employer Registration', 'Is employer documentation complete and verified?', true, 2),
  ('a1000003-0000-0000-0000-000000000003', 'C3 Submissions', 'Are C3 forms submitted on time for the review period?', true, 3),
  ('a1000003-0000-0000-0000-000000000003', 'C3 Submissions', 'Do C3 submissions reconcile with employment records?', true, 4),
  ('a1000003-0000-0000-0000-000000000003', 'C3 Submissions', 'Are discrepancies in C3 data investigated and resolved?', true, 5),
  ('a1000003-0000-0000-0000-000000000003', 'Contributions', 'Are contribution payments verified against C3 submissions?', true, 6),
  ('a1000003-0000-0000-0000-000000000003', 'Contributions', 'Are contribution arrears identified and pursued?', true, 7),
  ('a1000003-0000-0000-0000-000000000003', 'Enforcement', 'Are non-compliant employers flagged for enforcement action?', true, 8),
  ('a1000003-0000-0000-0000-000000000003', 'Enforcement', 'Are penalty calculations accurate and documented?', true, 9);

-- Benefits template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000004-0000-0000-0000-000000000004', 'Claims Processing', 'Are benefit claims processed within service level targets?', true, 1),
  ('a1000004-0000-0000-0000-000000000004', 'Claims Processing', 'Are eligibility criteria properly verified before approval?', true, 2),
  ('a1000004-0000-0000-0000-000000000004', 'Claims Processing', 'Are benefit calculations accurate and documented?', true, 3),
  ('a1000004-0000-0000-0000-000000000004', 'Payment Controls', 'Are benefit payments properly authorized?', true, 4),
  ('a1000004-0000-0000-0000-000000000004', 'Payment Controls', 'Are overpayments identified and recovery actions initiated?', true, 5),
  ('a1000004-0000-0000-0000-000000000004', 'Fraud Prevention', 'Are identity verification procedures followed?', true, 6),
  ('a1000004-0000-0000-0000-000000000004', 'Fraud Prevention', 'Are periodic reviews conducted for ongoing benefit eligibility?', true, 7);

-- IT template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000005-0000-0000-0000-000000000005', 'Access Controls', 'Are user access rights reviewed periodically?', true, 1),
  ('a1000005-0000-0000-0000-000000000005', 'Access Controls', 'Are terminated employee accounts disabled promptly?', true, 2),
  ('a1000005-0000-0000-0000-000000000005', 'Access Controls', 'Is multi-factor authentication enforced for privileged accounts?', true, 3),
  ('a1000005-0000-0000-0000-000000000005', 'Data Security', 'Are data backups performed regularly and tested?', true, 4),
  ('a1000005-0000-0000-0000-000000000005', 'Data Security', 'Is sensitive data encrypted at rest and in transit?', true, 5),
  ('a1000005-0000-0000-0000-000000000005', 'Change Management', 'Are system changes properly authorized, tested, and documented?', true, 6),
  ('a1000005-0000-0000-0000-000000000005', 'Change Management', 'Is there segregation between development and production environments?', true, 7),
  ('a1000005-0000-0000-0000-000000000005', 'Disaster Recovery', 'Is there a documented and tested disaster recovery plan?', true, 8),
  ('a1000005-0000-0000-0000-000000000005', 'Disaster Recovery', 'Are recovery time objectives (RTO) defined and achievable?', true, 9);

-- HR template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000006-0000-0000-0000-000000000006', 'Recruitment', 'Are recruitment processes documented and followed?', true, 1),
  ('a1000006-0000-0000-0000-000000000006', 'Recruitment', 'Are background checks conducted for new hires?', true, 2),
  ('a1000006-0000-0000-0000-000000000006', 'Payroll', 'Are payroll calculations verified before processing?', true, 3),
  ('a1000006-0000-0000-0000-000000000006', 'Payroll', 'Are payroll changes authorized and documented?', true, 4),
  ('a1000006-0000-0000-0000-000000000006', 'Leave Management', 'Are leave records accurate and up to date?', true, 5),
  ('a1000006-0000-0000-0000-000000000006', 'Leave Management', 'Is leave approval compliant with policy?', false, 6),
  ('a1000006-0000-0000-0000-000000000006', 'Employee Records', 'Are personnel files complete and securely maintained?', true, 7);

-- Procurement template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000007-0000-0000-0000-000000000007', 'Purchasing Process', 'Are purchase requisitions properly authorized?', true, 1),
  ('a1000007-0000-0000-0000-000000000007', 'Purchasing Process', 'Are competitive quotes obtained as per policy thresholds?', true, 2),
  ('a1000007-0000-0000-0000-000000000007', 'Purchasing Process', 'Are purchase orders issued before goods/services receipt?', true, 3),
  ('a1000007-0000-0000-0000-000000000007', 'Vendor Management', 'Is there a vendor evaluation and selection process?', true, 4),
  ('a1000007-0000-0000-0000-000000000007', 'Vendor Management', 'Are vendor relationships reviewed for conflicts of interest?', false, 5),
  ('a1000007-0000-0000-0000-000000000007', 'Contract Management', 'Are contracts reviewed by legal before execution?', true, 6),
  ('a1000007-0000-0000-0000-000000000007', 'Contract Management', 'Are contract deliverables monitored and enforced?', true, 7),
  ('a1000007-0000-0000-0000-000000000007', 'Asset Tracking', 'Are assets tagged and recorded in the asset register?', true, 8);

-- General template items
INSERT INTO public.ia_checklist_template_items (template_id, category, question, evidence_required, sort_order) VALUES
  ('a1000008-0000-0000-0000-000000000008', 'Governance', 'Are policies and procedures documented and current?', false, 1),
  ('a1000008-0000-0000-0000-000000000008', 'Governance', 'Is there a clear organizational structure with defined responsibilities?', false, 2),
  ('a1000008-0000-0000-0000-000000000008', 'Operations', 'Are key processes documented with adequate controls?', true, 3),
  ('a1000008-0000-0000-0000-000000000008', 'Operations', 'Are operational risks identified and managed?', true, 4),
  ('a1000008-0000-0000-0000-000000000008', 'Record Keeping', 'Are records maintained in accordance with retention policies?', true, 5),
  ('a1000008-0000-0000-0000-000000000008', 'Record Keeping', 'Is physical and electronic filing organized and accessible?', false, 6),
  ('a1000008-0000-0000-0000-000000000008', 'Compliance', 'Are regulatory requirements identified and monitored?', true, 7),
  ('a1000008-0000-0000-0000-000000000008', 'Compliance', 'Are previous audit findings addressed and implemented?', true, 8);
