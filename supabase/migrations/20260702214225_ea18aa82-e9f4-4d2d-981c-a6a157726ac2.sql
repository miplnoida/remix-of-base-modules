
-- ============================================================================
-- EPIC-06B — Judicial Orders, Appeals & Enforcement
-- ============================================================================

-- 1. Extend lg_order ---------------------------------------------------------
ALTER TABLE public.lg_order
  ADD COLUMN IF NOT EXISTS court_file_no      text,
  ADD COLUMN IF NOT EXISTS judge_name         text,
  ADD COLUMN IF NOT EXISTS appeal_deadline    date,
  ADD COLUMN IF NOT EXISTS costs_awarded      numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interest_awarded   numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS penalty_awarded    numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compliance_status  varchar(30)   DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS enforcement_required boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS appeal_status      varchar(30)   DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS enforcement_status varchar(30)   DEFAULT 'NONE';

-- Existing status column stays TEXT/VARCHAR; documented values now include:
-- DRAFT, FILED, GRANTED, ACTIVE, PARTIALLY_COMPLIED, COMPLIED, BREACHED,
-- UNDER_APPEAL, ENFORCED, CLOSED, CANCELLED

-- 2. Extend lg_order_liability ----------------------------------------------
ALTER TABLE public.lg_order_liability
  ADD COLUMN IF NOT EXISTS outstanding_snapshot numeric(14,2),
  ADD COLUMN IF NOT EXISTS compliance_status    varchar(30) DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS notes                text;

-- 3. lg_order_compliance_event ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_order_compliance_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.lg_order(id) ON DELETE CASCADE,
  case_id        uuid NOT NULL REFERENCES public.lg_case(id)  ON DELETE CASCADE,
  liability_id   uuid REFERENCES public.lg_recoverable_liability(id) ON DELETE SET NULL,
  event_type     varchar(40) NOT NULL,
  event_date     date        NOT NULL DEFAULT CURRENT_DATE,
  amount         numeric(14,2),
  remarks        text,
  created_by     varchar(50),
  created_at     timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_order_compliance_event TO authenticated;
GRANT ALL ON public.lg_order_compliance_event TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_ord_comp_event_order ON public.lg_order_compliance_event(order_id);
CREATE INDEX IF NOT EXISTS ix_lg_ord_comp_event_case  ON public.lg_order_compliance_event(case_id);

-- 4. lg_appeal ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_appeal (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_no              text UNIQUE,
  case_id                uuid NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  order_id               uuid REFERENCES public.lg_order(id) ON DELETE SET NULL,
  filing_party           varchar(40),
  grounds                text,
  filing_date            date,
  appeal_deadline        date,
  hearing_date           date,
  decision_date          date,
  outcome                varchar(40),
  status                 varchar(30) NOT NULL DEFAULT 'DRAFT',
  recovery_impact_amount numeric(14,2),
  remarks                text,
  document_ref_id        uuid,
  created_by             varchar(50),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             varchar(50),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_appeal TO authenticated;
GRANT ALL ON public.lg_appeal TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_appeal_case  ON public.lg_appeal(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_appeal_order ON public.lg_appeal(order_id);

CREATE TABLE IF NOT EXISTS public.lg_appeal_liability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appeal_id    uuid NOT NULL REFERENCES public.lg_appeal(id) ON DELETE CASCADE,
  liability_id uuid NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   varchar(50),
  UNIQUE (appeal_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_appeal_liability TO authenticated;
GRANT ALL ON public.lg_appeal_liability TO service_role;

-- 5. lg_enforcement_action ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lg_enforcement_action (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_no     text UNIQUE,
  case_id            uuid NOT NULL REFERENCES public.lg_case(id) ON DELETE CASCADE,
  order_id           uuid REFERENCES public.lg_order(id) ON DELETE SET NULL,
  enforcement_type   varchar(40) NOT NULL,
  status             varchar(30) NOT NULL DEFAULT 'DRAFT',
  requested_date     date,
  approved_date      date,
  execution_date     date,
  officer_code       varchar(50),
  external_agency    text,
  amount_targeted    numeric(14,2),
  amount_recovered   numeric(14,2) DEFAULT 0,
  outcome            varchar(40),
  next_action        text,
  remarks            text,
  document_ref_id    uuid,
  created_by         varchar(50),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         varchar(50),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_enforcement_action TO authenticated;
GRANT ALL ON public.lg_enforcement_action TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_enf_case  ON public.lg_enforcement_action(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_enf_order ON public.lg_enforcement_action(order_id);

CREATE TABLE IF NOT EXISTS public.lg_enforcement_liability (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enforcement_id    uuid NOT NULL REFERENCES public.lg_enforcement_action(id) ON DELETE CASCADE,
  liability_id      uuid NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  allocated_amount  numeric(14,2),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        varchar(50),
  UNIQUE (enforcement_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_enforcement_liability TO authenticated;
GRANT ALL ON public.lg_enforcement_liability TO service_role;

-- 6. Rollup triggers ---------------------------------------------------------

-- 6a. Recompute order compliance status from events + liabilities
CREATE OR REPLACE FUNCTION public.lg_recompute_order_compliance(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_case          uuid;
  v_ordered       numeric;
  v_paid          numeric;
  v_outstanding   numeric;
  v_due           date;
  v_new_status    varchar(30);
BEGIN
  SELECT lg_case_id, COALESCE(ordered_amount,0), compliance_date
    INTO v_case, v_ordered, v_due
    FROM public.lg_order WHERE id = _order_id;

  -- Sum paid & outstanding from linked liabilities
  SELECT COALESCE(SUM(l.paid),0), COALESCE(SUM(l.outstanding),0)
    INTO v_paid, v_outstanding
    FROM public.lg_order_liability ol
    JOIN public.lg_recoverable_liability l ON l.id = ol.liability_id
    WHERE ol.order_id = _order_id;

  IF v_paid = 0 AND NOT EXISTS (SELECT 1 FROM public.lg_order_compliance_event WHERE order_id = _order_id) THEN
    v_new_status := 'NOT_STARTED';
  ELSIF v_outstanding = 0 AND v_paid > 0 THEN
    v_new_status := 'COMPLIED';
  ELSIF v_paid > 0 AND v_outstanding > 0 THEN
    v_new_status := 'PARTIALLY_COMPLIED';
  ELSE
    v_new_status := 'IN_PROGRESS';
  END IF;

  -- Breach: past due date and not fully complied
  IF v_due IS NOT NULL AND v_due < CURRENT_DATE AND v_new_status <> 'COMPLIED' THEN
    v_new_status := 'BREACHED';
  END IF;

  UPDATE public.lg_order SET compliance_status = v_new_status, updated_at = now() WHERE id = _order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_lg_order_compliance_event_ai()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.lg_recompute_order_compliance(NEW.order_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_lg_order_compliance_event_ai ON public.lg_order_compliance_event;
CREATE TRIGGER tg_lg_order_compliance_event_ai
AFTER INSERT OR UPDATE OR DELETE ON public.lg_order_compliance_event
FOR EACH ROW EXECUTE FUNCTION public.trg_lg_order_compliance_event_ai();

-- 6b. Appeal rollup
CREATE OR REPLACE FUNCTION public.trg_lg_appeal_rollup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new varchar(30);
  v_ord uuid := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
  IF v_ord IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_new FROM public.lg_appeal
    WHERE order_id = v_ord
    ORDER BY created_at DESC LIMIT 1;
  IF v_new IS NULL THEN v_new := 'NONE'; END IF;
  UPDATE public.lg_order
     SET appeal_status = v_new,
         status = CASE
           WHEN v_new IN ('FILED','ACCEPTED','HEARING_SCHEDULED','UNDER_REVIEW','DECISION_RESERVED')
             AND status NOT IN ('CLOSED','CANCELLED')
             THEN 'UNDER_APPEAL'
           ELSE status
         END,
         updated_at = now()
   WHERE id = v_ord;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_lg_appeal_rollup ON public.lg_appeal;
CREATE TRIGGER tg_lg_appeal_rollup
AFTER INSERT OR UPDATE OR DELETE ON public.lg_appeal
FOR EACH ROW EXECUTE FUNCTION public.trg_lg_appeal_rollup();

-- 6c. Enforcement rollup
CREATE OR REPLACE FUNCTION public.trg_lg_enforcement_rollup()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new varchar(30);
  v_ord uuid := COALESCE(NEW.order_id, OLD.order_id);
BEGIN
  IF v_ord IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT status INTO v_new FROM public.lg_enforcement_action
    WHERE order_id = v_ord
    ORDER BY created_at DESC LIMIT 1;
  IF v_new IS NULL THEN v_new := 'NONE'; END IF;
  UPDATE public.lg_order
     SET enforcement_status = v_new,
         status = CASE
           WHEN v_new = 'EXECUTED' AND status NOT IN ('CLOSED','CANCELLED') THEN 'ENFORCED'
           ELSE status
         END,
         updated_at = now()
   WHERE id = v_ord;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tg_lg_enforcement_rollup ON public.lg_enforcement_action;
CREATE TRIGGER tg_lg_enforcement_rollup
AFTER INSERT OR UPDATE OR DELETE ON public.lg_enforcement_action
FOR EACH ROW EXECUTE FUNCTION public.trg_lg_enforcement_rollup();

-- 7. Breach flag utility -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.lg_flag_breached_orders()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_cnt integer := 0;
BEGIN
  UPDATE public.lg_order
     SET compliance_status = 'BREACHED', updated_at = now()
   WHERE compliance_date IS NOT NULL
     AND compliance_date < CURRENT_DATE
     AND compliance_status NOT IN ('COMPLIED','BREACHED')
     AND status NOT IN ('CLOSED','CANCELLED');
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN v_cnt;
END;
$$;
