
ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS verification_decision varchar(20),
  ADD COLUMN IF NOT EXISTS verification_reviewed_by varchar(50),
  ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text,
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid REFERENCES public.ce_violations(id);

CREATE INDEX IF NOT EXISTS idx_ce_violations_duplicate_of ON public.ce_violations(duplicate_of_id) WHERE duplicate_of_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_violations_verification_status ON public.ce_violations(status) WHERE status = 'UNDER_REVIEW';

INSERT INTO public.ce_settings (setting_key, setting_value, data_type, category, description, created_by, updated_by)
VALUES
  ('compliance.verification_queue.enabled', 'true', 'boolean', 'violations', 'When enabled, detected possible violations land in the Verification Queue for officer review before becoming confirmed.', 'SEED', 'SEED'),
  ('compliance.verification_queue.disabled_fallback', 'CONFIRM', 'string', 'violations', 'Behavior when verification queue is disabled: CONFIRM (auto-confirm detected violations) or CASE_INTAKE (create case-intake records).', 'SEED', 'SEED'),
  ('compliance.duplicate_detection.match_fields', 'employer,fund,period,violation_type,source_rule', 'string', 'violations', 'CSV of fields used to detect duplicate violations.', 'SEED', 'SEED'),
  ('compliance.duplicate_detection.window_days', '90', 'integer', 'violations', 'Duplicate window in days for matching violations.', 'SEED', 'SEED'),
  ('compliance.duplicate_detection.open_case_blocks', 'true', 'boolean', 'violations', 'When true, an open case for the same employer marks new violations as potential duplicates.', 'SEED', 'SEED')
ON CONFLICT (setting_key) DO NOTHING;
