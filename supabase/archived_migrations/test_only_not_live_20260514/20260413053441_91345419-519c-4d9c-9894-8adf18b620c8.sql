
ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.ce_violations(id),
  ADD COLUMN IF NOT EXISTS split_from_id UUID REFERENCES public.ce_violations(id),
  ADD COLUMN IF NOT EXISTS is_merged BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ce_violations_merged_into ON public.ce_violations(merged_into_id) WHERE merged_into_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_violations_split_from ON public.ce_violations(split_from_id) WHERE split_from_id IS NOT NULL;
