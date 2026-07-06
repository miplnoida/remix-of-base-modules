/**
 * Enterprise Configuration Centre — readiness dashboard + CRUD ownership map.
 *
 * NON-DUPLICATION RULES:
 *   - Does NOT create any new shared-domain tables.
 *   - Does NOT re-implement any admin screen — every "Configure" LINKS to the
 *     existing canonical admin route.
 *   - Does NOT alter legacy (BEMA / IA / BN / legacy ip_/er_/cl_/cn_) tables.
 *   - Does NOT duplicate BN Product Builder — only reports its prerequisite
 *     readiness derived from shared-domain row counts.
 *
 * See:
 *   docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md
 *   docs/enterprise/ENTERPRISE_CONFIGURATION_ARCHITECTURE.md
 */
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Globe2, IdCard, Landmark, Scale, Users2, FileText, MessageSquare,
  Building2, Coins, Clock, CalendarDays, Hash, Workflow, Bell, FileCheck,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, Info, PackageCheck,
  Shield, ListTree, KeyRound, ScrollText, Layers, ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

type Status = "ready" | "partial" | "missing" | "unknown";

interface Probe {
  key: string;
  table: string;
  minReady?: number;
  minPartial?: number;
}

async function countRows(probe: Probe): Promise<number | null> {
  try {
    const { count, error } = await db.from(probe.table).select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

function classify(n: number | null, minReady = 1, minPartial = 1): Status {
  if (n === null) return "unknown";
  if (n >= minReady) return "ready";
  if (n >= minPartial) return "partial";
  return "missing";
}

function StatusPill({ status, count }: { status: Status; count: number | null }) {
  const map: Record<Status, { label: string; className: string; Icon: any }> = {
    ready:   { label: "Configured",           className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", Icon: CheckCircle2 },
    partial: { label: "Partially configured", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",         Icon: AlertTriangle },
    missing: { label: "Missing",              className: "bg-destructive/15 text-destructive border-destructive/30",                        Icon: XCircle },
    unknown: { label: "Unknown",              className: "bg-muted text-muted-foreground border-border",                                    Icon: HelpCircle },
  };
  const { label, className, Icon } = map[status];
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Icon className="h-3 w-3" /> {label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {count === null ? "n/a" : `${count} row${count === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

/** CRUD ownership drawer — Source-Map facts for a setting card. */
interface Ownership {
  crudAt: string;         // canonical route where CRUD happens
  tables: string[];       // authoritative tables
  service: string;        // service / hook name
  consumers: string[];    // modules that consume this setting
  migration: string;      // "none" | "adapter" | "facade" | "future migration"
  impactIfMissing: string;
}

interface DomainCardProps {
  title: string;
  icon: any;
  purpose: string;
  route: string;
  routeLabel?: string;
  status: Status;
  count: number | null;
  ownership: Ownership;
}

function DomainCard({ title, icon: Icon, purpose, route, routeLabel, status, count, ownership }: DomainCardProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{purpose}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3">
        <StatusPill status={status} count={count} />
        <Link
          to={route}
          className="inline-flex items-center rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
        >
          {routeLabel ?? "Configure"} →
        </Link>
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
            <span>CRUD ownership</span>
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1.5 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs">
            <div><span className="font-medium text-foreground">CRUD happens at:</span> <code className="text-[11px]">{ownership.crudAt}</code></div>
            <div><span className="font-medium text-foreground">Tables used:</span> <span className="text-[11px]">{ownership.tables.join(", ")}</span></div>
            <div><span className="font-medium text-foreground">Service/hook:</span> <code className="text-[11px]">{ownership.service}</code></div>
            <div><span className="font-medium text-foreground">Consumed by:</span> {ownership.consumers.join(", ")}</div>
            <div><span className="font-medium text-foreground">Migration status:</span> {ownership.migration}</div>
            <div><span className="font-medium text-foreground">Impact if missing:</span> {ownership.impactIfMissing}</div>
            <div className="pt-1 text-[11px] italic text-destructive/80">Do not duplicate this screen — link only.</div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ---------- Probes (readiness) ----------
const PROBES = {
  // Shared
  geography:     { key: "geography",     table: "ssp_geo_country" } as Probe,
  identity:      { key: "identity",      table: "ssp_identity_type" } as Probe,
  financial:     { key: "financial",     table: "ssp_bank" } as Probe,
  legal:         { key: "legal",         table: "ssp_legal_reference" } as Probe,
  participant:   { key: "participant",   table: "ssp_relationship_type" } as Probe,
  documents:     { key: "documents",     table: "core_dms_document_type" } as Probe,
  communication: { key: "communication", table: "notification_templates" } as Probe,
  // Enterprise / Organisation
  organisation:  { key: "organisation",  table: "core_organization" } as Probe,
  offices:       { key: "offices",       table: "core_office" } as Probe,
  departments:   { key: "departments",   table: "core_department" } as Probe,
  currency:      { key: "currency",      table: "ssp_currency_profile" } as Probe,
  calendar:      { key: "calendar",      table: "public_holidays" } as Probe,
  numbering:     { key: "numbering",     table: "core_number_sequence" } as Probe,
  workflow:      { key: "workflow",      table: "workflow_definitions" } as Probe,
  notifTemplate: { key: "notifTemplate", table: "notification_templates" } as Probe,
  documentPol:   { key: "documentPol",   table: "core_document_profile" } as Probe,
  refFramework:  { key: "refFramework",  table: "core_reference_group" } as Probe,
  catalogue:     { key: "catalogue",     table: "enterprise_capability_registry" } as Probe,
  // Platform
  users:         { key: "users",         table: "profiles" } as Probe,
  roles:         { key: "roles",         table: "roles" } as Probe,
  permissions:   { key: "permissions",   table: "role_permissions" } as Probe,
  auditLogs:     { key: "auditLogs",     table: "audit_logs" } as Probe,
};

function useReadiness() {
  return useQuery({
    queryKey: ["configuration-centre", "readiness", "v2"],
    queryFn: async () => {
      const entries = await Promise.all(
        Object.values(PROBES).map(async (p) => [p.key, await countRows(p)] as const)
      );
      const map: Record<string, number | null> = {};
      for (const [k, v] of entries) map[k] = v;

      let defaultCountry: string | null = null;
      try {
        const { data } = await db.from("system_settings")
          .select("setting_value").eq("setting_key", "default_country").maybeSingle();
        defaultCountry = data?.setting_value ?? null;
      } catch { /* ignore */ }

      let timezone: string | null = null;
      try {
        const { data } = await db.from("system_settings")
          .select("setting_value").eq("setting_key", "default_timezone").maybeSingle();
        timezone = data?.setting_value ?? null;
      } catch { /* ignore */ }

      return { counts: map, defaultCountry, timezone };
    },
    staleTime: 5 * 60_000,
  });
}

export default function ConfigurationCentre() {
  const { data, isLoading } = useReadiness();
  const c = data?.counts ?? {};

  // BN Product Builder prerequisites
  const prereqs = [
    { label: "Default country set",              ok: !!data?.defaultCountry },
    { label: "Member / participant types exist", ok: (c.participant ?? 0) > 0 || (c.identity ?? 0) > 0 },
    { label: "Payment channels / banks exist",   ok: (c.financial ?? 0) > 0 },
    { label: "At least one legal reference",     ok: (c.legal ?? 0) > 0 },
    { label: "Document types exist",             ok: (c.documents ?? 0) > 0 },
    { label: "Communication templates (or optional)", ok: (c.communication ?? 0) > 0, optional: true },
    { label: "Workflow templates (or optional)",       ok: (c.workflow ?? 0) > 0,      optional: true },
  ];
  const blocking = prereqs.filter((p) => !p.ok && !p.optional);
  const builderReady = blocking.length === 0 && !isLoading;

  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader
        title="Enterprise Configuration Centre"
        subtitle="Setup sequence, readiness and CRUD ownership for the KN implementation."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Administration" },
          { label: "Setup Centre" },
          { label: "Configuration Centre" },
        ]}
      />

      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <div className="font-medium text-foreground">Setup sequence</div>
          <p className="text-muted-foreground">
            Configure in this order: <strong>1. Platform</strong> → <strong>2. Enterprise Core</strong> → <strong>3. Organisation</strong> → <strong>4. Shared Domains</strong> → <strong>5. Benefits Readiness</strong>.
            Each card links to its canonical CRUD screen — this centre never edits data itself.
            See <code>docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md</code>.
          </p>
        </div>
      </div>

      {/* Section 1 — Platform Setup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Platform Setup</h2>
        <p className="text-sm text-muted-foreground">Cross-tenant platform services owned by Platform Admin.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DomainCard title="Users" icon={Users2} purpose="Platform users and profiles."
            route="/admin/users" status={classify(c.users)} count={c.users ?? null}
            ownership={{ crudAt: "/admin/users", tables: ["profiles", "auth.users", "user_roles"],
              service: "useUsers / useSupabaseAuth", consumers: ["All modules"], migration: "none",
              impactIfMissing: "No one can sign in or be assigned roles." }} />
          <DomainCard title="Roles & Permissions" icon={Shield} purpose="Roles, hierarchies and role→permission grants."
            route="/admin/roles" status={classify(c.roles)} count={c.roles ?? null}
            ownership={{ crudAt: "/admin/roles (+ tab=permissions)", tables: ["roles", "role_hierarchy", "role_permissions", "module_actions"],
              service: "useRoles / useRolePermissions", consumers: ["All modules"], migration: "none",
              impactIfMissing: "Users cannot access module screens or actions." }} />
          <DomainCard title="Workflow Engine" icon={Workflow} purpose="Workflow definitions, runs and templates."
            route="/admin/workflows" status={classify(c.workflow)} count={c.workflow ?? null}
            ownership={{ crudAt: "/admin/workflows", tables: ["workflow_definitions", "workflow_instances"],
              service: "useWorkflowManagement", consumers: ["BN", "Compliance", "Legal", "IA"], migration: "none",
              impactIfMissing: "No approvals, no case routing." }} />
          <DomainCard title="Notification Templates" icon={Bell} purpose="Email / SMS / letter / notice templates."
            route="/admin/notification-templates" status={classify(c.notifTemplate)} count={c.notifTemplate ?? null}
            ownership={{ crudAt: "/admin/notification-templates", tables: ["notification_templates", "notification_template_versions"],
              service: "useNotificationTemplates", consumers: ["All modules"], migration: "none",
              impactIfMissing: "Outbound communications cannot be dispatched." }} />
          <DomainCard title="Numbering" icon={Hash} purpose="Reference number sequences and generation rules."
            route="/admin/numbering" status={classify(c.numbering)} count={c.numbering ?? null}
            ownership={{ crudAt: "/admin/numbering", tables: ["core_number_sequence", "core_number_sequence_rule", "core_number_sequence_audit"],
              service: "useNumberSequences", consumers: ["BN", "Compliance", "Legal", "Finance"], migration: "none",
              impactIfMissing: "Cases, claims and receipts cannot be numbered." }} />
          <DomainCard title="Audit Logs" icon={ScrollText} purpose="System audit trail and log viewer."
            route="/system-logs/audit" routeLabel="Open audit trail"
            status={classify(c.auditLogs)} count={c.auditLogs ?? null}
            ownership={{ crudAt: "/system-logs/audit (read-only)", tables: ["audit_logs", "system_audit_trail"],
              service: "useAuditLogs", consumers: ["Governance", "IA"], migration: "none",
              impactIfMissing: "No traceability of admin/config actions." }} />
          <DomainCard title="Global Settings" icon={KeyRound} purpose="Platform-wide system settings (country, timezone, flags)."
            route="/admin/global-settings"
            status={data?.defaultCountry ? "ready" : "missing"} count={data?.defaultCountry ? 1 : 0}
            ownership={{ crudAt: "/admin/global-settings", tables: ["system_settings"],
              service: "useSystemSettings", consumers: ["All modules"], migration: "none",
              impactIfMissing: "Modules cannot resolve default country/timezone." }} />
        </div>
      </section>

      {/* Section 2 — Enterprise Core Setup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Enterprise Core Setup</h2>
        <p className="text-sm text-muted-foreground">Cross-module registries used by every implementation.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DomainCard title="Reference Framework" icon={Layers} purpose="Category / group / value registry for enum-like references."
            route="/admin/reference-framework" status={classify(c.refFramework)} count={c.refFramework ?? null}
            ownership={{ crudAt: "/admin/reference-framework",
              tables: ["core_reference_category", "core_reference_group", "core_reference_value", "_i18n", "_alias", "_external_code"],
              service: "useReferenceFramework", consumers: ["All modules"], migration: "none",
              impactIfMissing: "Reference dropdowns will be empty across the app." }} />
          <DomainCard title="Enterprise Catalogue" icon={ListTree} purpose="Capability registry consumed by module discovery."
            route="/admin/platform/enterprise-catalogue" status={classify(c.catalogue)} count={c.catalogue ?? null}
            ownership={{ crudAt: "/admin/platform/enterprise-catalogue", tables: ["enterprise_capability_registry"],
              service: "useEnterpriseCapabilities", consumers: ["Platform Admin", "BN"], migration: "none",
              impactIfMissing: "Capability discovery and rollout gating disabled." }} />
          <DomainCard title="Master Data (legacy lookups)" icon={FileText}
            purpose="36 legacy per-domain lookups (banks, occupations, sectors, etc.)."
            route="/admin/platform" routeLabel="Open Platform Admin (Master Data cards)"
            status="unknown" count={null}
            ownership={{ crudAt: "/admin/master-data/*", tables: ["bn_bank_master", "cont_stat", "ip_code", "…36 tables"],
              service: "Individual *Service modules", consumers: ["Legacy IP/ER/BN"], migration: "adapter (legacy preserved; shared-domain screens are canonical for new work)",
              impactIfMissing: "Legacy screens degrade; new work should use shared domains." }} />
        </div>
      </section>

      {/* Section 3 — Organisation Setup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Organisation Setup</h2>
        <p className="text-sm text-muted-foreground">Per-organisation implementation of Enterprise Core.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DomainCard title="Organisation Profile" icon={Building2} purpose="Legal name, registration, branding metadata."
            route="/admin/organization/profile" status={classify(c.organisation)} count={c.organisation ?? null}
            ownership={{ crudAt: "/admin/organization/profile", tables: ["core_organization"],
              service: "useOrganizationProfile", consumers: ["All modules"], migration: "none",
              impactIfMissing: "Letterheads, receipts and reports lack issuer identity." }} />
          <DomainCard title="Offices" icon={Building2} purpose="Physical offices and locations."
            route="/admin/offices" status={classify(c.offices)} count={c.offices ?? null}
            ownership={{ crudAt: "/admin/offices", tables: ["core_office", "office_locations", "office_ip_addresses"],
              service: "useOffices", consumers: ["BN", "Compliance", "Cashier"], migration: "none",
              impactIfMissing: "Case assignment by office breaks." }} />
          <DomainCard title="Departments & Designations" icon={Users2} purpose="Department profiles, mappings and role designations."
            route="/admin/departments" status={classify(c.departments)} count={c.departments ?? null}
            ownership={{ crudAt: "/admin/departments  •  /admin/designations",
              tables: ["core_department", "core_department_profile", "core_department_location", "designation_hierarchy"],
              service: "useDepartments / useDesignations", consumers: ["Workflow routing", "IA"], migration: "none",
              impactIfMissing: "Workflow queues and IA assignments cannot resolve owners." }} />
          <DomainCard title="Calendar & Holidays" icon={CalendarDays} purpose="Working week and public holidays."
            route="/admin/calendar-holidays" status={classify(c.calendar)} count={c.calendar ?? null}
            ownership={{ crudAt: "/admin/calendar-holidays", tables: ["public_holidays", "ia_holidays"],
              service: "useHolidays", consumers: ["BN", "Compliance", "IA"], migration: "none",
              impactIfMissing: "Due-date and SLA calculations misfire." }} />
          <DomainCard title="Branding & Assets" icon={FileText} purpose="Letterheads, signatures, disclaimers, media, portal branding."
            route="/admin/communication" routeLabel="Open communication assets"
            status="unknown" count={null}
            ownership={{ crudAt: "/admin/communication  •  /admin/organization/letterheads  •  /admin/organization/portal-branding",
              tables: ["comm_letterhead", "comm_email_signature", "comm_disclaimer", "comm_media_asset", "app_themes"],
              service: "useCommunicationAssets / useMediaAssets / useOrganizationBranding",
              consumers: ["All outbound documents / portals"], migration: "none",
              impactIfMissing: "Generated documents lack branding and legal footers." }} />
        </div>
      </section>

      {/* Section 4 — Shared Domain Setup */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. Shared Domain Setup</h2>
        <p className="text-sm text-muted-foreground">Canonical `ssp_*` / `core_*` libraries reused by every module.</p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DomainCard title="Geography" icon={Globe2} purpose="Countries, administrative levels, jurisdictions."
            route="/admin/geography" status={classify(c.geography)} count={c.geography ?? null}
            ownership={{ crudAt: "/admin/geography",
              tables: ["ssp_geo_country", "ssp_geo_area", "ssp_admin_level", "ssp_jurisdiction", "ssp_geo_external_code"],
              service: "geographyDomainService", consumers: ["BN", "Compliance", "Legal", "IP/ER"],
              migration: "adapter (legacy master-data/countries|districts|villages preserved)",
              impactIfMissing: "Addresses, jurisdictions and country routing break." }} />
          <DomainCard title="Identity" icon={IdCard} purpose="Identity types, party identifiers, verification rules."
            route="/admin/identity" status={classify(c.identity)} count={c.identity ?? null}
            ownership={{ crudAt: "/admin/identity",
              tables: ["ssp_identity_type", "ssp_party_identity", "ssp_identity_match_key", "ssp_identity_validation_pattern", "ssp_country_identity_rule", "ssp_external_identity_ref"],
              service: "identityDomainService", consumers: ["Participant", "BN", "Compliance"], migration: "none",
              impactIfMissing: "Cannot validate SSN/NIN identifiers on intake." }} />
          <DomainCard title="Financial Reference" icon={Landmark} purpose="Banks, branches, currencies, exchange rates, payment channels."
            route="/admin/financial-reference" status={classify(c.financial)} count={c.financial ?? null}
            ownership={{ crudAt: "/admin/financial-reference",
              tables: ["ssp_bank", "ssp_bank_branch", "ssp_currency_profile", "ssp_exchange_rate", "ssp_chart_of_account_ref", "ssp_payment_channel", "ssp_settlement_method"],
              service: "financialReferenceService", consumers: ["BN payments", "Cashier", "Compliance"],
              migration: "adapter (legacy master-data/bank-codes preserved)",
              impactIfMissing: "Cannot select banks, currencies or payment channels." }} />
          <DomainCard title="Legal Reference" icon={Scale} purpose="Acts, sections, regulations and citations."
            route="/admin/legal-reference" status={classify(c.legal)} count={c.legal ?? null}
            ownership={{ crudAt: "/admin/legal-reference",
              tables: ["ssp_legal_reference", "ssp_legal_act", "ssp_legal_section", "ssp_regulation", "ssp_court_reference", "core_legal_reference", "core_module_legal_reference"],
              service: "legalReferenceDomainService", consumers: ["BN", "Compliance", "Legal", "Communication"], migration: "facade",
              impactIfMissing: "Notices and orders cannot cite statutes." }} />
          <DomainCard title="Participant / Party" icon={Users2} purpose="Party types, roles, relationships and read-only projection."
            route="/admin/participant" status={classify(c.participant)} count={c.participant ?? null}
            ownership={{ crudAt: "/admin/participant (config) — projection is read-only over legacy",
              tables: ["ssp_party_type", "ssp_participant_role", "ssp_relationship_type", "ssp_party_role_binding", "v_ssp_party_projection"],
              service: "participantDomainService / partyProjectionService",
              consumers: ["BN", "Communication", "Compliance"], migration: "facade (read-only over ip_master/er_master)",
              impactIfMissing: "Cannot resolve recipients or beneficiaries." }} />
          <DomainCard title="Documents" icon={FileText} purpose="Document types, profiles and DMS repository."
            route="/admin/dms" routeLabel="Open Document Repository"
            status={classify(c.documents)} count={c.documents ?? null}
            ownership={{ crudAt: "/admin/dms  •  /admin/document-configuration",
              tables: ["core_dms_document_type", "core_dms_provider", "core_dms_storage_policy", "core_document_profile", "bn_document_profile"],
              service: "dmsService / documentConfigurationService",
              consumers: ["BN", "Compliance", "Legal", "IA"], migration: "adapter (legacy bn_document_profile read-only)",
              impactIfMissing: "Uploads, evidence and generated PDFs cannot be classified/stored." }} />
          <DomainCard title="Communication" icon={MessageSquare} purpose="Channels, correspondence types, template bindings, recipient prefs."
            route="/admin/communication-domain" status={classify(c.communication)} count={c.communication ?? null}
            ownership={{ crudAt: "/admin/communication-domain (config) — designer stays at /admin/notification-templates",
              tables: ["ssp_communication_channel", "ssp_correspondence_type", "ssp_recipient_preference", "ssp_correspondence_template_binding", "ssp_correspondence_legal_ref", "ssp_delivery_status_ref"],
              service: "communicationDomainService", consumers: ["BN", "Compliance", "Legal"], migration: "none",
              impactIfMissing: "Outbound events have no channel/template binding." }} />
        </div>
      </section>

      {/* Section 5 — Benefits Readiness */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">5. Benefits Readiness</h2>
        <p className="text-sm text-muted-foreground">
          BN Product Builder consumes the layers above. It is not duplicated here.
        </p>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className={`rounded-md p-2 ${builderReady ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                <PackageCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">
                Product Builder — {builderReady ? "READY to start" : "BLOCKED"}
              </CardTitle>
            </div>
            <CardDescription>
              {builderReady
                ? "All required prerequisites are configured. You may start defining benefit products."
                : `Blocked by ${blocking.length} prerequisite${blocking.length === 1 ? "" : "s"}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {prereqs.map((p) => (
                <li key={p.label} className="flex items-center gap-2 text-sm">
                  {p.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : p.optional ? (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span>{p.label}{p.optional ? " (optional)" : ""}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-muted-foreground">
              BN Product Builder remains ON HOLD until the Shared-Domain Consumption Map is signed off.
              See <code>docs/bn/BN_PRODUCT_BUILDER_SHARED_DOMAIN_CONSUMPTION_MAP.md</code> and
              <code> docs/enterprise/CENTRAL_SETTINGS_SOURCE_MAP.md</code>.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
