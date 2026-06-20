
-- 1) Remove the temporary view aliases so we can rename the underlying tables
DROP VIEW IF EXISTS public.core_legal_reference;
DROP VIEW IF EXISTS public.core_module_legal_reference;

-- 2) Remove the BN sync trigger and helper function (no longer needed)
DROP TRIGGER IF EXISTS trg_sync_legal_to_bn ON public.legal_reference;
DROP FUNCTION IF EXISTS public.sync_legal_reference_to_bn();

-- 3) Add the BN-only "applicable_products" feature to the central table
ALTER TABLE public.legal_reference
  ADD COLUMN IF NOT EXISTS applicable_products TEXT[];

-- Copy applicable_products from bn_country_legal_ref into matching core rows
UPDATE public.legal_reference lr
SET applicable_products = bn.applicable_products
FROM public.bn_country_legal_ref bn
WHERE bn.country_code = lr.country_code
  AND bn.ref_code = lr.ref_code
  AND bn.version_number = lr.version_number
  AND bn.applicable_products IS NOT NULL;

-- 4) Drop the duplicated Benefits-only table (data already in legal_reference)
DROP TABLE IF EXISTS public.bn_country_legal_ref CASCADE;

-- 5) Rename the real tables to the canonical "core_*" names
ALTER TABLE public.legal_reference RENAME TO core_legal_reference;
ALTER TABLE public.module_legal_reference_mapping RENAME TO core_module_legal_reference;

-- 6) Re-create read-only compatibility views under the OLD names
CREATE OR REPLACE VIEW public.legal_reference AS
SELECT * FROM public.core_legal_reference;

CREATE OR REPLACE VIEW public.module_legal_reference_mapping AS
SELECT * FROM public.core_module_legal_reference;

CREATE OR REPLACE VIEW public.bn_country_legal_ref AS
SELECT
  id,
  country_code,
  ref_code,
  short_title           AS ref_title,
  section               AS ref_section,
  ref_url,
  applicable_products,
  effective_from,
  effective_to,
  version_number,
  supersedes_id,
  notes,
  is_active,
  created_by            AS entered_by,
  created_at            AS entered_at,
  created_by,
  created_at,
  updated_by,
  updated_at
FROM public.core_legal_reference;

GRANT SELECT ON public.legal_reference                   TO authenticated, anon;
GRANT SELECT ON public.module_legal_reference_mapping    TO authenticated, anon;
GRANT SELECT ON public.bn_country_legal_ref              TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_legal_reference        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_module_legal_reference TO authenticated;
GRANT ALL ON public.core_legal_reference        TO service_role;
GRANT ALL ON public.core_module_legal_reference TO service_role;
