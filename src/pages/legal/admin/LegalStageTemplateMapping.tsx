import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { Plus, Layers } from "lucide-react";
import {
  listStageTemplateMappings, upsertStageTemplateMapping, deleteStageTemplateMapping,
  LEGAL_STAGES, type StageTemplateMappingRow,
} from "@/services/legal/lgStageMappingAdminService";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";

const sb = supabase as any;

const emptyRow: Partial<StageTemplateMappingRow> = {
  country_code: "KN",
  case_type_code: "ANY",
  stage_code: "REFERRAL_RECEIVED",
  template_id: "",
  is_required: false,
  is_default: false,
  auto_generate_allowed: true,
  approval_required: false,
  sort_order: 100,
  is_active: true,
};

export default function LegalStageTemplateMapping() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [editing, setEditing] = useState<Partial<StageTemplateMappingRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lg_stage_template_mapping_admin"],
    queryFn: listStageTemplateMappings,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["lg_legal_templates_lookup"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_template")
        .select("id, code, name")
        .eq("module_code", "LEGAL")
        .order("code");
      if (error) throw error;
      return data as { id: string; code: string; name: string }[];
    },
  });

  const saveMut = useMutation({
    mutationFn: (r: Partial<StageTemplateMappingRow>) =>
      upsertStageTemplateMapping(r, userCode ?? "SYSTEM"),
    onSuccess: () => {
      toast.success("Mapping saved");
      qc.invalidateQueries({ queryKey: ["lg_stage_template_mapping_admin"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStageTemplateMapping(id),
    onSuccess: () => {
      toast.success("Mapping deleted");
      qc.invalidateQueries({ queryKey: ["lg_stage_template_mapping_admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const columns: LgColumnDef<StageTemplateMappingRow>[] = useMemo(() => [
    { accessorKey: "stage_code", header: "Stage", meta: { label: "Stage", pinLeft: true } },
    { accessorKey: "case_type_code", header: "Case Type", meta: { label: "Case Type" } },
    { accessorKey: "template_code", header: "Template", meta: { label: "Template" },
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-xs">{row.original.template_code}</div>
          <div className="text-xs text-muted-foreground">{row.original.template_name}</div>
        </div>
      ),
    },
    { accessorKey: "is_required", header: "Required",
      cell: ({ getValue }) => getValue() ? <Badge variant="destructive">Required</Badge> : <Badge variant="outline">Optional</Badge>,
      meta: { label: "Required" },
    },
    { accessorKey: "is_default", header: "Default",
      cell: ({ getValue }) => getValue() ? <Badge>Default</Badge> : null,
      meta: { label: "Default" },
    },
    { accessorKey: "approval_required", header: "Approval",
      cell: ({ getValue }) => getValue() ? <Badge variant="secondary">Approval</Badge> : null,
      meta: { label: "Approval" },
    },
    { accessorKey: "sort_order", header: "Order", meta: { label: "Order", align: "right" } },
    { accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />,
      meta: { label: "Status" },
    },
  ], []);

  const rowActions = buildLgRowActions<StageTemplateMappingRow>({
    onEdit: (r) => setEditing(r),
    onDelete: (r) => { if (confirm(`Delete mapping for ${r.template_code} at ${r.stage_code}?`)) deleteMut.mutate(r.id); },
  });

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <PageHeader
        title="Stage → Template Mapping"
        subtitle="Map Legal templates to case stages so officers see the right letters at each step"
        breadcrumbs={[{ label: "Legal" }, { label: "Legal Admin" }, { label: "Stage Template Mapping" }]}
        actions={
          <Button onClick={() => setEditing(emptyRow)}>
            <Plus className="mr-2 h-4 w-4" /> New Mapping
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="h-4 w-4" /> Mappings</CardTitle>
          <CardDescription>{rows.length} entries across {new Set(rows.map(r => r.stage_code)).size} stages</CardDescription>
        </CardHeader>
        <CardContent>
          <LgDataGrid
            id="stage-template-mapping"
            columns={columns}
            data={rows}
            loading={isLoading}
            rowActions={rowActions}
            enableExport
            filters={[
              { id: "stage_code", label: "Stage", type: "select",
                options: LEGAL_STAGES.map((s) => ({ value: s, label: s })) },
              { id: "case_type_code", label: "Case Type", type: "text" },
              { id: "is_required", label: "Required", type: "boolean" },
              { id: "is_active", label: "Active", type: "boolean" },
            ]}
            searchPlaceholder="Search by template code or name…"
            searchFields={["template_code", "template_name", "stage_code"]}
          />
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Stage-Template Mapping</DialogTitle>
            <DialogDescription>Link a template to a Legal case stage.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stage</Label>
                  <Select value={editing.stage_code} onValueChange={(v) => setEditing({ ...editing, stage_code: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEGAL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Case Type</Label>
                  <Input value={editing.case_type_code ?? "ANY"} onChange={(e) => setEditing({ ...editing, case_type_code: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Template</Label>
                <Select value={editing.template_id ?? ""} onValueChange={(v) => setEditing({ ...editing, template_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.code} — {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sort_order ?? 100} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Trigger Event</Label>
                  <Input value={editing.trigger_event ?? ""} onChange={(e) => setEditing({ ...editing, trigger_event: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Required</span>
                  <Switch checked={!!editing.is_required} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Default</span>
                  <Switch checked={!!editing.is_default} onCheckedChange={(v) => setEditing({ ...editing, is_default: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Auto-generate</span>
                  <Switch checked={editing.auto_generate_allowed !== false} onCheckedChange={(v) => setEditing({ ...editing, auto_generate_allowed: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Approval Required</span>
                  <Switch checked={!!editing.approval_required} onCheckedChange={(v) => setEditing({ ...editing, approval_required: v })} />
                </label>
                <label className="flex items-center justify-between rounded border p-2 col-span-2">
                  <span className="text-sm">Active</span>
                  <Switch checked={editing.is_active !== false} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={() => editing?.template_id ? saveMut.mutate(editing) : toast.error("Select a template")}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
