
-- Add receipt_number column (may already exist from partial migration)
ALTER TABLE public.cn_receipt ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Create trigger function to auto-generate receipt_number after insert
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payer_id TEXT;
  v_ts TEXT;
  v_rn TEXT;
BEGIN
  SELECT payer_id INTO v_payer_id
  FROM public.cn_payment_header
  WHERE payment_id = NEW.payment_id;

  v_ts := to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYYHH24MI');
  v_rn := COALESCE(v_payer_id, 'UNKNOWN') || '/' || NEW.receipt_id || '/' || v_ts;

  UPDATE public.cn_receipt
  SET receipt_number = v_rn
  WHERE receipt_id = NEW.receipt_id;

  RETURN NULL;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_set_receipt_number ON public.cn_receipt;

-- Create AFTER INSERT trigger
CREATE TRIGGER trg_set_receipt_number
AFTER INSERT ON public.cn_receipt
FOR EACH ROW
EXECUTE FUNCTION public.set_receipt_number();

-- Temporarily disable the audit trigger to avoid OLD.id error during backfill
ALTER TABLE public.cn_receipt DISABLE TRIGGER trg_audit_cn_receipt;

-- Backfill existing receipts
UPDATE public.cn_receipt r
SET receipt_number = COALESCE(h.payer_id, 'UNKNOWN') || '/' || r.receipt_id || '/' || to_char(COALESCE(r.created_at, now()), 'DDMMYYYYHH24MI')
FROM public.cn_payment_header h
WHERE h.payment_id = r.payment_id
AND r.receipt_number IS NULL;

-- Re-enable the audit trigger
ALTER TABLE public.cn_receipt ENABLE TRIGGER trg_audit_cn_receipt;

-- Add unique constraint (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_receipt_number') THEN
    ALTER TABLE public.cn_receipt ADD CONSTRAINT uq_receipt_number UNIQUE (receipt_number);
  END IF;
END;
$$;
