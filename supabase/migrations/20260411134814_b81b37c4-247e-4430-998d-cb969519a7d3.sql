
-- ============================================================
-- ce_employer_snapshots: Immutable employer profile snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_employer_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id TEXT NOT NULL,
  snapshot_trigger TEXT NOT NULL,
  snapshot_trigger_id TEXT,
  snapshot_trigger_type TEXT,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_by TEXT,

  -- Employer identity (from er_master)
  employer_name TEXT,
  employer_status TEXT,
  trade_name TEXT,
  registration_date TEXT,
  sector_code TEXT,
  industrial_code TEXT,
  ownership_code TEXT,
  office_code TEXT,
  village_code TEXT,
  parent_regno TEXT,
  regno TEXT,

  -- Contact (from er_master)
  phone TEXT,
  fax TEXT,
  email TEXT,
  mobile TEXT,
  mailing_address_1 TEXT,
  mailing_address_2 TEXT,
  hq_address_1 TEXT,
  hq_address_2 TEXT,

  -- Compliance status snapshot
  compliance_status TEXT,
  filing_status TEXT,
  payment_status TEXT,
  current_arrears NUMERIC,
  current_penalties NUMERIC,
  active_violations INT,
  active_cases INT,
  active_arrangements INT,
  last_filing_period TEXT,
  last_payment_date TEXT,

  -- Risk snapshot
  risk_score NUMERIC,
  risk_band TEXT,
  filing_risk_score NUMERIC,
  payment_risk_score NUMERIC,
  enforcement_risk_score NUMERIC,

  -- Group/hierarchy snapshot
  group_id UUID,
  group_name TEXT,
  group_role TEXT,
  parent_employer_id TEXT,
  parent_employer_name TEXT,

  -- Contact preferences snapshot
  preferred_channel TEXT,
  compliance_email TEXT,
  compliance_phone TEXT,
  authorized_contact_name TEXT,
  legal_representative_name TEXT,
  consent_given BOOLEAN,

  -- Compliance flags at time of snapshot
  active_flags JSONB DEFAULT '[]',

  -- Full raw data for evidence
  raw_master_data JSONB,
  raw_compliance_data JSONB,
  raw_risk_data JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

ALTER TABLE public.ce_employer_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ce_employer_snapshots" ON public.ce_employer_snapshots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_ce_es_employer ON public.ce_employer_snapshots (employer_id);
CREATE INDEX idx_ce_es_trigger ON public.ce_employer_snapshots (snapshot_trigger_type, snapshot_trigger_id);
CREATE INDEX idx_ce_es_at ON public.ce_employer_snapshots (snapshot_at DESC);

-- ============================================================
-- ce_case_employer_snapshot: Links case to snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_case_employer_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  snapshot_id UUID NOT NULL REFERENCES public.ce_employer_snapshots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  CONSTRAINT ce_ces_unique UNIQUE (case_id, snapshot_id)
);

ALTER TABLE public.ce_case_employer_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ce_case_employer_snapshot" ON public.ce_case_employer_snapshot
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_ce_ces_case ON public.ce_case_employer_snapshot (case_id);
CREATE INDEX idx_ce_ces_snapshot ON public.ce_case_employer_snapshot (snapshot_id);

-- ============================================================
-- ce_violation_employer_snapshot: Links violation to snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ce_violation_employer_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL,
  snapshot_id UUID NOT NULL REFERENCES public.ce_employer_snapshots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  CONSTRAINT ce_ves_unique UNIQUE (violation_id, snapshot_id)
);

ALTER TABLE public.ce_violation_employer_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_ce_violation_employer_snapshot" ON public.ce_violation_employer_snapshot
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_ce_ves_violation ON public.ce_violation_employer_snapshot (violation_id);
CREATE INDEX idx_ce_ves_snapshot ON public.ce_violation_employer_snapshot (snapshot_id);

-- ============================================================
-- ce_create_employer_snapshot: Server-side snapshot function
-- ============================================================
CREATE OR REPLACE FUNCTION public.ce_create_employer_snapshot(
  p_employer_id TEXT,
  p_trigger TEXT,
  p_trigger_id TEXT DEFAULT NULL,
  p_trigger_type TEXT DEFAULT NULL,
  p_snapshot_by TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_master RECORD;
  v_cs RECORD;
  v_rp RECORD;
  v_gm RECORD;
  v_cp RECORD;
  v_flags JSONB;
BEGIN
  -- Read from protected employer master (read-only)
  SELECT * INTO v_master FROM public.er_master WHERE regno = p_employer_id;

  -- Read compliance status
  SELECT * INTO v_cs FROM public.ce_employer_compliance_status WHERE employer_id = p_employer_id;

  -- Read risk profile
  SELECT * INTO v_rp FROM public.ce_risk_profiles WHERE employer_id = p_employer_id;

  -- Read group membership
  SELECT gm.group_id, gm.role, g.group_name
  INTO v_gm
  FROM public.ce_employer_group_membership gm
  JOIN public.ce_employer_groups g ON g.id = gm.group_id
  WHERE gm.employer_id = p_employer_id AND gm.is_active = true
  LIMIT 1;

  -- Read contact preferences
  SELECT * INTO v_cp FROM public.ce_employer_contact_preferences WHERE employer_id = p_employer_id AND is_active = true;

  -- Aggregate active compliance flags
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'flag_code', flag_code,
    'flag_name', flag_name,
    'severity', severity,
    'effective_from', effective_from
  )), '[]'::jsonb)
  INTO v_flags
  FROM public.ce_employer_compliance_flags
  WHERE employer_id = p_employer_id AND is_active = true;

  -- Create immutable snapshot
  INSERT INTO public.ce_employer_snapshots (
    employer_id, snapshot_trigger, snapshot_trigger_id, snapshot_trigger_type, snapshot_by,
    employer_name, employer_status, trade_name, registration_date,
    sector_code, industrial_code, ownership_code, office_code, village_code,
    parent_regno, regno,
    phone, fax, email, mobile,
    mailing_address_1, mailing_address_2, hq_address_1, hq_address_2,
    compliance_status, filing_status, payment_status,
    current_arrears, current_penalties,
    active_violations, active_cases, active_arrangements,
    last_filing_period, last_payment_date,
    risk_score, risk_band, filing_risk_score, payment_risk_score, enforcement_risk_score,
    group_id, group_name, group_role,
    parent_employer_id, parent_employer_name,
    preferred_channel, compliance_email, compliance_phone,
    authorized_contact_name, legal_representative_name, consent_given,
    active_flags,
    raw_master_data, raw_compliance_data, raw_risk_data,
    created_by
  ) VALUES (
    p_employer_id, p_trigger, p_trigger_id, p_trigger_type, p_snapshot_by,
    v_master.name, v_master.status, v_master.trade_name, v_master.registration_date,
    v_master.sector_code, v_master.industrial_code, v_master.ownership_code,
    v_master.office_code, v_master.village_code,
    v_master.parent_regno, v_master.regno,
    v_master.phone, v_master.fax, v_master.email, v_master.mobile,
    v_master.maddr1, v_master.maddr2, v_master.hq_addr1, v_master.hq_addr2,
    v_cs.overall_compliance_status, v_cs.filing_status, v_cs.payment_status,
    v_cs.current_arrears_amount, v_cs.current_penalty_amount,
    v_cs.active_violation_count, v_cs.active_case_count, v_cs.active_arrangement_count,
    v_cs.last_filing_period, v_cs.last_payment_date::TEXT,
    v_rp.total_score, v_rp.risk_band, v_rp.filing_score, v_rp.payment_behavior_score, v_rp.enforcement_risk_score,
    v_gm.group_id, v_gm.group_name, v_gm.role,
    v_master.parent_regno, NULL,
    v_cp.preferred_channel, v_cp.notice_email, v_cp.notice_phone,
    v_cp.authorized_contact_name, v_cp.legal_representative_name, v_cp.consent_given,
    v_flags,
    to_jsonb(v_master), to_jsonb(v_cs), to_jsonb(v_rp),
    p_snapshot_by
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;
