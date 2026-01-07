-- =====================================================
-- PART 2: DEPENDENT TABLES
-- =====================================================

-- Role Permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  module_id UUID NOT NULL REFERENCES public.app_modules(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.module_actions(id) ON DELETE CASCADE,
  is_granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(role, module_id, action_id)
);

-- User Permission Overrides
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.app_modules(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES public.module_actions(id) ON DELETE CASCADE,
  is_granted BOOLEAN NOT NULL,
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, module_id, action_id)
);

-- Audit Logs (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_name TEXT,
  action_type TEXT NOT NULL,
  module_name TEXT,
  entity_type TEXT,
  entity_id TEXT,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notification Types
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('queued', 'sending', 'sent', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  channel notification_channel NOT NULL,
  subject TEXT,
  title TEXT,
  body TEXT NOT NULL,
  placeholders JSONB,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Notification Providers
CREATE TABLE IF NOT EXISTS public.notification_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel notification_channel NOT NULL UNIQUE,
  provider_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.notification_templates(id),
  channel notification_channel NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id),
  recipient_address TEXT NOT NULL,
  subject TEXT,
  title TEXT,
  body TEXT NOT NULL,
  status notification_status DEFAULT 'queued',
  failure_reason TEXT,
  sent_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES auth.users(id),
  trigger_source TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, channel)
);

-- In-App Notifications
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Password Policies
CREATE TABLE IF NOT EXISTS public.password_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  max_age_days INTEGER DEFAULT 90,
  prevent_reuse_count INTEGER DEFAULT 5,
  lockout_threshold INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  session_timeout_minutes INTEGER DEFAULT 60,
  idle_timeout_minutes INTEGER DEFAULT 15,
  max_concurrent_sessions INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Password History
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB,
  last_activity TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MFA Configuration
CREATE TABLE IF NOT EXISTS public.mfa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  is_required BOOLEAN DEFAULT false,
  allowed_methods TEXT[] DEFAULT ARRAY['email', 'authenticator'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default data
INSERT INTO public.password_policies (min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars, max_age_days, prevent_reuse_count, lockout_threshold, lockout_duration_minutes, session_timeout_minutes, idle_timeout_minutes, max_concurrent_sessions)
SELECT 8, true, true, true, true, 90, 5, 5, 30, 60, 15, 3
WHERE NOT EXISTS (SELECT 1 FROM public.password_policies LIMIT 1);

INSERT INTO public.mfa_config (role, is_required, allowed_methods)
VALUES ('Admin', true, ARRAY['email', 'authenticator'])
ON CONFLICT (role) DO NOTHING;

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "rp_select" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "rp_admin" ON public.role_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "upo_select" ON public.user_permission_overrides FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'Admin'));
CREATE POLICY "upo_admin" ON public.user_permission_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "al_select" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'));
CREATE POLICY "al_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "nt_select" ON public.notification_templates FOR SELECT TO authenticated USING (is_enabled = true OR public.has_role(auth.uid(), 'Admin'));
CREATE POLICY "nt_admin" ON public.notification_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "np_admin" ON public.notification_providers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "nl_select" ON public.notification_logs FOR SELECT TO authenticated USING (recipient_user_id = auth.uid() OR public.has_role(auth.uid(), 'Admin'));
CREATE POLICY "nl_insert" ON public.notification_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nl_update" ON public.notification_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "unp_own" ON public.user_notification_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "unp_admin" ON public.user_notification_preferences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "ian_select" ON public.in_app_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ian_update" ON public.in_app_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ian_insert" ON public.in_app_notifications FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "pp_select" ON public.password_policies FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "pp_admin" ON public.password_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "ph_own" ON public.password_history FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ph_insert" ON public.password_history FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "us_own" ON public.user_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "us_admin" ON public.user_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "mfa_select" ON public.mfa_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "mfa_admin" ON public.mfa_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Prevent audit log modification
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_update ON public.audit_logs;
CREATE TRIGGER prevent_audit_update BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS prevent_audit_delete ON public.audit_logs;
CREATE TRIGGER prevent_audit_delete BEFORE DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS prevent_notification_log_delete ON public.notification_logs;
CREATE TRIGGER prevent_notification_log_delete BEFORE DELETE ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Security functions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE (module_id UUID, module_name TEXT, action_id UUID, action_name TEXT, is_granted BOOLEAN, source TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH role_perms AS (
    SELECT rp.module_id, am.name as module_name, rp.action_id, ma.action_name, rp.is_granted, 'role'::TEXT as source
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    JOIN app_modules am ON am.id = rp.module_id
    JOIN module_actions ma ON ma.id = rp.action_id
    WHERE ur.user_id = _user_id AND am.is_enabled = true AND ma.is_enabled = true
  ),
  user_overrides AS (
    SELECT upo.module_id, am.name as module_name, upo.action_id, ma.action_name, upo.is_granted, 'user_override'::TEXT as source
    FROM user_permission_overrides upo
    JOIN app_modules am ON am.id = upo.module_id
    JOIN module_actions ma ON ma.id = upo.action_id
    WHERE upo.user_id = _user_id
  )
  SELECT DISTINCT ON (combined.module_id, combined.action_id) combined.module_id, combined.module_name, combined.action_id, combined.action_name, combined.is_granted, combined.source
  FROM (
    SELECT * FROM user_overrides
    UNION ALL
    SELECT * FROM role_perms rp WHERE NOT EXISTS (SELECT 1 FROM user_overrides uo WHERE uo.module_id = rp.module_id AND uo.action_id = rp.action_id)
  ) combined
  WHERE combined.is_granted = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module_name TEXT, _action_name TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.get_user_permissions(_user_id) p WHERE p.module_name = _module_name AND p.action_name = _action_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_audit_event(_action_type TEXT, _module_name TEXT DEFAULT NULL, _entity_type TEXT DEFAULT NULL, _entity_id TEXT DEFAULT NULL, _field_name TEXT DEFAULT NULL, _old_value TEXT DEFAULT NULL, _new_value TEXT DEFAULT NULL, _metadata JSONB DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _audit_id UUID; _user_email TEXT; _user_name TEXT;
BEGIN
  SELECT email, full_name INTO _user_email, _user_name FROM profiles WHERE id = auth.uid();
  INSERT INTO audit_logs (user_id, user_email, user_name, action_type, module_name, entity_type, entity_id, field_name, old_value, new_value, metadata)
  VALUES (auth.uid(), _user_email, _user_name, _action_type, _module_name, _entity_type, _entity_id, _field_name, _old_value, _new_value, _metadata)
  RETURNING id INTO _audit_id;
  RETURN _audit_id;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON public.notification_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON public.in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);