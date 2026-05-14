ALTER TABLE public.ce_automation_job_runs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS execution_log JSONB;

CREATE INDEX IF NOT EXISTS idx_ce_job_runs_idempotency
  ON public.ce_automation_job_runs (idempotency_key, run_status);