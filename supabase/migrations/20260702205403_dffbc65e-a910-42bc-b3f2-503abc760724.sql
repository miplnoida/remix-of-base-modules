-- EPIC-06A: Recoverable Liability Foundation
-- Creates the enterprise liability model that every Legal sub-module rolls up from.
-- No RLS (per project architectural rule docs/ARCHITECTURE-NO-RLS-RULE.md).

-- =========================================================================
-- PART 1 — Core liability table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.lg_recoverable_liability (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_case_id                UUID NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,

  -- Source traceability (Part 3)
  source_module             TEXT NOT NULL,          -- COMPLIANCE / ER / BENEFITS / FINANCE / AUDIT / FRAUD / MANUAL / OTHER
  source_record_id          TEXT,                    -- opaque id in source system
  source_reference          TEXT,                    -- human ref (case #, assessment #)
  originating_department    TEXT,
  assessment_number         TEXT,
  assessment_date           DATE,

  -- Classification
  liability_type            TEXT NOT NULL,           -- SS_CONTRIB / HOUSING_LEVY / SEVERANCE / BN_OVERPAYMENT / PENSION_RECOVERY / PENALTY / INTEREST / COURT_COST / LEGAL_COST / ADMIN_COST / OTHER
  fund_type                 TEXT,                    -- SOCIAL_SECURITY / HOUSING / SEVERANCE / BENEFIT / OTHER
  statutory_basis           TEXT,

  -- Period
  contribution_period_from  DATE,
  contribution_period_to    DATE,
  assessment_period         TEXT,

  -- Debtor
  employer_id               TEXT,
  insured_person_id         TEXT,

  -- Financials
  principal                 NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest                  NUMERIC(18,2) NOT NULL DEFAULT 0,
  penalty                   NUMERIC(18,2) NOT NULL DEFAULT 0,
  court_cost                NUMERIC(18,2) NOT NULL DEFAULT 0,
  legal_cost                NUMERIC(18,2) NOT NULL DEFAULT 0,
  other_cost                NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_assessed            NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid                      NUMERIC(18,2) NOT NULL DEFAULT 0,
  outstanding               NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency                  TEXT NOT NULL DEFAULT 'XCD',
  exchange_rate             NUMERIC(18,6) NOT NULL DEFAULT 1,
  allocation_rule           TEXT,                    -- PRINCIPAL_FIRST / INTEREST_FIRST / PENALTY_FIRST / OLDEST_FIRST / MANUAL

  -- Risk / status
  risk_level                TEXT,                    -- LOW / MEDIUM / HIGH / CRITICAL
  priority                  TEXT,                    -- LOW / NORMAL / HIGH / URGENT
  legal_status              TEXT NOT NULL DEFAULT 'DRAFT',
  recovery_status           TEXT NOT NULL DEFAULT 'PENDING',
  hearing_status            TEXT,
  order_status              TEXT,
  arrangement_status        TEXT,
  settlement_status         TEXT,
  appeal_status             TEXT,
  enforcement_status        TEXT,
  writeoff_status           TEXT,

  limitation_date           DATE,
  recovery_sequence         INTEGER,
  remarks                   TEXT,
  status                    TEXT NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE / CLOSED / MERGED / SPLIT / WRITTEN_OFF

  -- Merge/split lineage
  merged_into_id            UUID REFERENCES public.lg_recoverable_liability(id),
  split_from_id             UUID REFERENCES public.lg_recoverable_liability(id),

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                TEXT,
  updated_by                TEXT
);

CREATE INDEX IF NOT EXISTS ix_lg_liab_case      ON public.lg_recoverable_liability(lg_case_id);
CREATE INDEX IF NOT EXISTS ix_lg_liab_source    ON public.lg_recoverable_liability(source_module, source_record_id);
CREATE INDEX IF NOT EXISTS ix_lg_liab_employer  ON public.lg_recoverable_liability(employer_id);
CREATE INDEX IF NOT EXISTS ix_lg_liab_ip        ON public.lg_recoverable_liability(insured_person_id);
CREATE INDEX IF NOT EXISTS ix_lg_liab_status    ON public.lg_recoverable_liability(legal_status, recovery_status);
CREATE INDEX IF NOT EXISTS ix_lg_liab_fund      ON public.lg_recoverable_liability(fund_type, liability_type);

-- Validation triggers (Part 19)
CREATE OR REPLACE FUNCTION public.lg_liab_validate()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.principal < 0 OR NEW.interest < 0 OR NEW.penalty < 0
     OR NEW.court_cost < 0 OR NEW.legal_cost < 0 OR NEW.other_cost < 0
     OR NEW.paid < 0 THEN
    RAISE EXCEPTION 'Liability amounts cannot be negative';
  END IF;
  IF NEW.contribution_period_from IS NOT NULL
     AND NEW.contribution_period_to IS NOT NULL
     AND NEW.contribution_period_from > NEW.contribution_period_to THEN
    RAISE EXCEPTION 'contribution_period_from must be <= contribution_period_to';
  END IF;
  NEW.total_assessed := COALESCE(NEW.principal,0) + COALESCE(NEW.interest,0)
                      + COALESCE(NEW.penalty,0) + COALESCE(NEW.court_cost,0)
                      + COALESCE(NEW.legal_cost,0) + COALESCE(NEW.other_cost,0);
  NEW.outstanding    := GREATEST(NEW.total_assessed - COALESCE(NEW.paid,0), 0);
  IF NEW.paid > NEW.total_assessed + 0.005 THEN
    RAISE EXCEPTION 'paid (%) cannot exceed total_assessed (%)', NEW.paid, NEW.total_assessed;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_lg_liab_validate ON public.lg_recoverable_liability;
CREATE TRIGGER trg_lg_liab_validate
BEFORE INSERT OR UPDATE ON public.lg_recoverable_liability
FOR EACH ROW EXECUTE FUNCTION public.lg_liab_validate();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_recoverable_liability TO authenticated, anon;
GRANT ALL ON public.lg_recoverable_liability TO service_role;

-- =========================================================================
-- PART 2 — Junction tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.lg_hearing_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id   UUID NOT NULL REFERENCES public.lg_hearing(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  coverage_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (hearing_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_hearing_liability TO authenticated, anon;
GRANT ALL ON public.lg_hearing_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_order_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES public.lg_order(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  amount_ordered NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (order_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_order_liability TO authenticated, anon;
GRANT ALL ON public.lg_order_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_arrangement_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL,   -- references core_payment_arrangement.id (loose link)
  liability_id   UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (arrangement_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_arrangement_liability TO authenticated, anon;
GRANT ALL ON public.lg_arrangement_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_settlement_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.lg_settlement(id) ON DELETE CASCADE,
  liability_id  UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  settled_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  waived_amount  NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (settlement_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_settlement_liability TO authenticated, anon;
GRANT ALL ON public.lg_settlement_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_payment_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id  UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  payment_id    TEXT NOT NULL,          -- opaque payment identifier (finance/cashier)
  payment_ref   TEXT,
  payment_date  DATE,
  allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  component     TEXT,                    -- PRINCIPAL / INTEREST / PENALTY / COURT_COST / LEGAL_COST / OTHER
  allocation_rule TEXT,
  remarks       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS ix_lg_pay_alloc_liab ON public.lg_payment_allocation(liability_id);
CREATE INDEX IF NOT EXISTS ix_lg_pay_alloc_pmt  ON public.lg_payment_allocation(payment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_payment_allocation TO authenticated, anon;
GRANT ALL ON public.lg_payment_allocation TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_document_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  doc_role     TEXT,                     -- EVIDENCE / ASSESSMENT / COURT / SETTLEMENT / RECOVERY / AUDIT
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (document_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_document_liability TO authenticated, anon;
GRANT ALL ON public.lg_document_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_task_liability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES public.lg_case_task(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (task_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_task_liability TO authenticated, anon;
GRANT ALL ON public.lg_task_liability TO service_role;

-- =========================================================================
-- Liability notes (Part 16) and audit (Part 21)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.lg_liability_note (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS ix_lg_liab_note_liab ON public.lg_liability_note(liability_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_liability_note TO authenticated, anon;
GRANT ALL ON public.lg_liability_note TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_liability_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  lg_case_id   UUID,
  action       TEXT NOT NULL,          -- CREATE / UPDATE / MERGE / SPLIT / ALLOCATE / RECOVER / SETTLE / APPEAL / WRITE_OFF / LINK / UNLINK
  old_value    JSONB,
  new_value    JSONB,
  remarks      TEXT,
  performed_by TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_lg_liab_audit_liab ON public.lg_liability_audit(liability_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS ix_lg_liab_audit_case ON public.lg_liability_audit(lg_case_id, performed_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_liability_audit TO authenticated, anon;
GRANT ALL ON public.lg_liability_audit TO service_role;

-- Rollup helper: recompute paid/outstanding for a liability from allocations
CREATE OR REPLACE FUNCTION public.lg_liab_recompute_paid(_liability_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path=public AS $$
DECLARE _paid NUMERIC(18,2);
BEGIN
  SELECT COALESCE(SUM(allocated_amount),0) INTO _paid
  FROM public.lg_payment_allocation WHERE liability_id = _liability_id;
  UPDATE public.lg_recoverable_liability
     SET paid = _paid,
         outstanding = GREATEST(total_assessed - _paid, 0),
         recovery_status = CASE
           WHEN total_assessed > 0 AND _paid >= total_assessed - 0.005 THEN 'RECOVERED'
           WHEN _paid > 0 THEN 'PARTIAL'
           ELSE recovery_status
         END,
         updated_at = now()
   WHERE id = _liability_id;
END $$;

CREATE OR REPLACE FUNCTION public.lg_pay_alloc_after_write()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  PERFORM public.lg_liab_recompute_paid(COALESCE(NEW.liability_id, OLD.liability_id));
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_lg_pay_alloc_after ON public.lg_payment_allocation;
CREATE TRIGGER trg_lg_pay_alloc_after
AFTER INSERT OR UPDATE OR DELETE ON public.lg_payment_allocation
FOR EACH ROW EXECUTE FUNCTION public.lg_pay_alloc_after_write();
