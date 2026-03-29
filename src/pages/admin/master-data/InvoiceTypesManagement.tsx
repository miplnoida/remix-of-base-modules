import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";

interface Record { code: string; description: string | null; is_active: boolean | null; created_by: string | null; updated_by: string | null; created_at: string | null; updated_at: string | null; }
const MODULE_NAME = "md_invoice_types";

const InvoiceTypesManagement = () => {
  const qc = useQueryClient();
  const { can } = useActionPermissions(MODULE_NAME);
  const userCode = useUserCode();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<Record | null>(null);
  const [viewing, setViewing] = useState<Record | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", description: "", is_active: true });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tb_invoice_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tb_invoice_types").select("*").order("code");
      if (error) throw error;
      return data as Record[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (r: typeof form) => {
      if (editing) {
        const { error } = await (supabase as any).from("tb_invoice_types").update({ description: r.description, is_active: r.is_active, updated_by: userCode, updated_at: new Date().toISOString() }).eq("code", r.code);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("tb_invoice_types").insert({ code: r.code, description: r.description, is_active: r.is_active, created_by: userCode, created_at: new Date().toISOString() });
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tb_invoice_types"] }); toast.success(editing ? "Updated" : "Created"); setShowDialog(false); setEditing(null); },
    onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => { const { error } = await (supabase as any).from("tb_invoice_types").delete().eq("code", code); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tb_invoice_types"] }); toast.success("Deleted"); setShowDelete(false); setDeleteId(null); },
    onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")),
  });

  const filtered = rows.filter(r => r.code.toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm({ code: "", description: "", is_active: true }); setShowDialog(true); };
  const openEdit = (r: Record) => { setEditing(r); setForm({ code: r.code, description: r.description || "", is_active: r.is_active ?? true }); setShowDialog(true); };
  const openView = (r: Record) => { setViewing(r); setShowView(true); };

  const handleSave = () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    saveMutation.mutate(form);
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold text-foreground">Invoice Types</h1><p className="text-muted-foreground mt-1">Manage invoice type master data</p></div>
          {can("create") && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Invoice Type</Button>}
        </div>
        <Card>
          <CardHeader><CardTitle>Invoice Types</CardTitle><CardDescription>All invoice types in the system</CardDescription>
            <div className="flex items-center gap-4 mt-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div></div>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8">Loading...</div> : (
              <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Description</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map(r => (<TableRow key={r.code}><TableCell className="font-medium">{r.code}</TableCell><TableCell>{r.description || "-"}</TableCell><TableCell>{r.is_active ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right"><div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openView(r); }}><Eye className="h-4 w-4" /></Button>
                      {can("edit") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}><Edit className="h-4 w-4" /></Button>}
                      {can("delete") && <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.code); setShowDelete(true); }}><Trash2 className="h-4 w-4" /></Button>}
                    </div></TableCell></TableRow>))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records found</TableCell></TableRow>}
                </TableBody></Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={showView} onOpenChange={setShowView}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>View Invoice Type</DialogTitle></DialogHeader>
          {viewing && <div className="space-y-3 py-2"><div><Label className="text-muted-foreground text-xs">Code</Label><p className="font-medium">{viewing.code}</p></div><div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.description || "-"}</p></div><div><Label className="text-muted-foreground text-xs">Active</Label><p className="font-medium">{viewing.is_active ? "Yes" : "No"}</p></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter></DialogContent></Dialog>

        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Invoice Type" : "Add Invoice Type"}</DialogTitle><DialogDescription>{editing ? "Update details" : "Create a new record"}</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Code *</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} disabled={!!editing} maxLength={10} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button></DialogFooter></DialogContent></Dialog>

        <AlertDialog open={showDelete} onOpenChange={setShowDelete}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Invoice Type</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </PermissionWrapper>
  );
};

export default InvoiceTypesManagement;
