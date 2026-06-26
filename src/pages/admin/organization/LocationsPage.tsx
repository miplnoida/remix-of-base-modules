import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, MapPin, Loader2 } from "lucide-react";
import { useOfficeLocations, useOfficeLocationMutation, type OfficeLocation } from "@/hooks/comm/useOrgManagement";

const TYPES = ["HEAD_OFFICE", "BRANCH", "SERVICE_CENTER", "OTHER"];

export default function LocationsPage() {
  const { data: locations = [], isLoading } = useOfficeLocations();
  const mut = useOfficeLocationMutation();
  const [editing, setEditing] = useState<Partial<OfficeLocation> | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.branch_name}</TableCell>
                    <TableCell><Badge variant="outline">{l.location_type ?? "—"}</Badge></TableCell>
                    <TableCell>{l.island_or_region ?? "—"}</TableCell>
                    <TableCell>{l.parish_city ?? l.city ?? "—"}</TableCell>
                    <TableCell>{l.country ?? "—"}</TableCell>
                    <TableCell>{l.is_primary ? <Badge>Primary</Badge> : "—"}</TableCell>
                    <TableCell>{l.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => open(l)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {!locations.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground p-8">No locations yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Location" : "Add Location"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Name *" error={errors.branch_name} className="md:col-span-2">
                <Input value={editing.branch_name ?? ""} onChange={(e) => setEditing({ ...editing, branch_name: e.target.value })} />
              </Field>
              <Field label="Type">
                <select className="w-full border rounded h-10 px-2 bg-background" value={editing.location_type ?? "BRANCH"} onChange={(e) => setEditing({ ...editing, location_type: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Country *" error={errors.country}><Input value={editing.country ?? ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })} placeholder="KN" /></Field>
              <Field label="Island / Region"><Input value={editing.island_or_region ?? ""} onChange={(e) => setEditing({ ...editing, island_or_region: e.target.value })} placeholder="Saint Kitts" /></Field>
              <Field label="Parish / City"><Input value={editing.parish_city ?? ""} onChange={(e) => setEditing({ ...editing, parish_city: e.target.value })} /></Field>
              <Field label="Address" className="md:col-span-2"><Input value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
              <Field label="Office Hours"><Input value={editing.office_hours ?? ""} onChange={(e) => setEditing({ ...editing, office_hours: e.target.value })} placeholder="Mon–Fri 8:00–16:00" /></Field>
              <Field label="Manager User Code"><Input value={editing.manager_user_code ?? ""} onChange={(e) => setEditing({ ...editing, manager_user_code: e.target.value })} /></Field>
              <div className="flex items-center gap-2 md:col-span-2">
                <Switch checked={!!editing.is_primary} onCheckedChange={(v) => setEditing({ ...editing, is_primary: v })} />
                <Label>Primary location for the organization</Label>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active</Label>
              </div>
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

function Field({ label, error, children, className }: { label: string; error?: string; children: any; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
