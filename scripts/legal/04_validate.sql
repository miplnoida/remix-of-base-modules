-- =====================================================================
-- LEGAL SEED VALIDATION — read-only checks
-- =====================================================================
-- Run after 03_uat_seed.sql. Every result set should return 0 rows
-- unless labelled otherwise.

-- 1. Orphan cases (no party)
SELECT c.lg_case_no
FROM lg_case c
LEFT JOIN lg_case_party p ON p.lg_case_id = c.id
WHERE p.id IS NULL;

-- 2. Orphan cases (no liability) — allowed for advisory matters only
SELECT c.lg_case_no
FROM lg_case c
LEFT JOIN lg_recoverable_liability l ON l.lg_case_id = c.id
WHERE l.id IS NULL
  AND c.case_type_code <> 'ADVISORY';

-- 3. Liabilities missing fund/liability type
SELECT id FROM lg_recoverable_liability
WHERE liability_type IS NULL OR fund_type IS NULL;

-- 4. Contribution liabilities missing period
SELECT id FROM lg_recoverable_liability
WHERE liability_type = 'CONTRIBUTION'
  AND (contribution_period_from IS NULL OR contribution_period_to IS NULL);

-- 5. Orphan hearings / orders / settlements
SELECT id FROM lg_hearing     WHERE lg_case_id NOT IN (SELECT id FROM lg_case);
SELECT id FROM lg_order       WHERE lg_case_id NOT IN (SELECT id FROM lg_case);
SELECT id FROM lg_settlement  WHERE lg_case_id NOT IN (SELECT id FROM lg_case);

-- 6. Payments must reconcile with paid column
SELECT l.id,
       l.paid                                  AS liability_paid,
       COALESCE(SUM(a.allocated_amount), 0)    AS allocated_sum
FROM lg_recoverable_liability l
LEFT JOIN lg_payment_allocation a ON a.liability_id = l.id
GROUP BY l.id, l.paid
HAVING ROUND(l.paid, 2) <> ROUND(COALESCE(SUM(a.allocated_amount), 0), 2);

-- 7. Outstanding = total_assessed - paid
SELECT id, total_assessed, paid, outstanding
FROM lg_recoverable_liability
WHERE ROUND(outstanding, 2) <> ROUND(total_assessed - paid, 2);

-- 8. v_lg_case_financials rollup matches case snapshot
SELECT c.lg_case_no,
       c.total_outstanding                     AS case_snapshot,
       v.total_outstanding                     AS view_outstanding
FROM lg_case c
JOIN v_lg_case_financials v ON v.lg_case_id = c.id
WHERE ROUND(c.total_outstanding, 2) <> ROUND(v.total_outstanding, 2);

-- 9. Rollup summary (informational)
SELECT c.lg_case_no,
       v.liability_count,
       v.total_assessed,
       v.total_paid,
       v.total_outstanding
FROM lg_case c
JOIN v_lg_case_financials v ON v.lg_case_id = c.id
ORDER BY c.lg_case_no;
