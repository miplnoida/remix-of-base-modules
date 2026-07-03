
CREATE INDEX IF NOT EXISTS ix_lg_liab_employer_legal_status
  ON public.lg_recoverable_liability(employer_id, legal_status);

CREATE INDEX IF NOT EXISTS ix_lg_case_activity_entity
  ON public.lg_case_activity(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS ix_lg_recovery_assignment_officer_status
  ON public.lg_recovery_assignment(assigned_officer_id, status);

CREATE OR REPLACE VIEW public.v_lg_case_financials AS
SELECT
  l.lg_case_id                                                        AS lg_case_id,
  COUNT(*)                                                            AS liability_count,
  COUNT(*) FILTER (WHERE l.status = 'ACTIVE')                         AS active_liability_count,
  COUNT(*) FILTER (WHERE l.status = 'WRITTEN_OFF')                    AS writeoff_liability_count,
  COALESCE(SUM(l.principal),      0)::numeric(18,2)                   AS total_principal,
  COALESCE(SUM(l.interest),       0)::numeric(18,2)                   AS total_interest,
  COALESCE(SUM(l.penalty),        0)::numeric(18,2)                   AS total_penalty,
  COALESCE(SUM(l.court_cost),     0)::numeric(18,2)                   AS total_court_cost,
  COALESCE(SUM(l.legal_cost),     0)::numeric(18,2)                   AS total_legal_cost,
  COALESCE(SUM(l.other_cost),     0)::numeric(18,2)                   AS total_other_cost,
  COALESCE(SUM(l.total_assessed), 0)::numeric(18,2)                   AS total_assessed,
  COALESCE(SUM(l.paid),           0)::numeric(18,2)                   AS total_paid,
  COALESCE(SUM(l.outstanding),    0)::numeric(18,2)                   AS total_outstanding,
  COALESCE(SUM(l.total_assessed) FILTER (WHERE l.status = 'WRITTEN_OFF'), 0)::numeric(18,2)
                                                                      AS total_written_off,
  MAX(l.currency)                                                     AS currency,
  MAX(l.updated_at)                                                   AS last_liability_update
FROM public.lg_recoverable_liability l
GROUP BY l.lg_case_id;

GRANT SELECT ON public.v_lg_case_financials TO authenticated;
GRANT ALL    ON public.v_lg_case_financials TO service_role;

COMMENT ON VIEW public.v_lg_case_financials IS
  'ERP-01: Deterministic case-level rollup derived solely from lg_recoverable_liability. Single source of financial truth for Case 360 Financials and reporting.';
