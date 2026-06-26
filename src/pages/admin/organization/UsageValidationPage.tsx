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

  const warnings: string[] = [];
  if (!orgs.length) warnings.push("No organization profile configured.");
  if (!locs.some((l) => l.is_primary && l.is_active)) warnings.push("No active primary location.");
  depts.forEach((d: any) => {
    if (!d.primary_location_id) warnings.push(`Department ${d.department_code} has no primary location.`);
    if (!d.default_letterhead_id) warnings.push(`Department ${d.department_code} has no default letterhead.`);
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
