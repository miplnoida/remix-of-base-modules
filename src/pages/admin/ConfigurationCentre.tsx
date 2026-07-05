/**
 * Enterprise Configuration Centre — readiness dashboard for KN setup.
 *
 * NON-DUPLICATION RULES:
 *   - Does NOT create any new shared-domain tables.
 *   - Does NOT re-implement any admin screen — every card LINKS to the
 *     existing canonical admin route.
 *   - Does NOT alter legacy (BEMA / IA / BN / legacy ip_/er_/cl_/cn_) tables.
 *   - Does NOT duplicate BN Product Builder — only reports its prerequisite
 *     readiness derived from shared-domain row counts.
 *
 * Layers (per docs/enterprise/ENTERPRISE_CONFIGURATION_ARCHITECTURE.md):
 *   1. Shared Domain Configuration  (libraries)
 *   2. Enterprise Implementation Configuration  (implementation-wide policy)
 *   3. Benefit Product Configuration  (module-specific rules)
 */
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Globe2, IdCard, Landmark, Scale, Users2, FileText, MessageSquare,
  Building2, Coins, Clock, CalendarDays, Hash, Workflow, Bell, FileCheck,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle, Info, PackageCheck,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const db: any = supabase;

type Status = "ready" | "partial" | "missing" | "unknown";

interface Probe {
  key: string;
  table: string;
  filter?: (q: any) => any;
  minReady?: number;   // >= => ready
  minPartial?: number; // >= => partial (else missing). default 1
}

async function countRows(probe: Probe): Promise<number | null> {
  try {
    let q = db.from(probe.table).select("*", { count: "exact", head: true });
    if (probe.filter) q = probe.filter(q);
    const { count, error } = await q;
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

interface DomainCardProps {
  title: string;
  icon: any;
  purpose: string;
  route: string;
  routeLabel?: string;
  status: Status;
  count: number | null;
}

function DomainCard({ title, icon: Icon, purpose, route, routeLabel, status, count }: DomainCardProps) {
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
        <Link to={route} className="text-sm text-primary hover:underline block">
          {routeLabel ?? "Open admin screen"} →
        </Link>
      </CardContent>
    </Card>
  );
}

// ---------- Probes (shared domain readiness) ----------
const SHARED_PROBES = {
  geography:     { key: "geography",     table: "ssp_geo_country" } as Probe,
  identity:      { key: "identity",      table: "ssp_identity_type" } as Probe,
  financial:     { key: "financial",     table: "ssp_bank" } as Probe,
  legal:         { key: "legal",         table: "ssp_legal_reference" } as Probe,
  participant:   { key: "participant",   table: "ssp_relationship_type" } as Probe,
  documents:     { key: "documents",     table: "core_dms_document_type" } as Probe,
  communication: { key: "communication", table: "notification_templates" } as Probe,
};

// Enterprise implementation probes (best-effort — unknown status if table absent).
const ENTERPRISE_PROBES = {
  organisation:  { key: "organisation",  table: "core_office" } as Probe,
  currency:      { key: "currency",      table: "ssp_currency_ref" } as Probe,
  calendar:      { key: "calendar",      table: "core_holiday" } as Probe,
  numbering:     { key: "numbering",     table: "numbering_rules" } as Probe,
  workflow:      { key: "workflow",      table: "workflow_definitions" } as Probe,
  notifTemplate: { key: "notifTemplate", table: "notification_templates" } as Probe,
  documentPol:   { key: "documentPol",   table: "core_document_profile" } as Probe,
};

const ALL_PROBES = { ...SHARED_PROBES, ...ENTERPRISE_PROBES };

function useReadiness() {
  return useQuery({
    queryKey: ["configuration-centre", "readiness", "v1"],
    queryFn: async () => {
      const entries = await Promise.all(
        Object.values(ALL_PROBES).map(async (p) => [p.key, await countRows(p)] as const)
      );
      const map: Record<string, number | null> = {};
      for (const [k, v] of entries) map[k] = v;

      // Default country: check system_settings key.
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
  const counts = data?.counts ?? {};

  // Shared domain readiness
  const shared = {
    geography:     classify(counts.geography),
    identity:      classify(counts.identity),
    financial:     classify(counts.financial),
    legal:         classify(counts.legal),
    participant:   classify(counts.participant),
    documents:     classify(counts.documents),
    communication: classify(counts.communication),
  };

  // BN Product Builder prerequisites
  const prereqs = [
    { label: "Default country set",              ok: !!data?.defaultCountry },
    { label: "Member / participant types exist", ok: (counts.participant ?? 0) > 0 || (counts.identity ?? 0) > 0 },
    { label: "Payment channels / banks exist",   ok: (counts.financial ?? 0) > 0 },
    { label: "At least one legal reference",     ok: (counts.legal ?? 0) > 0 },
    { label: "Document types exist",             ok: (counts.documents ?? 0) > 0 },
    { label: "Communication templates (or optional)", ok: (counts.communication ?? 0) > 0, optional: true },
    { label: "Workflow templates (or optional)",       ok: (counts.workflow ?? 0) > 0,      optional: true },
  ];
  const blocking = prereqs.filter((p) => !p.ok && !p.optional);
  const builderReady = blocking.length === 0 && !isLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Enterprise Configuration Centre"
        subtitle="Setup and readiness centre for the St. Kitts & Nevis implementation."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Administration" },
          { label: "Configuration Centre" },
        ]}
      />

      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <div className="font-medium text-foreground">How configuration flows</div>
          <p className="text-muted-foreground">
            <strong>Shared Domains</strong> are common libraries (Geography, Identity, Financial, Legal,
            Participant, Documents, Communication). <strong>Enterprise Implementation</strong> sets
            implementation-wide policy (country, currency, calendar, numbering, workflow, templates).
            <strong> Benefit Configuration</strong> is product-specific and consumes both — it is not
            duplicated here.
          </p>
        </div>
      </div>

      {/* Section 1 — Shared Domain Configuration */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Shared Domain Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Canonical reference libraries reused by every module.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DomainCard title="Geography" icon={Globe2}
            purpose="Countries, administrative levels, jurisdictions."
            route="/admin/geography" status={shared.geography} count={counts.geography ?? null} />
          <DomainCard title="Identity" icon={IdCard}
            purpose="Identity types, party identifiers, verification rules."
            route="/admin/identity" status={shared.identity} count={counts.identity ?? null} />
          <DomainCard title="Financial Reference" icon={Landmark}
            purpose="Banks, currencies, chart of accounts."
            route="/admin/financial-reference" status={shared.financial} count={counts.financial ?? null} />
          <DomainCard title="Legal Reference" icon={Scale}
            purpose="Statutes, regulations and legal citations."
            route="/admin/legal-reference" status={shared.legal} count={counts.legal ?? null} />
          <DomainCard title="Participant / Party" icon={Users2}
            purpose="Party roles, relationships, participant projection."
            route="/admin/participant" status={shared.participant} count={counts.participant ?? null} />
          <DomainCard title="Documents" icon={FileText}
            purpose="Document types, profiles and DMS repository."
            route="/admin/dms" routeLabel="Open Document Repository"
            status={shared.documents} count={counts.documents ?? null} />
          <DomainCard title="Communication" icon={MessageSquare}
            purpose="Channels, correspondence types, templates & recipient preferences."
            route="/admin/communication-domain"
            status={shared.communication} count={counts.communication ?? null} />
        </div>
      </section>

      {/* Section 2 — Enterprise Implementation Configuration */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Enterprise Implementation Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Implementation-wide policy for St. Kitts &amp; Nevis (KN).
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DomainCard title="Default Country" icon={Globe2}
            purpose={`Currently: ${data?.defaultCountry ?? "not set"} (target: KN).`}
            route="/admin/global-settings"
            status={data?.defaultCountry === "KN" ? "ready" : data?.defaultCountry ? "partial" : "missing"}
            count={data?.defaultCountry ? 1 : 0} />
          <DomainCard title="Organisation" icon={Building2}
            purpose="Offices, departments, designations, profile, branding."
            route="/admin/offices"
            status={classify(counts.organisation)} count={counts.organisation ?? null} />
          <DomainCard title="Currency" icon={Coins}
            purpose="Currency reference and default currency."
            route="/admin/financial-reference"
            status={classify(counts.currency)} count={counts.currency ?? null} />
          <DomainCard title="Timezone" icon={Clock}
            purpose={`Currently: ${data?.timezone ?? "not set"}.`}
            route="/admin/global-settings"
            status={data?.timezone ? "ready" : "missing"} count={data?.timezone ? 1 : 0} />
          <DomainCard title="Calendar & Holidays" icon={CalendarDays}
            purpose="Working week and public holidays."
            route="/admin/calendar-holidays"
            status={classify(counts.calendar)} count={counts.calendar ?? null} />
          <DomainCard title="Numbering" icon={Hash}
            purpose="Reference number sequences and rules."
            route="/admin/numbering"
            status={classify(counts.numbering)} count={counts.numbering ?? null} />
          <DomainCard title="Workflow" icon={Workflow}
            purpose="Approval and processing workflows."
            route="/admin/workflow-management"
            status={classify(counts.workflow)} count={counts.workflow ?? null} />
          <DomainCard title="Notification Templates" icon={Bell}
            purpose="Email / SMS / letter templates."
            route="/admin/notification-templates"
            status={classify(counts.notifTemplate)} count={counts.notifTemplate ?? null} />
          <DomainCard title="Document Policy" icon={FileCheck}
            purpose="Document profiles, retention and signing rules."
            route="/admin/document-configuration"
            status={classify(counts.documentPol)} count={counts.documentPol ?? null} />
        </div>
      </section>

      {/* Section 3 — Benefit Product Configuration */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">3. Benefit Product Configuration</h2>
        <p className="text-sm text-muted-foreground">
          BN Product Builder consumes Shared Domains + Enterprise Configuration. It is not duplicated here.
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
              See <code>docs/bn/BN_PRODUCT_BUILDER_SHARED_DOMAIN_CONSUMPTION_MAP.md</code>.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 4 — Consumption explanation */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">4. How the layers consume each other</h2>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
            <p><strong className="text-foreground">Shared Domains</strong> — common libraries owned by Enterprise Architecture and reused by every module (Geography, Identity, Financial, Legal, Participant, Documents, Communication).</p>
            <p><strong className="text-foreground">Enterprise Configuration</strong> — implementation-wide choices (default country, currency, calendar, numbering, workflow, templates) that all modules inherit.</p>
            <p><strong className="text-foreground">Benefit Configuration</strong> — product-specific rules (eligibility, formulas, rate tables) that consume the layers above without redefining them.</p>
            <p className="pt-2">Reference: <code>docs/enterprise/ENTERPRISE_CONFIGURATION_ARCHITECTURE.md</code>.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
