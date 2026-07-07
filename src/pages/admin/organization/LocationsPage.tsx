import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, MapPin, Loader2, Search, Star } from "lucide-react";
import { useOfficeLocations, useOfficeLocationMutation, type OfficeLocation } from "@/hooks/comm/useOrgManagement";
import { useCountryOptions } from "@/hooks/comm/useOrgMasters";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const TYPES = ["HEAD_OFFICE", "BRANCH", "SERVICE_CENTER", "OTHER"] as const;
const TYPE_LABEL: Record<string, string> = {
  HEAD_OFFICE: "Head Office",
  BRANCH: "Branch",
  SERVICE_CENTER: "Service Center",
  OTHER: "Other",
};

function LocationsInner() {
  const { data: locations = [], isLoading } = useOfficeLocations();
  const { data: countries = [] } = useCountryOptions();
  const mut = useOfficeLocationMutation();
  const [editing, setEditing] = useState<Partial<OfficeLocation> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const open = (row?: OfficeLocation) => {
    setErrors({});
    setEditing(row ?? { is_active: true, location_type: "BRANCH", country: "KN" });
  };

  const save = () => {
    if (!editing) return;
    const e: Record<string, string> = {};
    if (!editing.branch_name?.trim()) e.branch_name = "Required";
    if (!editing.country?.trim()) e.country = "Required";
    setErrors(e);
    if (Object.keys(e).length) return;
    mut.mutate(editing, { onSuccess: () => setEditing(null) });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: locations.length };
    for (const t of TYPES) c[t] = 0;
    for (const l of locations) {
      const t = l.location_type ?? "OTHER";
      c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  }, [locations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return locations.filter((l) => {
      if (typeFilter !== "ALL" && (l.location_type ?? "") !== typeFilter) return false;
      if (!q) return true;
      return [l.branch_name, l.parish_city, l.city, l.island_or_region, l.country, l.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [locations, query, typeFilter]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Locations / Branches</h1>
            <p className="text-sm text-muted-foreground">Centrally managed offices. Reused by department profiles, letters, and notifications.</p>
          </div>
        </div>
        <Button onClick={() => open()}><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, region, country…"
            className="pl-9"
          />
        </div>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="ALL">All <span className="ml-1.5 text-xs text-muted-foreground">{counts.ALL}</span></TabsTrigger>
            {TYPES.map((t) => (
              <TabsTrigger key={t} value={t}>
                {TYPE_LABEL[t]} <span className="ml-1.5 text-xs text-muted-foreground">{counts[t] ?? 0}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table sticky>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {l.branch_name}
                        {l.is_primary && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
                      </div>
                      {l.address && <div className="text-xs text-muted-foreground font-normal truncate max-w-[240px]">{l.address}</div>}
                    </TableCell>
                    <TableCell><Badge variant="outline">{TYPE_LABEL[l.location_type ?? "OTHER"] ?? l.location_type ?? "—"}</Badge></TableCell>
                    <TableCell>{l.island_or_region ?? "—"}</TableCell>
                    <TableCell>{l.parish_city ?? l.city ?? "—"}</TableCell>
                    <TableCell>{l.country ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {l.phone && <div>{l.phone}</div>}
                      {l.email && <div className="truncate max-w-[180px]">{l.email}</div>}
                      {!l.phone && !l.email && "—"}
                    </TableCell>
                    <TableCell>{l.is_primary ? <Badge>Primary</Badge> : "—"}</TableCell>
                    <TableCell>{l.is_active !== false ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => open(l)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground p-8">
                      {locations.length ? "No locations match your search." : "No locations yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>Fields marked <span className="text-destructive">*</span> are required.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-5">
              <Section title="Identity">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Name *" error={errors.branch_name} className="md:col-span-2">
                    <Input value={editing.branch_name ?? ""} onChange={(e) => setEditing({ ...editing, branch_name: e.target.value })} placeholder="Head Office - Basseterre" />
                  </Field>
                  <Field label="Type">
                    <select className="w-full border rounded-md h-10 px-3 bg-background text-sm" value={editing.location_type ?? "BRANCH"} onChange={(e) => setEditing({ ...editing, location_type: e.target.value })}>
                      {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </Field>
                  <Field label="Country *" error={errors.country}>
                    <select className="w-full border rounded-md h-10 px-3 bg-background text-sm" value={editing.country ?? ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })}>
                      <option value="">— Select country —</option>
                      {countries.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.description}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Address">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Island / Region"><Input value={editing.island_or_region ?? ""} onChange={(e) => setEditing({ ...editing, island_or_region: e.target.value })} placeholder="Saint Kitts" /></Field>
                  <Field label="Parish / City"><Input value={editing.parish_city ?? ""} onChange={(e) => setEditing({ ...editing, parish_city: e.target.value })} placeholder="Basseterre" /></Field>
                  <Field label="Street Address" className="md:col-span-2"><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
                </div>
              </Section>

              <Section title="Contact">
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Phone"><Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="(869) 465-2535" /></Field>
                  <Field label="Fax"><Input value={editing.fax ?? ""} onChange={(e) => setEditing({ ...editing, fax: e.target.value })} /></Field>
                  <Field label="Email"><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="office@socialsecurity.kn" /></Field>
                  <Field label="Office Hours"><Input value={editing.office_hours ?? ""} onChange={(e) => setEditing({ ...editing, office_hours: e.target.value })} placeholder="Mon–Fri 8:00–16:00" /></Field>
                  <Field label="Manager User Code" className="md:col-span-2"><Input value={editing.manager_user_code ?? ""} onChange={(e) => setEditing({ ...editing, manager_user_code: e.target.value })} /></Field>
                </div>
              </Section>

              <Section title="Flags">
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <div>
                    <Label>Primary location</Label>
                    <p className="text-xs text-muted-foreground">Used as the organization's default office.</p>
                  </div>
                  <Switch checked={!!editing.is_primary} onCheckedChange={(v) => setEditing({ ...editing, is_primary: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md border mt-2">
                  <div>
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Inactive locations are hidden from selectors.</p>
                  </div>
                  <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
              </Section>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={mut.isPending}>{mut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LocationsPage() {
  return (
    <PermissionWrapper moduleName="org_locations">
      <LocationsInner />
    </PermissionWrapper>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: any; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
