
-- LEGAL ADVANCED — Phase 1 foundation (create-only, rollback-safe, NO-RLS)
-- Rollback = flip feature flag + hide menu entries. No lg_* objects touched.

-- 1. Feature flag
INSERT INTO public.feature_flags (flag_key, display_name, description, is_enabled, rollout_state)
VALUES ('legal_advanced_enabled','Legal Advanced Module',
        'Enables the new Legal Matter Framework (la_* tables + menu). Disable to hide entirely; existing Legal module unaffected.',
        false,'hidden')
ON CONFLICT (flag_key) DO NOTHING;

-- 2. Touch trigger
CREATE OR REPLACE FUNCTION public.la_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 3. Core tables
CREATE TABLE IF NOT EXISTS public.la_matter_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN
    ('RECOVERY','ADVISORY','APPEAL','GOVERNANCE','INTERNAL_REVIEW','EXTERNAL_COUNSEL')),
  requires_dms boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.la_workbasket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  team_id uuid,
  owner_user_code varchar(50),
  is_team boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.la_matter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_no text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  matter_type_id uuid REFERENCES public.la_matter_type(id),
  category text NOT NULL CHECK (category IN
    ('RECOVERY','ADVISORY','APPEAL','GOVERNANCE','INTERNAL_REVIEW','EXTERNAL_COUNSEL')),
  origin text NOT NULL CHECK (origin IN
    ('BENEFITS','COMPLIANCE','FINANCE','HR','IT','PROCUREMENT','EMPLOYER_SERVICES',
     'IP_MANAGEMENT','EXECUTIVE_OFFICE','BOARD_SECRETARIAT','LEGAL_CREATED_OFFLINE','THIRD_PARTY_RECEIVED')),
  source_module text,
  source_ref_id text,
  source_ref_no text,
  legal_existing_case_id uuid,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','ACCEPTED','IN_PROGRESS','PENDING_REVIEW','CLOSED','REJECTED','WITHDRAWN')),
  stage text,
  priority text DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  current_workbasket_id uuid REFERENCES public.la_workbasket(id),
  assigned_user_code varchar(50),
  submitted_by_user_code varchar(50),
  submitted_at timestamptz,
  accepted_by_user_code varchar(50),
  accepted_at timestamptz,
  closed_at timestamptz,
  due_date date,
  is_legal_created boolean NOT NULL DEFAULT false,
  has_dms_document boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_matter_status   ON public.la_matter(status);
CREATE INDEX IF NOT EXISTS idx_la_matter_wb       ON public.la_matter(current_workbasket_id);
CREATE INDEX IF NOT EXISTS idx_la_matter_assignee ON public.la_matter(assigned_user_code);
CREATE INDEX IF NOT EXISTS idx_la_matter_origin   ON public.la_matter(origin);
CREATE INDEX IF NOT EXISTS idx_la_matter_legcase  ON public.la_matter(legal_existing_case_id);

CREATE TABLE IF NOT EXISTS public.la_matter_party (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  party_role text NOT NULL,
  party_type text NOT NULL,
  party_ref_id text,
  party_name text NOT NULL,
  contact_email text,
  contact_phone text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_party_matter ON public.la_matter_party(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  performed_by_user_code varchar(50),
  performed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_la_activity_matter ON public.la_matter_activity(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  doc_title text NOT NULL,
  doc_type text,
  dms_document_id text,
  dms_provider text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  uploaded_by_user_code varchar(50),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_la_doc_matter ON public.la_matter_document(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  workbasket_id uuid REFERENCES public.la_workbasket(id),
  assigned_user_code varchar(50),
  assigned_role text,
  assigned_by_user_code varchar(50),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  reason text
);
CREATE INDEX IF NOT EXISTS idx_la_assign_matter  ON public.la_matter_assignment(matter_id);
CREATE INDEX IF NOT EXISTS idx_la_assign_current ON public.la_matter_assignment(is_current) WHERE is_current = true;

CREATE TABLE IF NOT EXISTS public.la_matter_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  from_stage text,
  to_stage text NOT NULL,
  from_status text,
  to_status text,
  changed_by_user_code varchar(50),
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);
CREATE INDEX IF NOT EXISTS idx_la_stage_matter ON public.la_matter_stage_history(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_referral (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  referred_to text NOT NULL,
  referred_to_user_code varchar(50),
  referral_type text,
  referral_notes text,
  referred_by_user_code varchar(50),
  referred_at timestamptz NOT NULL DEFAULT now(),
  response_received_at timestamptz,
  response_notes text,
  status text NOT NULL DEFAULT 'PENDING'
);
CREATE INDEX IF NOT EXISTS idx_la_referral_matter ON public.la_matter_referral(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_financial_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  principal_amount numeric(18,2) DEFAULT 0,
  penalty_amount   numeric(18,2) DEFAULT 0,
  interest_amount  numeric(18,2) DEFAULT 0,
  costs_amount     numeric(18,2) DEFAULT 0,
  recovered_amount numeric(18,2) DEFAULT 0,
  outstanding_amount numeric(18,2) DEFAULT 0,
  currency_code text DEFAULT 'XCD',
  source_ref text,
  captured_by_user_code varchar(50),
  notes text
);
CREATE INDEX IF NOT EXISTS idx_la_fin_matter ON public.la_matter_financial_snapshot(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  action_code text NOT NULL,
  action_title text NOT NULL,
  assigned_user_code varchar(50),
  due_date date,
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED','BLOCKED')),
  outcome text,
  completed_at timestamptz,
  completed_by_user_code varchar(50),
  created_by_user_code varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_action_matter   ON public.la_matter_action(matter_id);
CREATE INDEX IF NOT EXISTS idx_la_action_assignee ON public.la_matter_action(assigned_user_code);

-- Contract / document review
CREATE TABLE IF NOT EXISTS public.la_contract_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  review_type text NOT NULL,
  counterparty_name text,
  requested_by_dept text,
  requested_by_user_code varchar(50),
  target_completion_date date,
  risk_level text CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  overall_recommendation text,
  status text NOT NULL DEFAULT 'DRAFT',
  current_version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_contract_matter ON public.la_contract_review(matter_id);

CREATE TABLE IF NOT EXISTS public.la_document_review_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_review_id uuid NOT NULL REFERENCES public.la_contract_review(id) ON DELETE CASCADE,
  version_no int NOT NULL,
  document_id uuid REFERENCES public.la_matter_document(id),
  summary text,
  uploaded_by_user_code varchar(50),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false,
  UNIQUE (contract_review_id, version_no)
);

CREATE TABLE IF NOT EXISTS public.la_document_review_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.la_document_review_version(id) ON DELETE CASCADE,
  comment_type text DEFAULT 'GENERAL',
  page_no int,
  section_ref text,
  comment_text text NOT NULL,
  severity text CHECK (severity IN ('INFO','MINOR','MAJOR','CRITICAL')),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by_user_code varchar(50),
  created_by_user_code varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_doc_comment_ver ON public.la_document_review_comment(version_id);

-- Advice + AI
CREATE TABLE IF NOT EXISTS public.la_advice_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.la_matter(id) ON DELETE CASCADE,
  request_no text NOT NULL UNIQUE,
  requested_by_user_code varchar(50) NOT NULL,
  requesting_dept text,
  subject text NOT NULL,
  question text NOT NULL,
  urgency text DEFAULT 'NORMAL' CHECK (urgency IN ('LOW','NORMAL','HIGH','URGENT')),
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','ASSIGNED','IN_REVIEW','ADVICE_ISSUED','CLOSED','WITHDRAWN')),
  assigned_user_code varchar(50),
  advice_summary text,
  advice_issued_at timestamptz,
  advice_issued_by_user_code varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_advice_status ON public.la_advice_request(status);

CREATE TABLE IF NOT EXISTS public.la_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.la_matter(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.la_matter_document(id),
  analysis_type text NOT NULL,
  model_name text,
  prompt_tokens int,
  completion_tokens int,
  input_excerpt text,
  output_text text,
  output_json jsonb,
  risk_score numeric(5,2),
  confidence numeric(5,2),
  status text NOT NULL DEFAULT 'COMPLETED',
  requested_by_user_code varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_la_ai_matter ON public.la_ai_analysis(matter_id);

CREATE TABLE IF NOT EXISTS public.la_matter_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid REFERENCES public.la_matter(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  performed_by_user_code varchar(50),
  performed_at timestamptz NOT NULL DEFAULT now(),
  before_value jsonb,
  after_value jsonb,
  ip_address text,
  user_agent text,
  remarks text
);
CREATE INDEX IF NOT EXISTS idx_la_audit_matter ON public.la_matter_audit(matter_id);
CREATE INDEX IF NOT EXISTS idx_la_audit_entity ON public.la_matter_audit(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.la_routing_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  matter_type_id uuid REFERENCES public.la_matter_type(id),
  origin text,
  category text,
  priority text,
  target_workbasket_id uuid REFERENCES public.la_workbasket(id),
  target_user_code varchar(50),
  precedence int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.la_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  workbasket_id uuid REFERENCES public.la_workbasket(id),
  assigned_user_code varchar(50),
  routed_via_rule_id uuid REFERENCES public.la_routing_rule(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.la_matter_workbasket (
  matter_id uuid NOT NULL REFERENCES public.la_matter(id) ON DELETE CASCADE,
  workbasket_id uuid NOT NULL REFERENCES public.la_workbasket(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by_user_code varchar(50),
  PRIMARY KEY (matter_id, workbasket_id)
);

-- Triggers
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'la_matter','la_matter_type','la_workbasket','la_matter_action',
    'la_contract_review','la_advice_request','la_routing_rule'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.la_touch_updated_at()', t, t);
  END LOOP;
END $$;

-- GRANTS (NO-RLS architecture: auth enforced at app/edge layer per project policy)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'la_matter','la_matter_type','la_workbasket','la_matter_party','la_matter_activity',
    'la_matter_document','la_matter_assignment','la_matter_stage_history','la_matter_referral',
    'la_matter_financial_snapshot','la_matter_action','la_contract_review',
    'la_document_review_version','la_document_review_comment','la_advice_request',
    'la_ai_analysis','la_matter_audit','la_routing_rule','la_assignment','la_matter_workbasket'
  ]) LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Compatibility bridge views (READ-ONLY, no lg_* writes)
CREATE OR REPLACE VIEW public.v_legal_existing_cases_for_advanced AS
SELECT
  c.id                   AS legal_case_id,
  c.lg_case_no           AS legal_case_no,
  c.status_code          AS legal_case_status,
  c.current_stage_code   AS legal_case_stage,
  c.case_type_code       AS legal_case_type,
  c.case_category_code   AS legal_case_category,
  c.priority_code        AS legal_priority,
  c.employer_id          AS employer_id,
  c.person_id            AS person_id,
  c.assigned_legal_officer_id AS assigned_legal_officer_id,
  c.assigned_team_code        AS assigned_team_code,
  c.summary              AS summary,
  c.opened_date          AS opened_date,
  c.created_at           AS created_at
FROM public.lg_case c;

CREATE OR REPLACE VIEW public.v_legal_advanced_matter_summary AS
SELECT
  m.id, m.matter_no, m.title, m.category, m.origin, m.status, m.stage, m.priority,
  mt.code         AS matter_type_code,
  mt.display_name AS matter_type_name,
  wb.code         AS workbasket_code,
  wb.display_name AS workbasket_name,
  m.assigned_user_code, m.due_date, m.is_legal_created, m.has_dms_document,
  m.legal_existing_case_id,
  (SELECT COUNT(*) FROM public.la_matter_document d WHERE d.matter_id = m.id AND d.is_active) AS document_count,
  (SELECT COUNT(*) FROM public.la_matter_action a WHERE a.matter_id = m.id AND a.status IN ('OPEN','IN_PROGRESS')) AS open_action_count,
  m.created_at, m.updated_at
FROM public.la_matter m
LEFT JOIN public.la_matter_type mt ON mt.id = m.matter_type_id
LEFT JOIN public.la_workbasket  wb ON wb.id = m.current_workbasket_id;

CREATE OR REPLACE VIEW public.v_legal_advanced_source_referrals AS
SELECT
  r.id                  AS referral_id,
  r.referral_no         AS referral_no,
  r.source_module       AS source_module,
  r.source_record_id    AS source_record_id,
  r.source_reference_no AS source_reference_no,
  r.status              AS referral_status,
  r.priority_code       AS priority_code,
  r.exposure_amount     AS exposure_amount,
  r.legal_case_id       AS legal_case_id,
  r.created_at          AS created_at,
  m.id                  AS la_matter_id,
  m.matter_no           AS la_matter_no,
  m.status              AS la_matter_status
FROM public.legal_referral r
LEFT JOIN public.la_matter m
  ON m.source_module = r.source_module
 AND m.source_ref_id = r.id::text;

GRANT SELECT ON public.v_legal_existing_cases_for_advanced TO authenticated, service_role;
GRANT SELECT ON public.v_legal_advanced_matter_summary    TO authenticated, service_role;
GRANT SELECT ON public.v_legal_advanced_source_referrals  TO authenticated, service_role;

-- Seed matter types
INSERT INTO public.la_matter_type (code, display_name, category, requires_dms, sort_order) VALUES
 ('EMPLOYER_RECOVERY',     'Employer Recovery',       'RECOVERY',   false, 10),
 ('CONTRIBUTION_RECOVERY', 'Contribution Recovery',   'RECOVERY',   false, 20),
 ('BENEFIT_OVERPAYMENT',   'Benefit Overpayment',     'RECOVERY',   false, 30),
 ('BENEFIT_APPEAL',        'Benefit Appeal',          'APPEAL',     false, 40),
 ('CONTRACT_REVIEW',       'Contract Review',         'ADVISORY',   true,  50),
 ('NDA_REVIEW',            'NDA Review',              'ADVISORY',   true,  60),
 ('MOU_REVIEW',            'MOU Review',              'ADVISORY',   true,  70),
 ('POLICY_REVIEW',         'Policy Review',           'ADVISORY',   true,  80),
 ('DATA_SHARING_REVIEW',   'Data Sharing Agreement',  'ADVISORY',   true,  90),
 ('INTERNAL_LEGAL_ADVICE', 'Internal Legal Advice',   'ADVISORY',   false, 100),
 ('BOARD_MATTER',          'Board Matter',            'GOVERNANCE', false, 110),
 ('EXECUTIVE_INSTRUCTION', 'Executive Instruction',   'GOVERNANCE', false, 120)
ON CONFLICT (code) DO NOTHING;

-- Seed default workbaskets
INSERT INTO public.la_workbasket (code, display_name, is_team) VALUES
 ('LA_INTAKE',     'Legal Advanced — Intake',     true),
 ('LA_RECOVERY',   'Legal Advanced — Recovery',   true),
 ('LA_ADVISORY',   'Legal Advanced — Advisory',   true),
 ('LA_APPEALS',    'Legal Advanced — Appeals',    true),
 ('LA_GOVERNANCE', 'Legal Advanced — Governance', true)
ON CONFLICT (code) DO NOTHING;

-- App module menu entries (parent + 13 children)
WITH parent AS (
  INSERT INTO public.app_modules (name, display_name, description, icon, route, sort_order, is_enabled, show_in_menu, rollout_state)
  VALUES ('legal_advanced','Legal Advanced','New Legal Matter Framework (feature-flagged)','scale','/legal-advanced',9100,true,true,'internal_pilot')
  ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name
  RETURNING id
),
items(name, display_name, route, sort_order) AS (
  VALUES
   ('legal_advanced_dashboard',         'Advanced Dashboard',              '/legal-advanced/dashboard',        10),
   ('legal_advanced_intake',            'Matter Intake',                   '/legal-advanced/intake',           20),
   ('legal_advanced_matters',           'Legal Matters',                   '/legal-advanced/matters',          30),
   ('legal_advanced_my_workbasket',     'My Workbasket',                   '/legal-advanced/my-workbasket',    40),
   ('legal_advanced_team_workbasket',   'Team Workbasket',                 '/legal-advanced/team-workbasket',  50),
   ('legal_advanced_advice',            'Legal Advice Requests',           '/legal-advanced/advice',           60),
   ('legal_advanced_contracts',         'Contract / Document Reviews',     '/legal-advanced/contracts',        70),
   ('legal_advanced_employer_recovery', 'Employer Recovery Matters',       '/legal-advanced/employer-recovery',80),
   ('legal_advanced_ip_matters',        'Benefit / Insured Person Matters','/legal-advanced/ip-matters',       90),
   ('legal_advanced_documents',         'Documents & Versions',            '/legal-advanced/documents',        100),
   ('legal_advanced_activities',        'Activities & Tasks',              '/legal-advanced/activities',       110),
   ('legal_advanced_reports',           'Reports',                         '/legal-advanced/reports',          120),
   ('legal_advanced_admin',             'Advanced Admin',                  '/legal-advanced/admin',            130)
)
INSERT INTO public.app_modules (name, display_name, route, parent_id, sort_order, is_enabled, show_in_menu, rollout_state)
SELECT i.name, i.display_name, i.route, parent.id, i.sort_order, true, true, 'internal_pilot'
FROM items i CROSS JOIN parent
ON CONFLICT (name) DO NOTHING;

-- Link feature flag to module
UPDATE public.feature_flags
SET module_id = (SELECT id FROM public.app_modules WHERE name='legal_advanced')
WHERE flag_key = 'legal_advanced_enabled' AND module_id IS NULL;
