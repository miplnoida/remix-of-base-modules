
CREATE OR REPLACE FUNCTION public.get_c3_payment_history_by_schedule(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period_month INT,
  p_period_year INT,
  p_sequence_no INT
)
RETURNS TABLE(
  payment_id INT,
  payment_date TEXT,
  payment_amount NUMERIC,
  payment_code TEXT,
  mop_code TEXT,
  receipt_number TEXT,
  receipt_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMP;
  v_period_end TIMESTAMP;
  v_next_month INT;
  v_next_year INT;
BEGIN
  v_period_start := (p_period_year || '-' || LPAD(p_period_month::TEXT, 2, '0') || '-01')::TIMESTAMP;
  
  IF p_period_month = 12 THEN
    v_next_month := 1;
    v_next_year := p_period_year + 1;
  ELSE
    v_next_month := p_period_month + 1;
    v_next_year := p_period_year;
  END IF;
  v_period_end := (v_next_year || '-' || LPAD(v_next_month::TEXT, 2, '0') || '-01')::TIMESTAMP;

  RETURN QUERY
  SELECT DISTINCT
    cpc.payment_id,
    cnp.payment_date::TEXT,
    cnp.payment_amount,
    cnp.payment_code,
    cnp.mop_code,
    cr.receipt_number::TEXT,
    cr.status
  FROM c3_payment_components cpc
  JOIN cn_payment_header cph ON cph.payment_id = cpc.payment_id
  JOIN cn_receipt cr ON cr.payment_id = cpc.payment_id
  JOIN cn_payment cnp ON cnp.payment_id = cpc.payment_id
  WHERE cph.payer_id = p_payer_id
    AND cph.payer_type = p_payer_type
    AND COALESCE(cph.status, '') != 'deleted'
    AND cr.status != 'C'
    AND cnp.period >= v_period_start
    AND cnp.period < v_period_end
    AND cnp.payment_code IN ('CON','LVC','LVF','PEC','PEF','SSE','SEF','SSC','SSF','VOC','VOL')
    AND cpc.sequence_no = p_sequence_no;
END;
$$;
