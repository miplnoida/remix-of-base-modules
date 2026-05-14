
-- Insert Cloudflare human verification settings into system_settings
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, display_name, description, category, allowed_values, is_editable)
VALUES 
(
  'cloudflare_enabled',
  'true',
  'boolean',
  'Enable Cloudflare Human Verification',
  'When enabled, login flow enforces Cloudflare Turnstile human verification. Disabling this weakens login security. Changes take effect immediately without redeployment.',
  'Security',
  NULL,
  true
),
(
  'cloudflare_allowed_risk_level',
  'LOW',
  'select',
  'Allowed Risk Level',
  'Controls which risk levels are permitted to proceed with login. LOW = only low-risk requests allowed. MEDIUM = low and medium allowed. HIGH = all risk levels allowed (least restrictive).',
  'Security',
  '[{"value":"LOW","label":"Low risk only"},{"value":"MEDIUM","label":"Low + Medium risk"},{"value":"HIGH","label":"All risks (Low, Medium, High)"}]'::jsonb,
  true
);
