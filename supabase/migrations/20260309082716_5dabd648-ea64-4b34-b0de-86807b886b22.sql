-- Add engagement_id to ia_activities for lifecycle linkage (Engagement → Activity)
ALTER TABLE public.ia_activities 
ADD COLUMN IF NOT EXISTS engagement_id uuid REFERENCES public.ia_audit_engagements(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ia_activities_engagement_id ON public.ia_activities(engagement_id);