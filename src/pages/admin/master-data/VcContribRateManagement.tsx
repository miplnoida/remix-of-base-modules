import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateForDisplay, formatDateForStorage } from "@/lib/format-config";

interface Row { id: string; effstart: string; effend: string; min_contrib_weeks: number | null; submission_limit_nbr: number | null; vc_contrib_pct: number | null; vc_duration: number | null; }
const TABLE = "tb_vc_contrib_rate"; const MODULE_NAME = "md_vc_contrib_rate"; const TITLE = "VC Contribution Rates";

const VcContribRateManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME);
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ effstart: undefined as Date | undefined, effend: undefined as Date | undefined, min_contrib_weeks: "", submission_limit_nbr: "", vc_contrib_pct: "", vc_duration: "" });

  const { data: rows = [], isLoading } = useQuery({ queryKey: [TABLE], queryFn: async () => { const { data, error } = await (supabase as any).from(TABLE).select("*").order("effstart"); if (error) throw error; return data as Row[]; } });
  const saveMutation = useMutation({
    mutationFn: async (r: any) => {
      if (editing) { const { error } = await (supabase as any).from(TABLE).update({ ...r, updated_at: new Date().toISOString() }).eq("id", editing.id); if (error) throw error; }
      else { const { error } = await (supabase as any).from(TABLE).insert(r); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); },
    onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")),
  });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await (supabase as any).from(TABLE).delete().eq("id", id); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); }, onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")) });
  const filtered = rows.filter(r => String(r.vc_contrib_pct || "").includes(search) || r.effstart.includes(search));
  const openAdd = () => { setEditing(null); setForm({ effstart: undefined, effend: undefined, min_contrib_weeks: "", submission_limit_nbr: "", vc_contrib_pct: "", vc_duration: "" }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ effstart: new Date(r.effstart), effend: new Date(r.effend), min_contrib_weeks: String(r.min_contrib_weeks ?? ""), submission_limit_nbr: String(r.submission_limit_nbr ?? ""), vc_contrib_pct: String(r.vc_contrib_pct ?? ""), vc_duration: String(r.vc_duration ?? "") }); setShowDialog(true); };
  const handleSave = () => {
    if (!form.effstart || !form.effend) { toast.error("Start and End dates required"); return; }
    saveMutation.mutate({ effstart: formatDateForStorage(form.effstart), effend: formatDateForStorage(form.effend), min_contrib_weeks: form.min_contrib_weeks ? Number(form.min_contrib_weeks) : null, submission_limit_nbr: form.submission_limit_nbr ? Number(form.submission_limit_nbr) : null, vc_contrib_pct: form.vc_contrib_pct ? Number(form.vc_contrib_pct) : null, vc_duration: form.vc_duration ? Number(form.vc_duration) : null });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage VC contribution rate master data</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All records</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (
            <Table><TableHeader><TableRow><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Contrib %</TableHead><TableHead>Duration</TableHead><TableHead>Min Weeks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map(r => (<TableRow key={r.id}><TableCell>{formatDateForDisplay(r.effstart)}</TableCell><TableCell>{formatDateForDisplay(r.effend)}</TableCell><TableCell>{r.vc_contrib_pct ?? "-"}</TableCell><TableCell>{r.vc_duration ?? "-"}</TableCell><TableCell>{r.min_contrib_weeks ?? "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.id); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
              </TableBody></Table>)}</CardContent></Card>
        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>View VC Rate</DialogTitle></DialogHeader>{viewing && <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label className="text-muted-foreground text-xs">Start Date</Label><p className="font-medium">{formatDateForDisplay(viewing.effstart)}</p></div>
          <div><Label className="text-muted-foreground text-xs">End Date</Label><p className="font-medium">{formatDateForDisplay(viewing.effend)}</p></div>
          <div><Label className="text-muted-foreground text-xs">Contrib %</Label><p className="font-medium">{viewing.vc_contrib_pct ?? "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Duration</Label><p className="font-medium">{viewing.vc_duration ?? "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Min Contrib Weeks</Label><p className="font-medium">{viewing.min_contrib_weeks ?? "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Submission Limit</Label><p className="font-medium">{viewing.submission_limit_nbr ?? "-"}</p></div>
        </div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} VC Rate</DialogTitle><DialogDescription>{editing ? "Update" : "Create"}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Start Date *</Label><DatePicker date={form.effstart} onDateChange={d => setForm({ ...form, effstart: d })} /></div>
            <div className="space-y-2"><Label>End Date *</Label><DatePicker date={form.effend} onDateChange={d => setForm({ ...form, effend: d })} /></div>
            <div className="space-y-2"><Label>Contrib %</Label><Input type="number" step="0.01" value={form.vc_contrib_pct} onChange={e => setForm({ ...form, vc_contrib_pct: e.target.value })} /></div>
            <div className="space-y-2"><Label>Duration</Label><Input type="number" value={form.vc_duration} onChange={e => setForm({ ...form, vc_duration: e.target.value })} /></div>
            <div className="space-y-2"><Label>Min Contrib Weeks</Label><Input type="number" value={form.min_contrib_weeks} onChange={e => setForm({ ...form, min_contrib_weeks: e.target.value })} /></div>
            <div className="space-y-2"><Label>Submission Limit</Label><Input type="number" value={form.submission_limit_nbr} onChange={e => setForm({ ...form, submission_limit_nbr: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default VcContribRateManagement;
