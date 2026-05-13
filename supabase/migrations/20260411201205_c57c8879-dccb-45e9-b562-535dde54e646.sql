
-- =============================================
-- 1. ce_compliance_policies
-- =============================================
CREATE TABLE public.ce_compliance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_code VARCHAR(30) NOT NULL,
  policy_version VARCHAR(10) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  c3_grace_period_days INTEGER NOT NULL DEFAULT 7,
  c3_submission_deadline_day INTEGER NOT NULL DEFAULT 28,
  payment_due_date_day INTEGER NOT NULL DEFAULT 28,
  penalty_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  interest_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  penalty_calc_frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  min_audit_frequency_months INTEGER NOT NULL DEFAULT 24,
  arrears_escalation_threshold NUMERIC(15,2) NOT NULL DEFAULT 50000,
  auto_violation_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  violation_prefix_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  activated_by VARCHAR(100),
  activated_at TIMESTAMPTZ,
  deactivated_by VARCHAR(100),
  deactivated_at TIMESTAMPTZ,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(policy_code, policy_version)
);

-- =============================================
-- 2. ce_notice_templates
-- =============================================
CREATE TABLE public.ce_notice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code VARCHAR(30) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. ce_legal_escalation_policies
-- =============================================
CREATE TABLE public.ce_legal_escalation_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_code VARCHAR(30) NOT NULL,
  policy_version VARCHAR(10) NOT NULL,
  policy_name VARCHAR(200) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  evaluation_frequency VARCHAR(20) NOT NULL DEFAULT 'WEEKLY',
  last_evaluation_date TIMESTAMPTZ,
  next_evaluation_date TIMESTAMPTZ,
  notes TEXT,
  activated_by VARCHAR(100),
  activated_at TIMESTAMPTZ,
  deactivated_by VARCHAR(100),
  deactivated_at TIMESTAMPTZ,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(policy_code, policy_version)
);

-- =============================================
-- 4. ce_legal_escalation_policy_rules
-- =============================================
CREATE TABLE public.ce_legal_escalation_policy_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.ce_legal_escalation_policies(id) ON DELETE CASCADE,
  rule_name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(30) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  age_days_overdue INTEGER,
  consecutive_months_missing INTEGER,
  total_arrears_threshold NUMERIC(15,2),
  single_period_threshold NUMERIC(15,2),
  notices_sent_minimum INTEGER,
  no_response_days INTEGER,
  payment_plan_breaches_count INTEGER,
  audit_refused_count INTEGER,
  risk_band_minimum VARCHAR(20),
  risk_score_minimum NUMERIC(5,2),
  combine_with_age_threshold BOOLEAN DEFAULT false,
  trigger_condition VARCHAR(5) NOT NULL DEFAULT 'AND',
  auto_mark_legal_recommended BOOLEAN NOT NULL DEFAULT true,
  notify_compliance_officer BOOLEAN NOT NULL DEFAULT true,
  notify_supervisor BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ce_legal_esc_rules_policy ON public.ce_legal_escalation_policy_rules(policy_id);

-- =============================================
-- 5. ce_case_status_masters
-- =============================================
CREATE TABLE public.ce_case_status_masters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_code VARCHAR(30) NOT NULL UNIQUE,
  status_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. ce_arrangement_policies
-- =============================================
CREATE TABLE public.ce_arrangement_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_code VARCHAR(30) NOT NULL UNIQUE,
  policy_name VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_arrangement_months INTEGER NOT NULL DEFAULT 24,
  min_down_payment_percent NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  max_missed_installments INTEGER NOT NULL DEFAULT 2,
  breach_grace_days INTEGER NOT NULL DEFAULT 7,
  auto_terminate_on_breach BOOLEAN NOT NULL DEFAULT false,
  interest_on_arrangement BOOLEAN NOT NULL DEFAULT false,
  arrangement_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SEED DATA
-- =============================================

-- Compliance Policies
INSERT INTO public.ce_compliance_policies (policy_code, policy_version, effective_from, effective_to, is_active, c3_grace_period_days, c3_submission_deadline_day, payment_due_date_day, penalty_rate_percent, interest_rate_percent, penalty_calc_frequency, min_audit_frequency_months, arrears_escalation_threshold, auto_violation_rules, violation_prefix_config, notes, activated_by, activated_at, deactivated_by, deactivated_at, created_by)
VALUES
('POL-2024-001', 'v1.0', '2024-01-01', '2024-02-28', false, 7, 28, 28, 3.0, 2.0, 'monthly', 24, 75000,
 '[{"ruleId":"RULE-001","triggerEvent":"C3 Submitted After Grace Period","violationType":"LATE_C3_SUBMISSION","enabled":true,"description":"Create violation when C3 is submitted after the grace period expires"},{"ruleId":"RULE-002","triggerEvent":"C3 Not Submitted By Cutoff","violationType":"C3_NOT_SUBMITTED","enabled":true,"description":"Create violation when C3 is not submitted by the final deadline"},{"ruleId":"RULE-003","triggerEvent":"Payment Not Received","violationType":"C3_SUBMITTED_NO_PAYMENT","enabled":true,"description":"Create violation when C3 is submitted but payment is not received"},{"ruleId":"RULE-004","triggerEvent":"Validation Errors Detected","violationType":"C3_VALIDATION_ERROR","enabled":false,"description":"Create violation when validation errors are detected in C3 submission"},{"ruleId":"RULE-005","triggerEvent":"Arrears Exceed Threshold","violationType":"ARREARS_CASE","enabled":true,"description":"Create violation when total arrears exceed the configured threshold"},{"ruleId":"RULE-006","triggerEvent":"Payment Arrangement Defaulted","violationType":"PAYMENT_ARRANGEMENT_DEFAULT","enabled":true,"description":"Create violation when payment arrangement installment is missed"}]'::jsonb,
 '{"automaticPrefix":"VIOA","manualPrefix":"VIOM","numberFormat":"YYYY-NNNN","startingNumber":1,"currentNumber":1}'::jsonb,
 'Initial policy configuration for 2024', 'admin.user', '2024-01-01', 'admin.user', '2024-03-01', 'admin.user'),
('POL-2024-002', 'v2.0', '2024-03-01', NULL, true, 5, 28, 28, 2.5, 1.5, 'monthly', 18, 50000,
 '[{"ruleId":"RULE-001","triggerEvent":"C3 Submitted After Grace Period","violationType":"LATE_C3_SUBMISSION","enabled":true,"description":"Create violation when C3 is submitted after the grace period expires"},{"ruleId":"RULE-002","triggerEvent":"C3 Not Submitted By Cutoff","violationType":"C3_NOT_SUBMITTED","enabled":true,"description":"Create violation when C3 is not submitted by the final deadline"},{"ruleId":"RULE-003","triggerEvent":"Payment Not Received","violationType":"C3_SUBMITTED_NO_PAYMENT","enabled":true,"description":"Create violation when C3 is submitted but payment is not received"},{"ruleId":"RULE-004","triggerEvent":"Validation Errors Detected","violationType":"C3_VALIDATION_ERROR","enabled":true,"description":"Create violation when validation errors are detected"},{"ruleId":"RULE-005","triggerEvent":"Arrears Exceed Threshold","violationType":"ARREARS_CASE","enabled":true,"description":"Create violation when total arrears exceed the configured threshold"},{"ruleId":"RULE-006","triggerEvent":"Payment Arrangement Defaulted","violationType":"PAYMENT_ARRANGEMENT_DEFAULT","enabled":true,"description":"Create violation when payment arrangement installment is missed"}]'::jsonb,
 '{"automaticPrefix":"VIOA","manualPrefix":"VIOM","numberFormat":"YYYY-NNNN","startingNumber":1,"currentNumber":247}'::jsonb,
 'Updated policy with reduced grace period and escalation threshold', 'admin.user', '2024-03-01', NULL, NULL, 'admin.user');

-- Notice Templates
INSERT INTO public.ce_notice_templates (template_code, template_name, category, channel, subject, body, variables, is_active, sort_order, created_by)
VALUES
('TPL-VN-001', 'Late C3 Submission Notice', 'Violation Notice', 'email',
 'Notice of Late C3 Submission - {{violation_number}}',
 E'Dear {{employer_name}},\n\nThis is to notify you that your C3 submission for the period {{period}} was received after the statutory deadline.\n\nViolation Reference: {{violation_number}}\nPenalty Amount: {{penalty_amount}}\nDue Date: {{due_date}}\n\nPlease remit the outstanding amount by {{deadline_date}} to avoid further enforcement action.\n\nRegards,\nCompliance & Enforcement Division\nSt. Kitts & Nevis Social Security Board',
 ARRAY['employer_name','period','violation_number','penalty_amount','due_date','deadline_date'], true, 1, 'admin.user'),
('TPL-PR-001', 'Payment Reminder SMS', 'Payment Reminder', 'sms',
 'Payment Reminder',
 'REMINDER: {{employer_name}}, your payment of {{amount_due}} for {{period}} is due on {{due_date}}. Ref: {{case_number}}. Contact SSB for assistance.',
 ARRAY['employer_name','amount_due','period','due_date','case_number'], true, 2, 'admin.user'),
('TPL-HS-001', 'Court Hearing Summons', 'Hearing Summons', 'letter',
 'Summons to Appear - Case {{case_number}}',
 E'Dear {{employer_name}},\n\nYou are hereby summoned to appear before the Magistrate Court in connection with non-compliance proceedings.\n\nCase Number: {{case_number}}\nHearing Date: {{hearing_date}}\nLocation: {{hearing_location}}\n\nFailure to appear may result in a warrant being issued.\n\nIssued by,\nLegal Division\nSt. Kitts & Nevis Social Security Board',
 ARRAY['employer_name','case_number','hearing_date','hearing_location'], true, 3, 'admin.user'),
('TPL-PA-001', 'Penalty Assessment Notice', 'Penalty Assessment', 'email',
 'Penalty Assessment - {{violation_number}}',
 E'Dear {{employer_name}},\n\nFollowing a review of your compliance record, the following penalties have been assessed:\n\nViolation: {{violation_type}}\nReference: {{violation_number}}\nPenalty: {{penalty_amount}}\nInterest: {{interest_amount}}\nTotal Due: {{amount_due}}\nDue Date: {{due_date}}\n\nYou may request a review within 14 days of this notice.\n\nCompliance & Enforcement Division',
 ARRAY['employer_name','violation_type','violation_number','penalty_amount','interest_amount','amount_due','due_date'], true, 4, 'admin.user'),
('TPL-AC-001', 'Arrangement Confirmation', 'Arrangement Confirmation', 'email',
 'Payment Arrangement Confirmed - {{arrangement_id}}',
 E'Dear {{employer_name}},\n\nYour payment arrangement has been approved.\n\nArrangement ID: {{arrangement_id}}\nTotal Debt: {{total_arrears}}\nInstallment Amount: {{installment_amount}}\nFirst Payment Due: {{next_payment_date}}\n\nPlease ensure timely payments to avoid breach of this arrangement.\n\nCompliance & Enforcement Division',
 ARRAY['employer_name','arrangement_id','total_arrears','installment_amount','next_payment_date'], true, 5, 'admin.user'),
('TPL-BW-001', 'Breach Warning', 'Breach Warning', 'email',
 'WARNING: Payment Arrangement Breach - {{arrangement_id}}',
 E'Dear {{employer_name}},\n\nYour payment arrangement {{arrangement_id}} is in breach due to a missed installment.\n\nMissed Amount: {{installment_amount}}\nDue Date: {{due_date}}\n\nIf payment is not received within 7 days, the arrangement will be terminated and the full balance of {{total_arrears}} will become immediately due.\n\nCompliance & Enforcement Division',
 ARRAY['employer_name','arrangement_id','installment_amount','due_date','total_arrears'], true, 6, 'admin.user'),
('TPL-FD-001', 'Final Demand Letter', 'Final Demand', 'letter',
 'FINAL DEMAND - Outstanding Amount {{amount_due}}',
 E'Dear {{employer_name}},\n\nDespite previous correspondence, the amount of {{amount_due}} remains outstanding for period {{period}}.\n\nThis is a FINAL DEMAND. If payment is not received by {{deadline_date}}, legal proceedings will be initiated without further notice.\n\nCase Reference: {{case_number}}\n\nLegal Division\nSt. Kitts & Nevis Social Security Board',
 ARRAY['employer_name','amount_due','period','deadline_date','case_number'], true, 7, 'admin.user');

-- Legal Escalation Policy
INSERT INTO public.ce_legal_escalation_policies (policy_code, policy_version, policy_name, effective_from, effective_to, is_active, evaluation_frequency, notes, activated_by, activated_at, created_by)
VALUES
('LEP-2024-001', 'v1.0', 'Standard Legal Escalation Policy', '2024-01-01', NULL, true, 'WEEKLY', 'Default escalation policy for contribution non-compliance', 'admin.user', '2024-01-01', 'admin.user');

-- Legal Escalation Policy Rules
INSERT INTO public.ce_legal_escalation_policy_rules (policy_id, rule_name, rule_type, description, is_enabled, priority, age_days_overdue, trigger_condition, auto_mark_legal_recommended, notify_compliance_officer, notify_supervisor, created_by)
VALUES
((SELECT id FROM public.ce_legal_escalation_policies WHERE policy_code='LEP-2024-001'), 'Arrears Over 90 Days', 'AGE_THRESHOLD', 'Escalate if contribution arrears exceed 90 days past due', true, 1, 90, 'AND', true, true, true, 'admin.user');

INSERT INTO public.ce_legal_escalation_policy_rules (policy_id, rule_name, rule_type, description, is_enabled, priority, total_arrears_threshold, trigger_condition, auto_mark_legal_recommended, notify_compliance_officer, notify_supervisor, created_by)
VALUES
((SELECT id FROM public.ce_legal_escalation_policies WHERE policy_code='LEP-2024-001'), 'High Amount Threshold', 'AMOUNT_THRESHOLD', 'Escalate if total arrears exceed EC$50,000', true, 2, 50000, 'AND', true, true, false, 'admin.user');

INSERT INTO public.ce_legal_escalation_policy_rules (policy_id, rule_name, rule_type, description, is_enabled, priority, notices_sent_minimum, no_response_days, payment_plan_breaches_count, trigger_condition, auto_mark_legal_recommended, notify_compliance_officer, notify_supervisor, created_by)
VALUES
((SELECT id FROM public.ce_legal_escalation_policies WHERE policy_code='LEP-2024-001'), 'Non-Responsive Employer', 'BEHAVIOUR_THRESHOLD', 'Escalate if employer ignores 3+ notices with no response for 30 days', true, 3, 3, 30, 2, 'OR', true, true, true, 'admin.user');

INSERT INTO public.ce_legal_escalation_policy_rules (policy_id, rule_name, rule_type, description, is_enabled, priority, risk_band_minimum, risk_score_minimum, combine_with_age_threshold, age_days_overdue, trigger_condition, auto_mark_legal_recommended, notify_compliance_officer, notify_supervisor, created_by)
VALUES
((SELECT id FROM public.ce_legal_escalation_policies WHERE policy_code='LEP-2024-001'), 'Critical Risk Band', 'RISK_THRESHOLD', 'Escalate if employer is in Critical risk band with score above 80', true, 4, 'Critical', 80, true, 60, 'AND', true, true, true, 'admin.user');

INSERT INTO public.ce_legal_escalation_policy_rules (policy_id, rule_name, rule_type, description, is_enabled, priority, age_days_overdue, total_arrears_threshold, notices_sent_minimum, no_response_days, trigger_condition, auto_mark_legal_recommended, notify_compliance_officer, notify_supervisor, created_by)
VALUES
((SELECT id FROM public.ce_legal_escalation_policies WHERE policy_code='LEP-2024-001'), 'Combined Escalation', 'COMBINED', 'Escalate if arrears over 60 days AND amount exceeds EC$25,000 AND 2+ notices sent', false, 5, 60, 25000, 2, 14, 'AND', true, true, false, 'admin.user');

-- Case Status Masters
INSERT INTO public.ce_case_status_masters (status_code, status_name, description, category, is_terminal, sort_order) VALUES
('CASE_OPEN', 'Open', 'Case is active and under investigation', 'case', false, 1),
('CASE_IN_PROGRESS', 'In Progress', 'Case is being actively managed', 'case', false, 2),
('CASE_PENDING_REVIEW', 'Pending Review', 'Awaiting supervisor review', 'case', false, 3),
('CASE_ESCALATED', 'Escalated', 'Escalated to senior management or legal', 'case', false, 4),
('CASE_RESOLVED', 'Resolved', 'Case resolved — employer now compliant', 'case', true, 5),
('CASE_CLOSED', 'Closed', 'Case closed — no further action', 'case', true, 6),
('VIO_DETECTED', 'Detected', 'Violation detected by system or inspector', 'violation', false, 1),
('VIO_CONFIRMED', 'Confirmed', 'Violation confirmed after review', 'violation', false, 2),
('VIO_NOTICE_SENT', 'Notice Sent', 'Formal notice issued to employer', 'violation', false, 3),
('VIO_UNDER_APPEAL', 'Under Appeal', 'Employer has appealed the violation', 'violation', false, 4),
('VIO_RESOLVED', 'Resolved', 'Violation resolved — penalty paid or waived', 'violation', true, 5),
('VIO_DISMISSED', 'Dismissed', 'Violation dismissed after review', 'violation', true, 6),
('ARR_PROPOSED', 'Proposed', 'Arrangement proposed to employer', 'arrangement', false, 1),
('ARR_ACTIVE', 'Active', 'Arrangement active — installments being collected', 'arrangement', false, 2),
('ARR_IN_BREACH', 'In Breach', 'One or more installments missed', 'arrangement', false, 3),
('ARR_COMPLETED', 'Completed', 'All installments paid — arrangement fulfilled', 'arrangement', true, 4),
('ARR_TERMINATED', 'Terminated', 'Arrangement terminated due to breach', 'arrangement', true, 5),
('ARR_CANCELLED', 'Cancelled', 'Arrangement cancelled before completion', 'arrangement', true, 6);

-- Arrangement Policies
INSERT INTO public.ce_arrangement_policies (policy_code, policy_name, is_active, max_arrangement_months, min_down_payment_percent, max_missed_installments, breach_grace_days, auto_terminate_on_breach, interest_on_arrangement, arrangement_interest_rate, notes, created_by)
VALUES
('AP-STD-001', 'Standard Payment Arrangement', true, 24, 10.0, 2, 7, false, false, 0.0, 'Default arrangement policy for employers with arrears under EC$100,000', 'admin.user'),
('AP-HRD-001', 'Hardship Arrangement', true, 36, 5.0, 3, 14, false, false, 0.0, 'Extended arrangement for employers demonstrating financial hardship', 'admin.user');
