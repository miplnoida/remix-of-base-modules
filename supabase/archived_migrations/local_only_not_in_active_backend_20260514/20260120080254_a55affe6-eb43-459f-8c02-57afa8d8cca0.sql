-- Create table for module button bindings
CREATE TABLE public.module_button_bindings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.app_modules(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.module_actions(id) ON DELETE CASCADE,
  button_key VARCHAR(100) NOT NULL,
  button_label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Ensure unique binding per module/button combination
  CONSTRAINT unique_module_button UNIQUE (module_id, button_key)
);

-- Create index for faster lookups
CREATE INDEX idx_module_button_bindings_module ON public.module_button_bindings(module_id);
CREATE INDEX idx_module_button_bindings_action ON public.module_button_bindings(action_id);

-- Enable RLS
ALTER TABLE public.module_button_bindings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can manage button bindings"
ON public.module_button_bindings
FOR ALL
USING (public.is_admin(auth.uid()));

-- Allow all authenticated users to read bindings (for UI visibility checks)
CREATE POLICY "Authenticated users can view button bindings"
ON public.module_button_bindings
FOR SELECT
USING (auth.uid() IS NOT NULL);