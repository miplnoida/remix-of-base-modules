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

interface Row { payment_code: string; payment_type_description: string | null; fund_code: string | null; }
const TABLE = "tb_payment_type"; const MODULE_NAME = "md_payment_type"; const TITLE = "Payment Types";

const PaymentTypeManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME);
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ payment_code: "", payment_type_description: "", fund_code: "" });

  const { data: rows = [], isLoading } = useQuery({ queryKey: [TABLE], queryFn: async () => { const { data, error } = await (supabase as any).from(TABLE).select("*").order("payment_code"); if (error) throw error; return data as Row[]; } });
  const saveMutation = useMutation({ mutationFn: async (r: Row) => { if (editing) { const { error } = await (supabase as any).from(TABLE).update({ payment_type_description: r.payment_type_description, fund_code: r.fund_code }).eq("payment_code", r.payment_code); if (error) throw error; } else { const { error } = await (supabase as any).from(TABLE).insert(r); if (error) throw error; } }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); }, onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")) });
  const deleteMutation = useMutation({ mutationFn: async (code: string) => { const { error } = await (supabase as any).from(TABLE).delete().eq("payment_code", code); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); }, onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")) });
  const filtered = rows.filter(r => r.payment_code.toLowerCase().includes(search.toLowerCase()) || (r.payment_type_description || "").toLowerCase().includes(search.toLowerCase()));
  const openAdd = () => { setEditing(null); setForm({ payment_code: "", payment_type_description: "", fund_code: "" }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ payment_code: r.payment_code, payment_type_description: r.payment_type_description || "", fund_code: r.fund_code || "" }); setShowDialog(true); };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage payment type master data</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All records</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (
            <Table><TableHeader><TableRow><TableHead>Payment Code</TableHead><TableHead>Description</TableHead><TableHead>Fund Code</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map(r => (<TableRow key={r.payment_code}><TableCell className="font-medium">{r.payment_code}</TableCell><TableCell>{r.payment_type_description || "-"}</TableCell><TableCell>{r.fund_code || "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.payment_code); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
              </TableBody></Table>)}</CardContent></Card>
        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>View {TITLE}</DialogTitle></DialogHeader>{viewing && <div className="space-y-3 py-2"><div><Label className="text-muted-foreground text-xs">Payment Code</Label><p className="font-medium">{viewing.payment_code}</p></div><div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.payment_type_description || "-"}</p></div><div><Label className="text-muted-foreground text-xs">Fund Code</Label><p className="font-medium">{viewing.fund_code || "-"}</p></div></div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Record</DialogTitle><DialogDescription>{editing ? "Update details" : "Create a new record"}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Payment Code *</Label><Input value={form.payment_code} onChange={e => setForm({ ...form, payment_code: e.target.value })} disabled={!!editing} maxLength={10} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.payment_type_description} onChange={e => setForm({ ...form, payment_type_description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fund Code</Label><Input value={form.fund_code} onChange={e => setForm({ ...form, fund_code: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={() => { if (!form.payment_code.trim()) { toast.error("Payment Code is required"); return; } saveMutation.mutate({ payment_code: form.payment_code.trim(), payment_type_description: form.payment_type_description || null, fund_code: form.fund_code || null }); }} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Record</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default PaymentTypeManagement;
