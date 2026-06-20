import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  listPolicies, listTiers, upsertPolicy, deletePolicy, upsertTier, deleteTier,
  type LgFeeWaiverPolicy, type LgFeeWaiverPolicyTier,
} from "@/services/legal/lgFeeWaiverPolicyService";
import { LgDataGrid, LgStatusBadge, buildLgRowActions, type LgColumnDef } from "@/components/legal/grid";

const ROLE_TYPES = ["AUTO", "LG_LEGAL_ASSISTANT", "LG_CASE_HANDLER", "LG_REVIEWER", "LG_APPROVER", "LG_ADMIN"];
const WORKBASKETS = [
  "LG_FEE_DRAFT",
  "LG_FEE_POSTING",
  "LG_FEE_WAIVER_REVIEW",
  "LG_FEE_WAIVER_FINANCE_REVIEW",
  "LG_FEE_WAIVER_APPROVED_FOR_POSTING",
];

export default function LgFeeWaiverPolicyConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<LgFeeWaiverPolicy> | null>(null);
  const [tierOpen, setTierOpen] = useState(false);
  const [tierDraft, setTierDraft] = useState<Partial<LgFeeWaiverPolicyTier> | null>(null);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["lg_fee_waiver_policy"],
    queryFn: listPolicies,
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ["lg_fee_waiver_policy_tier", selectedId],
    queryFn: () => (selectedId ? listTiers(selectedId) : Promise.resolve([])),
    enabled: !!selectedId,
  });

  const savePolicy = useMutation({
    mutationFn: (p: any) => upsertPolicy(p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver_policy"] });
      setEditing(null);
      toast({ title: "Saved", description: "Policy saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const removePolicy = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver_policy"] });
      if (selectedId) setSelectedId(null);
    },
  });

  const saveTier = useMutation({
    mutationFn: (t: any) => upsertTier(t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver_policy_tier", selectedId] });
      setTierOpen(false); setTierDraft(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const removeTier = useMutation({
    mutationFn: (id: string) => deleteTier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_fee_waiver_policy_tier", selectedId] }),
  });

  const policyColumns: LgColumnDef<LgFeeWaiverPolicy>[] = useMemo(() => [
    { accessorKey: "policy_code", header: "Code", meta: { label: "Code", pinLeft: true } },
    { accessorKey: "policy_name", header: "Name", meta: { label: "Name" } },
    { accessorKey: "max_waiver_amount_without_approval", header: "Auto ≤ Amt", meta: { label: "Auto ≤ Amt" } },
    { 
      accessorKey: "max_waiver_percent_without_approval", 
      header: "Auto ≤ %", 
      meta: { label: "Auto ≤ %" },
      cell: ({ getValue }) => `${getValue()}%`
    },
    { 
      accessorKey: "status", 
      header: "Status", 
      meta: { label: "Status" },
      cell: ({ getValue }) => <LgStatusBadge status={getValue() as string} />
    },
  ], []);

  const tierColumns: LgColumnDef<LgFeeWaiverPolicyTier>[] = useMemo(() => [
    { accessorKey: "tier_order", header: "#", meta: { label: "Order" } },
    { 
      id: "amountRange",
      header: "Amount Range", 
      meta: { label: "Amount Range" },
      cell: ({ row }) => `${row.original.min_amount ?? "—"} … ${row.original.max_amount ?? "∞"}`
    },
    { 
      id: "percentRange",
      header: "% Range", 
      meta: { label: "% Range" },
      cell: ({ row }) => `${row.original.min_percent ?? "—"} … ${row.original.max_percent ?? "∞"}%`
    },
    { 
      accessorKey: "approver_role_type", 
      header: "Approver", 
      meta: { label: "Approver" },
      cell: ({ getValue }) => <Badge variant="outline">{getValue() as string ?? "—"}</Badge>
    },
    { accessorKey: "workbasket_code", header: "Workbasket", meta: { label: "Workbasket" } },
    { 
      accessorKey: "requires_finance", 
      header: "Finance?", 
      meta: { label: "Finance?" },
      cell: ({ getValue }) => getValue() ? "Yes" : "No"
    },
  ], []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Legal Fee Waiver Policies</h1>
          <p className="text-sm text-muted-foreground">
            Configure auto-approve thresholds and tiered approval routing for legal fee waivers
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Policies</CardTitle>
              <CardDescription>Defines auto-approval limits + approval requirements</CardDescription>
            </div>
            <Button size="sm" onClick={() => setEditing({ status: "ACTIVE", approval_required: true, min_approvers: 1, requires_reason: true })}>
              <Plus className="h-4 w-4 mr-1" /> New Policy
            </Button>
          </CardHeader>
          <CardContent>
            <LgDataGrid
              id="lg.waiver.policies"
              columns={policyColumns}
              data={policies}
              isLoading={isLoading}
              onRowClick={(r) => setSelectedId(r.id)}
              rowActions={buildLgRowActions({
                onEdit: (r) => setEditing(r),
                onDelete: (r) => { if (confirm("Delete policy?")) removePolicy.mutate(r.id); }
              })}
              exportFilename="fee-waiver-policies"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Approval Tiers</CardTitle>
              <CardDescription>
                {selectedId ? "Routes waivers by amount / percent → approver role + workbasket" : "Select a policy to view its tiers"}
              </CardDescription>
            </div>
            <Button size="sm" disabled={!selectedId}
              onClick={() => { setTierDraft({ policy_id: selectedId!, tier_order: (tiers.at(-1)?.tier_order ?? 0) + 1, requires_finance: false }); setTierOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Tier
            </Button>
          </CardHeader>
          <CardContent>
            {!selectedId ? <div className="text-sm text-muted-foreground">No policy selected.</div> :
              <LgDataGrid
                id="lg.waiver.tiers"
                columns={tierColumns}
                data={tiers}
                rowActions={buildLgRowActions({
                  onEdit: (r) => { setTierDraft(r); setTierOpen(true); },
                  onDelete: (r) => { if (confirm("Delete tier?")) removeTier.mutate(r.id); }
                })}
                exportFilename="fee-waiver-tiers"
              />
            }
          </CardContent>
        </Card>
      </div>

      {/* Policy editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Policy" : "New Policy"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={editing.policy_code ?? ""} onChange={e => setEditing({ ...editing, policy_code: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={editing.policy_name ?? ""} onChange={e => setEditing({ ...editing, policy_name: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={editing.country_code ?? ""} onChange={e => setEditing({ ...editing, country_code: e.target.value })} placeholder="KN" /></div>
              <div><Label>Case Type</Label><Input value={editing.case_type_code ?? ""} onChange={e => setEditing({ ...editing, case_type_code: e.target.value })} /></div>
              <div><Label>Auto-Approve ≤ Amount</Label><Input type="number" value={editing.max_waiver_amount_without_approval ?? 0} onChange={e => setEditing({ ...editing, max_waiver_amount_without_approval: Number(e.target.value) })} /></div>
              <div><Label>Auto-Approve ≤ %</Label><Input type="number" value={editing.max_waiver_percent_without_approval ?? 0} onChange={e => setEditing({ ...editing, max_waiver_percent_without_approval: Number(e.target.value) })} /></div>
              <div><Label>Min Approvers</Label><Input type="number" value={editing.min_approvers ?? 1} onChange={e => setEditing({ ...editing, min_approvers: Number(e.target.value) })} /></div>
              <div><Label>Default Workbasket</Label>
                <Select value={editing.approval_route_code ?? ""} onValueChange={v => setEditing({ ...editing, approval_route_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{WORKBASKETS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.approval_required} onCheckedChange={v => setEditing({ ...editing, approval_required: v })} /><Label>Approval Required</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.allow_self_approval} onCheckedChange={v => setEditing({ ...editing, allow_self_approval: v })} /><Label>Self-Approval</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.requires_reason} onCheckedChange={v => setEditing({ ...editing, requires_reason: v })} /><Label>Reason Required</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!editing.requires_document} onCheckedChange={v => setEditing({ ...editing, requires_document: v })} /><Label>Document Required</Label></div>
              <div><Label>Status</Label>
                <Select value={editing.status ?? "ACTIVE"} onValueChange={v => setEditing({ ...editing, status: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["ACTIVE","INACTIVE","DRAFT"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={editing.notes ?? ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && savePolicy.mutate(editing)} disabled={!editing?.policy_code || !editing?.policy_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier editor */}
      <Dialog open={tierOpen} onOpenChange={(o) => { setTierOpen(o); if (!o) setTierDraft(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tierDraft?.id ? "Edit Tier" : "New Tier"}</DialogTitle></DialogHeader>
          {tierDraft && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tier Order</Label><Input type="number" value={tierDraft.tier_order ?? 1} onChange={e => setTierDraft({ ...tierDraft, tier_order: Number(e.target.value) })} /></div>
              <div><Label>Approver Role</Label>
                <Select value={tierDraft.approver_role_type ?? ""} onValueChange={v => setTierDraft({ ...tierDraft, approver_role_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{ROLE_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Min Amount</Label><Input type="number" value={tierDraft.min_amount ?? ""} onChange={e => setTierDraft({ ...tierDraft, min_amount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Max Amount</Label><Input type="number" value={tierDraft.max_amount ?? ""} onChange={e => setTierDraft({ ...tierDraft, max_amount: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Min %</Label><Input type="number" value={tierDraft.min_percent ?? ""} onChange={e => setTierDraft({ ...tierDraft, min_percent: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div><Label>Max %</Label><Input type="number" value={tierDraft.max_percent ?? ""} onChange={e => setTierDraft({ ...tierDraft, max_percent: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Workbasket</Label>
                <Select value={tierDraft.workbasket_code ?? ""} onValueChange={v => setTierDraft({ ...tierDraft, workbasket_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{WORKBASKETS.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 col-span-2"><Switch checked={!!tierDraft.requires_finance} onCheckedChange={v => setTierDraft({ ...tierDraft, requires_finance: v })} /><Label>Requires Finance Approval</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTierOpen(false); setTierDraft(null); }}>Cancel</Button>
            <Button onClick={() => tierDraft && saveTier.mutate(tierDraft)} disabled={!tierDraft?.policy_id || !tierDraft?.tier_order}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
