
-- Link orders / fees / document links to specific child legal actions
ALTER TABLE public.lg_order ADD COLUMN IF NOT EXISTS case_action_id uuid REFERENCES public.lg_case_action(id) ON DELETE SET NULL;
ALTER TABLE public.lg_fee_charge ADD COLUMN IF NOT EXISTS case_action_id uuid REFERENCES public.lg_case_action(id) ON DELETE SET NULL;
ALTER TABLE public.lg_document_link ADD COLUMN IF NOT EXISTS case_action_id uuid REFERENCES public.lg_case_action(id) ON DELETE SET NULL;
ALTER TABLE public.lg_notice ADD COLUMN IF NOT EXISTS case_action_id uuid REFERENCES public.lg_case_action(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lg_order_case_action ON public.lg_order(case_action_id);
CREATE INDEX IF NOT EXISTS idx_lg_fee_charge_case_action ON public.lg_fee_charge(case_action_id);
CREATE INDEX IF NOT EXISTS idx_lg_document_link_case_action ON public.lg_document_link(case_action_id);
CREATE INDEX IF NOT EXISTS idx_lg_notice_case_action ON public.lg_notice(case_action_id);

-- Closure reason on parent case for stricter close rule
ALTER TABLE public.lg_case ADD COLUMN IF NOT EXISTS closure_reason text;
ALTER TABLE public.lg_case ADD COLUMN IF NOT EXISTS closed_by text;
