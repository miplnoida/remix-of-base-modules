
-- Fix: Replace identity column with sequence-based auto-increment
-- This avoids the diff tool's identity type conversion issue

-- 1) Drop trigger and PK
DROP TRIGGER IF EXISTS trg_enforce_receipt_cancel ON public.cn_receipt;
ALTER TABLE public.cn_receipt DROP CONSTRAINT IF EXISTS pk_cn_receipt;

-- 2) Drop the identity column
ALTER TABLE public.cn_receipt DROP COLUMN IF EXISTS receipt_id;

-- 3) Create a sequence
CREATE SEQUENCE IF NOT EXISTS public.cn_receipt_receipt_id_seq AS integer;

-- 4) Add receipt_id as plain integer with sequence default
ALTER TABLE public.cn_receipt ADD COLUMN receipt_id integer NOT NULL DEFAULT nextval('public.cn_receipt_receipt_id_seq');
ALTER SEQUENCE public.cn_receipt_receipt_id_seq OWNED BY public.cn_receipt.receipt_id;

-- 5) Restore PK
ALTER TABLE public.cn_receipt ADD CONSTRAINT pk_cn_receipt PRIMARY KEY (receipt_id);

-- 6) Restore trigger
CREATE TRIGGER trg_enforce_receipt_cancel
  BEFORE UPDATE ON public.cn_receipt
  FOR EACH ROW
  EXECUTE FUNCTION enforce_receipt_cancel_status();
