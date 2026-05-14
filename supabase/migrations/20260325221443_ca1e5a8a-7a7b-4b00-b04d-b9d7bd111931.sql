
-- =============================================
-- 1) Risk Override Audit Log Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.ia_engagement_risk_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.ia_audit_engagements(id) ON DELETE CASCADE,
  derived_risk_rating TEXT NOT NULL,
  overridden_risk_rating TEXT NOT NULL,
  override_reason TEXT NOT NULL,
  overridden_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 2) ia_resolve_engagement_risk: derive risk from function/department
-- =============================================
CREATE OR REPLACE FUNCTION public.ia_resolve_engagement_risk(
  p_department_id UUID DEFAULT NULL,
  p_function_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk TEXT;
  v_source TEXT;
  v_risk_score NUMERIC;
BEGIN
  -- Priority 1: Check risk assessments on the function
  IF p_function_id IS NOT NULL THEN
    SELECT ra.risk_level, ra.overall_risk_score
    INTO v_risk, v_risk_score
    FROM ia_risk_assessments ra
    WHERE ra.function_id = p_function_id
      AND ra.is_active = true
    ORDER BY ra.assessment_date DESC NULLS LAST
    LIMIT 1;

    IF v_risk IS NOT NULL THEN
      RETURN jsonb_build_object(
        'risk_rating', v_risk,
        'risk_score', v_risk_score,
        'source', 'risk_assessment_function',
        'source_id', p_function_id
      );
    END IF;

    -- Priority 2: Function-level risk_rating column
    SELECT df.risk_rating INTO v_risk
    FROM ia_department_functions df
    WHERE df.id = p_function_id AND df.is_active = true;

    IF v_risk IS NOT NULL THEN
      RETURN jsonb_build_object(
        'risk_rating', v_risk,
        'risk_score', NULL,
        'source', 'function_risk_rating',
        'source_id', p_function_id
      );
    END IF;
  END IF;

  -- Priority 3: Department-level risk_rating
  IF p_department_id IS NOT NULL THEN
    SELECT d.risk_rating INTO v_risk
    FROM ia_departments d
    WHERE d.id = p_department_id AND d.is_active = true;

    IF v_risk IS NOT NULL THEN
      RETURN jsonb_build_object(
        'risk_rating', v_risk,
        'risk_score', NULL,
        'source', 'department_risk_rating',
        'source_id', p_department_id
      );
    END IF;
  END IF;

  -- Fallback
  RETURN jsonb_build_object(
    'risk_rating', 'Medium',
    'risk_score', NULL,
    'source', 'default',
    'source_id', NULL
  );
END;
$$;

-- =============================================
-- 3) ia_validate_audit_team_user_mapping: ensure auditors have profile_id
-- =============================================
CREATE OR REPLACE FUNCTION public.ia_validate_audit_team_user_mapping(
  p_lead_auditor_id UUID DEFAULT NULL,
  p_supportive_auditor_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors JSONB := '[]'::jsonb;
  v_auditor RECORD;
  v_id UUID;
BEGIN
  -- Validate lead auditor
  IF p_lead_auditor_id IS NOT NULL THEN
    SELECT id, name, profile_id, user_id INTO v_auditor
    FROM ia_auditors WHERE id = p_lead_auditor_id;

    IF v_auditor.id IS NULL THEN
      v_errors := v_errors || jsonb_build_object('auditor_id', p_lead_auditor_id, 'error', 'Lead auditor not found');
    ELSIF v_auditor.profile_id IS NULL AND v_auditor.user_id IS NULL THEN
      v_errors := v_errors || jsonb_build_object('auditor_id', p_lead_auditor_id, 'name', v_auditor.name, 'error', 'Lead auditor is not linked to a system user');
    END IF;
  END IF;

  -- Validate supportive auditors
  IF p_supportive_auditor_ids IS NOT NULL THEN
    FOREACH v_id IN ARRAY p_supportive_auditor_ids LOOP
      SELECT id, name, profile_id, user_id INTO v_auditor
      FROM ia_auditors WHERE id = v_id;

      IF v_auditor.id IS NULL THEN
        v_errors := v_errors || jsonb_build_object('auditor_id', v_id, 'error', 'Auditor not found');
      ELSIF v_auditor.profile_id IS NULL AND v_auditor.user_id IS NULL THEN
        v_errors := v_errors || jsonb_build_object('auditor_id', v_id, 'name', v_auditor.name, 'error', 'Auditor is not linked to a system user');
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors
  );
END;
$$;

-- =============================================
-- 4) ia_seed_ssb_audit_reference_data: Seed SSB departments, functions, risk
-- =============================================
CREATE OR REPLACE FUNCTION public.ia_seed_ssb_audit_reference_data(p_created_by TEXT DEFAULT 'system')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id UUID;
  v_results JSONB := '{}'::jsonb;
  v_dept_count INT := 0;
  v_fn_count INT := 0;
  v_risk_count INT := 0;
BEGIN
  -- ===== DEPARTMENTS =====
  -- 1. Office of the Director
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Office of the Director', 'Director', 'High', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Strategic Planning & Policy', 'High', 'Organizational strategy, policy development, and board governance', p_created_by),
      (v_dept_id, 'Public Relations & Communications', 'Medium', 'External communications, media relations, stakeholder engagement', p_created_by),
      (v_dept_id, 'Legal & Compliance Advisory', 'High', 'Legal counsel, regulatory compliance, legislative interpretation', p_created_by);
    v_fn_count := v_fn_count + 3;
  END IF;

  -- 2. Finance & Accounts
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Finance & Accounts', 'Finance Manager', 'Critical', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Budgeting & Financial Planning', 'High', 'Annual budget preparation, variance analysis, forecasting', p_created_by),
      (v_dept_id, 'Accounts Payable', 'Critical', 'Vendor payments, expense processing, payment authorization', p_created_by),
      (v_dept_id, 'Accounts Receivable & Collections', 'High', 'Contribution collections, arrears tracking, revenue reconciliation', p_created_by),
      (v_dept_id, 'Treasury & Cash Management', 'Critical', 'Cash flow, bank reconciliation, investment management', p_created_by),
      (v_dept_id, 'General Ledger & Reporting', 'High', 'Financial statements, month-end close, audit support', p_created_by),
      (v_dept_id, 'Payroll Processing', 'Critical', 'Staff payroll, statutory deductions, payroll reconciliation', p_created_by);
    v_fn_count := v_fn_count + 6;
  END IF;

  -- 3. Contributions & Compliance
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Contributions & Compliance', 'Compliance Manager', 'Critical', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Employer Registration & Monitoring', 'High', 'New employer onboarding, compliance monitoring, field visits', p_created_by),
      (v_dept_id, 'Contribution Processing (C3)', 'Critical', 'C3 form processing, payment reconciliation, posting', p_created_by),
      (v_dept_id, 'Arrears Management', 'Critical', 'Outstanding balance tracking, payment arrangements, escalation', p_created_by),
      (v_dept_id, 'Field Inspections', 'High', 'On-site employer audits, wage verification, compliance checks', p_created_by),
      (v_dept_id, 'Self-Employed Contributions', 'Medium', 'Voluntary contributor management, voucher generation', p_created_by);
    v_fn_count := v_fn_count + 5;
  END IF;

  -- 4. Benefits & Claims
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Benefits & Claims', 'Benefits Manager', 'Critical', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Short-Term Benefits Processing', 'Critical', 'Sickness, maternity, funeral grant claims processing', p_created_by),
      (v_dept_id, 'Long-Term Benefits (Pensions)', 'Critical', 'Age, invalidity, survivors pension processing', p_created_by),
      (v_dept_id, 'Employment Injury Benefits', 'High', 'Work injury claims, medical board referrals', p_created_by),
      (v_dept_id, 'Medical Board Administration', 'High', 'Medical assessments, disability determinations', p_created_by),
      (v_dept_id, 'Benefits Payment Processing', 'Critical', 'Payment runs, direct deposits, cheque issuance', p_created_by),
      (v_dept_id, 'Overpayment Recovery', 'High', 'Detection, recovery plans, write-off approvals', p_created_by);
    v_fn_count := v_fn_count + 6;
  END IF;

  -- 5. Information Technology
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Information Technology', 'IT Manager', 'High', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Application Development & Maintenance', 'High', 'Core system development, change management, testing', p_created_by),
      (v_dept_id, 'IT Security & Access Control', 'Critical', 'Cybersecurity, access management, incident response', p_created_by),
      (v_dept_id, 'Infrastructure & Network', 'High', 'Servers, network, backup, disaster recovery', p_created_by),
      (v_dept_id, 'Data Management & Reporting', 'Medium', 'Database administration, data quality, BI reporting', p_created_by),
      (v_dept_id, 'IT Governance & Compliance', 'High', 'IT policies, vendor management, license compliance', p_created_by);
    v_fn_count := v_fn_count + 5;
  END IF;

  -- 6. Human Resources
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Human Resources', 'HR Manager', 'Medium', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Recruitment & Onboarding', 'Medium', 'Hiring process, background checks, onboarding', p_created_by),
      (v_dept_id, 'Performance Management', 'Medium', 'Appraisals, KPIs, disciplinary procedures', p_created_by),
      (v_dept_id, 'Training & Development', 'Low', 'Staff training, professional development, certifications', p_created_by),
      (v_dept_id, 'Leave & Attendance Management', 'Low', 'Leave tracking, attendance records, overtime', p_created_by);
    v_fn_count := v_fn_count + 4;
  END IF;

  -- 7. Registration & Records
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Registration & Records', 'Records Manager', 'High', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Insured Person Registration', 'High', 'SSN issuance, identity verification, record creation', p_created_by),
      (v_dept_id, 'Records Management & Archives', 'Medium', 'Document storage, retrieval, retention policies', p_created_by),
      (v_dept_id, 'Data Quality & Deduplication', 'High', 'Duplicate detection, data cleansing, merge operations', p_created_by);
    v_fn_count := v_fn_count + 3;
  END IF;

  -- 8. Procurement & Administration
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Procurement & Administration', 'Admin Manager', 'High', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Procurement & Purchasing', 'Critical', 'Vendor selection, purchase orders, contract management', p_created_by),
      (v_dept_id, 'Asset Management', 'High', 'Fixed asset register, depreciation, disposal', p_created_by),
      (v_dept_id, 'Facilities Management', 'Medium', 'Building maintenance, fleet management, utilities', p_created_by),
      (v_dept_id, 'Inventory & Stores', 'Medium', 'Stock control, issuance, physical counts', p_created_by);
    v_fn_count := v_fn_count + 4;
  END IF;

  -- 9. Internal Audit
  INSERT INTO ia_departments (name, head, risk_rating, created_by) 
  VALUES ('Internal Audit', 'Chief Audit Executive', 'Medium', p_created_by)
  ON CONFLICT DO NOTHING RETURNING id INTO v_dept_id;
  IF v_dept_id IS NOT NULL THEN
    v_dept_count := v_dept_count + 1;
    INSERT INTO ia_department_functions (department_id, function_name, risk_rating, description, created_by) VALUES
      (v_dept_id, 'Audit Planning & Execution', 'Medium', 'Annual plan, engagement management, fieldwork', p_created_by),
      (v_dept_id, 'Quality Assurance & Improvement', 'Medium', 'QA reviews, methodology updates, standards compliance', p_created_by);
    v_fn_count := v_fn_count + 2;
  END IF;

  v_results := jsonb_build_object(
    'success', true,
    'departments_created', v_dept_count,
    'functions_created', v_fn_count,
    'message', format('Seeded %s departments and %s functions', v_dept_count, v_fn_count)
  );

  RETURN v_results;
END;
$$;
