import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Users, Loader2 } from "lucide-react";
import { useDepartmentProfiles, useDepartmentProfileMutation, useOfficeLocations, useOrganizations } from "@/hooks/comm/useOrgManagement";
import { useLetterheads, useEmailSignatures, useDisclaimers, usePrintFooters } from "@/hooks/comm/useCommAssets";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

function DepartmentProfilesInner() {
  const { data: rows = [], isLoading } = useDepartmentProfiles();
  const { data: orgs = [] } = useOrganizations();
  const { data: locations = [] } = useOfficeLocations();
  const { data: letterheads = [] } = useLetterheads();
  const { data: signatures = [] } = useEmailSignatures();
  const { data: disclaimers = [] } = useDisclaimers();
  const { data: footers = [] } = usePrintFooters();
  const mut = useDepartmentProfileMutation();
  const [editing, setEditing] = useState<any | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const open = (row?: any) => {
    setErrors({});
    setEditing(row ?? { status: "ACTIVE", module_code: "LEGAL", organization_id: orgs[0]?.id ?? null });
  };

  const save = () => {
    const e: Record<string, string> = {};
    if (!editing.department_code?.trim()) e.department_code = "Required";
    if (!editing.department_name?.trim()) e.department_name = "Required";
    if (!editing.module_code?.trim()) e.module_code = "Required";
    setErrors(e);
    if (Object.keys(e).length) return;
    mut.mutate(editing, { onSuccess: () => setEditing(null) });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Department Profiles</h1>
            <p className="text-sm text-muted-foreground">Generic department configuration. Reuses organization, locations, and communication assets.</p>
          </div>
        </div>
        <Button onClick={() => open()}><Plus className="h-4 w-4 mr-2" /> Add Department</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell><Badge variant="outline">{r.module_code}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.department_code}</TableCell>
                    <TableCell className="font-medium">{r.department_name}</TableCell>
                    <TableCell>{r.department_type ?? "—"}</TableCell>
                    <TableCell>{r.department_manager_user_code ?? "—"}</TableCell>
                    <TableCell><Badge variant={r.status === "ACTIVE" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => open(r)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground p-8">No department profiles yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Department Profile" : "Add Department Profile"}</DialogTitle></DialogHeader>
          {editing && (
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="leadership">Leadership</TabsTrigger>
                <TabsTrigger value="locations">Locations</TabsTrigger>
                <TabsTrigger value="comm">Comm Defaults</TabsTrigger>
                <TabsTrigger value="dms">DMS & AI</TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="grid md:grid-cols-2 gap-3">
                <Field label="Module Code *" error={errors.module_code}><Input value={editing.module_code ?? ""} onChange={(e) => setEditing({ ...editing, module_code: e.target.value.toUpperCase() })} /></Field>
                <Field label="Department Code *" error={errors.department_code}><Input value={editing.department_code ?? ""} onChange={(e) => setEditing({ ...editing, department_code: e.target.value })} /></Field>
                <Field label="Department Name *" error={errors.department_name} className="md:col-span-2"><Input value={editing.department_name ?? ""} onChange={(e) => setEditing({ ...editing, department_name: e.target.value })} /></Field>
                <Field label="Type"><Input value={editing.department_type ?? ""} onChange={(e) => setEditing({ ...editing, department_type: e.target.value })} /></Field>
                <Field label="Organization">
                  <select className="w-full border rounded h-10 px-2 bg-background" value={editing.organization_id ?? ""} onChange={(e) => setEditing({ ...editing, organization_id: e.target.value || null })}>
                    <option value="">—</option>
                    {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.legal_name}</option>)}
                  </select>
                </Field>
                <Field label="Description" className="md:col-span-2"><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              </TabsContent>
              <TabsContent value="leadership" className="grid md:grid-cols-2 gap-3">
                <Field label="Manager User Code"><Input value={editing.department_manager_user_code ?? ""} onChange={(e) => setEditing({ ...editing, department_manager_user_code: e.target.value })} /></Field>
                <Field label="Deputy Manager User Code"><Input value={editing.deputy_manager_user_code ?? ""} onChange={(e) => setEditing({ ...editing, deputy_manager_user_code: e.target.value })} /></Field>
                <Field label="Escalation Contact User Code"><Input value={editing.escalation_contact_user_code ?? ""} onChange={(e) => setEditing({ ...editing, escalation_contact_user_code: e.target.value })} /></Field>
              </TabsContent>
              <TabsContent value="locations" className="grid md:grid-cols-2 gap-3">
                <Field label="Primary Location"><LocationSelect value={editing.primary_location_id} onChange={(v) => setEditing({ ...editing, primary_location_id: v })} locations={locations} /></Field>
                <Field label="Default Letter Location"><LocationSelect value={editing.default_letter_location_id} onChange={(v) => setEditing({ ...editing, default_letter_location_id: v })} locations={locations} /></Field>
                <Field label="Default Email Location"><LocationSelect value={editing.default_email_location_id} onChange={(v) => setEditing({ ...editing, default_email_location_id: v })} locations={locations} /></Field>
                <Field label="Default DMS Location"><LocationSelect value={editing.default_dms_location_id} onChange={(v) => setEditing({ ...editing, default_dms_location_id: v })} locations={locations} /></Field>
              </TabsContent>
              <TabsContent value="comm" className="grid md:grid-cols-2 gap-3">
                <Field label="Letterhead"><AssetSelect value={editing.default_letterhead_id} onChange={(v) => setEditing({ ...editing, default_letterhead_id: v })} options={letterheads} /></Field>
                <Field label="Email Signature"><AssetSelect value={editing.default_email_signature_id} onChange={(v) => setEditing({ ...editing, default_email_signature_id: v })} options={signatures} /></Field>
                <Field label="Disclaimer"><AssetSelect value={editing.default_disclaimer_id} onChange={(v) => setEditing({ ...editing, default_disclaimer_id: v })} options={disclaimers} /></Field>
                <Field label="Print Footer"><AssetSelect value={editing.default_print_footer_id} onChange={(v) => setEditing({ ...editing, default_print_footer_id: v })} options={footers} /></Field>
              </TabsContent>
              <TabsContent value="dms" className="grid md:grid-cols-2 gap-3">
                <Field label="DMS Folder Root"><Input value={editing.dms_folder_root ?? ""} onChange={(e) => setEditing({ ...editing, dms_folder_root: e.target.value })} /></Field>
                <Field label="Default Team ID"><Input value={editing.default_team_id ?? ""} onChange={(e) => setEditing({ ...editing, default_team_id: e.target.value })} /></Field>
                <Field label="Default Workbasket ID"><Input value={editing.default_workbasket_id ?? ""} onChange={(e) => setEditing({ ...editing, default_workbasket_id: e.target.value })} /></Field>
                <Field label="AI Prompt Prefix" className="md:col-span-2"><Textarea value={editing.ai_prompt_prefix ?? ""} onChange={(e) => setEditing({ ...editing, ai_prompt_prefix: e.target.value })} /></Field>
                <div className="flex items-center gap-2"><Switch checked={!!editing.show_on_pdfs} onCheckedChange={(v) => setEditing({ ...editing, show_on_pdfs: v })} /><Label>Show on PDFs</Label></div>
                <div className="flex items-center gap-2"><Switch checked={!!editing.show_letterhead_on_reports} onCheckedChange={(v) => setEditing({ ...editing, show_letterhead_on_reports: v })} /><Label>Show letterhead on reports</Label></div>
              </TabsContent>
            </Tabs>
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

function LocationSelect({ value, onChange, locations }: any) {
  return (
    <select className="w-full border rounded h-10 px-2 bg-background" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {locations.filter((l: any) => l.is_active !== false).map((l: any) => <option key={l.id} value={l.id}>{l.branch_name}</option>)}
    </select>
  );
}

function AssetSelect({ value, onChange, options }: any) {
  return (
    <select className="w-full border rounded h-10 px-2 bg-background" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">—</option>
      {options.filter((o: any) => o.is_active !== false).map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
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
