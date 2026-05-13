
-- Add engagement_id to ia_action_tracking
ALTER TABLE public.ia_action_tracking ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_management_responses
ALTER TABLE public.ia_management_responses ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_preparation_checklists
ALTER TABLE public.ia_preparation_checklists ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_preparation_documents
ALTER TABLE public.ia_preparation_documents ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_communications
ALTER TABLE public.ia_communications ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_audit_reports
ALTER TABLE public.ia_audit_reports ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Backfill ia_action_tracking from findings
UPDATE public.ia_action_tracking at_tbl
SET engagement_id = f.engagement_id
FROM public.ia_findings f
WHERE at_tbl.finding_id = f.id
  AND f.engagement_id IS NOT NULL
  AND at_tbl.engagement_id IS NULL;

-- Backfill ia_management_responses from findings
UPDATE public.ia_management_responses mr
SET engagement_id = f.engagement_id
FROM public.ia_findings f
WHERE mr.finding_id = f.id
  AND f.engagement_id IS NOT NULL
  AND mr.engagement_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ia_action_tracking_engagement_id ON public.ia_action_tracking(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_management_responses_engagement_id ON public.ia_management_responses(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_preparation_checklists_engagement_id ON public.ia_preparation_checklists(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_preparation_documents_engagement_id ON public.ia_preparation_documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_communications_engagement_id ON public.ia_communications(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_audit_reports_engagement_id ON public.ia_audit_reports(engagement_id);
