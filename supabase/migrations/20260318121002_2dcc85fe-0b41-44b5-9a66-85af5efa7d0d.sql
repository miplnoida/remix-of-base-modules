
-- Add engagement_id to ia_evidence
ALTER TABLE public.ia_evidence ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_working_papers
ALTER TABLE public.ia_working_papers ADD COLUMN IF NOT EXISTS engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Backfill ia_evidence from activities
UPDATE public.ia_evidence e SET engagement_id = a.engagement_id FROM public.ia_activities a WHERE e.activity_id = a.id AND a.engagement_id IS NOT NULL AND e.engagement_id IS NULL;

-- Backfill ia_working_papers from activities
UPDATE public.ia_working_papers wp SET engagement_id = a.engagement_id FROM public.ia_activities a WHERE wp.activity_id = a.id AND a.engagement_id IS NOT NULL AND wp.engagement_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ia_evidence_engagement_id ON public.ia_evidence(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_working_papers_engagement_id ON public.ia_working_papers(engagement_id);
