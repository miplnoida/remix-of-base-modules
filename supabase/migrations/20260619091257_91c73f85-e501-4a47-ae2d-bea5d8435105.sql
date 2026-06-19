
-- ============================================================================
-- BN Payment Cycle × Method restriction
-- Adds a junction table that narrows country-enabled methods per payment cycle.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bn_country_payment_cycle_method (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code          VARCHAR(8)  NOT NULL,
  payment_cycle         VARCHAR(20) NOT NULL,
  payment_method        VARCHAR(40) NOT NULL,
  is_enabled            BOOLEAN     NOT NULL DEFAULT true,
  is_default_for_cycle  BOOLEAN     NOT NULL DEFAULT false,
  priority              INTEGER     NOT NULL DEFAULT 100,
  effective_from        DATE,
  effective_to          DATE,
  entered_by            VARCHAR(50),
  entered_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by           VARCHAR(50),
  modified_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_cpcm_unique UNIQUE (country_code, payment_cycle, payment_method),
  CONSTRAINT bn_cpcm_cycle_chk CHECK (payment_cycle IN
    ('ONE_OFF','WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','ANNUAL','AD_HOC'))
);

CREATE INDEX IF NOT EXISTS bn_cpcm_country_cycle_idx
  ON public.bn_country_payment_cycle_method (country_code, payment_cycle);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_country_payment_cycle_method TO authenticated;
GRANT ALL ON public.bn_country_payment_cycle_method TO service_role;

-- Per NO-RLS policy on public schema (project standard): RLS stays disabled here.
-- Auth/role enforcement happens at the application/edge layer.

-- ===== FK-like trigger: cycle row must reference an existing country_payment_config row =====
CREATE OR REPLACE FUNCTION public.bn_cpcm_validate_country_method()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_country_enabled BOOLEAN;
BEGIN
  SELECT (is_active AND is_method_enabled) INTO v_country_enabled
    FROM public.bn_country_payment_config
   WHERE country_code = NEW.country_code
     AND payment_method = NEW.payment_method;
  IF v_country_enabled IS NULL THEN
    RAISE EXCEPTION 'bn_country_payment_config has no row for (%, %) — create the country method first',
      NEW.country_code, NEW.payment_method;
  END IF;
  IF NEW.is_enabled AND v_country_enabled IS FALSE THEN
    RAISE EXCEPTION 'Method % is disabled at country level for % — cannot enable for cycle %',
      NEW.payment_method, NEW.country_code, NEW.payment_cycle;
  END IF;
  NEW.modified_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bn_cpcm_validate_trg ON public.bn_country_payment_cycle_method;
CREATE TRIGGER bn_cpcm_validate_trg
  BEFORE INSERT OR UPDATE ON public.bn_country_payment_cycle_method
  FOR EACH ROW EXECUTE FUNCTION public.bn_cpcm_validate_country_method();

-- ===== Refresh effective payment view to expose cycle-restricted methods =====
DROP VIEW IF EXISTS public.v_bn_product_effective_payment_config;
CREATE VIEW public.v_bn_product_effective_payment_config AS
SELECT
  pcc.id                                   AS channel_config_id,
  pcc.product_id,
  pcc.product_version_id,
  pcc.channel_code,
  p.benefit_code,
  p.country_code,
  c.currency_code                          AS country_currency,
  c.allow_foreign_currency_products,
  c.allowed_alt_currencies,
  COALESCE(pcc.currency_code, c.currency_code) AS effective_currency,
  pcc.allowed_payment_methods              AS product_allowed_methods,
  ARRAY(
    SELECT cpc.payment_method
    FROM public.bn_country_payment_config cpc
    WHERE cpc.country_code = p.country_code
      AND cpc.is_active
      AND cpc.is_method_enabled
  )                                        AS country_enabled_methods,
  -- Cycle-restricted methods. NULL means "no cycle override — fall back to country enabled".
  CASE
    WHEN pcc.payment_frequency IS NULL THEN NULL
    WHEN NOT EXISTS (
      SELECT 1 FROM public.bn_country_payment_cycle_method m
       WHERE m.country_code  = p.country_code
         AND m.payment_cycle = pcc.payment_frequency
    ) THEN NULL
    ELSE ARRAY(
      SELECT m.payment_method
        FROM public.bn_country_payment_cycle_method m
       WHERE m.country_code  = p.country_code
         AND m.payment_cycle = pcc.payment_frequency
         AND m.is_enabled = true
         AND (m.effective_from IS NULL OR m.effective_from <= CURRENT_DATE)
         AND (m.effective_to   IS NULL OR m.effective_to   >= CURRENT_DATE)
    )
  END                                      AS cycle_enabled_methods,
  pcc.default_payment_method,
  pcc.payment_frequency,
  pcc.payment_pattern,
  pcc.allow_payee,
  pcc.allow_provider_direct_pay,
  pcc.approval_threshold_amount,
  pcc.approval_threshold_currency,
  pcc.payment_hold_rules
FROM public.bn_product_channel_config pcc
JOIN public.bn_product p          ON p.id = pcc.product_id
JOIN public.bn_country c          ON c.country_code = p.country_code;

GRANT SELECT ON public.v_bn_product_effective_payment_config TO authenticated;
GRANT SELECT ON public.v_bn_product_effective_payment_config TO service_role;

-- ===== Seed SKN cycle restrictions (EFT + CHEQUE for WEEKLY/MONTHLY/ONE_OFF/AD_HOC) =====
INSERT INTO public.bn_country_payment_cycle_method
  (country_code, payment_cycle, payment_method, is_enabled, is_default_for_cycle, priority, entered_by)
SELECT 'SKN', cycle, method,
       true,
       (method = 'EFT'),
       CASE method WHEN 'EFT' THEN 1 WHEN 'CHEQUE' THEN 2 ELSE 99 END,
       'SEED'
FROM (VALUES ('WEEKLY'),('MONTHLY'),('ONE_OFF'),('AD_HOC')) AS c(cycle)
CROSS JOIN (VALUES ('EFT'),('CHEQUE')) AS m(method)
WHERE EXISTS (
  SELECT 1 FROM public.bn_country_payment_config cpc
   WHERE cpc.country_code = 'SKN' AND cpc.payment_method = m.method
     AND cpc.is_active AND cpc.is_method_enabled
)
ON CONFLICT (country_code, payment_cycle, payment_method) DO NOTHING;
