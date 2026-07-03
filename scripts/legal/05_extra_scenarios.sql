-- =====================================================================
-- LEGAL UAT SEED — EXTRA SCENARIOS (Appeal, Enforcement, External Counsel)
-- =====================================================================
-- ⚠️  TEST / UAT ONLY. Run AFTER 03_uat_seed.sql.
--
-- Extends the three base scenarios so every core Legal screen has
-- meaningful linked data, while keeping ALL financial rollups anchored
-- on lg_recoverable_liability (no duplicate financial state).
--
--   S4  APPEAL         — appeal linked to Scenario 1 order + liabilities,
--                        outcome = PARTIALLY_ALLOWED (recovery_impact
--                        recorded on the appeal only; liability amounts
--                        remain the single source of truth).
--   S5  ENFORCEMENT    — enforcement on Scenario 2 breached consent
--                        order → partial recovery + enforcement cost
--                        booked via lg_legal_cost.
--   S6  EXTERNAL       — external counsel + court filing + legal cost
--       COUNSEL          on Scenario 1 case; cost is recoverable via
--                        lg_legal_cost.linked_engagement_id.
--
-- Idempotent via fixed UUID anchors; safe to re-run after 01_reset.sql.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  -- Reuse Scenario 1 & 2 anchors from 03_uat_seed.sql
  s1_case_id     uuid := '00000000-0000-4000-8000-000000000102';
  s1_liab1       uuid := '00000000-0000-4000-8000-000000000111';
  s1_liab2       uuid := '00000000-0000-4000-8000-000000000112';
  s1_liab3       uuid := '00000000-0000-4000-8000-000000000113';
  s1_order       uuid := '00000000-0000-4000-8000-000000000131';

  s2_case_id     uuid := '00000000-0000-4000-8000-000000000202';
  s2_liab1       uuid := '00000000-0000-4000-8000-000000000211';
  s2_liab2       uuid := '00000000-0000-4000-8000-000000000212';
  s2_order       uuid := '00000000-0000-4000-8000-000000000231';

  -- Scenario 4 — Appeal
  s4_appeal      uuid := '00000000-0000-4000-8000-000000000401';

  -- Scenario 5 — Enforcement
  s5_enforce     uuid := '00000000-0000-4000-8000-000000000501';
  s5_cost        uuid := '00000000-0000-4000-8000-000000000502';

  -- Scenario 6 — External counsel + court filing
  s6_counsel     uuid := '00000000-0000-4000-8000-000000000601';
  s6_engagement  uuid := '00000000-0000-4000-8000-000000000602';
  s6_filing      uuid := '00000000-0000-4000-8000-000000000603';
  s6_cost        uuid := '00000000-0000-4000-8000-000000000604';

  hc_bas_id      uuid;
BEGIN

-- Look up High Court UUID from master (seeded in 02_master_seed.sql)
SELECT id INTO hc_bas_id FROM lg_court WHERE court_code = 'HC_BAS' LIMIT 1;

-- =====================================================================
-- SCENARIO 4 — Appeal against Scenario 1 judgment
-- =====================================================================
INSERT INTO lg_appeal
  (id, appeal_no, case_id, order_id, filing_party, grounds,
   filing_date, appeal_deadline, hearing_date, decision_date,
   outcome, status, recovery_impact_amount, remarks,
   created_at, updated_at)
VALUES
  (s4_appeal, 'SEED-APL-0001', s1_case_id, s1_order, 'DEFENDANT',
   'Disputes quantum on Housing Levy component (2024Q1).',
   CURRENT_DATE - 7, CURRENT_DATE + 23, CURRENT_DATE - 2, CURRENT_DATE - 1,
   'PARTIALLY_ALLOWED', 'DECIDED', 2000.00,
   'Levy component reduced on appeal; liability master retained as source of truth.',
   now() - interval '7 days', now());

INSERT INTO lg_appeal_liability (id, appeal_id, liability_id, notes, created_at) VALUES
  (gen_random_uuid(), s4_appeal, s1_liab2, 'Housing Levy — quantum dispute', now()),
  (gen_random_uuid(), s4_appeal, s1_liab3, 'Severance Fund — jurisdictional ground', now());

INSERT INTO lg_case_activity (id, lg_case_id, activity_type, description, entity_type, entity_id, ts, created_at) VALUES
  (gen_random_uuid(), s1_case_id, 'APPEAL_FILED',   'Defendant filed appeal against judgment.', 'APPEAL', s4_appeal, now() - interval '7 days', now() - interval '7 days'),
  (gen_random_uuid(), s1_case_id, 'APPEAL_DECIDED', 'Appeal partially allowed.',               'APPEAL', s4_appeal, now() - interval '1 day',  now() - interval '1 day');

-- =====================================================================
-- SCENARIO 5 — Enforcement on Scenario 2 breached consent order
-- =====================================================================
INSERT INTO lg_enforcement_action
  (id, enforcement_no, case_id, order_id, enforcement_type, status,
   requested_date, approved_date, execution_date, officer_code,
   amount_targeted, amount_recovered, outcome, next_action, remarks,
   created_at, updated_at)
VALUES
  (s5_enforce, 'SEED-ENF-0001', s2_case_id, s2_order, 'GARNISHMENT', 'PARTIAL_RECOVERY',
   CURRENT_DATE - 5, CURRENT_DATE - 4, CURRENT_DATE - 1, 'REG_BAS_01',
   23000.00, 5000.00, 'PARTIAL',
   'Continue monthly garnishment until installment schedule fully paid.',
   'Bank garnishment against operating account following consent-order breach.',
   now() - interval '5 days', now());

INSERT INTO lg_enforcement_liability (id, enforcement_id, liability_id, allocated_amount, notes, created_at) VALUES
  (gen_random_uuid(), s5_enforce, s2_liab1, 3333.33, 'Pro-rata SS contribution', now()),
  (gen_random_uuid(), s5_enforce, s2_liab2, 1666.67, 'Pro-rata Housing Levy',    now());

-- Enforcement cost booked via lg_legal_cost (single source of truth).
INSERT INTO lg_legal_cost
  (id, case_id, cost_type, description, incurred_date, amount,
   recovered_amount, is_court_awarded, status, notes, created_at, updated_at)
VALUES
  (s5_cost, s2_case_id, 'ENFORCEMENT_FEE', 'Bailiff / garnishment service fee',
   CURRENT_DATE - 4, 350.00, 0.00, false, 'RECOVERABLE',
   'Recoverable from defendant per consent order clause 8.', now(), now());

INSERT INTO lg_case_activity (id, lg_case_id, activity_type, description, entity_type, entity_id, ts, created_at) VALUES
  (gen_random_uuid(), s2_case_id, 'ENFORCEMENT_REQUESTED', 'Garnishment requested after consent breach.', 'ENFORCEMENT', s5_enforce, now() - interval '5 days', now() - interval '5 days'),
  (gen_random_uuid(), s2_case_id, 'ENFORCEMENT_EXECUTED', 'Partial recovery via garnishment.',           'ENFORCEMENT', s5_enforce, now() - interval '1 day',  now() - interval '1 day');

-- =====================================================================
-- SCENARIO 6 — External counsel engagement + court filing (S1 case)
-- =====================================================================
INSERT INTO lg_external_counsel
  (id, code, law_firm_name, primary_attorney, email, phone,
   practice_areas, is_active, performance_rating, notes,
   created_at, updated_at)
VALUES
  (s6_counsel, 'SEED-CNSL-0001', 'Kelsick, Wilkin & Ferdinand',
   'K. Ferdinand', 'contact@kwf.kn', '+1-869-465-0000',
   ARRAY['ARREARS_RECOVERY','APPEALS'], true, 4.5,
   'Retained for appellate work.', now(), now());

INSERT INTO lg_external_counsel_engagement
  (id, case_id, counsel_id, engaged_at, instructions,
   deliverables, status, fee_estimate, fee_incurred, notes,
   created_at, updated_at)
VALUES
  (s6_engagement, s1_case_id, s6_counsel, CURRENT_DATE - 8,
   'Represent SSB in defendant appeal — Housing Levy quantum.',
   '["Notice of appearance","Response to grounds","Oral argument"]'::jsonb,
   'ACTIVE', 4500.00, 2500.00,
   'Fees to be recovered via lg_legal_cost if awarded.', now(), now());

INSERT INTO lg_court_filing
  (id, case_id, code, filing_type, title, court_id,
   filed_at, deadline, status, notes, created_at, updated_at)
VALUES
  (s6_filing, s1_case_id, 'SEED-FIL-0001', 'RESPONSE_TO_APPEAL',
   'Respondent''s response to notice of appeal', hc_bas_id,
   CURRENT_DATE - 6, CURRENT_DATE + 24, 'FILED',
   'Filed via external counsel (Kelsick, Wilkin & Ferdinand).',
   now() - interval '6 days', now());

INSERT INTO lg_legal_cost
  (id, case_id, cost_type, description, incurred_date, amount,
   recovered_amount, is_court_awarded, linked_filing_id,
   linked_engagement_id, status, notes, created_at, updated_at)
VALUES
  (s6_cost, s1_case_id, 'EXTERNAL_COUNSEL_FEE',
   'External counsel fees — appeal response (partial)',
   CURRENT_DATE - 3, 2500.00, 0.00, false, s6_filing,
   s6_engagement, 'PENDING_AWARD',
   'Recovery contingent on appellate cost award.', now(), now());

INSERT INTO lg_case_activity (id, lg_case_id, activity_type, description, entity_type, entity_id, ts, created_at) VALUES
  (gen_random_uuid(), s1_case_id, 'COUNSEL_ENGAGED', 'External counsel engaged for appeal response.', 'ENGAGEMENT', s6_engagement, now() - interval '8 days', now() - interval '8 days'),
  (gen_random_uuid(), s1_case_id, 'FILING_LODGED',   'Response to appeal filed at High Court.',      'FILING',     s6_filing,     now() - interval '6 days', now() - interval '6 days');

END $$;

COMMIT;

-- =====================================================================
-- POST-SEED SUMMARY (extra scenarios)
-- =====================================================================
SELECT 'Appeals'              AS metric, COUNT(*)::text AS value FROM lg_appeal
UNION ALL SELECT 'Appeal ↔ liability',   COUNT(*)::text FROM lg_appeal_liability
UNION ALL SELECT 'Enforcement actions',   COUNT(*)::text FROM lg_enforcement_action
UNION ALL SELECT 'Enforce ↔ liability',   COUNT(*)::text FROM lg_enforcement_liability
UNION ALL SELECT 'External counsel',      COUNT(*)::text FROM lg_external_counsel
UNION ALL SELECT 'Counsel engagements',   COUNT(*)::text FROM lg_external_counsel_engagement
UNION ALL SELECT 'Court filings',         COUNT(*)::text FROM lg_court_filing
UNION ALL SELECT 'Legal costs',           COUNT(*)::text FROM lg_legal_cost;
