
-- =============================================
-- STEP 1: Clear old risk assessment data
-- =============================================
DELETE FROM ia_risk_assessment_factors;
DELETE FROM ia_risk_assessments;

-- =============================================
-- STEP 2: Seed comprehensive risk assessments for all SSB functions
-- Risk Matrix: 5x5 (Impact × Likelihood)
--   1-5 = Low, 6-10 = Medium, 11-15 = High, 16-25 = Critical
-- Assessment context: St. Kitts & Nevis Social Security Board
-- =============================================

-- Helper: Insert risk assessment for each function with SSB-specific scoring
-- Factors considered per function:
--   Financial Impact, Regulatory/Legal, Operational, Reputational, Fraud Risk

DO $$
DECLARE
  v_fn RECORD;
  v_assessment_id UUID;
  v_impact INT;
  v_likelihood INT;
  v_risk_score NUMERIC;
  v_risk_level TEXT;
  v_control_eff NUMERIC;
  v_reg_score NUMERIC;
  v_rep_score NUMERIC;
  v_vel_score NUMERIC;
BEGIN
  FOR v_fn IN
    SELECT df.id as function_id, df.function_name, df.risk_rating, df.department_id, d.name as dept_name
    FROM ia_department_functions df
    JOIN ia_departments d ON d.id = df.department_id
    WHERE df.is_active = true
    ORDER BY d.name, df.function_name
  LOOP
    -- Derive Impact & Likelihood based on function risk rating and SSB context
    CASE v_fn.risk_rating
      WHEN 'Critical' THEN
        v_impact := 5; v_likelihood := 4; v_control_eff := 55; v_reg_score := 5; v_rep_score := 5; v_vel_score := 4;
      WHEN 'High' THEN
        v_impact := 4; v_likelihood := 3; v_control_eff := 65; v_reg_score := 4; v_rep_score := 4; v_vel_score := 3;
      WHEN 'Medium' THEN
        v_impact := 3; v_likelihood := 2; v_control_eff := 75; v_reg_score := 3; v_rep_score := 3; v_vel_score := 2;
      WHEN 'Low' THEN
        v_impact := 2; v_likelihood := 1; v_control_eff := 85; v_reg_score := 2; v_rep_score := 2; v_vel_score := 1;
      ELSE
        v_impact := 3; v_likelihood := 2; v_control_eff := 75; v_reg_score := 3; v_rep_score := 3; v_vel_score := 2;
    END CASE;

    -- SSB-specific adjustments by department context
    -- Finance: higher fraud/financial risk
    IF v_fn.dept_name = 'Finance & Accounts' THEN
      v_impact := LEAST(v_impact + 1, 5);
      v_reg_score := LEAST(v_reg_score + 1, 5);
    END IF;

    -- Benefits: higher reputational risk (public-facing), higher likelihood of errors
    IF v_fn.dept_name = 'Benefits & Claims' THEN
      v_rep_score := LEAST(v_rep_score + 1, 5);
      v_likelihood := LEAST(v_likelihood + 1, 5);
    END IF;

    -- Contributions: regulatory compliance paramount
    IF v_fn.dept_name = 'Contributions & Compliance' THEN
      v_reg_score := LEAST(v_reg_score + 1, 5);
    END IF;

    -- IT: velocity of risk realization is high (cyber incidents)
    IF v_fn.dept_name = 'Information Technology' THEN
      v_vel_score := LEAST(v_vel_score + 1, 5);
    END IF;

    v_risk_score := v_impact * v_likelihood;
    
    -- Determine risk level from score
    IF v_risk_score >= 16 THEN v_risk_level := 'Critical';
    ELSIF v_risk_score >= 11 THEN v_risk_level := 'High';
    ELSIF v_risk_score >= 6 THEN v_risk_level := 'Medium';
    ELSE v_risk_level := 'Low';
    END IF;

    -- Insert the risk assessment
    INSERT INTO ia_risk_assessments (
      function_id, assessment_date, assessment_year,
      impact_score, likelihood_score, overall_risk_score, risk_level,
      control_effectiveness_score, regulatory_score, reputational_score, velocity_score,
      risk_category, risk_description, risk_owner,
      assessed_by, is_active, created_by
    ) VALUES (
      v_fn.function_id,
      '2026-01-15',
      '2025-2026',
      v_impact, v_likelihood, v_risk_score, v_risk_level,
      v_control_eff, v_reg_score, v_rep_score, v_vel_score,
      CASE 
        WHEN v_fn.dept_name IN ('Finance & Accounts', 'Contributions & Compliance') THEN 'Financial'
        WHEN v_fn.dept_name = 'Benefits & Claims' THEN 'Operational'
        WHEN v_fn.dept_name = 'Information Technology' THEN 'Technology'
        WHEN v_fn.dept_name = 'Human Resources' THEN 'People'
        WHEN v_fn.dept_name IN ('Office of the Director', 'Internal Audit') THEN 'Governance'
        WHEN v_fn.dept_name = 'Procurement & Administration' THEN 'Procurement'
        WHEN v_fn.dept_name = 'Registration & Records' THEN 'Data Integrity'
        ELSE 'Operational'
      END,
      -- SSB-specific risk descriptions
      CASE v_fn.function_name
        WHEN 'Accounts Payable' THEN 'Risk of unauthorized, duplicate, or fraudulent payments to vendors; inadequate segregation of duties in payment authorization'
        WHEN 'Accounts Receivable & Collections' THEN 'Risk of contribution revenue leakage, inadequate follow-up on delinquent employers, and aging receivables'
        WHEN 'Budgeting & Financial Planning' THEN 'Risk of budget overruns, unrealistic forecasts, and misalignment between strategic objectives and resource allocation'
        WHEN 'General Ledger & Reporting' THEN 'Risk of material misstatement in financial reports, delayed month-end closings, and non-compliance with IPSAS standards'
        WHEN 'Payroll Processing' THEN 'Risk of ghost employees, incorrect salary calculations, unauthorized overtime, and payroll fraud'
        WHEN 'Treasury & Cash Management' THEN 'Risk of cash shortfalls, unauthorized fund transfers, poor investment decisions, and bank reconciliation gaps'
        WHEN 'Short-Term Benefits Processing' THEN 'Risk of fraudulent sickness/maternity claims, incorrect benefit calculations, and delayed processing affecting beneficiaries'
        WHEN 'Long-Term Benefits (Pensions)' THEN 'Risk of incorrect pension computations, unauthorized pension modifications, and actuarial liability miscalculations'
        WHEN 'Employment Injury Benefits' THEN 'Risk of fraudulent injury claims, inadequate medical evidence verification, and delayed compensation payments'
        WHEN 'Medical Board Administration' THEN 'Risk of biased medical assessments, lack of independent review, and inconsistent disability determinations'
        WHEN 'Benefits Payment Processing' THEN 'Risk of payment to ineligible recipients, duplicate payments, and delayed disbursements affecting vulnerable beneficiaries'
        WHEN 'Overpayment Recovery' THEN 'Risk of undetected overpayments, inadequate recovery mechanisms, and aging write-off exposure'
        WHEN 'Employer Registration & Monitoring' THEN 'Risk of unregistered employers evading contributions, incomplete employer records, and inadequate monitoring of compliance'
        WHEN 'Contribution Processing (C3)' THEN 'Risk of inaccurate C3 processing, contribution posting errors, undeclared wages, and revenue loss to the Fund'
        WHEN 'Arrears Management' THEN 'Risk of growing employer arrears, ineffective collection strategies, and revenue loss impacting Fund sustainability'
        WHEN 'Field Inspections' THEN 'Risk of inadequate inspection coverage, inspector collusion with employers, and failure to detect non-compliance'
        WHEN 'Self-Employed Contributions' THEN 'Risk of low voluntary compliance rates, inaccurate income declarations, and contribution gaps'
        WHEN 'Application Development & Maintenance' THEN 'Risk of system failures, inadequate change management, and vulnerabilities in custom-developed applications'
        WHEN 'IT Security & Access Control' THEN 'Risk of data breaches, unauthorized system access, ransomware attacks, and exposure of insured person PII data'
        WHEN 'Infrastructure & Network' THEN 'Risk of system downtime, inadequate disaster recovery, and network vulnerabilities affecting service continuity'
        WHEN 'Data Management & Reporting' THEN 'Risk of data quality issues, inaccurate management reports, and poor data governance practices'
        WHEN 'IT Governance & Compliance' THEN 'Risk of non-compliance with data protection legislation, inadequate IT policies, and unmanaged vendor risks'
        WHEN 'Recruitment & Onboarding' THEN 'Risk of biased hiring, inadequate background checks, and non-compliance with public service employment standards'
        WHEN 'Performance Management' THEN 'Risk of subjective appraisals, lack of accountability, and inconsistent disciplinary procedures'
        WHEN 'Training & Development' THEN 'Risk of skills gaps, inadequate succession planning, and misaligned training investment'
        WHEN 'Leave & Attendance Management' THEN 'Risk of leave abuse, inaccurate attendance records, and unauthorized absences'
        WHEN 'Insured Person Registration' THEN 'Risk of duplicate SSN issuance, identity fraud, and inaccurate contributor records affecting benefit eligibility'
        WHEN 'Records Management & Archives' THEN 'Risk of document loss, inadequate retention policies, and inability to retrieve records for claims adjudication'
        WHEN 'Data Quality & Deduplication' THEN 'Risk of duplicate contributor records, data integrity issues, and incorrect benefit determinations from merged data'
        WHEN 'Procurement & Purchasing' THEN 'Risk of bid rigging, sole-source favoritism, contract overruns, and non-compliance with public procurement regulations'
        WHEN 'Asset Management' THEN 'Risk of unaccounted fixed assets, inadequate depreciation tracking, and unauthorized asset disposals'
        WHEN 'Facilities Management' THEN 'Risk of deferred maintenance, fleet misuse, and inadequate insurance coverage for SSB properties'
        WHEN 'Inventory & Stores' THEN 'Risk of inventory shrinkage, obsolete stock accumulation, and inadequate physical count procedures'
        WHEN 'Strategic Planning & Policy' THEN 'Risk of strategic drift, inadequate board governance, and policy decisions not aligned with Fund sustainability'
        WHEN 'Public Relations & Communications' THEN 'Risk of reputational damage from poor crisis communication, misinformation, and stakeholder dissatisfaction'
        WHEN 'Legal & Compliance Advisory' THEN 'Risk of non-compliance with Social Security Act, inadequate legal opinions, and unresolved regulatory matters'
        WHEN 'Audit Planning & Execution' THEN 'Risk of audit plan not addressing highest-risk areas, inadequate audit coverage, and independence threats'
        WHEN 'Quality Assurance & Improvement' THEN 'Risk of declining audit quality, non-conformance with IIA Standards, and lack of continuous improvement'
        ELSE 'General operational risk requiring periodic review and monitoring'
      END,
      -- Risk owner = department head
      v_fn.dept_name || ' Head',
      'system',
      true,
      'admin'
    ) RETURNING id INTO v_assessment_id;

    -- Insert risk assessment factors for each assessment (5 standard factors)
    -- Factor 1: Financial Impact
    INSERT INTO ia_risk_assessment_factors (assessment_id, factor_name, factor_category, score, weight, weighted_score, notes)
    VALUES (v_assessment_id, 'Financial Impact', 'Financial',
      CASE WHEN v_fn.dept_name IN ('Finance & Accounts', 'Benefits & Claims', 'Contributions & Compliance') THEN LEAST(v_impact + 1, 5) ELSE v_impact END,
      0.30,
      CASE WHEN v_fn.dept_name IN ('Finance & Accounts', 'Benefits & Claims', 'Contributions & Compliance') THEN LEAST(v_impact + 1, 5) * 0.30 ELSE v_impact * 0.30 END,
      'Financial exposure from errors, fraud, or inefficiency in this function'
    );

    -- Factor 2: Regulatory & Legal Compliance
    INSERT INTO ia_risk_assessment_factors (assessment_id, factor_name, factor_category, score, weight, weighted_score, notes)
    VALUES (v_assessment_id, 'Regulatory & Legal Compliance', 'Compliance',
      v_reg_score, 0.25, v_reg_score * 0.25,
      'Exposure to regulatory penalties, legal action, or non-compliance with the Social Security Act and subsidiary legislation'
    );

    -- Factor 3: Operational Disruption
    INSERT INTO ia_risk_assessment_factors (assessment_id, factor_name, factor_category, score, weight, weighted_score, notes)
    VALUES (v_assessment_id, 'Operational Disruption', 'Operational',
      v_likelihood, 0.20, v_likelihood * 0.20,
      'Likelihood and impact of process failures disrupting service delivery to insured persons and employers'
    );

    -- Factor 4: Reputational Impact
    INSERT INTO ia_risk_assessment_factors (assessment_id, factor_name, factor_category, score, weight, weighted_score, notes)
    VALUES (v_assessment_id, 'Reputational Impact', 'Reputational',
      v_rep_score, 0.15, v_rep_score * 0.15,
      'Potential damage to public trust and SSB institutional credibility in St. Kitts & Nevis'
    );

    -- Factor 5: Fraud & Integrity Risk
    INSERT INTO ia_risk_assessment_factors (assessment_id, factor_name, factor_category, score, weight, weighted_score, notes)
    VALUES (v_assessment_id, 'Fraud & Integrity', 'Fraud',
      CASE 
        WHEN v_fn.function_name IN ('Accounts Payable', 'Payroll Processing', 'Treasury & Cash Management', 'Procurement & Purchasing', 'Benefits Payment Processing') THEN 5
        WHEN v_fn.function_name IN ('Contribution Processing (C3)', 'Short-Term Benefits Processing', 'Long-Term Benefits (Pensions)', 'Field Inspections') THEN 4
        WHEN v_fn.risk_rating = 'Critical' THEN 4
        WHEN v_fn.risk_rating = 'High' THEN 3
        ELSE 2
      END,
      0.10,
      CASE 
        WHEN v_fn.function_name IN ('Accounts Payable', 'Payroll Processing', 'Treasury & Cash Management', 'Procurement & Purchasing', 'Benefits Payment Processing') THEN 5 * 0.10
        WHEN v_fn.function_name IN ('Contribution Processing (C3)', 'Short-Term Benefits Processing', 'Long-Term Benefits (Pensions)', 'Field Inspections') THEN 4 * 0.10
        WHEN v_fn.risk_rating = 'Critical' THEN 4 * 0.10
        WHEN v_fn.risk_rating = 'High' THEN 3 * 0.10
        ELSE 2 * 0.10
      END,
      'Susceptibility to fraud, collusion, or integrity failures'
    );

  END LOOP;
END;
$$;
