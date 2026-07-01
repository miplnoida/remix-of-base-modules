import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { Gavel, Plus, Pencil, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mapSupabaseError } from "@/lib/legal/adminValidation";

const sb = supabase as any;

type AnyRow = Record<string, any>;

function useTable(table: string) {
  return useQuery({
    queryKey: ["lg_court_admin", table],
    queryFn: async () => {
      const { data, error } = await sb.from(table).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnyRow[];
    },
  });
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 whitespace-nowrap">Active</Badge>
    : <Badge variant="secondary" className="whitespace-nowrap">Inactive</Badge>;
}

interface FormFieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "number" | "switch";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}

function EntityDialog({
  open, onOpenChange, title, fields, initial, onSubmit, submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  fields: FormFieldDef[];
  initial: AnyRow;
  onSubmit: (values: AnyRow) => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<AnyRow>(initial);
  // Reset when dialog re-opens
  const set = (k: string, v: any) => setValues((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (v) setValues(initial); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                <Label htmlFor={f.key}>{f.label}{f.required && " *"}</Label>
                {f.type === "textarea" ? (
                  <Textarea id={f.key} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} maxLength={f.maxLength} />
                ) : f.type === "select" ? (
                  <Select value={values[f.key] ?? ""} onValueChange={(v) => set(f.key, v)}>
                    <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Select..."} /></SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.type === "switch" ? (
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={!!values[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                    <span className="text-sm text-muted-foreground">{values[f.key] ? "Active" : "Inactive"}</span>
                  </div>
                ) : (
                  <Input
                    id={f.key}
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)}
                    maxLength={f.maxLength}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EntitySection({
  table, singular, plural, fields, columns,
}: {
  table: string;
  singular: string;
  plural: string;
  fields: FormFieldDef[];
  columns: { key: string; label: string; render?: (r: AnyRow) => any }[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useTable(table);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AnyRow | null>(null);

  const mut = useMutation({
    mutationFn: async (values: AnyRow) => {
      // Enforce required-field validation before hitting the DB
      const missing = fields.filter((f) => f.required && (values[f.key] === undefined || values[f.key] === null || String(values[f.key]).trim() === ""));
      if (missing.length) {
        throw new Error(`Please fill in required field${missing.length > 1 ? "s" : ""}: ${missing.map((f) => f.label).join(", ")}`);
      }
      const payload: AnyRow = {};
      for (const f of fields) payload[f.key] = values[f.key] === "" ? null : (values[f.key] ?? null);
      if (editing) {
        const { error } = await sb.from(table).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        if (payload.active === undefined || payload.active === null) payload.active = true;
        const { error } = await sb.from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_court_admin", table] });
      toast({ title: editing ? `${singular} updated` : `${singular} added` });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: mapSupabaseError(e), variant: "destructive" }),
  });

  const initial: AnyRow = editing ?? Object.fromEntries(fields.map((f) => [f.key, f.type === "switch" ? true : ""]));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{plural}</CardTitle>
          <CardDescription>Configure {plural.toLowerCase()} used in Legal court proceedings.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" />Add {singular}</Button>
          </DialogTrigger>
          <EntityDialog
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
            title={editing ? `Edit ${singular}` : `Add ${singular}`}
            fields={fields}
            initial={initial}
            onSubmit={(v) => mut.mutate(v)}
            submitting={mut.isPending}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading...</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No {plural.toLowerCase()} configured yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  {columns.map((c) => <TableCell key={c.key}>{c.render ? c.render(r) : r[c.key] ?? "—"}</TableCell>)}
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function LegalCourtAdmin() {
  const { data: courts = [] } = useTable("lg_court");
  const courtOptions = courts.map((c: AnyRow) => ({ value: c.court_code, label: `${c.court_code} — ${c.court_name}` }));

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <BackNavigation to="/legal/admin" />
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Gavel className="h-6 w-6" /> Court Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Master setup for Courts, Divisions, Venues and Judicial Officers. Court suit / JDS / writ / warrant
          numbers are <strong>manually entered</strong> on proceedings — SSB does not auto-generate them.
        </p>
      </div>

      <Tabs defaultValue="courts">
        <TabsList>
          <TabsTrigger value="courts">Courts</TabsTrigger>
          <TabsTrigger value="divisions">Divisions / Districts</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
          <TabsTrigger value="officers">Judges / Magistrates</TabsTrigger>
        </TabsList>

        <TabsContent value="courts" className="mt-4">
          <EntitySection
            table="lg_court"
            singular="Court"
            plural="Courts"
            fields={[
              { key: "court_code", label: "Court Code", required: true, maxLength: 50 },
              { key: "court_name", label: "Court Name", required: true, maxLength: 200 },
              { key: "court_type", label: "Court Type", type: "select", required: true, options: [
                { value: "MAGISTRATE", label: "Magistrate" },
                { value: "HIGH_COURT", label: "High Court" },
                { value: "COURT_OF_APPEAL", label: "Court of Appeal" },
                { value: "OTHER", label: "Other" },
              ]},
              { key: "island", label: "Island", type: "select", required: true, options: [
                { value: "ST_KITTS", label: "St. Kitts" },
                { value: "NEVIS", label: "Nevis" },
              ]},
              { key: "country_code", label: "Country Code", maxLength: 5, placeholder: "SKN" },
              { key: "case_number_format_hint", label: "Court Case Number Format (hint)", placeholder: "e.g. SUIT-####/YYYY", maxLength: 200 },
              { key: "case_number_max_length", label: "Max Length", type: "number" },
              { key: "active", label: "Active", type: "switch" },
            ]}
            columns={[
              { key: "court_code", label: "Code" },
              { key: "court_name", label: "Name" },
              { key: "court_type", label: "Type" },
              { key: "island", label: "Island" },
              { key: "case_number_format_hint", label: "Number Hint" },
              { key: "active", label: "Status", render: (r) => <StatusBadge active={!!r.active} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="divisions" className="mt-4">
          <EntitySection
            table="lg_court_division"
            singular="Division"
            plural="Divisions / Districts"
            fields={[
              { key: "division_code", label: "Division Code", required: true, maxLength: 50 },
              { key: "court_code", label: "Court", type: "select", required: true, options: courtOptions },
              { key: "division_name", label: "Division Name", required: true, maxLength: 200 },
              { key: "civil_criminal_type", label: "Civil / Criminal", type: "select", options: [
                { value: "CIVIL", label: "Civil" }, { value: "CRIMINAL", label: "Criminal" }, { value: "BOTH", label: "Both" },
              ]},
              { key: "district_code", label: "District Code", maxLength: 20, placeholder: "A, B, C…" },
              { key: "active", label: "Active", type: "switch" },
            ]}
            columns={[
              { key: "division_code", label: "Code" },
              { key: "court_code", label: "Court" },
              { key: "division_name", label: "Name" },
              { key: "civil_criminal_type", label: "Type" },
              { key: "district_code", label: "District" },
              { key: "active", label: "Status", render: (r) => <StatusBadge active={!!r.active} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="venues" className="mt-4">
          <EntitySection
            table="lg_court_venue"
            singular="Venue"
            plural="Court Venues"
            fields={[
              { key: "venue_code", label: "Venue Code", required: true, maxLength: 50 },
              { key: "court_code", label: "Court", type: "select", required: true, options: courtOptions },
              { key: "venue_name", label: "Venue Name", required: true, maxLength: 200 },
              { key: "address", label: "Address", type: "textarea" },
              { key: "island", label: "Island", type: "select", options: [
                { value: "ST_KITTS", label: "St. Kitts" }, { value: "NEVIS", label: "Nevis" },
              ]},
              { key: "active", label: "Active", type: "switch" },
            ]}
            columns={[
              { key: "venue_code", label: "Code" },
              { key: "venue_name", label: "Name" },
              { key: "court_code", label: "Court" },
              { key: "island", label: "Island" },
              { key: "active", label: "Status", render: (r) => <StatusBadge active={!!r.active} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="officers" className="mt-4">
          <EntitySection
            table="lg_court_officer"
            singular="Officer"
            plural="Judges / Magistrates / Officers"
            fields={[
              { key: "officer_code", label: "Officer Code", required: true, maxLength: 50 },
              { key: "officer_name", label: "Full Name", required: true, maxLength: 200 },
              { key: "officer_type", label: "Officer Type", type: "select", required: true, options: [
                { value: "MAGISTRATE", label: "Magistrate" },
                { value: "JUDGE", label: "Judge" },
                { value: "REGISTRAR", label: "Registrar" },
                { value: "CLERK", label: "Clerk" },
                { value: "OTHER", label: "Other" },
              ]},
              { key: "court_code", label: "Court", type: "select", options: courtOptions },
              { key: "active_from", label: "Active From", type: "date" },
              { key: "active_to", label: "Active To", type: "date" },
              { key: "notes", label: "Notes", type: "textarea" },
              { key: "active", label: "Active", type: "switch" },
            ]}
            columns={[
              { key: "officer_code", label: "Code" },
              { key: "officer_name", label: "Name" },
              { key: "officer_type", label: "Type" },
              { key: "court_code", label: "Court" },
              { key: "active_from", label: "From" },
              { key: "active_to", label: "To" },
              { key: "active", label: "Status", render: (r) => <StatusBadge active={!!r.active} /> },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
