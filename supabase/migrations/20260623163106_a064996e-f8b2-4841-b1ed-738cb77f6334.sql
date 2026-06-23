
-- 1. Parent case enrichments
ALTER TABLE public.lg_case
  ADD COLUMN IF NOT EXISTS employer_account_no text,
  ADD COLUMN IF NOT EXISTS total_outstanding numeric(18,2);

-- 2. Child action table
CREATE TABLE IF NOT EXISTS public.lg_case_action (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  action_kind text NOT NULL CHECK (action_kind IN ('LIABILITY','BENEFIT')),
  action_no text,
  -- Liability head fields
  liability_head_code text CHECK (liability_head_code IS NULL OR liability_head_code IN (
    'SS_CONTRIBUTION','SS_PENALTY',
    'HSD_LEVY_CONTRIBUTION','HSD_LEVY_PENALTY',
    'SEVERANCE_CONTRIBUTION','SEVERANCE_PENALTY',
    'COURT_COST','LEGAL_FEE'
  )),
  period_from date,
  period_to date,
  principal_amount numeric(14,2) NOT NULL DEFAULT 0,
  penalty_amount numeric(14,2) NOT NULL DEFAULT 0,
  cost_amount numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  outstanding_amount numeric(14,2) NOT NULL DEFAULT 0,
  -- Benefit / IP fields
  benefit_action_type text CHECK (benefit_action_type IS NULL OR benefit_action_type IN (
    'BENEFIT_APPEAL','OVERPAYMENT_RECOVERY','FRAUD_REVIEW','ESTATE_RECOVERY','ELIGIBILITY_DISPUTE'
  )),
  insured_person_id uuid,
  claim_id uuid,
  benefit_type text,
  overpayment_amount numeric(14,2),
  -- Court refs (manual)
  suit_no text,
  judgment_summons_no text,
  writ_no text,
  warrant_no text,
  court_code varchar(50) REFERENCES public.lg_court(court_code) ON UPDATE CASCADE ON DELETE SET NULL,
  -- Lifecycle
  stage text NOT NULL DEFAULT 'OPEN',
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','SETTLED','CLOSED','WITHDRAWN')),
  closed_at timestamptz,
  closed_by varchar(50),
  notes text,
  created_by varchar(50),
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_action TO authenticated;
GRANT ALL ON public.lg_case_action TO service_role;
-- NO-RLS per project standard

CREATE INDEX IF NOT EXISTS idx_lg_case_action_case ON public.lg_case_action(case_id);
CREATE INDEX IF NOT EXISTS idx_lg_case_action_case_status ON public.lg_case_action(case_id, status);
CREATE INDEX IF NOT EXISTS idx_lg_case_action_case_head ON public.lg_case_action(case_id, liability_head_code);
CREATE INDEX IF NOT EXISTS idx_lg_case_action_kind ON public.lg_case_action(action_kind);

CREATE OR REPLACE TRIGGER trg_lg_case_action_updated_at
BEFORE UPDATE ON public.lg_case_action
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Action <-> arrangement link
CREATE TABLE IF NOT EXISTS public.lg_case_action_arrangement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.lg_case_action(id) ON DELETE CASCADE,
  arrangement_id uuid NOT NULL REFERENCES public.core_payment_arrangement(id) ON DELETE CASCADE,
  allocated_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (action_id, arrangement_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_case_action_arrangement TO authenticated;
GRANT ALL ON public.lg_case_action_arrangement TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_caa_action ON public.lg_case_action_arrangement(action_id);
CREATE INDEX IF NOT EXISTS idx_lg_caa_arrangement ON public.lg_case_action_arrangement(arrangement_id);

-- 4. Optional per-action reference on proceedings + hearings
ALTER TABLE public.lg_court_proceeding
  ADD COLUMN IF NOT EXISTS case_action_id uuid REFERENCES public.lg_case_action(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lg_court_proceeding_action ON public.lg_court_proceeding(case_action_id);

ALTER TABLE public.lg_hearing
  ADD COLUMN IF NOT EXISTS case_action_id uuid REFERENCES public.lg_case_action(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_lg_hearing_action ON public.lg_hearing(case_action_id);

-- 5. Auto-close parent case when all child actions are closed
CREATE OR REPLACE FUNCTION public.lg_case_action_autoclose_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid := COALESCE(NEW.case_id, OLD.case_id);
  v_open_count integer;
BEGIN
  IF v_case_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO v_open_count
  FROM public.lg_case_action
  WHERE case_id = v_case_id
    AND status NOT IN ('CLOSED','WITHDRAWN');

  IF v_open_count = 0 THEN
    UPDATE public.lg_case
       SET status_code = 'CLOSED',
           closed_date = COALESCE(closed_date, CURRENT_DATE),
           updated_at = now()
     WHERE id = v_case_id
       AND status_code <> 'CLOSED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_case_action_autoclose ON public.lg_case_action;
CREATE TRIGGER trg_lg_case_action_autoclose
AFTER INSERT OR UPDATE OF status OR DELETE ON public.lg_case_action
FOR EACH ROW EXECUTE FUNCTION public.lg_case_action_autoclose_parent();
