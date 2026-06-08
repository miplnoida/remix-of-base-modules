
CREATE TABLE IF NOT EXISTS public.bn_rule_catalogue_group (
  catalogue_id uuid NOT NULL REFERENCES public.bn_rule_catalogue(id) ON DELETE CASCADE,
  rule_group_id uuid NOT NULL REFERENCES public.bn_rule_group(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  PRIMARY KEY (catalogue_id, rule_group_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rule_catalogue_group TO authenticated;
GRANT ALL ON public.bn_rule_catalogue_group TO service_role;
GRANT SELECT ON public.bn_rule_catalogue_group TO anon;

CREATE INDEX IF NOT EXISTS idx_bn_rcg_group ON public.bn_rule_catalogue_group(rule_group_id);
CREATE INDEX IF NOT EXISTS idx_bn_rcg_catalogue ON public.bn_rule_catalogue_group(catalogue_id);

-- Backfill from existing single-group FK
INSERT INTO public.bn_rule_catalogue_group (catalogue_id, rule_group_id, sort_order)
SELECT id, rule_group_id, COALESCE(default_rule_sort_order, 0)
FROM public.bn_rule_catalogue
WHERE rule_group_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Helper to add additional links by rule_code + group_code
DO $$
DECLARE
  spec record;
  v_cat uuid; v_grp uuid;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('EMPLOYER_EXISTS','EMPLOYMENT_INJURY_CHECKS'),
      ('EMPLOYER_ACTIVE','EMPLOYMENT_INJURY_CHECKS'),
      ('DEATH_CERTIFICATE_RECEIVED','FUNERAL_CHECKS'),
      ('DEATH_CERTIFICATE_VERIFIED','FUNERAL_CHECKS'),
      ('MIN_TOTAL_CONTRIBUTIONS','CONTRIB-LTB'),
      ('MIN_PAID_CONTRIBUTIONS','CONTRIB-LTB'),
      ('DECEASED_MIN_CONTRIBUTIONS','CONTRIB-LTB'),
      ('DECEASED_MIN_CONTRIBUTIONS','FUNERAL_CHECKS')
    ) AS t(rule_code, group_code)
  LOOP
    SELECT id INTO v_cat FROM public.bn_rule_catalogue WHERE rule_code = spec.rule_code;
    SELECT id INTO v_grp FROM public.bn_rule_group WHERE group_code = spec.group_code;
    IF v_cat IS NOT NULL AND v_grp IS NOT NULL THEN
      INSERT INTO public.bn_rule_catalogue_group(catalogue_id, rule_group_id, sort_order)
      VALUES (v_cat, v_grp, 0)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
