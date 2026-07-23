
GRANT SELECT ON public.cn_payment TO authenticated;
GRANT SELECT ON public.cn_payment_header TO authenticated;
GRANT SELECT ON public.cn_receipt TO authenticated;
GRANT ALL ON public.cn_payment TO service_role;
GRANT ALL ON public.cn_payment_header TO service_role;
GRANT ALL ON public.cn_receipt TO service_role;

ALTER TABLE public.cn_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cn_payment_header ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cn_receipt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cn_payment_authenticated_read" ON public.cn_payment;
CREATE POLICY "cn_payment_authenticated_read" ON public.cn_payment FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cn_payment_header_authenticated_read" ON public.cn_payment_header;
CREATE POLICY "cn_payment_header_authenticated_read" ON public.cn_payment_header FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "cn_receipt_authenticated_read" ON public.cn_receipt;
CREATE POLICY "cn_receipt_authenticated_read" ON public.cn_receipt FOR SELECT TO authenticated USING (true);
