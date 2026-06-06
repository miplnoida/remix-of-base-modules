
CREATE TABLE IF NOT EXISTS public.bn_entitlement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  ssn VARCHAR(20) NOT NULL,
  claim_number VARCHAR(50),
  product_id UUID REFERENCES public.bn_product(id),
  product_version_id UUID REFERENCES public.bn_product_version(id),
  calculation_id UUID,

  entitlement_type VARCHAR(20) NOT NULL DEFAULT 'PERIODIC',
  payment_frequency VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  weekly_rate NUMERIC(18,2) NOT NULL DEFAULT 0,
  monthly_rate NUMERIC(18,2),
  lump_sum_amount NUMERIC(18,2),
  total_entitlement NUMERIC(18,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  duration_weeks INTEGER,
  weeks_paid INTEGER NOT NULL DEFAULT 0,

  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  next_review_date DATE,

  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  override_applied BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,

  suspended_at TIMESTAMPTZ,
  suspended_by VARCHAR(50),
  suspension_reason TEXT,
  suspension_reason_code_id UUID,

  terminated_at TIMESTAMPTZ,
  terminated_by VARCHAR(50),
  termination_reason TEXT,
  termination_reason_code_id UUID,

  activated_at TIMESTAMPTZ,
  activated_by VARCHAR(50),

  legacy_award_id VARCHAR(50),
  cl_head_claim_no VARCHAR(50),

  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50),
  modified_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_entitlement TO authenticated;
GRANT ALL ON public.bn_entitlement TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_entitlement_claim ON public.bn_entitlement(claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_entitlement_ssn ON public.bn_entitlement(ssn);
CREATE INDEX IF NOT EXISTS idx_bn_entitlement_status ON public.bn_entitlement(status);

-- Link payment_instruction back to entitlement (optional column)
ALTER TABLE public.bn_payment_instruction
  ADD COLUMN IF NOT EXISTS entitlement_id UUID REFERENCES public.bn_entitlement(id);
CREATE INDEX IF NOT EXISTS idx_bn_payment_instruction_entitlement
  ON public.bn_payment_instruction(entitlement_id);
