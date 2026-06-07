-- Clean up literal "\n" escape sequences stored in template bodies so they
-- render with real line breaks instead of literal characters.
UPDATE public.notification_templates
SET body = replace(replace(body, E'\\r\\n', E'\n'), E'\\n', E'\n')
WHERE body LIKE '%\\n%' OR body LIKE '%\\r\\n%';

UPDATE public.notification_template_versions
SET body = replace(replace(body, E'\\r\\n', E'\n'), E'\\n', E'\n')
WHERE body LIKE '%\\n%' OR body LIKE '%\\r\\n%';