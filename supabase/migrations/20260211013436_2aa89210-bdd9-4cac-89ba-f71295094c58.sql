
-- Add auto_refresh_enabled column to password_policies
ALTER TABLE public.password_policies 
ADD COLUMN IF NOT EXISTS auto_refresh_enabled boolean DEFAULT true;

-- Update existing active policy with default
UPDATE public.password_policies SET auto_refresh_enabled = true WHERE is_active = true;
