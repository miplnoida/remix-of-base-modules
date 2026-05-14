CREATE OR REPLACE FUNCTION public.get_batch_cheques_for_verification(p_batch_number text)
 RETURNS TABLE(cheque_number text, bank_code text, bank_name text, amount numeric, currency_code text, cheque_date text, payer_id text, payer_type text, source_table text, source_record_id text, payment_id bigint, is_verified boolean, override_cheque_number text, override_bank_code text, override_amount numeric, override_cheque_date text, edit_reason text, verification_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY

  -- cn_payment cheques (only from active, non-cancelled receipts)
  SELECT
    cp.cheque_number::TEXT AS cheque_number,
    cp.bank_code::TEXT AS bank_code,
    tb.name::TEXT AS bank_name,
    cp.payment_amount AS amount,
    COALESCE(cp.currency_code, cp.base_currency, 'XCD')::TEXT AS currency_code,
    CASE WHEN cp.cheque_date IS NOT NULL THEN to_char(cp.cheque_date, 'YYYY-MM-DD') ELSE NULL END AS cheque_date,
    ch.payer_id::TEXT AS payer_id,
    ch.payer_type::TEXT AS payer_type,
    'cn_payment'::TEXT AS source_table,
    cp.payment_sequence_no::TEXT AS source_record_id,
    cp.payment_id AS payment_id,
    COALESCE(v.is_verified, false) AS is_verified,
    v.override_cheque_number::TEXT,
    v.override_bank_code::TEXT,
    v.override_amount,
    CASE WHEN v.override_cheque_date IS NOT NULL THEN to_char(v.override_cheque_date, 'YYYY-MM-DD') ELSE NULL END AS override_cheque_date,
    v.edit_reason::TEXT,
    v.id::TEXT AS verification_id
  FROM public.cn_payment cp
  JOIN public.cn_payment_header ch ON cp.payment_id = ch.payment_id
  JOIN public.cn_receipt r ON r.payment_id = ch.payment_id AND r.status != 'C'
  LEFT JOIN public.cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = 'cn_payment'
    AND v.source_record_id = cp.payment_sequence_no::TEXT
  LEFT JOIN public.tb_bank_code tb ON cp.bank_code = tb.bank_code
  WHERE ch.batch_number = p_batch_number
    AND cp.mop_code = 'CHQ'
    AND COALESCE(ch.status, 'active') != 'cancelled'

  UNION ALL

  -- c3_payment_methods cheques (only from active, non-cancelled receipts)
  SELECT
    cpm.mop_number::TEXT AS cheque_number,
    cpm.bank_code::TEXT AS bank_code,
    tb.name::TEXT AS bank_name,
    cpm.original_amount AS amount,
    COALESCE(cpm.currency_code, cpm.base_currency, 'XCD')::TEXT AS currency_code,
    CASE WHEN cpm.cheque_date IS NOT NULL THEN cpm.cheque_date::TEXT ELSE NULL END AS cheque_date,
    ch.payer_id::TEXT AS payer_id,
    ch.payer_type::TEXT AS payer_type,
    'c3_payment_methods'::TEXT AS source_table,
    cpm.id::TEXT AS source_record_id,
    cpm.payment_id::BIGINT AS payment_id,
    COALESCE(v.is_verified, false) AS is_verified,
    v.override_cheque_number::TEXT,
    v.override_bank_code::TEXT,
    v.override_amount,
    CASE WHEN v.override_cheque_date IS NOT NULL THEN to_char(v.override_cheque_date, 'YYYY-MM-DD') ELSE NULL END AS override_cheque_date,
    v.edit_reason::TEXT,
    v.id::TEXT AS verification_id
  FROM public.c3_payment_methods cpm
  JOIN public.cn_payment_header ch ON cpm.payment_id = ch.payment_id
  JOIN public.cn_receipt r ON r.payment_id = ch.payment_id AND r.status != 'C'
  LEFT JOIN public.cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = 'c3_payment_methods'
    AND v.source_record_id = cpm.id::TEXT
  LEFT JOIN public.tb_bank_code tb ON cpm.bank_code = tb.bank_code
  WHERE ch.batch_number = p_batch_number
    AND cpm.mop_code = 'CHQ'
    AND COALESCE(ch.status, 'active') != 'cancelled';
END;
$function$;