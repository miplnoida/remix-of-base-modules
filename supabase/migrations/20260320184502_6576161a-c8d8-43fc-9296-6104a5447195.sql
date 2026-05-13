
ALTER TABLE public.cn_payment_header ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
