
-- 1. Expand check constraint
ALTER TABLE public.core_template_layout DROP CONSTRAINT IF EXISTS core_template_layout_kind_chk;
ALTER TABLE public.core_template_layout ADD CONSTRAINT core_template_layout_kind_chk
  CHECK (layout_kind IN (
    'LETTERHEAD','EMAIL','LETTER','SMS','WHATSAPP','IN_APP','PUSH',
    'NOTICE','CERTIFICATE','STATEMENT','RECEIPT','REPORT'
  ));

-- 2. Reclassify base layout kinds
UPDATE public.core_template_layout SET layout_kind='EMAIL'       WHERE code='BASE_EMAIL';
UPDATE public.core_template_layout SET layout_kind='SMS'         WHERE code='BASE_SMS';
UPDATE public.core_template_layout SET layout_kind='WHATSAPP'    WHERE code='BASE_WHATSAPP';
UPDATE public.core_template_layout SET layout_kind='IN_APP'      WHERE code='BASE_IN_APP';
UPDATE public.core_template_layout SET layout_kind='PUSH'        WHERE code='BASE_PUSH';
UPDATE public.core_template_layout SET layout_kind='LETTER'      WHERE code='BASE_LETTER';
UPDATE public.core_template_layout SET layout_kind='NOTICE'      WHERE code='BASE_NOTICE';
UPDATE public.core_template_layout SET layout_kind='CERTIFICATE' WHERE code='BASE_CERTIFICATE';
UPDATE public.core_template_layout SET layout_kind='STATEMENT'   WHERE code='BASE_STATEMENT';
UPDATE public.core_template_layout SET layout_kind='RECEIPT'     WHERE code='BASE_RECEIPT';
UPDATE public.core_template_layout SET layout_kind='REPORT'      WHERE code='BASE_REPORT';

-- 3. Fill slot placeholders per channel (only if currently null)
UPDATE public.core_template_layout SET
  body_placeholder_html = COALESCE(body_placeholder_html, '{{BODY}}'),
  signature_slot        = COALESCE(signature_slot, ''),
  footer_slot           = COALESCE(footer_slot, ''),
  disclaimer_slot       = COALESCE(disclaimer_slot, '')
WHERE code = 'BASE_SMS';

UPDATE public.core_template_layout SET
  body_placeholder_html = COALESCE(body_placeholder_html, '{{BODY}}'),
  signature_slot        = COALESCE(signature_slot, ''),
  footer_slot           = COALESCE(footer_slot, '{{FOOTER_BLOCK}}'),
  disclaimer_slot       = COALESCE(disclaimer_slot, '')
WHERE code = 'BASE_WHATSAPP';

UPDATE public.core_template_layout SET
  body_placeholder_html = COALESCE(body_placeholder_html, '<div class="in-app-body">{{BODY}}</div>'),
  signature_slot        = COALESCE(signature_slot, ''),
  footer_slot           = COALESCE(footer_slot, '<div class="in-app-footer">{{FOOTER_BLOCK}}</div>'),
  disclaimer_slot       = COALESCE(disclaimer_slot, '')
WHERE code = 'BASE_IN_APP';

UPDATE public.core_template_layout SET
  body_placeholder_html = COALESCE(body_placeholder_html, '{{BODY}}'),
  signature_slot        = COALESCE(signature_slot, ''),
  footer_slot           = COALESCE(footer_slot, ''),
  disclaimer_slot       = COALESCE(disclaimer_slot, '')
WHERE code = 'BASE_PUSH';

UPDATE public.core_template_layout SET
  body_placeholder_html = COALESCE(body_placeholder_html, '<div class="letter-body">{{BODY}}</div>'),
  signature_slot        = COALESCE(signature_slot, '<div class="letter-signature">{{SIGNATURE_BLOCK}}</div>'),
  footer_slot           = COALESCE(footer_slot, '<div class="letter-footer">{{FOOTER_BLOCK}}</div>'),
  disclaimer_slot       = COALESCE(disclaimer_slot, '<div class="letter-disclaimer">{{DISCLAIMER_BLOCK}}</div>')
WHERE code IN ('BASE_LETTER','BASE_NOTICE');

UPDATE public.core_template_layout SET
  body_placeholder_html = COALESCE(body_placeholder_html, '<div class="doc-body">{{BODY}}</div>'),
  signature_slot        = COALESCE(signature_slot, '<div class="doc-signature">{{SIGNATURE_BLOCK}}</div>'),
  footer_slot           = COALESCE(footer_slot, '<div class="doc-footer">{{FOOTER_BLOCK}}</div>'),
  disclaimer_slot       = COALESCE(disclaimer_slot, '<div class="doc-disclaimer">{{DISCLAIMER_BLOCK}}</div>')
WHERE code IN ('BASE_CERTIFICATE','BASE_STATEMENT','BASE_RECEIPT','BASE_REPORT','BASE_EMAIL');

-- 4. Backfill notification_templates.default_layout_id by channel
WITH picks AS (
  SELECT id, code FROM public.core_template_layout WHERE code IN
    ('BASE_EMAIL','BASE_SMS','BASE_LETTER','BASE_IN_APP','BASE_WHATSAPP','BASE_PUSH')
)
UPDATE public.notification_templates nt
SET default_layout_id = p.id
FROM picks p
WHERE nt.default_layout_id IS NULL
  AND (
    (nt.channel = 'email'  AND p.code = 'BASE_EMAIL')  OR
    (nt.channel = 'sms'    AND p.code = 'BASE_SMS')    OR
    (nt.channel = 'letter' AND p.code = 'BASE_LETTER') OR
    (nt.channel = 'in_app' AND p.code = 'BASE_IN_APP') OR
    (nt.channel = 'push'   AND p.code = 'BASE_PUSH')
  );
