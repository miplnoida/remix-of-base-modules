
-- Waiver Rules administration table
CREATE TABLE IF NOT EXISTS public.ce_waiver_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  waiver_type VARCHAR(50) NOT NULL,           -- PENALTY, INTEREST, PRINCIPAL, FULL, PARTIAL
  max_percentage NUMERIC(5,2),                -- 0-100
  amount_threshold NUMERIC(15,2),             -- requests >= threshold require workflow
  applicable_violation_type_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  applicable_funds JSONB NOT NULL DEFAULT '[]'::jsonb,           -- e.g. ["SS","ST"]
  valid_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,              -- list of allowed reason codes
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,         -- list of doc-type codes
  approval_workflow_required BOOLEAN NOT NULL DEFAULT true,
  audit_required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decision/audit ledger for every waiver request action
CREATE TABLE IF NOT EXISTS public.ce_waiver_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_id UUID NOT NULL REFERENCES public.ce_waivers(id) ON DELETE CASCADE,
  action VARCHAR(40) NOT NULL,                -- REQUESTED, REVIEWED, APPROVED, REJECTED, APPLIED, CANCELLED
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  amount NUMERIC(15,2),
  reason TEXT,
  comments TEXT,
  workflow_definition_id UUID,
  acted_by VARCHAR(50),
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_waiver_decisions_waiver ON public.ce_waiver_decisions(waiver_id);

-- Track waived amount on cases without deleting original totals
ALTER TABLE public.ce_cases
  ADD COLUMN IF NOT EXISTS amount_waived NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Add violation_id link on waivers so a waiver can target a single violation
ALTER TABLE public.ce_waivers
  ADD COLUMN IF NOT EXISTS violation_id UUID REFERENCES public.ce_violations(id),
  ADD COLUMN IF NOT EXISTS waiver_rule_id UUID REFERENCES public.ce_waiver_rules(id),
  ADD COLUMN IF NOT EXISTS reason_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source VARCHAR(30),               -- CASE, VIOLATION, EMPLOYER_RESPONSE, OFFICER
  ADD COLUMN IF NOT EXISTS workflow_definition_id UUID,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_ce_waivers_case ON public.ce_waivers(case_id);
CREATE INDEX IF NOT EXISTS idx_ce_waivers_violation ON public.ce_waivers(violation_id);

-- updated_at trigger reuse
DROP TRIGGER IF EXISTS trg_ce_waiver_rules_updated ON public.ce_waiver_rules;
CREATE TRIGGER trg_ce_waiver_rules_updated
BEFORE UPDATE ON public.ce_waiver_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
