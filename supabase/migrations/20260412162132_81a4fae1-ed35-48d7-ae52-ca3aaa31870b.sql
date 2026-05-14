-- Must drop and recreate since column order changed
DROP VIEW IF EXISTS ce_v_arrangement_health;

CREATE VIEW ce_v_arrangement_health AS
SELECT 
    pa.id AS arrangement_id,
    pa.employer_id,
    regexp_replace(pa.employer_id::text, '^EMP-', '') AS regno,
    pa.employer_name,
    pa.status,
    pa.total_debt,
    pa.total_paid,
    pa.installments_paid,
    pa.missed_payments,
    pa.max_missed_before_breach,
    pa.breach_detected,
    pa.next_due_date,
    COALESCE(ub.unresolved_breach_count, 0::bigint) AS unresolved_breach_count,
    CASE
        WHEN pa.status::text = 'Breached' THEN 'BREACHED'
        WHEN pa.breach_detected = true THEN 'AT_RISK'
        WHEN pa.missed_payments >= COALESCE(pa.max_missed_before_breach, 3) THEN 'AT_RISK'
        WHEN pa.missed_payments > 0 THEN 'WARNING'
        WHEN pa.status::text = 'Active' THEN 'HEALTHY'
        ELSE 'INACTIVE'
    END AS health_status
FROM ce_payment_arrangements pa
LEFT JOIN (
    SELECT arrangement_id, count(*) AS unresolved_breach_count
    FROM ce_arrangement_breaches
    WHERE resolved_at IS NULL
    GROUP BY arrangement_id
) ub ON ub.arrangement_id = pa.id;

-- Fix arrears view
DROP VIEW IF EXISTS ce_v_employer_arrears_summary;

CREATE VIEW ce_v_employer_arrears_summary AS
WITH c3_dues AS (
    SELECT 
        c.payer_id AS regno,
        COALESCE(SUM(COALESCE(c.emp_ss_amt_calc, c.emp_ss_amt_rpt, 0) + 
                     COALESCE(c.emp_pe_amt_calc, c.emp_pe_amt_rpt, 0) + 
                     COALESCE(c.emp_levy_amt_calc, c.emp_levy_amt_rpt, 0)), 0) AS total_dues,
        COALESCE(SUM(COALESCE(c.emp_ss_fines_due, 0) + 
                     COALESCE(c.emp_pe_penalty_amt, 0) + 
                     COALESCE(c.emp_levy_penalty_amt, 0)), 0) AS total_penalties
    FROM cn_c3_reported c
    GROUP BY c.payer_id
),
payments AS (
    SELECT 
        ph.payer_id AS regno,
        COALESCE(SUM(p.payment_amount), 0) AS total_paid
    FROM cn_payment p
    JOIN cn_payment_header ph ON ph.payment_id = p.payment_id
    GROUP BY ph.payer_id
)
SELECT 
    e.regno,
    e.name AS employer_name,
    GREATEST(COALESCE(d.total_dues, 0) - COALESCE(p.total_paid, 0), 0) AS current_arrears,
    COALESCE(d.total_penalties, 0) AS current_penalty,
    GREATEST(COALESCE(d.total_dues, 0) - COALESCE(p.total_paid, 0), 0) + COALESCE(d.total_penalties, 0) AS total_outstanding,
    CASE WHEN COALESCE(d.total_dues, 0) - COALESCE(p.total_paid, 0) > 0 THEN true ELSE false END AS has_arrears
FROM er_master e
LEFT JOIN c3_dues d ON d.regno = e.regno::text
LEFT JOIN payments p ON p.regno = e.regno::text
WHERE e.status = ANY (ARRAY['A'::bpchar, 'V'::bpchar, 'I'::bpchar, 'D'::bpchar]);