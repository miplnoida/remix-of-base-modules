
-- Create cn_receipt_prints table to log every print/reprint
CREATE TABLE public.cn_receipt_prints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id varchar(50) NOT NULL,
  printed_at timestamp NOT NULL DEFAULT now(),
  printed_by varchar(5) NOT NULL,
  print_type varchar(10) NOT NULL DEFAULT 'ORIGINAL'
);

-- Trigger to enforce cancellation only when status = 'O'
CREATE OR REPLACE FUNCTION public.enforce_receipt_cancel_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'C' AND OLD.status <> 'O' THEN
    RAISE EXCEPTION 'Receipt can only be cancelled when status is O (Original). Current status: %', OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_receipt_cancel
  BEFORE UPDATE ON public.cn_receipt
  FOR EACH ROW EXECUTE FUNCTION public.enforce_receipt_cancel_status();
