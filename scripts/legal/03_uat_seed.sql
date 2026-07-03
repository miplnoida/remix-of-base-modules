-- =====================================================================
-- LEGAL UAT END-TO-END SEED — TEST / UAT ONLY
-- =====================================================================
-- ⚠️  DO NOT RUN ON PRODUCTION WITH REAL DATA.
-- Prerequisites: run 01_reset.sql and 02_master_seed.sql first.
--
-- Seeds 3 fully linked scenarios:
--   S1: Employer multi-period, multi-component recovery (Compliance
--       referral → intake → case → 3 liabilities → hearing → judgment
--       → partial payment allocation → recovery assignment).
--   S2: Consent order with breach (Employer B: 2 liabilities →
--       consent order → 6 installments → 2 missed → breach event).
--   S3: Benefit overpayment settlement (Person → BN referral →
--       intake → case → liability → settlement → allocation → close-ready).
--
-- All financial rollups are deterministic and reconcile to
-- v_lg_case_financials. All IDs are generated inside CTE/DO blocks
-- so the script is safe to re-run after 01_reset.sql.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Fixed anchors — deterministic UUIDs so re-runs stay stable.
-- ---------------------------------------------------------------------
-- Employers (already exist in au_er_master / er_master OR are created
-- here as SEED-tagged demo employers if absent — we DO NOT touch the
-- real employer master. Instead we store legacy_employer_name on the
-- lg_case so screens work regardless).
--
-- We do not create rows in au_er_master / au_ip_master; those are
-- protected sources. The lg_case has legacy_* columns for exactly
-- this UAT scenario.
-- ---------------------------------------------------------------------

DO $$
DECLARE
  -- Scenario 1 anchors
  s1_intake_id      uuid := '00000000-0000-4000-8000-000000000101';
  s1_case_id        uuid := '00000000-0000-4000-8000-000000000102';
  s1_ref_id         uuid := '00000000-0000-4000-8000-000000000103';
  s1_liab1          uuid := '00000000-0000-4000-8000-000000000111';
  s1_liab2          uuid := '00000000-0000-4000-8000-000000000112';
  s1_liab3          uuid := '00000000-0000-4000-8000-000000000113';
  s1_hearing        uuid := '00000000-0000-4000-8000-000000000121';
  s1_order          uuid := '00000000-0000-4000-8000-000000000131';
  s1_assign         uuid := '00000000-0000-4000-8000-000000000141';

  -- Scenario 2 anchors
  s2_intake_id      uuid := '00000000-0000-4000-8000-000000000201';
  s2_case_id        uuid := '00000000-0000-4000-8000-000000000202';
  s2_ref_id         uuid := '00000000-0000-4000-8000-000000000203';
  s2_liab1          uuid := '00000000-0000-4000-8000-000000000211';
  s2_liab2          uuid := '00000000-0000-4000-8000-000000000212';
  s2_hearing        uuid := '00000000-0000-4000-8000-000000000221';
  s2_order          uuid := '00000000-0000-4000-8000-000000000231';
  s2_consent        uuid := '00000000-0000-4000-8000-000000000241';

  -- Scenario 3 anchors
  s3_intake_id      uuid := '00000000-0000-4000-8000-000000000301';
  s3_case_id        uuid := '00000000-0000-4000-8000-000000000302';
  s3_ref_id         uuid := '00000000-0000-4000-8000-000000000303';
  s3_liab1          uuid := '00000000-0000-4000-8000-000000000311';
  s3_settle         uuid := '00000000-0000-4000-8000-000000000321';
BEGIN

-- =====================================================================
-- SCENARIO 1 — SKN Construction Services Ltd. (multi-period arrears)
-- =====================================================================

-- 1a. Compliance referral (source)
INSERT INTO ce_legal_referrals
  (id, referral_number, employer_id, employer_name, employer_zone,
   total_principal, total_penalties, total_interest, grand_total,
   period_from, period_to,
   created_at)
VALUES
  (s1_ref_id, 'SEED-CE-REF-0001', 'SEED-EMP-001', 'SKN Construction Services Ltd.', 'BASSETERRE',
   45000.00, 4500.00, 2250.00, 51750.00,
   '2024-01-01', '2024-06-30',
   now());

-- 1b. Legal intake
INSERT INTO lg_case_intake
  (id, intake_no, country_code, source_module, matter_type_code,
   primary_entity_type, priority_code, intake_status,
   submitted_at, qualification_status,
   supervisor_required, arrangement_exists, settlement_exists, mandatory_complete_flag,
   created_at, updated_at)
VALUES
  (s1_intake_id, 'SEED-INT-0001', 'KN', 'COMPLIANCE', 'ARREARS_RECOVERY',
   'EMPLOYER', 'HIGH', 'APPROVED',
   now() - interval '30 days', 'QUALIFIED',
   false, false, false, true,
   now() - interval '30 days', now());

-- 1c. Legal case
INSERT INTO lg_case
  (id, lg_case_no, country_code, case_type_code, status_code, current_stage_code,
   priority_code, source_intake_id, source_module, source_record_id,
   court_code, court_name, court_case_no,
   claim_amount, total_outstanding, outstanding_amount_snapshot,
   legacy_employer_name, primary_entity_type,
   opened_date, summary, is_legacy,
   created_at, updated_at)
VALUES
  (s1_case_id, 'SEED-LG-2026-0001', 'KN', 'ARREARS_RECOVERY', 'OPEN', 'JUDGMENT_ISSUED',
   'HIGH', s1_intake_id, 'COMPLIANCE', s1_ref_id::text,
   'MC_BAS', 'Magistrate Court — Basseterre', 'MC/BAS/2026/CV/0001',
   51750.00, 25875.00, 25875.00,
   'SKN Construction Services Ltd.', 'EMPLOYER',
   CURRENT_DATE - 30, 'Multi-period arrears (Social Security + Housing Levy + Severance).', false,
   now() - interval '30 days', now());

-- 1d. Party
INSERT INTO lg_case_party (id, lg_case_id, party_role, party_type, display_name, created_at)
VALUES (gen_random_uuid(), s1_case_id, 'DEFENDANT', 'EMPLOYER', 'SKN Construction Services Ltd.', now());

-- 1e. Three recoverable liabilities (different periods & funds)
INSERT INTO lg_recoverable_liability
  (id, lg_case_id, source_module, source_record_id, source_reference,
   assessment_date, liability_type, fund_type,
   contribution_period_from, contribution_period_to, assessment_period,
   employer_id, principal, interest, penalty, court_cost, legal_cost, other_cost,
   total_assessed, paid, outstanding, currency,
   legal_status, recovery_status, status)
VALUES
  (s1_liab1, s1_case_id, 'COMPLIANCE', s1_ref_id::text, 'SEED-CE-REF-0001',
   '2024-04-01', 'CONTRIBUTION', 'SOCIAL_SECURITY',
   '2024-01-01', '2024-03-31', '2024Q1',
   'SEED-EMP-001', 20000.00, 1000.00, 2000.00, 0, 0, 0,
   23000.00, 11500.00, 11500.00, 'XCD',
   'IN_JUDGMENT', 'PARTIAL', 'ACTIVE'),
  (s1_liab2, s1_case_id, 'COMPLIANCE', s1_ref_id::text, 'SEED-CE-REF-0001',
   '2024-04-01', 'LEVY', 'HOUSING_LEVY',
   '2024-01-01', '2024-03-31', '2024Q1',
   'SEED-EMP-001', 15000.00, 750.00, 1500.00, 0, 0, 0,
   17250.00, 8625.00, 8625.00, 'XCD',
   'IN_JUDGMENT', 'PARTIAL', 'ACTIVE'),
  (s1_liab3, s1_case_id, 'COMPLIANCE', s1_ref_id::text, 'SEED-CE-REF-0001',
   '2024-07-01', 'CONTRIBUTION', 'SEVERANCE_FUND',
   '2024-04-01', '2024-06-30', '2024Q2',
   'SEED-EMP-001', 10000.00, 500.00, 1000.00, 0, 0, 0,
   11500.00, 5750.00, 5750.00, 'XCD',
   'IN_JUDGMENT', 'PARTIAL', 'ACTIVE');

-- 1f. Hearing
INSERT INTO lg_hearing
  (id, lg_case_id, hearing_type_code, scheduled_at, status,
   adjournment_count, documents_ready, prep_completed,
   created_at, updated_at)
VALUES
  (s1_hearing, s1_case_id, 'FIRST_HEARING', now() - interval '10 days', 'COMPLETED',
   0, true, true, now() - interval '20 days', now());

INSERT INTO lg_hearing_liability (hearing_id, liability_id) VALUES
  (s1_hearing, s1_liab1),(s1_hearing, s1_liab2),(s1_hearing, s1_liab3);

-- 1g. Order / judgment
INSERT INTO lg_order
  (id, lg_case_id, order_no, order_type_code, status, created_at, updated_at)
VALUES
  (s1_order, s1_case_id, 'SEED-ORD-0001', 'JUDGMENT', 'ISSUED',
   now() - interval '9 days', now());

INSERT INTO lg_order_liability (order_id, liability_id) VALUES
  (s1_order, s1_liab1),(s1_order, s1_liab2),(s1_order, s1_liab3);

-- 1h. Partial payment allocation (50% across the board)
INSERT INTO lg_payment_allocation (id, liability_id, payment_id, allocated_amount, created_at) VALUES
  (gen_random_uuid(), s1_liab1, gen_random_uuid(), 11500.00, now()),
  (gen_random_uuid(), s1_liab2, gen_random_uuid(), 8625.00,  now()),
  (gen_random_uuid(), s1_liab3, gen_random_uuid(), 5750.00,  now());

-- 1i. Recovery assignment
INSERT INTO lg_recovery_assignment
  (id, code, title, status, health, priority, transfer_pending,
   liability_count, order_count, appeal_count, enforcement_count,
   total_principal, total_interest, total_penalty, total_assessed,
   total_paid, total_outstanding, recovery_pct,
   lg_case_id, assigned_officer_id, created_at, updated_at)
VALUES
  (s1_assign, 'SEED-RA-0001', 'Post-judgment recovery — SKN Construction',
   'ACTIVE', 'GREEN', 'HIGH', false,
   3, 1, 0, 0,
   45000.00, 2250.00, 4500.00, 51750.00,
   25875.00, 25875.00, 50.0,
   s1_case_id, NULL, now(), now());

INSERT INTO lg_recovery_assignment_liability (assignment_id, liability_id) VALUES
  (s1_assign, s1_liab1),(s1_assign, s1_liab2),(s1_assign, s1_liab3);

-- 1j. Activity / timeline
INSERT INTO lg_case_activity (id, lg_case_id, activity_type, description, entity_type, entity_id, ts, created_at)
VALUES
  (gen_random_uuid(), s1_case_id, 'CASE_OPENED',      'Case opened from Compliance referral.', 'CASE',    s1_case_id, now() - interval '30 days', now() - interval '30 days'),
  (gen_random_uuid(), s1_case_id, 'HEARING_COMPLETED','First hearing completed.',              'HEARING', s1_hearing, now() - interval '10 days', now() - interval '10 days'),
  (gen_random_uuid(), s1_case_id, 'JUDGMENT_ISSUED',  'Judgment issued for full claim.',       'ORDER',   s1_order,   now() - interval '9 days',  now() - interval '9 days'),
  (gen_random_uuid(), s1_case_id, 'PAYMENT_RECEIVED', 'Partial payment applied — 50%.',        'CASE',    s1_case_id, now() - interval '2 days',  now() - interval '2 days');

-- =====================================================================
-- SCENARIO 2 — Basseterre Retail Group Ltd. (consent order + breach)
-- =====================================================================

INSERT INTO ce_legal_referrals
  (id, referral_number, employer_id, employer_name, employer_zone,
   total_principal, total_penalties, total_interest, grand_total,
   period_from, period_to, created_at)
VALUES
  (s2_ref_id, 'SEED-CE-REF-0002', 'SEED-EMP-002', 'Basseterre Retail Group Ltd.', 'BASSETERRE',
   30000.00, 3000.00, 1500.00, 34500.00,
   '2023-07-01', '2023-12-31', now());

INSERT INTO lg_case_intake
  (id, intake_no, country_code, source_module, matter_type_code,
   primary_entity_type, priority_code, intake_status,
   submitted_at, qualification_status,
   supervisor_required, arrangement_exists, settlement_exists, mandatory_complete_flag,
   created_at, updated_at)
VALUES
  (s2_intake_id, 'SEED-INT-0002', 'KN', 'COMPLIANCE', 'ARREARS_RECOVERY',
   'EMPLOYER', 'MEDIUM', 'APPROVED', now() - interval '60 days', 'QUALIFIED',
   false, true, false, true, now() - interval '60 days', now());

INSERT INTO lg_case
  (id, lg_case_no, country_code, case_type_code, status_code, current_stage_code,
   priority_code, source_intake_id, source_module, source_record_id,
   court_code, court_name, court_case_no,
   claim_amount, total_outstanding, outstanding_amount_snapshot,
   legacy_employer_name, primary_entity_type,
   opened_date, summary, is_legacy, created_at, updated_at)
VALUES
  (s2_case_id, 'SEED-LG-2026-0002', 'KN', 'ARREARS_RECOVERY', 'OPEN', 'CONSENT_ORDER',
   'MEDIUM', s2_intake_id, 'COMPLIANCE', s2_ref_id::text,
   'MC_BAS', 'Magistrate Court — Basseterre', 'MC/BAS/2026/CV/0002',
   34500.00, 23000.00, 23000.00,
   'Basseterre Retail Group Ltd.', 'EMPLOYER',
   CURRENT_DATE - 60, 'Consent order with installment breach.', false,
   now() - interval '60 days', now());

INSERT INTO lg_case_party (id, lg_case_id, party_role, party_type, display_name, created_at)
VALUES (gen_random_uuid(), s2_case_id, 'DEFENDANT', 'EMPLOYER', 'Basseterre Retail Group Ltd.', now());

INSERT INTO lg_recoverable_liability
  (id, lg_case_id, source_module, source_record_id, source_reference,
   assessment_date, liability_type, fund_type,
   contribution_period_from, contribution_period_to, assessment_period,
   employer_id, principal, interest, penalty, court_cost, legal_cost, other_cost,
   total_assessed, paid, outstanding, currency,
   legal_status, recovery_status, arrangement_status, status)
VALUES
  (s2_liab1, s2_case_id, 'COMPLIANCE', s2_ref_id::text, 'SEED-CE-REF-0002',
   '2024-01-15', 'CONTRIBUTION', 'SOCIAL_SECURITY',
   '2023-07-01', '2023-12-31', '2023H2',
   'SEED-EMP-002', 20000.00, 1000.00, 2000.00, 0, 0, 0,
   23000.00, 7666.66, 15333.34, 'XCD',
   'CONSENT', 'IN_ARRANGEMENT', 'ACTIVE', 'ACTIVE'),
  (s2_liab2, s2_case_id, 'COMPLIANCE', s2_ref_id::text, 'SEED-CE-REF-0002',
   '2024-01-15', 'LEVY', 'HOUSING_LEVY',
   '2023-07-01', '2023-12-31', '2023H2',
   'SEED-EMP-002', 10000.00, 500.00, 1000.00, 0, 0, 0,
   11500.00, 3833.34, 7666.66, 'XCD',
   'CONSENT', 'IN_ARRANGEMENT', 'ACTIVE', 'ACTIVE');

INSERT INTO lg_hearing
  (id, lg_case_id, hearing_type_code, scheduled_at, status,
   adjournment_count, documents_ready, prep_completed, created_at, updated_at)
VALUES
  (s2_hearing, s2_case_id, 'FIRST_HEARING', now() - interval '45 days', 'COMPLETED',
   0, true, true, now() - interval '50 days', now());

INSERT INTO lg_hearing_liability (hearing_id, liability_id) VALUES
  (s2_hearing, s2_liab1),(s2_hearing, s2_liab2);

INSERT INTO lg_order
  (id, lg_case_id, order_no, order_type_code, status, created_at, updated_at)
VALUES
  (s2_order, s2_case_id, 'SEED-ORD-0002', 'CONSENT_ORDER', 'ACTIVE',
   now() - interval '44 days', now());

INSERT INTO lg_order_liability (order_id, liability_id) VALUES
  (s2_order, s2_liab1),(s2_order, s2_liab2);

INSERT INTO lg_consent_order
  (id, case_id, code, title, total_amount, paid_amount,
   installment_count, missed_installments, court_approval_required, status,
   created_at, updated_at)
VALUES
  (s2_consent, s2_case_id, 'SEED-CO-0001', 'Consent Order — Basseterre Retail',
   34500.00, 11500.00, 6, 2, true, 'BREACHED',
   now() - interval '44 days', now());

INSERT INTO lg_consent_liability (consent_order_id, liability_id) VALUES
  (s2_consent, s2_liab1),(s2_consent, s2_liab2);

-- 6 installments: 4 paid, 2 missed
INSERT INTO lg_consent_installment (id, consent_order_id, seq, due_date, amount_due, amount_paid, status, created_at, updated_at) VALUES
  (gen_random_uuid(), s2_consent, 1, CURRENT_DATE - 44,  5750.00, 5750.00, 'PAID',   now(), now()),
  (gen_random_uuid(), s2_consent, 2, CURRENT_DATE - 14,  5750.00, 5750.00, 'PAID',   now(), now()),
  (gen_random_uuid(), s2_consent, 3, CURRENT_DATE + 16,  5750.00, 0.00,    'MISSED', now(), now()),
  (gen_random_uuid(), s2_consent, 4, CURRENT_DATE + 46,  5750.00, 0.00,    'MISSED', now(), now()),
  (gen_random_uuid(), s2_consent, 5, CURRENT_DATE + 76,  5750.00, 0.00,    'PENDING',now(), now()),
  (gen_random_uuid(), s2_consent, 6, CURRENT_DATE + 106, 5750.00, 0.00,    'PENDING',now(), now());

INSERT INTO lg_payment_allocation (id, liability_id, payment_id, allocated_amount, created_at) VALUES
  (gen_random_uuid(), s2_liab1, gen_random_uuid(), 7666.66, now()),
  (gen_random_uuid(), s2_liab2, gen_random_uuid(), 3833.34, now());

INSERT INTO lg_case_activity (id, lg_case_id, activity_type, description, entity_type, entity_id, ts, created_at) VALUES
  (gen_random_uuid(), s2_case_id, 'CONSENT_ORDER_ISSUED', 'Consent order approved by court.', 'ORDER',   s2_order,   now() - interval '44 days', now()),
  (gen_random_uuid(), s2_case_id, 'INSTALLMENT_MISSED',   'Installment 3 missed.',            'CONSENT', s2_consent, now(),                       now()),
  (gen_random_uuid(), s2_case_id, 'INSTALLMENT_MISSED',   'Installment 4 missed.',            'CONSENT', s2_consent, now(),                       now());

-- =====================================================================
-- SCENARIO 3 — Benefit overpayment settlement (insured person)
-- =====================================================================

INSERT INTO bn_legal_referral
  (id, referral_number, insured_person_id, matter_type_code, exposure_amount,
   priority_code, referral_reason, status,
   submitted_at, items_count, documents_count,
   source_module, source_record_id, source_reference_no,
   total_referred_amount, created_at, updated_at)
VALUES
  (s3_ref_id, 'SEED-BN-REF-0001', 'SEED-IP-001', 'BENEFIT_OVERPAYMENT', 8500.00,
   'MEDIUM', 'Sickness benefit overpayment recovery.', 'ACCEPTED',
   now() - interval '20 days', 1, 0,
   'BENEFITS', s3_ref_id::text, 'SEED-BN-OVP-0001',
   8500.00, now() - interval '20 days', now());

INSERT INTO lg_case_intake
  (id, intake_no, country_code, source_module, matter_type_code,
   primary_entity_type, priority_code, intake_status,
   submitted_at, qualification_status,
   supervisor_required, arrangement_exists, settlement_exists, mandatory_complete_flag,
   created_at, updated_at)
VALUES
  (s3_intake_id, 'SEED-INT-0003', 'KN', 'BENEFITS', 'BENEFIT_OVERPAYMENT',
   'INSURED_PERSON', 'MEDIUM', 'APPROVED',
   now() - interval '20 days', 'QUALIFIED',
   false, false, true, true,
   now() - interval '20 days', now());

INSERT INTO lg_case
  (id, lg_case_no, country_code, case_type_code, status_code, current_stage_code,
   priority_code, source_intake_id, source_module, source_record_id,
   claim_amount, total_outstanding, outstanding_amount_snapshot,
   legacy_person_name, primary_entity_type,
   opened_date, summary, is_legacy, created_at, updated_at)
VALUES
  (s3_case_id, 'SEED-LG-2026-0003', 'KN', 'BENEFIT_OVERPAYMENT', 'OPEN', 'SETTLEMENT_AGREED',
   'MEDIUM', s3_intake_id, 'BENEFITS', s3_ref_id::text,
   8500.00, 0.00, 0.00,
   'Jane Doe (SEED)', 'INSURED_PERSON',
   CURRENT_DATE - 20, 'Sickness benefit overpayment — settled in full.', false,
   now() - interval '20 days', now());

INSERT INTO lg_case_party (id, lg_case_id, party_role, party_type, display_name, created_at)
VALUES (gen_random_uuid(), s3_case_id, 'DEFENDANT', 'INSURED_PERSON', 'Jane Doe (SEED)', now());

INSERT INTO lg_recoverable_liability
  (id, lg_case_id, source_module, source_record_id, source_reference,
   assessment_date, liability_type, fund_type,
   insured_person_id, principal, interest, penalty, court_cost, legal_cost, other_cost,
   total_assessed, paid, outstanding, currency,
   legal_status, recovery_status, settlement_status, status)
VALUES
  (s3_liab1, s3_case_id, 'BENEFITS', s3_ref_id::text, 'SEED-BN-OVP-0001',
   '2025-06-01', 'OVERPAYMENT', 'BENEFIT_RECOVERY',
   'SEED-IP-001', 8000.00, 500.00, 0, 0, 0, 0,
   8500.00, 8500.00, 0.00, 'XCD',
   'SETTLED', 'RECOVERED', 'AGREED', 'ACTIVE');

INSERT INTO lg_settlement
  (id, lg_case_id, status, proposed_at, created_at, updated_at)
VALUES
  (s3_settle, s3_case_id, 'AGREED', now() - interval '10 days', now() - interval '10 days', now());

INSERT INTO lg_settlement_liability (settlement_id, liability_id) VALUES
  (s3_settle, s3_liab1);

INSERT INTO lg_payment_allocation (id, liability_id, payment_id, allocated_amount, created_at) VALUES
  (gen_random_uuid(), s3_liab1, gen_random_uuid(), 8500.00, now());

INSERT INTO lg_case_activity (id, lg_case_id, activity_type, description, entity_type, entity_id, ts, created_at) VALUES
  (gen_random_uuid(), s3_case_id, 'CASE_OPENED',       'Referral accepted from Benefits.',      'CASE',       s3_case_id, now() - interval '20 days', now() - interval '20 days'),
  (gen_random_uuid(), s3_case_id, 'SETTLEMENT_AGREED', 'Full-amount settlement executed.',      'SETTLEMENT', s3_settle,  now() - interval '10 days', now() - interval '10 days'),
  (gen_random_uuid(), s3_case_id, 'PAYMENT_RECEIVED',  'Full settlement amount received.',      'CASE',       s3_case_id, now() - interval '1 day',   now() - interval '1 day');

END $$;

COMMIT;

-- =====================================================================
-- POST-SEED SUMMARY
-- =====================================================================
SELECT 'Cases'          AS metric, COUNT(*)::text AS value FROM lg_case
UNION ALL SELECT 'Intakes',           COUNT(*)::text FROM lg_case_intake
UNION ALL SELECT 'Referrals (CE)',    COUNT(*)::text FROM ce_legal_referrals
UNION ALL SELECT 'Referrals (BN)',    COUNT(*)::text FROM bn_legal_referral
UNION ALL SELECT 'Parties',           COUNT(*)::text FROM lg_case_party
UNION ALL SELECT 'Liabilities',       COUNT(*)::text FROM lg_recoverable_liability
UNION ALL SELECT 'Hearings',          COUNT(*)::text FROM lg_hearing
UNION ALL SELECT 'Orders',            COUNT(*)::text FROM lg_order
UNION ALL SELECT 'Consent orders',    COUNT(*)::text FROM lg_consent_order
UNION ALL SELECT 'Settlements',       COUNT(*)::text FROM lg_settlement
UNION ALL SELECT 'Recovery assigns',  COUNT(*)::text FROM lg_recovery_assignment
UNION ALL SELECT 'Payments allocs',   COUNT(*)::text FROM lg_payment_allocation
UNION ALL SELECT 'Activities',        COUNT(*)::text FROM lg_case_activity;
