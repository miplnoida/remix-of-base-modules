
-- Re-create temp seed so we can reuse for EMAIL variants
DROP TABLE IF EXISTS tmp_lg_seed;
CREATE TEMP TABLE tmp_lg_seed AS
SELECT t.code, t.id AS template_id, t.active_version_id AS vid,
       v.subject, v.body_html
FROM public.core_template t
JOIN public.core_template_version v ON v.id = t.active_version_id
WHERE t.module_code='LEGAL' AND t.country_code='KN';

-- Add EMAIL variants
INSERT INTO public.core_template_channel_variant
  (template_version_id, channel_code, subject, body_html, body_text, is_default, is_active)
SELECT s.vid, 'EMAIL', s.subject, s.body_html,
       regexp_replace(s.body_html,'<[^>]+>',' ','g'),
       true, true
FROM tmp_lg_seed s
ON CONFLICT DO NOTHING;

-- Auto-link foundational legal references where not already linked
WITH refs AS (
  SELECT id, ref_code FROM public.core_legal_reference
  WHERE country_code = 'KN'
    AND ref_code IN ('SSA-S45','SSR-R12','SSA-S40','SSA-S60','SSA-S6')
    AND is_active = true
  LIMIT 5
)
INSERT INTO public.core_template_legal_reference
  (template_id, legal_reference_id, required_flag, display_order)
SELECT s.template_id, r.id, true, row_number() OVER (PARTITION BY s.template_id ORDER BY r.ref_code)
FROM tmp_lg_seed s
CROSS JOIN refs r
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_template_legal_reference x
  WHERE x.template_id = s.template_id AND x.legal_reference_id = r.id
);
