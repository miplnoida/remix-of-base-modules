
-- 1. core_template_layout: layout_kind + email shell fields
ALTER TABLE public.core_template_layout
  ADD COLUMN IF NOT EXISTS layout_kind text NOT NULL DEFAULT 'LETTERHEAD',
  ADD COLUMN IF NOT EXISTS email_max_width int,
  ADD COLUMN IF NOT EXISTS email_background_hex text,
  ADD COLUMN IF NOT EXISTS email_font_family text,
  ADD COLUMN IF NOT EXISTS email_button_style_json jsonb,
  ADD COLUMN IF NOT EXISTS email_divider_style_json jsonb,
  ADD COLUMN IF NOT EXISTS body_placeholder_html text,
  ADD COLUMN IF NOT EXISTS signature_slot text,
  ADD COLUMN IF NOT EXISTS footer_slot text,
  ADD COLUMN IF NOT EXISTS disclaimer_slot text,
  ADD COLUMN IF NOT EXISTS logo_position text,
  ADD COLUMN IF NOT EXISTS mobile_responsive boolean NOT NULL DEFAULT true;

ALTER TABLE public.core_template_layout
  DROP CONSTRAINT IF EXISTS core_template_layout_kind_chk;
ALTER TABLE public.core_template_layout
  ADD CONSTRAINT core_template_layout_kind_chk
  CHECK (layout_kind IN ('LETTERHEAD','EMAIL'));

CREATE INDEX IF NOT EXISTS idx_core_template_layout_kind
  ON public.core_template_layout(layout_kind);

-- 2. core_template: content-only email fields
ALTER TABLE public.core_template
  ADD COLUMN IF NOT EXISTS preheader text,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_href_token text,
  ADD COLUMN IF NOT EXISTS attachment_rules_json jsonb;

-- 3. core_organization: email branding defaults
ALTER TABLE public.core_organization
  ADD COLUMN IF NOT EXISTS default_email_layout_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_footer_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_disclaimer_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_sender_name text,
  ADD COLUMN IF NOT EXISTS default_email_reply_to text,
  ADD COLUMN IF NOT EXISTS default_email_language text;

-- 4. core_module_profile: email overrides + inheritance
ALTER TABLE public.core_module_profile
  ADD COLUMN IF NOT EXISTS default_email_layout_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_footer_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_disclaimer_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_sender_name text,
  ADD COLUMN IF NOT EXISTS default_email_reply_to text,
  ADD COLUMN IF NOT EXISTS default_email_language text,
  ADD COLUMN IF NOT EXISTS inherit_email_layout_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_footer_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_disclaimer_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_sender_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_language_from_org boolean NOT NULL DEFAULT true;

-- 5. core_department_profile: email overrides + inheritance
ALTER TABLE public.core_department_profile
  ADD COLUMN IF NOT EXISTS default_email_layout_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_footer_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_disclaimer_id uuid,
  ADD COLUMN IF NOT EXISTS default_email_sender_name text,
  ADD COLUMN IF NOT EXISTS default_email_reply_to text,
  ADD COLUMN IF NOT EXISTS default_email_language text,
  ADD COLUMN IF NOT EXISTS inherit_email_layout_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_footer_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_disclaimer_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_sender_from_org boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS inherit_email_language_from_org boolean NOT NULL DEFAULT true;

-- 6. Seed six standard email base layouts (idempotent by code)
INSERT INTO public.core_template_layout
  (code, name, description, layout_kind, is_base_layout, is_active,
   header_html, footer_html, body_placeholder_html,
   signature_slot, footer_slot, disclaimer_slot, logo_position,
   email_max_width, email_background_hex, email_font_family,
   email_button_style_json, email_divider_style_json, mobile_responsive)
VALUES
  ('BASE_EMAIL_GOVERNMENT','Government Email','Formal government email shell','EMAIL',true,true,
   '<div style="padding:24px;background:#0f3460;color:#fff"><img src="{{asset.PRIMARY_LOGO}}" alt="Logo" style="height:48px"/><div style="font-size:18px;margin-top:8px">{{org.name}}</div></div>',
   '<div style="padding:16px 24px;background:#f5f5f5;color:#666;font-size:12px">{{FOOTER_BLOCK}}</div>',
   '<div style="padding:24px;color:#222">{{BODY}}</div>',
   '{{SIGNATURE_BLOCK}}','{{FOOTER_BLOCK}}','{{DISCLAIMER_BLOCK}}','header-left',
   640,'#ffffff','Arial, Helvetica, sans-serif',
   '{"bg":"#0f3460","fg":"#ffffff","radius":4,"padding":"12px 20px"}'::jsonb,
   '{"color":"#e5e5e5","height":1}'::jsonb, true),
  ('BASE_EMAIL_MINIMAL','Minimal Email','Clean minimal shell','EMAIL',true,true,
   '<div style="padding:16px 0"><img src="{{asset.PRIMARY_LOGO}}" alt="Logo" style="height:32px"/></div>',
   '<div style="padding:12px 0;color:#888;font-size:11px">{{FOOTER_BLOCK}}</div>',
   '<div style="padding:8px 0;color:#222">{{BODY}}</div>',
   '{{SIGNATURE_BLOCK}}','{{FOOTER_BLOCK}}','{{DISCLAIMER_BLOCK}}','header-left',
   600,'#ffffff','Helvetica, Arial, sans-serif',
   '{"bg":"#222","fg":"#fff","radius":2,"padding":"10px 16px"}'::jsonb,
   '{"color":"#eee","height":1}'::jsonb, true),
  ('BASE_EMAIL_ALERT','Alert Email','Urgent/alert shell','EMAIL',true,true,
   '<div style="padding:20px;background:#c0392b;color:#fff"><strong>{{org.name}}</strong> — Important Notice</div>',
   '<div style="padding:16px;background:#fff3f0;color:#666;font-size:12px">{{FOOTER_BLOCK}}</div>',
   '<div style="padding:20px;color:#222">{{BODY}}</div>',
   '{{SIGNATURE_BLOCK}}','{{FOOTER_BLOCK}}','{{DISCLAIMER_BLOCK}}','header-left',
   640,'#ffffff','Arial, sans-serif',
   '{"bg":"#c0392b","fg":"#fff","radius":4,"padding":"12px 20px"}'::jsonb,
   '{"color":"#e5b3ad","height":1}'::jsonb, true),
  ('BASE_EMAIL_RECEIPT','Receipt Email','Payment receipt shell','EMAIL',true,true,
   '<div style="padding:20px;background:#065f46;color:#fff"><img src="{{asset.PRIMARY_LOGO}}" alt="Logo" style="height:40px"/><div style="font-size:16px;margin-top:6px">Payment Receipt</div></div>',
   '<div style="padding:16px;background:#f0fdf4;color:#555;font-size:12px">{{FOOTER_BLOCK}}</div>',
   '<div style="padding:20px;color:#222">{{BODY}}</div>',
   '{{SIGNATURE_BLOCK}}','{{FOOTER_BLOCK}}','{{DISCLAIMER_BLOCK}}','header-left',
   640,'#ffffff','Arial, sans-serif',
   '{"bg":"#065f46","fg":"#fff","radius":4,"padding":"12px 20px"}'::jsonb,
   '{"color":"#d1fae5","height":1}'::jsonb, true),
  ('BASE_EMAIL_LEGAL','Legal Email','Legal correspondence shell','EMAIL',true,true,
   '<div style="padding:24px;background:#111;color:#fff;border-bottom:3px solid #b8860b"><img src="{{asset.PRIMARY_LOGO}}" alt="Logo" style="height:44px"/><div style="font-size:18px;margin-top:8px">{{org.name}} — Legal</div></div>',
   '<div style="padding:16px;background:#fafafa;color:#555;font-size:11px">{{FOOTER_BLOCK}} {{DISCLAIMER_BLOCK}}</div>',
   '<div style="padding:24px;color:#111;font-family:Georgia,serif">{{BODY}}</div>',
   '{{SIGNATURE_BLOCK}}','{{FOOTER_BLOCK}}','{{DISCLAIMER_BLOCK}}','header-left',
   680,'#ffffff','Georgia, serif',
   '{"bg":"#111","fg":"#fff","radius":0,"padding":"12px 24px"}'::jsonb,
   '{"color":"#b8860b","height":2}'::jsonb, true),
  ('BASE_EMAIL_REPORT','Report Email','Report distribution shell','EMAIL',true,true,
   '<div style="padding:20px;background:#1e3a8a;color:#fff"><img src="{{asset.PRIMARY_LOGO}}" alt="Logo" style="height:40px"/><div style="font-size:16px;margin-top:6px">Report</div></div>',
   '<div style="padding:16px;background:#eff6ff;color:#555;font-size:12px">{{FOOTER_BLOCK}}</div>',
   '<div style="padding:20px;color:#222">{{BODY}}</div>',
   '{{SIGNATURE_BLOCK}}','{{FOOTER_BLOCK}}','{{DISCLAIMER_BLOCK}}','header-left',
   720,'#ffffff','Arial, sans-serif',
   '{"bg":"#1e3a8a","fg":"#fff","radius":4,"padding":"12px 20px"}'::jsonb,
   '{"color":"#dbeafe","height":1}'::jsonb, true)
ON CONFLICT (code) DO UPDATE SET
  layout_kind='EMAIL',
  is_base_layout=true,
  updated_at=now();

-- 7. Set organization default email layout to Government where unset
UPDATE public.core_organization
   SET default_email_layout_id = l.id
  FROM public.core_template_layout l
 WHERE l.code = 'BASE_EMAIL_GOVERNMENT'
   AND public.core_organization.default_email_layout_id IS NULL;
