
-- Domain registry
CREATE TABLE public.core_admin_domain_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_code text NOT NULL UNIQUE,
  domain_name text NOT NULL,
  description text,
  icon_name text,
  display_order integer DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_admin_domain_registry TO authenticated;
GRANT ALL ON public.core_admin_domain_registry TO service_role;
GRANT SELECT ON public.core_admin_domain_registry TO anon;

-- Route registry
CREATE TABLE public.core_admin_route_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_path text NOT NULL UNIQUE,
  page_name text NOT NULL,
  admin_domain text NOT NULL REFERENCES public.core_admin_domain_registry(domain_code),
  canonical_status text NOT NULL CHECK (canonical_status IN ('CANONICAL','LEGACY','REDIRECT','RETIRED','PLANNED')),
  replacement_route text,
  owner_module_code text NOT NULL DEFAULT 'CORE',
  owner_team text,
  description text,
  page_component text,
  source_file_path text,
  requires_permission text,
  show_in_platform_admin boolean NOT NULL DEFAULT true,
  display_order integer DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_route_path_starts_with_slash CHECK (route_path LIKE '/%'),
  CONSTRAINT admin_route_redirect_requires_replacement CHECK (
    canonical_status <> 'REDIRECT' OR (replacement_route IS NOT NULL AND replacement_route <> '')
  ),
  CONSTRAINT admin_route_show_requires_active CHECK (
    show_in_platform_admin = false OR is_active = true
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_admin_route_registry TO authenticated;
GRANT ALL ON public.core_admin_route_registry TO service_role;
GRANT SELECT ON public.core_admin_route_registry TO anon;

CREATE INDEX idx_core_admin_route_registry_domain ON public.core_admin_route_registry(admin_domain);
CREATE INDEX idx_core_admin_route_registry_status ON public.core_admin_route_registry(canonical_status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_core_admin_registry_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_core_admin_domain_registry_touch
BEFORE UPDATE ON public.core_admin_domain_registry
FOR EACH ROW EXECUTE FUNCTION public.tg_core_admin_registry_touch();

CREATE TRIGGER trg_core_admin_route_registry_touch
BEFORE UPDATE ON public.core_admin_route_registry
FOR EACH ROW EXECUTE FUNCTION public.tg_core_admin_registry_touch();

-- Seed domains
INSERT INTO public.core_admin_domain_registry (domain_code, domain_name, description, icon_name, display_order) VALUES
  ('ENTERPRISE_CONFIGURATION','Enterprise Configuration','Setup & readiness centre for enterprise policy and prerequisites','PackageCheck',10),
  ('ORGANISATION','Organisation','Organisation foundation: offices, departments, designations, calendar','Building2',20),
  ('PEOPLE_ACCESS','People & Access','User accounts, roles, permissions and delegated authority','Users',30),
  ('PLATFORM_SERVICES','Platform Services','Shared platform services: notifications, numbering, modules','Settings2',40),
  ('SECURITY','Security','Password policy, MFA, security policy and IP access','ShieldCheck',50),
  ('OPERATIONS','Operations','Cross-module workflows, scheduling and runtime health','Workflow',60),
  ('SHARED_DOMAINS','Shared Domains','Shared reference domains consumed by business modules','BookMarked',70),
  ('ENTERPRISE_CATALOGUE','Enterprise Catalogue','Registry of reusable enterprise capabilities','BookMarked',80),
  ('GOVERNANCE','Governance','Reference framework, system logs, audit and route governance','FileClock',90),
  ('MIGRATION','Migration','Data migration tools and history','Database',100),
  ('QUALITY','Quality','Platform readiness, release management, quality gates','PackageCheck',110);

-- Seed initial routes
INSERT INTO public.core_admin_route_registry (route_path, page_name, admin_domain, canonical_status, owner_module_code, description) VALUES
  ('/admin/platform','Platform Admin','GOVERNANCE','CANONICAL','CORE','Enterprise Administration landing'),
  ('/admin/configuration-centre','Configuration Centre','ENTERPRISE_CONFIGURATION','CANONICAL','CORE',NULL),
  ('/admin/ssb-setup','SSB Implementation Setup','ENTERPRISE_CONFIGURATION','CANONICAL','CORE',NULL),
  ('/admin/offices','Offices','ORGANISATION','CANONICAL','CORE',NULL),
  ('/admin/departments','Departments','ORGANISATION','CANONICAL','CORE',NULL),
  ('/admin/designations','Designations','ORGANISATION','CANONICAL','CORE',NULL),
  ('/admin/organisation-profile','Organisation Profile','ORGANISATION','CANONICAL','CORE',NULL),
  ('/admin/branding','Branding','ORGANISATION','CANONICAL','CORE',NULL),
  ('/admin/calendar-holidays','Calendar & Holidays','ORGANISATION','CANONICAL','CORE',NULL),
  ('/admin/users','Users','PEOPLE_ACCESS','CANONICAL','CORE',NULL),
  ('/admin/users/create','Create User','PEOPLE_ACCESS','CANONICAL','CORE',NULL),
  ('/admin/roles','Roles & Permissions','PEOPLE_ACCESS','CANONICAL','CORE',NULL),
  ('/admin/delegations','Delegations','PEOPLE_ACCESS','CANONICAL','CORE',NULL),
  ('/admin/notifications','Notifications','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/notification-templates','Notification Templates','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/notifications/channels','Notification Channels','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/notifications/providers','Notification Providers','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/numbering','Numbering Rules','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/modules','Modules','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/module-button-bindings','Module Button Bindings','PLATFORM_SERVICES','CANONICAL','CORE',NULL),
  ('/admin/security/password-policy','Password Policy','SECURITY','CANONICAL','CORE',NULL),
  ('/admin/security/mfa','Multi-Factor Authentication','SECURITY','CANONICAL','CORE',NULL),
  ('/admin/security/policy','Security Policy','SECURITY','CANONICAL','CORE',NULL),
  ('/admin/security/ip-access','IP Access Rules','SECURITY','CANONICAL','CORE',NULL),
  ('/admin/workflow-management','Workflow Management','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/workflows','Workflow Designer','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/workflow-triggers','Workflow Triggers','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/workflow-logs','Workflow Logs','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/workflow-analytics','Workflow Analytics','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/scheduler','Central Scheduler','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/session-health','Session Health','OPERATIONS','CANONICAL','CORE',NULL),
  ('/admin/geography','Geography','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/identity','Identity','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/financial-reference','Financial Reference','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/legal-reference','Legal Reference','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/participant','Participant / Party','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/communication-domain','Communication & Correspondence','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/dms','Document Repository (DMS)','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/document-configuration','Document Configuration','SHARED_DOMAINS','CANONICAL','CORE',NULL),
  ('/admin/platform/enterprise-catalogue','Enterprise Service Catalogue','ENTERPRISE_CATALOGUE','CANONICAL','CORE',NULL),
  ('/admin/reference-framework','Reference Framework','GOVERNANCE','CANONICAL','CORE',NULL),
  ('/admin/logs','System Logs','GOVERNANCE','CANONICAL','CORE',NULL),
  ('/system-logs/audit','Audit Log','GOVERNANCE','CANONICAL','CORE',NULL),
  ('/admin/data-migration','Data Migration','MIGRATION','CANONICAL','CORE',NULL),
  ('/admin/platform-readiness','Platform Readiness','QUALITY','CANONICAL','CORE',NULL),
  ('/admin/release-management','Release Management','QUALITY','CANONICAL','CORE',NULL),
  ('/admin/route-registry','Administration Route Registry','GOVERNANCE','CANONICAL','CORE','Govern canonical, legacy, redirect, retired and planned admin routes')
ON CONFLICT (route_path) DO NOTHING;
