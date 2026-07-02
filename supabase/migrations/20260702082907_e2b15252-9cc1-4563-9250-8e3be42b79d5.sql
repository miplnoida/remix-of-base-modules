ALTER TABLE public.core_template_layout
  ADD COLUMN IF NOT EXISTS logo_asset_id uuid NULL REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS header_asset_id uuid NULL REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS footer_asset_id uuid NULL REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS letterhead_id uuid NULL REFERENCES public.comm_letterhead(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_signature_id uuid NULL REFERENCES public.comm_email_signature(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS print_footer_id uuid NULL REFERENCES public.comm_print_footer(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disclaimer_text_block_code text NULL,
  ADD COLUMN IF NOT EXISTS theme_id uuid NULL REFERENCES public.app_themes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS font_family_code text NULL;

CREATE INDEX IF NOT EXISTS idx_ctl_logo_asset       ON public.core_template_layout(logo_asset_id);
CREATE INDEX IF NOT EXISTS idx_ctl_header_asset     ON public.core_template_layout(header_asset_id);
CREATE INDEX IF NOT EXISTS idx_ctl_footer_asset     ON public.core_template_layout(footer_asset_id);
CREATE INDEX IF NOT EXISTS idx_ctl_letterhead       ON public.core_template_layout(letterhead_id);
CREATE INDEX IF NOT EXISTS idx_ctl_email_signature  ON public.core_template_layout(email_signature_id);
CREATE INDEX IF NOT EXISTS idx_ctl_print_footer     ON public.core_template_layout(print_footer_id);
CREATE INDEX IF NOT EXISTS idx_ctl_theme            ON public.core_template_layout(theme_id);