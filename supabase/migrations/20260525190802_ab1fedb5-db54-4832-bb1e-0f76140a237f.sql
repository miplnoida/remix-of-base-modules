
CREATE TABLE IF NOT EXISTS public.ce_case_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.ce_cases(id) ON DELETE CASCADE,
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('CLOSURE','REOPEN','MERGE')),
  target_case_id UUID REFERENCES public.ce_cases(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  requested_by VARCHAR(50) NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by VARCHAR(50),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_case_requests_case ON public.ce_case_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_requests_status ON public.ce_case_requests(status, request_type);

ALTER TABLE public.ce_case_requests DISABLE ROW LEVEL SECURITY;
