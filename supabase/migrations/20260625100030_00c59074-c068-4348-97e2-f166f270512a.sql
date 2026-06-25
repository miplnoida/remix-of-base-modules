
-- 1. Add origin/intake fields to lg_contract_review
ALTER TABLE public.lg_contract_review
  ADD COLUMN IF NOT EXISTS origin_type text NOT NULL DEFAULT 'SOURCE_DEPARTMENT_SUBMISSION',
  ADD COLUMN IF NOT EXISTS received_channel text,
  ADD COLUMN IF NOT EXISTS received_by_legal_user text,
  ADD COLUMN IF NOT EXISTS received_date date,
  ADD COLUMN IF NOT EXISTS original_sender_name text,
  ADD COLUMN IF NOT EXISTS original_sender_email text,
  ADD COLUMN IF NOT EXISTS original_sender_department text,
  ADD COLUMN IF NOT EXISTS source_reference_no text;

ALTER TABLE public.lg_contract_review
  ALTER COLUMN source_department DROP NOT NULL;

-- 2. Internal Legal assignment table
CREATE TABLE IF NOT EXISTS public.lg_advice_assignment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.lg_contract_review(id) ON DELETE CASCADE,
  workbasket_code text,
  team_code text,
  assigned_to_user_id text,
  assigned_to_user_code text,
  role_on_request text NOT NULL DEFAULT 'OWNER',
  assignment_status text NOT NULL DEFAULT 'ACTIVE',
  priority text,
  due_date date,
  assigned_by_user_code text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_advice_assignment TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_advice_assignment TO anon;
GRANT ALL ON public.lg_advice_assignment TO service_role;

CREATE INDEX IF NOT EXISTS lg_advice_assignment_request_idx ON public.lg_advice_assignment(request_id);
CREATE INDEX IF NOT EXISTS lg_advice_assignment_user_idx ON public.lg_advice_assignment(assigned_to_user_code);

-- 3. Document source flag on documents table
ALTER TABLE public.lg_contract_review_document
  ADD COLUMN IF NOT EXISTS document_source text,
  ADD COLUMN IF NOT EXISTS uploaded_department text;
