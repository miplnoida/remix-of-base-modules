-- Create table for legal complainant settings
CREATE TABLE IF NOT EXISTS public.legal_complainant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  default_officer TEXT,
  default_priority TEXT DEFAULT 'Medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.legal_complainant_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage complainant settings
CREATE POLICY "Admins can manage complainant settings"
ON public.legal_complainant_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'Admin'::app_role));

-- Allow all authenticated users to view settings
CREATE POLICY "Users can view complainant settings"
ON public.legal_complainant_settings
FOR SELECT
TO authenticated
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_legal_complainant_settings_updated_at
BEFORE UPDATE ON public.legal_complainant_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();