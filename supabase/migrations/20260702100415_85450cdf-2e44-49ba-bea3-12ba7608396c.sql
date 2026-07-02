
-- ============================================================
-- Layout Blocks: reusable header/footer compositions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comm_layout_block (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text,
  block_kind      text NOT NULL,          -- EMAIL_HEADER, EMAIL_FOOTER, DOCUMENT_HEADER, DOCUMENT_FOOTER, LETTER_HEADER, LETTER_FOOTER, REPORT_HEADER, REPORT_FOOTER, RECEIPT_HEADER, RECEIPT_FOOTER, NOTICE_HEADER, NOTICE_FOOTER, CERTIFICATE_HEADER, CERTIFICATE_FOOTER, STATEMENT_HEADER, STATEMENT_FOOTER, IN_APP_HEADER, IN_APP_FOOTER, SMS_FOOTER, WHATSAPP_FOOTER, PUSH_FOOTER
  module_code     text,                    -- optional scope
  language_code   text DEFAULT 'en',
  version         integer NOT NULL DEFAULT 1,
  lifecycle_state text NOT NULL DEFAULT 'PUBLISHED', -- DRAFT | PUBLISHED | ARCHIVED
  effective_from  date,
  effective_to    date,
  is_system       boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  -- Structured composition (source of truth):
  config          jsonb NOT NULL DEFAULT '{"version":1,"rows":[]}'::jsonb,
  -- Rendered HTML cache (regenerated on save; also used as backward-compat fallback)
  rendered_html   text,
  advanced_html   text,                    -- optional override; if present bypasses config render
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      text,
  updated_by      text
);
CREATE INDEX IF NOT EXISTS idx_comm_layout_block_kind ON public.comm_layout_block(block_kind, is_active);
CREATE INDEX IF NOT EXISTS idx_comm_layout_block_module ON public.comm_layout_block(module_code) WHERE module_code IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_layout_block TO authenticated;
GRANT SELECT ON public.comm_layout_block TO anon;
GRANT ALL ON public.comm_layout_block TO service_role;

-- NO-RLS project policy (see architecture memory): RLS remains disabled.

CREATE OR REPLACE FUNCTION public.tg_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comm_layout_block_touch ON public.comm_layout_block;
CREATE TRIGGER comm_layout_block_touch BEFORE UPDATE ON public.comm_layout_block
FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- ============================================================
-- Base Layout ↔ Layout Block references
-- ============================================================
ALTER TABLE public.core_template_layout
  ADD COLUMN IF NOT EXISTS header_block_id uuid REFERENCES public.comm_layout_block(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS footer_block_id uuid REFERENCES public.comm_layout_block(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ctl_header_block ON public.core_template_layout(header_block_id);
CREATE INDEX IF NOT EXISTS idx_ctl_footer_block ON public.core_template_layout(footer_block_id);

-- ============================================================
-- Seed standard system blocks (one header + one footer per layout kind)
-- Config references Organization Profile / Media Library at runtime.
-- ============================================================
INSERT INTO public.comm_layout_block (code, name, description, block_kind, is_system, is_active, config) VALUES
  ('STD_EMAIL_HEADER', 'Standard Email Header',
   'Organization logo + name for enterprise email',
   'EMAIL_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":true,"print":false,"mobile":true},"padding":{"top":24,"right":24,"bottom":16,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":48},{"id":"cmp2","type":"org_name","style":"heading"}]}]}]}'::jsonb),

  ('STD_EMAIL_FOOTER', 'Standard Email Footer',
   'Organization contact, disclaimer, unsubscribe',
   'EMAIL_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":true,"print":false,"mobile":true},"padding":{"top":12,"right":24,"bottom":8,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"org_contact","fields":["address","email","phone","website"]},{"id":"cmp3","type":"disclaimer","source":"default"}]}]}]}'::jsonb),

  ('STD_DOCUMENT_HEADER', 'Standard Document Header',
   'Letterhead-style header for official documents',
   'DOCUMENT_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":24,"right":24,"bottom":16,"left":24},"columns":[{"id":"c1","width":25,"align":"left","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":72}]},{"id":"c2","width":75,"align":"right","components":[{"id":"cmp2","type":"org_name","style":"heading"},{"id":"cmp3","type":"org_tagline"},{"id":"cmp4","type":"org_contact","fields":["address","phone","website"]}]}]}]}'::jsonb),

  ('STD_DOCUMENT_FOOTER', 'Standard Document Footer',
   'Page footer with legal disclaimer for documents',
   'DOCUMENT_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":8,"right":24,"bottom":16,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"disclaimer","source":"default"},{"id":"cmp3","type":"custom_text","text":"Page {{page}} of {{pages}}","style":"small"}]}]}]}'::jsonb),

  ('STD_LETTER_HEADER', 'Standard Letter Header',
   'Formal letterhead composition',
   'LETTER_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":32,"right":32,"bottom":24,"left":32},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":80},{"id":"cmp2","type":"org_name","style":"heading"},{"id":"cmp3","type":"location_block","source":"head_office"}]}]}]}'::jsonb),

  ('STD_LETTER_FOOTER', 'Standard Letter Footer',
   'Letterhead footer with legal and signature slot',
   'LETTER_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":8,"right":32,"bottom":16,"left":32},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"disclaimer","source":"default"}]}]}]}'::jsonb),

  ('STD_NOTICE_HEADER', 'Standard Notice Header',
   'Statutory notice header with prominent org name',
   'NOTICE_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":24,"right":24,"bottom":16,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":72},{"id":"cmp2","type":"custom_text","text":"OFFICIAL NOTICE","style":"heading"}]}]}]}'::jsonb),

  ('STD_NOTICE_FOOTER', 'Standard Notice Footer',
   'Notice footer with legal reference',
   'NOTICE_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":8,"right":24,"bottom":16,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"disclaimer","source":"default"}]}]}]}'::jsonb),

  ('STD_REPORT_HEADER', 'Standard Report Header',
   'Report header with org identification',
   'REPORT_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":16,"right":24,"bottom":12,"left":24},"columns":[{"id":"c1","width":50,"align":"left","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":48}]},{"id":"c2","width":50,"align":"right","components":[{"id":"cmp2","type":"org_name","style":"heading"},{"id":"cmp3","type":"custom_text","text":"Generated: {{today}}","style":"small"}]}]}]}'::jsonb),

  ('STD_REPORT_FOOTER', 'Standard Report Footer',
   'Report footer with page numbers',
   'REPORT_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":8,"right":24,"bottom":12,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"custom_text","text":"Page {{page}} of {{pages}} · Confidential","style":"small"}]}]}]}'::jsonb),

  ('STD_RECEIPT_HEADER', 'Standard Receipt Header',
   'Receipt header with logo and org name',
   'RECEIPT_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":true},"padding":{"top":12,"right":16,"bottom":8,"left":16},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":48},{"id":"cmp2","type":"org_name","style":"heading"}]}]}]}'::jsonb),

  ('STD_RECEIPT_FOOTER', 'Standard Receipt Footer',
   'Receipt footer with contact and thank-you',
   'RECEIPT_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":true},"padding":{"top":8,"right":16,"bottom":12,"left":16},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"custom_text","text":"Thank you for your payment","style":"body"},{"id":"cmp3","type":"org_contact","fields":["phone","website"]}]}]}]}'::jsonb),

  ('STD_CERTIFICATE_HEADER', 'Standard Certificate Header',
   'Certificate header with seal and org name',
   'CERTIFICATE_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":32,"right":32,"bottom":16,"left":32},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":96},{"id":"cmp2","type":"org_name","style":"heading"}]}]}]}'::jsonb),

  ('STD_CERTIFICATE_FOOTER', 'Standard Certificate Footer',
   'Certificate footer with QR verification',
   'CERTIFICATE_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":12,"right":32,"bottom":24,"left":32},"columns":[{"id":"c1","width":70,"align":"left","components":[{"id":"cmp1","type":"disclaimer","source":"default"}]},{"id":"c2","width":30,"align":"right","components":[{"id":"cmp2","type":"qr_code","source":"verification_url"}]}]}]}'::jsonb),

  ('STD_STATEMENT_HEADER', 'Standard Statement Header',
   'Statement header with account context',
   'STATEMENT_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":16,"right":24,"bottom":12,"left":24},"columns":[{"id":"c1","width":50,"align":"left","components":[{"id":"cmp1","type":"logo","source":"org_primary_logo","max_height":56}]},{"id":"c2","width":50,"align":"right","components":[{"id":"cmp2","type":"org_name","style":"heading"},{"id":"cmp3","type":"custom_text","text":"Statement Period: {{period}}","style":"small"}]}]}]}'::jsonb),

  ('STD_STATEMENT_FOOTER', 'Standard Statement Footer',
   'Statement footer with contact and reference',
   'STATEMENT_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":true,"mobile":false},"padding":{"top":8,"right":24,"bottom":12,"left":24},"columns":[{"id":"c1","width":100,"align":"center","components":[{"id":"cmp1","type":"divider"},{"id":"cmp2","type":"org_contact","fields":["phone","email","website"]},{"id":"cmp3","type":"custom_text","text":"Page {{page}} of {{pages}}","style":"small"}]}]}]}'::jsonb),

  ('STD_IN_APP_HEADER', 'Standard In-App Header',
   'Compact header for in-app notifications',
   'IN_APP_HEADER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":false,"mobile":true},"padding":{"top":8,"right":12,"bottom":4,"left":12},"columns":[{"id":"c1","width":100,"align":"left","components":[{"id":"cmp1","type":"org_name","style":"small"}]}]}]}'::jsonb),

  ('STD_IN_APP_FOOTER', 'Standard In-App Footer',
   'Compact footer for in-app notifications',
   'IN_APP_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":false,"mobile":true},"padding":{"top":4,"right":12,"bottom":8,"left":12},"columns":[{"id":"c1","width":100,"align":"left","components":[{"id":"cmp1","type":"custom_text","text":"View details in the portal","style":"small"}]}]}]}'::jsonb),

  ('STD_SMS_FOOTER', 'Standard SMS Footer',
   'Short signature line for SMS',
   'SMS_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":false,"mobile":true},"padding":{"top":0,"right":0,"bottom":0,"left":0},"columns":[{"id":"c1","width":100,"align":"left","components":[{"id":"cmp1","type":"custom_text","text":"- {{org.name}}","style":"body"}]}]}]}'::jsonb),

  ('STD_WHATSAPP_FOOTER', 'Standard WhatsApp Footer',
   'Signature block for WhatsApp',
   'WHATSAPP_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":false,"mobile":true},"padding":{"top":0,"right":0,"bottom":0,"left":0},"columns":[{"id":"c1","width":100,"align":"left","components":[{"id":"cmp1","type":"custom_text","text":"— {{org.name}} · {{org.phone}}","style":"body"}]}]}]}'::jsonb),

  ('STD_PUSH_FOOTER', 'Standard Push Footer',
   'Optional push notification tagline',
   'PUSH_FOOTER', true, true,
   '{"version":1,"rows":[{"id":"r1","visibility":{"email":false,"print":false,"mobile":true},"padding":{"top":0,"right":0,"bottom":0,"left":0},"columns":[{"id":"c1","width":100,"align":"left","components":[{"id":"cmp1","type":"custom_text","text":"{{org.name}}","style":"small"}]}]}]}'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Backfill existing base layouts to reference matching standard blocks
-- ============================================================
UPDATE public.core_template_layout ctl
SET header_block_id = b.id
FROM public.comm_layout_block b
WHERE ctl.header_block_id IS NULL
  AND b.code = CASE ctl.layout_kind
    WHEN 'EMAIL' THEN 'STD_EMAIL_HEADER'
    WHEN 'LETTERHEAD' THEN 'STD_DOCUMENT_HEADER'
    WHEN 'LETTER' THEN 'STD_LETTER_HEADER'
    WHEN 'NOTICE' THEN 'STD_NOTICE_HEADER'
    WHEN 'REPORT' THEN 'STD_REPORT_HEADER'
    WHEN 'RECEIPT' THEN 'STD_RECEIPT_HEADER'
    WHEN 'CERTIFICATE' THEN 'STD_CERTIFICATE_HEADER'
    WHEN 'STATEMENT' THEN 'STD_STATEMENT_HEADER'
    WHEN 'IN_APP' THEN 'STD_IN_APP_HEADER'
    ELSE NULL
  END;

UPDATE public.core_template_layout ctl
SET footer_block_id = b.id
FROM public.comm_layout_block b
WHERE ctl.footer_block_id IS NULL
  AND b.code = CASE ctl.layout_kind
    WHEN 'EMAIL' THEN 'STD_EMAIL_FOOTER'
    WHEN 'LETTERHEAD' THEN 'STD_DOCUMENT_FOOTER'
    WHEN 'LETTER' THEN 'STD_LETTER_FOOTER'
    WHEN 'NOTICE' THEN 'STD_NOTICE_FOOTER'
    WHEN 'REPORT' THEN 'STD_REPORT_FOOTER'
    WHEN 'RECEIPT' THEN 'STD_RECEIPT_FOOTER'
    WHEN 'CERTIFICATE' THEN 'STD_CERTIFICATE_FOOTER'
    WHEN 'STATEMENT' THEN 'STD_STATEMENT_FOOTER'
    WHEN 'IN_APP' THEN 'STD_IN_APP_FOOTER'
    WHEN 'SMS' THEN 'STD_SMS_FOOTER'
    WHEN 'WHATSAPP' THEN 'STD_WHATSAPP_FOOTER'
    WHEN 'PUSH' THEN 'STD_PUSH_FOOTER'
    ELSE NULL
  END;
