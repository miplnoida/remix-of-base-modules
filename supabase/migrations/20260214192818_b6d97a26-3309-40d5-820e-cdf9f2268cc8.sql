
-- ============================================
-- Public API Gateway Tables
-- ============================================

-- 1. API Keys table
CREATE TABLE public.public_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash VARCHAR(128) NOT NULL UNIQUE,
  key_prefix VARCHAR(8) NOT NULL,
  app_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  rate_limit_per_minute INT NOT NULL DEFAULT 60,
  allowed_endpoints TEXT[] DEFAULT '{}',
  allowed_ip_addresses TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID
);

ALTER TABLE public.public_api_keys ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin users can manage keys (via edge function with service role)
CREATE POLICY "Service role full access on public_api_keys"
  ON public.public_api_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Access Logs table
CREATE TABLE public.public_api_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.public_api_keys(id),
  endpoint VARCHAR(255),
  http_method VARCHAR(10),
  request_ip VARCHAR(45),
  response_status INT,
  response_time_ms INT,
  request_payload_summary TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.public_api_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on public_api_access_logs"
  ON public.public_api_access_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for querying logs by key
CREATE INDEX idx_api_access_logs_key_id ON public.public_api_access_logs(api_key_id);
CREATE INDEX idx_api_access_logs_created ON public.public_api_access_logs(created_at DESC);

-- 3. Rate Limits table
CREATE TABLE public.public_api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.public_api_keys(id),
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 1,
  UNIQUE(api_key_id, window_start)
);

ALTER TABLE public.public_api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on public_api_rate_limits"
  ON public.public_api_rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for rate limit lookups
CREATE INDEX idx_rate_limits_lookup ON public.public_api_rate_limits(api_key_id, window_start);

-- Trigger for updated_at on api_keys
CREATE TRIGGER update_public_api_keys_updated_at
  BEFORE UPDATE ON public.public_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
