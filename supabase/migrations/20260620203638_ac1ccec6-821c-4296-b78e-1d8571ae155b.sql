
-- Stage 1: Template Framework Foundation

-- 1. Category master
CREATE TABLE IF NOT EXISTS public.core_template_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  module_code text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_category TO authenticated;
GRANT ALL ON public.core_template_category TO service_role;
ALTER TABLE public.core_template_category ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_template_category_all ON public.core_template_category FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Channel master
CREATE TABLE IF NOT EXISTS public.core_template_channel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  channel_group text NOT NULL, -- DOCUMENT, DIGITAL, REGULATORY, INTEGRATION
  format text NOT NULL,        -- HTML, PDF, TEXT, JSON, XML, DOCX
  max_length int,
  supports_attachments boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_channel TO authenticated;
GRANT ALL ON public.core_template_channel TO service_role;
ALTER TABLE public.core_template_channel ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_template_channel_all ON public.core_template_channel FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Channel variant (per template-version × channel)
CREATE TABLE IF NOT EXISTS public.core_template_channel_variant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.core_template_version(id) ON DELETE CASCADE,
  channel_code text NOT NULL REFERENCES public.core_template_channel(code) ON DELETE RESTRICT,
  subject text,
  body_html text,
  body_text text,
  payload_schema jsonb,
  attachments_policy text, -- NONE / OPTIONAL / REQUIRED
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_version_id, channel_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_channel_variant TO authenticated;
GRANT ALL ON public.core_template_channel_variant TO service_role;
ALTER TABLE public.core_template_channel_variant ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_template_channel_variant_all ON public.core_template_channel_variant FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Approval audit
CREATE TABLE IF NOT EXISTS public.core_template_approval (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.core_template_version(id) ON DELETE CASCADE,
  action text NOT NULL, -- SUBMIT_REVIEW, APPROVE, REJECT, PUBLISH, RETIRE, ROLLBACK
  from_state text,
  to_state text NOT NULL,
  actor_user_code text,
  notes text,
  acted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.core_template_approval TO authenticated;
GRANT ALL ON public.core_template_approval TO service_role;
ALTER TABLE public.core_template_approval ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_template_approval_all ON public.core_template_approval FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Variable binding per template version
CREATE TABLE IF NOT EXISTS public.core_template_variable_binding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.core_template_version(id) ON DELETE CASCADE,
  token_code text NOT NULL REFERENCES public.core_template_token(token_code) ON DELETE RESTRICT,
  is_required boolean NOT NULL DEFAULT false,
  default_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_version_id, token_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_variable_binding TO authenticated;
GRANT ALL ON public.core_template_variable_binding TO service_role;
ALTER TABLE public.core_template_variable_binding ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_template_variable_binding_all ON public.core_template_variable_binding FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Localization
CREATE TABLE IF NOT EXISTS public.core_template_localization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id uuid NOT NULL REFERENCES public.core_template_version(id) ON DELETE CASCADE,
  locale text NOT NULL,
  subject text,
  body_html text,
  body_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_version_id, locale)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_localization TO authenticated;
GRANT ALL ON public.core_template_localization TO service_role;
ALTER TABLE public.core_template_localization ENABLE ROW LEVEL SECURITY;
CREATE POLICY core_template_localization_all ON public.core_template_localization FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Extend core_template
ALTER TABLE public.core_template
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.core_template_category(id),
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'COUNTRY',
  ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES public.core_template(id) ON DELETE SET NULL;

-- 8. Extend core_template_token with grouping
ALTER TABLE public.core_template_token
  ADD COLUMN IF NOT EXISTS token_group text,
  ADD COLUMN IF NOT EXISTS data_type text DEFAULT 'string',
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT false;

-- Backfill token_group from token_code prefix (text before first dot)
UPDATE public.core_template_token
SET token_group = split_part(token_code, '.', 1)
WHERE token_group IS NULL;

-- 9. Extend core_generated_document for channel + delivery + immutability
ALTER TABLE public.core_generated_document
  ADD COLUMN IF NOT EXISTS channel_code text REFERENCES public.core_template_channel(code),
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS recipient_address text,
  ADD COLUMN IF NOT EXISTS content_hash text;

-- 10. Seed channels
INSERT INTO public.core_template_channel (code, name, channel_group, format, supports_attachments, sort_order) VALUES
  ('PDF','PDF Document','DOCUMENT','PDF',false,10),
  ('DOCX','Word Document','DOCUMENT','DOCX',false,11),
  ('PRINT_LETTER','Printable Letter','DOCUMENT','PDF',false,12),
  ('ORDER','Generated Order','DOCUMENT','PDF',false,13),
  ('DECISION','Generated Decision','DOCUMENT','PDF',false,14),
  ('JUDGMENT','Generated Judgment','DOCUMENT','PDF',false,15),
  ('NOTICE_DOC','Generated Notice','DOCUMENT','PDF',false,16),
  ('CERTIFICATE','Generated Certificate','DOCUMENT','PDF',false,17),
  ('EMAIL','Email','DIGITAL','HTML',true,20),
  ('SMS','SMS','DIGITAL','TEXT',false,21),
  ('PUSH','Push Notification','DIGITAL','TEXT',false,22),
  ('WHATSAPP','WhatsApp','DIGITAL','TEXT',true,23),
  ('IN_APP','In-App Notification','DIGITAL','HTML',false,24),
  ('PORTAL_MSG','Portal Message','DIGITAL','HTML',false,25),
  ('COMPLIANCE_FILING','Compliance Filing','REGULATORY','PDF',true,30),
  ('REG_SUBMISSION','Regulatory Submission','REGULATORY','PDF',true,31),
  ('GOV_NOTICE','Government Notice','REGULATORY','PDF',false,32),
  ('OFFICIAL_PUB','Official Publication','REGULATORY','PDF',false,33),
  ('API_PAYLOAD','API Payload','INTEGRATION','JSON',false,40),
  ('JSON_EXPORT','JSON Export','INTEGRATION','JSON',false,41),
  ('XML_EXPORT','XML Export','INTEGRATION','XML',false,42),
  ('PARTNER_DELIVERY','External Partner Delivery','INTEGRATION','JSON',true,43)
ON CONFLICT (code) DO NOTHING;

-- 11. Seed categories (Legal + BN + CE)
INSERT INTO public.core_template_category (code, name, module_code, sort_order) VALUES
  ('LG_COURT','Court & Hearing','LEGAL',10),
  ('LG_DEMAND','Demand','LEGAL',20),
  ('LG_ENFORCEMENT','Enforcement','LEGAL',30),
  ('LG_SETTLEMENT','Settlement','LEGAL',40),
  ('LG_INTERNAL','Internal','LEGAL',50),
  ('LG_HEARING','Hearing','LEGAL',60),
  ('LG_JUDGMENT','Judgment','LEGAL',70),
  ('LG_FEES','Fees & Waivers','LEGAL',80),
  ('LG_CLOSURE','Closure','LEGAL',90),
  ('LG_NOTICE','Legal Notice','LEGAL',100),
  ('LG_PRELEGAL','Pre-Legal','LEGAL',110),
  ('LG_ORDER','Order','LEGAL',120),
  ('LG_DECISION','Decision','LEGAL',130),
  ('LG_APPEAL','Appeal','LEGAL',140),
  ('LG_CERTIFICATE','Certificate','LEGAL',150),
  ('LG_CORRESPONDENCE','Correspondence','LEGAL',160),
  ('BN_AWARD','Benefit Award','BN',200),
  ('BN_PAYMENT','Benefit Payment','BN',210),
  ('BN_REVIEW','Benefit Review','BN',220),
  ('BN_RECOVERY','Benefit Recovery','BN',230),
  ('CE_WARNING','Compliance Warning','CE',300),
  ('CE_INVESTIGATION','Compliance Investigation','CE',310),
  ('CE_FINDING','Compliance Finding','CE',320),
  ('CE_AUDIT','Compliance Audit','CE',330),
  ('CE_REMEDIATION','Compliance Remediation','CE',340)
ON CONFLICT (code) DO NOTHING;

-- 12. Backfill core_template.category_id from existing free-text template_category (case-insensitive)
UPDATE public.core_template t SET category_id = c.id
FROM public.core_template_category c
WHERE t.category_id IS NULL
  AND t.module_code = 'LEGAL'
  AND (
    (upper(t.template_category) = 'COURT' AND c.code = 'LG_COURT') OR
    (upper(t.template_category) = 'DEMAND' AND c.code = 'LG_DEMAND') OR
    (upper(t.template_category) = 'ENFORCEMENT' AND c.code = 'LG_ENFORCEMENT') OR
    (upper(t.template_category) = 'SETTLEMENT' AND c.code = 'LG_SETTLEMENT') OR
    (upper(t.template_category) = 'INTERNAL' AND c.code = 'LG_INTERNAL') OR
    (upper(t.template_category) = 'HEARING' AND c.code = 'LG_HEARING') OR
    (upper(t.template_category) = 'JUDGMENT' AND c.code = 'LG_JUDGMENT') OR
    (upper(t.template_category) IN ('FEE','FEES') AND c.code = 'LG_FEES') OR
    (upper(t.template_category) = 'WAIVER' AND c.code = 'LG_FEES') OR
    (upper(t.template_category) = 'CLOSURE' AND c.code = 'LG_CLOSURE') OR
    (upper(t.template_category) = 'NOTICE' AND c.code = 'LG_NOTICE') OR
    (upper(t.template_category) = 'PRE_LEGAL' AND c.code = 'LG_PRELEGAL') OR
    (upper(t.template_category) = 'COURT & HEARING' AND c.code = 'LG_COURT')
  );

-- 13. Backfill default PDF channel variant for every existing published version
INSERT INTO public.core_template_channel_variant (template_version_id, channel_code, subject, body_html, body_text, is_default)
SELECT v.id, 'PDF', v.subject, v.body_html, v.body_text, true
FROM public.core_template_version v
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_template_channel_variant cv
  WHERE cv.template_version_id = v.id AND cv.channel_code = 'PDF'
);

-- 14. Backfill channel_code on existing generated documents (PDF default)
UPDATE public.core_generated_document SET channel_code = 'PDF' WHERE channel_code IS NULL;
