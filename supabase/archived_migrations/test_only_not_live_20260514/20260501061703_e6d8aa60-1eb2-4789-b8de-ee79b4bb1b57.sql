-- One-time exchange codes for cross-app SSO (SocialServe -> satellite apps)
CREATE TABLE IF NOT EXISTS public.auth_exchange_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  ua_hash text NOT NULL,
  ip_hash text NOT NULL,
  issued_for_app text NOT NULL,
  redirect_path text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_exchange_codes_expires_at
  ON public.auth_exchange_codes (expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_exchange_codes_user_id
  ON public.auth_exchange_codes (user_id);

-- RLS enabled with NO policies => only service role can access (clients fully blocked)
ALTER TABLE public.auth_exchange_codes ENABLE ROW LEVEL SECURITY;

-- Cleanup function (call from cron or edge function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_exchange_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.auth_exchange_codes
  WHERE expires_at < now() - interval '1 hour'
     OR (consumed_at IS NOT NULL AND consumed_at < now() - interval '1 hour');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;