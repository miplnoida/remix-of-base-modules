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

interface Row { id: string; effstart: string; effend: string | null; vc_contrib_pct: number; vc_duration: number; min_contrib_weeks: number; min_age: number; max_age: number; residency_grace_weeks: number; termination_grace_weeks: number; wage_history_months: number; weeks_per_year: number; is_active: boolean; [key: string]: any; }
const TABLE = "tb_vc_eligibility_config"; const MODULE_NAME = "md_vc_eligibility_config"; const TITLE = "VC Eligibility Config";

const VcEligibilityConfigManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME); const { userCode } = useUserCode();
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ effstart: undefined as Date | undefined, effend: undefined as Date | undefined, vc_contrib_pct: "", vc_duration: "", min_contrib_weeks: "", min_age: "", max_age: "", residency_grace_weeks: "", termination_grace_weeks: "", wage_history_months: "", weeks_per_year: "", is_active: true });

  const { data: rows = [], isLoading } = useQuery({ queryKey: [TABLE], queryFn: async () => { const { data, error } = await (supabase as any).from(TABLE).select("*").order("effstart"); if (error) throw error; return data as Row[]; } });
  const saveMutation = useMutation({
    mutationFn: async (r: any) => {
      if (editing) { const { error } = await (supabase as any).from(TABLE).update({ ...r, updated_by: userCode, updated_at: new Date().toISOString() }).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await (supabase as any).from(TABLE).insert({ ...r, created_by: userCode, created_at: new Date().toISOString() }); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); },
    onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")),
  });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await (supabase as any).from(TABLE).delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); }, onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")) });
  const filtered = rows.filter(r => r.effstart.includes(search) || String(r.min_age).includes(search));
  const openAdd = () => { setEditing(null); setForm({ effstart: undefined, effend: undefined, vc_contrib_pct: "", vc_duration: "", min_contrib_weeks: "", min_age: "", max_age: "", residency_grace_weeks: "", termination_grace_weeks: "", wage_history_months: "", weeks_per_year: "", is_active: true }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ effstart: new Date(r.effstart), effend: r.effend ? new Date(r.effend) : undefined, vc_contrib_pct: String(r.vc_contrib_pct), vc_duration: String(r.vc_duration), min_contrib_weeks: String(r.min_contrib_weeks), min_age: String(r.min_age), max_age: String(r.max_age), residency_grace_weeks: String(r.residency_grace_weeks), termination_grace_weeks: String(r.termination_grace_weeks), wage_history_months: String(r.wage_history_months), weeks_per_year: String(r.weeks_per_year), is_active: r.is_active }); setShowDialog(true); };
  const handleSave = () => {
    if (!form.effstart) { toast.error("Start Date is required"); return; }
    saveMutation.mutate({ effstart: formatDateForStorage(form.effstart), effend: form.effend ? formatDateForStorage(form.effend) : null, vc_contrib_pct: Number(form.vc_contrib_pct || 0), vc_duration: Number(form.vc_duration || 0), min_contrib_weeks: Number(form.min_contrib_weeks || 0), min_age: Number(form.min_age || 0), max_age: Number(form.max_age || 0), residency_grace_weeks: Number(form.residency_grace_weeks || 0), termination_grace_weeks: Number(form.termination_grace_weeks || 0), wage_history_months: Number(form.wage_history_months || 0), weeks_per_year: Number(form.weeks_per_year || 0), is_active: form.is_active });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage VC eligibility configuration</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All records</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (
            <Table><TableHeader><TableRow><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Min Age</TableHead><TableHead>Max Age</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map(r => (<TableRow key={r.id}><TableCell>{formatDateForDisplay(r.effstart)}</TableCell><TableCell>{r.effend ? formatDateForDisplay(r.effend) : "-"}</TableCell><TableCell>{r.min_age}</TableCell><TableCell>{r.max_age}</TableCell><TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.id); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
              </TableBody></Table>)}</CardContent></Card>
        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>View Config</DialogTitle></DialogHeader>{viewing && <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label className="text-muted-foreground text-xs">Start Date</Label><p className="font-medium">{formatDateForDisplay(viewing.effstart)}</p></div>
          <div><Label className="text-muted-foreground text-xs">End Date</Label><p className="font-medium">{viewing.effend ? formatDateForDisplay(viewing.effend) : "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Contrib %</Label><p className="font-medium">{viewing.vc_contrib_pct}</p></div>
          <div><Label className="text-muted-foreground text-xs">Duration</Label><p className="font-medium">{viewing.vc_duration}</p></div>
          <div><Label className="text-muted-foreground text-xs">Min Weeks</Label><p className="font-medium">{viewing.min_contrib_weeks}</p></div>
          <div><Label className="text-muted-foreground text-xs">Min Age</Label><p className="font-medium">{viewing.min_age}</p></div>
          <div><Label className="text-muted-foreground text-xs">Max Age</Label><p className="font-medium">{viewing.max_age}</p></div>
          <div><Label className="text-muted-foreground text-xs">Residency Grace</Label><p className="font-medium">{viewing.residency_grace_weeks}</p></div>
          <div><Label className="text-muted-foreground text-xs">Termination Grace</Label><p className="font-medium">{viewing.termination_grace_weeks}</p></div>
          <div><Label className="text-muted-foreground text-xs">Wage History (months)</Label><p className="font-medium">{viewing.wage_history_months}</p></div>
          <div><Label className="text-muted-foreground text-xs">Weeks/Year</Label><p className="font-medium">{viewing.weeks_per_year}</p></div>
          <div><Label className="text-muted-foreground text-xs">Active</Label><p className="font-medium">{viewing.is_active ? "Yes" : "No"}</p></div>
        </div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Config</DialogTitle><DialogDescription>{editing ? "Update" : "Create"}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Start Date *</Label><DatePicker date={form.effstart} onDateChange={d => setForm({ ...form, effstart: d })} /></div>
            <div className="space-y-2"><Label>End Date</Label><DatePicker date={form.effend} onDateChange={d => setForm({ ...form, effend: d })} /></div>
            <div className="space-y-2"><Label>Contrib %</Label><Input type="number" step="0.01" value={form.vc_contrib_pct} onChange={e => setForm({ ...form, vc_contrib_pct: e.target.value })} /></div>
            <div className="space-y-2"><Label>Duration</Label><Input type="number" value={form.vc_duration} onChange={e => setForm({ ...form, vc_duration: e.target.value })} /></div>
            <div className="space-y-2"><Label>Min Contrib Weeks</Label><Input type="number" value={form.min_contrib_weeks} onChange={e => setForm({ ...form, min_contrib_weeks: e.target.value })} /></div>
            <div className="space-y-2"><Label>Min Age</Label><Input type="number" value={form.min_age} onChange={e => setForm({ ...form, min_age: e.target.value })} /></div>
            <div className="space-y-2"><Label>Max Age</Label><Input type="number" value={form.max_age} onChange={e => setForm({ ...form, max_age: e.target.value })} /></div>
            <div className="space-y-2"><Label>Residency Grace Weeks</Label><Input type="number" value={form.residency_grace_weeks} onChange={e => setForm({ ...form, residency_grace_weeks: e.target.value })} /></div>
            <div className="space-y-2"><Label>Termination Grace Weeks</Label><Input type="number" value={form.termination_grace_weeks} onChange={e => setForm({ ...form, termination_grace_weeks: e.target.value })} /></div>
            <div className="space-y-2"><Label>Wage History Months</Label><Input type="number" value={form.wage_history_months} onChange={e => setForm({ ...form, wage_history_months: e.target.value })} /></div>
            <div className="space-y-2"><Label>Weeks/Year</Label><Input type="number" value={form.weeks_per_year} onChange={e => setForm({ ...form, weeks_per_year: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default VcEligibilityConfigManagement;
