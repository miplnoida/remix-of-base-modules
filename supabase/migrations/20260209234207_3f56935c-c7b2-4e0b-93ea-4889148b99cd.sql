
-- Fix SELECT policy: change from public to authenticated role
DROP POLICY "Admins can view security logs" ON public.system_security_logs;
CREATE POLICY "Admins can view security logs"
  ON public.system_security_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Fix INSERT policy too
DROP POLICY "Authenticated can insert security logs" ON public.system_security_logs;
CREATE POLICY "Authenticated can insert security logs"
  ON public.system_security_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
