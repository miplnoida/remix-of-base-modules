-- Phase 1: Extend ce_risk_profiles with planning-oriented audit-cycle fields.
-- All additions are nullable / additive. Nothing is removed or renamed.
ALTER TABLE public.ce_risk_profiles
  ADD COLUMN IF NOT EXISTS last_audit_date date,
  ADD COLUMN IF NOT EXISTS next_audit_due_date date,
  ADD COLUMN IF NOT EXISTS overdue_audit_days integer,
  ADD COLUMN IF NOT EXISTS consecutive_cycles_skipped integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS months_in_current_band integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audit_program varchar(50),
  ADD COLUMN IF NOT EXISTS audit_cycle_type varchar(32);

CREATE INDEX IF NOT EXISTS idx_ce_risk_profiles_next_audit_due
  ON public.ce_risk_profiles (next_audit_due_date);
CREATE INDEX IF NOT EXISTS idx_ce_risk_profiles_overdue_audit
  ON public.ce_risk_profiles (overdue_audit_days)
  WHERE overdue_audit_days IS NOT NULL AND overdue_audit_days > 0;

COMMENT ON COLUMN public.ce_risk_profiles.last_audit_date IS 'Phase 1 planning input: last completed compliance audit visit date.';
COMMENT ON COLUMN public.ce_risk_profiles.next_audit_due_date IS 'Phase 1 planning input: next scheduled audit due date based on band/cycle.';
COMMENT ON COLUMN public.ce_risk_profiles.overdue_audit_days IS 'Phase 1 planning input: days past next_audit_due_date (>=0).';
COMMENT ON COLUMN public.ce_risk_profiles.consecutive_cycles_skipped IS 'Phase 1 planning input: number of audit cycles missed in a row.';
COMMENT ON COLUMN public.ce_risk_profiles.months_in_current_band IS 'Phase 1 planning input: months sustained in the current risk band.';
COMMENT ON COLUMN public.ce_risk_profiles.audit_program IS 'Phase 1 planning input: e.g. ANNUAL_AUDIT, BIENNIAL, RANDOM_3Y.';
COMMENT ON COLUMN public.ce_risk_profiles.audit_cycle_type IS 'Phase 1 planning input: derived cycle type from band (HIGH_FREQ / NORMAL / LOW_FREQ).';