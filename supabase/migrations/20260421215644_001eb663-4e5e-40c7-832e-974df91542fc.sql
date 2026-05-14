
-- ce_mobile_devices: registered devices per officer
CREATE TABLE IF NOT EXISTS public.ce_mobile_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_code VARCHAR(50) NOT NULL,
  device_id VARCHAR(200) NOT NULL,
  device_name VARCHAR(200),
  platform VARCHAR(20),
  app_version VARCHAR(50),
  pin_hash TEXT,
  pin_salt TEXT,
  biometric_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  registered_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  last_ip VARCHAR(64),
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_ce_mobile_devices_user ON public.ce_mobile_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_mobile_devices_device ON public.ce_mobile_devices(device_id);

ALTER TABLE public.ce_mobile_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only - devices"
  ON public.ce_mobile_devices FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ce_mobile_refresh_tokens
CREATE TABLE IF NOT EXISTS public.ce_mobile_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.ce_mobile_devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_mobile_refresh_device ON public.ce_mobile_refresh_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_ce_mobile_refresh_token_hash ON public.ce_mobile_refresh_tokens(token_hash);

ALTER TABLE public.ce_mobile_refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only - refresh"
  ON public.ce_mobile_refresh_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ce_mobile_audit_log
CREATE TABLE IF NOT EXISTS public.ce_mobile_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_code VARCHAR(50),
  device_id UUID REFERENCES public.ce_mobile_devices(id) ON DELETE SET NULL,
  api_key_id UUID,
  action VARCHAR(80) NOT NULL,
  endpoint_path VARCHAR(200),
  http_method VARCHAR(10),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  request_ip VARCHAR(64),
  user_agent TEXT,
  status_code INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_mobile_audit_user ON public.ce_mobile_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_mobile_audit_created ON public.ce_mobile_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_mobile_audit_action ON public.ce_mobile_audit_log(action);

ALTER TABLE public.ce_mobile_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only - audit"
  ON public.ce_mobile_audit_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Officer context helper
CREATE OR REPLACE FUNCTION public.ce_mobile_get_officer_context(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p.id,
    'user_code', p.user_code,
    'full_name', p.full_name,
    'email', p.email,
    'role_name', r.role_name,
    'role_id', p.role_id,
    'is_active', COALESCE(p.is_active, false),
    'territory', p.office_code
  )
  INTO v_result
  FROM public.profiles p
  LEFT JOIN public.roles r ON r.id = p.role_id
  WHERE p.id = p_user_id
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;
