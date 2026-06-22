import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { Plus, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_STAGES } from "@/services/legal/lgStageMappingAdminService";

const sb = supabase as any;

interface RuleRow {
  id: string;
  country_code: string;
  case_type_code: string;
  stage_code: string;
  document_type_code: string | null;
  document_category_code: string | null;
  is_required: boolean;
  min_count: number;
  allow_generated: boolean;
  allow_upload: boolean;
  allow_link_existing: boolean;
  is_active: boolean;
  notes: string | null;
  sort_order: number | null;
}

const CATEGORIES = ["PLEADING","EVIDENCE","ORDER","NOTICE","CORRESPONDENCE","INTERNAL","OTHER"];

const empty: Partial<RuleRow> = {
  country_code: "KN",
  case_type_code: "ANY",
  stage_code: "REFERRAL_RECEIVED",
  document_type_code: "",
  document_category_code: "EVIDENCE",
  is_required: true,
  min_count: 1,
  allow_generated: true,
  allow_upload: true,
  allow_link_existing: true,
  is_active: true,
  notes: "",
  sort_order: 100,
};

export default function LegalStageDocumentRules() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<RuleRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery<RuleRow[]>({
    queryKey: ["lg_stage_document_rule_admin"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("lg_stage_document_rule")
        .select("*")
        .order("stage_code", { ascending: true })
        .order("sort_order", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return (data ?? []) as RuleRow[];
    },
  });

  const { data: docTypes = [] } = useQuery({
    queryKey: ["dms_document_type_lookup", "LEGAL"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_dms_document_type")
        .select("type_code, type_name, category_code")
        .eq("module_code", "LEGAL")
        .eq("is_active", true)
        .order("type_code");
      if (error) throw error;
      return data as { type_code: string; type_name: string; category_code: string | null }[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (row: Partial<RuleRow>) => {
      const payload: any = { ...row };
      if (!payload.document_type_code) payload.document_type_code = null;
      if (!payload.document_category_code) payload.document_category_code = null;
      payload.min_count = Number(payload.min_count) || 1;
      payload.sort_order = Number(payload.sort_order) || 100;
      if (row.id) {
        const { error } = await sb.from("lg_stage_document_rule").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("lg_stage_document_rule").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Rule saved");
      qc.invalidateQueries({ queryKey: ["lg_stage_document_rule_admin"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("lg_stage_document_rule").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ["lg_stage_document_rule_admin"] });
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const columns: LgColumnDef<RuleRow>[] = useMemo(() => [
    { accessorKey: "stage_code", header: "Stage", meta: { label: "Stage", pinLeft: true } },
    { accessorKey: "case_type_code", header: "Case Type", meta: { label: "Case Type" } },
    { accessorKey: "document_type_code", header: "Type",
      cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Document Type" } },
    { accessorKey: "document_category_code", header: "Category",
      cell: ({ getValue }) => (getValue() as string) || "—", meta: { label: "Category" } },
    { accessorKey: "is_required", header: "Required",
      cell: ({ getValue }) => getValue() ? <Badge variant="destructive">Required</Badge> : <Badge variant="outline">Optional</Badge>,
      meta: { label: "Required" } },
    { accessorKey: "min_count", header: "Min", meta: { label: "Min #", align: "right" } },
    { accessorKey: "channels", header: "Channels",
      cell: ({ row }) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.allow_generated && <Badge variant="outline">Generated</Badge>}
          {row.original.allow_upload && <Badge variant="outline">Upload</Badge>}
          {row.original.allow_link_existing && <Badge variant="outline">Link</Badge>}
        </div>
      ),
      meta: { label: "Channels" } },
    { accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />, meta: { label: "Status" } },
  ], []);

  const rowActions = buildLgRowActions<RuleRow>({
    onEdit: (r) => setEditing(r),
    onDelete: (r) => { if (confirm(`Delete rule for ${r.stage_code} / ${r.document_type_code || r.document_category_code}?`)) deleteMut.mutate(r.id); },
  });

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <PageHeader
        title="Stage → Document Rules"
        subtitle="Define which documents must be present at each Legal stage and how they may be supplied"
        breadcrumbs={[{ label: "Legal" }, { label: "Legal Admin" }, { label: "Stage Document Rules" }]}
        actions={<Button onClick={() => setEditing(empty)}><Plus className="mr-2 h-4 w-4" /> New Rule</Button>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderTree className="h-4 w-4" /> Rules</CardTitle>
          <CardDescription>{rows.length} rule(s) across {new Set(rows.map(r => r.stage_code)).size} stages</CardDescription>
        </CardHeader>
        <CardContent>
          <LgDataGrid
            id="stage-document-rule"
            columns={columns}
            data={rows}
            isLoading={isLoading}
            rowActions={rowActions}
            searchPlaceholder="Search rules…"
          />
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Stage Document Rule</DialogTitle>
            <DialogDescription>Either document type or category must be specified.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stage</Label>
                  <Select value={editing.stage_code} onValueChange={(v) => setEditing({ ...editing, stage_code: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LEGAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Case Type</Label>
                  <Input value={editing.case_type_code ?? "ANY"} onChange={(e) => setEditing({ ...editing, case_type_code: e.target.value })} />
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select value={editing.document_type_code ?? ""} onValueChange={(v) => setEditing({ ...editing, document_type_code: v })}>
                    <SelectTrigger><SelectValue placeholder="(use category)" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value=" ">(none)</SelectItem>
                      {docTypes.map(t => <SelectItem key={t.type_code} value={t.type_code}>{t.type_code} — {t.type_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={editing.document_category_code ?? ""} onValueChange={(v) => setEditing({ ...editing, document_category_code: v })}>
                    <SelectTrigger><SelectValue placeholder="(use type)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">(none)</SelectItem>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Count</Label>
                  <Input type="number" min={1} value={editing.min_count ?? 1} onChange={(e) => setEditing({ ...editing, min_count: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea rows={2} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Required</span>
                  <Switch checked={!!editing.is_required} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Active</span>
                  <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Allow Generated</span>
                  <Switch checked={editing.allow_generated !== false} onCheckedChange={(v) => setEditing({ ...editing, allow_generated: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Allow Upload</span>
                  <Switch checked={editing.allow_upload !== false} onCheckedChange={(v) => setEditing({ ...editing, allow_upload: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2 col-span-2">
                  <span className="text-sm">Allow Link Existing</span>
                  <Switch checked={editing.allow_link_existing !== false} onCheckedChange={(v) => setEditing({ ...editing, allow_link_existing: v })} />
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={saveMut.isPending}
              onClick={() => {
                if (!editing) return;
                if (!editing.document_type_code?.trim() && !editing.document_category_code?.trim()) {
                  toast.error("Provide a document type or a category"); return;
                }
                saveMut.mutate(editing);
              }}
            >{saveMut.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
