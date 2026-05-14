
-- 1. ce_employer_compliance_status
CREATE TABLE public.ce_employer_compliance_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  compliance_status VARCHAR NOT NULL DEFAULT 'unknown'
    CHECK (compliance_status IN ('compliant','non_compliant','under_review','suspended','exempt','unknown')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  reason_code VARCHAR,
  reason_detail TEXT,
  assigned_officer_id VARCHAR,
  officer_assigned_at TIMESTAMPTZ,
  review_due_date DATE,
  notes TEXT,
  created_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ce_ecstat_emp ON public.ce_employer_compliance_status(employer_id);
CREATE INDEX idx_ce_ecstat_status ON public.ce_employer_compliance_status(compliance_status);
CREATE INDEX idx_ce_ecstat_officer ON public.ce_employer_compliance_status(assigned_officer_id);
CREATE UNIQUE INDEX idx_ce_ecstat_active ON public.ce_employer_compliance_status(employer_id) WHERE effective_to IS NULL;

-- 2. ce_employer_status_history
CREATE TABLE public.ce_employer_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  previous_status VARCHAR,
  new_status VARCHAR NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  reason_code VARCHAR,
  reason_detail TEXT,
  source_event VARCHAR,
  source_reference_id VARCHAR,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ce_eshist_emp ON public.ce_employer_status_history(employer_id);

-- 3. ce_employer_contact_preferences
CREATE TABLE public.ce_employer_contact_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  preferred_channel VARCHAR NOT NULL DEFAULT 'email'
    CHECK (preferred_channel IN ('email','post','courier','fax','in_person','portal')),
  notice_email VARCHAR, notice_phone VARCHAR, notice_fax VARCHAR,
  notice_address_line1 VARCHAR, notice_address_line2 VARCHAR,
  compliance_contact_name VARCHAR, compliance_contact_title VARCHAR,
  compliance_contact_email VARCHAR, compliance_contact_phone VARCHAR,
  language_preference VARCHAR DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employer_id, preferred_channel)
);
CREATE INDEX idx_ce_ecpref_emp ON public.ce_employer_contact_preferences(employer_id);

-- 4. ce_employer_compliance_flags
CREATE TABLE public.ce_employer_compliance_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  flag_code VARCHAR NOT NULL,
  flag_label VARCHAR NOT NULL,
  flag_category VARCHAR NOT NULL DEFAULT 'general'
    CHECK (flag_category IN ('general','enforcement','filing','payment','audit','arrangement','legal')),
  severity VARCHAR NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raised_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  resolved_at TIMESTAMPTZ, resolved_by VARCHAR, resolution_notes TEXT,
  source_event VARCHAR, source_reference_id VARCHAR,
  auto_resolve_condition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ce_eflags_emp ON public.ce_employer_compliance_flags(employer_id);
CREATE INDEX idx_ce_eflags_active ON public.ce_employer_compliance_flags(employer_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_ce_eflags_uniq ON public.ce_employer_compliance_flags(employer_id, flag_code) WHERE is_active = true;

-- 5. ce_employer_snapshot_history
CREATE TABLE public.ce_employer_snapshot_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  snapshot_type VARCHAR NOT NULL DEFAULT 'periodic'
    CHECK (snapshot_type IN ('periodic','event_driven','manual','year_end')),
  compliance_status VARCHAR, risk_band VARCHAR, risk_score NUMERIC(5,2),
  outstanding_balance NUMERIC(15,2) DEFAULT 0, total_arrears NUMERIC(15,2) DEFAULT 0,
  open_cases_count INT DEFAULT 0, open_violations_count INT DEFAULT 0, active_flags_count INT DEFAULT 0,
  filing_compliance_pct NUMERIC(5,2), payment_compliance_pct NUMERIC(5,2),
  last_payment_date DATE, last_filing_date DATE,
  arrangement_count INT DEFAULT 0, arrangement_balance NUMERIC(15,2) DEFAULT 0,
  metadata JSONB,
  created_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ce_esnap_emp ON public.ce_employer_snapshot_history(employer_id);
CREATE INDEX idx_ce_esnap_date ON public.ce_employer_snapshot_history(snapshot_date);
CREATE UNIQUE INDEX idx_ce_esnap_uniq ON public.ce_employer_snapshot_history(employer_id, snapshot_date, snapshot_type);

-- 6. ce_employer_relationships
CREATE TABLE public.ce_employer_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_employer_id VARCHAR NOT NULL,
  child_employer_id VARCHAR NOT NULL,
  relationship_type VARCHAR NOT NULL DEFAULT 'branch'
    CHECK (relationship_type IN ('branch','subsidiary','successor','predecessor','group_member','affiliate')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  consolidate_compliance BOOLEAN NOT NULL DEFAULT false,
  consolidate_financials BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_no_self_rel CHECK (parent_employer_id <> child_employer_id)
);
CREATE INDEX idx_ce_erel_parent ON public.ce_employer_relationships(parent_employer_id);
CREATE INDEX idx_ce_erel_child ON public.ce_employer_relationships(child_employer_id);
CREATE UNIQUE INDEX idx_ce_erel_uniq ON public.ce_employer_relationships(parent_employer_id, child_employer_id, relationship_type) WHERE is_active = true;

-- 7. Triggers on NEW tables only
CREATE OR REPLACE FUNCTION public.ce_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ce_ecstat_upd BEFORE UPDATE ON public.ce_employer_compliance_status FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();
CREATE TRIGGER trg_ce_ecpref_upd BEFORE UPDATE ON public.ce_employer_contact_preferences FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();
CREATE TRIGGER trg_ce_eflags_upd BEFORE UPDATE ON public.ce_employer_compliance_flags FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();
CREATE TRIGGER trg_ce_erel_upd BEFORE UPDATE ON public.ce_employer_relationships FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();

-- 8. Status change audit trigger (on NEW table only)
CREATE OR REPLACE FUNCTION public.ce_log_compliance_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.compliance_status IS DISTINCT FROM NEW.compliance_status THEN
    INSERT INTO public.ce_employer_status_history (
      employer_id, previous_status, new_status, changed_by, reason_code, reason_detail, source_event, source_reference_id
    ) VALUES (
      NEW.employer_id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.compliance_status END,
      NEW.compliance_status,
      COALESCE(NEW.updated_by, NEW.created_by, 'SYSTEM'),
      NEW.reason_code, NEW.reason_detail, 'status_table_change', NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_ce_ecstat_log AFTER INSERT OR UPDATE OF compliance_status ON public.ce_employer_compliance_status FOR EACH ROW EXECUTE FUNCTION public.ce_log_compliance_status_change();

-- 9. Read-only profile view
CREATE OR REPLACE VIEW public.ce_employer_profile_view AS
SELECT
  em.regno AS employer_id, em.name AS employer_name, em.status AS master_status,
  em.sector_code, em.village_code AS territory, em.office_code, em.inspector_code,
  em.phone, em.email, em.hq_addr1, em.hq_addr2,
  cs.compliance_status, cs.effective_from AS compliance_effective_from,
  cs.assigned_officer_id, cs.review_due_date,
  rp.total_score AS risk_score,
  COALESCE(rp.override_band, rp.risk_band) AS risk_band,
  rp.arrears_score, rp.violation_score, rp.filing_score,
  rp.payment_behavior_score, rp.legal_history_score,
  rp.last_calculated_at AS risk_last_calculated,
  rp.next_review_date AS risk_next_review,
  COALESCE(la.total_debits, 0) AS total_debits,
  COALESCE(la.total_credits, 0) AS total_credits,
  COALESCE(la.total_debits, 0) - COALESCE(la.total_credits, 0) AS outstanding_balance,
  COALESCE(ca.open_cases, 0) AS open_cases_count,
  COALESCE(va.open_violations, 0) AS open_violations_count,
  COALESCE(fa.active_flags, 0) AS active_flags_count,
  fa.critical_flags,
  COALESCE(ra.related_employers, 0) AS related_employers_count
FROM public.er_master em
LEFT JOIN public.ce_employer_compliance_status cs ON cs.employer_id = em.regno AND cs.effective_to IS NULL
LEFT JOIN public.ce_risk_profiles rp ON rp.employer_id = em.regno
LEFT JOIN LATERAL (
  SELECT SUM(COALESCE(debit_amount,0)) AS total_debits, SUM(COALESCE(credit_amount,0)) AS total_credits
  FROM public.ce_employer_financial_ledger l WHERE l.employer_id = em.regno AND l.reversal_of_id IS NULL
) la ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS open_cases FROM public.ce_cases c WHERE c.employer_id = em.regno AND c.status NOT IN ('closed','cancelled','resolved')
) ca ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS open_violations FROM public.ce_violations v WHERE v.employer_id = em.regno AND v.status NOT IN ('closed','cancelled','resolved','dismissed')
) va ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS active_flags, COUNT(*) FILTER (WHERE severity = 'critical') AS critical_flags
  FROM public.ce_employer_compliance_flags f WHERE f.employer_id = em.regno AND f.is_active = true
) fa ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS related_employers FROM public.ce_employer_relationships r
  WHERE (r.parent_employer_id = em.regno OR r.child_employer_id = em.regno) AND r.is_active = true
) ra ON true;

COMMENT ON VIEW public.ce_employer_profile_view IS 'Read-only compliance workspace. er_master is NOT modified.';
