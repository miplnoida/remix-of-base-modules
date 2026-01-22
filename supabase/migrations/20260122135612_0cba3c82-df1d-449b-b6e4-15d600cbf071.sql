-- Create table for storing external API configuration settings
CREATE TABLE public.api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_name VARCHAR(255) NOT NULL,
  base_url TEXT,
  api_key TEXT,
  header_name VARCHAR(100) DEFAULT 'x-api-key',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for all authenticated users to read settings
CREATE POLICY "Authenticated users can read API settings" 
ON public.api_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create policy for admins to manage settings (using profiles-based admin check)
CREATE POLICY "Admins can manage API settings" 
ON public.api_settings 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_settings_updated_at
BEFORE UPDATE ON public.api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default API setting for Insured Person Applications
INSERT INTO public.api_settings (
  setting_key,
  setting_name,
  base_url,
  api_key,
  header_name,
  is_active,
  description
) VALUES (
  'insured_person_api',
  'Insured Person Applications API',
  'https://contributors.secureserve.biz/api-test',
  'ip_ssb@264kH7vP9jW2xN5mR8tL3yQ1bZ6cE4gF9a-',
  'x-api-key',
  true,
  'API configuration for fetching and managing insured person online registration applications'
);