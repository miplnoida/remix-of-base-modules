-- Step 1: Drop the incorrect PK on payer_id
ALTER TABLE public.cn_payment_header
DROP CONSTRAINT pk_cn_payment_header;

-- Step 2: Add correct PK on payment_id
ALTER TABLE public.cn_payment_header
ADD CONSTRAINT pk_cn_payment_header PRIMARY KEY (payment_id);

-- Step 3: Add non-unique index on payer_id for lookups
CREATE INDEX IF NOT EXISTS idx_cn_payment_header_payer_id
ON public.cn_payment_header (payer_id);

-- Step 4: Harden the atomic RPC with advisory lock
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
  PERFORM pg_advisory_xact_lock(7839201);

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