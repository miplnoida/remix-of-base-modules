
-- Add audit columns to lg_role_type_mapping
ALTER TABLE public.lg_role_type_mapping
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION public.lg_role_type_mapping_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_lg_role_type_mapping_touch ON public.lg_role_type_mapping;
CREATE TRIGGER trg_lg_role_type_mapping_touch
  BEFORE UPDATE ON public.lg_role_type_mapping
  FOR EACH ROW EXECUTE FUNCTION public.lg_role_type_mapping_touch();

-- Seed St. Kitts small-department defaults if missing
INSERT INTO public.lg_role_type_mapping
  (system_role, role_type, can_prepare, can_review, can_approve, can_post_fee, can_close_case, is_active, created_by)
VALUES
  ('LEGAL_OFFICER',   'LG_CASE_HANDLER',    true,  true,  true,  true,  true,  true, 'SEED-LEGAL'),
  ('LEGAL_OFFICER',   'LG_APPROVER',        true,  true,  true,  true,  true,  true, 'SEED-LEGAL'),
  ('LEGAL_ASSISTANT', 'LG_LEGAL_ASSISTANT', true,  false, false, false, false, true, 'SEED-LEGAL'),
  ('LEGAL_MANAGER',   'LG_ADMIN',           true,  true,  true,  true,  true,  true, 'SEED-LEGAL'),
  ('LEGAL_MANAGER',   'LG_APPROVER',        true,  true,  true,  true,  true,  true, 'SEED-LEGAL'),
  ('LEGAL_READ_ONLY', 'LG_READ_ONLY',       false, false, false, false, false, true, 'SEED-LEGAL')
ON CONFLICT DO NOTHING;
