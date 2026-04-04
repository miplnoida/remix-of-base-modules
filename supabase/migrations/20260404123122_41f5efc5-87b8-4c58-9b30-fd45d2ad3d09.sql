
-- =====================================================
-- BN Core Claim + Decision Engine
-- =====================================================

-- Core: bn_claim
CREATE TABLE IF NOT EXISTS public.bn_claim (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number varchar(30),
  ssn varchar(20) NOT NULL,
  product_id uuid NOT NULL,
  product_version_id uuid,
  employer_regno varchar(30),
  status varchar(30) NOT NULL DEFAULT 'DRAFT',
  priority varchar(20) NOT NULL DEFAULT 'NORMAL',
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  submission_date timestamptz,
  decision_date timestamptz,
  source varchar(30) NOT NULL DEFAULT 'WALK_IN',
  legacy_claim_ref varchar(50),
  workflow_instance_id uuid,
  assigned_to varchar(50),
  contact_phone varchar(30),
  contact_email varchar(100),
  bank_account varchar(50),
  bank_routing_number varchar(50),
  declaration boolean NOT NULL DEFAULT false,
  digital_signature text,
  entered_by varchar(50),
  modified_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- Core: bn_claim_detail
CREATE TABLE IF NOT EXISTS public.bn_claim_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id) UNIQUE,
  detail_json jsonb NOT NULL DEFAULT '{}',
  entered_by varchar(50),
  modified_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- Core: bn_claim_event
CREATE TABLE IF NOT EXISTS public.bn_claim_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  event_type varchar(50) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  notes text,
  performed_by varchar(50) NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Core: bn_claim_note
CREATE TABLE IF NOT EXISTS public.bn_claim_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  subject varchar(200),
  body text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now()
);

-- Core: bn_claim_document
CREATE TABLE IF NOT EXISTS public.bn_claim_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  document_type_code varchar(30) NOT NULL,
  document_name varchar(200),
  file_name varchar(300),
  file_path text,
  file_size int,
  mime_type varchar(100),
  verified boolean NOT NULL DEFAULT false,
  verified_by varchar(50),
  verified_at timestamptz,
  notes text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now()
);

-- Core: bn_claim_eligibility
CREATE TABLE IF NOT EXISTS public.bn_claim_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  product_version_id uuid,
  check_date timestamptz NOT NULL DEFAULT now(),
  overall_result boolean NOT NULL DEFAULT false,
  rule_results jsonb NOT NULL DEFAULT '[]',
  contribution_summary jsonb DEFAULT '{}',
  override_applied boolean NOT NULL DEFAULT false,
  override_by varchar(50),
  override_reason text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now()
);

-- Core: bn_claim_calculation
CREATE TABLE IF NOT EXISTS public.bn_claim_calculation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  product_version_id uuid,
  calc_date timestamptz NOT NULL DEFAULT now(),
  weekly_rate numeric(12,2),
  monthly_rate numeric(12,2),
  lump_sum numeric(12,2),
  daily_rate numeric(12,2),
  annual_rate numeric(12,2),
  average_weekly_wage numeric(12,2),
  total_contributions int,
  qualifying_weeks int,
  formula_code varchar(50),
  formula_version int,
  inputs jsonb DEFAULT '{}',
  outputs jsonb DEFAULT '{}',
  override_applied boolean NOT NULL DEFAULT false,
  override_by varchar(50),
  override_reason text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now()
);

-- Claim number sequence
CREATE SEQUENCE IF NOT EXISTS bn_claim_number_seq START 1;

-- Auto-generate claim number trigger
CREATE OR REPLACE FUNCTION public.fn_bn_claim_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_number IS NULL THEN
    NEW.claim_number := 'BN-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('bn_claim_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bn_claim_number ON public.bn_claim;
CREATE TRIGGER trg_bn_claim_number
  BEFORE INSERT ON public.bn_claim
  FOR EACH ROW EXECUTE FUNCTION public.fn_bn_claim_number();

-- Audit triggers for core tables
CREATE TRIGGER trg_audit_bn_claim AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_detail AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_detail FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_event AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_event FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_note AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_note FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_document AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_document FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_eligibility AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_eligibility FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_calculation AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_calculation FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

-- =====================================================
-- Decision Engine Tables
-- =====================================================

-- 1. bn_claim_status_def
CREATE TABLE public.bn_claim_status_def (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_code varchar(30) NOT NULL UNIQUE,
  status_label varchar(100) NOT NULL,
  status_group varchar(30) NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false,
  requires_effective_date boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  color_code varchar(20),
  is_active boolean NOT NULL DEFAULT true,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- 2. bn_claim_transition_rule
CREATE TABLE public.bn_claim_transition_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_status varchar(30) NOT NULL REFERENCES public.bn_claim_status_def(status_code),
  to_status varchar(30) NOT NULL REFERENCES public.bn_claim_status_def(status_code),
  action_code varchar(50) NOT NULL,
  action_label varchar(100) NOT NULL,
  allowed_roles text[] NOT NULL DEFAULT '{}',
  product_category varchar(30),
  country_code varchar(10),
  requires_reason boolean NOT NULL DEFAULT false,
  requires_narrative boolean NOT NULL DEFAULT false,
  requires_maker_checker boolean NOT NULL DEFAULT false,
  requires_evidence_complete boolean NOT NULL DEFAULT false,
  requires_eligibility_pass boolean NOT NULL DEFAULT false,
  requires_calculation boolean NOT NULL DEFAULT false,
  min_override_level int,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- 3. bn_reason_code
CREATE TABLE public.bn_reason_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_code varchar(30) NOT NULL UNIQUE,
  reason_label varchar(200) NOT NULL,
  reason_category varchar(50) NOT NULL,
  applicable_actions text[] NOT NULL DEFAULT '{}',
  requires_narrative boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- 4. bn_claim_decision
CREATE TABLE public.bn_claim_decision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  transition_rule_id uuid REFERENCES public.bn_claim_transition_rule(id),
  action_code varchar(50) NOT NULL,
  from_status varchar(30) NOT NULL,
  to_status varchar(30) NOT NULL,
  reason_code_id uuid REFERENCES public.bn_reason_code(id),
  narrative text,
  effective_date date,
  override_id uuid,
  workflow_instance_id uuid,
  workflow_task_id uuid,
  evidence_snapshot jsonb DEFAULT '{}',
  eligibility_snapshot_id uuid,
  calculation_snapshot_id uuid,
  performed_by varchar(50) NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address varchar(45)
);

-- 5. bn_workbasket
CREATE TABLE public.bn_workbasket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_code varchar(50) NOT NULL UNIQUE,
  basket_name varchar(100) NOT NULL,
  description text,
  assigned_role varchar(100) NOT NULL,
  product_category varchar(30),
  country_code varchar(10),
  priority_rules jsonb DEFAULT '{}',
  max_capacity int,
  is_active boolean NOT NULL DEFAULT true,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- 6. bn_claim_queue_assignment
CREATE TABLE public.bn_claim_queue_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  workbasket_id uuid NOT NULL REFERENCES public.bn_workbasket(id),
  assigned_to varchar(50),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  priority int NOT NULL DEFAULT 5,
  due_at timestamptz,
  picked_at timestamptz,
  completed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true
);

-- 7. bn_escalation_policy
CREATE TABLE public.bn_escalation_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code varchar(50) NOT NULL,
  policy_name varchar(100) NOT NULL,
  trigger_type varchar(30) NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}',
  escalation_target_role varchar(100) NOT NULL,
  escalation_target_basket_id uuid REFERENCES public.bn_workbasket(id),
  auto_reassign boolean NOT NULL DEFAULT false,
  notification_template_id uuid,
  severity varchar(20) NOT NULL DEFAULT 'MEDIUM',
  product_category varchar(30),
  country_code varchar(10),
  is_active boolean NOT NULL DEFAULT true,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);

-- 8. bn_escalation_event
CREATE TABLE public.bn_escalation_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id),
  policy_id uuid NOT NULL REFERENCES public.bn_escalation_policy(id),
  trigger_reason text NOT NULL,
  escalated_from_user varchar(50),
  escalated_to_role varchar(100) NOT NULL,
  escalated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_notes text,
  resolved_by varchar(50)
);

-- Audit triggers for decision engine tables
CREATE TRIGGER trg_audit_bn_claim_status_def AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_status_def FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_transition_rule AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_transition_rule FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_reason_code AFTER INSERT OR UPDATE OR DELETE ON public.bn_reason_code FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_decision AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_decision FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_workbasket AFTER INSERT OR UPDATE OR DELETE ON public.bn_workbasket FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_claim_queue_assignment AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_queue_assignment FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_escalation_policy AFTER INSERT OR UPDATE OR DELETE ON public.bn_escalation_policy FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_escalation_event AFTER INSERT OR UPDATE OR DELETE ON public.bn_escalation_event FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

-- =====================================================
-- Seed Data
-- =====================================================

-- Seed: Status definitions
INSERT INTO public.bn_claim_status_def (status_code, status_label, status_group, is_terminal, requires_effective_date, display_order, color_code) VALUES
('DRAFT', 'Draft', 'INTAKE', false, false, 1, 'gray'),
('SUBMITTED', 'Submitted', 'INTAKE', false, false, 2, 'blue'),
('INTAKE_REVIEW', 'Intake Review', 'PROCESSING', false, false, 3, 'blue'),
('ELIGIBILITY_CHECK', 'Eligibility Check', 'PROCESSING', false, false, 4, 'yellow'),
('EVIDENCE_REVIEW', 'Evidence Review', 'PROCESSING', false, false, 5, 'yellow'),
('CALCULATION', 'Calculation', 'PROCESSING', false, false, 6, 'yellow'),
('DECISION', 'Decision', 'DECISION', false, false, 7, 'orange'),
('APPROVED', 'Approved', 'DECISION', false, true, 8, 'green'),
('DENIED', 'Denied', 'TERMINAL', true, true, 9, 'red'),
('AWARD_SETUP', 'Award Setup', 'POST_DECISION', false, false, 10, 'green'),
('PAYMENT_QUEUE', 'Payment Queue', 'POST_DECISION', false, false, 11, 'green'),
('IN_PAYMENT', 'In Payment', 'POST_DECISION', false, false, 12, 'green'),
('SUSPENDED', 'Suspended', 'POST_DECISION', false, true, 13, 'orange'),
('CLOSED', 'Closed', 'TERMINAL', true, true, 14, 'gray'),
('PENDING_INFO', 'Pending Information', 'PROCESSING', false, false, 15, 'yellow'),
('WITHDRAWN', 'Withdrawn', 'TERMINAL', true, false, 16, 'gray');

-- Seed: Reason codes
INSERT INTO public.bn_reason_code (reason_code, reason_label, reason_category, applicable_actions, requires_narrative) VALUES
('INCOMPLETE_EVIDENCE', 'Incomplete or missing evidence', 'SEND_BACK', ARRAY['SEND_BACK'], false),
('CONTRIBUTION_SHORTFALL', 'Insufficient contribution history', 'DENIAL', ARRAY['DENY', 'DISALLOW'], false),
('AGE_INELIGIBLE', 'Age requirement not met', 'DENIAL', ARRAY['DENY', 'DISALLOW'], false),
('MEDICAL_PENDING', 'Medical evidence pending', 'SUSPENSION', ARRAY['SUSPEND', 'HOLD'], false),
('DUPLICATE_CLAIM', 'Duplicate claim detected', 'DENIAL', ARRAY['DENY', 'DISALLOW'], true),
('FRAUD_SUSPECTED', 'Suspected fraud', 'ESCALATION', ARRAY['ESCALATE', 'SUSPEND'], true),
('CLAIMANT_REQUEST', 'Requested by claimant', 'DISCONTINUATION', ARRAY['WITHDRAW', 'DISCONTINUE'], false),
('RETURN_TO_WORK', 'Return to work', 'DISCONTINUATION', ARRAY['DISCONTINUE', 'SUSPEND'], false),
('OVERPAYMENT', 'Overpayment detected', 'SUSPENSION', ARRAY['SUSPEND', 'HOLD'], true),
('DEATH_OF_CLAIMANT', 'Death of claimant', 'DISCONTINUATION', ARRAY['DISCONTINUE', 'CLOSE'], false),
('BENEFIT_EXHAUSTED', 'Maximum benefit period exhausted', 'DISCONTINUATION', ARRAY['DISCONTINUE', 'CLOSE'], false),
('OVERRIDE_ELIGIBILITY', 'Eligibility override applied', 'OVERRIDE', ARRAY['APPROVE'], true),
('OVERRIDE_CALCULATION', 'Calculation override applied', 'OVERRIDE', ARRAY['APPROVE'], true),
('SYSTEM_ERROR', 'System error correction', 'OVERRIDE', ARRAY['REOPEN'], true),
('APPEAL_GRANTED', 'Appeal granted', 'OVERRIDE', ARRAY['REOPEN'], true),
('SLA_BREACH', 'SLA breach escalation', 'ESCALATION', ARRAY['ESCALATE'], false),
('COMPLEX_CASE', 'Complex case escalation', 'ESCALATION', ARRAY['ESCALATE'], true),
('SUPERVISOR_REVIEW', 'Supervisor review required', 'ESCALATION', ARRAY['ESCALATE'], false);

-- Seed: Transition rules
INSERT INTO public.bn_claim_transition_rule (from_status, to_status, action_code, action_label, allowed_roles, requires_reason, requires_narrative, requires_maker_checker, requires_evidence_complete, requires_eligibility_pass, requires_calculation, sort_order) VALUES
('DRAFT', 'SUBMITTED', 'SUBMIT', 'Submit Claim', ARRAY['bn_clerk','bn_officer','Admin'], false, false, false, false, false, false, 1),
('SUBMITTED', 'INTAKE_REVIEW', 'VERIFY', 'Begin Intake Review', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, false, 2),
('INTAKE_REVIEW', 'ELIGIBILITY_CHECK', 'VERIFY', 'Move to Eligibility', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, false, 3),
('ELIGIBILITY_CHECK', 'EVIDENCE_REVIEW', 'VERIFY', 'Move to Evidence Review', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, true, false, 4),
('EVIDENCE_REVIEW', 'CALCULATION', 'VERIFY', 'Move to Calculation', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, true, false, false, 5),
('CALCULATION', 'DECISION', 'VERIFY', 'Move to Decision', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, true, 6),
('DECISION', 'APPROVED', 'APPROVE', 'Approve Claim', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, true, true, true, true, 7),
('DECISION', 'DENIED', 'DENY', 'Deny Claim', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, true, false, false, false, 8),
('APPROVED', 'AWARD_SETUP', 'VERIFY', 'Begin Award Setup', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, false, 9),
('AWARD_SETUP', 'PAYMENT_QUEUE', 'VERIFY', 'Send to Payment', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, false, 10),
('PAYMENT_QUEUE', 'IN_PAYMENT', 'VERIFY', 'Begin Payment', ARRAY['bn_finance','bn_supervisor','Admin'], false, false, false, false, false, false, 11),
('INTAKE_REVIEW', 'SUBMITTED', 'SEND_BACK', 'Send Back', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 20),
('ELIGIBILITY_CHECK', 'INTAKE_REVIEW', 'SEND_BACK', 'Send Back', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 21),
('EVIDENCE_REVIEW', 'INTAKE_REVIEW', 'SEND_BACK', 'Send Back', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 22),
('CALCULATION', 'EVIDENCE_REVIEW', 'SEND_BACK', 'Send Back', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 23),
('DECISION', 'CALCULATION', 'SEND_BACK', 'Send Back', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, false, false, false, false, 24),
('IN_PAYMENT', 'SUSPENDED', 'SUSPEND', 'Suspend Payments', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, false, false, false, false, 30),
('APPROVED', 'SUSPENDED', 'SUSPEND', 'Suspend Claim', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, false, false, false, false, 31),
('SUSPENDED', 'IN_PAYMENT', 'RELEASE', 'Release Suspension', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, false, false, false, false, 32),
('SUSPENDED', 'APPROVED', 'RELEASE', 'Reinstate Claim', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, false, false, false, false, 33),
('INTAKE_REVIEW', 'PENDING_INFO', 'HOLD', 'Request Information', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 40),
('ELIGIBILITY_CHECK', 'PENDING_INFO', 'HOLD', 'Request Information', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 41),
('EVIDENCE_REVIEW', 'PENDING_INFO', 'HOLD', 'Request Information', ARRAY['bn_officer','bn_supervisor','Admin'], true, false, false, false, false, false, 42),
('PENDING_INFO', 'INTAKE_REVIEW', 'RELEASE', 'Resume Processing', ARRAY['bn_officer','bn_supervisor','Admin'], false, false, false, false, false, false, 43),
('INTAKE_REVIEW', 'INTAKE_REVIEW', 'ESCALATE', 'Escalate', ARRAY['bn_officer','bn_supervisor','Admin'], true, true, false, false, false, false, 50),
('ELIGIBILITY_CHECK', 'ELIGIBILITY_CHECK', 'ESCALATE', 'Escalate', ARRAY['bn_officer','bn_supervisor','Admin'], true, true, false, false, false, false, 51),
('EVIDENCE_REVIEW', 'EVIDENCE_REVIEW', 'ESCALATE', 'Escalate', ARRAY['bn_officer','bn_supervisor','Admin'], true, true, false, false, false, false, 52),
('DECISION', 'DECISION', 'ESCALATE', 'Escalate', ARRAY['bn_officer','bn_supervisor','Admin'], true, true, false, false, false, false, 53),
('DRAFT', 'WITHDRAWN', 'WITHDRAW', 'Withdraw Claim', ARRAY['bn_clerk','bn_officer','Admin'], false, false, false, false, false, false, 60),
('SUBMITTED', 'WITHDRAWN', 'WITHDRAW', 'Withdraw Claim', ARRAY['bn_clerk','bn_officer','Admin'], true, false, false, false, false, false, 61),
('IN_PAYMENT', 'CLOSED', 'DISCONTINUE', 'Discontinue Benefit', ARRAY['bn_supervisor','bn_manager','Admin'], true, true, true, false, false, false, 70),
('DENIED', 'INTAKE_REVIEW', 'REOPEN', 'Reopen Claim', ARRAY['bn_manager','Admin'], true, true, false, false, false, false, 80),
('WITHDRAWN', 'DRAFT', 'REOPEN', 'Reopen Claim', ARRAY['bn_manager','Admin'], true, true, false, false, false, false, 81),
('IN_PAYMENT', 'CLOSED', 'DISALLOW', 'Disallow Benefit', ARRAY['bn_manager','Admin'], true, true, true, false, false, false, 90);
