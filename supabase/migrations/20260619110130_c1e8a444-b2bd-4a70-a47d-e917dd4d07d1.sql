
-- 1) New funding source account table — owns EFT bank-file mechanics per funding bank/account.
CREATE TABLE IF NOT EXISTS public.bn_payment_source_account (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code VARCHAR(8) NOT NULL,
  source_account_code VARCHAR(40) NOT NULL,
  source_account_name VARCHAR(120) NOT NULL,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'EFT',
  bank_id UUID NULL REFERENCES public.bn_bank_master(id) ON DELETE SET NULL,
  bank_code VARCHAR(20) NULL,
  bank_account_number VARCHAR(40) NULL,
  bank_account_name VARCHAR(120) NULL,
  currency_code VARCHAR(8) NULL,
  -- EFT mechanics
  bank_file_format VARCHAR(40) NULL,
  header_record_format TEXT NULL,
  detail_record_format TEXT NULL,
  trailer_record_format TEXT NULL,
  file_naming_convention VARCHAR(120) NULL,
  file_date_format VARCHAR(40) NULL,
  account_number_rule VARCHAR(120) NULL,
  routing_number_rule VARCHAR(120) NULL,
  bank_validation_rule_set JSONB NULL,
  format_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_BANK_SPECIFICATION',
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NULL,
  effective_to DATE NULL,
  notes TEXT NULL,
  entered_by VARCHAR(50) NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50) NULL,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_psa_unique_code UNIQUE (country_code, source_account_code),
  CONSTRAINT bn_psa_format_status_chk CHECK (format_status IN ('PENDING_BANK_SPECIFICATION','DRAFT','READY','RETIRED'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_source_account TO authenticated;
GRANT ALL ON public.bn_payment_source_account TO service_role;
ALTER TABLE public.bn_payment_source_account DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bn_psa_country_method ON public.bn_payment_source_account(country_code, payment_method, is_active);

CREATE OR REPLACE FUNCTION public.bn_psa_set_modified_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.modified_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS bn_psa_modified_at_trg ON public.bn_payment_source_account;
CREATE TRIGGER bn_psa_modified_at_trg BEFORE UPDATE ON public.bn_payment_source_account
FOR EACH ROW EXECUTE FUNCTION public.bn_psa_set_modified_at();

-- Auto-flip format_status to READY when all required EFT fields are populated.
CREATE OR REPLACE FUNCTION public.bn_psa_compute_format_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.payment_method = 'EFT' THEN
    IF NEW.bank_file_format IS NOT NULL
       AND NEW.header_record_format IS NOT NULL
       AND NEW.detail_record_format IS NOT NULL
       AND NEW.trailer_record_format IS NOT NULL
       AND NEW.file_naming_convention IS NOT NULL
       AND NEW.bank_account_number IS NOT NULL THEN
      IF NEW.format_status = 'PENDING_BANK_SPECIFICATION' THEN
        NEW.format_status := 'READY';
      END IF;
    ELSE
      IF NEW.format_status = 'READY' THEN
        NEW.format_status := 'DRAFT';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS bn_psa_format_status_trg ON public.bn_payment_source_account;
CREATE TRIGGER bn_psa_format_status_trg BEFORE INSERT OR UPDATE ON public.bn_payment_source_account
FOR EACH ROW EXECUTE FUNCTION public.bn_psa_compute_format_status();

-- 2) Annotate legacy EFT-format columns on bn_country_payment_config as deprecated fallback.
COMMENT ON COLUMN public.bn_country_payment_config.bank_file_format IS 'DEPRECATED: EFT file format now lives on bn_payment_source_account. Retained as legacy fallback only.';
COMMENT ON COLUMN public.bn_country_payment_config.header_record_format IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.detail_record_format IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.trailer_record_format IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.file_naming_convention IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.file_date_format IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.account_number_rule IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.routing_number_rule IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.bank_validation_rule_set IS 'DEPRECATED: see bn_payment_source_account.';
COMMENT ON COLUMN public.bn_country_payment_config.payment_cycle IS 'Default processing cycle only. Per-cycle method availability lives in bn_country_payment_cycle_method.';

-- 3) Seed SKN country method capability rows for the additional disabled methods.
INSERT INTO public.bn_country_payment_config
  (country_code, payment_method, method_label, is_method_enabled, is_default, default_priority,
   requires_bank_account, requires_mobile_number, allow_third_party_payee, allow_provider_direct_pay,
   payment_cycle, is_active, entered_by)
VALUES
  ('SKN','CASH','Cash',                  false, false, 50, false, false, false, false, 'WEEKLY', true, 'SEED'),
  ('SKN','WIRE','Wire Transfer',         false, false, 60, true,  false, false, false, 'WEEKLY', true, 'SEED'),
  ('SKN','MOBILE_MONEY','Mobile Money',  false, false, 70, false, true,  false, false, 'WEEKLY', true, 'SEED'),
  ('SKN','CARD','Card',                  false, false, 80, false, false, false, false, 'WEEKLY', true, 'SEED'),
  ('SKN','MONEY_ORDER','Money Order',    false, false, 90, false, false, false, false, 'WEEKLY', true, 'SEED')
ON CONFLICT (country_code, payment_method) DO NOTHING;

-- 4) Seed a placeholder EFT source account for SKN in PENDING state (no real bank details invented).
INSERT INTO public.bn_payment_source_account
  (country_code, source_account_code, source_account_name, payment_method, currency_code,
   format_status, is_default, is_active, notes, entered_by)
SELECT 'SKN', 'SKN-EFT-PRIMARY', 'SKN EFT Primary Funding Account (pending)', 'EFT', 'XCD',
       'PENDING_BANK_SPECIFICATION', true, true,
       'Placeholder created so EFT can be enabled at country level. Bank account details and file format must be supplied before EFT batches can generate.',
       'SEED'
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_payment_source_account
   WHERE country_code = 'SKN' AND payment_method = 'EFT'
);
