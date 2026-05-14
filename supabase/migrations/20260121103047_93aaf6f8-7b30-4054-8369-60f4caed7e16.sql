-- Add submitted_by and submitted_at columns to ip_master for tracking submission
ALTER TABLE public.ip_master 
ADD COLUMN IF NOT EXISTS submitted_by UUID,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;