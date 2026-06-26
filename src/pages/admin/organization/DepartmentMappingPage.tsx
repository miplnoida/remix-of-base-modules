import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useDepartmentProfiles, useOrganizations, useOfficeLocations } from "@/hooks/comm/useOrgManagement";
import { useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters } from "@/hooks/comm/useCommAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

type Slot = { label: string; orgKey: string; inheritKey: string; overrideKey: string };
const SLOTS: Slot[] = [
  { label: "Letterhead",       orgKey: "default_letterhead_id",       inheritKey: "inherit_letterhead_from_org",       overrideKey: "override_letterhead_asset_id" },
  { label: "Email Signature",  orgKey: "default_email_signature_id",  inheritKey: "inherit_email_signature_from_org",  overrideKey: "override_email_signature_asset_id" },
  { label: "Disclaimer",       orgKey: "default_disclaimer_id",       inheritKey: "inherit_disclaimer_from_org",       overrideKey: "override_disclaimer_asset_id" },
  { label: "Print Footer",     orgKey: "default_print_footer_id",     inheritKey: "inherit_print_footer_from_org",     overrideKey: "override_print_footer_asset_id" },
  { label: "Location",         orgKey: "default_location_id",         inheritKey: "inherit_location_from_org",         overrideKey: "primary_location_id" },
];

function Inner() {
  const { data: depts = [], isLoading } = useDepartmentProfiles();
  const { data: orgs = [] } = useOrganizations();
  const { data: locations = [] } = useOfficeLocations();
  const { data: letterheads = [] } = useLetterheads();
  const { data: signatures = [] } = useEmailSignatures();
  const { data: disclaimers = [] } = useDisclaimers();
  const { data: footers = [] } = usePrintFooters();
  const org: any = orgs[0] ?? {};
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected: any = useMemo(() => depts.find((d: any) => d.id === selectedId) ?? depts[0], [depts, selectedId]);

  const nameFor = (slot: Slot): string => {
    if (slot.label === "Location") {
      const id = selected?.[slot.overrideKey];
      return locations.find((l) => l.id === id)?.branch_name ?? "—";
    }
    const id = selected?.[slot.overrideKey];
    const pool: any[] = slot.label === "Letterhead" ? letterheads
      : slot.label === "Email Signature" ? signatures
      : slot.label === "Disclaimer" ? disclaimers
      : footers;
    return pool.find((p) => p.id === id)?.name ?? "—";
  };

  const orgNameFor = (slot: Slot): string => {
    const id = org[slot.orgKey];
    if (slot.label === "Location") return locations.find((l) => l.id === id)?.branch_name ?? "Not set";
    const pool: any[] = slot.label === "Letterhead" ? letterheads
      : slot.label === "Email Signature" ? signatures
      : slot.label === "Disclaimer" ? disclaimers
      : footers;
    return pool.find((p) => p.id === id)?.name ?? "Not set";
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Network className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Department Communication Mapping</h1>
          <p className="text-sm text-muted-foreground">Choose which letterhead, signature, disclaimer, footer and location each department uses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <Card>
          <CardContent className="p-2">
            {depts.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">No departments yet.</div>
            ) : depts.map((d: any) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted ${selected?.id === d.id ? "bg-muted font-medium" : ""}`}
              >
                <div>{d.department_name}</div>
                <div className="text-xs text-muted-foreground">{d.department_code}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            {!selected ? <div className="text-sm text-muted-foreground">Select a department.</div> : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{selected.department_name}</div>
                    <div className="text-xs text-muted-foreground">{selected.department_code}</div>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link to="/admin/organization/departments">Edit department</Link></Button>
                </div>
                <div className="divide-y rounded-md border">
                  {SLOTS.map((slot) => {
                    const inherits = selected[slot.inheritKey] !== false;
                    const overrideName = nameFor(slot);
                    const orgName = orgNameFor(slot);
                    const missing = inherits ? orgName === "Not set" : overrideName === "—";
                    return (
                      <div key={slot.label} className="p-3 flex flex-wrap items-center gap-3">
                        <div className="w-40 text-sm font-medium">{slot.label}</div>
                        {inherits ? (
                          <>
                            <Badge variant="outline">Using Organization Default</Badge>
                            <span className="text-sm text-muted-foreground">{orgName}</span>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary">Department Specific</Badge>
                            <span className="text-sm">{overrideName}</span>
                          </>
                        )}
                        {missing && <Badge variant="destructive">Missing</Badge>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  To change a mapping, edit the department in <Link to="/admin/organization/departments" className="underline text-primary">Departments &amp; Units</Link>.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DepartmentMappingPage() {
  return <PermissionWrapper moduleName="org_dept_mapping"><Inner /></PermissionWrapper>;
}
