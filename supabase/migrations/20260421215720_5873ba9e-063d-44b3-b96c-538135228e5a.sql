
ALTER TABLE public.ce_mobile_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_mobile_refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ce_mobile_audit_log DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only - devices" ON public.ce_mobile_devices;
DROP POLICY IF EXISTS "service role only - refresh" ON public.ce_mobile_refresh_tokens;
DROP POLICY IF EXISTS "service role only - audit" ON public.ce_mobile_audit_log;
