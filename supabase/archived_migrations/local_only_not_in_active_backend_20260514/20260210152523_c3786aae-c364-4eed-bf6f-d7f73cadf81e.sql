
-- ============================================================
-- FIX 1: Enable RLS on tb_legal_status
-- ============================================================
ALTER TABLE public.tb_legal_status ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read legal status"
  ON public.tb_legal_status FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage legal status"
  ON public.tb_legal_status FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- ============================================================
-- FIX 2: Restrict profiles - only own profile or admin
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own or admin can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'Admin'::app_role)
  );

-- ============================================================
-- FIX 3: Restrict legal_complainant_settings to authorized users
-- ============================================================
DROP POLICY IF EXISTS "Users can view complainant settings" ON public.legal_complainant_settings;

CREATE POLICY "Authorized users can view complainant settings"
  ON public.legal_complainant_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ============================================================
-- FIX 4: Restrict ip_wages to admin/authorized roles only
-- ============================================================
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.ip_wages;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.ip_wages;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.ip_wages;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.ip_wages;
DROP POLICY IF EXISTS "Allow service role full access ip_wages" ON public.ip_wages;

CREATE POLICY "Admins can read ip_wages"
  ON public.ip_wages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can insert ip_wages"
  ON public.ip_wages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can update ip_wages"
  ON public.ip_wages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

CREATE POLICY "Admins can delete ip_wages"
  ON public.ip_wages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ============================================================
-- FIX 5: Restrict system_settings read to admin only
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON public.system_settings;

CREATE POLICY "Admins can view system settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'::app_role));
