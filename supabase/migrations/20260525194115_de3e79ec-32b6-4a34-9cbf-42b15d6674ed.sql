
CREATE TABLE IF NOT EXISTS public.ce_employer_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar(20) NOT NULL,
  employer_name varchar(200),
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('SYSTEM','MANUAL')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','REMOVED')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  added_by varchar(50),
  removed_by varchar(50),
  removed_at timestamptz,
  removal_notes text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_watchlist_employer ON public.ce_employer_watchlist(employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_watchlist_status ON public.ce_employer_watchlist(status);
