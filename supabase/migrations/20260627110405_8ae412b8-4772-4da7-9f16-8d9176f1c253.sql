
-- Phase 4: Enterprise Communication Framework schema
-- NO-RLS Architecture per project standard; auth enforced at app/edge layer.

-- =====================================================================
-- 1. core_communication_profile
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.core_communication_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  owner_scope TEXT NOT NULL DEFAULT 'GLOBAL'
    CHECK (owner_scope IN ('GLOBAL','ORGANIZATION','MODULE','DEPARTMENT','LOCATION','USER')),
  parent_id UUID REFERENCES public.core_communication_profile(id) ON DELETE SET NULL,
  module_code TEXT,
  department_code TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_communication_profile TO authenticated;
GRANT SELECT ON public.core_communication_profile TO anon;
GRANT ALL ON public.core_communication_profile TO service_role;
CREATE INDEX IF NOT EXISTS idx_ccp_parent ON public.core_communication_profile(parent_id);
CREATE INDEX IF NOT EXISTS idx_ccp_scope ON public.core_communication_profile(owner_scope, module_code, department_code);

-- =====================================================================
-- 2. core_document_profile
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.core_document_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  document_kind TEXT NOT NULL
    CHECK (document_kind IN ('RECEIPT','CERTIFICATE','STATEMENT','LETTER','NOTICE','MEMO')),
  owner_scope TEXT NOT NULL DEFAULT 'GLOBAL'
    CHECK (owner_scope IN ('GLOBAL','ORGANIZATION','MODULE','DEPARTMENT','LOCATION','USER')),
  parent_id UUID REFERENCES public.core_document_profile(id) ON DELETE SET NULL,
  module_code TEXT,
  department_code TEXT,
  numbering_sequence_id UUID,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_document_profile TO authenticated;
GRANT SELECT ON public.core_document_profile TO anon;
GRANT ALL ON public.core_document_profile TO service_role;
CREATE INDEX IF NOT EXISTS idx_cdp_parent ON public.core_document_profile(parent_id);
CREATE INDEX IF NOT EXISTS idx_cdp_kind ON public.core_document_profile(document_kind);

-- =====================================================================
-- 3. core_template — add inheritance + profile linkage
-- =====================================================================
ALTER TABLE public.core_template
  ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES public.core_template(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_scope TEXT NOT NULL DEFAULT 'GLOBAL'
    CHECK (owner_scope IN ('GLOBAL','ORGANIZATION','MODULE','DEPARTMENT','LOCATION','USER')),
  ADD COLUMN IF NOT EXISTS communication_profile_id UUID REFERENCES public.core_communication_profile(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_profile_id UUID REFERENCES public.core_document_profile(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_core_template_parent ON public.core_template(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_core_template_comm_profile ON public.core_template(communication_profile_id);
CREATE INDEX IF NOT EXISTS idx_core_template_doc_profile ON public.core_template(document_profile_id);

-- =====================================================================
-- 4. core_text_block — add code, scope, parent, body variants
-- =====================================================================
ALTER TABLE public.core_text_block
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'GLOBAL'
    CHECK (scope IN ('GLOBAL','ORGANIZATION','MODULE','DEPARTMENT','LOCATION','USER')),
  ADD COLUMN IF NOT EXISTS parent_text_block_id UUID REFERENCES public.core_text_block(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS body_md TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_text_block_code ON public.core_text_block(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_text_block_parent ON public.core_text_block(parent_text_block_id);

-- =====================================================================
-- 5. comm_disclaimer + comm_print_footer — FK to core_text_block
-- =====================================================================
ALTER TABLE public.comm_disclaimer
  ADD COLUMN IF NOT EXISTS text_block_id UUID REFERENCES public.core_text_block(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_comm_disclaimer_text_block ON public.comm_disclaimer(text_block_id);

ALTER TABLE public.comm_print_footer
  ADD COLUMN IF NOT EXISTS text_block_id UUID REFERENCES public.core_text_block(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_comm_print_footer_text_block ON public.comm_print_footer(text_block_id);

-- =====================================================================
-- 6. core_generated_document — track profile used at generation time
-- =====================================================================
ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS communication_profile_id UUID REFERENCES public.core_communication_profile(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_profile_id UUID REFERENCES public.core_document_profile(id) ON DELETE SET NULL;

-- =====================================================================
-- 7. updated_at triggers
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_ccp_updated_at ON public.core_communication_profile;
CREATE TRIGGER trg_ccp_updated_at BEFORE UPDATE ON public.core_communication_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cdp_updated_at ON public.core_document_profile;
CREATE TRIGGER trg_cdp_updated_at BEFORE UPDATE ON public.core_document_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 8. Seed Communication Profiles (11 codes)
-- =====================================================================
INSERT INTO public.core_communication_profile (code, name, description, owner_scope, config) VALUES
  ('STANDARD_LETTER','Standard Letter','Default letter profile with letterhead, signature, disclaimer, print footer','GLOBAL',
    '{"asset_categories":["letterhead","signature","stamp"],"text_block_codes":["STANDARD_DISCLAIMER","STANDARD_PRINT_FOOTER"],"default_channels":["PRINT","PDF","EMAIL"]}'),
  ('LEGAL_NOTICE','Legal Notice','Formal legal notice with legal disclaimer and official stamp','GLOBAL',
    '{"asset_categories":["letterhead","signature","stamp","seal"],"text_block_codes":["LEGAL_DISCLAIMER","LEGAL_PRINT_FOOTER"],"default_channels":["PRINT","PDF"]}'),
  ('BENEFIT_NOTICE','Benefit Notice','Benefit award/decision notice','GLOBAL',
    '{"asset_categories":["letterhead","signature"],"text_block_codes":["BENEFIT_DISCLAIMER","STANDARD_PRINT_FOOTER"],"default_channels":["PRINT","PDF","EMAIL"]}'),
  ('PAYMENT_NOTICE','Payment Notice','Payment demand / arrears notice','GLOBAL',
    '{"asset_categories":["letterhead","signature","stamp"],"text_block_codes":["PAYMENT_DISCLAIMER","STANDARD_PRINT_FOOTER"],"default_channels":["PRINT","PDF","EMAIL"]}'),
  ('CERTIFICATE','Certificate','Official certificate with seal and signature','GLOBAL',
    '{"asset_categories":["letterhead","signature","stamp","seal","watermark"],"text_block_codes":["CERTIFICATE_CLAUSE","CERTIFICATE_PRINT_FOOTER"],"default_channels":["PRINT","PDF"]}'),
  ('STATEMENT','Statement','Account / contribution statement','GLOBAL',
    '{"asset_categories":["letterhead","signature"],"text_block_codes":["STATEMENT_DISCLAIMER","STATEMENT_PRINT_FOOTER"],"default_channels":["PRINT","PDF","EMAIL"]}'),
  ('RECEIPT','Receipt','Payment receipt','GLOBAL',
    '{"asset_categories":["letterhead","stamp"],"text_block_codes":["RECEIPT_DISCLAIMER","RECEIPT_PRINT_FOOTER"],"default_channels":["PRINT","PDF","EMAIL"]}'),
  ('EMAIL','Email','Default email profile','GLOBAL',
    '{"asset_categories":["email_logo","email_signature"],"text_block_codes":["EMAIL_DISCLAIMER","EMAIL_FOOTER"],"default_channels":["EMAIL"]}'),
  ('SMS','SMS','SMS profile (no assets/HTML)','GLOBAL',
    '{"asset_categories":[],"text_block_codes":["SMS_FOOTER"],"default_channels":["SMS"]}'),
  ('PORTAL','Portal Message','In-app/portal message','GLOBAL',
    '{"asset_categories":["portal_logo"],"text_block_codes":["PORTAL_DISCLAIMER"],"default_channels":["PORTAL"]}'),
  ('MOBILE_PUSH','Mobile Push','Mobile push notification','GLOBAL',
    '{"asset_categories":["app_icon"],"text_block_codes":[],"default_channels":["MOBILE_PUSH"]}')
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- 9. Seed Document Profiles (6 kinds)
-- =====================================================================
INSERT INTO public.core_document_profile (code, name, document_kind, owner_scope, config) VALUES
  ('RECEIPT','Receipt','RECEIPT','GLOBAL',
    '{"asset_categories":["letterhead","stamp"],"text_block_codes":["RECEIPT_DISCLAIMER"],"features":{"duplicate":true,"cancel":true,"numbering":"strict"}}'),
  ('CERTIFICATE','Certificate','CERTIFICATE','GLOBAL',
    '{"asset_categories":["letterhead","signature","seal","watermark"],"text_block_codes":["CERTIFICATE_CLAUSE"],"features":{"qr_code":true,"expiry":true,"issuing_authority":true}}'),
  ('STATEMENT','Statement','STATEMENT','GLOBAL',
    '{"asset_categories":["letterhead","signature"],"text_block_codes":["STATEMENT_DISCLAIMER"],"features":{"period":true,"ageing":true,"balances":true}}'),
  ('LETTER','Letter','LETTER','GLOBAL',
    '{"asset_categories":["letterhead","signature"],"text_block_codes":["STANDARD_DISCLAIMER","STANDARD_PRINT_FOOTER"]}'),
  ('NOTICE','Notice','NOTICE','GLOBAL',
    '{"asset_categories":["letterhead","signature","stamp"],"text_block_codes":["LEGAL_DISCLAIMER","LEGAL_PRINT_FOOTER"]}'),
  ('MEMO','Memo','MEMO','GLOBAL',
    '{"asset_categories":["letterhead"],"text_block_codes":["STANDARD_PRINT_FOOTER"]}')
ON CONFLICT (code) DO NOTHING;
