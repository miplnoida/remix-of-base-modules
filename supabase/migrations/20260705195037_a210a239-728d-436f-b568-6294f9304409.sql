
-- ============================================================
-- Epic 2.7 — Communication & Correspondence Domain Pack
-- Additive ssp_* reference tables. No changes to legacy comm_* /
-- notification_* / BN / Legal / Compliance / BEMA / IA tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ssp_communication_channel (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text NOT NULL UNIQUE,
  name         text NOT NULL,
  category     text NOT NULL,               -- DIGITAL / PHYSICAL / PORTAL / VOICE
  is_two_way   boolean NOT NULL DEFAULT false,
  supports_attachments boolean NOT NULL DEFAULT false,
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_communication_channel TO authenticated;
GRANT SELECT ON public.ssp_communication_channel TO anon;
GRANT ALL    ON public.ssp_communication_channel TO service_role;

CREATE TABLE IF NOT EXISTS public.ssp_correspondence_type (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  category      text NOT NULL,              -- NOTICE / LETTER / STATEMENT / RECEIPT / REMINDER / LEGAL
  legal_binding boolean NOT NULL DEFAULT false,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_correspondence_type TO authenticated;
GRANT SELECT ON public.ssp_correspondence_type TO anon;
GRANT ALL    ON public.ssp_correspondence_type TO service_role;

CREATE TABLE IF NOT EXISTS public.ssp_recipient_preference (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_kind      text NOT NULL,            -- PERSON / ORGANISATION
  party_source    text NOT NULL,            -- ip_master / er_master / ssp_party
  party_ref       text NOT NULL,            -- legacy_ref from projection
  channel_code    text NOT NULL REFERENCES public.ssp_communication_channel(code),
  is_preferred    boolean NOT NULL DEFAULT false,
  opt_in          boolean NOT NULL DEFAULT true,
  opt_out_reason  text,
  effective_from  date,
  effective_to    date,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (party_source, party_ref, channel_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_recipient_preference TO authenticated;
GRANT SELECT ON public.ssp_recipient_preference TO anon;
GRANT ALL    ON public.ssp_recipient_preference TO service_role;

CREATE TABLE IF NOT EXISTS public.ssp_correspondence_template_binding (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_code   text NOT NULL REFERENCES public.ssp_correspondence_type(code),
  channel_code          text NOT NULL REFERENCES public.ssp_communication_channel(code),
  template_source       text NOT NULL DEFAULT 'notification_templates',
  template_ref          text NOT NULL,     -- e.g. notification_templates.id or core_template.id
  language_code         text NOT NULL DEFAULT 'en',
  country_code          text,
  is_default            boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (correspondence_code, channel_code, language_code, country_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_correspondence_template_binding TO authenticated;
GRANT SELECT ON public.ssp_correspondence_template_binding TO anon;
GRANT ALL    ON public.ssp_correspondence_template_binding TO service_role;

CREATE TABLE IF NOT EXISTS public.ssp_correspondence_legal_ref (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_code   text NOT NULL REFERENCES public.ssp_correspondence_type(code),
  legal_reference_code  text NOT NULL,    -- refers to ssp_legal_reference.code
  country_code          text,
  citation              text,
  notes                 text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (correspondence_code, legal_reference_code, country_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_correspondence_legal_ref TO authenticated;
GRANT SELECT ON public.ssp_correspondence_legal_ref TO anon;
GRANT ALL    ON public.ssp_correspondence_legal_ref TO service_role;

CREATE TABLE IF NOT EXISTS public.ssp_delivery_status_ref (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  category      text NOT NULL,             -- QUEUED / SENT / DELIVERED / FAILED / BOUNCED / READ / OPTED_OUT
  is_terminal   boolean NOT NULL DEFAULT false,
  is_success    boolean NOT NULL DEFAULT false,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_delivery_status_ref TO authenticated;
GRANT SELECT ON public.ssp_delivery_status_ref TO anon;
GRANT ALL    ON public.ssp_delivery_status_ref TO service_role;

CREATE TABLE IF NOT EXISTS public.ssp_external_provider_code (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code   text NOT NULL REFERENCES public.ssp_communication_channel(code),
  provider_name  text NOT NULL,
  provider_code  text NOT NULL,
  internal_code  text NOT NULL,           -- maps to ssp_delivery_status_ref.code OR correspondence_type.code
  code_type      text NOT NULL DEFAULT 'status',  -- status | correspondence | channel
  description    text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_code, provider_name, provider_code, code_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssp_external_provider_code TO authenticated;
GRANT SELECT ON public.ssp_external_provider_code TO anon;
GRANT ALL    ON public.ssp_external_provider_code TO service_role;

-- ---------- baseline seed ----------
INSERT INTO public.ssp_communication_channel (code, name, category, is_two_way, supports_attachments, sort_order) VALUES
  ('EMAIL',   'Email',   'DIGITAL',  true,  true,  10),
  ('SMS',     'SMS',     'DIGITAL',  true,  false, 20),
  ('LETTER',  'Letter (Post)',  'PHYSICAL', false, true,  30),
  ('PORTAL',  'Self-Service Portal', 'PORTAL', true, true, 40),
  ('WHATSAPP','WhatsApp','DIGITAL',  true,  true,  50),
  ('VOICE',   'Voice Call','VOICE',  true,  false, 60),
  ('IN_APP',  'In-App Notification','PORTAL',true,false, 70)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_correspondence_type (code, name, category, legal_binding, sort_order) VALUES
  ('NOTICE_COMPLIANCE',   'Compliance Notice',       'NOTICE',    true,  10),
  ('NOTICE_LEGAL',        'Legal Notice',            'LEGAL',     true,  20),
  ('LETTER_GENERAL',      'General Letter',          'LETTER',    false, 30),
  ('STATEMENT_CONTRIB',   'Contribution Statement',  'STATEMENT', false, 40),
  ('RECEIPT_PAYMENT',     'Payment Receipt',         'RECEIPT',   false, 50),
  ('REMINDER_FILING',     'Filing Reminder',         'REMINDER',  false, 60),
  ('BENEFIT_AWARD',       'Benefit Award Letter',    'LETTER',    true,  70),
  ('BENEFIT_DECISION',    'Benefit Decision Notice', 'NOTICE',    true,  80)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ssp_delivery_status_ref (code, name, category, is_terminal, is_success, sort_order) VALUES
  ('QUEUED',    'Queued',       'QUEUED',    false, false, 10),
  ('SENT',      'Sent',         'SENT',      false, true,  20),
  ('DELIVERED', 'Delivered',    'DELIVERED', true,  true,  30),
  ('READ',      'Read/Opened',  'READ',      true,  true,  40),
  ('FAILED',    'Failed',       'FAILED',    true,  false, 50),
  ('BOUNCED',   'Bounced',      'BOUNCED',   true,  false, 60),
  ('OPTED_OUT', 'Recipient Opted Out','OPTED_OUT', true, false, 70),
  ('EXPIRED',   'Expired',      'FAILED',    true,  false, 80)
ON CONFLICT (code) DO NOTHING;

-- ---------- app_modules registration ----------
INSERT INTO public.app_modules (id, name, display_name, description, route, parent_id, sort_order, is_enabled, show_in_menu, rollout_state)
VALUES (
  '2c2c0000-0000-4000-8000-000000000270',
  'communication_domain',
  'Communication & Correspondence Domain',
  'Shared communication/correspondence foundation: channels, correspondence types, recipient preferences, template bindings, legal notice mapping, delivery statuses and provider code mapping. Consumed by BN, Claims, Compliance, Legal, Member, Employer, Finance, HRMS and Portals.',
  '/admin/communication-domain',
  'aab5fcb8-51fb-4a5c-8a87-6cef31068b47',
  80,
  true,
  true,
  'public'
) ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      route        = EXCLUDED.route,
      parent_id    = EXCLUDED.parent_id,
      description  = EXCLUDED.description,
      updated_at   = now();

-- module_actions
WITH m AS (SELECT id FROM public.app_modules WHERE name = 'communication_domain')
INSERT INTO public.module_actions (module_id, action_name, display_name)
SELECT m.id, a.action_name, a.display_name
FROM m
CROSS JOIN (VALUES
  ('view',   'View'),
  ('manage', 'Manage'),
  ('admin',  'Admin'),
  ('import', 'Import'),
  ('export', 'Export')
) AS a(action_name, display_name)
ON CONFLICT (module_id, action_name) DO NOTHING;

-- role_permissions for Admin and Application Admin
INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, ma.module_id, ma.id, true
FROM public.module_actions ma
JOIN public.app_modules am ON am.id = ma.module_id AND am.name = 'communication_domain'
JOIN public.roles r ON r.role_name IN ('Admin','Application Admin')
ON CONFLICT (role_id, module_id, action_id) DO NOTHING;

-- ---------- Enterprise Capability Registry ----------
INSERT INTO public.enterprise_capability_registry
  (capability_key, capability_name, category, grouping, owner, status,
   canonical_route, menu_module_name, permission_hint,
   consumers, dependencies, description, is_active, sort_order)
VALUES (
  'communication_domain',
  'Communication & Correspondence Domain',
  'shared_domain',
  'Shared Domains',
  'Platform',
  'active',
  '/admin/communication-domain',
  'communication_domain',
  'communication_domain.view',
  ARRAY['bn','claims','compliance','legal','employer','member','finance','hrms','portals'],
  ARRAY['participant_domain','identity_domain','legal_reference_domain','reference_framework','notification_templates'],
  'Shared communication foundation (channels, correspondence types, recipient preferences, template bindings, legal-notice mapping, delivery statuses, provider codes). Reuses existing notification_templates and comm_* assets. Consumes Participant facade for recipient resolution.',
  true,
  85
) ON CONFLICT (capability_key) DO UPDATE
  SET consumers      = EXCLUDED.consumers,
      dependencies   = EXCLUDED.dependencies,
      canonical_route = EXCLUDED.canonical_route,
      updated_at     = now();
