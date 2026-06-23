
-- Add fee_charge_id to lg_document_link for optional linkage to a specific fee charge
ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS fee_charge_id uuid NULL
  REFERENCES public.lg_fee_charge(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lg_doclink_fee_charge
  ON public.lg_document_link(fee_charge_id);
