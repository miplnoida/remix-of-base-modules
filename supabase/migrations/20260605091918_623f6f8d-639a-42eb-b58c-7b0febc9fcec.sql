-- Close out any prior ACTIVE bn_product_version that overlaps a newer ACTIVE
-- version of the same product. For each product, the version with the latest
-- effective_from remains open; older ACTIVE versions get effective_to set to
-- (next version.effective_from - 1 day). Fixes data-integrity error
-- "multiple ACTIVE versions overlap" surfaced by the resolver.
WITH ranked AS (
  SELECT id, product_id, effective_from, effective_to,
    LEAD(effective_from) OVER (PARTITION BY product_id ORDER BY effective_from) AS next_from
  FROM public.bn_product_version
  WHERE status = 'ACTIVE'
)
UPDATE public.bn_product_version v
SET effective_to = (r.next_from - INTERVAL '1 day')::date,
    modified_at = now()
FROM ranked r
WHERE v.id = r.id
  AND r.next_from IS NOT NULL
  AND (v.effective_to IS NULL OR v.effective_to >= r.next_from);