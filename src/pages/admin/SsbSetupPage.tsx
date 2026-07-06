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
    { label: "Administration", href: "/admin" },
    { label: "SSB Implementation Setup" },
  ];

  return (
    <PageShell
      title="SSB Implementation Setup"
      subtitle="St. Kitts & Nevis Social Security Board — central implementation configuration"
      breadcrumbs={breadcrumbs}
      isLoading={loadingProfile || loadingSections}
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
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
