DO $phase5$
DECLARE
  z1 uuid := 'a1b2c3d4-0001-4000-8000-000000000001';
  z2 uuid := 'a1b2c3d4-0002-4000-8000-000000000002';
  z3 uuid := 'a1b2c3d4-0003-4000-8000-000000000003';
  ci07 uuid := '0e72997f-6d12-4d4b-b6f2-27b103e47ad3';
  ci04 uuid := 'd7581085-4aaa-49f2-9b44-0d47b9b66f93';
  ciN01 uuid := '3813b349-aedd-4630-8bfd-1d9f86d86e35';
  wk_start date := DATE '2026-04-27';
  wk_end   date := DATE '2026-05-01';
  vt_late uuid;
  vt_nonpay uuid;
  vt_nonfile uuid;
  vt_legaldef uuid;
  appr_v1 uuid := md5('DEMO-P5-PLAN-APPR-V1')::uuid;
  appr_v2 uuid := md5('DEMO-P5-PLAN-APPR-V2')::uuid;
  rev_v1  uuid := md5('DEMO-P5-PLAN-REVSUB-V1')::uuid;
  rev_v2  uuid := md5('DEMO-P5-PLAN-REVSUB-V2')::uuid;
BEGIN
  SELECT id INTO vt_late     FROM ce_violation_types WHERE code='LATE_FILING'  LIMIT 1;
  SELECT id INTO vt_nonpay   FROM ce_violation_types WHERE code='NON_PAYMENT'  LIMIT 1;
  SELECT id INTO vt_nonfile  FROM ce_violation_types WHERE code='NON_FILING'   LIMIT 1;
  SELECT id INTO vt_legaldef FROM ce_violation_types WHERE code='LEGAL_DEFAULT' LIMIT 1;

  UPDATE ce_inspectors SET can_handle_review = true  WHERE id = ci04;
  UPDATE ce_inspectors SET can_handle_review = false WHERE id IN (ci07, ciN01);

  INSERT INTO ce_risk_profiles (
    employer_id, employer_name, territory, zone_id,
    risk_band, total_score,
    last_inspected_at, last_audit_date, next_audit_due_date,
    audit_cycle_type, audit_program,
    last_calculated_at, scoring_version, created_by, updated_by
  )
  SELECT
    'DEMO-P5-E' || lpad(g::text,3,'0'),
    'Demo Employer ' || lpad(g::text,3,'0'),
    CASE ((g-1) % 3) WHEN 0 THEN 'Basseterre' WHEN 1 THEN 'St. Peters' ELSE 'Nevis' END,
    CASE ((g-1) % 3) WHEN 0 THEN z1 WHEN 1 THEN z2 ELSE z3 END,
    CASE WHEN g <= 6 THEN 'CRITICAL' WHEN g <= 14 THEN 'HIGH' WHEN g <= 24 THEN 'MEDIUM' ELSE 'LOW' END,
    CASE WHEN g <= 6 THEN 85 + (g % 10) WHEN g <= 14 THEN 65 + (g % 15) WHEN g <= 24 THEN 35 + (g % 25) ELSE 10 + (g % 20) END,
    CASE WHEN g <= 6 THEN now() - ((100 + g*7) || ' days')::interval
         WHEN g <= 14 THEN now() - ((60 + g*3) || ' days')::interval
         ELSE now() - ((g*2) || ' days')::interval END,
    CASE WHEN g <= 6 THEN (CURRENT_DATE - ((120 + g*5)))::date
         WHEN g <= 14 THEN (CURRENT_DATE - ((75 + g*3)))::date
         ELSE (CURRENT_DATE - ((g*2)))::date END,
    CASE WHEN g <= 6 THEN (CURRENT_DATE - 10)::date
         WHEN g <= 14 THEN (CURRENT_DATE + 3)::date
         ELSE (CURRENT_DATE + 30 + g)::date END,
    CASE WHEN g <= 14 THEN 'ANNUAL' ELSE 'BIENNIAL' END,
    'STANDARD', now(), 'PHASE5_DEMO', 'system', 'system'
  FROM generate_series(1, 30) g
  ON CONFLICT (employer_id) DO UPDATE SET
    employer_name=EXCLUDED.employer_name, territory=EXCLUDED.territory, zone_id=EXCLUDED.zone_id,
    risk_band=EXCLUDED.risk_band, total_score=EXCLUDED.total_score,
    last_inspected_at=EXCLUDED.last_inspected_at, last_audit_date=EXCLUDED.last_audit_date,
    next_audit_due_date=EXCLUDED.next_audit_due_date, last_calculated_at=now(),
    updated_by='system', updated_at=now();

  INSERT INTO ce_violations (
    id, violation_number, employer_id, employer_name, territory,
    violation_type_id, fund_type, status, priority, severity,
    summary, principal_amount, total_amount,
    discovered_date, due_date, created_by, zone_id
  )
  SELECT
    md5('DEMO-P5-V' || g::text)::uuid,
    'DEMO-P5-V' || lpad(g::text,3,'0'),
    'DEMO-P5-E' || lpad(g::text,3,'0'),
    'Demo Employer ' || lpad(g::text,3,'0'),
    CASE ((g-1) % 3) WHEN 0 THEN 'Basseterre' WHEN 1 THEN 'St. Peters' ELSE 'Nevis' END,
    CASE (g % 4) WHEN 0 THEN vt_late WHEN 1 THEN vt_nonpay WHEN 2 THEN vt_nonfile ELSE vt_legaldef END,
    'SS',
    CASE WHEN g <= 4 THEN 'ESCALATED' ELSE 'OPEN' END,
    CASE WHEN g <= 4 THEN 'CRITICAL' WHEN g <= 8 THEN 'HIGH' ELSE 'MEDIUM' END,
    CASE WHEN g <= 4 THEN 'CRITICAL' WHEN g <= 8 THEN 'HIGH' ELSE 'MEDIUM' END,
    'Demo violation #' || g || ' — Phase 5 seed',
    1500 + g*250, 1500 + g*250,
    (CURRENT_DATE - (CASE WHEN g <= 4 THEN 120 + g*8 WHEN g <= 8 THEN 65 + g*3 ELSE 5 + g END))::date,
    (CURRENT_DATE + 30)::date, 'PHASE5_DEMO',
    CASE ((g-1) % 3) WHEN 0 THEN z1 WHEN 1 THEN z2 ELSE z3 END
  FROM generate_series(1, 12) g
  ON CONFLICT (id) DO UPDATE SET
    status=EXCLUDED.status, severity=EXCLUDED.severity,
    discovered_date=EXCLUDED.discovered_date, updated_at=now(), updated_by='system';

  INSERT INTO ce_cases (
    id, case_number, employer_id, employer_name, territory,
    status, priority, case_type, summary,
    total_principal, total_amount, risk_band, risk_score,
    opened_date, target_resolution_date, created_by
  )
  SELECT
    md5('DEMO-P5-C' || g::text)::uuid,
    'DEMO-P5-C' || lpad(g::text,3,'0'),
    'DEMO-P5-E' || lpad(g::text,3,'0'),
    'Demo Employer ' || lpad(g::text,3,'0'),
    CASE ((g-1) % 3) WHEN 0 THEN 'Basseterre' WHEN 1 THEN 'St. Peters' ELSE 'Nevis' END,
    CASE WHEN g <= 2 THEN 'ACTIVE' WHEN g <= 4 THEN 'INVESTIGATION' ELSE 'OPEN' END,
    CASE WHEN g <= 2 THEN 'Critical' ELSE 'High' END,
    'COMPLIANCE',
    'Demo case #' || g || ' — Phase 5 seed',
    5000 + g*1500, 6500 + g*1500,
    CASE WHEN g <= 2 THEN 'CRITICAL' ELSE 'HIGH' END,
    80 + g,
    (CURRENT_DATE - (60 + g*5))::date,
    (CURRENT_DATE + 30)::date, 'PHASE5_DEMO'
  FROM generate_series(1, 6) g
  ON CONFLICT (id) DO UPDATE SET
    status=EXCLUDED.status, priority=EXCLUDED.priority,
    summary=EXCLUDED.summary, updated_at=now(), updated_by='system';

  INSERT INTO ce_notices (
    id, notice_number, employer_id, employer_name,
    notice_type, status, subject, body, delivery_method,
    sent_at, due_response_date, response_received, created_by
  )
  SELECT
    md5('DEMO-P5-N' || g::text)::uuid,
    'DEMO-P5-N' || lpad(g::text,3,'0'),
    'DEMO-P5-E' || lpad(g::text,3,'0'),
    'Demo Employer ' || lpad(g::text,3,'0'),
    'NON_COMPLIANCE', 'SENT',
    'Notice of Non-Compliance — Demo #' || g,
    'Phase 5 seed notice body.', 'EMAIL',
    now() - ((10 + g*2) || ' days')::interval,
    (CURRENT_DATE + (CASE WHEN g <= 2 THEN g WHEN g <= 4 THEN 5 + g ELSE 12 + g END))::date,
    false, 'PHASE5_DEMO'
  FROM generate_series(1, 6) g
  ON CONFLICT (id) DO UPDATE SET
    status=EXCLUDED.status, due_response_date=EXCLUDED.due_response_date,
    response_received=false, updated_at=now(), updated_by='system';

  INSERT INTO ce_payment_arrangements (
    id, arrangement_number, employer_id, employer_name,
    status, total_debt, installment_amount, number_of_installments,
    frequency, start_date, end_date,
    total_paid, installments_paid, next_due_date, missed_payments,
    breach_detected, breach_date, breach_reason,
    created_by, approved_by, approved_at
  ) VALUES (
    md5('DEMO-P5-PA1')::uuid, 'DEMO-P5-PA001',
    'DEMO-P5-E001', 'Demo Employer 001',
    'BREACHED', 24000, 2000, 12, 'monthly',
    (CURRENT_DATE - 180)::date, (CURRENT_DATE + 180)::date,
    4000, 2, (CURRENT_DATE - 30)::date, 3,
    true, (CURRENT_DATE - 15)::date, 'Three consecutive missed installments',
    'PHASE5_DEMO', 'PHASE5_DEMO', now() - INTERVAL '180 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    status='BREACHED', breach_detected=true, breach_date=EXCLUDED.breach_date,
    missed_payments=EXCLUDED.missed_payments, updated_at=now(), updated_by='system';

  INSERT INTO ce_arrangement_breaches (
    id, arrangement_id, breach_type, description, detected_at, detected_by, created_by
  ) VALUES (
    md5('DEMO-P5-BR1')::uuid, md5('DEMO-P5-PA1')::uuid,
    'MISSED_INSTALLMENT',
    'Three consecutive missed installments — Phase 5 demo',
    now() - INTERVAL '15 days', 'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 4a. DRAFT plan
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision, approved_version_flag,
    zone_id, narrative, created_by, updated_by
  ) VALUES (
    md5('DEMO-P5-PLAN-DRAFT')::uuid, 'DEMO-P5-WP-DRAFT',
    ci07, 'Inspector CI-07', wk_start, wk_end,
    'DRAFT', 1, true, false, false,
    z1, 'Phase 5 demo — DRAFT plan for Z1 inspector.',
    'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET status='DRAFT', is_current_version=true, updated_at=now();

  -- 4b. SUBMITTED plan
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision, approved_version_flag,
    zone_id, narrative, submitted_date, created_by, updated_by
  ) VALUES (
    md5('DEMO-P5-PLAN-SUB')::uuid, 'DEMO-P5-WP-SUB',
    ciN01, 'Inspector CI-N01', wk_start, wk_end,
    'SUBMITTED', 1, true, false, false,
    z3, 'Phase 5 demo — SUBMITTED plan awaiting manager review.',
    now() - INTERVAL '1 day', 'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET status='SUBMITTED', is_current_version=true, updated_at=now();

  -- 4c. APPROVED plan
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision, approved_version_flag,
    zone_id, narrative, submitted_date, approved_date, approved_by, approved_by_name,
    created_by, updated_by
  ) VALUES (
    md5('DEMO-P5-PLAN-APPR')::uuid, 'DEMO-P5-WP-APPR',
    ci04, 'Senior CI-04', wk_start, wk_end,
    'APPROVED', 1, true, false, true,
    z2, 'Phase 5 demo — APPROVED plan, locked baseline.',
    now() - INTERVAL '3 days', now() - INTERVAL '2 days',
    'admin', 'System Admin', 'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET
    status='APPROVED', is_current_version=true, approved_version_flag=true, updated_at=now();

  -- 4d-i. v1 APPROVED with NULL superseded fields (will back-fill after v2 inserted)
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision, approved_version_flag,
    zone_id, narrative, submitted_date, approved_date, approved_by, approved_by_name,
    created_by, updated_by
  ) VALUES (
    appr_v1, 'DEMO-P5-WP-APPR2-V1',
    ci07, 'Inspector CI-07', DATE '2026-05-04', DATE '2026-05-08',
    'APPROVED', 1, false, false, true,
    z1, 'Phase 5 demo — original approved plan, now superseded by v2 draft.',
    now() - INTERVAL '5 days', now() - INTERVAL '4 days',
    'admin', 'System Admin', 'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET
    status='APPROVED', is_current_version=false, updated_at=now();

  -- 4d-ii. v2 REVISION_DRAFT now that v1 exists
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision,
    parent_plan_id, supersedes_plan_id, base_version_no,
    revision_reason_code, revision_reason_text, approved_version_flag,
    zone_id, narrative, created_by, updated_by
  ) VALUES (
    appr_v2, 'DEMO-P5-WP-APPR2-V2',
    ci07, 'Inspector CI-07', DATE '2026-05-04', DATE '2026-05-08',
    'REVISION_DRAFT', 2, true, true,
    appr_v1, appr_v1, 1,
    'NEW_URGENT_EVENT',
    'New high-risk employer surfaced after approval — adding visit.',
    false, z1, 'Phase 5 demo — REVISION_DRAFT building on approved v1.',
    'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET status='REVISION_DRAFT', is_current_version=true, updated_at=now();

  -- 4d-iii. Back-fill v1's superseded pointer
  UPDATE ce_weekly_plans
     SET superseded_at = now() - INTERVAL '1 hour',
         superseded_by_plan_id = appr_v2
   WHERE id = appr_v1;

  -- 4e-i. v1 APPROVED (Z3) without superseded fields
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision, approved_version_flag,
    zone_id, narrative, submitted_date, approved_date, approved_by, approved_by_name,
    created_by, updated_by
  ) VALUES (
    rev_v1, 'DEMO-P5-WP-REVSUB-V1',
    ciN01, 'Inspector CI-N01', DATE '2026-05-11', DATE '2026-05-15',
    'APPROVED', 1, false, false, true,
    z3, 'Phase 5 demo — original approved plan (Z3).',
    now() - INTERVAL '7 days', now() - INTERVAL '6 days',
    'admin', 'System Admin', 'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET
    status='APPROVED', is_current_version=false, updated_at=now();

  -- 4e-ii. v2 REVISION_SUBMITTED
  INSERT INTO ce_weekly_plans (
    id, plan_number, inspector_id, inspector_name,
    week_start_date, week_end_date,
    status, version_no, is_current_version, is_revision,
    parent_plan_id, supersedes_plan_id, base_version_no,
    revision_reason_code, revision_reason_text, approved_version_flag,
    zone_id, narrative, submitted_date, created_by, updated_by
  ) VALUES (
    rev_v2, 'DEMO-P5-WP-REVSUB-V2',
    ciN01, 'Inspector CI-N01', DATE '2026-05-11', DATE '2026-05-15',
    'REVISION_SUBMITTED', 2, true, true,
    rev_v1, rev_v1, 1,
    'CARRY_FORWARD',
    'Adding carry-forward items missed last week.',
    false, z3, 'Phase 5 demo — REVISION_SUBMITTED awaiting manager re-approval.',
    now() - INTERVAL '15 minutes', 'PHASE5_DEMO', 'PHASE5_DEMO'
  )
  ON CONFLICT (id) DO UPDATE SET
    status='REVISION_SUBMITTED', is_current_version=true,
    submitted_date=now() - INTERVAL '15 minutes', updated_at=now();

  -- 4e-iii. Back-fill v1's superseded pointer
  UPDATE ce_weekly_plans
     SET superseded_at = now() - INTERVAL '30 minutes',
         superseded_by_plan_id = rev_v2
   WHERE id = rev_v1;

  -- v1 baseline items
  INSERT INTO ce_weekly_plan_items (
    id, plan_id, item_type, day_of_week, scheduled_date,
    source_type, source_id, source_ref,
    employer_id, employer_name, territory, zone_id,
    priority, recommendation_score, is_mandatory,
    purpose, execution_status, created_by
  )
  SELECT
    md5('DEMO-P5-ITEM-APPR-V1-' || g::text)::uuid,
    appr_v1, 'EMPLOYER_VISIT',
    CASE g WHEN 1 THEN 'Monday' WHEN 2 THEN 'Wednesday' ELSE 'Thursday' END,
    DATE '2026-05-04' + (CASE g WHEN 1 THEN 0 WHEN 2 THEN 2 ELSE 3 END),
    'VIOLATION',
    'DEMO-P5-V' || lpad(g::text,3,'0'),
    'DEMO-P5-V' || lpad(g::text,3,'0'),
    'DEMO-P5-E' || lpad(g::text,3,'0'),
    'Demo Employer ' || lpad(g::text,3,'0'),
    'Basseterre', z1,
    'CRITICAL', 90 + g, true,
    'Phase 5 demo — baseline visit ' || g, 'PLANNED', 'PHASE5_DEMO'
  FROM generate_series(1, 3) g
  ON CONFLICT (id) DO NOTHING;

  -- v2 revision items
  INSERT INTO ce_weekly_plan_items (
    id, plan_id, item_type, day_of_week, scheduled_date,
    source_type, source_id, source_ref,
    employer_id, employer_name, territory, zone_id,
    priority, recommendation_score, is_mandatory,
    purpose, execution_status, created_by
  ) VALUES
    (md5('DEMO-P5-ITEM-APPR-V2-1')::uuid, appr_v2,
     'EMPLOYER_VISIT', 'Monday', DATE '2026-05-04',
     'VIOLATION', 'DEMO-P5-V001', 'DEMO-P5-V001',
     'DEMO-P5-E001', 'Demo Employer 001', 'Basseterre', z1,
     'CRITICAL', 91, true, 'Phase 5 demo — kept item 1', 'PLANNED', 'PHASE5_DEMO'),
    (md5('DEMO-P5-ITEM-APPR-V2-2')::uuid, appr_v2,
     'EMPLOYER_VISIT', 'Wednesday', DATE '2026-05-06',
     'VIOLATION', 'DEMO-P5-V002', 'DEMO-P5-V002',
     'DEMO-P5-E002', 'Demo Employer 002', 'St. Peters', z1,
     'HIGH', 88, false, 'Phase 5 demo — kept item 2 (day shifted)', 'PLANNED', 'PHASE5_DEMO'),
    (md5('DEMO-P5-ITEM-APPR-V2-3')::uuid, appr_v2,
     'EMPLOYER_VISIT', 'Friday', DATE '2026-05-08',
     'CASE', 'DEMO-P5-C001', 'DEMO-P5-C001',
     'DEMO-P5-E001', 'Demo Employer 001', 'Basseterre', z1,
     'CRITICAL', 95, true, 'Phase 5 demo — NEW urgent item added in revision', 'PLANNED', 'PHASE5_DEMO')
  ON CONFLICT (id) DO NOTHING;

  -- DRAFT, SUBMITTED, APPROVED simple-plan items
  INSERT INTO ce_weekly_plan_items (
    id, plan_id, item_type, day_of_week, scheduled_date,
    source_type, source_id, employer_id, employer_name,
    territory, zone_id, priority, is_mandatory,
    purpose, execution_status, created_by
  ) VALUES
    (md5('DEMO-P5-ITEM-DRAFT-1')::uuid, md5('DEMO-P5-PLAN-DRAFT')::uuid,
     'EMPLOYER_VISIT', 'Tuesday', wk_start + 1,
     'VIOLATION', 'DEMO-P5-V003', 'DEMO-P5-E003', 'Demo Employer 003',
     'Nevis', z1, 'HIGH', false, 'Phase 5 demo — draft item', 'PLANNED', 'PHASE5_DEMO'),
    (md5('DEMO-P5-ITEM-SUB-1')::uuid, md5('DEMO-P5-PLAN-SUB')::uuid,
     'EMPLOYER_VISIT', 'Wednesday', wk_start + 2,
     'CASE', 'DEMO-P5-C002', 'DEMO-P5-E004', 'Demo Employer 004',
     'Nevis', z3, 'CRITICAL', true, 'Phase 5 demo — submitted item', 'PLANNED', 'PHASE5_DEMO'),
    (md5('DEMO-P5-ITEM-APPR-1')::uuid, md5('DEMO-P5-PLAN-APPR')::uuid,
     'EMPLOYER_VISIT', 'Thursday', wk_start + 3,
     'NOTICE', 'DEMO-P5-N001', 'DEMO-P5-E005', 'Demo Employer 005',
     'St. Peters', z2, 'HIGH', true, 'Phase 5 demo — approved item', 'PLANNED', 'PHASE5_DEMO')
  ON CONFLICT (id) DO NOTHING;

END $phase5$;