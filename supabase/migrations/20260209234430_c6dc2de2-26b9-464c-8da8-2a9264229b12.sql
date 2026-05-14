
-- Add proper SELECT policy for admins to read login_security_events
DROP POLICY IF EXISTS "Allow service role full access" ON public.login_security_events;

-- Service role insert (used by edge function)
CREATE POLICY "Service role can insert login events"
  ON public.login_security_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role select (for edge function rate limiting checks)
CREATE POLICY "Service role can select login events"
  ON public.login_security_events
  FOR SELECT
  TO service_role
  USING (true);

-- Admins can view login security events
CREATE POLICY "Admins can view login security events"
  ON public.login_security_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
