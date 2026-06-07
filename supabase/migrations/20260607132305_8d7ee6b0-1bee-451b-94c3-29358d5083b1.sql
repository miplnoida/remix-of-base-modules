-- Fix Employment Injury Benefit: it is paid WEEKLY (75% of avg insurable wage)
-- and is short-term, not long-term/monthly.
UPDATE public.bn_product_version
SET payment_frequency = 'WEEKLY',
    benefit_duration_type = 'SHORT_TERM',
    modified_at = now()
WHERE product_id = (SELECT id FROM public.bn_product WHERE benefit_code = 'SKN-EI-INJ')
  AND (payment_frequency IS NULL OR payment_frequency = 'MONTHLY');

-- Correct the wrongly-stamped entitlement for this seed claim
UPDATE public.bn_entitlement
SET payment_frequency = 'WEEKLY',
    monthly_rate      = NULL,
    duration_weeks    = 52,
    modified_at       = now()
WHERE claim_number = 'BN-20260607-84514'
  AND payment_frequency = 'MONTHLY';

-- Correct the first queued payable amount + frequency to match weekly rate
UPDATE public.bn_payment_instruction pi
SET amount    = e.weekly_rate,
    frequency = 'WEEKLY'
FROM public.bn_entitlement e
WHERE pi.entitlement_id = e.id
  AND e.claim_number = 'BN-20260607-84514'
  AND pi.status = 'queued';