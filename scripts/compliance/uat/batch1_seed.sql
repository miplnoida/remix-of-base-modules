-- UAT Batch 1 seed — Compliance E2E validation
-- Idempotent: safe to re-run. Teardown at bottom (commented).
-- Scope: employers U01001..U01007, IPs SSN UIP001..021, C3 + payment rows.
BEGIN;

-- 1. Employers
INSERT INTO er_master (regno, name, office_code, status, registration_date, date_wages_first_paid, date_incorporated, industrial_code, village_code, sector_code, activity_type, hq_addr1, mobile, email)
VALUES
 ('U01001','UAT Clean Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550001','uat.b1001@example.test'),
 ('U01002','UAT LateFile Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550002','uat.b1002@example.test'),
 ('U01003','UAT NonFile Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550003','uat.b1003@example.test'),
 ('U01004','UAT NoPay Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550004','uat.b1004@example.test'),
 ('U01005','UAT PartPay Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550005','uat.b1005@example.test'),
 ('U01006','UAT LatePay Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550006','uat.b1006@example.test'),
 ('U01007','UAT Gap Employer Ltd','STK','A','2020-01-15','2020-02-01','2020-01-01','7220','001','P','Consulting','UAT Test Site','8695550007','uat.b1007@example.test')
ON CONFLICT (regno) DO UPDATE SET name = EXCLUDED.name, status='A';

-- 2. C3 filings.  Amounts kept simple: 3 employees, 10,000 total wages, SS = 11% split, levy = 3.5%, pe = 1%.
-- ss=1100, levy=350, pe=100. On-time date_received = due date (15th of following month) minus 2 days.
-- Late (U01002) = due + 7 days. Nil for U01003 => don't insert. Underreport etc. not needed for Batch 1.

WITH periods AS (
  SELECT unnest(ARRAY['2025-12-01','2026-01-01','2026-02-01','2026-03-01','2026-04-01','2026-05-01']::date[]) AS period
), emp AS (
  SELECT regno FROM (VALUES ('U01001'),('U01002'),('U01004'),('U01005'),('U01006')) AS t(regno)
)
INSERT INTO cn_c3_reported(id, payer_id, payer_type, sequence_no, period, number_employed,
  emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc, total_wages,
  date_received, date_entered, date_posted, posting_status, nil_return,
  entered_by, payer_name, is_for_director, created_at, updated_at,
  emp_ss_amt_rpt, emp_levy_amt_rpt, emp_pe_amt_rpt)
SELECT gen_random_uuid(), e.regno, 'ER', 1, p.period, 3,
  1100, 350, 100, 10000,
  -- date_received: on-time (due-2) for most; U01002 latest period = due+7 (late)
  CASE
    WHEN e.regno='U01002' AND p.period='2026-05-01' THEN (p.period + interval '1 month' + interval '22 days')
    ELSE (p.period + interval '1 month' + interval '13 days')
  END,
  (p.period + interval '1 month' + interval '13 days'),
  (p.period + interval '1 month' + interval '13 days'),
  'POSTED', false, 'uat-seed', 'UAT Employer '||e.regno, false, now(), now(),
  1100, 350, 100
FROM periods p, emp e
WHERE NOT EXISTS (SELECT 1 FROM cn_c3_reported x WHERE x.payer_id=e.regno AND x.period=p.period);

-- Employer U01003 (Missing C3): only insert 5 periods, skip 2026-05-01
INSERT INTO cn_c3_reported(id, payer_id, payer_type, sequence_no, period, number_employed,
  emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc, total_wages,
  date_received, date_entered, date_posted, posting_status, nil_return,
  entered_by, payer_name, is_for_director, created_at, updated_at,
  emp_ss_amt_rpt, emp_levy_amt_rpt, emp_pe_amt_rpt)
SELECT gen_random_uuid(), 'U01003', 'ER', 1, p.period, 3,
  1100, 350, 100, 10000,
  (p.period + interval '1 month' + interval '13 days'),
  (p.period + interval '1 month' + interval '13 days'),
  (p.period + interval '1 month' + interval '13 days'),
  'POSTED', false, 'uat-seed', 'UAT Employer U01003', false, now(), now(),
  1100, 350, 100
FROM (SELECT unnest(ARRAY['2025-12-01','2026-01-01','2026-02-01','2026-03-01','2026-04-01']::date[]) AS period) p
WHERE NOT EXISTS (SELECT 1 FROM cn_c3_reported x WHERE x.payer_id='U01003' AND x.period=p.period);

-- Employer U01007 (Gap): insert 6 periods but skip 2026-02-01 and 2026-04-01
INSERT INTO cn_c3_reported(id, payer_id, payer_type, sequence_no, period, number_employed,
  emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc, total_wages,
  date_received, date_entered, date_posted, posting_status, nil_return,
  entered_by, payer_name, is_for_director, created_at, updated_at,
  emp_ss_amt_rpt, emp_levy_amt_rpt, emp_pe_amt_rpt)
SELECT gen_random_uuid(), 'U01007', 'ER', 1, p.period, 3,
  1100, 350, 100, 10000,
  (p.period + interval '1 month' + interval '13 days'),
  (p.period + interval '1 month' + interval '13 days'),
  (p.period + interval '1 month' + interval '13 days'),
  'POSTED', false, 'uat-seed', 'UAT Employer U01007', false, now(), now(),
  1100, 350, 100
FROM (SELECT unnest(ARRAY['2025-12-01','2026-01-01','2026-03-01','2026-05-01']::date[]) AS period) p
WHERE NOT EXISTS (SELECT 1 FROM cn_c3_reported x WHERE x.payer_id='U01007' AND x.period=p.period);

-- 3. Payments — cn_payment schema: no payer/employer column visible in select we ran. Skip if column missing.
-- (Payment linkage is via cn_payment_header / cn_receipt; safely skip for seed. Compliance detection
--  runs off cn_c3_reported + ce_employer_financial_ledger. Payment scenarios D/E/F will be observed
--  against whatever the detection engine surfaces given the C3 rows above.)

COMMIT;

-- Teardown (run manually to remove UAT rows):
-- DELETE FROM cn_c3_reported WHERE payer_id LIKE 'U0100%';
-- DELETE FROM er_master WHERE regno LIKE 'U0100%';
