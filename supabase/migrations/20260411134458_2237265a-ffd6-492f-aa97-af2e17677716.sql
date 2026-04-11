
-- Enums
DO $$ BEGIN
  CREATE TYPE public.ce_notice_channel AS ENUM ('email', 'print', 'officer_delivery', 'registered_mail', 'courier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ce_delivery_status AS ENUM ('pending', 'dispatched', 'delivered', 'failed', 'returned', 'acknowledged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend existing ce_employer_contact_preferences
ALTER TABLE public.ce_employer_contact_preferences
  ADD COLUMN IF NOT EXISTS physical_delivery_address_1 TEXT,
  ADD COLUMN IF NOT EXISTS physical_delivery_address_2 TEXT,
  ADD COLUMN IF NOT EXISTS physical_delivery_parish TEXT,
  ADD COLUMN IF NOT EXISTS authorized_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS authorized_contact_title TEXT,
  ADD COLUMN IF NOT EXISTS authorized_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS authorized_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS legal_representative_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_representative_firm TEXT,
  ADD COLUMN IF NOT EXISTS legal_representative_phone TEXT,
  ADD COLUMN IF NOT EXISTS legal_representative_email TEXT,
  ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consent_given_by TEXT,
  ADD COLUMN IF NOT EXISTS consent_reference TEXT,
  ADD COLUMN IF NOT EXISTS opt_out_physical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS opt_out_email BOOLEAN DEFAULT false;

-- ce_employer_notice_recipients
CREATE TABLE IF NOT EXISTS public.ce_employer_notice_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  notice_type TEXT NOT NULL,
  notice_reference TEXT,
  source_entity_type TEXT,
  source_entity_id TEXT,
  recipient_name TEXT NOT NULL,
  recipient_role TEXT,
  channel public.ce_notice_channel NOT NULL,
  delivery_address TEXT,
  delivery_email TEXT,
  delivery_status public.ce_delivery_status NOT NULL DEFAULT 'pending',
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  failure_reason TEXT,
  return_reason TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.ce_employer_notice_recipients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_ce_employer_notice_recipients" ON public.ce_employer_notice_recipients
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ce_enr_employer ON public.ce_employer_notice_recipients (employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_enr_status ON public.ce_employer_notice_recipients (delivery_status);
CREATE INDEX IF NOT EXISTS idx_ce_enr_notice_type ON public.ce_employer_notice_recipients (notice_type);
CREATE INDEX IF NOT EXISTS idx_ce_enr_source ON public.ce_employer_notice_recipients (source_entity_type, source_entity_id);

DO $$ BEGIN
  CREATE TRIGGER trg_ce_enr_updated BEFORE UPDATE ON public.ce_employer_notice_recipients
    FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ce_employer_service_log
CREATE TABLE IF NOT EXISTS public.ce_employer_service_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_action TEXT NOT NULL,
  channel public.ce_notice_channel,
  notice_recipient_id UUID REFERENCES public.ce_employer_notice_recipients(id),
  reference_number TEXT,
  source_entity_type TEXT,
  source_entity_id TEXT,
  recipient_name TEXT,
  recipient_address TEXT,
  outcome TEXT NOT NULL DEFAULT 'pending',
  outcome_detail TEXT,
  officer_id TEXT,
  officer_name TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.ce_employer_service_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_ce_employer_service_log" ON public.ce_employer_service_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ce_esl_employer ON public.ce_employer_service_log (employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_esl_type ON public.ce_employer_service_log (service_type);
CREATE INDEX IF NOT EXISTS idx_ce_esl_outcome ON public.ce_employer_service_log (outcome);
CREATE INDEX IF NOT EXISTS idx_ce_esl_attempted ON public.ce_employer_service_log (attempted_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_ce_esl_updated BEFORE UPDATE ON public.ce_employer_service_log
    FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Contact view using actual column names
CREATE OR REPLACE VIEW public.ce_employer_contact_view AS
SELECT
  em.regno AS employer_id,
  em.name AS employer_name,
  em.status AS employer_status,
  em.phone AS master_phone,
  em.fax AS master_fax,
  em.email AS master_email,
  em.maddr1 AS master_mail_address_1,
  em.maddr2 AS master_mail_address_2,
  em.hq_addr1 AS master_hq_address_1,
  em.hq_addr2 AS master_hq_address_2,
  em.mobile AS master_mobile,
  cp.id AS preference_id,
  cp.preferred_channel,
  cp.notice_email,
  cp.notice_phone,
  cp.notice_fax,
  cp.notice_address_line1,
  cp.notice_address_line2,
  cp.compliance_contact_name,
  cp.compliance_contact_title,
  cp.compliance_contact_phone,
  cp.compliance_contact_email,
  cp.authorized_contact_name,
  cp.authorized_contact_email,
  cp.authorized_contact_phone,
  cp.legal_representative_name,
  cp.legal_representative_firm,
  cp.legal_representative_phone,
  cp.legal_representative_email,
  cp.physical_delivery_address_1,
  cp.physical_delivery_address_2,
  cp.physical_delivery_parish,
  cp.consent_given,
  cp.consent_given_at,
  cp.opt_out_physical,
  cp.opt_out_email,
  COALESCE(cp.notice_email, em.email) AS effective_email,
  COALESCE(cp.notice_phone, em.phone) AS effective_phone,
  COALESCE(cp.notice_address_line1, em.maddr1) AS effective_address_1,
  COALESCE(cp.notice_address_line2, em.maddr2) AS effective_address_2,
  COALESCE(cp.preferred_channel, 'email') AS effective_channel
FROM public.er_master em
LEFT JOIN public.ce_employer_contact_preferences cp
  ON cp.employer_id = em.regno AND cp.is_active = true;
