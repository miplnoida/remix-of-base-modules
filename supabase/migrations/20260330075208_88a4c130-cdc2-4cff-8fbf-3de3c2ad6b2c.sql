
-- =====================================================
-- Employee Sync APIs: 2 RPC Functions + 1 Index
-- =====================================================

-- Index for fast employer latest C3 lookup
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_employer_latest 
  ON cn_c3_reported(payer_id, payer_type, posting_status, period DESC);

-- =====================================================
-- RPC: Employees by Last C3
-- Finds the latest VAC C3 for an employer (payer_type='ER', EE wages)
-- and returns all employees from that C3's ip_wages records
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_employees_by_last_c3(p_registration_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c3_id INTEGER;
  v_result JSONB;
BEGIN
  -- Find the latest VAC C3 for this employer (EE type)
  SELECT id INTO v_c3_id
  FROM cn_c3_reported
  WHERE payer_id = p_registration_number
    AND payer_type = 'ER'
    AND posting_status = 'VAC'
  ORDER BY period DESC
  LIMIT 1;

  IF v_c3_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Get all employees from the wages of that C3
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'socialSecurityNumber', w.ssn,
      'firstName', COALESCE(m.first_name, ''),
      'surName', COALESCE(m.last_name, ''),
      'middleName', COALESCE(m.middle_name, ''),
      'birthDate', CASE WHEN m.date_of_birth IS NOT NULL THEN to_char(m.date_of_birth, 'YYYY-MM-DD') ELSE NULL END,
      'payPeriod', COALESCE(pp.description, w.pay_period, ''),
      'startDate', NULL,
      'endDate', NULL
    )
  ), '[]'::JSONB) INTO v_result
  FROM ip_wages w
  LEFT JOIN ip_master m ON m.ssn = w.ssn
  LEFT JOIN tb_pay_periods pp ON pp.code = w.pay_period
  WHERE w.c3_id = v_c3_id
    AND w.payer_type = 'ER';

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC: NW Directors by Last C3
-- Finds the latest VAC C3 for an employer with NW director wages
-- and returns all NW directors from that C3
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_nwdirectors_by_last_c3(p_registration_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c3_id INTEGER;
  v_result JSONB;
BEGIN
  -- Find the latest VAC C3 that has NW-type wages for this employer
  SELECT c.id INTO v_c3_id
  FROM cn_c3_reported c
  WHERE c.payer_id = p_registration_number
    AND c.payer_type = 'ER'
    AND c.posting_status = 'VAC'
  ORDER BY c.period DESC
  LIMIT 1;

  IF v_c3_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  -- Get NW director records from the wages of that C3
  -- NW wages are identified by payer_type = 'NW' in ip_wages or 
  -- we look for wages under the same C3 where payer_type might differ
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'socialSecurityNumber', w.ssn,
      'firstName', COALESCE(m.first_name, ''),
      'surName', COALESCE(m.last_name, ''),
      'middleName', COALESCE(m.middle_name, ''),
      'birthDate', CASE WHEN m.date_of_birth IS NOT NULL THEN to_char(m.date_of_birth, 'YYYY-MM-DD') ELSE NULL END,
      'wages', COALESCE(w.wages_paid1, 0) + COALESCE(w.wages_paid2, 0) + COALESCE(w.wages_paid3, 0) + COALESCE(w.wages_paid4, 0) + COALESCE(w.wages_paid5, 0) + COALESCE(w.wages_paid6, 0) + COALESCE(w.wages_paid7, 0),
      'levyAmt', COALESCE(w.ip_levy_amt, 0) + COALESCE(w.er_levy_amt, 0),
      'startDate', NULL,
      'endDate', NULL
    )
  ), '[]'::JSONB) INTO v_result
  FROM ip_wages w
  LEFT JOIN ip_master m ON m.ssn = w.ssn
  WHERE w.c3_id = v_c3_id
    AND w.payer_type = 'NW';

  RETURN v_result;
END;
$$;
