ALTER TABLE public.lg_payment_arrangement_link
  ADD COLUMN IF NOT EXISTS liability_head_code text,
  ADD COLUMN IF NOT EXISTS arranged_amount numeric(18,2),
  ADD COLUMN IF NOT EXISTS paid_amount numeric(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outstanding_amount numeric(18,2);

CREATE INDEX IF NOT EXISTS idx_lg_pal_action ON public.lg_payment_arrangement_link(lg_action_id);
CREATE INDEX IF NOT EXISTS idx_lg_pal_head ON public.lg_payment_arrangement_link(liability_head_code);