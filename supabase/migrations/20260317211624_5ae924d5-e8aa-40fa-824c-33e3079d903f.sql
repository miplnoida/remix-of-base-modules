CREATE OR REPLACE FUNCTION public.create_payment_header_with_next_id(
  p_batch_number text,
  p_payer_type text,
  p_payer_id text,
  p_date_received date,
  p_remarks text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id integer;
BEGIN
  LOCK TABLE public.cn_payment_header IN EXCLUSIVE MODE;

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  INSERT INTO public.cn_payment_header (
    payment_id,
    batch_number,
    payer_type,
    payer_id,
    date_received,
    remarks
  ) VALUES (
    v_payment_id,
    p_batch_number,
    p_payer_type,
    p_payer_id,
    p_date_received,
    p_remarks
  );

  RETURN v_payment_id;
END;
$$;