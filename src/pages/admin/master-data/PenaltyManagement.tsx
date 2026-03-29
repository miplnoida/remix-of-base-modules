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

interface Row { id: number; effective_start_date: string; effective_end_date: string | null; penalty_type: string; month_number: number; penalty_percentage: number; description: string | null; is_active: boolean; created_by: string; created_date: string; modified_by: string | null; modified_date: string | null; }
const TABLE = "tb_penalty"; const MODULE_NAME = "md_penalty"; const TITLE = "Penalty Rates";

const PenaltyManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME); const { userCode } = useUserCode();
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ effective_start_date: undefined as Date | undefined, effective_end_date: undefined as Date | undefined, penalty_type: "", month_number: "", penalty_percentage: "", description: "", is_active: true });

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
  const filtered = rows.filter(r => r.penalty_type.toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase()));
  const openAdd = () => { setEditing(null); setForm({ effective_start_date: undefined, effective_end_date: undefined, penalty_type: "", month_number: "", penalty_percentage: "", description: "", is_active: true }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ effective_start_date: new Date(r.effective_start_date), effective_end_date: r.effective_end_date ? new Date(r.effective_end_date) : undefined, penalty_type: r.penalty_type, month_number: String(r.month_number), penalty_percentage: String(r.penalty_percentage), description: r.description || "", is_active: r.is_active }); setShowDialog(true); };
  const handleSave = () => {
    if (!form.penalty_type.trim() || !form.effective_start_date || !form.month_number || !form.penalty_percentage) { toast.error("Required fields missing"); return; }
    saveMutation.mutate({ effective_start_date: formatDateForStorage(form.effective_start_date), effective_end_date: form.effective_end_date ? formatDateForStorage(form.effective_end_date) : null, penalty_type: form.penalty_type.trim(), month_number: Number(form.month_number), penalty_percentage: Number(form.penalty_percentage), description: form.description || null, is_active: form.is_active });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage penalty rate master data</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All penalty rate records</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (
            <Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Penalty Type</TableHead><TableHead>Month</TableHead><TableHead>Percentage</TableHead><TableHead>Start Date</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map(r => (<TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell className="font-medium">{r.penalty_type}</TableCell><TableCell>{r.month_number}</TableCell><TableCell>{r.penalty_percentage}%</TableCell><TableCell>{formatDateForDisplay(r.effective_start_date)}</TableCell><TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.id); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
              </TableBody></Table>)}</CardContent></Card>
        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>View Penalty Rate</DialogTitle></DialogHeader>{viewing && <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label className="text-muted-foreground text-xs">ID</Label><p className="font-medium">{viewing.id}</p></div>
          <div><Label className="text-muted-foreground text-xs">Penalty Type</Label><p className="font-medium">{viewing.penalty_type}</p></div>
          <div><Label className="text-muted-foreground text-xs">Month Number</Label><p className="font-medium">{viewing.month_number}</p></div>
          <div><Label className="text-muted-foreground text-xs">Percentage</Label><p className="font-medium">{viewing.penalty_percentage}%</p></div>
          <div><Label className="text-muted-foreground text-xs">Start Date</Label><p className="font-medium">{formatDateForDisplay(viewing.effective_start_date)}</p></div>
          <div><Label className="text-muted-foreground text-xs">End Date</Label><p className="font-medium">{viewing.effective_end_date ? formatDateForDisplay(viewing.effective_end_date) : "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.description || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Active</Label><p className="font-medium">{viewing.is_active ? "Yes" : "No"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Created By</Label><p className="font-medium">{viewing.created_by}</p></div>
          <div><Label className="text-muted-foreground text-xs">Modified By</Label><p className="font-medium">{viewing.modified_by || "-"}</p></div>
        </div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Penalty Rate</DialogTitle><DialogDescription>{editing ? "Update details" : "Create a new record"}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Penalty Type *</Label><Input value={form.penalty_type} onChange={e => setForm({ ...form, penalty_type: e.target.value })} /></div>
            <div className="space-y-2"><Label>Month Number *</Label><Input type="number" value={form.month_number} onChange={e => setForm({ ...form, month_number: e.target.value })} /></div>
            <div className="space-y-2"><Label>Percentage *</Label><Input type="number" step="0.01" value={form.penalty_percentage} onChange={e => setForm({ ...form, penalty_percentage: e.target.value })} /></div>
            <div className="space-y-2"><Label>Start Date *</Label><DatePicker date={form.effective_start_date} onDateChange={d => setForm({ ...form, effective_start_date: d })} /></div>
            <div className="space-y-2"><Label>End Date</Label><DatePicker date={form.effective_end_date} onDateChange={d => setForm({ ...form, effective_end_date: d })} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2 col-span-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId != null && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default PenaltyManagement;
