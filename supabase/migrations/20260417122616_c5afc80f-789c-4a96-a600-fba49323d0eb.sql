-- Seed C3-Wizard integration config rows in c3_site_settings
-- Existing environments use 'Dev' and 'Production' (per ACTIVE_ENVIRONMENT row).
-- Initial values mirror current hardcoded secrets so cutover is zero-impact.

-- Helper to upsert by (setting_key, environment)
INSERT INTO public.c3_site_settings (setting_key, setting_value, setting_type, description, environment, is_active, is_synced, created_by, updated_by)
VALUES
  -- Base URL (consumed by our side only; tagged URL for grouping)
  ('C3_WIZARD_BASE_URL', 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1', 'URL',
   'Base URL for all C3-Wizard edge functions (wiz-admin-api, c3-config-sync, sync-se-wages)', 'Dev', true, false, 'system', 'system'),
  ('C3_WIZARD_BASE_URL', 'https://nfvtlyvxfxzbhoqzprkr.supabase.co/functions/v1', 'URL',
   'Base URL for all C3-Wizard edge functions (wiz-admin-api, c3-config-sync, sync-se-wages)', 'Production', true, false, 'system', 'system'),

  -- OUTBOUND keys (what we send TO the Wizard)
  ('OUTBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'OUTBOUND_AUTH',
   'Sent as x-admin-api-key when calling Wizard wiz-admin-api', 'Dev', true, false, 'system', 'system'),
  ('OUTBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'OUTBOUND_AUTH',
   'Sent as x-admin-api-key when calling Wizard wiz-admin-api', 'Production', true, false, 'system', 'system'),
  ('OUTBOUND_SYNC_API_KEY', '', 'OUTBOUND_AUTH',
   'Sent as x-sync-api-key when calling Wizard c3-config-sync and sync-se-wages (mirror of edge secret C3_CONFIG_SYNC_API_KEY)', 'Dev', true, false, 'system', 'system'),
  ('OUTBOUND_SYNC_API_KEY', '', 'OUTBOUND_AUTH',
   'Sent as x-sync-api-key when calling Wizard c3-config-sync and sync-se-wages (mirror of edge secret C3_CONFIG_SYNC_API_KEY)', 'Production', true, false, 'system', 'system'),

  -- INBOUND keys (what the Wizard expects to receive — pushed via sync_site_settings on Publish)
  ('INBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'INBOUND_AUTH',
   'Wizard validates incoming x-admin-api-key against this value', 'Dev', true, false, 'system', 'system'),
  ('INBOUND_ADMIN_API_KEY', 'uiop906754drd35fvg', 'INBOUND_AUTH',
   'Wizard validates incoming x-admin-api-key against this value', 'Production', true, false, 'system', 'system'),
  ('INBOUND_SYNC_API_KEY', '', 'INBOUND_AUTH',
   'Wizard validates incoming x-sync-api-key against this value', 'Dev', true, false, 'system', 'system'),
  ('INBOUND_SYNC_API_KEY', '', 'INBOUND_AUTH',
   'Wizard validates incoming x-sync-api-key against this value', 'Production', true, false, 'system', 'system')
ON CONFLICT DO NOTHING;