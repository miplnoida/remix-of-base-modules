
-- Storage bucket for application assets (logos etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- System settings for app logo
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, display_name, description, category, is_editable)
VALUES 
  ('app_logo_url', '/images/ssb-logo.png', 'text', 'Application Logo URL', 'URL of the application logo displayed in sidebar and header. Upload a new logo in the Application UI Settings section.', 'Application UI', false),
  ('toast_position_success', 'top-right', 'select', 'Toast Position — Success', 'Screen position for success toast messages.', 'Application UI', true),
  ('toast_position_error', 'top-right', 'select', 'Toast Position — Error', 'Screen position for error toast messages.', 'Application UI', true),
  ('toast_position_warning', 'top-right', 'select', 'Toast Position — Warning', 'Screen position for warning toast messages.', 'Application UI', true),
  ('toast_position_info', 'top-right', 'select', 'Toast Position — Info', 'Screen position for info toast messages.', 'Application UI', true),
  ('toast_duration_success', '4', 'number', 'Toast Duration — Success (seconds)', 'How long success toast messages stay visible.', 'Application UI', true),
  ('toast_duration_error', '6', 'number', 'Toast Duration — Error (seconds)', 'How long error toast messages stay visible.', 'Application UI', true),
  ('toast_duration_warning', '5', 'number', 'Toast Duration — Warning (seconds)', 'How long warning toast messages stay visible.', 'Application UI', true),
  ('toast_duration_info', '4', 'number', 'Toast Duration — Info (seconds)', 'How long info toast messages stay visible.', 'Application UI', true)
ON CONFLICT DO NOTHING;

-- Update allowed_values for position selects
UPDATE public.system_settings
SET allowed_values = '[{"value":"top-right","label":"Top Right"},{"value":"top-left","label":"Top Left"},{"value":"bottom-right","label":"Bottom Right"},{"value":"bottom-left","label":"Bottom Left"},{"value":"top-center","label":"Top Center"},{"value":"bottom-center","label":"Bottom Center"}]'::jsonb
WHERE setting_key IN ('toast_position_success','toast_position_error','toast_position_warning','toast_position_info');

-- Payment module config for receipt/invoice logo
INSERT INTO public.payment_module_config (config_key, config_value, description)
VALUES ('receipt_invoice_logo_url', '"/images/ssb-logo.png"'::jsonb, 'Logo URL used in receipt and invoice templates via {{logo_url}} placeholder.')
ON CONFLICT DO NOTHING;
