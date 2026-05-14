
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_c3_payment_components_payment_seq 
  ON public.c3_payment_components(payment_id, sequence_no);

-- RPC: get_c3_payment_history_by_schedule
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
  v_period_start TEXT;
  v_period_end TEXT;
  v_next_month INT;
  v_next_year INT;
BEGIN
  -- Build period range
  v_period_start := p_period_year || '-' || LPAD(p_period_month::TEXT, 2, '0') || '-01';
  
  IF p_period_month = 12 THEN
    v_next_month := 1;
    v_next_year := p_period_year + 1;
  ELSE
    v_next_month := p_period_month + 1;
    v_next_year := p_period_year;
  END IF;
  v_period_end := v_next_year || '-' || LPAD(v_next_month::TEXT, 2, '0') || '-01';

  RETURN QUERY
  SELECT DISTINCT
    cp.payment_id,
    cp2.payment_date,
    cp2.payment_amount,
    cp2.payment_code,
    cp2.mop_code,
    cr.receipt_number::TEXT,
    cr.status
  FROM c3_payment_components cpc
  JOIN cn_payment_header cph ON cph.payment_id = cpc.payment_id
  JOIN cn_receipt cr ON cr.payment_id = cpc.payment_id
  JOIN cn_payment cp2 ON cp2.payment_id = cpc.payment_id
  WHERE cph.payer_id = p_payer_id
    AND cph.payer_type = p_payer_type
    AND COALESCE(cph.status, '') != 'deleted'
    AND cr.status != 'C'
    AND cp2.period >= v_period_start
    AND cp2.period < v_period_end
    AND cp2.payment_code IN ('CON','LVC','LVF','PEC','PEF','SSE','SEF','SSC','SSF','VOC','VOL')
    AND cpc.sequence_no = p_sequence_no;
END;
$$;
