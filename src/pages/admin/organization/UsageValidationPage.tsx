import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useOrgUsageCounts, useDepartmentProfiles, useOrganizations, useOfficeLocations } from "@/hooks/comm/useOrgManagement";
import { useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters } from "@/hooks/comm/useCommAssets";
import { useMediaAssets } from "@/hooks/comm/useMediaAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { LegalIntegrationReport } from "@/components/admin/organization/LegalIntegrationReport";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Severity = "critical" | "warning" | "info";
type Scope = "Organization" | "Department" | "Location" | "Assets" | "Templates" | "Legal";

interface Issue {
  severity: Severity;
  scope: Scope;
  title: string;
  detail?: string;
  fixHref: string;
  fixLabel: string;
}

const SEV_META: Record<Severity, { label: string; Icon: typeof AlertCircle; tone: string }> = {
  critical: { label: "Critical", Icon: AlertCircle,   tone: "text-destructive" },
  warning:  { label: "Warning",  Icon: AlertTriangle, tone: "text-amber-600" },
  info:     { label: "Info",     Icon: Info,          tone: "text-muted-foreground" },
};

function UsageValidationInner() {
  const { data: counts, isLoading } = useOrgUsageCounts();
  const { data: orgs = [] } = useOrganizations();
  const { data: depts = [] } = useDepartmentProfiles();
  const { data: locs = [] } = useOfficeLocations();
  const { data: lhs = [] } = useLetterheads();
  const { data: sigs = [] } = useEmailSignatures();
  const { data: discs = [] } = useDisclaimers();
  const { data: foots = [] } = usePrintFooters();
  const { data: assets = [] } = useMediaAssets({ activeOnly: true });

  const org: any = orgs[0] ?? {};
  const today = new Date().toISOString().slice(0, 10);
  const issues: Issue[] = [];

  // ----- Organization -----
  if (!orgs.length) {
    issues.push({ severity: "critical", scope: "Organization", title: "No organization profile configured",
      fixHref: "/admin/organization/profile", fixLabel: "Create profile" });
  } else {
    if (!org.legal_name) issues.push({ severity: "critical", scope: "Organization", title: "Organization legal name missing",
      fixHref: "/admin/organization/profile", fixLabel: "Edit profile" });
    if (!org.main_email) issues.push({ severity: "warning", scope: "Organization", title: "Main email not set",
      fixHref: "/admin/organization/profile", fixLabel: "Edit profile" });
    if (!org.main_phone) issues.push({ severity: "warning", scope: "Organization", title: "Main phone not set",
      fixHref: "/admin/organization/profile", fixLabel: "Edit profile" });
  }

  // ----- Locations -----
  if (!locs.some((l) => l.is_primary && l.is_active)) {
    issues.push({ severity: "critical", scope: "Location", title: "No active primary location",
      fixHref: "/admin/organization/locations", fixLabel: "Manage locations" });
  }

  // ----- Assets (presence of key categories) -----
  const required: Array<{ key: string; label: string; sev: Severity }> = [
    { key: "logo",          label: "Main SSB logo",         sev: "critical" },
    { key: "seal",          label: "Official seal",         sev: "critical" },
    { key: "signature",     label: "Authorized signature",  sev: "warning"  },
    { key: "letterhead_header", label: "Letterhead header", sev: "warning"  },
    { key: "letterhead_footer", label: "Letterhead footer", sev: "warning"  },
    { key: "login_logo",    label: "Login page logo",       sev: "warning"  },
    { key: "favicon",       label: "Favicon",               sev: "info"     },
  ];
  required.forEach((r) => {
    if (!assets.some((a) => a.category === r.key)) {
      issues.push({ severity: r.sev, scope: "Assets", title: `Missing: ${r.label}`,
        fixHref: "/admin/organization/media-library", fixLabel: "Add asset" });
    }
  });

  // Expired / soon-expired assets
  assets.forEach((a) => {
    if (a.effective_to && a.effective_to < today) {
      issues.push({ severity: "warning", scope: "Assets", title: `Expired asset: ${a.name}`,
        detail: `Effective to ${a.effective_to}`, fixHref: "/admin/organization/media-library", fixLabel: "Review" });
    }
    if (a.source === "external_url" && a.link_last_status && a.link_last_status !== "loaded") {
      issues.push({ severity: "warning", scope: "Assets", title: `Broken external link: ${a.name}`,
        detail: `Last check: ${a.link_last_status}`, fixHref: "/admin/organization/media-library", fixLabel: "Replace link" });
    }
  });

  // ----- Templates -----
  if (lhs.filter((l) => l.is_active).length === 0)
    issues.push({ severity: "critical", scope: "Templates", title: "No active letterhead",
      fixHref: "/admin/organization/letterheads", fixLabel: "Add letterhead" });
  if (sigs.filter((s) => s.is_active).length === 0)
    issues.push({ severity: "warning", scope: "Templates", title: "No active email signature",
      fixHref: "/admin/communication/signature", fixLabel: "Add signature" });
  if (discs.filter((d) => d.is_active).length === 0)
    issues.push({ severity: "info", scope: "Templates", title: "No active disclaimer",
      fixHref: "/admin/communication/disclaimer", fixLabel: "Add disclaimer" });
  if (foots.filter((f) => f.is_active).length === 0)
    issues.push({ severity: "info", scope: "Templates", title: "No active print footer",
      fixHref: "/admin/communication/footer", fixLabel: "Add footer" });

  // ----- Departments (inheritance) -----
  const checks: Array<[string, string, string]> = [
    ["letterhead",      "inherit_letterhead_from_org",      "default_letterhead_id"],
    ["email signature", "inherit_email_signature_from_org", "default_email_signature_id"],
    ["disclaimer",      "inherit_disclaimer_from_org",      "default_disclaimer_id"],
    ["print footer",    "inherit_print_footer_from_org",    "default_print_footer_id"],
    ["location",        "inherit_location_from_org",        "default_location_id"],
  ];
  depts.forEach((d: any) => {
    checks.forEach(([label, flag, orgKey]) => {
      const inherits = d[flag] !== false;
      const overrideKey = orgKey.replace("default_", "") === "location_id"
        ? "primary_location_id"
        : orgKey.replace("default_", "override_").replace("_id", "_asset_id");
      const hasOverride = !!d[overrideKey] || !!d[orgKey];
      if (inherits && !org[orgKey]) {
        issues.push({ severity: "warning", scope: "Department",
          title: `${d.department_code}: inherits ${label} but organization default not set`,
          fixHref: "/admin/organization/department-mapping", fixLabel: "Open mapping" });
      } else if (!inherits && !hasOverride) {
        issues.push({ severity: "warning", scope: "Department",
          title: `${d.department_code}: ${label} override is on but no asset selected`,
          fixHref: "/admin/organization/department-mapping", fixLabel: "Open mapping" });
      }
    });
  });

  // ----- Legal module readiness -----
  const REQUIRED_LEGAL_CATEGORIES = [
    "HEARING_NOTICE",
    "DEMAND_NOTICE",
    "DECISION_NOTICE",
    "SUMMONS_TO_APPEAR",
    "WARRANT_OF_COMMITMENT",
    "LEGAL_ACTION_REQUISITION",
  ];

  const { data: legalReadiness } = useQuery({
    queryKey: ["org-validation", "legal-readiness-v2"],
    queryFn: async () => {
      const sb = supabase as any;
      const [{ data: mod }, { data: cats }, { data: tpls }, { data: lgDept }] = await Promise.all([
        sb.from("app_modules").select("id, name").eq("name", "LEGAL").maybeSingle(),
        sb.from("core_template_category").select("id, code, name").eq("module_code", "LEGAL").eq("is_active", true),
        sb.from("core_template")
          .select("id, code, category_id, status, active_version_id, core_template_category!core_template_category_id_fkey(code)")
          .eq("module_code", "LEGAL")
          .in("status", ["ACTIVE", "PUBLISHED"]),
        sb.from("core_department_profile")
          .select("id, department_code, default_letterhead_id, default_email_signature_id, default_disclaimer_id, default_print_footer_id")
          .eq("department_code", "LEGAL").maybeSingle(),
      ]);
      let modProfile: any = null;
      if (mod?.id) {
        const { data } = await sb.from("core_module_profile").select("*").eq("module_id", mod.id).maybeSingle();
        modProfile = data;
      }
      return { module: mod, modProfile, categories: cats ?? [], templates: tpls ?? [], lgDept };
    },
    staleTime: 60_000,
  });

  if (legalReadiness) {
    const { module, modProfile, categories, templates, lgDept } = legalReadiness as any;

    if (!lgDept) {
      issues.push({ severity: "critical", scope: "Legal", title: "Legal Department Profile missing (department_code = LEGAL)",
        fixHref: "/admin/organization/department-profiles", fixLabel: "Create profile" });
    } else {
      const assetChecks: Array<[string, string]> = [
        ["letterhead",      "default_letterhead_id"],
        ["email signature", "default_email_signature_id"],
        ["disclaimer",      "default_disclaimer_id"],
        ["print footer",    "default_print_footer_id"],
      ];
      assetChecks.forEach(([label, col]) => {
        if (!lgDept[col]) {
          issues.push({ severity: "warning", scope: "Legal",
            title: `Legal Department Profile has no ${label} configured`,
            fixHref: "/admin/organization/department-profiles", fixLabel: "Configure" });
        }
      });
    }

    if (!module) issues.push({ severity: "critical", scope: "Legal", title: "LEGAL module not registered in app_modules",
      fixHref: "/admin/organization", fixLabel: "Register module" });
    else if (!modProfile) issues.push({ severity: "warning", scope: "Legal", title: "LEGAL module profile not configured (inheritance defaults)",
      fixHref: "/admin/organization/module-profiles", fixLabel: "Configure" });

    const catCodes = new Set((categories ?? []).map((c: any) => c.code));
    REQUIRED_LEGAL_CATEGORIES.forEach((code) => {
      if (!catCodes.has(code)) {
        issues.push({ severity: "critical", scope: "Legal",
          title: `Missing required Legal document category: ${code}`,
          fixHref: "/admin/templates/categories", fixLabel: "Add category" });
      }
    });

    const publishedByCat = new Set(
      (templates ?? [])
        .filter((t: any) => t.status === "PUBLISHED" || t.active_version_id)
        .map((t: any) => t.core_template_category?.code)
        .filter(Boolean),
    );
    REQUIRED_LEGAL_CATEGORIES.forEach((code) => {
      if (catCodes.has(code) && !publishedByCat.has(code)) {
        issues.push({ severity: "warning", scope: "Legal",
          title: `No published template for required category: ${code}`,
          fixHref: "/legal/templates", fixLabel: "Add template" });
      }
    });

    if ((templates ?? []).length === 0) {
      issues.push({ severity: "critical", scope: "Legal", title: "No active Legal templates",
        fixHref: "/legal/templates", fixLabel: "Manage templates" });
    }
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  const sevCount = (s: Severity) => issues.filter((i) => i.severity === s).length;
  const SCOPES: Scope[] = ["Organization", "Location", "Department", "Assets", "Templates", "Legal"];

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Usage &amp; Validation Dashboard</h1>
          <p className="text-sm text-muted-foreground">Missing or broken configuration before go-live, grouped by area and severity.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        {(["critical", "warning", "info"] as Severity[]).map((s) => {
          const meta = SEV_META[s];
          return (
            <Card key={s}>
              <CardContent className="p-4 flex items-center gap-3">
                <meta.Icon className={`h-6 w-6 ${meta.tone}`} />
                <div>
                  <div className="text-xs text-muted-foreground">{meta.label}</div>
                  <div className="text-2xl font-bold">{sevCount(s)}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Organizations" value={counts?.organizations ?? 0} />
        <Stat label="Departments" value={counts?.departments ?? 0} />
        <Stat label="Active Locations" value={counts?.active_locations ?? 0} />
        <Stat label="Letterheads" value={counts?.active_letterheads ?? 0} />
        <Stat label="Signatures" value={counts?.active_signatures ?? 0} />
        <Stat label="Disclaimers" value={counts?.active_disclaimers ?? 0} />
        <Stat label="Footers" value={counts?.active_footers ?? 0} />
      </div>

      {issues.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> No issues detected. Configuration is complete.
        </CardContent></Card>
      ) : SCOPES.map((scope) => {
        const list = issues.filter((i) => i.scope === scope);
        if (list.length === 0) return null;
        return (
          <Card key={scope}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {scope} <Badge variant="outline">{list.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {list.map((i, idx) => {
                const meta = SEV_META[i.severity];
                return (
                  <div key={idx} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                    <div className="flex items-start gap-2 min-w-0">
                      <meta.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta.tone}`} />
                      <div className="min-w-0">
                        <div className="truncate">{i.title}</div>
                        {i.detail && <div className="text-xs text-muted-foreground truncate">{i.detail}</div>}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link to={i.fixHref}>{i.fixLabel} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <LegalIntegrationReport />
    </div>
  );
}

export default function UsageValidationPage() {
  return (
    <PermissionWrapper moduleName="org_usage_validation">
      <UsageValidationInner />
    </PermissionWrapper>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
