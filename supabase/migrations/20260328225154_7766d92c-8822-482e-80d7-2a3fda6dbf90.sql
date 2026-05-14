
-- 1. Create cn_batch_cheque_verification table
CREATE TABLE IF NOT EXISTS public.cn_batch_cheque_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  source_table VARCHAR(30) NOT NULL,
  source_record_id TEXT NOT NULL,
  source_payment_id BIGINT,
  is_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  override_cheque_number VARCHAR(50),
  override_bank_code VARCHAR(50),
  override_amount NUMERIC(12,2),
  override_cheque_date DATE,
  edit_reason TEXT,
  edited_by TEXT,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_batch_source_record UNIQUE (batch_number, source_table, source_record_id)
);

-- Audit trigger
CREATE TRIGGER audit_cn_batch_cheque_verification_changes
AFTER INSERT OR UPDATE OR DELETE ON public.cn_batch_cheque_verification
FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes('cn_batch_cheque_verification');

-- 2. get_batch_cheques_for_verification RPC
CREATE OR REPLACE FUNCTION public.get_batch_cheques_for_verification(p_batch_number TEXT)
RETURNS TABLE(
  cheque_number TEXT,
  bank_code TEXT,
  bank_name TEXT,
  amount NUMERIC,
  currency_code TEXT,
  cheque_date TEXT,
  payer_id TEXT,
  payer_type TEXT,
  source_table TEXT,
  source_record_id TEXT,
  payment_id BIGINT,
  is_verified BOOLEAN,
  override_cheque_number TEXT,
  override_bank_code TEXT,
  override_amount NUMERIC,
  override_cheque_date TEXT,
  edit_reason TEXT,
  verification_id TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY

  -- cn_payment cheques
  SELECT
    cp.mop_number::TEXT AS cheque_number,
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
  LEFT JOIN public.cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = 'cn_payment'
    AND v.source_record_id = cp.payment_sequence_no::TEXT
  LEFT JOIN public.tb_bank_code tb ON cp.bank_code = tb.bank_code
  WHERE ch.batch_number = p_batch_number
    AND cp.mop_code = 'CHQ'

  UNION ALL

  -- c3_payment_methods cheques
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
  LEFT JOIN public.cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = 'c3_payment_methods'
    AND v.source_record_id = cpm.id::TEXT
  LEFT JOIN public.tb_bank_code tb ON cpm.bank_code = tb.bank_code
  WHERE ch.batch_number = p_batch_number
    AND cpm.mop_code = 'CHQ';
END;
$$;

-- 3. verify_batch_cheque RPC
CREATE OR REPLACE FUNCTION public.verify_batch_cheque(
  p_batch_number TEXT,
  p_source_table TEXT,
  p_source_record_id TEXT,
  p_source_payment_id BIGINT,
  p_is_verified BOOLEAN,
  p_user_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cn_batch_cheque_verification (
    batch_number, source_table, source_record_id, source_payment_id,
    is_verified, verified_by, verified_at
  ) VALUES (
    p_batch_number, p_source_table, p_source_record_id, p_source_payment_id,
    p_is_verified, p_user_code, now()
  )
  ON CONFLICT (batch_number, source_table, source_record_id)
  DO UPDATE SET
    is_verified = p_is_verified,
    verified_by = p_user_code,
    verified_at = now();
END;
$$;

-- 4. edit_and_verify_batch_cheque RPC
CREATE OR REPLACE FUNCTION public.edit_and_verify_batch_cheque(
  p_batch_number TEXT,
  p_source_table TEXT,
  p_source_record_id TEXT,
  p_source_payment_id BIGINT,
  p_override_cheque_number TEXT DEFAULT NULL,
  p_override_bank_code TEXT DEFAULT NULL,
  p_override_amount NUMERIC DEFAULT NULL,
  p_override_cheque_date TEXT DEFAULT NULL,
  p_edit_reason TEXT DEFAULT NULL,
  p_user_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_cheque_date DATE;
BEGIN
  -- Validate
  IF p_override_amount IS NOT NULL AND p_override_amount <= 0 THEN
    RAISE EXCEPTION 'Override amount must be greater than zero.';
  END IF;

  -- Cast date
  v_cheque_date := CASE WHEN p_override_cheque_date IS NOT NULL AND p_override_cheque_date <> '' 
                        THEN p_override_cheque_date::DATE ELSE NULL END;

  -- Upsert verification record
  INSERT INTO public.cn_batch_cheque_verification (
    batch_number, source_table, source_record_id, source_payment_id,
    override_cheque_number, override_bank_code, override_amount, override_cheque_date,
    edit_reason, edited_by, edited_at,
    is_verified, verified_by, verified_at
  ) VALUES (
    p_batch_number, p_source_table, p_source_record_id, p_source_payment_id,
    p_override_cheque_number, p_override_bank_code, p_override_amount, v_cheque_date,
    p_edit_reason, p_user_code, now(),
    true, p_user_code, now()
  )
  ON CONFLICT (batch_number, source_table, source_record_id)
  DO UPDATE SET
    override_cheque_number = COALESCE(p_override_cheque_number, cn_batch_cheque_verification.override_cheque_number),
    override_bank_code = COALESCE(p_override_bank_code, cn_batch_cheque_verification.override_bank_code),
    override_amount = COALESCE(p_override_amount, cn_batch_cheque_verification.override_amount),
    override_cheque_date = COALESCE(v_cheque_date, cn_batch_cheque_verification.override_cheque_date),
    edit_reason = p_edit_reason,
    edited_by = p_user_code,
    edited_at = now(),
    is_verified = true,
    verified_by = p_user_code,
    verified_at = now();

  -- Propagate to source
  IF p_source_table = 'cn_payment' THEN
    UPDATE public.cn_payment SET
      mop_number = COALESCE(p_override_cheque_number, mop_number),
      bank_code = COALESCE(p_override_bank_code, bank_code),
      payment_amount = COALESCE(p_override_amount, payment_amount),
      cheque_date = COALESCE(v_cheque_date::TIMESTAMP, cheque_date)
    WHERE payment_sequence_no::TEXT = p_source_record_id;
  ELSIF p_source_table = 'c3_payment_methods' THEN
    UPDATE public.c3_payment_methods SET
      mop_number = COALESCE(p_override_cheque_number, mop_number),
      bank_code = COALESCE(p_override_bank_code, bank_code),
      original_amount = COALESCE(p_override_amount, original_amount),
      cheque_date = COALESCE(v_cheque_date, cheque_date)
    WHERE id::TEXT = p_source_record_id;
  END IF;
END;
$$;
