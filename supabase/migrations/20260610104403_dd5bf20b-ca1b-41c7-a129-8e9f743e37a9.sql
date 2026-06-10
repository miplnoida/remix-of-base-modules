ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS duplicate_justification text,
  ADD COLUMN IF NOT EXISTS duplicate_of_violation_id uuid REFERENCES public.ce_violations(id) ON DELETE SET NULL;