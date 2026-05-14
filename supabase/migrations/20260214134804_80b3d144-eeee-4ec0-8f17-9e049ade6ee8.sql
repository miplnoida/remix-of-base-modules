
-- Create a comprehensive api_logs table for external API call logging
CREATE TABLE public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  endpoint_url TEXT,
  http_method TEXT DEFAULT 'GET',
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER,
  response_body JSONB,
  is_success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  related_entity_type TEXT,
  related_entity_id TEXT,
  module TEXT,
  user_id UUID,
  correlation_id UUID,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_api_logs_timestamp ON public.api_logs (execution_timestamp DESC);
CREATE INDEX idx_api_logs_api_name ON public.api_logs (api_name);
CREATE INDEX idx_api_logs_is_success ON public.api_logs (is_success);
CREATE INDEX idx_api_logs_module ON public.api_logs (module);
CREATE INDEX idx_api_logs_related_entity ON public.api_logs (related_entity_type, related_entity_id);
CREATE INDEX idx_api_logs_response_status ON public.api_logs (response_status);

-- Enable RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view (admin check via has_role if available)
CREATE POLICY "Authenticated users can view api logs"
ON public.api_logs FOR SELECT TO authenticated
USING (true);

-- Allow inserts from authenticated users and service role
CREATE POLICY "Authenticated users can insert api logs"
ON public.api_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow service role (edge functions) to insert
CREATE POLICY "Service role can insert api logs"
ON public.api_logs FOR INSERT TO service_role
WITH CHECK (true);

-- Also add indexes to system_technical_logs for better performance monitor queries
CREATE INDEX IF NOT EXISTS idx_system_technical_logs_timestamp ON public.system_technical_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_technical_logs_api_name ON public.system_technical_logs (api_name);
CREATE INDEX IF NOT EXISTS idx_system_technical_logs_status ON public.system_technical_logs (status);
