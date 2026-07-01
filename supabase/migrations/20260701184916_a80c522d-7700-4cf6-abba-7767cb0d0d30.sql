
INSERT INTO public.core_text_block (text_block_code, code, name, category, language_code, body_html, is_active, created_by, updated_by)
SELECT 'STD_LEGAL_DISCLAIMER', 'STD_LEGAL_DISCLAIMER', 'Standard Legal Disclaimer', 'DISCLAIMER', 'en',
       '<p style="font-size:10px;color:#666;">This document is issued by the Social Security Board. Any unauthorized reproduction is prohibited.</p>',
       true, 'SEED-CORE', 'SEED-CORE'
WHERE NOT EXISTS (SELECT 1 FROM public.core_text_block WHERE code = 'STD_LEGAL_DISCLAIMER');

INSERT INTO public.core_text_block (text_block_code, code, name, category, language_code, body_html, is_active, created_by, updated_by)
SELECT 'STD_CORRESPONDENCE_FOOTER', 'STD_CORRESPONDENCE_FOOTER', 'Standard Correspondence Footer', 'FOOTER', 'en',
       '<p style="font-size:10px;color:#666;text-align:center;">All correspondence should be addressed to The Director, Social Security Board.</p>',
       true, 'SEED-CORE', 'SEED-CORE'
WHERE NOT EXISTS (SELECT 1 FROM public.core_text_block WHERE code = 'STD_CORRESPONDENCE_FOOTER');

UPDATE public.core_template_version
SET body_metadata = COALESCE(body_metadata, '{}'::jsonb)
                    || jsonb_build_object(
                         'inline_blocks_legacy', true,
                         'has_inline_signature',  body_html ILIKE '%signature%',
                         'has_inline_footer',     body_html ILIKE '%<footer%' OR body_html ILIKE '%class="footer%' OR body_html ILIKE '%lg-doc__footer%',
                         'has_inline_disclaimer', body_html ILIKE '%disclaimer%',
                         'migrated_at', to_jsonb(now())
                       ),
    updated_at = now()
WHERE body_html IS NOT NULL
  AND (body_html ILIKE '%signature%' OR body_html ILIKE '%disclaimer%' OR body_html ILIKE '%<footer%' OR body_html ILIKE '%lg-doc__footer%')
  AND NOT COALESCE((body_metadata->>'inline_blocks_legacy')::boolean, false);

WITH singleton AS (
  SELECT template_id, MIN(id::text)::uuid AS ver_id
  FROM public.core_template_version
  GROUP BY template_id
  HAVING COUNT(*) = 1
)
UPDATE public.core_template t
SET active_version_id = s.ver_id,
    updated_at = now()
FROM singleton s
WHERE s.template_id = t.id
  AND t.active_version_id IS NULL;
