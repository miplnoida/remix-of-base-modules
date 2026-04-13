
-- ============================================================
-- PASSIVE PAYMENT OBSERVER LAYER
-- 
-- Purpose: Allow the Compliance module to discover newly posted
-- payment ledger entries WITHOUT modifying the payment screen
-- or the ce_post_ledger_entry RPC. The financial ledger is the
-- source of truth; this layer merely tracks what Compliance has
-- already "seen."
--
-- Design: Pull-based reconciliation pattern consistent with
-- ce_c3_ledger_sync_log and ce_payment_ledger_sync_log.
-- ============================================================

-- 1. Tracking table: records that Compliance has observed a ledger entry
CREATE TABLE IF NOT EXISTS public.ce_payment_observation_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_entry_id UUID NOT NULL,
  employer_id     VARCHAR(20) NOT NULL,
  observation_type VARCHAR(20) NOT NULL DEFAULT 'DETECTED',
  -- DETECTED  = first seen by observer
  -- ALLOCATED = payment matched to arrangement/violation (future)
  -- SKIPPED   = intentionally ignored (e.g. refund, manual override)
  notes           TEXT,
  observed_by     VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key VARCHAR(100) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each ledger entry observed at most once per observation_type
  CONSTRAINT uq_ce_payment_obs_idem UNIQUE (idempotency_key)
);

-- Indexes
CREATE INDEX idx_ce_payment_obs_ledger ON public.ce_payment_observation_log (ledger_entry_id);
CREATE INDEX idx_ce_payment_obs_employer ON public.ce_payment_observation_log (employer_id);
CREATE INDEX idx_ce_payment_obs_type ON public.ce_payment_observation_log (observation_type);

-- 2. View: unobserved payment-type ledger entries
CREATE OR REPLACE VIEW public.ce_v_unobserved_payment_entries AS
SELECT
  l.id            AS ledger_entry_id,
  l.employer_id,
  l.employer_name,
  l.entry_type,
  l.fund_type,
  l.period,
  l.credit_amount,
  l.idempotency_key AS ledger_idempotency_key,
  l.reference_type,
  l.reference_id,
  l.description,
  l.posted_by,
  l.posted_at
FROM public.ce_employer_financial_ledger l
LEFT JOIN public.ce_payment_observation_log o
  ON o.ledger_entry_id = l.id
WHERE l.entry_type IN ('PAYMENT_RECEIVED', 'ARRANGEMENT_CREDIT', 'REFUND')
  AND l.status = 'POSTED'
  AND l.reversal_of_id IS NULL         -- exclude reversals
  AND o.id IS NULL;                     -- not yet observed

-- 3. RPC: fetch unobserved payments (read-only, idempotent)
CREATE OR REPLACE FUNCTION public.ce_fetch_unobserved_payments(
  p_employer_id VARCHAR DEFAULT NULL,
  p_limit       INT     DEFAULT 200
)
RETURNS TABLE (
  ledger_entry_id        UUID,
  employer_id            VARCHAR,
  employer_name          VARCHAR,
  entry_type             TEXT,
  fund_type              TEXT,
  period                 VARCHAR,
  credit_amount          NUMERIC,
  ledger_idempotency_key VARCHAR,
  reference_type         VARCHAR,
  reference_id           UUID,
  description            TEXT,
  posted_by              VARCHAR,
  posted_at              TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.ledger_entry_id,
    v.employer_id,
    v.employer_name,
    v.entry_type::TEXT,
    v.fund_type::TEXT,
    v.period,
    v.credit_amount,
    v.ledger_idempotency_key,
    v.reference_type,
    v.reference_id,
    v.description,
    v.posted_by,
    v.posted_at
  FROM ce_v_unobserved_payment_entries v
  WHERE (p_employer_id IS NULL OR v.employer_id = p_employer_id)
  ORDER BY v.posted_at ASC
  LIMIT p_limit;
$$;

-- 4. Helper RPC: mark a ledger entry as observed (idempotent via key)
CREATE OR REPLACE FUNCTION public.ce_mark_payment_observed(
  p_ledger_entry_id  UUID,
  p_employer_id      VARCHAR,
  p_observation_type VARCHAR DEFAULT 'DETECTED',
  p_notes            TEXT    DEFAULT NULL,
  p_observed_by      VARCHAR DEFAULT 'SYSTEM'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idem_key VARCHAR;
  v_id UUID;
BEGIN
  -- Deterministic idempotency key: one observation per entry+type
  v_idem_key := 'obs-' || p_ledger_entry_id::TEXT || '-' || p_observation_type;

  -- Check if already observed
  SELECT id INTO v_id
  FROM ce_payment_observation_log
  WHERE idempotency_key = v_idem_key;

  IF v_id IS NOT NULL THEN
    RETURN v_id;  -- Already observed, safe to re-call
  END IF;

  INSERT INTO ce_payment_observation_log (
    ledger_entry_id, employer_id, observation_type,
    notes, observed_by, idempotency_key
  ) VALUES (
    p_ledger_entry_id, p_employer_id, p_observation_type,
    p_notes, p_observed_by, v_idem_key
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
