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

interface Row { bank_code: string; name: string | null; address1: string | null; address2: string | null; phone: string | null; fax: string | null; zip: string | null; contact: string | null; regno: string | null; }
const TABLE = "tb_bank_code"; const MODULE_NAME = "md_bank_code"; const TITLE = "Bank Codes";

const BankCodeManagement = () => {
  const qc = useQueryClient(); const { can } = useActionPermissions(MODULE_NAME);
  const [search, setSearch] = useState(""); const [showDialog, setShowDialog] = useState(false); const [showView, setShowView] = useState(false); const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null); const [viewing, setViewing] = useState<Row | null>(null); const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ bank_code: "", name: "", address1: "", address2: "", phone: "", fax: "", zip: "", contact: "", regno: "" });

  const { data: rows = [], isLoading } = useQuery({ queryKey: [TABLE], queryFn: async () => { const { data, error } = await (supabase as any).from(TABLE).select("*").order("bank_code"); if (error) throw error; return data as Row[]; } });

  const saveMutation = useMutation({
    mutationFn: async (r: any) => {
      const { bank_code, ...rest } = r;
      if (editing) { const { error } = await (supabase as any).from(TABLE).update(rest).eq("bank_code", bank_code); if (error) throw error; }
      else { const { error } = await (supabase as any).from(TABLE).insert(r); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); },
    onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")),
  });
  const deleteMutation = useMutation({ mutationFn: async (code: string) => { const { error } = await (supabase as any).from(TABLE).delete().eq("bank_code", code); if (error) throw error; }, onSuccess: () => { qc.invalidateQueries({ queryKey: [TABLE] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); }, onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")) });

  const filtered = rows.filter(r => r.bank_code.toLowerCase().includes(search.toLowerCase()) || (r.name || "").toLowerCase().includes(search.toLowerCase()));
  const openAdd = () => { setEditing(null); setForm({ bank_code: "", name: "", address1: "", address2: "", phone: "", fax: "", zip: "", contact: "", regno: "" }); setShowDialog(true); };
  const openEdit = (r: Row) => { setEditing(r); setForm({ bank_code: r.bank_code, name: r.name || "", address1: r.address1 || "", address2: r.address2 || "", phone: r.phone || "", fax: r.fax || "", zip: r.zip || "", contact: r.contact || "", regno: r.regno || "" }); setShowDialog(true); };

  const handleSave = () => {
    if (!form.bank_code.trim()) { toast.error("Bank Code is required"); return; }
    saveMutation.mutate({ bank_code: form.bank_code.trim(), name: form.name || null, address1: form.address1 || null, address2: form.address2 || null, phone: form.phone || null, fax: form.fax || null, zip: form.zip || null, contact: form.contact || null, regno: form.regno || null });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold text-foreground">{TITLE}</h1><p className="text-muted-foreground mt-1">Manage bank code master data</p></div>{can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Bank</Button>}</div>
        <Card><CardHeader><CardTitle>{TITLE}</CardTitle><CardDescription>All bank codes</CardDescription><div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div></CardHeader>
          <CardContent>{isLoading ? <div className="text-center py-8">Loading...</div> : (
            <Table><TableHeader><TableRow><TableHead>Bank Code</TableHead><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Contact</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map(r => (<TableRow key={r.bank_code}><TableCell className="font-medium">{r.bank_code}</TableCell><TableCell>{r.name || "-"}</TableCell><TableCell>{r.phone || "-"}</TableCell><TableCell>{r.contact || "-"}</TableCell>
                <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setViewing(r); setShowView(true); }}><Eye className="h-4 w-4" /></Button>{can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}{can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.bank_code); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}</div></TableCell></TableRow>))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
              </TableBody></Table>)}</CardContent></Card>

        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>View Bank</DialogTitle></DialogHeader>{viewing && <div className="grid grid-cols-2 gap-3 py-2">
          <div><Label className="text-muted-foreground text-xs">Bank Code</Label><p className="font-medium">{viewing.bank_code}</p></div>
          <div><Label className="text-muted-foreground text-xs">Name</Label><p className="font-medium">{viewing.name || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Address 1</Label><p className="font-medium">{viewing.address1 || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Address 2</Label><p className="font-medium">{viewing.address2 || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="font-medium">{viewing.phone || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Fax</Label><p className="font-medium">{viewing.fax || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Zip</Label><p className="font-medium">{viewing.zip || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Contact</Label><p className="font-medium">{viewing.contact || "-"}</p></div>
          <div><Label className="text-muted-foreground text-xs">Reg No</Label><p className="font-medium">{viewing.regno || "-"}</p></div>
        </div>}<DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Bank</DialogTitle><DialogDescription>{editing ? "Update details" : "Create a new bank"}</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Bank Code *</Label><Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} disabled={!!editing} maxLength={10} /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address 1</Label><Input value={form.address1} onChange={e => setForm({ ...form, address1: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address 2</Label><Input value={form.address2} onChange={e => setForm({ ...form, address2: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fax</Label><Input value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} /></div>
            <div className="space-y-2"><Label>Zip</Label><Input value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
            <div className="space-y-2"><Label>Contact</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
            <div className="space-y-2"><Label>Reg No</Label><Input value={form.regno} onChange={e => setForm({ ...form, regno: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>

        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Bank</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};
export default BankCodeManagement;
