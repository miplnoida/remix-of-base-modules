
-- ============================================
-- Table: c3_site_settings
-- ============================================
CREATE TABLE public.c3_site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  setting_value text NOT NULL DEFAULT '',
  setting_type text NOT NULL,
  description text,
  environment text DEFAULT 'Production',
  is_deleted boolean NOT NULL DEFAULT false,
  is_synced boolean NOT NULL DEFAULT false,
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

CREATE INDEX idx_c3_site_settings_type ON public.c3_site_settings (setting_type);
CREATE INDEX idx_c3_site_settings_key ON public.c3_site_settings (setting_key);
CREATE INDEX idx_c3_site_settings_unsynced ON public.c3_site_settings (is_synced) WHERE is_synced = false;

-- ============================================
-- Table: c3_email_config
-- ============================================
CREATE TABLE public.c3_email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  config_value text NOT NULL DEFAULT '',
  description text,
  config_group text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  is_synced boolean NOT NULL DEFAULT false,
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_c3_email_config_group ON public.c3_email_config (config_group);
CREATE INDEX idx_c3_email_config_unsynced ON public.c3_email_config (is_synced) WHERE is_synced = false;

-- ============================================
-- Auto-update updated_at triggers
-- ============================================
CREATE OR REPLACE FUNCTION public.update_c3_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_c3_site_settings_updated_at
  BEFORE UPDATE ON public.c3_site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_c3_settings_updated_at();

CREATE TRIGGER trg_c3_email_config_updated_at
  BEFORE UPDATE ON public.c3_email_config
  FOR EACH ROW EXECUTE FUNCTION public.update_c3_settings_updated_at();

-- ============================================
-- Seed: PAYMENT_GATEWAY (2 rows)
-- ============================================
INSERT INTO public.c3_site_settings (setting_key, setting_value, setting_type, description, environment, is_synced) VALUES
('CYBERSOURCE_PRODUCTION', '{"merchant_id":"","key_id":"","secret_key":"","base_url":"https://api.cybersource.com","is_active":true}', 'PAYMENT_GATEWAY', 'CyberSource Production Gateway', 'Production', false),
('CYBERSOURCE_SANDBOX', '{"merchant_id":"","key_id":"","secret_key":"","base_url":"https://apitest.cybersource.com","is_active":false}', 'PAYMENT_GATEWAY', 'CyberSource Sandbox Gateway', 'Sandbox', false);

-- ============================================
-- Seed: PAYMENT_CONFIG (6 rows)
-- ============================================
INSERT INTO public.c3_site_settings (setting_key, setting_value, setting_type, description, environment, is_synced) VALUES
('PAYMENT_CURRENCY', 'XCD', 'PAYMENT_CONFIG', 'Default payment currency code', 'Production', false),
('PAYMENT_COUNTRY', 'KN', 'PAYMENT_CONFIG', 'Default payment country code', 'Production', false),
('PAYMENT_CITY', 'Basseterre', 'PAYMENT_CONFIG', 'Default payment city', 'Production', false),
('PAYMENT_POSTAL_CODE', '00000', 'PAYMENT_CONFIG', 'Default payment postal code', 'Production', false),
('PAYMENT_EMAIL', 'payments@socialsecurity.kn', 'PAYMENT_CONFIG', 'Payment notification email', 'Production', false),
('PAYMENT_PHONE', '+18694652521', 'PAYMENT_CONFIG', 'Payment contact phone', 'Production', false);

-- ============================================
-- Seed: EXTERNAL_API (12 rows - 6 Dev + 6 Prod)
-- ============================================
INSERT INTO public.c3_site_settings (setting_key, setting_value, setting_type, description, environment, is_synced) VALUES
('SSB_EMPLOYER_VALIDATION_API', '{"base_url":"","api_key":"","endpoint":"/api/employer/validate"}', 'EXTERNAL_API', 'Employer validation API', 'Dev', false),
('SSB_EMPLOYEE_VALIDATION_API', '{"base_url":"","api_key":"","endpoint":"/api/employee/validate"}', 'EXTERNAL_API', 'Employee validation API', 'Dev', false),
('SSB_CONTRIBUTION_RATES_API', '{"base_url":"","api_key":"","endpoint":"/api/rates/current"}', 'EXTERNAL_API', 'Contribution rates API', 'Dev', false),
('SSB_PAYMENT_NOTIFICATION_API', '{"base_url":"","api_key":"","endpoint":"/api/payment/notify"}', 'EXTERNAL_API', 'Payment notification callback API', 'Dev', false),
('SSB_REGISTRATION_API', '{"base_url":"","api_key":"","endpoint":"/api/registration/validate"}', 'EXTERNAL_API', 'Registration validation API', 'Dev', false),
('SSB_RECONCILIATION_API', '{"base_url":"","api_key":"","endpoint":"/api/reconciliation/sync"}', 'EXTERNAL_API', 'Reconciliation sync API', 'Dev', false),
('SSB_EMPLOYER_VALIDATION_API', '{"base_url":"","api_key":"","endpoint":"/api/employer/validate"}', 'EXTERNAL_API', 'Employer validation API', 'Production', false),
('SSB_EMPLOYEE_VALIDATION_API', '{"base_url":"","api_key":"","endpoint":"/api/employee/validate"}', 'EXTERNAL_API', 'Employee validation API', 'Production', false),
('SSB_CONTRIBUTION_RATES_API', '{"base_url":"","api_key":"","endpoint":"/api/rates/current"}', 'EXTERNAL_API', 'Contribution rates API', 'Production', false),
('SSB_PAYMENT_NOTIFICATION_API', '{"base_url":"","api_key":"","endpoint":"/api/payment/notify"}', 'EXTERNAL_API', 'Payment notification callback API', 'Production', false),
('SSB_REGISTRATION_API', '{"base_url":"","api_key":"","endpoint":"/api/registration/validate"}', 'EXTERNAL_API', 'Registration validation API', 'Production', false),
('SSB_RECONCILIATION_API', '{"base_url":"","api_key":"","endpoint":"/api/reconciliation/sync"}', 'EXTERNAL_API', 'Reconciliation sync API', 'Production', false);

-- ============================================
-- Seed: SYSTEM (1 row)
-- ============================================
INSERT INTO public.c3_site_settings (setting_key, setting_value, setting_type, description, environment, is_synced) VALUES
('ACTIVE_ENVIRONMENT', 'Production', 'SYSTEM', 'Currently active environment for C3 Wizard', 'Production', false);

-- ============================================
-- Seed: c3_email_config (8 rows)
-- ============================================
INSERT INTO public.c3_email_config (config_key, config_value, description, config_group, is_active, is_synced) VALUES
('IS_TEST_MODE', 'true', 'Enable/disable test mode for emails', 'test', true, false),
('TEST_RECIPIENT_EMAIL', 'test@socialsecurity.kn', 'Email address for test mode delivery', 'test', true, false),
('TEST_RECIPIENT_NAME', 'Test User', 'Display name for test recipient', 'test', true, false),
('C3_RECEIPT_RECIPIENT', 'contributions@socialsecurity.kn', 'C3 receipt notification recipient', 'recipients', true, false),
('PAYMENT_ALERT_RECIPIENT', 'payments@socialsecurity.kn', 'Payment alert notification recipient', 'recipients', true, false),
('ADMIN_ALERT_RECIPIENT', 'admin@socialsecurity.kn', 'Admin alert notification recipient', 'recipients', true, false),
('SENDER_EMAIL', 'noreply@c3wizard.socialsecurity.kn', 'Default sender email address', 'senders', true, false),
('SENDER_NAME', 'C3 Wizard - Social Security Board', 'Default sender display name', 'senders', true, false);
