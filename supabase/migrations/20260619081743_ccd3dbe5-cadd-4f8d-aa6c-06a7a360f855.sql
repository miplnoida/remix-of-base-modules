
-- Safety: re-run backfill for any rows added between S2 and S4
UPDATE public.bn_country_payment_config
   SET is_method_enabled = COALESCE(is_active, true)
 WHERE is_method_enabled IS NULL;

UPDATE public.bn_product_channel_config pcc
   SET currency_code = c.currency_code
  FROM public.bn_product p
  JOIN public.bn_country c ON c.country_code = p.country_code
 WHERE pcc.product_id = p.id
   AND pcc.currency_code IS NULL;

-- Flip constraints
ALTER TABLE public.bn_country_payment_config
  ALTER COLUMN is_method_enabled SET NOT NULL;

ALTER TABLE public.bn_product_channel_config
  ALTER COLUMN currency_code SET NOT NULL;
