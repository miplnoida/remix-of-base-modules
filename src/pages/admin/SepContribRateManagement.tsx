import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Search, Edit, Trash2, Eye, Calculator } from "lucide-react";
import { toast } from "sonner";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { useActionPermissions } from "@/hooks/useActionPermission";
import { format } from "date-fns";

interface ContribRate {
  effstart: string;
  effend: string;
  wage_cat: number;
  sep_ss_percent: number;
  sep_penalty_percent: number | null;
}

interface WageCategory {
  category_id: number;
  category: string;
  weekly_income: number;
  weekly_contribution: number;
}

const MODULE_NAME = "self_employed_contrib_rates";

const SepContribRateManagement = () => {
  const queryClient = useQueryClient();
  const { can } = useActionPermissions(MODULE_NAME);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<ContribRate | null>(null);
  const [viewing, setViewing] = useState<ContribRate | null>(null);
  const [deleting, setDeleting] = useState<ContribRate | null>(null);
  const [form, setForm] = useState({ effstart: "", effend: "", wage_cat: "", sep_ss_percent: "", sep_penalty_percent: "" });

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["tb_self_emp_contrib_rate"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tb_self_emp_contrib_rate").select("*").order("wage_cat");
      if (error) throw error;
      return data as ContribRate[];
    },
  });

  const { data: wageCategories = [] } = useQuery({
    queryKey: ["c3_wage_category_lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("c3_wage_category").select("category_id, category, weekly_income, weekly_contribution").order("weekly_income");
      if (error) throw error;
      return data as WageCategory[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (record: ContribRate) => {
      if (editing) {
        // composite PK — delete old + insert new
        const { error: delErr } = await (supabase as any).from("tb_self_emp_contrib_rate").delete()
          .eq("effstart", editing.effstart).eq("effend", editing.effend).eq("wage_cat", editing.wage_cat);
        if (delErr) throw delErr;
        const { error } = await (supabase as any).from("tb_self_emp_contrib_rate").insert(record);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("tb_self_emp_contrib_rate").insert(record);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tb_self_emp_contrib_rate"] });
      toast.success(editing ? "Contribution rate updated" : "Contribution rate created");
      setShowDialog(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast.error("Save failed: " + (err.message || "Unknown error"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: ContribRate) => {
      const { error } = await (supabase as any).from("tb_self_emp_contrib_rate").delete()
        .eq("effstart", row.effstart).eq("effend", row.effend).eq("wage_cat", row.wage_cat);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tb_self_emp_contrib_rate"] });
      toast.success("Contribution rate deleted");
      setShowDeleteDialog(false);
      setDeleting(null);
    },
    onError: (err: any) => {
      toast.error("Delete failed: " + (err.message || "Unknown error"));
    },
  });

  const formatDate = (d: string) => {
    try { return format(new Date(d), "yyyy-MM-dd"); } catch { return d; }
  };

  const getWageLabel = (wc: number) => {
    const cat = wageCategories.find((c) => Number(c.weekly_income) === wc);
    return cat ? `Cat ${cat.category} — $${Number(cat.weekly_income).toFixed(2)}` : `$${Number(wc).toFixed(2)}`;
  };

  const filtered = rates.filter((r) =>
    String(r.wage_cat).includes(searchQuery) ||
    String(r.sep_ss_percent).includes(searchQuery)
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ effstart: "", effend: "", wage_cat: "", sep_ss_percent: "", sep_penalty_percent: "" });
    setShowDialog(true);
  };

  const openEdit = (row: ContribRate) => {
    setEditing(row);
    setForm({
      effstart: formatDate(row.effstart),
      effend: formatDate(row.effend),
      wage_cat: String(row.wage_cat),
      sep_ss_percent: String(row.sep_ss_percent),
      sep_penalty_percent: row.sep_penalty_percent != null ? String(row.sep_penalty_percent) : "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!form.effstart || !form.effend || !form.wage_cat || !form.sep_ss_percent) {
      toast.error("Effective Start, End, Wage Category, and SS% are required");
      return;
    }
    saveMutation.mutate({
      effstart: form.effstart,
      effend: form.effend,
      wage_cat: Number(form.wage_cat),
      sep_ss_percent: Number(form.sep_ss_percent),
      sep_penalty_percent: form.sep_penalty_percent ? Number(form.sep_penalty_percent) : null,
    });
  };

  return (
    <PermissionWrapper moduleName={MODULE_NAME}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">SEP Contribution Rates</h1>
            <p className="text-muted-foreground mt-1">Manage self-employed contribution rates (tb_self_emp_contrib_rate)</p>
          </div>
          {can("create") && (
            <Button onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Rate
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Total Rates
              </CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{rates.length}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contribution Rates</CardTitle>
            <CardDescription>Self-employed contribution rate schedule</CardDescription>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search rates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eff. Start</TableHead>
                      <TableHead>Eff. End</TableHead>
                      <TableHead>Wage Category</TableHead>
                      <TableHead>SS %</TableHead>
                      <TableHead>Penalty %</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row, i) => (
                      <TableRow key={`${row.effstart}-${row.effend}-${row.wage_cat}-${i}`}>
                        <TableCell>{formatDate(row.effstart)}</TableCell>
                        <TableCell>{formatDate(row.effend)}</TableCell>
                        <TableCell>{getWageLabel(row.wage_cat)}</TableCell>
                        <TableCell>{Number(row.sep_ss_percent).toFixed(2)}%</TableCell>
                        <TableCell>{row.sep_penalty_percent != null ? `${Number(row.sep_penalty_percent).toFixed(2)}%` : "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setViewing(row); setShowViewDialog(true); }} title="View"><Eye className="h-4 w-4" /></Button>
                            {can("edit") && <Button variant="ghost" size="icon" onClick={() => openEdit(row)} title="Edit"><Edit className="h-4 w-4" /></Button>}
                            {can("delete") && <Button variant="ghost" size="icon" onClick={() => { setDeleting(row); setShowDeleteDialog(true); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No rates found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>View Contribution Rate</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-3 py-2">
                <div><Label className="text-muted-foreground text-xs">Effective Start</Label><p className="font-medium">{formatDate(viewing.effstart)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Effective End</Label><p className="font-medium">{formatDate(viewing.effend)}</p></div>
                <div><Label className="text-muted-foreground text-xs">Wage Category</Label><p className="font-medium">{getWageLabel(viewing.wage_cat)}</p></div>
                <div><Label className="text-muted-foreground text-xs">SS %</Label><p className="font-medium">{Number(viewing.sep_ss_percent).toFixed(2)}%</p></div>
                <div><Label className="text-muted-foreground text-xs">Penalty %</Label><p className="font-medium">{viewing.sep_penalty_percent != null ? `${Number(viewing.sep_penalty_percent).toFixed(2)}%` : "-"}</p></div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Contribution Rate" : "Add Contribution Rate"}</DialogTitle>
              <DialogDescription>{editing ? "Update rate details" : "Create a new contribution rate"}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Effective Start *</Label>
                <Input type="date" value={form.effstart} onChange={(e) => setForm({ ...form, effstart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Effective End *</Label>
                <Input type="date" value={form.effend} onChange={(e) => setForm({ ...form, effend: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Wage Category *</Label>
                <Select value={form.wage_cat} onValueChange={(v) => setForm({ ...form, wage_cat: v })}>
                  <SelectTrigger><SelectValue placeholder="Select wage category" /></SelectTrigger>
                  <SelectContent>
                    {wageOptions.map((c) => (
                      <SelectItem key={c.category_code} value={String(c.wage_upper)}>
                        Cat {c.category_code} — ${Number(c.wage_upper).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SS % *</Label>
                <Input type="number" step="0.01" value={form.sep_ss_percent} onChange={(e) => setForm({ ...form, sep_ss_percent: e.target.value })} placeholder="e.g. 10.00" />
              </div>
              <div className="space-y-2">
                <Label>Penalty %</Label>
                <Input type="number" step="0.01" value={form.sep_penalty_percent} onChange={(e) => setForm({ ...form, sep_penalty_percent: e.target.value })} placeholder="e.g. 5.00" />
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
              <AlertDialogTitle>Delete Contribution Rate</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this contribution rate?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleting && deleteMutation.mutate(deleting)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PermissionWrapper>
  );
};

export default SepContribRateManagement;
