
-- 1a. Many-to-many join table
CREATE TABLE IF NOT EXISTS public.bn_rule_group_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_group_id uuid NOT NULL REFERENCES public.bn_rule_group(id) ON DELETE CASCADE,
  catalogue_rule_id uuid NOT NULL REFERENCES public.bn_rule_catalogue(id) ON DELETE CASCADE,
  rule_code text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  default_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bn_rule_group_item_unique UNIQUE (rule_group_id, catalogue_rule_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rule_group_item TO authenticated;
GRANT ALL ON public.bn_rule_group_item TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_rule_group_item_group ON public.bn_rule_group_item(rule_group_id);
CREATE INDEX IF NOT EXISTS idx_bn_rule_group_item_rule  ON public.bn_rule_group_item(catalogue_rule_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_rule_group_item_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_rule_group_item_updated_at ON public.bn_rule_group_item;
CREATE TRIGGER trg_bn_rule_group_item_updated_at
BEFORE UPDATE ON public.bn_rule_group_item
FOR EACH ROW EXECUTE FUNCTION public.bn_rule_group_item_set_updated_at();

-- 1b. Backfill from existing single-group link
INSERT INTO public.bn_rule_group_item (rule_group_id, catalogue_rule_id, rule_code, sort_order, default_active)
SELECT rc.rule_group_id, rc.id, rc.rule_code,
       COALESCE(rc.default_rule_sort_order, 0), rc.is_active
FROM public.bn_rule_catalogue rc
WHERE rc.rule_group_id IS NOT NULL
ON CONFLICT (rule_group_id, catalogue_rule_id) DO NOTHING;

-- 1c. Enrich product eligibility rows
ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS rule_category text,
  ADD COLUMN IF NOT EXISTS source_rule_group_id uuid REFERENCES public.bn_rule_group(id),
  ADD COLUMN IF NOT EXISTS source_rule_group_code text,
  ADD COLUMN IF NOT EXISTS catalogue_rule_version int;

-- 1d. Usage view
CREATE OR REPLACE VIEW public.bn_rule_catalogue_group_usage AS
SELECT
  i.catalogue_rule_id,
  COUNT(*)::int AS group_count,
  array_agg(DISTINCT g.group_code ORDER BY g.group_code) AS group_codes,
  array_agg(DISTINCT i.rule_group_id) AS group_ids
FROM public.bn_rule_group_item i
JOIN public.bn_rule_group g ON g.id = i.rule_group_id
GROUP BY i.catalogue_rule_id;

GRANT SELECT ON public.bn_rule_catalogue_group_usage TO authenticated;
GRANT SELECT ON public.bn_rule_catalogue_group_usage TO service_role;
