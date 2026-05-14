
-- ============================================================
-- SECURITY FRAMEWORK: All tables for Phases 1-4
-- ============================================================

-- 1. Route Security Config - maps routes to modules with security metadata
CREATE TABLE public.route_security_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_pattern TEXT NOT NULL,
  module_name TEXT NOT NULL,
  screen_name TEXT,
  requires_auth BOOLEAN NOT NULL DEFAULT true,
  admin_only BOOLEAN NOT NULL DEFAULT false,
  is_settings_route BOOLEAN NOT NULL DEFAULT false,
  severity_on_violation TEXT NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE(route_pattern)
);

ALTER TABLE public.route_security_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage route_security_config"
  ON public.route_security_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated can read route_security_config"
  ON public.route_security_config FOR SELECT
  TO authenticated
  USING (true);

-- 2. Unauthorized Access Logs
CREATE TABLE public.unauthorized_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  user_code TEXT,
  ip_address TEXT,
  route_attempted TEXT NOT NULL,
  module_name TEXT,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  user_agent TEXT,
  environment TEXT DEFAULT 'production',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

ALTER TABLE public.unauthorized_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read unauthorized_access_logs"
  ON public.unauthorized_access_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Anyone can insert unauthorized_access_logs"
  ON public.unauthorized_access_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Index for rate limiting queries
CREATE INDEX idx_unauthorized_access_ip_time 
  ON public.unauthorized_access_logs (ip_address, timestamp DESC);

CREATE INDEX idx_unauthorized_access_timestamp 
  ON public.unauthorized_access_logs (timestamp DESC);

-- 3. IP Blocks table
CREATE TABLE public.security_ip_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  block_reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  block_duration_minutes INT NOT NULL DEFAULT 60,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  unblocked_at TIMESTAMPTZ,
  unblocked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_ip_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security_ip_blocks"
  ON public.security_ip_blocks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Anyone can read active ip blocks"
  ON public.security_ip_blocks FOR SELECT
  TO authenticated, anon
  USING (is_active = true AND expires_at > now());

CREATE INDEX idx_ip_blocks_ip ON public.security_ip_blocks (ip_address, is_active);

-- 4. Application Lockdown State
CREATE TABLE public.app_lockdown_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  locked_reason TEXT,
  locked_by TEXT DEFAULT 'SYSTEM',
  unlocked_at TIMESTAMPTZ,
  unlocked_by TEXT,
  unlock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_lockdown_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lockdown state"
  ON public.app_lockdown_state FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admins can manage lockdown state"
  ON public.app_lockdown_state FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- Insert default unlocked state
INSERT INTO public.app_lockdown_state (is_locked, locked_reason)
VALUES (false, 'Initial state - unlocked');

-- 5. Security Configuration (admin-configurable thresholds)
CREATE TABLE public.security_policy_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  data_type TEXT NOT NULL DEFAULT 'number',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.security_policy_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security_policy_config"
  ON public.security_policy_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated can read security_policy_config"
  ON public.security_policy_config FOR SELECT
  TO authenticated
  USING (true);

-- Insert default security configuration values
INSERT INTO public.security_policy_config (config_key, config_value, display_name, description, category, data_type) VALUES
  ('ip_rate_limit_max_attempts', '10', 'Max Unauthorized Attempts Per IP', 'Maximum unauthorized access attempts before IP is blocked', 'rate_limiting', 'number'),
  ('ip_rate_limit_window_minutes', '15', 'Rate Limit Window (Minutes)', 'Time window for counting unauthorized attempts per IP', 'rate_limiting', 'number'),
  ('ip_block_duration_minutes', '60', 'IP Block Duration (Minutes)', 'How long a blocked IP remains blocked', 'rate_limiting', 'number'),
  ('global_attack_threshold', '50', 'Global Attack Threshold', 'Total unauthorized attempts across all IPs before lockdown triggers', 'lockdown', 'number'),
  ('global_attack_window_minutes', '10', 'Global Attack Window (Minutes)', 'Time window for global attack detection', 'lockdown', 'number'),
  ('lockdown_enabled', 'true', 'Enable Application Lockdown', 'Whether automatic application lockdown is enabled', 'lockdown', 'boolean'),
  ('pii_mask_enabled', 'true', 'Enable PII Masking', 'Whether PII data is masked for non-admin users', 'pii', 'boolean'),
  ('pii_unlock_duration_minutes', '15', 'PII Unlock Duration (Minutes)', 'How long PII remains unlocked after credential verification', 'pii', 'number');

-- 6. PII Unlock Audit Logs
CREATE TABLE public.pii_unlock_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_code TEXT,
  profile_id TEXT NOT NULL,
  profile_type TEXT NOT NULL DEFAULT 'insured_person',
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  user_agent TEXT,
  metadata JSONB
);

ALTER TABLE public.pii_unlock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read pii_unlock_logs"
  ON public.pii_unlock_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Authenticated can insert pii_unlock_logs"
  ON public.pii_unlock_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pii_unlock_user ON public.pii_unlock_logs (user_id, unlocked_at DESC);

-- 7. Edge function to check IP rate limit and optionally block
CREATE OR REPLACE FUNCTION public.check_and_log_unauthorized_access(
  _ip_address TEXT,
  _route TEXT,
  _module_name TEXT DEFAULT NULL,
  _user_id UUID DEFAULT NULL,
  _user_email TEXT DEFAULT NULL,
  _reason TEXT DEFAULT 'unauthorized_access',
  _severity TEXT DEFAULT 'medium',
  _user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _max_attempts INT;
  _window_minutes INT;
  _block_duration INT;
  _recent_count INT;
  _is_blocked BOOLEAN;
  _result JSONB;
BEGIN
  -- Log the unauthorized access attempt
  INSERT INTO unauthorized_access_logs (user_id, user_email, ip_address, route_attempted, module_name, reason, severity, user_agent)
  VALUES (_user_id, _user_email, _ip_address, _route, _module_name, _reason, _severity, _user_agent);

  -- Check if IP is already blocked
  SELECT EXISTS(
    SELECT 1 FROM security_ip_blocks 
    WHERE ip_address = _ip_address AND is_active = true AND expires_at > now()
  ) INTO _is_blocked;

  IF _is_blocked THEN
    RETURN jsonb_build_object('blocked', true, 'reason', 'IP is currently blocked');
  END IF;

  -- Get rate limit config
  SELECT COALESCE((SELECT config_value::INT FROM security_policy_config WHERE config_key = 'ip_rate_limit_max_attempts'), 10) INTO _max_attempts;
  SELECT COALESCE((SELECT config_value::INT FROM security_policy_config WHERE config_key = 'ip_rate_limit_window_minutes'), 15) INTO _window_minutes;
  SELECT COALESCE((SELECT config_value::INT FROM security_policy_config WHERE config_key = 'ip_block_duration_minutes'), 60) INTO _block_duration;

  -- Count recent attempts from this IP
  SELECT COUNT(*) INTO _recent_count
  FROM unauthorized_access_logs
  WHERE ip_address = _ip_address
    AND timestamp > now() - (_window_minutes || ' minutes')::INTERVAL;

  -- Block IP if threshold exceeded
  IF _recent_count >= _max_attempts THEN
    INSERT INTO security_ip_blocks (ip_address, block_reason, block_duration_minutes, expires_at)
    VALUES (_ip_address, 'Rate limit exceeded: ' || _recent_count || ' attempts in ' || _window_minutes || ' minutes', 
            _block_duration, now() + (_block_duration || ' minutes')::INTERVAL);
    
    RETURN jsonb_build_object('blocked', true, 'reason', 'IP blocked due to rate limit exceeded', 'attempts', _recent_count);
  END IF;

  -- Check global attack threshold
  DECLARE
    _global_threshold INT;
    _global_window INT;
    _global_count INT;
    _lockdown_enabled BOOLEAN;
  BEGIN
    SELECT COALESCE((SELECT config_value::INT FROM security_policy_config WHERE config_key = 'global_attack_threshold'), 50) INTO _global_threshold;
    SELECT COALESCE((SELECT config_value::INT FROM security_policy_config WHERE config_key = 'global_attack_window_minutes'), 10) INTO _global_window;
    SELECT COALESCE((SELECT config_value::BOOLEAN FROM security_policy_config WHERE config_key = 'lockdown_enabled'), true) INTO _lockdown_enabled;

    IF _lockdown_enabled THEN
      SELECT COUNT(*) INTO _global_count
      FROM unauthorized_access_logs
      WHERE timestamp > now() - (_global_window || ' minutes')::INTERVAL;

      IF _global_count >= _global_threshold THEN
        -- Trigger application lockdown
        UPDATE app_lockdown_state SET 
          is_locked = true, 
          locked_at = now(), 
          locked_reason = 'Automatic lockdown: ' || _global_count || ' unauthorized attempts detected globally',
          locked_by = 'SYSTEM',
          updated_at = now()
        WHERE id = (SELECT id FROM app_lockdown_state ORDER BY created_at DESC LIMIT 1);
        
        RETURN jsonb_build_object('blocked', true, 'lockdown', true, 'reason', 'Application lockdown triggered');
      END IF;
    END IF;
  END;

  RETURN jsonb_build_object('blocked', false, 'attempts', _recent_count, 'max', _max_attempts);
END;
$$;

-- 8. Function to check lockdown state
CREATE OR REPLACE FUNCTION public.get_app_security_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lockdown RECORD;
  _result JSONB;
BEGIN
  SELECT is_locked, locked_at, locked_reason INTO _lockdown
  FROM app_lockdown_state 
  ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'is_locked', COALESCE(_lockdown.is_locked, false),
    'locked_at', _lockdown.locked_at,
    'locked_reason', _lockdown.locked_reason
  );
END;
$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.check_and_log_unauthorized_access TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_app_security_state TO authenticated, anon;
