
-- Phase 1A: Add missing columns to ce_escalation_rules
ALTER TABLE ce_escalation_rules
  ADD COLUMN IF NOT EXISTS prerequisites JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(20) DEFAULT 'RECOMMEND',
  ADD COLUMN IF NOT EXISTS family VARCHAR(50) DEFAULT 'case_progression',
  ADD COLUMN IF NOT EXISTS approval_role VARCHAR(50),
  ADD COLUMN IF NOT EXISTS risk_band_filter VARCHAR(20),
  ADD COLUMN IF NOT EXISTS risk_timing_modifier JSONB,
  ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 100;

-- Phase 1B: Create ce_escalation_prerequisites table
CREATE TABLE IF NOT EXISTS ce_escalation_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID REFERENCES ce_violations(id) ON DELETE CASCADE,
  case_id UUID,
  prerequisite_key VARCHAR(100) NOT NULL,
  is_satisfied BOOLEAN NOT NULL DEFAULT false,
  satisfied_at TIMESTAMPTZ,
  satisfied_by VARCHAR(100),
  evidence_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_esc_prereq_violation ON ce_escalation_prerequisites(violation_id, prerequisite_key);
CREATE INDEX IF NOT EXISTS idx_ce_esc_prereq_case ON ce_escalation_prerequisites(case_id, prerequisite_key);

-- Phase 1C: Create ce_escalation_log table
CREATE TABLE IF NOT EXISTS ce_escalation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID REFERENCES ce_violations(id) ON DELETE SET NULL,
  case_id UUID,
  rule_id UUID REFERENCES ce_escalation_rules(id) ON DELETE SET NULL,
  rule_code VARCHAR(50),
  from_status VARCHAR(50),
  to_status VARCHAR(50),
  execution_mode VARCHAR(20),
  risk_band VARCHAR(20),
  risk_score NUMERIC(10,2),
  prerequisites_checked JSONB,
  prerequisites_met BOOLEAN,
  approval_required BOOLEAN DEFAULT false,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  blocked_reason TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'EXECUTED',
  idempotency_key VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_escalation_log_idempotency UNIQUE(idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_ce_esc_log_violation ON ce_escalation_log(violation_id);
CREATE INDEX IF NOT EXISTS idx_ce_esc_log_case ON ce_escalation_log(case_id);
CREATE INDEX IF NOT EXISTS idx_ce_esc_log_status ON ce_escalation_log(status);
CREATE INDEX IF NOT EXISTS idx_ce_esc_log_idempotency ON ce_escalation_log(idempotency_key);
