
-- ============================================================
-- NWD Support: Add is_for_director to cn_c3_reported & cn_payment_header
-- and update all affected RPCs
-- ============================================================

-- 1. Add columns
ALTER TABLE cn_c3_reported ADD COLUMN IF NOT EXISTS is_for_director BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_director ON cn_c3_reported(is_for_director);

ALTER TABLE cn_payment_header ADD COLUMN IF NOT EXISTS is_for_director BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. Recreate public_api_insert_c3_reported with is_for_director
-- ============================================================
DROP FUNCTION IF EXISTS public.public_api_insert_c3_reported(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS public.public_api_insert_c3_reported(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, INTEGER, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, BOOLEAN);

CREATE OR REPLACE FUNCTION public.public_api_insert_c3_reported(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,
  p_sequence_no INTEGER,
  p_payer_name TEXT DEFAULT NULL,
  p_payer_address TEXT DEFAULT NULL,
  p_number_employed INTEGER DEFAULT NULL,
  p_total_wages NUMERIC DEFAULT NULL,
  p_nil_return BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL,
  p_entered_by TEXT DEFAULT 'API',
  p_received_by TEXT DEFAULT NULL,
  p_date_received TEXT DEFAULT NULL,
  p_emp_ss_amt_calc NUMERIC DEFAULT NULL,
  p_emp_levy_amt_calc NUMERIC DEFAULT NULL,
  p_emp_pe_amt_calc NUMERIC DEFAULT NULL,
  p_emp_ss_fines_due NUMERIC DEFAULT NULL,
  p_emp_levy_penalty_amt NUMERIC DEFAULT NULL,
  p_emp_pe_penalty_amt NUMERIC DEFAULT NULL,
  p_is_for_director BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_period_ts DATE;
  v_date_received TIMESTAMPTZ;
BEGIN
  IF p_payer_id IS NULL OR p_payer_id = '' THEN
    RAISE EXCEPTION 'payer_id is required';
  END IF;
  IF p_payer_type IS NULL OR p_payer_type = '' THEN
    RAISE EXCEPTION 'payer_type is required';
  END IF;
  IF p_period IS NULL OR p_period = '' THEN
    RAISE EXCEPTION 'period is required';
  END IF;
  IF p_sequence_no IS NULL THEN
    RAISE EXCEPTION 'sequence_no is required';
  END IF;

  v_period_ts := p_period::DATE;

  IF p_date_received IS NOT NULL AND p_date_received != '' THEN
    v_date_received := p_date_received::TIMESTAMPTZ;
  ELSE
    v_date_received := NULL;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_payer_id || p_payer_type || p_period));

  IF EXISTS (
    SELECT 1 FROM public.cn_c3_reported
    WHERE payer_id = p_payer_id
      AND payer_type = p_payer_type
      AND period = v_period_ts
      AND sequence_no = p_sequence_no
      AND is_for_director = COALESCE(p_is_for_director, FALSE)
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'This schedule/sequence number has already been submitted for this payer and period.',
      'data', jsonb_build_object(
        'payer_id', p_payer_id,
        'payer_type', p_payer_type,
        'period', v_period_ts::TEXT,
        'sequence_no', p_sequence_no,
        'is_for_director', COALESCE(p_is_for_director, FALSE)
      )
    );
  END IF;

  INSERT INTO public.cn_c3_reported (
    payer_id, payer_type, period, sequence_no, posting_status,
    payer_name, payer_address, number_employed, total_wages, nil_return,
    notes, entered_by, received_by, date_received, date_entered,
    emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc,
    emp_ss_fines_due, emp_levy_penalty_amt, emp_pe_penalty_amt,
    is_for_director
  ) VALUES (
    p_payer_id, p_payer_type, v_period_ts, p_sequence_no, 'DEL',
    p_payer_name, p_payer_address, p_number_employed, p_total_wages, COALESCE(p_nil_return, FALSE),
    p_notes, p_entered_by, p_received_by, v_date_received, NOW(),
    p_emp_ss_amt_calc, p_emp_levy_amt_calc, p_emp_pe_amt_calc,
    p_emp_ss_fines_due, p_emp_levy_penalty_amt, p_emp_pe_penalty_amt,
    COALESCE(p_is_for_director, FALSE)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'C3 reported record created successfully',
    'data', jsonb_build_object(
      'id', v_id,
      'payer_id', p_payer_id,
      'payer_type', p_payer_type,
      'sequence_no', p_sequence_no,
      'period', v_period_ts::TEXT,
      'posting_status', 'DEL',
      'is_for_director', COALESCE(p_is_for_director, FALSE)
    )
  );
END;
$$;

-- ============================================================
-- 3. Recreate public_api_c3_range with is_for_director filter
-- ============================================================
DROP FUNCTION IF EXISTS public.public_api_c3_range(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.public_api_c3_range(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_start_period TEXT,
  p_end_period TEXT,
  p_c3_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_start_month INT;
  v_start_year INT;
  v_end_month INT;
  v_end_year INT;
  v_result JSONB;
  v_is_nwd BOOLEAN;
BEGIN
  IF length(p_start_period) = 6 AND p_start_period ~ '^\d{6}$' THEN
    v_start_month := substring(p_start_period, 1, 2)::INT;
    v_start_year := substring(p_start_period, 3, 4)::INT;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid startDate format. Expected MMYYYY (e.g., 012025)');
  END IF;

  IF length(p_end_period) = 6 AND p_end_period ~ '^\d{6}$' THEN
    v_end_month := substring(p_end_period, 1, 2)::INT;
    v_end_year := substring(p_end_period, 3, 4)::INT;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid endDate format. Expected MMYYYY (e.g., 122025)');
  END IF;

  v_start_date := make_date(v_start_year, v_start_month, 1);
  v_end_date := (make_date(v_end_year, v_end_month, 1) + interval '1 month' - interval '1 day')::DATE;

  -- Determine NWD filter based on c3_type
  v_is_nwd := (UPPER(p_c3_type) = 'NW');

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', EXTRACT(MONTH FROM r.period)::INT,
      'year', EXTRACT(YEAR FROM r.period)::INT,
      'seqNo', r.sequence_no,
      'payerType', TRIM(r.payer_type),
      'c3Type', CASE WHEN TRIM(r.payer_type) = 'SE' THEN 'EE' ELSE p_c3_type END,
      'isForDirector', r.is_for_director
    ) ORDER BY r.period, r.sequence_no
  ), '[]'::jsonb)
  INTO v_result
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.posting_status = 'VAC'
    AND r.period >= v_start_date
    AND r.period <= v_end_date
    AND r.is_for_director = v_is_nwd;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 4. Recreate public_api_c3_detail with is_for_director filter
-- ============================================================
DROP FUNCTION IF EXISTS public.public_api_c3_detail(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.public_api_c3_detail(
  p_payer_id TEXT,
  p_month TEXT,
  p_year TEXT,
  p_sequence_no TEXT,
  p_payer_type TEXT,
  p_c3_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE;
  v_period_end DATE;
  v_record RECORD;
  v_wages JSONB;
  v_result JSONB;
  v_total_ip_ss NUMERIC := 0;
  v_total_er_ss NUMERIC := 0;
  v_total_ip_levy NUMERIC := 0;
  v_total_er_levy NUMERIC := 0;
  v_total_ip_pe NUMERIC := 0;
  v_total_er_pe NUMERIC := 0;
  v_is_nwd BOOLEAN;
BEGIN
  v_period := make_date(p_year::INT, p_month::INT, 1);
  v_period_end := (v_period + interval '1 month')::DATE;
  v_is_nwd := (UPPER(p_c3_type) = 'NW');

  SELECT * INTO v_record
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.period >= v_period
    AND r.period < v_period_end
    AND r.sequence_no = p_sequence_no::INT
    AND r.posting_status = 'VAC'
    AND r.is_for_director = v_is_nwd;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'C3 not found', 'code', 'NOT_FOUND');
  END IF;

  -- Pre-aggregate contribution totals from ip_wages
  SELECT
    COALESCE(SUM(w.ip_ss_amt), 0),
    COALESCE(SUM(w.er_ss_amt), 0),
    COALESCE(SUM(w.ip_levy_amt), 0),
    COALESCE(SUM(w.er_levy_amt), 0),
    COALESCE(SUM(w.ip_pe_amt), 0),
    COALESCE(SUM(w.er_ei_amt), 0)
  INTO v_total_ip_ss, v_total_er_ss, v_total_ip_levy, v_total_er_levy, v_total_ip_pe, v_total_er_pe
  FROM ip_wages w
  WHERE TRIM(w.payer_id) = TRIM(p_payer_id)
    AND TRIM(w.payer_type) = TRIM(p_payer_type)
    AND w.period >= v_period
    AND w.period < v_period_end
    AND w.sequence_no = p_sequence_no::INT
    AND w.posting_status = 'VAC';

  -- Fallback: if all wage-level aggregates are zero, use header-level calculated fields
  IF v_total_ip_ss = 0 AND v_total_er_ss = 0 AND v_total_ip_levy = 0
     AND v_total_er_levy = 0 AND v_total_ip_pe = 0 AND v_total_er_pe = 0 THEN
    v_total_ip_ss := COALESCE(v_record.emp_ss_amt_calc, 0);
    v_total_ip_levy := COALESCE(v_record.emp_levy_amt_calc, 0);
    v_total_ip_pe := COALESCE(v_record.emp_pe_amt_calc, 0);
  END IF;

  -- Build wages array
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ssn', TRIM(w.ssn),
      'firstName', COALESCE(
        (SELECT TRIM(m.firstname) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        SPLIT_PART(COALESCE(w.employee_name, ''), ' ', 1)
      ),
      'surName', COALESCE(
        (SELECT TRIM(m.surname) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        CASE WHEN POSITION(' ' IN COALESCE(w.employee_name, '')) > 0
             THEN SUBSTRING(w.employee_name FROM POSITION(' ' IN w.employee_name) + 1)
             ELSE '' END
      ),
      'birthDate', COALESCE(
        (SELECT TO_CHAR(m.dob, 'YYYY-MM-DD') FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        ''
      ),
      'payPeriod', COALESCE(w.pay_period, 'M'),
      'paidCode1', COALESCE(w.paid_code1, '0'),
      'paidCode2', COALESCE(w.paid_code2, '0'),
      'paidCode3', COALESCE(w.paid_code3, '0'),
      'paidCode4', COALESCE(w.paid_code4, '0'),
      'paidCode5', COALESCE(w.paid_code5, '0'),
      'paidCode6', COALESCE(w.paid_code6, '0'),
      'paidCode7', COALESCE(w.paid_code7, '0'),
      'wagesPaid1', COALESCE(w.wages_paid1, 0),
      'wagesPaid2', COALESCE(w.wages_paid2, 0),
      'wagesPaid3', COALESCE(w.wages_paid3, 0),
      'wagesPaid4', COALESCE(w.wages_paid4, 0),
      'wagesPaid5', COALESCE(w.wages_paid5, 0),
      'wagesPaid6', COALESCE(w.wages_paid6, 0),
      'wagesPaid7', COALESCE(w.wages_paid7, 0),
      'ipSsAmt', COALESCE(w.ip_ss_amt, 0),
      'erSsAmt', COALESCE(w.er_ss_amt, 0),
      'ipLevyAmt', COALESCE(w.ip_levy_amt, 0),
      'erLevyAmt', COALESCE(w.er_levy_amt, 0),
      'ipPeAmt', COALESCE(w.ip_pe_amt, 0),
      'erEiAmt', COALESCE(w.er_ei_amt, 0),
      'startDate', COALESCE(TO_CHAR(w.date_entered, 'YYYY-MM-DD'), ''),
      'endDate', COALESCE(TO_CHAR(w.date_verified, 'YYYY-MM-DD'), ''),
      'wageType', NULL
    ) ORDER BY w.input_seq_no, w.ssn
  ), '[]'::jsonb)
  INTO v_wages
  FROM ip_wages w
  WHERE TRIM(w.payer_id) = TRIM(p_payer_id)
    AND TRIM(w.payer_type) = TRIM(p_payer_type)
    AND w.period >= v_period
    AND w.period < v_period_end
    AND w.sequence_no = p_sequence_no::INT
    AND w.posting_status = 'VAC';

  v_result := jsonb_build_object(
    'c3Header', jsonb_build_object(
      'c3Status', 'S',
      'numberEmployed', COALESCE(v_record.number_employed, 0),
      'calcEmpSsAmt', COALESCE(v_record.emp_ss_amt_calc, 0),
      'calcEmpLevyAmt', COALESCE(v_record.emp_levy_amt_calc, 0),
      'calcEmpPeAmt', COALESCE(v_record.emp_pe_amt_calc, 0),
      'totalEmpSsFines', COALESCE(v_record.emp_ss_fines_due, 0),
      'totalEmpLevyPenalty', COALESCE(v_record.emp_levy_penalty_amt, 0),
      'totalEmpPePenalty', COALESCE(v_record.emp_pe_penalty_amt, 0),
      'totalEmpSsContributions', v_total_ip_ss,
      'totalErSsContributions', v_total_er_ss,
      'totalEmpLevyContributions', v_total_ip_levy,
      'totalErLevyContributions', v_total_er_levy,
      'totalEmpPeContributions', v_total_ip_pe,
      'totalErPeContributions', v_total_er_pe,
      'dateReceived', COALESCE(TO_CHAR(v_record.date_received, 'YYYY-MM-DD'), ''),
      'receivedBy', COALESCE(TRIM(v_record.received_by), 'SYSTEM'),
      'submittedByName', COALESCE(TRIM(v_record.entered_by), ''),
      'submittedByEmail', '',
      'nilReturn', CASE WHEN v_record.nil_return THEN 1 ELSE 0 END,
      'isForDirector', v_record.is_for_director
    ),
    'ipWages', v_wages
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 5. Recreate public_api_c3_last_submitted with is_for_director filter
-- ============================================================
DROP FUNCTION IF EXISTS public.public_api_c3_last_submitted(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.public_api_c3_last_submitted(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_sequence_no TEXT,
  p_c3_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_is_nwd BOOLEAN;
BEGIN
  v_is_nwd := (UPPER(p_c3_type) = 'NW');

  SELECT * INTO v_record
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.sequence_no = p_sequence_no::INT
    AND r.posting_status = 'VAC'
    AND r.is_for_director = v_is_nwd
  ORDER BY r.period DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No submitted C3 found', 'code', 'NOT_FOUND');
  END IF;

  RETURN public_api_c3_detail(
    p_payer_id,
    EXTRACT(MONTH FROM v_record.period)::TEXT,
    EXTRACT(YEAR FROM v_record.period)::TEXT,
    p_sequence_no,
    p_payer_type,
    p_c3_type
  );
END;
$$;

-- ============================================================
-- 6. Recreate get_c3_component_balances with NWD support
-- ============================================================
DROP FUNCTION IF EXISTS public.get_c3_component_balances(TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_c3_component_balances(TEXT, TEXT, TEXT, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_c3_component_balances(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,
  p_sequence_no INTEGER,
  p_is_for_director BOOLEAN DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
  v_components JSONB := '[]'::JSONB;
  v_paid_map JSONB := '{}'::JSONB;
  v_result JSONB := '[]'::JSONB;
  v_comp JSONB;
  v_code TEXT;
  v_original NUMERIC;
  v_paid NUMERIC;
  v_balance NUMERIC;
  v_codes TEXT[];
BEGIN
  SELECT
    emp_ss_amt_calc,
    emp_levy_amt_calc,
    emp_pe_amt_calc,
    emp_ss_fines_due,
    emp_levy_penalty_amt,
    emp_pe_penalty_amt
  INTO v_record
  FROM cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND period = p_period::timestamp
    AND sequence_no = p_sequence_no
    AND is_for_director = COALESCE(p_is_for_director, FALSE)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'components', '[]'::jsonb);
  END IF;

  -- Build original components based on payer_type and NWD flag
  IF COALESCE(p_is_for_director, FALSE) THEN
    -- NWD: Only Levy (LVC) and Levy Fines (LVF)
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0))
    );
    v_codes := ARRAY['LVC','LVF'];
  ELSIF p_payer_type = 'ER' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'original_amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'original_amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
    v_codes := ARRAY['SSC','LVC','PEC','SSF','LVF','PEF'];
  ELSIF p_payer_type = 'SE' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SEF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'SSE', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
    v_codes := ARRAY['SEF','SSE'];
  ELSIF p_payer_type = 'VC' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'VOC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
    v_codes := ARRAY['VOC'];
  ELSE
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'original_amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'original_amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
    v_codes := ARRAY['SSC','LVC','PEC','SSF','LVF','PEF'];
  END IF;

  -- Aggregate already-paid amounts per payment_code
  SELECT COALESCE(jsonb_object_agg(sub.payment_code, sub.total_paid), '{}'::jsonb)
  INTO v_paid_map
  FROM (
    SELECT cp.payment_code, SUM(COALESCE(cp.payment_amount, 0)) AS total_paid
    FROM cn_payment cp
    INNER JOIN cn_payment_header h ON h.payment_id = cp.payment_id
    INNER JOIN cn_receipt r ON r.payment_id = cp.payment_id
    WHERE h.payer_id = p_payer_id
      AND h.payer_type = p_payer_type
      AND h.status IS DISTINCT FROM 'deleted'
      AND r.status != 'C'
      AND cp.period = p_period::timestamp
      AND cp.payment_code = ANY(v_codes)
    GROUP BY cp.payment_code
  ) sub;

  FOR v_comp IN SELECT * FROM jsonb_array_elements(v_components)
  LOOP
    v_code := v_comp->>'payment_code';
    v_original := (v_comp->>'original_amount')::numeric;
    v_paid := COALESCE((v_paid_map->>v_code)::numeric, 0);
    v_balance := GREATEST(v_original - v_paid, 0);

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'payment_code', v_code,
        'original_amount', v_original,
        'paid_amount', v_paid,
        'balance_amount', v_balance,
        'fully_paid', (v_balance <= 0)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'found',
    'components', v_result,
    'sequence_no', p_sequence_no
  );
END;
$function$;

-- ============================================================
-- 7. Recreate public_api_payment_save with isForDirector support
-- ============================================================
DROP FUNCTION IF EXISTS public.public_api_payment_save(jsonb);

CREATE OR REPLACE FUNCTION public.public_api_payment_save(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payer_id TEXT;
  v_payer_type TEXT;
  v_period_month INT;
  v_period_year INT;
  v_schedule_number INT;
  v_payment_id BIGINT;
  v_receipt_number TEXT;
  v_receipt_id INTEGER;
  v_mop_code TEXT;
  v_office_code TEXT;
  v_headers JSONB;
  v_header JSONB;
  v_total NUMERIC := 0;
  v_line_count INT := 0;
  v_period_date DATE;
  v_comp_period TEXT;
  v_sort_idx INT := 0;
  v_seq_no BIGINT;
  v_payment_reference_id TEXT;
  v_is_for_director BOOLEAN;
BEGIN
  v_payer_id := TRIM(p_payload->>'payerId');
  v_payer_type := TRIM(p_payload->>'payerType');

  IF v_payer_id IS NULL OR v_payer_id = '' THEN
    RETURN jsonb_build_object('error', 'payerId is required in request body');
  END IF;

  IF v_payer_type IS NULL OR v_payer_type = '' THEN
    RETURN jsonb_build_object('error', 'payerType is required in request body');
  END IF;

  v_period_month := (p_payload->>'periodMonth')::INT;
  IF v_period_month IS NULL OR v_period_month < 1 OR v_period_month > 12 THEN
    RETURN jsonb_build_object('error', 'periodMonth must be an integer between 1 and 12');
  END IF;

  v_period_year := (p_payload->>'periodYear')::INT;
  IF v_period_year IS NULL OR v_period_year < 1900 OR v_period_year > 9999 THEN
    RETURN jsonb_build_object('error', 'periodYear must be a valid 4-digit year');
  END IF;

  v_schedule_number := (p_payload->>'scheduleNumber')::INT;

  v_period_date := make_date(v_period_year, v_period_month, 1);
  v_comp_period := LPAD(v_period_month::TEXT, 2, '0') || '/' || v_period_year::TEXT;

  v_mop_code := COALESCE(TRIM(p_payload->>'mopCode'), 'ONL');
  v_office_code := COALESCE(TRIM(p_payload->>'officeCode'), '100');
  v_payment_reference_id := TRIM(p_payload->>'paymentReferenceId');
  v_is_for_director := COALESCE((p_payload->>'isForDirector')::BOOLEAN, FALSE);
  v_headers := p_payload->'paymentHeaders';

  IF v_headers IS NULL OR jsonb_array_length(v_headers) = 0 THEN
    RETURN jsonb_build_object('error', 'paymentHeaders array is required');
  END IF;

  PERFORM pg_advisory_xact_lock(7839202);

  SELECT COALESCE(MAX(payment_id), 0) + 1 INTO v_payment_id FROM cn_payment_header;

  INSERT INTO cn_payment_header (payment_id, payer_id, payer_type, batch_number, date_received, status, payment_reference_id, is_for_director)
  VALUES (v_payment_id, v_payer_id, v_payer_type, v_office_code || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), NOW(), 'P', v_payment_reference_id, v_is_for_director);

  FOR v_header IN SELECT * FROM jsonb_array_elements(v_headers)
  LOOP
    v_sort_idx := v_sort_idx + 1;
    v_line_count := v_line_count + 1;

    INSERT INTO cn_payment (
      payment_id,
      payment_amount,
      payment_code,
      mop_code,
      period,
      fund_code,
      base_currency,
      currency_conversion_rate
    ) VALUES (
      v_payment_id,
      COALESCE((v_header->>'paymentAmount')::NUMERIC, 0),
      COALESCE(v_header->>'paymentCode', 'ONL'),
      v_mop_code,
      v_period_date,
      COALESCE(v_header->>'fundCode', 'GEN'),
      'XCD',
      1.0
    ) RETURNING payment_sequence_no INTO v_seq_no;

    v_total := v_total + COALESCE((v_header->>'paymentAmount')::NUMERIC, 0);

    INSERT INTO c3_payment_components (
      payment_id,
      payment_code,
      fund_code,
      component_amount,
      period,
      sequence_no,
      sort_order
    ) VALUES (
      v_payment_id,
      COALESCE(v_header->>'paymentCode', 'ONL'),
      COALESCE(v_header->>'fundCode', 'GEN'),
      COALESCE((v_header->>'paymentAmount')::NUMERIC, 0),
      v_comp_period,
      v_schedule_number,
      v_sort_idx
    );
  END LOOP;

  INSERT INTO cn_receipt (payment_id, receipt_total, status, total_number_of_payments)
  VALUES (v_payment_id, v_total, 'A', v_line_count)
  RETURNING receipt_id INTO v_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'total', v_total,
    'line_count', v_line_count,
    'payment_reference_id', v_payment_reference_id,
    'is_for_director', v_is_for_director
  );
END;
$function$;
