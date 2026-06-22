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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { BackNavigation } from "@/components/ui/back-navigation";
import { PageHeader } from "@/components/common/PageHeader";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";
import { Plus, BookOpen } from "lucide-react";
import {
  listStageReferenceMappings, upsertStageReferenceMapping, deleteStageReferenceMapping,
  LEGAL_STAGES, type StageReferenceMappingRow,
} from "@/services/legal/lgStageMappingAdminService";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";

const sb = supabase as any;

const emptyRow: Partial<StageReferenceMappingRow> = {
  country_code: "KN",
  case_type_code: "ANY",
  stage_code: "REFERRAL_RECEIVED",
  legal_reference_id: "",
  is_required: false,
  display_order: 100,
  usage_note: "",
  is_active: true,
};

export default function LegalStageReferenceMapping() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [editing, setEditing] = useState<Partial<StageReferenceMappingRow> | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lg_stage_reference_mapping_admin"],
    queryFn: listStageReferenceMappings,
  });

  const { data: refs = [] } = useQuery({
    queryKey: ["lg_legal_refs_lookup"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_legal_reference")
        .select("id, code, title, country_code")
        .eq("country_code", "KN")
        .order("code");
      if (error) throw error;
      return data as { id: string; code: string; title: string }[];
    },
  });

  const saveMut = useMutation({
    mutationFn: (r: Partial<StageReferenceMappingRow>) =>
      upsertStageReferenceMapping(r, userCode ?? "SYSTEM"),
    onSuccess: () => {
      toast.success("Mapping saved");
      qc.invalidateQueries({ queryKey: ["lg_stage_reference_mapping_admin"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStageReferenceMapping(id),
    onSuccess: () => {
      toast.success("Mapping deleted");
      qc.invalidateQueries({ queryKey: ["lg_stage_reference_mapping_admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const columns: LgColumnDef<StageReferenceMappingRow>[] = useMemo(() => [
    { accessorKey: "stage_code", header: "Stage", meta: { label: "Stage", pinLeft: true } },
    { accessorKey: "case_type_code", header: "Case Type", meta: { label: "Case Type" } },
    { accessorKey: "reference_code", header: "Reference", meta: { label: "Reference" },
      cell: ({ row }) => (
        <div>
          <div className="font-mono text-xs">{row.original.reference_code}</div>
          <div className="text-xs text-muted-foreground">{row.original.reference_title}</div>
        </div>
      ),
    },
    { accessorKey: "is_required", header: "Required",
      cell: ({ getValue }) => getValue() ? <Badge variant="destructive">Required</Badge> : <Badge variant="outline">Optional</Badge>,
      meta: { label: "Required" },
    },
    { accessorKey: "display_order", header: "Order", meta: { label: "Order", align: "right" } },
    { accessorKey: "is_active", header: "Status",
      cell: ({ getValue }) => <LgStatusBadge status={getValue() ? "ACTIVE" : "INACTIVE"} />,
      meta: { label: "Status" },
    },
  ], []);

  const rowActions = buildLgRowActions<StageReferenceMappingRow>({
    onEdit: (r) => setEditing(r),
    onDelete: (r) => { if (confirm(`Delete mapping for ${r.reference_code} at ${r.stage_code}?`)) deleteMut.mutate(r.id); },
  });

  return (
    <div className="p-6 space-y-6">
      <BackNavigation />
      <PageHeader
        title="Stage → Legal Reference Mapping"
        subtitle="Map legal references (Acts, regulations) to Legal case stages"
        breadcrumbs={[{ label: "Legal" }, { label: "Legal Admin" }, { label: "Stage Reference Mapping" }]}
        actions={
          <Button onClick={() => setEditing(emptyRow)}>
            <Plus className="mr-2 h-4 w-4" /> New Mapping
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Mappings</CardTitle>
          <CardDescription>{rows.length} entries across {new Set(rows.map(r => r.stage_code)).size} stages</CardDescription>
        </CardHeader>
        <CardContent>
          <LgDataGrid
            id="stage-reference-mapping"
            columns={columns}
            data={rows}
            isLoading={isLoading}
            rowActions={rowActions}
            searchPlaceholder="Search reference code or title…"
          />
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "New"} Stage-Reference Mapping</DialogTitle>
            <DialogDescription>Link a legal reference to a Legal case stage.</DialogDescription>
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
                <Label>Legal Reference</Label>
                <Select value={editing.legal_reference_id ?? ""} onValueChange={(v) => setEditing({ ...editing, legal_reference_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {refs.map(r => <SelectItem key={r.id} value={r.id}>{r.code} — {r.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Usage Note</Label>
                <Textarea value={editing.usage_note ?? ""} onChange={(e) => setEditing({ ...editing, usage_note: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label>Display Order</Label>
                  <Input type="number" value={editing.display_order ?? 100} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} />
                </div>
                <label className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm">Required</span>
                  <Switch checked={!!editing.is_required} onCheckedChange={(v) => setEditing({ ...editing, is_required: v })} />
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
              onClick={() => editing?.legal_reference_id ? saveMut.mutate(editing) : toast.error("Select a reference")}
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
