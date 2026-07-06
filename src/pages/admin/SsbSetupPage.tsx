/**
 * SSB Implementation Setup — /admin/ssb-setup
 *
 * One clean central setup shell for St. Kitts & Nevis SSB implementation.
 * - Sections link to existing canonical engine CRUD (no duplication).
 * - Only implementation-specific policy is stored in ssb_* tables.
 * - Benefits Readiness gates BN Product Builder start.
 *
 * See docs/social-security/SSB_IMPLEMENTATION_CONFIGURATION_ACCEPTANCE.md
 */
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2, AlertTriangle, XCircle, ExternalLink, Building2,
  Globe2, IdCard, Hash, CalendarDays, Coins, Scale, FileText,
  MessageSquare, Workflow, PackageCheck, Info, ClipboardList,
} from "lucide-react";
import { PageShell } from "@/components/common/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  useSsbImplementationConfig, useSsbSetupReadiness,
} from "@/hooks/ssb/useSsbImplementationConfig";
import type { SsbSectionReadiness, SsbReadinessStatus } from "@/services/ssb/ssbImplementationConfigService";
import {
  getMemberRegistrationConfig,
  getEmployerRegistrationConfig,
  getBenefitSetupConfig,
} from "@/services/ssb/ssbPolicyLifecycleService";
import { ssbConfigurationGovernanceService as govSvc } from "@/services/ssb-configuration/ssbConfigurationGovernanceService";
import { ShieldCheck } from "lucide-react";

const statusMeta: Record<SsbReadinessStatus, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ready:   { label: "Ready",   color: "bg-emerald-100 text-emerald-800 border-emerald-300", Icon: CheckCircle2 },
  partial: { label: "Partial", color: "bg-amber-100 text-amber-800 border-amber-300",       Icon: AlertTriangle },
  missing: { label: "Missing", color: "bg-rose-100 text-rose-800 border-rose-300",          Icon: XCircle },
};

const sectionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  general: Building2, address: Globe2, identity: IdCard, numbering: Hash,
  contribution_calendar: CalendarDays, financial: Coins, legal: Scale,
  documents: FileText, communication: MessageSquare, workflow: Workflow,
};

function StatusBadge({ status }: { status: SsbReadinessStatus }) {
  const m = statusMeta[status];
  return (
    <Badge variant="outline" className={`gap-1 ${m.color}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
}

function SectionCard({ s }: { s: SsbSectionReadiness }) {
  const Icon = sectionIcons[s.key] ?? Info;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{s.label}</CardTitle>
          </div>
          <StatusBadge status={s.status} />
        </div>
        <CardDescription className="text-xs">
          Engine: <span className="font-medium">{s.engine}</span>
          {s.required && <> · <span className="text-rose-700">Required for BN</span></>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{s.detail}</p>
        <div className="text-xs text-muted-foreground">
          Consumers: {s.consumers.join(", ")}
        </div>
        {s.canonicalRoute && (
          <Button variant="outline" size="sm" asChild>
            <Link to={s.canonicalRoute}>
              Open canonical CRUD <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function SsbSetupPage() {
  const { data: profile, isLoading: loadingProfile } = useSsbImplementationConfig();
  const { data: sections = [], isLoading: loadingSections } = useSsbSetupReadiness(profile?.id);

  const requiredSections = sections.filter((x) => x.required);
  const readyRequired = requiredSections.filter((x) => x.status === "ready").length;
  const bnReady = requiredSections.length > 0 && readyRequired === requiredSections.length;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Administration" },
    { label: "Setup Centre" },
    { label: "SSB Implementation Setup" },
  ];

  return (
    <PageShell
      title="SSB Implementation Setup"
      subtitle="St. Kitts & Nevis Social Security Board — central implementation configuration"
      breadcrumbs={breadcrumbs}
      isLoading={loadingProfile || loadingSections}
    >
      <div className="mb-4 flex items-start gap-3 rounded-md border border-border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-foreground">SSB Setup vs Configuration Centre vs Platform Admin</div>
          <p className="text-muted-foreground">
            SSB Implementation Setup holds St. Kitts SSB policy layer with lifecycle + resolver.
            For platform-wide readiness use the{" "}
            <Link to="/admin/configuration-centre" className="text-primary hover:underline">Configuration Centre</Link>,
            and for technical platform capabilities use{" "}
            <Link to="/admin/platform" className="text-primary hover:underline">Platform Admin</Link>.
            Policy packaging, validation & snapshots live in{" "}
            <Link to="/admin/configuration-governance" className="text-primary hover:underline">Configuration Governance</Link>.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to="/admin/configuration-governance"><ShieldCheck className="mr-2 h-4 w-4" />Open Governance</Link>
        </Button>
      </div>

      <GovernanceStatusStrip />


      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="process">Process Readiness</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="address">Address & Geography</TabsTrigger>
          <TabsTrigger value="identity">Identity / NIS</TabsTrigger>
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="calendar">Contribution Calendar</TabsTrigger>
          <TabsTrigger value="financial">Financial / Payment</TabsTrigger>
          <TabsTrigger value="legal">Legal</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="workflow">Workflow / SLA</TabsTrigger>
          <TabsTrigger value="benefits">Benefits Readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {profile?.organization_name ?? "Social Security Board / St. Kitts & Nevis"}
              </CardTitle>
              <CardDescription>
                Country: <b>{profile?.country_code ?? "KN"}</b> · Currency:{" "}
                <b>{profile?.currency_code ?? "XCD"}</b> · Timezone:{" "}
                <b>{profile?.timezone ?? "America/St_Kitts"}</b> · Status:{" "}
                <Badge variant="secondary">{profile?.status ?? "draft"}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Engines own reusable capability. SSB Setup owns St. Kitts implementation
                policy. Business modules consume the resolved configuration — no
                configuration is duplicated inside Benefits, Employer, Contributions,
                Claims, Compliance or Finance.
              </p>
              <p>
                Existing canonical CRUD screens are linked from each section. Only
                implementation-specific bindings live in <code>ssb_*</code> tables.
              </p>
              <p className="text-xs">
                <b>Lifecycle:</b> every policy row carries status
                (Draft / Scheduled / Active / Retired / Superseded),
                effective_from / effective_to and version_no. Business modules
                must call <code>resolvePolicy(...)</code> or the
                <code> getXxxConfig(asOfDate)</code> helpers in
                <code>ssbPolicyLifecycleService</code> — never read
                <code>ssb_*_policy</code> rows directly.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sections.map((s) => <SectionCard key={s.key} s={s} />)}
          </div>
        </TabsContent>

        {sections.map((s) => (
          <TabsContent key={s.key} value={
            s.key === "contribution_calendar" ? "calendar" : s.key
          } className="pt-4">
            <SectionCard s={s} />
          </TabsContent>
        ))}

        <TabsContent value="process" className="pt-4 space-y-4">
          <ProcessReadinessPanel />
        </TabsContent>

        <TabsContent value="benefits" className="pt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-primary" />
                BN Product Builder Readiness
              </CardTitle>
              <CardDescription>
                {readyRequired} of {requiredSections.length} required prerequisites
                are Ready.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bnReady ? (
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    All required prerequisites configured. Product Builder can start.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                  <div>
                    <div className="font-medium">Product Builder is BLOCKED.</div>
                    <div className="text-sm text-muted-foreground">
                      Complete the required sections listed below.
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {requiredSections.map((s) => (
                  <div key={s.key} className="flex items-center justify-between border rounded-md p-3">
                    <span className="text-sm">{s.label}</span>
                    <StatusBadge status={s.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

// ---------------------------------------------------------------
// Process Readiness — resolves live policy config per business process.
// Only Member / Employer / Benefit resolvers exist today; the others
// render an explicit "Resolver pending" state (no hardcoded config).
// ---------------------------------------------------------------

type ProcessKey = "member" | "employer" | "benefit" | "contribution" | "claims" | "payments";

interface ProcessDef {
  key: ProcessKey;
  label: string;
  description: string;
  resolver?: (asOf: string) => Promise<any>;
  requiredKeys?: string[];
}

const PROCESS_DEFS: ProcessDef[] = [
  { key: "member",       label: "Member Registration",   description: "Address, identity rules, numbering, documents.",
    resolver: getMemberRegistrationConfig,   requiredKeys: ["address", "identityRules", "numbering", "documents"] },
  { key: "employer",     label: "Employer Registration", description: "Address, numbering, documents, legal.",
    resolver: getEmployerRegistrationConfig, requiredKeys: ["address", "numbering", "documents", "legal"] },
  { key: "benefit",      label: "Benefit Setup",         description: "Identity, legal, docs, workflow, financial, comms, calendar.",
    resolver: getBenefitSetupConfig,         requiredKeys: ["identityRules", "legal", "documents", "workflow", "financial", "communication", "contributionCalendar"] },
  { key: "contribution", label: "Contribution Setup",    description: "Resolver not implemented yet." },
  { key: "claims",       label: "Claims Setup",          description: "Resolver not implemented yet." },
  { key: "payments",     label: "Payments Setup",        description: "Resolver not implemented yet." },
];

function ProcessCard({ def, asOf }: { def: ProcessDef; asOf: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ssb", "process", def.key, asOf],
    queryFn: () => def.resolver!(asOf),
    enabled: !!def.resolver,
    staleTime: 30_000,
  });

  if (!def.resolver) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{def.label}</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1 bg-slate-100 text-slate-700 border-slate-300">
              Resolver pending
            </Badge>
          </div>
          <CardDescription className="text-xs">{def.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          A dedicated <code>get{def.key.charAt(0).toUpperCase() + def.key.slice(1)}Config(asOfDate)</code> helper
          will be added to <code>ssbPolicyLifecycleService</code>. Until then no readiness is inferred.
        </CardContent>
      </Card>
    );
  }

  const missing: string[] = [];
  const present: string[] = [];
  if (data && def.requiredKeys) {
    for (const k of def.requiredKeys) {
      const v = (data as any)[k];
      const filled = Array.isArray(v) ? v.length > 0 : !!v;
      (filled ? present : missing).push(k);
    }
  }
  const status: SsbReadinessStatus = !data || missing.length === (def.requiredKeys?.length ?? 0)
    ? "missing"
    : missing.length === 0 ? "ready" : "partial";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{def.label}</CardTitle>
          </div>
          {isLoading
            ? <Badge variant="outline">Resolving…</Badge>
            : <StatusBadge status={status} />}
        </div>
        <CardDescription className="text-xs">{def.description}</CardDescription>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        {error && <p className="text-rose-700">Resolver error: {(error as Error).message}</p>}
        <div>Present: {present.length ? present.join(", ") : "—"}</div>
        <div className={missing.length ? "text-rose-700" : ""}>
          Missing: {missing.length ? missing.join(", ") : "—"}
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/ssb-setup">Open policy sections <ExternalLink className="ml-2 h-3 w-3" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessReadinessPanel() {
  const asOf = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Process Readiness (as of {asOf})
          </CardTitle>
          <CardDescription>
            Live resolver output per business process. Uses lifecycle-aware
            <code> resolvePolicy / getXxxConfig</code> helpers — never raw policy tables.
          </CardDescription>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PROCESS_DEFS.map((d) => <ProcessCard key={d.key} def={d} asOf={asOf} />)}
      </div>
    </>
  );
}
