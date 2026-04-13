
-- =====================================================
-- ENTERPRISE COMPLIANCE CASE MANAGEMENT — SCHEMA
-- =====================================================

-- =========================
-- 1. REFERENCE / CONFIG TABLES
-- =========================

-- 1.1 Case Family — groups violation categories into case containers
CREATE TABLE IF NOT EXISTS ce_case_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  violation_categories VARCHAR[] NOT NULL DEFAULT '{}',
  auto_create_case BOOLEAN NOT NULL DEFAULT true,
  severity_weights JSONB DEFAULT '{}',
  escalation_threshold_days INTEGER DEFAULT 90,
  escalation_threshold_amount NUMERIC(15,2) DEFAULT 50000,
  reopen_window_days INTEGER DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Case severity rules — configurable per violation type
CREATE TABLE IF NOT EXISTS ce_case_severity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_family_id UUID REFERENCES ce_case_families(id),
  violation_type_id UUID REFERENCES ce_violation_types(id),
  base_weight NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  age_multiplier_cap NUMERIC(5,2) DEFAULT 5.0,
  amount_log_base INTEGER DEFAULT 10,
  priority_boost_critical NUMERIC(5,2) DEFAULT 4.0,
  priority_boost_high NUMERIC(5,2) DEFAULT 3.0,
  priority_boost_medium NUMERIC(5,2) DEFAULT 2.0,
  priority_boost_low NUMERIC(5,2) DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Case reopen rules — configurable per family
CREATE TABLE IF NOT EXISTS ce_case_reopen_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_family_id UUID REFERENCES ce_case_families(id),
  max_reopen_count INTEGER DEFAULT 3,
  reopen_window_days INTEGER DEFAULT 30,
  require_approval BOOLEAN DEFAULT false,
  approval_role VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Case merge rules — configurable per family
CREATE TABLE IF NOT EXISTS ce_case_merge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_family_id UUID REFERENCES ce_case_families(id),
  allow_cross_family_merge BOOLEAN DEFAULT false,
  require_same_employer BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT true,
  approval_role VARCHAR(50) DEFAULT 'SUPERVISOR',
  max_violation_count_for_auto_merge INTEGER DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================
-- 2. ALTER EXISTING CORE TABLES
-- =========================

-- 2.1 Extend ce_cases with case family, severity, merge, legal link
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS case_family_id UUID REFERENCES ce_case_families(id);
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS case_family VARCHAR(50);
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS severity_score NUMERIC(10,2) DEFAULT 0;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS last_violation_date DATE;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS escalation_recommended BOOLEAN DEFAULT false;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS escalation_recommendation_id UUID;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS legal_case_id UUID;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS reopened_count INTEGER DEFAULT 0;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS merged_into_case_id UUID REFERENCES ce_cases(id);
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT false;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE ce_cases ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- 2.2 Extend ce_violations with direct case FK and family
ALTER TABLE ce_violations ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES ce_cases(id);
ALTER TABLE ce_violations ADD COLUMN IF NOT EXISTS case_family VARCHAR(50);

-- =========================
-- 3. NEW OPERATIONAL TABLES
-- =========================

-- 3.1 Case actions — officer activity log
CREATE TABLE IF NOT EXISTS ce_case_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES ce_cases(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,  -- PHONE_CALL, SITE_VISIT, LETTER_SENT, EMAIL_SENT, REVIEW, MEETING, FIELD_INSPECTION, OTHER
  description TEXT,
  outcome TEXT,
  contact_name VARCHAR(200),
  contact_role VARCHAR(100),
  scheduled_date DATE,
  performed_date DATE,
  duration_minutes INTEGER,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_action_id UUID,
  attachments JSONB DEFAULT '[]',
  performed_by VARCHAR(50) NOT NULL,
  performed_by_name VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 Case notices — links notices to cases
CREATE TABLE IF NOT EXISTS ce_case_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES ce_cases(id) ON DELETE CASCADE,
  notice_id UUID REFERENCES ce_notices(id),
  notice_type VARCHAR(50) NOT NULL,    -- WARNING, DEMAND, FINAL_DEMAND, SUMMONS, COMPLIANCE_ORDER
  purpose TEXT,
  issued_date DATE,
  response_due_date DATE,
  response_received BOOLEAN DEFAULT false,
  response_date DATE,
  response_summary TEXT,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 Case correspondence — all communication history
CREATE TABLE IF NOT EXISTS ce_case_correspondence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES ce_cases(id) ON DELETE CASCADE,
  violation_id UUID REFERENCES ce_violations(id),
  direction VARCHAR(10) NOT NULL,     -- INBOUND, OUTBOUND
  channel VARCHAR(30) NOT NULL,       -- EMAIL, PHONE, LETTER, FAX, IN_PERSON, SMS
  subject VARCHAR(500),
  body TEXT,
  contact_name VARCHAR(200),
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  attachments JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  recorded_by VARCHAR(50) NOT NULL,
  recorded_by_name VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 Case documents — evidence and attachments
CREATE TABLE IF NOT EXISTS ce_case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES ce_cases(id) ON DELETE CASCADE,
  violation_id UUID REFERENCES ce_violations(id),
  document_type VARCHAR(50) NOT NULL,  -- EVIDENCE, C3_COPY, PAYMENT_RECEIPT, INSPECTION_REPORT, LEGAL_FILING, CORRESPONDENCE, PHOTO, OTHER
  title VARCHAR(300) NOT NULL,
  description TEXT,
  file_name VARCHAR(300),
  file_path TEXT,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  storage_bucket VARCHAR(100),
  is_confidential BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  verified_by VARCHAR(50),
  verified_at TIMESTAMPTZ,
  uploaded_by VARCHAR(50) NOT NULL,
  uploaded_by_name VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 Case assignments — full assignment audit trail
CREATE TABLE IF NOT EXISTS ce_case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES ce_cases(id) ON DELETE CASCADE,
  from_officer_id VARCHAR(50),
  from_officer_name VARCHAR(200),
  to_officer_id VARCHAR(50) NOT NULL,
  to_officer_name VARCHAR(200),
  assignment_method VARCHAR(30) DEFAULT 'MANUAL',  -- MANUAL, AUTO_ROUTE, REBALANCE, ESCALATION
  reason TEXT,
  assigned_by VARCHAR(50) NOT NULL,
  assigned_by_name VARCHAR(200),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true
);

-- 3.6 Case risk snapshots — point-in-time captures
CREATE TABLE IF NOT EXISTS ce_case_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES ce_cases(id) ON DELETE CASCADE,
  employer_id VARCHAR(50) NOT NULL,
  snapshot_trigger VARCHAR(50) NOT NULL, -- CASE_OPENED, VIOLATION_ADDED, ESCALATION_REVIEW, PERIODIC, MANUAL
  risk_score NUMERIC(10,2),
  risk_band VARCHAR(20),
  arrears_score NUMERIC(10,2),
  violations_score NUMERIC(10,2),
  filing_score NUMERIC(10,2),
  payment_score NUMERIC(10,2),
  legal_score NUMERIC(10,2),
  total_arrears NUMERIC(15,2),
  total_violations INTEGER,
  active_arrangements INTEGER,
  employer_snapshot_id UUID REFERENCES ce_employer_snapshots(id),
  raw_factors JSONB DEFAULT '{}',
  captured_by VARCHAR(50) NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.7 Case escalation recommendations
CREATE TABLE IF NOT EXISTS ce_case_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_number VARCHAR(50) NOT NULL UNIQUE,
  case_id UUID NOT NULL REFERENCES ce_cases(id),
  employer_id VARCHAR(50) NOT NULL,
  employer_name VARCHAR(200),
  recommendation_type VARCHAR(50) NOT NULL,  -- LEGAL_ESCALATION, ARRANGEMENT, CLOSURE, WARNING, WRITE_OFF
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, SUPERSEDED, WITHDRAWN

  -- Consolidated financials
  total_violations INTEGER DEFAULT 0,
  total_principal NUMERIC(15,2) DEFAULT 0,
  total_penalties NUMERIC(15,2) DEFAULT 0,
  total_interest NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  risk_band VARCHAR(20),
  risk_score NUMERIC(10,2),

  -- Narrative
  narrative TEXT,
  justification TEXT NOT NULL,
  recommended_action TEXT,
  relief_sought TEXT,
  supporting_facts TEXT,

  -- Snapshot references
  employer_snapshot_id UUID REFERENCES ce_employer_snapshots(id),
  risk_snapshot_id UUID REFERENCES ce_case_risk_snapshots(id),
  violation_summary JSONB DEFAULT '[]',
  notice_summary JSONB DEFAULT '[]',
  arrangement_summary JSONB DEFAULT '{}',
  correspondence_summary JSONB DEFAULT '[]',
  action_history_summary JSONB DEFAULT '[]',

  -- Approval chain
  submitted_by VARCHAR(50),
  submitted_at TIMESTAMPTZ,
  reviewer_id VARCHAR(50),
  reviewer_name VARCHAR(200),
  reviewed_at TIMESTAMPTZ,
  review_decision VARCHAR(30),
  review_notes TEXT,
  approved_by VARCHAR(50),
  approved_by_name VARCHAR(200),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Legal case reference (populated after approval)
  legal_case_id UUID,
  legal_case_number VARCHAR(50),

  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.8 Recommendation history
CREATE TABLE IF NOT EXISTS ce_case_recommendation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES ce_case_recommendations(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  notes TEXT,
  performed_by VARCHAR(50) NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 Case merge history
CREATE TABLE IF NOT EXISTS ce_case_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_case_id UUID NOT NULL REFERENCES ce_cases(id),
  source_case_number VARCHAR(50) NOT NULL,
  target_case_id UUID NOT NULL REFERENCES ce_cases(id),
  target_case_number VARCHAR(50) NOT NULL,
  employer_id VARCHAR(50) NOT NULL,
  violations_moved INTEGER DEFAULT 0,
  notices_moved INTEGER DEFAULT 0,
  actions_moved INTEGER DEFAULT 0,
  merge_reason TEXT NOT NULL,
  merge_strategy VARCHAR(30) DEFAULT 'ABSORB',  -- ABSORB (target keeps identity), CONSOLIDATE (new case)
  merged_by VARCHAR(50) NOT NULL,
  merged_by_name VARCHAR(200),
  merged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rollback_available BOOLEAN DEFAULT true,
  rollback_expires_at TIMESTAMPTZ
);

-- =========================
-- 4. INDEXES
-- =========================

-- 4.1 Partial unique: one active case per employer per family
CREATE UNIQUE INDEX IF NOT EXISTS idx_ce_cases_active_employer_family
  ON ce_cases (employer_id, case_family)
  WHERE status NOT IN ('CLOSED', 'RESOLVED', 'MERGED', 'CANCELLED') AND (is_deleted IS NULL OR is_deleted = false);

-- 4.2 Case lookups
CREATE INDEX IF NOT EXISTS idx_ce_cases_family ON ce_cases (case_family) WHERE case_family IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_cases_family_id ON ce_cases (case_family_id) WHERE case_family_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_cases_legal_case ON ce_cases (legal_case_id) WHERE legal_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_cases_escalation_rec ON ce_cases (escalation_recommended) WHERE escalation_recommended = true;
CREATE INDEX IF NOT EXISTS idx_ce_cases_merged_into ON ce_cases (merged_into_case_id) WHERE merged_into_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_cases_target_date ON ce_cases (target_resolution_date) WHERE target_resolution_date IS NOT NULL;

-- 4.3 Violation → case
CREATE INDEX IF NOT EXISTS idx_ce_violations_case ON ce_violations (case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_violations_case_family ON ce_violations (case_family) WHERE case_family IS NOT NULL;

-- 4.4 New table indexes
CREATE INDEX IF NOT EXISTS idx_ce_case_actions_case ON ce_case_actions (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_actions_type ON ce_case_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_ce_case_actions_date ON ce_case_actions (performed_date);

CREATE INDEX IF NOT EXISTS idx_ce_case_notices_case ON ce_case_notices (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_notices_notice ON ce_case_notices (notice_id) WHERE notice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_case_notices_type ON ce_case_notices (notice_type);

CREATE INDEX IF NOT EXISTS idx_ce_case_correspondence_case ON ce_case_correspondence (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_correspondence_violation ON ce_case_correspondence (violation_id) WHERE violation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ce_case_documents_case ON ce_case_documents (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_documents_type ON ce_case_documents (document_type);

CREATE INDEX IF NOT EXISTS idx_ce_case_assignments_case ON ce_case_assignments (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_assignments_officer ON ce_case_assignments (to_officer_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_assignments_active ON ce_case_assignments (case_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ce_case_risk_snapshots_case ON ce_case_risk_snapshots (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_risk_snapshots_employer ON ce_case_risk_snapshots (employer_id);

CREATE INDEX IF NOT EXISTS idx_ce_case_recommendations_case ON ce_case_recommendations (case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_recommendations_status ON ce_case_recommendations (status);
CREATE INDEX IF NOT EXISTS idx_ce_case_recommendations_employer ON ce_case_recommendations (employer_id);

CREATE INDEX IF NOT EXISTS idx_ce_case_recommendation_history_rec ON ce_case_recommendation_history (recommendation_id);

CREATE INDEX IF NOT EXISTS idx_ce_case_merge_history_source ON ce_case_merge_history (source_case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_merge_history_target ON ce_case_merge_history (target_case_id);
CREATE INDEX IF NOT EXISTS idx_ce_case_merge_history_employer ON ce_case_merge_history (employer_id);

-- =========================
-- 5. FUNCTIONS
-- =========================

-- 5.1 Resolve case family from violation type
CREATE OR REPLACE FUNCTION fn_ce_resolve_case_family(p_violation_type_id UUID)
RETURNS TABLE(family_id UUID, family_code VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category VARCHAR;
BEGIN
  -- Get category from violation type
  SELECT category INTO v_category
  FROM ce_violation_types
  WHERE id = p_violation_type_id;

  IF v_category IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'GENERAL'::VARCHAR;
    RETURN;
  END IF;

  -- Find the case family whose violation_categories array contains this category
  RETURN QUERY
  SELECT cf.id, cf.code
  FROM ce_case_families cf
  WHERE v_category = ANY(cf.violation_categories)
    AND cf.is_active = true
  ORDER BY cf.sort_order
  LIMIT 1;
END;
$$;

-- 5.2 Recalculate case severity from linked violations
CREATE OR REPLACE FUNCTION fn_ce_recalculate_case_severity(p_case_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_count INTEGER;
  v_principal NUMERIC := 0;
  v_penalties NUMERIC := 0;
  v_interest NUMERIC := 0;
  v_total NUMERIC := 0;
  v_score NUMERIC := 0;
  v_last_date DATE;
  v_priority VARCHAR;
  v_escalation_rec BOOLEAN := false;
  v_case_family VARCHAR;
  v_thresh_days INTEGER;
  v_thresh_amount NUMERIC;
  v_opened_date DATE;
  v_days_open INTEGER;
  rec RECORD;
BEGIN
  -- Get case metadata
  SELECT case_family, opened_date INTO v_case_family, v_opened_date
  FROM ce_cases WHERE id = p_case_id;

  -- Get family thresholds
  SELECT escalation_threshold_days, escalation_threshold_amount
  INTO v_thresh_days, v_thresh_amount
  FROM ce_case_families
  WHERE code = v_case_family AND is_active = true;

  v_thresh_days := COALESCE(v_thresh_days, 90);
  v_thresh_amount := COALESCE(v_thresh_amount, 50000);

  -- Aggregate from violations
  SELECT 
    COUNT(*),
    COALESCE(SUM(principal_amount), 0),
    COALESCE(SUM(penalty_amount), 0),
    COALESCE(SUM(interest_amount), 0),
    COALESCE(SUM(total_amount), 0),
    MAX(discovered_date)
  INTO v_count, v_principal, v_penalties, v_interest, v_total, v_last_date
  FROM ce_violations v
  INNER JOIN ce_case_violations cv ON cv.violation_id = v.id
  WHERE cv.case_id = p_case_id
    AND v.status NOT IN ('CANCELLED', 'MERGED')
    AND (v.is_deleted IS NULL OR v.is_deleted = false);

  -- Score each violation
  FOR rec IN
    SELECT v.priority, v.total_amount as viol_amount, v.discovered_date
    FROM ce_violations v
    INNER JOIN ce_case_violations cv ON cv.violation_id = v.id
    WHERE cv.case_id = p_case_id
      AND v.status NOT IN ('CANCELLED', 'MERGED')
      AND (v.is_deleted IS NULL OR v.is_deleted = false)
  LOOP
    DECLARE
      v_age_mult NUMERIC;
      v_amt_factor NUMERIC;
      v_pri_boost NUMERIC;
    BEGIN
      v_age_mult := LEAST((CURRENT_DATE - rec.discovered_date)::NUMERIC / 30.0, 5.0);
      v_amt_factor := CASE WHEN COALESCE(rec.viol_amount, 0) > 0 THEN log(10, rec.viol_amount + 1) ELSE 1 END;
      v_pri_boost := CASE rec.priority
        WHEN 'CRITICAL' THEN 4.0
        WHEN 'HIGH' THEN 3.0
        WHEN 'MEDIUM' THEN 2.0
        ELSE 1.0
      END;
      v_score := v_score + (1.0 * GREATEST(v_age_mult, 0.5) * v_amt_factor * v_pri_boost);
    END;
  END LOOP;

  -- Determine priority from score
  v_priority := CASE
    WHEN v_score > 80 THEN 'CRITICAL'
    WHEN v_score > 50 THEN 'HIGH'
    WHEN v_score > 20 THEN 'MEDIUM'
    ELSE 'LOW'
  END;

  -- Check escalation thresholds
  v_days_open := COALESCE(CURRENT_DATE - v_opened_date, 0);
  IF v_days_open > v_thresh_days OR v_total > v_thresh_amount THEN
    v_escalation_rec := true;
  END IF;

  -- Update the case
  UPDATE ce_cases SET
    violation_count = v_count,
    total_principal = v_principal,
    total_penalties = v_penalties,
    total_interest = v_interest,
    total_amount = v_total,
    severity_score = v_score,
    priority = v_priority,
    last_violation_date = v_last_date,
    escalation_recommended = v_escalation_rec,
    updated_at = now()
  WHERE id = p_case_id;

  v_result := jsonb_build_object(
    'case_id', p_case_id,
    'violation_count', v_count,
    'severity_score', v_score,
    'priority', v_priority,
    'total_amount', v_total,
    'escalation_recommended', v_escalation_rec,
    'days_open', v_days_open
  );

  RETURN v_result;
END;
$$;

-- 5.3 Consolidate violation to case (concurrency-safe)
CREATE OR REPLACE FUNCTION fn_ce_consolidate_violation_to_case(
  p_violation_id UUID,
  p_performed_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_violation RECORD;
  v_family_id UUID;
  v_family_code VARCHAR;
  v_case_id UUID;
  v_case_number VARCHAR;
  v_is_new_case BOOLEAN := false;
  v_lock_key BIGINT;
  v_result JSONB;
  v_reopen_window INTEGER;
  v_reopenable_case_id UUID;
BEGIN
  -- 1. Fetch the violation
  SELECT v.*, vt.category
  INTO v_violation
  FROM ce_violations v
  LEFT JOIN ce_violation_types vt ON vt.id = v.violation_type_id
  WHERE v.id = p_violation_id;

  IF v_violation.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Violation not found');
  END IF;

  IF v_violation.case_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'case_id', v_violation.case_id, 'action', 'ALREADY_LINKED');
  END IF;

  -- 2. Resolve case family
  SELECT family_id, family_code INTO v_family_id, v_family_code
  FROM fn_ce_resolve_case_family(v_violation.violation_type_id);

  v_family_code := COALESCE(v_family_code, 'GENERAL');

  -- 3. Advisory lock on employer+family to prevent race conditions
  v_lock_key := abs(hashtext(COALESCE(v_violation.employer_id, '') || '|' || v_family_code));
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 4. Search for existing active case
  SELECT id INTO v_case_id
  FROM ce_cases
  WHERE employer_id = v_violation.employer_id
    AND case_family = v_family_code
    AND status NOT IN ('CLOSED', 'RESOLVED', 'MERGED', 'CANCELLED')
    AND (is_deleted IS NULL OR is_deleted = false)
  ORDER BY opened_date DESC
  LIMIT 1;

  -- 5. If no active case, check for reopenable closed case
  IF v_case_id IS NULL THEN
    SELECT COALESCE(cf.reopen_window_days, 30) INTO v_reopen_window
    FROM ce_case_families cf WHERE cf.code = v_family_code;

    v_reopen_window := COALESCE(v_reopen_window, 30);

    SELECT id INTO v_reopenable_case_id
    FROM ce_cases
    WHERE employer_id = v_violation.employer_id
      AND case_family = v_family_code
      AND status IN ('CLOSED', 'RESOLVED')
      AND closed_date IS NOT NULL
      AND closed_date >= (CURRENT_DATE - v_reopen_window)
      AND (is_deleted IS NULL OR is_deleted = false)
    ORDER BY closed_date DESC
    LIMIT 1;

    IF v_reopenable_case_id IS NOT NULL THEN
      -- Reopen the case
      UPDATE ce_cases SET
        status = 'ACTIVE',
        reopened_count = COALESCE(reopened_count, 0) + 1,
        closed_date = NULL,
        closure_reason = NULL,
        updated_by = p_performed_by,
        updated_at = now()
      WHERE id = v_reopenable_case_id;

      INSERT INTO ce_case_history (case_id, action, from_status, to_status, notes, performed_by)
      VALUES (v_reopenable_case_id, 'REOPENED', 'CLOSED', 'ACTIVE',
              'Auto-reopened due to new violation ' || v_violation.violation_number,
              p_performed_by);

      v_case_id := v_reopenable_case_id;
    END IF;
  END IF;

  -- 6. If still no case, create new one
  IF v_case_id IS NULL THEN
    -- Generate case number
    v_case_number := 'CC-' || to_char(now(), 'YYYY') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

    INSERT INTO ce_cases (
      case_number, employer_id, employer_name, territory,
      status, priority, case_type, case_family, case_family_id,
      summary, opened_date, violation_count,
      created_by, updated_by
    ) VALUES (
      v_case_number,
      v_violation.employer_id,
      v_violation.employer_name,
      v_violation.territory,
      'OPEN',
      COALESCE(v_violation.priority, 'MEDIUM'),
      v_family_code,
      v_family_code,
      v_family_id,
      'Auto-created from violation ' || v_violation.violation_number,
      CURRENT_DATE,
      0,
      p_performed_by,
      p_performed_by
    ) RETURNING id INTO v_case_id;

    v_is_new_case := true;

    INSERT INTO ce_case_history (case_id, action, to_status, notes, performed_by)
    VALUES (v_case_id, 'CASE_CREATED', 'OPEN',
            'Auto-created from violation ' || v_violation.violation_number || ' (Family: ' || v_family_code || ')',
            p_performed_by);
  END IF;

  -- 7. Link violation to case (junction + direct FK)
  INSERT INTO ce_case_violations (case_id, violation_id, linked_by)
  VALUES (v_case_id, p_violation_id, p_performed_by)
  ON CONFLICT (case_id, violation_id) DO NOTHING;

  UPDATE ce_violations SET
    case_id = v_case_id,
    case_family = v_family_code,
    updated_by = p_performed_by,
    updated_at = now()
  WHERE id = p_violation_id;

  -- 8. Log the linking action
  INSERT INTO ce_case_history (case_id, action, notes, performed_by)
  VALUES (v_case_id, 'VIOLATION_LINKED',
          'Linked violation ' || v_violation.violation_number || ' (type: ' || COALESCE(v_violation.category, 'UNKNOWN') || ')',
          p_performed_by);

  -- 9. Recalculate severity
  PERFORM fn_ce_recalculate_case_severity(v_case_id);

  v_result := jsonb_build_object(
    'ok', true,
    'case_id', v_case_id,
    'action', CASE WHEN v_is_new_case THEN 'CASE_CREATED' 
                   WHEN v_reopenable_case_id IS NOT NULL THEN 'CASE_REOPENED'
                   ELSE 'VIOLATION_LINKED' END,
    'case_family', v_family_code,
    'violation_id', p_violation_id
  );

  RETURN v_result;
END;
$$;

-- =========================
-- 6. SEED CASE FAMILIES
-- =========================

INSERT INTO ce_case_families (code, name, description, violation_categories, severity_weights, escalation_threshold_days, escalation_threshold_amount, reopen_window_days, sort_order, created_by)
VALUES
  ('FILING', 'Filing Compliance', 'Cases arising from late or missing C3 filings', ARRAY['FILING'], '{"LATE_FILING": 1.0, "NON_FILING": 2.0}', 90, 25000, 30, 1, 'SYSTEM'),
  ('PAYMENT', 'Payment Compliance', 'Cases arising from non-payment or partial payment of contributions', ARRAY['PAYMENT'], '{"NON_PAYMENT": 2.0, "PARTIAL_PAYMENT": 1.5}', 60, 50000, 30, 2, 'SYSTEM'),
  ('DECLARATION', 'Declaration Integrity', 'Cases arising from under-declaration, omissions, or wage anomalies', ARRAY['DECLARATION', 'CONTRIBUTION'], '{"UNDER_DECLARATION": 2.5, "LEVY_SEVERANCE_OMISSION": 1.5, "LEVY_OMISSION": 1.5, "SEVERANCE_OMISSION": 1.5, "EMPLOYEE_DISCREPANCY": 1.0, "WAGE_ANOMALY": 2.0}', 120, 75000, 45, 3, 'SYSTEM'),
  ('ARRANGEMENT', 'Arrangement Compliance', 'Cases arising from defaulted payment arrangements', ARRAY['LEGAL'], '{"ARRANGEMENT_DEFAULT": 3.0, "REPEAT_DEFAULT": 3.5, "LEGAL_DEFAULT": 4.0}', 30, 25000, 14, 4, 'SYSTEM'),
  ('REGISTRATION', 'Registration Compliance', 'Cases arising from unregistered employers or cessation without clearance', ARRAY['REGISTRATION'], '{"UNREGISTERED_EMPLOYER": 3.0, "CESSATION_WITHOUT_CLEARANCE": 2.0}', 60, 0, 60, 5, 'SYSTEM'),
  ('GENERAL', 'General Compliance', 'Catch-all for violations not mapped to a specific family', ARRAY['OTHER'], '{}', 120, 100000, 30, 99, 'SYSTEM')
ON CONFLICT (code) DO NOTHING;

-- =========================
-- 7. TRIGGERS
-- =========================

-- Auto-log case status changes
CREATE OR REPLACE FUNCTION fn_ce_case_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ce_case_history (case_id, action, from_status, to_status, notes, performed_by)
    VALUES (NEW.id, 'STATUS_CHANGED', OLD.status, NEW.status,
            'Status changed from ' || COALESCE(OLD.status, 'NULL') || ' to ' || NEW.status,
            COALESCE(NEW.updated_by, 'SYSTEM'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_case_status_change ON ce_cases;
CREATE TRIGGER trg_ce_case_status_change
  AFTER UPDATE ON ce_cases
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_ce_case_status_change_trigger();

-- Auto-log recommendation status changes
CREATE OR REPLACE FUNCTION fn_ce_recommendation_status_change_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ce_case_recommendation_history (recommendation_id, action, from_status, to_status, notes, performed_by)
    VALUES (NEW.id, 'STATUS_CHANGED', OLD.status, NEW.status,
            'Recommendation status changed',
            COALESCE(NEW.updated_by, 'SYSTEM'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_recommendation_status_change ON ce_case_recommendations;
CREATE TRIGGER trg_ce_recommendation_status_change
  AFTER UPDATE ON ce_case_recommendations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_ce_recommendation_status_change_trigger();
