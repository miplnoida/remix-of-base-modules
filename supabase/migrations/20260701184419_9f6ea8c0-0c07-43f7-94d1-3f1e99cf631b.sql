
-- Normalize legacy module codes so filters and assignments line up
UPDATE public.core_template SET module_code = 'BENEFITS'   WHERE module_code = 'BN';
UPDATE public.core_template SET module_code = 'COMPLIANCE' WHERE module_code = 'CE';

-- Backfill default_layout_id from template_type where missing
UPDATE public.core_template t
SET default_layout_id = l.id,
    updated_at = now(),
    updated_by = COALESCE(t.updated_by, 'SEED-CORE')
FROM public.core_template_layout l
WHERE t.default_layout_id IS NULL
  AND l.code = CASE t.template_type
    WHEN 'EMAIL'       THEN 'BASE_EMAIL'
    WHEN 'LETTER'      THEN 'BASE_LETTER'
    WHEN 'NOTICE'      THEN 'BASE_NOTICE'
    WHEN 'CERTIFICATE' THEN 'BASE_CERTIFICATE'
    WHEN 'STATEMENT'   THEN 'BASE_STATEMENT'
    WHEN 'RECEIPT'     THEN 'BASE_RECEIPT'
    WHEN 'REPORT'      THEN 'BASE_REPORT'
    WHEN 'SMS'         THEN 'BASE_SMS'
    WHEN 'WHATSAPP'    THEN 'BASE_WHATSAPP'
    WHEN 'IN_APP'      THEN 'BASE_IN_APP'
    WHEN 'PDF'         THEN 'BASE_LETTER'
    WHEN 'DOCUMENT'    THEN 'BASE_LETTER'
    WHEN 'FORM'        THEN 'BASE_LETTER'
    ELSE 'BASE_LETTER'
  END;
