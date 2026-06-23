
-- =====================================================
-- Central Payment Arrangement Framework
-- Cross-module model for Compliance / Legal / Benefits / Finance
-- Follows project NO-RLS architecture (RLS disabled in public schema).
-- =====================================================

-- 1. Header --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_payment_arrangement (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_no                  varchar(60) NOT NULL UNIQUE,
  debtor_type                     varchar(30) NOT NULL DEFAULT 'EMPLOYER',
  debtor_id                       varchar(100) NOT NULL,
  debtor_name                     varchar(200),
  source_module_created_by        varchar(20) NOT NULL DEFAULT 'COMPLIANCE',
  arrangement_type                varchar(40) NOT NULL DEFAULT 'VOLUNTARY',
  status                          varchar(30) NOT NULL DEFAULT 'DRAFT',
  frequency                       varchar(15) NOT NULL DEFAULT 'MONTHLY',
  start_date                      date NOT NULL,
  end_date                        date,
  total_arranged_amount           numeric(18,2) NOT NULL DEFAULT 0,
  down_payment_amount             numeric(18,2) NOT NULL DEFAULT 0,
  installment_amount              numeric(18,2) NOT NULL DEFAULT 0,
  number_of_installments          integer NOT NULL DEFAULT 0,
  total_paid                      numeric(18,2) NOT NULL DEFAULT 0,
  outstanding_balance             numeric(18,2) NOT NULL DEFAULT 0,
  default_date                    date,
  default_reason                  text,
  superseded_by_arrangement_id    uuid REFERENCES public.core_payment_arrangement(id) ON DELETE SET NULL,
  superseded_from_arrangement_id  uuid REFERENCES public.core_payment_arrangement(id) ON DELETE SET NULL,
  terms_text                      text,
  legacy_ce_arrangement_id        uuid,  -- mirror to ce_payment_arrangements.id when bridged
  created_by                      varchar(50),
  approved_by                     varchar(50),
  approved_at                     timestamptz,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cpa_debtor_type      CHECK (debtor_type IN ('EMPLOYER','INSURED_PERSON','BENEFICIARY','OTHER')),
  CONSTRAINT chk_cpa_source_module    CHECK (source_module_created_by IN ('COMPLIANCE','LEGAL','BENEFITS','FINANCE')),
  CONSTRAINT chk_cpa_arrangement_type CHECK (arrangement_type IN (
    'VOLUNTARY','COMPLIANCE_PLAN','LEGAL_PRE_COURT','LEGAL_COURT_ORDERED',
    'LEGAL_POST_JUDGMENT','ENFORCEMENT_PLAN','BENEFIT_OVERPAYMENT_RECOVERY'
  )),
  CONSTRAINT chk_cpa_status CHECK (status IN (
    'DRAFT','PENDING_APPROVAL','ACTIVE','DEFAULTED','SUPERSEDED','COMPLETED','CANCELLED'
  )),
  CONSTRAINT chk_cpa_frequency CHECK (frequency IN ('WEEKLY','BIWEEKLY','MONTHLY'))
);

CREATE INDEX IF NOT EXISTS ix_cpa_debtor   ON public.core_payment_arrangement(debtor_type, debtor_id);
CREATE INDEX IF NOT EXISTS ix_cpa_status   ON public.core_payment_arrangement(status);
CREATE INDEX IF NOT EXISTS ix_cpa_legacyce ON public.core_payment_arrangement(legacy_ce_arrangement_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_payment_arrangement TO authenticated;
GRANT ALL ON public.core_payment_arrangement TO service_role;

-- 2. Items --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_payment_arrangement_item (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id        uuid NOT NULL REFERENCES public.core_payment_arrangement(id) ON DELETE CASCADE,
  source_module         varchar(20) NOT NULL,
  source_record_type    varchar(40) NOT NULL,
  source_record_id      varchar(100) NOT NULL,
  source_reference_no   varchar(100),
  compliance_case_id    uuid,
  legal_case_id         uuid,
  legal_action_id       uuid,
  court_proceeding_id   uuid,
  benefit_claim_id      uuid,
  finance_debt_id       varchar(100),
  liability_type        varchar(30) NOT NULL DEFAULT 'SS',
  period_from           date,
  period_to             date,
  principal_amount      numeric(18,2) NOT NULL DEFAULT 0,
  penalty_amount        numeric(18,2) NOT NULL DEFAULT 0,
  cost_amount           numeric(18,2) NOT NULL DEFAULT 0,
  arranged_amount       numeric(18,2) NOT NULL DEFAULT 0,
  paid_amount           numeric(18,2) NOT NULL DEFAULT 0,
  outstanding_amount    numeric(18,2) NOT NULL DEFAULT 0,
  status                varchar(20) NOT NULL DEFAULT 'OPEN',
  notes                 text,
  created_by            varchar(50),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cpai_source_module CHECK (source_module IN ('COMPLIANCE','LEGAL','BENEFITS','FINANCE')),
  CONSTRAINT chk_cpai_record_type   CHECK (source_record_type IN (
    'CASE','LEGAL_ACTION','COURT_PROCEEDING','CLAIM','OVERPAYMENT','DEBT','VIOLATION','OTHER'
  )),
  CONSTRAINT chk_cpai_liability     CHECK (liability_type IN (
    'SS','LV','PE','BENEFIT_OVERPAYMENT','FINANCE_DEBT','COST','PENALTY','OTHER'
  )),
  CONSTRAINT chk_cpai_status        CHECK (status IN ('OPEN','PARTIAL','PAID','CANCELLED','SUPERSEDED'))
);

CREATE INDEX IF NOT EXISTS ix_cpai_arrangement ON public.core_payment_arrangement_item(arrangement_id);
CREATE INDEX IF NOT EXISTS ix_cpai_legal_case  ON public.core_payment_arrangement_item(legal_case_id);
CREATE INDEX IF NOT EXISTS ix_cpai_compliance  ON public.core_payment_arrangement_item(compliance_case_id);
CREATE INDEX IF NOT EXISTS ix_cpai_source      ON public.core_payment_arrangement_item(source_module, source_record_type, source_record_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_payment_arrangement_item TO authenticated;
GRANT ALL ON public.core_payment_arrangement_item TO service_role;

-- 3. Installments --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_payment_schedule_installment (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id  uuid NOT NULL REFERENCES public.core_payment_arrangement(id) ON DELETE CASCADE,
  installment_no  integer NOT NULL,
  due_date        date NOT NULL,
  due_amount      numeric(18,2) NOT NULL DEFAULT 0,
  paid_amount     numeric(18,2) NOT NULL DEFAULT 0,
  paid_date       date,
  status          varchar(15) NOT NULL DEFAULT 'PLANNED',
  receipt_id      varchar(100),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arrangement_id, installment_no),
  CONSTRAINT chk_cpsi_status CHECK (status IN ('PLANNED','DUE','PARTIAL','PAID','MISSED','DEFAULTED','WAIVED'))
);

CREATE INDEX IF NOT EXISTS ix_cpsi_arr_due ON public.core_payment_schedule_installment(arrangement_id, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_payment_schedule_installment TO authenticated;
GRANT ALL ON public.core_payment_schedule_installment TO service_role;

-- 4. Allocation ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_payment_allocation (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id        uuid NOT NULL REFERENCES public.core_payment_arrangement(id) ON DELETE CASCADE,
  installment_id        uuid REFERENCES public.core_payment_schedule_installment(id) ON DELETE SET NULL,
  receipt_id            varchar(100),
  payment_date          date NOT NULL,
  amount_received       numeric(18,2) NOT NULL DEFAULT 0,
  allocated_to_item_id  uuid REFERENCES public.core_payment_arrangement_item(id) ON DELETE SET NULL,
  allocation_amount     numeric(18,2) NOT NULL DEFAULT 0,
  allocation_order      integer NOT NULL DEFAULT 1,
  source_module         varchar(20),
  source_record_id      varchar(100),
  created_by            varchar(50),
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cpalloc_arr     ON public.core_payment_allocation(arrangement_id);
CREATE INDEX IF NOT EXISTS ix_cpalloc_receipt ON public.core_payment_allocation(receipt_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_payment_allocation TO authenticated;
GRANT ALL ON public.core_payment_allocation TO service_role;

-- 5. Status history -----------------------------------------------
CREATE TABLE IF NOT EXISTS public.core_payment_arrangement_status_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id  uuid NOT NULL REFERENCES public.core_payment_arrangement(id) ON DELETE CASCADE,
  from_status     varchar(30),
  to_status       varchar(30) NOT NULL,
  source_module   varchar(20),
  reason          text,
  performed_by    varchar(50),
  performed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cpash_arr ON public.core_payment_arrangement_status_history(arrangement_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_payment_arrangement_status_history TO authenticated;
GRANT ALL ON public.core_payment_arrangement_status_history TO service_role;

-- 6. updated_at triggers ------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cpa_touch') THEN
    CREATE TRIGGER trg_cpa_touch BEFORE UPDATE ON public.core_payment_arrangement
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cpai_touch') THEN
    CREATE TRIGGER trg_cpai_touch BEFORE UPDATE ON public.core_payment_arrangement_item
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_cpsi_touch') THEN
    CREATE TRIGGER trg_cpsi_touch BEFORE UPDATE ON public.core_payment_schedule_installment
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
  END IF;
END $$;

-- 7. Context view -------------------------------------------------
CREATE OR REPLACE VIEW public.v_payment_arrangement_context AS
SELECT
  a.id                                              AS arrangement_id,
  a.arrangement_no,
  a.debtor_type,
  a.debtor_id,
  a.debtor_name,
  a.source_module_created_by                        AS source_module,
  a.arrangement_type,
  a.status,
  a.frequency,
  a.start_date,
  a.end_date,
  a.total_arranged_amount,
  a.total_paid,
  a.outstanding_balance,
  a.default_date,
  a.superseded_by_arrangement_id,
  a.superseded_from_arrangement_id,
  (SELECT min(i.due_date) FROM public.core_payment_schedule_installment i
     WHERE i.arrangement_id = a.id AND i.status IN ('PLANNED','DUE','PARTIAL'))    AS next_due_date,
  (SELECT count(*) FROM public.core_payment_schedule_installment i
     WHERE i.arrangement_id = a.id AND i.status = 'MISSED')                        AS missed_installments,
  ARRAY(SELECT DISTINCT it.compliance_case_id FROM public.core_payment_arrangement_item it
        WHERE it.arrangement_id = a.id AND it.compliance_case_id IS NOT NULL)      AS compliance_case_ids,
  ARRAY(SELECT DISTINCT it.legal_case_id FROM public.core_payment_arrangement_item it
        WHERE it.arrangement_id = a.id AND it.legal_case_id IS NOT NULL)           AS legal_case_ids,
  ARRAY(SELECT DISTINCT it.benefit_claim_id FROM public.core_payment_arrangement_item it
        WHERE it.arrangement_id = a.id AND it.benefit_claim_id IS NOT NULL)        AS benefit_claim_ids,
  a.created_at,
  a.updated_at
FROM public.core_payment_arrangement a;

GRANT SELECT ON public.v_payment_arrangement_context TO authenticated;
GRANT SELECT ON public.v_payment_arrangement_context TO service_role;

-- 8. Numbering sequences (CORE + per-module) ----------------------
INSERT INTO public.core_number_sequence
  (module_code, entity_type, country_code, prefix_pattern, number_pattern, separator, padding_length, reset_frequency, description)
VALUES
  ('CORE',       'PAYMENT_ARRANGEMENT', 'SKN', 'PA-{YYYY}',  '{SEQ}', '-', 6, 'YEARLY', 'Central payment arrangement number'),
  ('COMPLIANCE', 'PAYMENT_ARRANGEMENT', 'SKN', 'PAC-{YYYY}', '{SEQ}', '-', 6, 'YEARLY', 'Compliance-originated payment arrangement number'),
  ('LEGAL',      'PAYMENT_ARRANGEMENT', 'SKN', 'PAL-{YYYY}', '{SEQ}', '-', 6, 'YEARLY', 'Legal-originated payment arrangement number'),
  ('BENEFITS',   'PAYMENT_ARRANGEMENT', 'SKN', 'PAB-{YYYY}', '{SEQ}', '-', 6, 'YEARLY', 'Benefits overpayment recovery arrangement number'),
  ('FINANCE',    'PAYMENT_ARRANGEMENT', 'SKN', 'PAF-{YYYY}', '{SEQ}', '-', 6, 'YEARLY', 'Finance debt arrangement number')
ON CONFLICT (module_code, entity_type, country_code) DO NOTHING;
