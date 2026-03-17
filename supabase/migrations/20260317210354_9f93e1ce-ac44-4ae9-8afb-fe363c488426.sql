
-- Safe next payment_id generation to prevent duplicate key errors
CREATE OR REPLACE FUNCTION public.get_next_payment_id()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_id integer;
BEGIN
  LOCK TABLE public.cn_payment_header IN EXCLUSIVE MODE;
  SELECT COALESCE(MAX(payment_id), 0) + 1 INTO next_id FROM public.cn_payment_header;
  RETURN next_id;
END;
$$;
