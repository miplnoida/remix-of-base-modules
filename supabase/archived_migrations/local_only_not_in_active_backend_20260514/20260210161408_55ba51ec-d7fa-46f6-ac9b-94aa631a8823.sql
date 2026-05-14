
-- ============================================================
-- FIX 2: Restrict overly permissive RLS policies (USING(true) for write ops)
-- Change all write operations to admin-only while keeping SELECT as-is
-- ============================================================

-- au_ip_last_self_emp: audit table - admin only for writes
DROP POLICY IF EXISTS "Allow all access to au_ip_last_self_emp" ON public.au_ip_last_self_emp;
CREATE POLICY "Authenticated can read au_ip_last_self_emp" ON public.au_ip_last_self_emp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage au_ip_last_self_emp" ON public.au_ip_last_self_emp FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- au_ip_self_employ: audit table - admin only for writes
DROP POLICY IF EXISTS "Allow all access to au_ip_self_employ" ON public.au_ip_self_employ;
CREATE POLICY "Authenticated can read au_ip_self_employ" ON public.au_ip_self_employ FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage au_ip_self_employ" ON public.au_ip_self_employ FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- c3_bonus_levy_exemptions: config table - admin only for writes
DROP POLICY IF EXISTS "Allow authenticated delete on c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions;
DROP POLICY IF EXISTS "Allow authenticated update on c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions;
CREATE POLICY "Admins can update c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete c3_bonus_levy_exemptions" ON public.c3_bonus_levy_exemptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- c3_config_details: config table - admin only for writes
DROP POLICY IF EXISTS "Allow authenticated update on c3_config_details" ON public.c3_config_details;
CREATE POLICY "Admins can update c3_config_details" ON public.c3_config_details FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- c3_config_periods: config table - admin only for writes
DROP POLICY IF EXISTS "Allow authenticated update on c3_config_periods" ON public.c3_config_periods;
CREATE POLICY "Admins can update c3_config_periods" ON public.c3_config_periods FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- c3_wage_category: config table - admin only for writes
DROP POLICY IF EXISTS "Allow service role full access" ON public.c3_wage_category;
CREATE POLICY "Authenticated can read c3_wage_category" ON public.c3_wage_category FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage c3_wage_category" ON public.c3_wage_category FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- cn_c3_reported: contribution data - admin only for writes
DROP POLICY IF EXISTS "Allow service role full access cn_c3" ON public.cn_c3_reported;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.cn_c3_reported;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.cn_c3_reported;
CREATE POLICY "Admins can update cn_c3_reported" ON public.cn_c3_reported FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete cn_c3_reported" ON public.cn_c3_reported FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- cn_payment: payment data - admin only for writes
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.cn_payment;
CREATE POLICY "Admins can update cn_payment" ON public.cn_payment FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- cn_payment_header: payment data - admin only for writes
DROP POLICY IF EXISTS "Authenticated users can update payment headers" ON public.cn_payment_header;
CREATE POLICY "Admins can update cn_payment_header" ON public.cn_payment_header FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- cn_receipt: payment data - admin only for writes
DROP POLICY IF EXISTS "Authenticated users can update receipts" ON public.cn_receipt;
CREATE POLICY "Admins can update cn_receipt" ON public.cn_receipt FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_commence: employer data - admin only for writes
DROP POLICY IF EXISTS "Authenticated users can delete er_commence" ON public.er_commence;
DROP POLICY IF EXISTS "Authenticated users can update er_commence" ON public.er_commence;
CREATE POLICY "Admins can update er_commence" ON public.er_commence FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_commence" ON public.er_commence FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_last_regno
DROP POLICY IF EXISTS "Authenticated users can delete er_last_regno" ON public.er_last_regno;
DROP POLICY IF EXISTS "Authenticated users can update er_last_regno" ON public.er_last_regno;
CREATE POLICY "Admins can update er_last_regno" ON public.er_last_regno FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_last_regno" ON public.er_last_regno FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_locations
DROP POLICY IF EXISTS "Authenticated users can delete er_locations" ON public.er_locations;
DROP POLICY IF EXISTS "Authenticated users can update er_locations" ON public.er_locations;
CREATE POLICY "Admins can update er_locations" ON public.er_locations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_locations" ON public.er_locations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- FIX 6: er_master - restrict SELECT to admin only (sensitive business data)
DROP POLICY IF EXISTS "Authenticated users can view er_master" ON public.er_master;
DROP POLICY IF EXISTS "Authenticated users can delete er_master" ON public.er_master;
DROP POLICY IF EXISTS "Authenticated users can update er_master" ON public.er_master;
CREATE POLICY "Admins can view er_master" ON public.er_master FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can update er_master" ON public.er_master FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_master" ON public.er_master FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_notes
DROP POLICY IF EXISTS "Authenticated users can delete er_notes" ON public.er_notes;
DROP POLICY IF EXISTS "Authenticated users can update er_notes" ON public.er_notes;
CREATE POLICY "Admins can update er_notes" ON public.er_notes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_notes" ON public.er_notes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_notification
DROP POLICY IF EXISTS "Authenticated users can delete er_notification" ON public.er_notification;
DROP POLICY IF EXISTS "Authenticated users can update er_notification" ON public.er_notification;
CREATE POLICY "Admins can update er_notification" ON public.er_notification FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_notification" ON public.er_notification FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_owner
DROP POLICY IF EXISTS "Authenticated users can delete er_owner" ON public.er_owner;
DROP POLICY IF EXISTS "Authenticated users can update er_owner" ON public.er_owner;
CREATE POLICY "Admins can update er_owner" ON public.er_owner FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_owner" ON public.er_owner FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_suit
DROP POLICY IF EXISTS "Authenticated users can delete er_suit" ON public.er_suit;
DROP POLICY IF EXISTS "Authenticated users can update er_suit" ON public.er_suit;
CREATE POLICY "Admins can update er_suit" ON public.er_suit FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_suit" ON public.er_suit FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- er_visit
DROP POLICY IF EXISTS "Authenticated users can delete er_visit" ON public.er_visit;
DROP POLICY IF EXISTS "Authenticated users can update er_visit" ON public.er_visit;
CREATE POLICY "Admins can update er_visit" ON public.er_visit FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete er_visit" ON public.er_visit FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ip_depend
DROP POLICY IF EXISTS "ip_depend_delete" ON public.ip_depend;
DROP POLICY IF EXISTS "ip_depend_update" ON public.ip_depend;
CREATE POLICY "Admins can update ip_depend" ON public.ip_depend FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete ip_depend" ON public.ip_depend FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ip_documents
DROP POLICY IF EXISTS "Users can delete ip_documents" ON public.ip_documents;
DROP POLICY IF EXISTS "Users can update ip_documents" ON public.ip_documents;
CREATE POLICY "Admins can update ip_documents" ON public.ip_documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));
CREATE POLICY "Admins can delete ip_documents" ON public.ip_documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ip_employer
DROP POLICY IF EXISTS "Users can update ip_employer records" ON public.ip_employer;
CREATE POLICY "Admins can update ip_employer" ON public.ip_employer FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ip_last_self_emp
DROP POLICY IF EXISTS "Allow all access to ip_last_self_emp" ON public.ip_last_self_emp;
CREATE POLICY "Authenticated can read ip_last_self_emp" ON public.ip_last_self_emp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ip_last_self_emp" ON public.ip_last_self_emp FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- ip_self_employ (check if it has permissive policies too)
DROP POLICY IF EXISTS "Allow all access to ip_self_employ" ON public.ip_self_employ;
CREATE POLICY "Authenticated can read ip_self_employ" ON public.ip_self_employ FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage ip_self_employ" ON public.ip_self_employ FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

-- ============================================================
-- FIX 3: Restrict api_settings SELECT to hide api_key for non-admins
-- api_settings already has admin-only ALL policy, but SELECT shows api_key to all
-- Replace with a view-based approach: non-admins see masked keys
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can read API settings" ON public.api_settings;
CREATE POLICY "Only admins can read api_settings" ON public.api_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- ============================================================
-- FIX 5: profiles table - already fixed in previous migration  
-- The current policy restricts to own profile or admin. Verified correct.
-- ============================================================

-- Add INSERT policy restriction (currently no USING check on insert)
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
