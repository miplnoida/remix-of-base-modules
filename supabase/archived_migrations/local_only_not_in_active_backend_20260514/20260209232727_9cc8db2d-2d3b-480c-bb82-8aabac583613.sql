
-- Create login security events table for tracking verification attempts
CREATE TABLE public.login_security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  user_id UUID,
  ip_address TEXT,
  device_fingerprint TEXT,
  user_agent TEXT,
  verification_result TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT NOT NULL DEFAULT 'low',
  turnstile_token_valid BOOLEAN DEFAULT false,
  failure_reason TEXT,
  login_success BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_security_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from edge functions (service role will be used)
-- No public select policy - admin only via service role
CREATE POLICY "Allow service role full access"
  ON public.login_security_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for querying recent attempts by email/IP
CREATE INDEX idx_login_security_email ON public.login_security_events (user_email, created_at DESC);
CREATE INDEX idx_login_security_ip ON public.login_security_events (ip_address, created_at DESC);
