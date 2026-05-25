
CREATE TABLE IF NOT EXISTS public.ce_notice_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id uuid NOT NULL REFERENCES public.ce_notices(id) ON DELETE CASCADE,
  case_id uuid REFERENCES public.ce_cases(id) ON DELETE SET NULL,
  violation_id uuid REFERENCES public.ce_violations(id) ON DELETE SET NULL,
  employer_id varchar(20) NOT NULL,
  response_type varchar(40) NOT NULL,
  response_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_action varchar(80),
  recorded_by varchar(50) NOT NULL,
  recorded_by_name varchar(200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ce_notice_responses_type_chk CHECK (response_type IN
    ('ACKNOWLEDGEMENT','DISPUTE','EVIDENCE_SUBMITTED','WAIVER_REQUEST','ARRANGEMENT_REQUEST','CLARIFICATION'))
);
CREATE INDEX IF NOT EXISTS idx_ce_notice_responses_notice ON public.ce_notice_responses(notice_id);
CREATE INDEX IF NOT EXISTS idx_ce_notice_responses_case ON public.ce_notice_responses(case_id);
CREATE INDEX IF NOT EXISTS idx_ce_notice_responses_employer ON public.ce_notice_responses(employer_id);
