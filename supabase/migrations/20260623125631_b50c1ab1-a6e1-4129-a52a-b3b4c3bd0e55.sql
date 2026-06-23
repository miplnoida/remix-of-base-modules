-- Revoke anon SELECT on sensitive tables (NO-RLS architecture; auth enforced at app/edge layer)
REVOKE SELECT ON public.ip_master FROM anon;
REVOKE SELECT ON public.er_master FROM anon;
REVOKE SELECT ON public.cl_head FROM anon;
REVOKE SELECT ON public.au_ip_master FROM anon;
REVOKE SELECT ON public.au_er_master FROM anon;
REVOKE SELECT ON public.audit_logs FROM anon;
REVOKE SELECT ON public.login_security_events FROM anon;
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.ip_depend FROM anon;
REVOKE SELECT ON public.ip_employer FROM anon;
REVOKE SELECT ON public.ip_wages FROM anon;
REVOKE SELECT ON public.ip_self_employ FROM anon;
REVOKE SELECT ON public.ip_documents FROM anon;
REVOKE SELECT ON public.ip_application_documents FROM anon;
REVOKE SELECT ON public.ip_notes FROM anon;
REVOKE SELECT ON public.ip_audit_log FROM anon;
REVOKE SELECT ON public.er_documents FROM anon;
REVOKE SELECT ON public.er_application_documents FROM anon;
REVOKE SELECT ON public.er_owner FROM anon;
REVOKE SELECT ON public.er_notes FROM anon;
REVOKE SELECT ON public.er_audit_log FROM anon;
REVOKE SELECT ON public.er_suit FROM anon;
REVOKE SELECT ON public.cn_payment FROM anon;
REVOKE SELECT ON public.cn_receipt FROM anon;
REVOKE SELECT ON public.cn_payer FROM anon;
REVOKE SELECT ON public.cn_invoices FROM anon;
REVOKE SELECT ON public.cn_c3_reported FROM anon;
REVOKE SELECT ON public.bn_claim FROM anon;
REVOKE SELECT ON public.bn_award FROM anon;
REVOKE SELECT ON public.bn_award_beneficiary FROM anon;
REVOKE SELECT ON public.bn_payment_profile FROM anon;
REVOKE SELECT ON public.bn_payment_instruction FROM anon;
REVOKE SELECT ON public.bn_communication_log FROM anon;
REVOKE SELECT ON public.bn_legal_referral FROM anon;
REVOKE SELECT ON public.lg_case FROM anon;
REVOKE SELECT ON public.lg_case_intake FROM anon;
REVOKE SELECT ON public.lg_case_party FROM anon;
REVOKE SELECT ON public.lg_case_note FROM anon;
REVOKE SELECT ON public.lg_notice FROM anon;
REVOKE SELECT ON public.lg_order FROM anon;
REVOKE SELECT ON public.lg_hearing FROM anon;
REVOKE SELECT ON public.lg_settlement FROM anon;
REVOKE SELECT ON public.lg_document_link FROM anon;
REVOKE SELECT ON public.system_audit_trail FROM anon;
REVOKE SELECT ON public.system_security_logs FROM anon;
REVOKE SELECT ON public.user_sessions FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;
REVOKE SELECT ON public.pii_unlock_logs FROM anon;
REVOKE SELECT ON public.unauthorized_access_logs FROM anon;
REVOKE SELECT ON public.password_history FROM anon;

-- Plaintext credentials/API keys: revoke anon access
REVOKE SELECT ON public.api_settings FROM anon;
REVOKE SELECT ON public.c3_regn FROM anon;
REVOKE SELECT ON public.notification_providers FROM anon;

-- Realtime: remove meetings from the publication so anon/auth users can't subscribe to row changes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'meetings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.meetings';
  END IF;
END $$;