
-- Extend lg_order with fields required by the Orders & Judgments module

ALTER TABLE public.lg_order
  ADD COLUMN IF NOT EXISTS hearing_id UUID NULL REFERENCES public.lg_hearing(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compliance_date DATE NULL,
  ADD COLUMN IF NOT EXISTS filed_date DATE NULL,
  ADD COLUMN IF NOT EXISTS granted_date DATE NULL,
  ADD COLUMN IF NOT EXISTS complied_date DATE NULL,
  ADD COLUMN IF NOT EXISTS breached_date DATE NULL,
  ADD COLUMN IF NOT EXISTS closed_date DATE NULL,
  ADD COLUMN IF NOT EXISTS payment_arrangement_id UUID NULL,
  ADD COLUMN IF NOT EXISTS enforcement_ref TEXT NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50) NULL;

CREATE INDEX IF NOT EXISTS idx_lg_order_hearing_id ON public.lg_order(hearing_id);
CREATE INDEX IF NOT EXISTS idx_lg_order_status ON public.lg_order(status);
CREATE INDEX IF NOT EXISTS idx_lg_order_compliance_date ON public.lg_order(compliance_date);
