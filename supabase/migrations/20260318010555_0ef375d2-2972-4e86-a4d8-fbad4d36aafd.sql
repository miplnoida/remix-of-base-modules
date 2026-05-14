
-- 1) Drop the trigger temporarily
DROP TRIGGER IF EXISTS trg_enforce_receipt_cancel ON public.cn_receipt;

-- 2) Drop existing composite PK
ALTER TABLE public.cn_receipt DROP CONSTRAINT IF EXISTS pk_cn_receipt;

-- 3) Drop the old varchar receipt_id column
ALTER TABLE public.cn_receipt DROP COLUMN receipt_id;

-- 4) Add receipt_id as integer GENERATED ALWAYS AS IDENTITY
ALTER TABLE public.cn_receipt ADD COLUMN receipt_id INTEGER GENERATED ALWAYS AS IDENTITY;

-- 5) Make receipt_id the primary key
ALTER TABLE public.cn_receipt ADD CONSTRAINT pk_cn_receipt PRIMARY KEY (receipt_id);

-- 6) Change cn_receipt_prints.receipt_id from varchar to integer
ALTER TABLE public.cn_receipt_prints ALTER COLUMN receipt_id TYPE INTEGER USING receipt_id::integer;

-- 7) Restore the trigger
CREATE TRIGGER trg_enforce_receipt_cancel
  BEFORE UPDATE ON public.cn_receipt
  FOR EACH ROW
  EXECUTE FUNCTION enforce_receipt_cancel_status();
