import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Eye, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions, MODULE_NAMES } from "@/hooks/useActionPermission";

interface IncomeCategory {
  category_code: string;
  wage_upper: number | null;
  appeal: string | null;
}

const MODULE_NAME = "income_category_management";

const IncomeCategoryManagement = () => {
  const queryClient = useQueryClient();
  const { can } = useActionPermissions(MODULE_NAME);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<IncomeCategory | null>(null);
  const [viewing, setViewing] = useState<IncomeCategory | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [form, setForm] = useState({ category_code: "", wage_upper: "", appeal: "" });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["tb_income_cat"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tb_income_cat").select("*").order("category_code");
      if (error) throw error;
      return data as IncomeCategory[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (record: { category_code: string; wage_upper: number | null; appeal: string | null }) => {
      if (editing) {
        const { error } = await (supabase as any).from("tb_income_cat").update({
          wage_upper: record.wage_upper,
          appeal: record.appeal,
        }).eq("category_code", record.category_code);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("tb_income_cat").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tb_income_cat"] });
      toast.success(editing ? "Income category updated" : "Income category created");
      setShowDialog(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast.error("Save failed: " + (err.message || "Unknown error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await (supabase as any).from("tb_income_cat").delete().eq("category_code", code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tb_income_cat"] });
      toast.success("Income category deleted");
      setShowDeleteDialog(false);
      setDeletingCode(null);
    },
    onError: (err: any) => {
      toast.error("Delete failed: " + (err.message || "Referential integrity violation — this category is in use."));
    },
  });

  const filtered = categories.filter((c) =>
    c.category_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(c.wage_upper || "").includes(searchQuery)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ category_code: "", wage_upper: "", appeal: "" });
    setShowDialog(true);
  };

  const openEdit = (row: IncomeCategory) => {
    setEditing(row);
    setForm({
      category_code: row.category_code,
      wage_upper: row.wage_upper != null ? String(row.wage_upper) : "",
      appeal: row.appeal || "",
    });
    setShowDialog(true);
  };

  const openView = (row: IncomeCategory) => {
    setViewing(row);
    setShowViewDialog(true);
  };

  const handleSave = () => {
    if (!form.category_code.trim()) {
      toast.error("Category Code is required");
      return;
    }
    saveMutation.mutate({
      category_code: form.category_code.trim().toUpperCase(),
      wage_upper: form.wage_upper ? Number(form.wage_upper) : null,
      appeal: form.appeal || null,
    });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Income Categories</h1>
            <p className="text-muted-foreground mt-1">Manage income category master data (tb_income_cat)</p>
          </div>
          {can("create") && (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Total Categories
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{categories.length}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Income Categories</CardTitle>
            <CardDescription>All income category bands in the system</CardDescription>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
                    <TableHead>Category Code</TableHead>
                    <TableHead>Wage Upper</TableHead>
                    <TableHead>Appeal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.category_code}>
                      <TableCell className="font-medium">{row.category_code}</TableCell>
                      <TableCell>{row.wage_upper != null ? Number(row.wage_upper).toFixed(2) : "-"}</TableCell>
                      <TableCell>{row.appeal || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(row)} title="View"><Eye className="h-4 w-4" /></Button>
                          {can("edit") && <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit"><Edit className="h-4 w-4" /></Button>}
                          {can("delete") && <Button variant="ghost" size="icon" onClick={() => { setDeletingCode(row.category_code); setShowDeleteDialog(true); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No categories found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>View Income Category</DialogTitle>
            </DialogHeader>
            {viewing && (
              <div className="space-y-3 py-2">
                <div><Label className="text-muted-foreground text-xs">Category Code</Label><p className="font-medium">{viewing.category_code}</p></div>
                <div><Label className="text-muted-foreground text-xs">Wage Upper</Label><p className="font-medium">{viewing.wage_upper != null ? Number(viewing.wage_upper).toFixed(2) : "-"}</p></div>
                <div><Label className="text-muted-foreground text-xs">Appeal</Label><p className="font-medium">{viewing.appeal || "-"}</p></div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Income Category" : "Add Income Category"}</DialogTitle>
              <DialogDescription>{editing ? "Update category details" : "Create a new income category"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Category Code *</Label>
                <Input value={form.category_code} onChange={(e) => setForm({ ...form, category_code: e.target.value })} placeholder="e.g. A" disabled={!!editing} maxLength={10} />
              </div>
              <div className="space-y-2">
                <Label>Wage Upper</Label>
                <Input type="number" value={form.wage_upper} onChange={(e) => setForm({ ...form, wage_upper: e.target.value })} placeholder="e.g. 200.00" />
              </div>
              <div className="space-y-2">
                <Label>Appeal</Label>
                <Input value={form.appeal} onChange={(e) => setForm({ ...form, appeal: e.target.value })} placeholder="Appeal code" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Income Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure? This will fail if the category is referenced by contribution rates.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletingCode && deleteMutation.mutate(deletingCode)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionWrapper>
  );
};

export default IncomeCategoryManagement;
