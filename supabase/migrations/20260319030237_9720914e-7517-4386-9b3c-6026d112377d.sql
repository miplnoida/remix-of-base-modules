
-- Rollback: Restore receipt_id as INTEGER GENERATED ALWAYS AS IDENTITY

-- 1) Drop trigger and PK
DROP TRIGGER IF EXISTS trg_enforce_receipt_cancel ON public.cn_receipt;
ALTER TABLE public.cn_receipt DROP CONSTRAINT IF EXISTS pk_cn_receipt;

-- 2) Drop the sequence-based column
ALTER TABLE public.cn_receipt DROP COLUMN IF EXISTS receipt_id;

-- 3) Drop the sequence
DROP SEQUENCE IF EXISTS public.cn_receipt_receipt_id_seq;

-- 4) Restore as identity column
ALTER TABLE public.cn_receipt ADD COLUMN receipt_id INTEGER GENERATED ALWAYS AS IDENTITY;

-- 5) Restore PK
ALTER TABLE public.cn_receipt ADD CONSTRAINT pk_cn_receipt PRIMARY KEY (receipt_id);

-- 6) Restore trigger
CREATE TRIGGER trg_enforce_receipt_cancel
  BEFORE UPDATE ON public.cn_receipt
  FOR EACH ROW
  EXECUTE FUNCTION enforce_receipt_cancel_status();
