-- Create system_settings table for application-wide configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  allowed_values JSONB, -- For dropdown/select options
  is_editable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(50)
);

-- Create index for fast lookups by key
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON public.system_settings(category);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Authenticated users can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage system settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- Insert the display_date_format setting with allowed values
INSERT INTO public.system_settings (
  setting_key,
  setting_value,
  setting_type,
  display_name,
  description,
  category,
  allowed_values,
  is_editable,
  created_by
) VALUES (
  'display_date_format',
  'dd/MM/yyyy',
  'select',
  'Display Date Format',
  'Controls how dates are displayed across all UI screens. This setting is applied globally and affects all date displays in the application.',
  'Display',
  '[
    {"value": "dd/MM/yyyy", "label": "DD/MM/YYYY (31/12/2026)"},
    {"value": "dd-MM-yyyy", "label": "DD-MM-YYYY (31-12-2026)"},
    {"value": "MM/dd/yyyy", "label": "MM/DD/YYYY (12/31/2026)"},
    {"value": "MM-dd-yyyy", "label": "MM-DD-YYYY (12-31-2026)"},
    {"value": "yyyy-MM-dd", "label": "YYYY-MM-DD (2026-12-31)"},
    {"value": "yyyy/MM/dd", "label": "YYYY/MM/DD (2026/12/31)"},
    {"value": "dd MMM yyyy", "label": "DD MMM YYYY (31 Dec 2026)"},
    {"value": "MMM dd, yyyy", "label": "MMM DD, YYYY (Dec 31, 2026)"}
  ]'::jsonb,
  true,
  'SYSTEM'
) ON CONFLICT (setting_key) DO NOTHING;

-- Create a function to get a system setting value
CREATE OR REPLACE FUNCTION public.get_system_setting(p_setting_key VARCHAR)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_value TEXT;
BEGIN
  SELECT setting_value INTO v_value
  FROM public.system_settings
  WHERE setting_key = p_setting_key;
  
  RETURN v_value;
END;
$$;

-- Create a function to update a system setting
CREATE OR REPLACE FUNCTION public.update_system_setting(
  p_setting_key VARCHAR,
  p_setting_value TEXT,
  p_user_code VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.system_settings
  SET 
    setting_value = p_setting_value,
    updated_at = now(),
    updated_by = COALESCE(p_user_code, 'SYSTEM')
  WHERE setting_key = p_setting_key
    AND is_editable = true;
  
  RETURN FOUND;
END;
$$;