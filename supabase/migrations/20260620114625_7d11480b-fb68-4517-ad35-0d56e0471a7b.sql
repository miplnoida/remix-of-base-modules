
CREATE TABLE IF NOT EXISTS public.lg_fee_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_rule_code varchar(80) NOT NULL UNIQUE,
  fee_rule_name varchar(200) NOT NULL,
  country_code varchar(10),
  case_type_code varchar(40),
  stage_code varchar(40),
  event_code varchar(60),
  fee_head_id uuid REFERENCES public.tb_income_codes(id),
  fee_head_code varchar(80),
  calculation_type varchar(20) NOT NULL DEFAULT 'FIXED'
    CHECK (calculation_type IN ('FIXED','PERCENTAGE','FORMULA','TIER','MANUAL')),
  base_variable varchar(40),
  fixed_amount numeric(18,2),
  percentage_rate numeric(8,4),
  min_amount numeric(18,2),
  max_amount numeric(18,2),
  formula_code varchar(80),
  tier_config_json jsonb,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  auto_apply boolean NOT NULL DEFAULT false,
  allow_waiver boolean NOT NULL DEFAULT true,
  waiver_requires_approval boolean NOT NULL DEFAULT true,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','DRAFT')),
  notes text,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_rule TO authenticated;
GRANT ALL ON public.lg_fee_rule TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_fee_rule_event ON public.lg_fee_rule(event_code) WHERE auto_apply;
CREATE INDEX IF NOT EXISTS idx_lg_fee_rule_status ON public.lg_fee_rule(status);

CREATE TABLE IF NOT EXISTS public.lg_fee_bundle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_code varchar(80) NOT NULL UNIQUE,
  bundle_name varchar(200) NOT NULL,
  country_code varchar(10),
  case_type_code varchar(40),
  stage_code varchar(40),
  trigger_event varchar(60),
  status varchar(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','DRAFT')),
  description text,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by varchar(50),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_bundle TO authenticated;
GRANT ALL ON public.lg_fee_bundle TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_fee_bundle_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.lg_fee_bundle(id) ON DELETE CASCADE,
  fee_rule_id uuid NOT NULL REFERENCES public.lg_fee_rule(id) ON DELETE RESTRICT,
  sequence_no integer NOT NULL DEFAULT 1,
  mandatory boolean NOT NULL DEFAULT true,
  allow_waiver boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, fee_rule_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_bundle_item TO authenticated;
GRANT ALL ON public.lg_fee_bundle_item TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_fee_bundle_item_bundle ON public.lg_fee_bundle_item(bundle_id);

ALTER TABLE public.lg_fee_charge
  ADD COLUMN IF NOT EXISTS fee_rule_id uuid REFERENCES public.lg_fee_rule(id),
  ADD COLUMN IF NOT EXISTS fee_bundle_id uuid REFERENCES public.lg_fee_bundle(id),
  ADD COLUMN IF NOT EXISTS calculated_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS waived_amount numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiver_status varchar(20) NOT NULL DEFAULT 'NONE'
    CHECK (waiver_status IN ('NONE','REQUESTED','APPROVED','REJECTED')),
  ADD COLUMN IF NOT EXISTS source_event varchar(60),
  ADD COLUMN IF NOT EXISTS auto_applied boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_override_reason text,
  ADD COLUMN IF NOT EXISTS ledger_entry_id uuid REFERENCES public.ce_employer_financial_ledger(id),
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(200);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lg_fee_charge' AND column_name='net_amount') THEN
    ALTER TABLE public.lg_fee_charge ADD COLUMN net_amount numeric(18,2)
      GENERATED ALWAYS AS (COALESCE(amount,0) - COALESCE(waived_amount,0)) STORED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lg_fee_charge_idem ON public.lg_fee_charge(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lg_fee_waiver (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_charge_id uuid NOT NULL REFERENCES public.lg_fee_charge(id) ON DELETE CASCADE,
  waiver_reason_code varchar(80),
  requested_by varchar(50),
  requested_at timestamptz NOT NULL DEFAULT now(),
  waiver_amount numeric(18,2),
  waiver_percent numeric(8,4),
  approval_status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (approval_status IN ('PENDING','APPROVED','REJECTED','AUTO_APPROVED')),
  approved_by varchar(50),
  approved_at timestamptz,
  comments text,
  reversal_ledger_entry_id uuid REFERENCES public.ce_employer_financial_ledger(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_waiver TO authenticated;
GRANT ALL ON public.lg_fee_waiver TO service_role;
CREATE INDEX IF NOT EXISTS idx_lg_fee_waiver_charge ON public.lg_fee_waiver(fee_charge_id);
CREATE INDEX IF NOT EXISTS idx_lg_fee_waiver_status ON public.lg_fee_waiver(approval_status);

CREATE OR REPLACE FUNCTION public.lg_fee_set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_lg_fee_rule_updated ON public.lg_fee_rule;
CREATE TRIGGER trg_lg_fee_rule_updated BEFORE UPDATE ON public.lg_fee_rule
  FOR EACH ROW EXECUTE FUNCTION public.lg_fee_set_updated_at();

DROP TRIGGER IF EXISTS trg_lg_fee_bundle_updated ON public.lg_fee_bundle;
CREATE TRIGGER trg_lg_fee_bundle_updated BEFORE UPDATE ON public.lg_fee_bundle
  FOR EACH ROW EXECUTE FUNCTION public.lg_fee_set_updated_at();

DROP TRIGGER IF EXISTS trg_lg_fee_waiver_updated ON public.lg_fee_waiver;
CREATE TRIGGER trg_lg_fee_waiver_updated BEFORE UPDATE ON public.lg_fee_waiver
  FOR EACH ROW EXECUTE FUNCTION public.lg_fee_set_updated_at();

INSERT INTO public.core_reference_group (group_code, group_name, module_code, is_active)
SELECT 'LG_FEE_EVENT', 'Legal Fee Event', 'LEGAL', true
WHERE NOT EXISTS (SELECT 1 FROM public.core_reference_group WHERE group_code='LG_FEE_EVENT');

INSERT INTO public.core_reference_group (group_code, group_name, module_code, is_active)
SELECT 'LG_WAIVER_REASON', 'Legal Fee Waiver Reason', 'LEGAL', true
WHERE NOT EXISTS (SELECT 1 FROM public.core_reference_group WHERE group_code='LG_WAIVER_REASON');
