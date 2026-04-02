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
import { Plus, Search, Edit, Trash2, Eye, Award } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { useUserCode } from "@/hooks/useUserCode";
import { Badge } from "@/components/ui/badge";

interface DesignationRecord {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const MODULE_NAME = "md_designations";

const DesignationMasterManagement = () => {
  const qc = useQueryClient();
  const { can } = useActionPermissions(MODULE_NAME);
  const { userCode } = useUserCode();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState<DesignationRecord | null>(null);
  const [viewing, setViewing] = useState<DesignationRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", is_active: true });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["tb_designations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tb_designations").select("*").order("name");
      if (error) throw error;
      return data as DesignationRecord[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (r: { name: string; description: string | null; is_active: boolean }) => {
      if (editing) {
        const { error } = await (supabase as any).from("tb_designations").update({
          name: r.name,
          description: r.description,
          is_active: r.is_active,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("tb_designations").insert(r);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tb_designations"] });
      qc.invalidateQueries({ queryKey: ["designations"] });
      toast.success(editing ? "Designation updated" : "Designation created");
      setShowDialog(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error("Save failed: " + (e.message || "Unknown error")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("tb_designations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tb_designations"] });
      qc.invalidateQueries({ queryKey: ["designations"] });
      toast.success("Designation deleted");
      setShowDelete(false);
      setDeleteId(null);
    },
    onError: (e: any) => toast.error("Delete failed: " + (e.message || "Record in use")),
  });

  const filtered = rows.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", is_active: true });
    setShowDialog(true);
  };

  const openEdit = (r: DesignationRecord) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description || "", is_active: r.is_active });
    setShowDialog(true);
  };

  const openView = (r: DesignationRecord) => {
    setViewing(r);
    setShowView(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    saveMutation.mutate({
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Designations</h1>
            <p className="text-muted-foreground mt-1">Manage designation master data</p>
          </div>
          {can("create") && (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Designation
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Designations</CardTitle>
            <CardDescription>All designations in the system</CardDescription>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or description..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "default" : "secondary"}>
                          {r.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openView(r); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {can("edit") && (
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(r); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {can("delete") && (
                            <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); setDeleteId(r.id); setShowDelete(true); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={showView} onOpenChange={setShowView}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>View Designation</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-3 py-2">
                <div><Label className="text-muted-foreground text-xs">Name</Label><p className="font-medium">{viewing.name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.description || "-"}</p></div>
                <div><Label className="text-muted-foreground text-xs">Status</Label><p className="font-medium">{viewing.is_active ? "Active" : "Inactive"}</p></div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setShowView(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Designation" : "Add Designation"}</DialogTitle>
              <DialogDescription>{editing ? "Update designation details" : "Create a new designation"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={250} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Designation</AlertDialogTitle>
              <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionWrapper>
  );
};

export default DesignationMasterManagement;
