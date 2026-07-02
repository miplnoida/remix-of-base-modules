ALTER TABLE public.lg_case_activity
  ADD COLUMN IF NOT EXISTS entity_type varchar(64),
  ADD COLUMN IF NOT EXISTS entity_id varchar(64),
  ADD COLUMN IF NOT EXISTS old_value jsonb,
  ADD COLUMN IF NOT EXISTS new_value jsonb,
  ADD COLUMN IF NOT EXISTS remarks text;

CREATE INDEX IF NOT EXISTS ix_lg_case_activity_entity
  ON public.lg_case_activity (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS ix_lg_case_activity_case_time
  ON public.lg_case_activity (lg_case_id, performed_at DESC);