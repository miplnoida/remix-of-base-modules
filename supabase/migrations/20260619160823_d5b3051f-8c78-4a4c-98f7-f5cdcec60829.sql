
-- =========================================================
-- Legal Enforcement Module (lg_ prefix). NO-RLS per project policy.
-- =========================================================

-- Reference data
CREATE TABLE public.lg_reference_group (
  code VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_reference_group TO authenticated;
GRANT ALL ON public.lg_reference_group TO service_role;

CREATE TABLE public.lg_reference_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code VARCHAR(50) NOT NULL REFERENCES public.lg_reference_group(code) ON DELETE CASCADE,
  code VARCHAR(80) NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_code, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_reference_value TO authenticated;
GRANT ALL ON public.lg_reference_value TO service_role;
CREATE INDEX idx_lg_refval_group ON public.lg_reference_value(group_code, sort_order);

-- Main case
CREATE TABLE public.lg_case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_no TEXT NOT NULL UNIQUE,
  country_code VARCHAR(10),
  case_type_code VARCHAR(80) NOT NULL,
  case_category_code VARCHAR(80),
  status_code VARCHAR(80) NOT NULL DEFAULT 'OPEN',
  current_stage_code VARCHAR(80) NOT NULL DEFAULT 'REFERRAL_RECEIVED',
  priority_code VARCHAR(80) NOT NULL DEFAULT 'MEDIUM',
  employer_id UUID,
  employer_account_id UUID,
  person_id UUID,
  compliance_case_id UUID,
  compliance_referral_id UUID,
  payment_arrangement_id UUID,
  assigned_legal_officer_id UUID,
  assigned_team_code VARCHAR(80),
  court_name TEXT,
  court_case_no TEXT,
  claim_amount NUMERIC(18,2),
  outstanding_amount_snapshot NUMERIC(18,2),
  next_hearing_date DATE,
  next_action TEXT,
  next_action_due_date DATE,
  opened_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_date DATE,
  closure_reason_code VARCHAR(80),
  summary TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case TO authenticated;
GRANT ALL ON public.lg_case TO service_role;
CREATE INDEX idx_lg_case_status ON public.lg_case(status_code);
CREATE INDEX idx_lg_case_stage ON public.lg_case(current_stage_code);
CREATE INDEX idx_lg_case_employer ON public.lg_case(employer_id);
CREATE INDEX idx_lg_case_officer ON public.lg_case(assigned_legal_officer_id);

-- Referral source
CREATE TABLE public.lg_case_referral (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  source_module VARCHAR(50) NOT NULL,
  source_reference_id UUID,
  source_reference_no TEXT,
  referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
  referral_reason TEXT,
  referred_by VARCHAR(50),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_referral TO authenticated;
GRANT ALL ON public.lg_case_referral TO service_role;
CREATE INDEX idx_lg_referral_case ON public.lg_case_referral(lg_case_id);

-- Parties
CREATE TABLE public.lg_case_party (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  party_role VARCHAR(40) NOT NULL,
  party_type VARCHAR(40) NOT NULL,
  external_ref_id UUID,
  display_name TEXT NOT NULL,
  contact_info JSONB,
  representative_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_party TO authenticated;
GRANT ALL ON public.lg_case_party TO service_role;
CREATE INDEX idx_lg_party_case ON public.lg_case_party(lg_case_id);

-- Assignment history
CREATE TABLE public.lg_case_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  assigned_to_user_id UUID,
  assigned_team_code VARCHAR(80),
  assignment_role VARCHAR(40),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unassigned_at TIMESTAMPTZ,
  assigned_by VARCHAR(50),
  reason TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_assignment TO authenticated;
GRANT ALL ON public.lg_case_assignment TO service_role;
CREATE INDEX idx_lg_assign_case ON public.lg_case_assignment(lg_case_id);

-- Stage history
CREATE TABLE public.lg_case_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  from_stage_code VARCHAR(80),
  to_stage_code VARCHAR(80) NOT NULL,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transitioned_by VARCHAR(50),
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_stage_history TO authenticated;
GRANT ALL ON public.lg_case_stage_history TO service_role;
CREATE INDEX idx_lg_stage_case ON public.lg_case_stage_history(lg_case_id);

-- Activity log
CREATE TABLE public.lg_case_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  activity_type VARCHAR(60) NOT NULL,
  description TEXT,
  payload JSONB,
  performed_by VARCHAR(50),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_activity TO authenticated;
GRANT ALL ON public.lg_case_activity TO service_role;
CREATE INDEX idx_lg_activity_case ON public.lg_case_activity(lg_case_id);

-- Notes
CREATE TABLE public.lg_case_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_note TO authenticated;
GRANT ALL ON public.lg_case_note TO service_role;
CREATE INDEX idx_lg_note_case ON public.lg_case_note(lg_case_id);

-- Tasks
CREATE TABLE public.lg_case_task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  task_type_code VARCHAR(80) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_user_id UUID,
  due_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
  completed_at TIMESTAMPTZ,
  completed_by VARCHAR(50),
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_task TO authenticated;
GRANT ALL ON public.lg_case_task TO service_role;
CREATE INDEX idx_lg_task_case ON public.lg_case_task(lg_case_id);

-- Deadlines
CREATE TABLE public.lg_case_deadline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  deadline_type VARCHAR(60) NOT NULL,
  due_date DATE NOT NULL,
  description TEXT,
  is_satisfied BOOLEAN NOT NULL DEFAULT FALSE,
  satisfied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_deadline TO authenticated;
GRANT ALL ON public.lg_case_deadline TO service_role;
CREATE INDEX idx_lg_deadline_case ON public.lg_case_deadline(lg_case_id);

-- Calendar events
CREATE TABLE public.lg_case_calendar_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  event_type VARCHAR(60) NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_calendar_event TO authenticated;
GRANT ALL ON public.lg_case_calendar_event TO service_role;
CREATE INDEX idx_lg_calevt_case ON public.lg_case_calendar_event(lg_case_id);

-- Hearings
CREATE TABLE public.lg_hearing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  hearing_type_code VARCHAR(80) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  court_name TEXT,
  court_room TEXT,
  judge_name TEXT,
  outcome_code VARCHAR(80),
  outcome_notes TEXT,
  next_hearing_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing TO authenticated;
GRANT ALL ON public.lg_hearing TO service_role;
CREATE INDEX idx_lg_hearing_case ON public.lg_hearing(lg_case_id);

CREATE TABLE public.lg_hearing_attendee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_hearing_id UUID NOT NULL REFERENCES public.lg_hearing(id) ON DELETE CASCADE,
  attendee_role VARCHAR(40) NOT NULL,
  attendee_name TEXT NOT NULL,
  attended BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing_attendee TO authenticated;
GRANT ALL ON public.lg_hearing_attendee TO service_role;

-- Document link (references existing document modules; does not duplicate)
CREATE TABLE public.lg_document_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  document_category_code VARCHAR(80) NOT NULL,
  document_source VARCHAR(40) NOT NULL,
  document_ref_id UUID,
  document_ref_no TEXT,
  title TEXT,
  notes TEXT,
  linked_by VARCHAR(50),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_document_link TO authenticated;
GRANT ALL ON public.lg_document_link TO service_role;
CREATE INDEX idx_lg_doclink_case ON public.lg_document_link(lg_case_id);

-- Notices (legal-owned notices; references shared templates by id only)
CREATE TABLE public.lg_notice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  notice_no TEXT NOT NULL UNIQUE,
  notice_type_code VARCHAR(80) NOT NULL,
  template_ref_id UUID,
  subject TEXT,
  body TEXT,
  issued_to_party_id UUID REFERENCES public.lg_case_party(id) ON DELETE SET NULL,
  issued_date DATE,
  response_due_date DATE,
  delivery_channel VARCHAR(30),
  delivery_status VARCHAR(30) DEFAULT 'PENDING',
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_notice TO authenticated;
GRANT ALL ON public.lg_notice TO service_role;
CREATE INDEX idx_lg_notice_case ON public.lg_notice(lg_case_id);

-- Settlements
CREATE TABLE public.lg_settlement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  proposed_amount NUMERIC(18,2),
  agreed_amount NUMERIC(18,2),
  currency_code VARCHAR(10),
  payment_arrangement_id UUID,
  terms TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
  proposed_by VARCHAR(50),
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_settlement TO authenticated;
GRANT ALL ON public.lg_settlement TO service_role;
CREATE INDEX idx_lg_settlement_case ON public.lg_settlement(lg_case_id);

-- Orders
CREATE TABLE public.lg_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  order_no TEXT NOT NULL UNIQUE,
  order_type_code VARCHAR(80) NOT NULL,
  issued_by_court TEXT,
  issued_date DATE,
  effective_date DATE,
  expiry_date DATE,
  ordered_amount NUMERIC(18,2),
  terms TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  document_ref_id UUID,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_order TO authenticated;
GRANT ALL ON public.lg_order TO service_role;
CREATE INDEX idx_lg_order_case ON public.lg_order(lg_case_id);

-- Fee charges (references shared Fee Head registry by id only)
CREATE TABLE public.lg_fee_charge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  fee_head_ref_id UUID,
  fee_head_code VARCHAR(80),
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  currency_code VARCHAR(10),
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  posted_invoice_ref_id UUID,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_charge TO authenticated;
GRANT ALL ON public.lg_fee_charge TO service_role;
CREATE INDEX idx_lg_fee_case ON public.lg_fee_charge(lg_case_id);

-- Link to existing Payment Arrangement (Compliance/Payments module)
CREATE TABLE public.lg_payment_arrangement_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  payment_arrangement_id UUID NOT NULL,
  source_module VARCHAR(50) NOT NULL DEFAULT 'COMPLIANCE',
  link_type VARCHAR(40) NOT NULL DEFAULT 'PRIMARY',
  linked_by VARCHAR(50),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_payment_arrangement_link TO authenticated;
GRANT ALL ON public.lg_payment_arrangement_link TO service_role;
CREATE INDEX idx_lg_payarr_case ON public.lg_payment_arrangement_link(lg_case_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.lg_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_lg_case_upd BEFORE UPDATE ON public.lg_case FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();
CREATE TRIGGER trg_lg_task_upd BEFORE UPDATE ON public.lg_case_task FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();
CREATE TRIGGER trg_lg_hearing_upd BEFORE UPDATE ON public.lg_hearing FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();
CREATE TRIGGER trg_lg_notice_upd BEFORE UPDATE ON public.lg_notice FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();
CREATE TRIGGER trg_lg_settle_upd BEFORE UPDATE ON public.lg_settlement FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();
CREATE TRIGGER trg_lg_order_upd BEFORE UPDATE ON public.lg_order FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

-- Case number generator
CREATE OR REPLACE FUNCTION public.lg_generate_case_no()
RETURNS TEXT AS $$
DECLARE seq_no BIGINT; yr TEXT;
BEGIN
  yr := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(NULLIF(regexp_replace(lg_case_no, '^LG-\d{4}-', ''), '')::BIGINT), 0) + 1
    INTO seq_no FROM public.lg_case WHERE lg_case_no LIKE 'LG-' || yr || '-%';
  RETURN 'LG-' || yr || '-' || lpad(seq_no::TEXT, 6, '0');
END; $$ LANGUAGE plpgsql SET search_path = public;

-- =========================================================
-- Seed reference data
-- =========================================================
INSERT INTO public.lg_reference_group(code, name, description) VALUES
  ('LG_CASE_TYPE','Case Type','Legal case types'),
  ('LG_CASE_STATUS','Case Status','Legal case statuses'),
  ('LG_CASE_STAGE','Case Stage','Legal case workflow stages'),
  ('LG_PRIORITY','Priority','Case priority levels'),
  ('LG_HEARING_TYPE','Hearing Type','Court hearing types'),
  ('LG_HEARING_OUTCOME','Hearing Outcome','Hearing outcomes'),
  ('LG_ORDER_TYPE','Order Type','Court order types'),
  ('LG_NOTICE_TYPE','Notice Type','Legal notice types'),
  ('LG_DOCUMENT_CATEGORY','Document Category','Legal document categories'),
  ('LG_CLOSURE_REASON','Closure Reason','Case closure reasons'),
  ('LG_TASK_TYPE','Task Type','Legal task types')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.lg_reference_value(group_code, code, label, sort_order) VALUES
  -- CASE_TYPE
  ('LG_CASE_TYPE','NON_COMPLIANCE','Non-Compliance',10),
  ('LG_CASE_TYPE','BENEFIT_DISPUTE','Benefit Dispute',20),
  ('LG_CASE_TYPE','APPEAL','Appeal',30),
  ('LG_CASE_TYPE','FRAUD','Fraud Investigation',40),
  ('LG_CASE_TYPE','RECOVERY','Debt Recovery',50),
  ('LG_CASE_TYPE','PROSECUTION','Prosecution',60),
  -- STATUS
  ('LG_CASE_STATUS','OPEN','Open',10),
  ('LG_CASE_STATUS','IN_PROGRESS','In Progress',20),
  ('LG_CASE_STATUS','PENDING_REVIEW','Pending Review',30),
  ('LG_CASE_STATUS','SETTLED','Settled',40),
  ('LG_CASE_STATUS','CLOSED','Closed',50),
  ('LG_CASE_STATUS','WITHDRAWN','Withdrawn',60),
  -- STAGE (seeded list)
  ('LG_CASE_STAGE','REFERRAL_RECEIVED','Referral Received',10),
  ('LG_CASE_STAGE','LEGAL_REVIEW','Legal Review',20),
  ('LG_CASE_STAGE','DEMAND_NOTICE','Demand Notice',30),
  ('LG_CASE_STAGE','SETTLEMENT_NEGOTIATION','Settlement Negotiation',40),
  ('LG_CASE_STAGE','COURT_FILING','Court Filing',50),
  ('LG_CASE_STAGE','HEARING','Hearing',60),
  ('LG_CASE_STAGE','JUDGMENT','Judgment',70),
  ('LG_CASE_STAGE','ENFORCEMENT','Enforcement',80),
  ('LG_CASE_STAGE','CLOSED','Closed',90),
  -- PRIORITY
  ('LG_PRIORITY','LOW','Low',10),
  ('LG_PRIORITY','MEDIUM','Medium',20),
  ('LG_PRIORITY','HIGH','High',30),
  ('LG_PRIORITY','URGENT','Urgent',40),
  -- HEARING_TYPE
  ('LG_HEARING_TYPE','FIRST_HEARING','First Hearing',10),
  ('LG_HEARING_TYPE','MENTION','Mention',20),
  ('LG_HEARING_TYPE','TRIAL','Trial',30),
  ('LG_HEARING_TYPE','APPEAL','Appeal Hearing',40),
  ('LG_HEARING_TYPE','JUDGMENT','Judgment',50),
  -- HEARING_OUTCOME
  ('LG_HEARING_OUTCOME','ADJOURNED','Adjourned',10),
  ('LG_HEARING_OUTCOME','HEARD','Heard',20),
  ('LG_HEARING_OUTCOME','JUDGMENT_RESERVED','Judgment Reserved',30),
  ('LG_HEARING_OUTCOME','JUDGMENT_DELIVERED','Judgment Delivered',40),
  ('LG_HEARING_OUTCOME','SETTLED','Settled',50),
  ('LG_HEARING_OUTCOME','DISMISSED','Dismissed',60),
  -- ORDER_TYPE
  ('LG_ORDER_TYPE','JUDGMENT_ORDER','Judgment Order',10),
  ('LG_ORDER_TYPE','GARNISHEE','Garnishee Order',20),
  ('LG_ORDER_TYPE','SEIZURE','Seizure Order',30),
  ('LG_ORDER_TYPE','INJUNCTION','Injunction',40),
  ('LG_ORDER_TYPE','CONSENT','Consent Order',50),
  -- NOTICE_TYPE
  ('LG_NOTICE_TYPE','DEMAND','Demand Notice',10),
  ('LG_NOTICE_TYPE','FINAL_DEMAND','Final Demand Notice',20),
  ('LG_NOTICE_TYPE','SHOW_CAUSE','Show-Cause Notice',30),
  ('LG_NOTICE_TYPE','HEARING','Hearing Notice',40),
  ('LG_NOTICE_TYPE','PROSECUTION','Notice of Prosecution',50),
  -- DOCUMENT_CATEGORY
  ('LG_DOCUMENT_CATEGORY','REFERRAL_PACK','Referral Pack',10),
  ('LG_DOCUMENT_CATEGORY','EVIDENCE','Evidence',20),
  ('LG_DOCUMENT_CATEGORY','COURT_FILING','Court Filing',30),
  ('LG_DOCUMENT_CATEGORY','ORDER','Court Order',40),
  ('LG_DOCUMENT_CATEGORY','CORRESPONDENCE','Correspondence',50),
  ('LG_DOCUMENT_CATEGORY','SETTLEMENT','Settlement',60),
  -- CLOSURE_REASON
  ('LG_CLOSURE_REASON','SETTLED','Settled',10),
  ('LG_CLOSURE_REASON','JUDGMENT_SATISFIED','Judgment Satisfied',20),
  ('LG_CLOSURE_REASON','WITHDRAWN','Withdrawn',30),
  ('LG_CLOSURE_REASON','DISMISSED','Dismissed',40),
  ('LG_CLOSURE_REASON','UNCOLLECTIBLE','Uncollectible',50),
  -- TASK_TYPE
  ('LG_TASK_TYPE','PREPARE_NOTICE','Prepare Notice',10),
  ('LG_TASK_TYPE','REVIEW_EVIDENCE','Review Evidence',20),
  ('LG_TASK_TYPE','FILE_IN_COURT','File in Court',30),
  ('LG_TASK_TYPE','ATTEND_HEARING','Attend Hearing',40),
  ('LG_TASK_TYPE','SERVE_NOTICE','Serve Notice',50),
  ('LG_TASK_TYPE','FOLLOW_UP','Follow Up',60)
ON CONFLICT (group_code, code) DO NOTHING;
