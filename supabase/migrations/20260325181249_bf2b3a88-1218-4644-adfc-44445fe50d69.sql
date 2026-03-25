
-- Phase 1A: Communication stages table
CREATE TABLE IF NOT EXISTS public.ia_communication_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.ia_audit_engagements(id) ON DELETE CASCADE,
  stage_code TEXT NOT NULL,
  stage_order INT NOT NULL,
  template_id UUID REFERENCES public.ia_document_templates(id),
  template_name TEXT,
  communication_id UUID REFERENCES public.ia_communications(id),
  recipient_name TEXT,
  recipient_email TEXT,
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_required BOOLEAN DEFAULT false,
  delivery_status TEXT DEFAULT 'Pending',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_comm_stages_engagement ON public.ia_communication_stages(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_comm_stages_code ON public.ia_communication_stages(stage_code);

-- Phase 1B: Template policy matrix
CREATE TABLE IF NOT EXISTS public.ia_template_policy_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code TEXT NOT NULL,
  required_template_category TEXT NOT NULL,
  required_template_type TEXT,
  is_mandatory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.ia_template_policy_matrix (stage_code, required_template_category, required_template_type, is_mandatory) VALUES
  ('PLAN_INTIMATION', 'Audit Notification', 'Letter', true),
  ('TEAM_AND_SCOPE_NOTICE', 'Team Disclosure', 'Letter', true),
  ('DOC_REQUEST', 'Document Request', 'Letter', true),
  ('ENTRANCE_MEETING', 'Meeting Notice', 'Notice', true),
  ('QUERY_CYCLE', 'Query Response', 'Email', false),
  ('DRAFT_FINDING_DISCUSSION', 'Finding Discussion', 'Notice', true),
  ('EXIT_MEETING', 'Meeting Notice', 'Notice', true),
  ('FINAL_REPORT_ISSUE', 'Audit Report', 'Report', true),
  ('ACTION_PLAN_REMINDER', 'Action Reminder', 'Email', false);

-- Phase 1C: Enhance ia_document_templates with versioning
ALTER TABLE public.ia_document_templates
  ADD COLUMN IF NOT EXISTS version_number INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES public.ia_document_templates(id),
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Phase 1D: Enhance ia_plan_carry_forward
ALTER TABLE public.ia_plan_carry_forward
  ADD COLUMN IF NOT EXISTS target_fiscal_year TEXT,
  ADD COLUMN IF NOT EXISTS original_finding_id UUID REFERENCES public.ia_findings(id),
  ADD COLUMN IF NOT EXISTS original_engagement_id UUID REFERENCES public.ia_audit_engagements(id),
  ADD COLUMN IF NOT EXISTS target_resolution_date DATE,
  ADD COLUMN IF NOT EXISTS escalation_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by TEXT;
