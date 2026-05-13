
-- ce_reconciliation_exceptions
CREATE TABLE IF NOT EXISTS public.ce_reconciliation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  employer_name TEXT,
  exception_type TEXT NOT NULL,
  source_table TEXT,
  source_period TEXT,
  source_amount NUMERIC(15,2),
  ledger_amount NUMERIC(15,2),
  variance_amount NUMERIC(15,2),
  variance_pct NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

-- ce_notice_validation_log
CREATE TABLE IF NOT EXISTS public.ce_notice_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  employer_name TEXT,
  validation_type TEXT NOT NULL,
  contact_field TEXT,
  contact_value TEXT,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  failure_reason TEXT,
  run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

-- ce_group_compliance_rollup
CREATE TABLE IF NOT EXISTS public.ce_group_compliance_rollup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT,
  group_name TEXT,
  parent_regno TEXT,
  member_count INT DEFAULT 0,
  compliant_count INT DEFAULT 0,
  non_compliant_count INT DEFAULT 0,
  compliant_pct NUMERIC(5,2) DEFAULT 0,
  total_arrears NUMERIC(15,2) DEFAULT 0,
  total_penalties NUMERIC(15,2) DEFAULT 0,
  total_violations INT DEFAULT 0,
  avg_risk_score NUMERIC(5,2) DEFAULT 0,
  highest_risk_band TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

-- ce_review_queue
CREATE TABLE IF NOT EXISTS public.ce_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  employer_name TEXT,
  review_type TEXT NOT NULL DEFAULT 'STALE',
  reason TEXT,
  priority TEXT DEFAULT 'MEDIUM',
  assigned_to TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  last_activity_at TIMESTAMPTZ,
  stale_since TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  run_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM'
);

-- No RLS per project policy
