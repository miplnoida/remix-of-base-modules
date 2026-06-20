
-- Legal department profile (single row)
CREATE TABLE IF NOT EXISTS public.lg_department_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_size_mode TEXT NOT NULL DEFAULT 'SMALL',
  auto_assign_mode TEXT NOT NULL DEFAULT 'SELF_ASSIGN',
  approvals_mode TEXT NOT NULL DEFAULT 'LIGHT',
  assistant_review_required BOOLEAN NOT NULL DEFAULT true,
  manager_role_required BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_department_profile TO authenticated;
GRANT ALL ON public.lg_department_profile TO service_role;

INSERT INTO public.lg_department_profile (department_size_mode, auto_assign_mode, approvals_mode, assistant_review_required, manager_role_required)
SELECT 'SMALL','SELF_ASSIGN','LIGHT', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.lg_department_profile);

-- Mapping from existing system roles to legal role types
CREATE TABLE IF NOT EXISTS public.lg_role_type_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_role TEXT NOT NULL,
  role_type TEXT NOT NULL,
  can_prepare BOOLEAN NOT NULL DEFAULT false,
  can_review  BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_post_fee BOOLEAN NOT NULL DEFAULT false,
  can_close_case BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(system_role, role_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_role_type_mapping TO authenticated;
GRANT ALL ON public.lg_role_type_mapping TO service_role;

INSERT INTO public.lg_role_type_mapping (system_role, role_type, can_prepare, can_review, can_approve, can_post_fee, can_close_case) VALUES
  ('LEGAL_OFFICER',        'LG_CASE_HANDLER',    true,  true,  true,  true,  false),
  ('LEGAL_OFFICER',        'LG_REVIEWER',        true,  true,  true,  true,  false),
  ('LEGAL_OFFICER',        'LG_APPROVER',        true,  true,  true,  true,  true),
  ('SENIOR_LEGAL_OFFICER', 'LG_CASE_HANDLER',    true,  true,  true,  true,  true),
  ('SENIOR_LEGAL_OFFICER', 'LG_REVIEWER',        true,  true,  true,  true,  true),
  ('SENIOR_LEGAL_OFFICER', 'LG_APPROVER',        true,  true,  true,  true,  true),
  ('LEGAL_MANAGER',        'LG_ADMIN',           true,  true,  true,  true,  true),
  ('LEGAL_MANAGER',        'LG_APPROVER',        true,  true,  true,  true,  true),
  ('LEGAL_MANAGER',        'LG_REVIEWER',        true,  true,  true,  true,  true),
  ('LEGAL_ASSISTANT',      'LG_LEGAL_ASSISTANT', true,  false, false, false, false),
  ('LEGAL_READ_ONLY',      'LG_READ_ONLY',       false, false, false, false, false),
  ('ComplianceLegalOfficer','LG_CASE_HANDLER',   true,  true,  true,  true,  false),
  ('ComplianceLegalOfficer','LG_REVIEWER',       true,  true,  true,  true,  false),
  ('ComplianceLegalOfficer','LG_APPROVER',       true,  true,  true,  true,  true),
  ('ComplianceHead',       'LG_ADMIN',           true,  true,  true,  true,  true),
  ('ComplianceHead',       'LG_APPROVER',        true,  true,  true,  true,  true),
  ('ComplianceAdmin',      'LG_ADMIN',           true,  true,  true,  true,  true),
  ('Admin',                'LG_ADMIN',           true,  true,  true,  true,  true)
ON CONFLICT (system_role, role_type) DO NOTHING;

-- Per-action workflow policy
CREATE TABLE IF NOT EXISTS public.lg_workflow_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code TEXT NOT NULL UNIQUE,
  action_label TEXT NOT NULL,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  preparer_role_type TEXT,
  approver_role_type TEXT,
  min_approvers INT NOT NULL DEFAULT 1,
  allow_self_approval BOOLEAN NOT NULL DEFAULT true,
  assistant_can_prepare BOOLEAN NOT NULL DEFAULT true,
  lawyer_must_review BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_workflow_policy TO authenticated;
GRANT ALL ON public.lg_workflow_policy TO service_role;

INSERT INTO public.lg_workflow_policy
  (action_code, action_label, approval_required, preparer_role_type, approver_role_type, assistant_can_prepare, lawyer_must_review) VALUES
  ('NOTICE_DEMAND',       'Demand Notice',          true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('NOTICE_COURT_FILING', 'Court Filing Notice',    true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('NOTICE_SEND',         'Send Notice',            true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('HEARING_BUNDLE',      'Hearing Bundle',         true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('HEARING_OUTCOME',     'Hearing Outcome',        false, 'LG_APPROVER',       'LG_APPROVER', false, false),
  ('FEE_DRAFT',           'Draft Fee Charge',       false, 'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  false),
  ('FEE_POST',            'Post Fee to Ledger',     true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('FEE_WAIVER',          'Fee Waiver',             true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('SETTLEMENT_APPROVE',  'Approve Settlement',     true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('CASE_CLOSE',          'Close Case',             true,  'LG_APPROVER',       'LG_APPROVER', false, true),
  ('ORDER_RECORD',        'Record Court Order',     true,  'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  true),
  ('TASK_CREATE',         'Create Task',            false, 'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  false),
  ('PARTY_UPDATE',        'Update Case Parties',    false, 'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  false),
  ('DOCUMENT_LINK',       'Link Document',          false, 'LG_LEGAL_ASSISTANT','LG_APPROVER', true,  false)
ON CONFLICT (action_code) DO NOTHING;
