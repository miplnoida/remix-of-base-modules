-- Approval policy table
CREATE TABLE IF NOT EXISTS public.ce_audit_comm_approval_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_code TEXT NOT NULL UNIQUE,
  policy_name TEXT NOT NULL,
  description TEXT,
  -- Matching criteria (any field NULL = wildcard)
  match_comm_type TEXT,                    -- e.g. 'final_report'
  match_lifecycle_stage TEXT,              -- e.g. 'final_enforcement'
  match_case_type TEXT,                    -- e.g. 'enforcement', 'audit'
  match_enforcement_stage TEXT,            -- e.g. 'pre_legal', 'legal'
  min_severity TEXT NOT NULL DEFAULT 'none', -- 'none' | 'low' | 'medium' | 'high' | 'critical'
  -- Decision
  direct_send_allowed BOOLEAN NOT NULL DEFAULT false,
  required_roles TEXT[] NOT NULL DEFAULT '{}'::text[],  -- ordered list of CeCommApprovalRole values
  -- Governance
  priority INTEGER NOT NULL DEFAULT 100,   -- lower = higher priority (evaluated first)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_ccap_active_priority
  ON public.ce_audit_comm_approval_policies (is_active, priority);
CREATE INDEX IF NOT EXISTS idx_ccap_match_type
  ON public.ce_audit_comm_approval_policies (match_comm_type, match_lifecycle_stage);

-- Audit columns on the communications table
ALTER TABLE public.ce_audit_communications
  ADD COLUMN IF NOT EXISTS severity_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS applied_policy_id UUID REFERENCES public.ce_audit_comm_approval_policies(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Updated-at trigger (reuse existing function if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ccap_updated_at') THEN
    CREATE TRIGGER trg_ccap_updated_at
      BEFORE UPDATE ON public.ce_audit_comm_approval_policies
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
EXCEPTION WHEN undefined_function THEN
  -- update_updated_at_column not present in this env — skip
  NULL;
END $$;

-- Seed baseline policies (idempotent on policy_code)
INSERT INTO public.ce_audit_comm_approval_policies
  (policy_code, policy_name, description, match_comm_type, match_lifecycle_stage,
   min_severity, direct_send_allowed, required_roles, priority)
VALUES
  ('DIRECT_DOC_REQUEST', 'Direct send — document & info requests',
   'Routine document/info requests can be sent directly without approval.',
   'books_required', NULL, 'none', true, '{}', 50),
  ('DIRECT_ADDL_INFO', 'Direct send — additional info request',
   'Inspector can send additional info requests without supervisor sign-off.',
   'additional_info_request', NULL, 'none', true, '{}', 50),
  ('DIRECT_CLARIFICATION', 'Direct send — clarification request',
   'Clarification requests are inspector-driven and need no approval.',
   'clarification_request', NULL, 'none', true, '{}', 50),
  ('SUPERVISOR_INTERIM', 'Supervisor approval — interim findings',
   'Interim findings require supervisor approval before sending.',
   'interim_findings', NULL, 'none', false, ARRAY['supervisor'], 40),
  ('LEAD_SUP_FINAL_REPORT', 'Lead + Supervisor — final audit report',
   'Final report requires lead inspector and supervisor approval.',
   'final_report', NULL, 'none', false, ARRAY['lead_inspector','supervisor'], 30),
  ('LEGAL_VIOLATION_NOTICE', 'Supervisor + Legal — violation notice',
   'Violation notices require supervisor and legal sign-off.',
   'violation_notice', NULL, 'none', false, ARRAY['supervisor','legal'], 20),
  ('HIGH_SEV_ENFORCEMENT', 'High-severity enforcement escalation',
   'For high/critical severity any final-enforcement comm needs supervisor + legal.',
   NULL, 'final_enforcement', 'high', false, ARRAY['supervisor','legal'], 10),
  ('ESCALATION_SUPERVISOR', 'Supervisor approval — escalation notices',
   'Escalation notices require supervisor approval.',
   'escalation_notice', NULL, 'none', false, ARRAY['supervisor'], 35)
ON CONFLICT (policy_code) DO NOTHING;