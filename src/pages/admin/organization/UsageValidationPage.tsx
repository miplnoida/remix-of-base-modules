import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { useOrgUsageCounts, useDepartmentProfiles, useOrganizations, useOfficeLocations } from "@/hooks/comm/useOrgManagement";
import { useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters } from "@/hooks/comm/useCommAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

function UsageValidationInner() {
  const { data: counts, isLoading } = useOrgUsageCounts();
  const { data: orgs = [] } = useOrganizations();
  const { data: depts = [] } = useDepartmentProfiles();
  const { data: locs = [] } = useOfficeLocations();
  const { data: lhs = [] } = useLetterheads();
  const { data: sigs = [] } = useEmailSignatures();
  const { data: discs = [] } = useDisclaimers();
  const { data: foots = [] } = usePrintFooters();

  const org = orgs[0] ?? {};
  const warnings: string[] = [];
  if (!orgs.length) warnings.push("No organization profile configured.");
  if (!locs.some((l) => l.is_primary && l.is_active)) warnings.push("No active primary location.");

  // Asset checks aware of inheritance — only warn when inheritance is OFF and no
  // override is set, or when inheritance is ON but the org default is missing.
  const checks: Array<[string, string, string]> = [
    ["letterhead", "inherit_letterhead_from_org", "default_letterhead_id"],
    ["email signature", "inherit_email_signature_from_org", "default_email_signature_id"],
    ["disclaimer", "inherit_disclaimer_from_org", "default_disclaimer_id"],
    ["print footer", "inherit_print_footer_from_org", "default_print_footer_id"],
    ["location", "inherit_location_from_org", "default_location_id"],
  ];
  depts.forEach((d: any) => {
    checks.forEach(([label, flag, orgKey]) => {
      const inherit = d[flag] !== false;
      const overrideKey = orgKey.replace("default_", "") === "location_id"
        ? "primary_location_id"
        : orgKey.replace("default_", "override_").replace("_id", "_asset_id");
      const hasOverride = !!d[overrideKey] || !!d[orgKey];
      if (inherit && !org[orgKey]) {
        warnings.push(`${d.department_code}: inherits ${label} but organization default is not set.`);
      } else if (!inherit && !hasOverride) {
        warnings.push(`${d.department_code}: ${label} override is on but no asset selected.`);
      }
    });
  });


  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Usage &amp; Validation</h1>
          <p className="text-sm text-muted-foreground">Where org/dept/communication-asset records are referenced and what is missing.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Organizations" value={counts?.organizations ?? 0} />
        <Stat label="Departments" value={counts?.departments ?? 0} />
        <Stat label="Active Locations" value={counts?.active_locations ?? 0} />
        <Stat label="Active Letterheads" value={counts?.active_letterheads ?? 0} />
        <Stat label="Active Signatures" value={counts?.active_signatures ?? 0} />
        <Stat label="Active Disclaimers" value={counts?.active_disclaimers ?? 0} />
        <Stat label="Active Print Footers" value={counts?.active_footers ?? 0} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Consumers</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <div>• Letter / template rendering → <code>communicationResolver.ts</code></div>
          <div>• Legal Department Profile → <code>/legal/admin/profile</code></div>
          <div>• Generated PDFs / DMS metadata → resolver tokens</div>
          <div>• Email notifications → resolver tokens</div>
          <div>• AI prompt context → <code>departmentMergeContext.ts</code></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Missing Configuration</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {warnings.length === 0 ? <div className="text-muted-foreground">No issues detected.</div> :
            warnings.map((w, i) => <div key={i} className="flex items-start gap-2"><Badge variant="outline">!</Badge><span>{w}</span></div>)}
        </CardContent>
      </Card>
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
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
