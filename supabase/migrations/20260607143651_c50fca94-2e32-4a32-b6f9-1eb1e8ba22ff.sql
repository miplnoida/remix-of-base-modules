
-- =========================================================
-- BN Payment Preparation: schema rework (Phase A)
-- =========================================================

-- 1) Extend bn_payment_instruction
ALTER TABLE public.bn_payment_instruction
  ADD COLUMN IF NOT EXISTS payment_type        VARCHAR(30),
  ADD COLUMN IF NOT EXISTS currency            VARCHAR(8)  DEFAULT 'XCD',
  ADD COLUMN IF NOT EXISTS validation_status   VARCHAR(20) DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS validated_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validated_by        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS validation_errors   JSONB,
  ADD COLUMN IF NOT EXISTS bank_account_snapshot  JSONB,
  ADD COLUMN IF NOT EXISTS cheque_address_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS payee_id            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payee_name          VARCHAR(200);

-- Backfill payment_type from instruction_type if present
UPDATE public.bn_payment_instruction
   SET payment_type = COALESCE(payment_type, instruction_type, 'LUMP_SUM')
 WHERE payment_type IS NULL;

-- Duplicate-period guard for periodic payables
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_pi_entitlement_period
  ON public.bn_payment_instruction (entitlement_id, period_start, period_end)
  WHERE entitlement_id IS NOT NULL
    AND status NOT IN ('CANCELLED','VOIDED','REJECTED');

-- 2) Extend bn_payment_batch
ALTER TABLE public.bn_payment_batch
  ADD COLUMN IF NOT EXISTS batch_type      VARCHAR(20),
  ADD COLUMN IF NOT EXISTS benefit_type    VARCHAR(60),
  ADD COLUMN IF NOT EXISTS payment_period  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bank_account_ref VARCHAR(100),
  ADD COLUMN IF NOT EXISTS prepared_by     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS prepared_at     TIMESTAMPTZ;

-- 3) Extend bn_batch_item
ALTER TABLE public.bn_batch_item
  ADD COLUMN IF NOT EXISTS bank_account_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS cheque_number  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS error_message  TEXT;

-- 4) bn_eft_file
CREATE TABLE IF NOT EXISTS public.bn_eft_file (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID NOT NULL REFERENCES public.bn_payment_batch(id) ON DELETE CASCADE,
  file_reference  VARCHAR(60)  NOT NULL,
  bank_code       VARCHAR(40),
  file_format     VARCHAR(40)  NOT NULL DEFAULT 'CSV',
  file_name       VARCHAR(200) NOT NULL,
  file_hash       VARCHAR(128),
  file_payload    TEXT,
  control_count   INTEGER,
  control_amount  NUMERIC(18,2),
  generated_by    VARCHAR(50),
  generated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  submitted_at    TIMESTAMPTZ,
  submitted_by    VARCHAR(50),
  response_at     TIMESTAMPTZ,
  response_payload TEXT,
  status          VARCHAR(20)  NOT NULL DEFAULT 'GENERATED',
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_eft_file TO authenticated;
GRANT ALL ON public.bn_eft_file TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_eft_file_batch ON public.bn_eft_file(batch_id);

-- 5) bn_cheque_stock (cheque book ranges)
CREATE TABLE IF NOT EXISTS public.bn_cheque_stock (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_ref VARCHAR(100) NOT NULL,
  bank_code       VARCHAR(40),
  series_prefix   VARCHAR(20),
  range_start     BIGINT NOT NULL,
  range_end       BIGINT NOT NULL,
  next_number     BIGINT NOT NULL,
  used_count      INTEGER NOT NULL DEFAULT 0,
  cancelled_count INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  notes           TEXT,
  registered_by   VARCHAR(50),
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_cheque_stock TO authenticated;
GRANT ALL ON public.bn_cheque_stock TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_cheque_stock_bank ON public.bn_cheque_stock(bank_account_ref);

-- 6) bn_cheque_register
CREATE TABLE IF NOT EXISTS public.bn_cheque_register (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id            UUID REFERENCES public.bn_payment_batch(id) ON DELETE SET NULL,
  batch_item_id       UUID REFERENCES public.bn_batch_item(id) ON DELETE SET NULL,
  payment_instruction_id UUID REFERENCES public.bn_payment_instruction(id) ON DELETE SET NULL,
  cheque_stock_id     UUID REFERENCES public.bn_cheque_stock(id) ON DELETE SET NULL,
  cheque_number       VARCHAR(40) NOT NULL,
  cheque_date         DATE,
  payee_name          VARCHAR(200),
  amount              NUMERIC(18,2),
  status              VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED', -- ASSIGNED/PRINTED/REPRINTED/CANCELLED/DISPATCHED/RETURNED/STALE
  printed_at          TIMESTAMPTZ,
  printed_by          VARCHAR(50),
  reprinted_at        TIMESTAMPTZ,
  reprinted_by        VARCHAR(50),
  reprint_reason      TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancelled_by        VARCHAR(50),
  cancellation_reason TEXT,
  corrected_from      VARCHAR(40),
  corrected_by        VARCHAR(50),
  corrected_at        TIMESTAMPTZ,
  dispatched_at       TIMESTAMPTZ,
  dispatched_by       VARCHAR(50),
  dispatch_reference  VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_cheque_register TO authenticated;
GRANT ALL ON public.bn_cheque_register TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_cheque_register_active
  ON public.bn_cheque_register (cheque_number)
  WHERE status NOT IN ('CANCELLED');
CREATE INDEX IF NOT EXISTS ix_bn_cheque_register_batch ON public.bn_cheque_register(batch_id);

-- 7) bn_payment_reconciliation
CREATE TABLE IF NOT EXISTS public.bn_payment_reconciliation (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID REFERENCES public.bn_payment_batch(id) ON DELETE SET NULL,
  batch_item_id   UUID REFERENCES public.bn_batch_item(id) ON DELETE SET NULL,
  eft_file_id     UUID REFERENCES public.bn_eft_file(id) ON DELETE SET NULL,
  cheque_register_id UUID REFERENCES public.bn_cheque_register(id) ON DELETE SET NULL,
  result          VARCHAR(20) NOT NULL, -- ACCEPTED/REJECTED/RETURNED/STALE/MANUAL
  reason_code     VARCHAR(40),
  reason_detail   TEXT,
  bank_reference  VARCHAR(100),
  reconciled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reconciled_by   VARCHAR(50),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_reconciliation TO authenticated;
GRANT ALL ON public.bn_payment_reconciliation TO service_role;
CREATE INDEX IF NOT EXISTS ix_bn_recon_batch ON public.bn_payment_reconciliation(batch_id);

-- 8) Extend bn_country_payment_config with EFT format fields
ALTER TABLE public.bn_country_payment_config
  ADD COLUMN IF NOT EXISTS bank_file_format       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS header_record_format   TEXT,
  ADD COLUMN IF NOT EXISTS detail_record_format   TEXT,
  ADD COLUMN IF NOT EXISTS trailer_record_format  TEXT,
  ADD COLUMN IF NOT EXISTS file_date_format       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS account_number_rule    VARCHAR(120),
  ADD COLUMN IF NOT EXISTS routing_number_rule    VARCHAR(120),
  ADD COLUMN IF NOT EXISTS file_naming_convention VARCHAR(120),
  ADD COLUMN IF NOT EXISTS bank_code              VARCHAR(40);

-- 9) Reusable updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_pay_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_bn_eft_file_uat ON public.bn_eft_file;
CREATE TRIGGER trg_bn_eft_file_uat BEFORE UPDATE ON public.bn_eft_file
  FOR EACH ROW EXECUTE FUNCTION public.bn_pay_set_updated_at();

DROP TRIGGER IF EXISTS trg_bn_cheque_stock_uat ON public.bn_cheque_stock;
CREATE TRIGGER trg_bn_cheque_stock_uat BEFORE UPDATE ON public.bn_cheque_stock
  FOR EACH ROW EXECUTE FUNCTION public.bn_pay_set_updated_at();

DROP TRIGGER IF EXISTS trg_bn_cheque_register_uat ON public.bn_cheque_register;
CREATE TRIGGER trg_bn_cheque_register_uat BEFORE UPDATE ON public.bn_cheque_register
  FOR EACH ROW EXECUTE FUNCTION public.bn_pay_set_updated_at();
