
ALTER TABLE public.ce_audit_log
  ADD COLUMN IF NOT EXISTS workflow_task_id uuid,
  ADD COLUMN IF NOT EXISTS reason text;

CREATE INDEX IF NOT EXISTS idx_ce_audit_log_workflow_task
  ON public.ce_audit_log (workflow_task_id)
  WHERE workflow_task_id IS NOT NULL;
