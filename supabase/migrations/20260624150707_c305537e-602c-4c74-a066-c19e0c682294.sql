
-- ============================================================
-- Legal Referral Packet / Items model
-- Extends ce_legal_referrals + bn_legal_referral and introduces
-- the shared core_legal_referral_item table.
-- ============================================================

-- 1. Shared referral-item table -------------------------------
CREATE TABLE IF NOT EXISTS public.core_legal_referral_item (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id              UUID NOT NULL,
  source_module            TEXT NOT NULL CHECK (source_module IN ('COMPLIANCE','BENEFITS','FINANCE')),
  source_record_type       TEXT NOT NULL,            -- LEDGER_TXN, INSTALLMENT, CLAIM, OVERPAYMENT, AWARD, APPEAL, FRAUD, FINANCE_DEBT
  source_record_id         TEXT,
  source_reference_no      TEXT,
  debtor_type              TEXT NOT NULL CHECK (debtor_type IN ('EMPLOYER','INSURED_PERSON','BENEFICIARY','ESTATE','OTHER')),
  debtor_id                TEXT,
  debtor_name              TEXT,
  item_type                TEXT NOT NULL CHECK (item_type IN ('LIABILITY','CLAIM','OVERPAYMENT','APPEAL','FRAUD','FINANCE_DEBT','ESTATE_RECOVERY','PAYMENT_AFTER_DEATH')),
  liability_head_code      TEXT,
  fund_code                TEXT,                     -- SS / LV / PE / null
  period_from              DATE,
  period_to                DATE,
  principal_amount         NUMERIC(18,2) NOT NULL DEFAULT 0,
  penalty_amount           NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_amount          NUMERIC(18,2) NOT NULL DEFAULT 0,
  cost_amount              NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount             NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_referred          NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_retained_by_source NUMERIC(18,2) NOT NULL DEFAULT 0,
  referral_reason_code     TEXT,
  status                   TEXT NOT NULL DEFAULT 'PROPOSED'
                           CHECK (status IN ('PROPOSED','SELECTED','REFERRED','ACCEPTED','REJECTED','CLOSED','RETURNED')),
  decision_reason          TEXT,
  lg_case_action_id        UUID,                     -- back-link once a Legal action is created
  source_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by               TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by               TEXT,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per Project Knowledge entry "Do not implement RLS" -> role-based only.
-- Grants required because Lovable Cloud DataAPI has no defaults.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legal_referral_item TO authenticated;
GRANT ALL ON public.core_legal_referral_item TO service_role;

CREATE INDEX IF NOT EXISTS idx_core_lri_referral        ON public.core_legal_referral_item (referral_id);
CREATE INDEX IF NOT EXISTS idx_core_lri_source          ON public.core_legal_referral_item (source_module, source_record_type, source_record_id);
CREATE INDEX IF NOT EXISTS idx_core_lri_debtor          ON public.core_legal_referral_item (debtor_type, debtor_id);
CREATE INDEX IF NOT EXISTS idx_core_lri_status          ON public.core_legal_referral_item (status);

-- updated_at trigger (use existing public.update_updated_at_column if present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $f$;
  END IF;
END$$;

DROP TRIGGER IF EXISTS trg_core_lri_updated ON public.core_legal_referral_item;
CREATE TRIGGER trg_core_lri_updated
  BEFORE UPDATE ON public.core_legal_referral_item
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-maintain total_amount if caller omits it.
CREATE OR REPLACE FUNCTION public.core_lri_compute_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.total_amount IS NULL OR NEW.total_amount = 0 THEN
    NEW.total_amount := COALESCE(NEW.principal_amount,0)+COALESCE(NEW.penalty_amount,0)
                        +COALESCE(NEW.interest_amount,0)+COALESCE(NEW.cost_amount,0);
  END IF;
  IF NEW.amount_referred IS NULL OR NEW.amount_referred = 0 THEN
    NEW.amount_referred := NEW.total_amount;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_core_lri_totals ON public.core_legal_referral_item;
CREATE TRIGGER trg_core_lri_totals
  BEFORE INSERT OR UPDATE ON public.core_legal_referral_item
  FOR EACH ROW EXECUTE FUNCTION public.core_lri_compute_totals();

-- 2. Extend ce_legal_referrals header --------------------------
ALTER TABLE public.ce_legal_referrals
  ADD COLUMN IF NOT EXISTS source_module          TEXT DEFAULT 'COMPLIANCE',
  ADD COLUMN IF NOT EXISTS source_record_id       TEXT,
  ADD COLUMN IF NOT EXISTS source_reference_no    TEXT,
  ADD COLUMN IF NOT EXISTS referred_by            TEXT,
  ADD COLUMN IF NOT EXISTS referred_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_reason_code   TEXT,
  ADD COLUMN IF NOT EXISTS referral_reason_text   TEXT,
  ADD COLUMN IF NOT EXISTS total_referred_amount  NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS items_count            INTEGER NOT NULL DEFAULT 0;

-- 3. Extend bn_legal_referral header ---------------------------
ALTER TABLE public.bn_legal_referral
  ADD COLUMN IF NOT EXISTS source_module          TEXT DEFAULT 'BENEFITS',
  ADD COLUMN IF NOT EXISTS source_record_id       TEXT,
  ADD COLUMN IF NOT EXISTS source_reference_no    TEXT,
  ADD COLUMN IF NOT EXISTS referred_by            TEXT,
  ADD COLUMN IF NOT EXISTS referred_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_reason_code   TEXT,
  ADD COLUMN IF NOT EXISTS referral_reason_text   TEXT,
  ADD COLUMN IF NOT EXISTS total_referred_amount  NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS items_count            INTEGER NOT NULL DEFAULT 0;

-- 4. Extend lg_case_action to reference referral items ---------
ALTER TABLE public.lg_case_action
  ADD COLUMN IF NOT EXISTS referral_item_id  UUID,
  ADD COLUMN IF NOT EXISTS source_module     TEXT,
  ADD COLUMN IF NOT EXISTS fund_code         TEXT,
  ADD COLUMN IF NOT EXISTS interest_amount   NUMERIC(18,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lg_case_action_referral_item ON public.lg_case_action (referral_item_id);

-- 5. Maintain header totals/count when items change ------------
CREATE OR REPLACE FUNCTION public.core_lri_sync_header_totals()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_module TEXT;
  v_ref    UUID;
  v_total  NUMERIC(18,2);
  v_count  INTEGER;
BEGIN
  v_ref := COALESCE(NEW.referral_id, OLD.referral_id);
  v_module := COALESCE(NEW.source_module, OLD.source_module);

  SELECT COALESCE(SUM(amount_referred),0), COUNT(*)
    INTO v_total, v_count
    FROM public.core_legal_referral_item
   WHERE referral_id = v_ref;

  IF v_module = 'COMPLIANCE' THEN
    UPDATE public.ce_legal_referrals
       SET total_referred_amount = v_total, items_count = v_count, updated_at = now()
     WHERE id = v_ref;
  ELSIF v_module = 'BENEFITS' THEN
    UPDATE public.bn_legal_referral
       SET total_referred_amount = v_total, items_count = v_count, updated_at = now()
     WHERE id = v_ref;
  END IF;

  RETURN NULL;
END;$$;

DROP TRIGGER IF EXISTS trg_core_lri_sync_header ON public.core_legal_referral_item;
CREATE TRIGGER trg_core_lri_sync_header
  AFTER INSERT OR UPDATE OR DELETE ON public.core_legal_referral_item
  FOR EACH ROW EXECUTE FUNCTION public.core_lri_sync_header_totals();

-- 6. Validation: block duplicate active referral item ----------
CREATE OR REPLACE FUNCTION public.core_lri_block_duplicate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.source_record_id IS NULL OR NEW.source_record_type IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.core_legal_referral_item
     WHERE source_module = NEW.source_module
       AND source_record_type = NEW.source_record_type
       AND source_record_id = NEW.source_record_id
       AND id <> COALESCE(NEW.id,'00000000-0000-0000-0000-000000000000'::uuid)
       AND status NOT IN ('REJECTED','CLOSED','RETURNED')
  ) THEN
    RAISE EXCEPTION 'A live legal referral item already exists for % % %', NEW.source_module, NEW.source_record_type, NEW.source_record_id
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_core_lri_dup ON public.core_legal_referral_item;
CREATE TRIGGER trg_core_lri_dup
  BEFORE INSERT ON public.core_legal_referral_item
  FOR EACH ROW EXECUTE FUNCTION public.core_lri_block_duplicate();
