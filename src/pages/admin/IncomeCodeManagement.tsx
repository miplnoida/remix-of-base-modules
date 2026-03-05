import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Eye, Tag } from "lucide-react";
import { toast } from "sonner";
import { useIncomeCodes, useCreateIncomeCode, useUpdateIncomeCode, useDeleteIncomeCode } from "@/hooks/useIncomeCodePolicy";
import { useUserCode } from "@/hooks/useUserCode";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import type { IncomeCode } from "@/types/incomeCodePolicy";

const MODULE_NAME = "income_code_management";

const IncomeCodeManagement = () => {
  const { can } = useActionPermissions(MODULE_NAME);
  const { userCode } = useUserCode();
  const { data: codes = [], isLoading } = useIncomeCodes();
  const createMutation = useCreateIncomeCode();
  const updateMutation = useUpdateIncomeCode();
  const deleteMutation = useDeleteIncomeCode();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<IncomeCode | null>(null);
  const [viewing, setViewing] = useState<IncomeCode | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", description: "", is_active: true });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = codes.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ code: "", description: "", is_active: true });
    setErrors({});
    setShowDialog(true);
  };

  const openEdit = (row: IncomeCode) => {
    setEditing(row);
    setForm({ code: row.code, description: row.description, is_active: row.is_active });
    setErrors({});
    setShowDialog(true);
  };

  const openView = (row: IncomeCode) => {
    setViewing(row);
    setShowViewDialog(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Code is required";
    else if (form.code.trim().length > 20) e.code = "Code max 20 characters";
    else if (!editing) {
      const exists = codes.some((c) => c.code.toUpperCase() === form.code.trim().toUpperCase());
      if (exists) e.code = "Code already exists";
    }
    if (!form.description.trim()) e.description = "Description is required";
    else if (form.description.trim().length > 50) e.description = "Description max 50 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, code: form.code, description: form.description, is_active: form.is_active, userCode },
        { onSuccess: () => { setShowDialog(false); setEditing(null); } }
      );
    } else {
      createMutation.mutate(
        { code: form.code, description: form.description, userCode },
        { onSuccess: () => { setShowDialog(false); } }
      );
    }
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Income Codes</h1>
            <p className="text-muted-foreground mt-1">Manage income code master data (tb_income_codes)</p>
          </div>
          {can("create") && (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Income Code
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Tag className="h-4 w-4" /> Total Codes</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{codes.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-600">Active</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-600">{codes.filter(c => c.is_active).length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">Inactive</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-muted-foreground">{codes.filter(c => !c.is_active).length}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Income Codes</CardTitle>
            <CardDescription>All income codes in the system</CardDescription>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search codes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.code}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>
                        {row.is_active
                          ? <Badge variant="outline" className="border-emerald-300 text-emerald-700">Active</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(row)} title="View"><Eye className="h-4 w-4" /></Button>
                          {can("edit") && <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit"><Edit className="h-4 w-4" /></Button>}
                          {can("delete") && <Button variant="ghost" size="icon" onClick={() => { setDeletingId(row.id); setShowDeleteDialog(true); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No income codes found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>View Income Code</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-3 py-2">
                <div><Label className="text-muted-foreground text-xs">Code</Label><p className="font-medium">{viewing.code}</p></div>
                <div><Label className="text-muted-foreground text-xs">Description</Label><p className="font-medium">{viewing.description}</p></div>
                <div><Label className="text-muted-foreground text-xs">Status</Label><p className="font-medium">{viewing.is_active ? "Active" : "Inactive"}</p></div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Income Code" : "Add Income Code"}</DialogTitle>
              <DialogDescription>{editing ? "Update code details" : "Create a new income code"}</DialogDescription>
            </DialogHeader>
            <form noValidate onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={(e) => { setForm({ ...form, code: e.target.value }); if (errors.code) setErrors(prev => { const n = { ...prev }; delete n.code; return n; }); }} placeholder="e.g. GRATUITY" maxLength={20} disabled={!!editing} className={errors.code ? 'border-destructive' : ''} />
                  {errors.code && <p className="text-xs text-destructive mt-1">{errors.code}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); if (errors.description) setErrors(prev => { const n = { ...prev }; delete n.description; return n; }); }} placeholder="e.g. Gratuity Payment" maxLength={50} className={errors.description ? 'border-destructive' : ''} />
                  {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
                </div>
                {editing && (
                  <div className="flex items-center gap-3">
                    <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                    <Label>Active</Label>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editing ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Income Code</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This will permanently delete this income code and all associated policies.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deletingId) deleteMutation.mutate(deletingId, { onSuccess: () => { setShowDeleteDialog(false); setDeletingId(null); } }); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionWrapper>
  );
};

export default IncomeCodeManagement;
