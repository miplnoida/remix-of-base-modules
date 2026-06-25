
CREATE TABLE IF NOT EXISTS public.lg_contract_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text UNIQUE NOT NULL,
  source_department text NOT NULL,
  requested_by text,
  requested_by_user_code text,
  contract_title text NOT NULL,
  contract_type text NOT NULL,
  case_category text NOT NULL DEFAULT 'INTERNAL_CONTRACT_OR_ADVISORY',
  counterparty_name text,
  counterparty_contact text,
  contract_value numeric(18,2),
  currency text DEFAULT 'XCD',
  start_date date,
  end_date date,
  renewal_terms text,
  urgency text DEFAULT 'STANDARD',
  requested_deadline date,
  purpose_of_contract text,
  background_notes text,
  specific_questions_for_legal text,
  confidentiality_level text DEFAULT 'INTERNAL',
  third_party_sharing_allowed boolean DEFAULT false,
  status text NOT NULL DEFAULT 'DRAFT',
  assigned_workbasket text,
  assigned_to_user_code text,
  sla_due_at timestamptz,
  sla_status text DEFAULT 'ON_TIME',
  board_approval_required boolean DEFAULT false,
  executive_approval_required boolean DEFAULT false,
  approved_by_user_code text,
  approved_at timestamptz,
  closed_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_review TO authenticated;
GRANT ALL ON public.lg_contract_review TO service_role;
CREATE INDEX IF NOT EXISTS idx_lcr_status ON public.lg_contract_review(status);
CREATE INDEX IF NOT EXISTS idx_lcr_source_dept ON public.lg_contract_review(source_department);
CREATE INDEX IF NOT EXISTS idx_lcr_assignee ON public.lg_contract_review(assigned_to_user_code);

CREATE TABLE IF NOT EXISTS public.lg_contract_review_party (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  party_role text NOT NULL,
  party_name text NOT NULL,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_review_party TO authenticated;
GRANT ALL ON public.lg_contract_review_party TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_contract_review_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  cycle_id uuid,
  version_id uuid,
  document_kind text NOT NULL,
  document_status text DEFAULT 'ACTIVE',
  dms_document_id text,
  file_name text,
  uploaded_by_user_code text,
  source_department text,
  confidentiality_level text DEFAULT 'INTERNAL',
  version_no int DEFAULT 1,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_review_document TO authenticated;
GRANT ALL ON public.lg_contract_review_document TO service_role;
CREATE INDEX IF NOT EXISTS idx_lcrd_review ON public.lg_contract_review_document(review_id);

CREATE TABLE IF NOT EXISTS public.lg_contract_review_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  version_no int NOT NULL,
  version_label text,
  dms_document_id text,
  created_by_user_code text,
  notes text,
  is_current boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, version_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_review_version TO authenticated;
GRANT ALL ON public.lg_contract_review_version TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_contract_review_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.lg_contract_review_version(id) ON DELETE SET NULL,
  comment_scope text NOT NULL DEFAULT 'DOCUMENT',
  clause_ref text,
  page_no int,
  body text NOT NULL,
  owner_user_code text,
  assigned_to_user_code text,
  status text NOT NULL DEFAULT 'OPEN',
  due_date date,
  response_text text,
  responded_at timestamptz,
  responded_by_user_code text,
  visibility text DEFAULT 'INTERNAL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_review_comment TO authenticated;
GRANT ALL ON public.lg_contract_review_comment TO service_role;
CREATE INDEX IF NOT EXISTS idx_lcrc_review ON public.lg_contract_review_comment(review_id);

CREATE TABLE IF NOT EXISTS public.lg_contract_review_cycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  cycle_no int NOT NULL,
  cycle_direction text NOT NULL,
  sent_by_user_code text,
  sent_to text,
  sent_date timestamptz NOT NULL DEFAULT now(),
  due_date date,
  response_date timestamptz,
  status text NOT NULL DEFAULT 'OPEN',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, cycle_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_review_cycle TO authenticated;
GRANT ALL ON public.lg_contract_review_cycle TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_contract_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.lg_contract_review_version(id) ON DELETE SET NULL,
  model text NOT NULL,
  provider text NOT NULL DEFAULT 'lovable-ai-gateway',
  prompt_version text DEFAULT 'v1',
  analysis_result jsonb NOT NULL,
  checklist_score numeric(5,2),
  generated_by_user_code text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  accepted_by_user_code text,
  accepted_at timestamptz,
  rejected_by_user_code text,
  rejected_at timestamptz,
  disclaimer text DEFAULT 'AI analysis is a drafting aid and must be reviewed by Legal before use.'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_ai_analysis TO authenticated;
GRANT ALL ON public.lg_contract_ai_analysis TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_contract_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type text NOT NULL,
  item_code text NOT NULL,
  item_label text NOT NULL,
  category text,
  weight numeric(5,2) DEFAULT 1,
  is_required boolean DEFAULT true,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_type, item_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_checklist TO authenticated;
GRANT ALL ON public.lg_contract_checklist TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_contract_checklist_response (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  checklist_item_id uuid NOT NULL REFERENCES public.lg_contract_checklist(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING',
  notes text,
  reviewed_by_user_code text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, checklist_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_checklist_response TO authenticated;
GRANT ALL ON public.lg_contract_checklist_response TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_contract_external_share (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.lg_contract_review_version(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  recipient_email text NOT NULL,
  share_token text NOT NULL UNIQUE,
  access_password_hash text,
  expires_at timestamptz NOT NULL,
  download_allowed boolean DEFAULT true,
  upload_allowed boolean DEFAULT true,
  comment_allowed boolean DEFAULT true,
  revoked_at timestamptz,
  revoked_by_user_code text,
  created_by_user_code text,
  access_count int DEFAULT 0,
  last_accessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_external_share TO authenticated;
GRANT ALL ON public.lg_contract_external_share TO service_role;
CREATE INDEX IF NOT EXISTS idx_lces_token ON public.lg_contract_external_share(share_token);

CREATE TABLE IF NOT EXISTS public.lg_contract_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  description text,
  actor_user_code text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_contract_activity TO authenticated;
GRANT ALL ON public.lg_contract_activity TO service_role;
CREATE INDEX IF NOT EXISTS idx_lca_review ON public.lg_contract_activity(review_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.lg_contract_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_lcr_updated ON public.lg_contract_review;
CREATE TRIGGER trg_lcr_updated BEFORE UPDATE ON public.lg_contract_review
  FOR EACH ROW EXECUTE FUNCTION public.lg_contract_set_updated_at();
DROP TRIGGER IF EXISTS trg_lcrc_updated ON public.lg_contract_review_comment;
CREATE TRIGGER trg_lcrc_updated BEFORE UPDATE ON public.lg_contract_review_comment
  FOR EACH ROW EXECUTE FUNCTION public.lg_contract_set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.lg_contract_request_seq START 1000;

INSERT INTO public.lg_contract_checklist (contract_type, item_code, item_label, category, sort_order) VALUES
  ('PROCUREMENT_CONTRACT_REVIEW','SCOPE','Scope clearly defined','SCOPE',10),
  ('PROCUREMENT_CONTRACT_REVIEW','PAYMENT','Payment milestones defined','PAYMENT',20),
  ('PROCUREMENT_CONTRACT_REVIEW','TERMINATION','Termination rights','TERMINATION',30),
  ('PROCUREMENT_CONTRACT_REVIEW','CONFIDENTIALITY','Confidentiality clause','CONFIDENTIALITY',40),
  ('PROCUREMENT_CONTRACT_REVIEW','DATA_PROTECTION','Data protection clause','PRIVACY',50),
  ('PROCUREMENT_CONTRACT_REVIEW','LIABILITY_CAP','Liability cap defined','LIABILITY',60),
  ('PROCUREMENT_CONTRACT_REVIEW','INSURANCE','Insurance requirements','RISK',70),
  ('PROCUREMENT_CONTRACT_REVIEW','DISPUTE','Dispute resolution clause','DISPUTE',80),
  ('PROCUREMENT_CONTRACT_REVIEW','GOVERNING_LAW','Governing law specified','LEGAL',90),
  ('PROCUREMENT_CONTRACT_REVIEW','DELIVERABLES','Deliverables listed','SCOPE',100),
  ('PROCUREMENT_CONTRACT_REVIEW','ACCEPTANCE','Acceptance criteria','SCOPE',110),
  ('MOU_REVIEW','BINDING','Binding/non-binding clauses clear','LEGAL',10),
  ('MOU_REVIEW','RESPONSIBILITIES','Responsibilities defined','SCOPE',20),
  ('MOU_REVIEW','DURATION','Duration specified','TERMS',30),
  ('MOU_REVIEW','CONFIDENTIALITY','Confidentiality clause','CONFIDENTIALITY',40),
  ('MOU_REVIEW','DATA_SHARING','Data sharing defined','PRIVACY',50),
  ('MOU_REVIEW','TERMINATION','Termination provisions','TERMINATION',60),
  ('SOFTWARE_LICENSE_REVIEW','DATA_PROTECTION','Data protection clause','PRIVACY',10),
  ('SOFTWARE_LICENSE_REVIEW','HOSTING','Hosting location specified','TECH',20),
  ('SOFTWARE_LICENSE_REVIEW','SLA','SLA defined','SERVICE',30),
  ('SOFTWARE_LICENSE_REVIEW','CYBERSECURITY','Cybersecurity requirements','SECURITY',40),
  ('SOFTWARE_LICENSE_REVIEW','BREACH_NOTIFY','Breach notification clause','SECURITY',50),
  ('SOFTWARE_LICENSE_REVIEW','IP','IP ownership','IP',60),
  ('SOFTWARE_LICENSE_REVIEW','LICENSING','Licensing terms','IP',70),
  ('SOFTWARE_LICENSE_REVIEW','SUPPORT','Support terms','SERVICE',80)
ON CONFLICT (contract_type, item_code) DO NOTHING;

-- Menu entries (parent: Legal Enforcement 1e9a1000-0000-0000-0000-000000000001)
INSERT INTO public.app_modules (id, name, display_name, route, icon, sort_order, show_in_menu, is_enabled, parent_id)
VALUES
  ('1e9a1000-0000-0000-0000-000000000300','lg_contract_review_root','Contract Review',NULL,'FileSignature',250,true,true,'1e9a1000-0000-0000-0000-000000000001'),
  ('1e9a1000-0000-0000-0000-000000000301','lg_contract_review_dashboard','Contract Review Dashboard','/legal/contract-review/dashboard','LayoutDashboard',5,true,true,'1e9a1000-0000-0000-0000-000000000300'),
  ('1e9a1000-0000-0000-0000-000000000302','lg_contract_review_intake','New Contract Review','/legal/contract-review/new','FilePlus',10,true,true,'1e9a1000-0000-0000-0000-000000000300'),
  ('1e9a1000-0000-0000-0000-000000000303','lg_contract_review_mine','My Review Requests','/legal/contract-review/mine','Inbox',20,true,true,'1e9a1000-0000-0000-0000-000000000300')
ON CONFLICT (id) DO NOTHING;
