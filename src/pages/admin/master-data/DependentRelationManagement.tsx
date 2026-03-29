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

interface Row { code: string; description: string; }
const TABLE = "tb_dependent_relation"; const MODULE_NAME = "md_dependent_relation"; const TITLE = "Dependent Relations";

const DependentRelationManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME);
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", description: "" });

  const { data: rows = [], isLoading } = useQuery({ queryKey: [TABLE], queryFn: async () => { const { data, error } = await (supabase as any).from(TABLE).select("*").order("code"); if (error) throw error; return data as Row[]; } });
  const saveMutation = useMutation({ mutationFn: async (r: Row) => { if (editing) { const { error } = await (supabase as any).from(TABLE).update({ description: r.description }).eq("code", r.code); if (error) throw error; } else { const { error } = await (supabase as any).from(TABLE).insert(r); if (error) throw error; } }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); }, onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")) });
  const deleteMutation = useMutation({ mutationFn: async (code: string) => { const { error } = await (supabase as any).from(TABLE).delete().eq("code", code); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); }, onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")) });
  const filtered = rows.filter(r => r.code.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()));
  const openAdd = () => { setEditing(null); setForm({ code: "", description: "" }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ code: r.code, description: r.description }); setShowDialog(true); };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage dependent relation master data</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All records</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (<Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{filtered.map(r => (<TableRow key={r.code}><TableCell className="font-medium">{r.code}</TableCell><TableCell>{r.description}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.code); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}{filtered.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}</TableBody></Table>)}</CardContent></Card>
        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>View {TITLE}</DialogTitle></DialogHeader>{viewing && <div className="space-y-3 py-2"><div><Label className="text-muted-foreground text-xs">Code</Label><p className="font-medium">{viewing.code}</p></div><div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.description}</p></div></div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Record</DialogTitle><DialogDescription>{editing ? "Update details" : "Create a new record"}</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={!!editing} maxLength={10} /></div><div className="space-y-2"><Label>Description *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={() => { if (!form.code.trim() || !form.description.trim()) { toast.error("Code and Description are required"); return; } saveMutation.mutate({ code: form.code.trim(), description: form.description.trim() }); }} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default DependentRelationManagement;
