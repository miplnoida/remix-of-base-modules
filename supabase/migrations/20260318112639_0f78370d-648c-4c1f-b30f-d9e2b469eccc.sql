-- Add engagement_id to ia_findings
ALTER TABLE public.ia_findings ADD COLUMN engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Add engagement_id to ia_follow_ups
ALTER TABLE public.ia_follow_ups ADD COLUMN engagement_id UUID REFERENCES public.ia_audit_engagements(id);

-- Backfill ia_findings.engagement_id from ia_activities
UPDATE public.ia_findings f
SET engagement_id = a.engagement_id
FROM public.ia_activities a
WHERE f.activity_id = a.id AND a.engagement_id IS NOT NULL AND f.engagement_id IS NULL;

-- Backfill ia_follow_ups.engagement_id from ia_activities via ia_findings
UPDATE public.ia_follow_ups fu
SET engagement_id = f.engagement_id
FROM public.ia_findings f
WHERE fu.finding_id = f.id AND f.engagement_id IS NOT NULL AND fu.engagement_id IS NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_ia_findings_engagement_id ON public.ia_findings(engagement_id);
CREATE INDEX IF NOT EXISTS idx_ia_follow_ups_engagement_id ON public.ia_follow_ups(engagement_id);