import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { useUserCode } from "@/hooks/useUserCode";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateForDisplay, formatDateForStorage } from "@/lib/format-config";

interface Row { id: number; effective_start_date: string; effective_end_date: string | null; employee_ss_percentage: number; employer_ss_percentage: number; employee_pe_percentage: number; employer_ei_percentage: number; employer_levy_percentage: number; description: string | null; is_active: boolean; created_by: string; modified_by: string | null; }
const TABLE = "tb_ssc_rates"; const MODULE_NAME = "md_ssc_rates"; const TITLE = "SSC Rates";

const SscRatesManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME); const { userCode } = useUserCode();
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ effective_start_date: undefined as Date | undefined, effective_end_date: undefined as Date | undefined, employee_ss_percentage: "", employer_ss_percentage: "", employee_pe_percentage: "", employer_ei_percentage: "", employer_levy_percentage: "", description: "", is_active: true });

  const { data: rows = [], isLoading } = useQuery({ queryKey: [TABLE], queryFn: async () => { const { data, error } = await (supabase as any).from(TABLE).select("*").order("id"); if (error) throw error; return data as Row[]; } });
  const saveMutation = useMutation({
    mutationFn: async (r: any) => {
      if (editing) { const { error } = await (supabase as any).from(TABLE).update({ ...r, modified_by: userCode, modified_date: new Date().toISOString() }).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await (supabase as any).from(TABLE).insert({ ...r, created_by: userCode || "system", created_date: new Date().toISOString() }); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); },
    onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")),
  });
  const deleteMutation = useMutation({ mutationFn: async (id: number) => { const { error } = await (supabase as any).from(TABLE).delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); }, onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")) });
  const filtered = rows.filter(r => (r.description || "").toLowerCase().includes(search.toLowerCase()) || String(r.id).includes(search));
  const openAdd = () => { setEditing(null); setForm({ effective_start_date: undefined, effective_end_date: undefined, employee_ss_percentage: "", employer_ss_percentage: "", employee_pe_percentage: "", employer_ei_percentage: "", employer_levy_percentage: "", description: "", is_active: true }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ effective_start_date: new Date(r.effective_start_date), effective_end_date: r.effective_end_date ? new Date(r.effective_end_date) : undefined, employee_ss_percentage: String(r.employee_ss_percentage), employer_ss_percentage: String(r.employer_ss_percentage), employee_pe_percentage: String(r.employee_pe_percentage), employer_ei_percentage: String(r.employer_ei_percentage), employer_levy_percentage: String(r.employer_levy_percentage), description: r.description || "", is_active: r.is_active }); setShowDialog(true); };
  const handleSave = () => {
    if (!form.effective_start_date) { toast.error("Start Date is required"); return; }
    saveMutation.mutate({ effective_start_date: formatDateForStorage(form.effective_start_date), effective_end_date: form.effective_end_date ? formatDateForStorage(form.effective_end_date) : null, employee_ss_percentage: Number(form.employee_ss_percentage || 0), employer_ss_percentage: Number(form.employer_ss_percentage || 0), employee_pe_percentage: Number(form.employee_pe_percentage || 0), employer_ei_percentage: Number(form.employer_ei_percentage || 0), employer_levy_percentage: Number(form.employer_levy_percentage || 0), description: form.description || null, is_active: form.is_active });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage SSC rate master data</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All SSC rate records</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (
            <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Start Date</TableHead><TableHead>Emp SS%</TableHead><TableHead>Empr SS%</TableHead><TableHead>Levy%</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map(r => (<TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell>{formatDateForDisplay(r.effective_start_date)}</TableCell><TableCell>{r.employee_ss_percentage}%</TableCell><TableCell>{r.employer_ss_percentage}%</TableCell><TableCell>{r.employer_levy_percentage}%</TableCell><TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.id); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
              </TableBody></Table>)}</CardContent></Card>
        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>View SSC Rate</DialogTitle></DialogHeader>{viewing && <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label className="text-muted-foreground text-xs">ID</Label><p className="font-medium">{viewing.id}</p></div>
          <div><Label className="text-muted-foreground text-xs">Start Date</Label><p className="font-medium">{formatDateForDisplay(viewing.effective_start_date)}</p></div>
          <div><Label className="text-muted-foreground text-xs">End Date</Label><p className="font-medium">{viewing.effective_end_date ? formatDateForDisplay(viewing.effective_end_date) : "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Employee SS%</Label><p className="font-medium">{viewing.employee_ss_percentage}%</p></div>
          <div><Label className="text-muted-foreground text-xs">Employer SS%</Label><p className="font-medium">{viewing.employer_ss_percentage}%</p></div>
          <div><Label className="text-muted-foreground text-xs">Employee PE%</Label><p className="font-medium">{viewing.employee_pe_percentage}%</p></div>
          <div><Label className="text-muted-foreground text-xs">Employer EI%</Label><p className="font-medium">{viewing.employer_ei_percentage}%</p></div>
          <div><Label className="text-muted-foreground text-xs">Employer Levy%</Label><p className="font-medium">{viewing.employer_levy_percentage}%</p></div>
          <div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.description || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Active</Label><p className="font-medium">{viewing.is_active ? "Yes" : "No"}</p></div>
        </div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} SSC Rate</DialogTitle><DialogDescription>{editing ? "Update details" : "Create a new record"}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Start Date *</Label><DatePicker date={form.effective_start_date} onDateChange={d => setForm({ ...form, effective_start_date: d })} /></div>
            <div className="space-y-2"><Label>End Date</Label><DatePicker date={form.effective_end_date} onDateChange={d => setForm({ ...form, effective_end_date: d })} /></div>
            <div className="space-y-2"><Label>Employee SS%</Label><Input type="number" step="0.01" value={form.employee_ss_percentage} onChange={e => setForm({ ...form, employee_ss_percentage: e.target.value })} /></div>
            <div className="space-y-2"><Label>Employer SS%</Label><Input type="number" step="0.01" value={form.employer_ss_percentage} onChange={e => setForm({ ...form, employer_ss_percentage: e.target.value })} /></div>
            <div className="space-y-2"><Label>Employee PE%</Label><Input type="number" step="0.01" value={form.employee_pe_percentage} onChange={e => setForm({ ...form, employee_pe_percentage: e.target.value })} /></div>
            <div className="space-y-2"><Label>Employer EI%</Label><Input type="number" step="0.01" value={form.employer_ei_percentage} onChange={e => setForm({ ...form, employer_ei_percentage: e.target.value })} /></div>
            <div className="space-y-2"><Label>Employer Levy%</Label><Input type="number" step="0.01" value={form.employer_levy_percentage} onChange={e => setForm({ ...form, employer_levy_percentage: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2 col-span-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId != null && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default SscRatesManagement;
