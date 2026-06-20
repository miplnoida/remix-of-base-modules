import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LgDataGrid, type LgColumnDef } from "@/components/legal/grid";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Plus, Trash2, ArrowLeft, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import {
  useLgDepartmentProfile, useLgPolicies, useLgRoleMappings,
  type LgDepartmentProfile, type LgWorkflowPolicy,
} from "@/hooks/legal/useLgPolicy";
import {
  updateDepartmentProfile, upsertRoleMapping, deleteRoleMapping,
  updateWorkflowPolicy, validateRoleMapping,
} from "@/services/legal/lgPolicyService";
import {
  useLgAccess, LG_BASE_MATRIX, type LgRoleType, type LgCapability,
} from "@/hooks/legal/useLgAccess";
import { useUserCode } from "@/hooks/useUserCode";
import { formatDateForDisplay } from "@/lib/format-config";

const ROLE_TYPES: LgRoleType[] = [
  "LG_CASE_HANDLER","LG_LEGAL_ASSISTANT","LG_REVIEWER","LG_APPROVER","LG_ADMIN","LG_READ_ONLY",
];

const PREVIEW_CAPS: LgCapability[] = [
  "viewCase","createCase","editCase",
  "acceptReferral","assignOfficer",
  "prepareNotice","approveNotice","sendNotice",
  "addHearing","recordHearingOutcome",
  "draftFee","postFee",
  "requestWaiver","approveWaiver",
  "approveSettlement","closeCase","configurePolicy",
];

export default function LgPolicyConfig() {
  const navigate = useNavigate();
  const access = useLgAccess();

  if (!access.isAdmin && !access.can("configurePolicy")) {
    return (
      <div className="min-h-screen p-6">
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          You don't have permission to configure Legal policies.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" /> Legal Department Configuration
            </h1>
            <p className="text-sm text-muted-foreground">
              Legal uses common Security roles. Map each Security role to a Legal role-type, then configure per-action approval policies.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/legal/lg")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Legal
          </Button>
        </div>

        <Tabs defaultValue="mapping">
          <TabsList>
            <TabsTrigger value="profile">Department Profile</TabsTrigger>
            <TabsTrigger value="mapping">Role &amp; Capability Mapping</TabsTrigger>
            <TabsTrigger value="preview">Capability Preview</TabsTrigger>
            <TabsTrigger value="policy">Workflow Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="mapping"><MappingTab /></TabsContent>
          <TabsContent value="preview"><CapabilityPreviewTab /></TabsContent>
          <TabsContent value="policy"><PolicyTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileTab() {
  const { data: profile, isLoading } = useLgDepartmentProfile();
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<LgDepartmentProfile | null>(null);

  const current = form ?? profile;
  if (isLoading || !current) return <Loading />;

  const set = (k: keyof LgDepartmentProfile, v: any) =>
    setForm({ ...(current as LgDepartmentProfile), [k]: v });

  const save = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await updateDepartmentProfile(current.id, {
        department_size_mode: current.department_size_mode,
        auto_assign_mode: current.auto_assign_mode,
        approvals_mode: current.approvals_mode,
        assistant_review_required: current.assistant_review_required,
        manager_role_required: current.manager_role_required,
      }, userCode || undefined);
      await qc.invalidateQueries({ queryKey: ["lg_department_profile"] });
      toast.success("Department profile updated");
      setForm(null);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update profile");
    } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Department Profile</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        <Row label="Department size">
          <Select value={current.department_size_mode} onValueChange={(v) => set("department_size_mode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SMALL">Small (2–5 staff)</SelectItem>
              <SelectItem value="MEDIUM">Medium (6–15 staff)</SelectItem>
              <SelectItem value="LARGE">Large (16+ staff)</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Auto assignment">
          <Select value={current.auto_assign_mode} onValueChange={(v) => set("auto_assign_mode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SELF_ASSIGN">Self assign</SelectItem>
              <SelectItem value="ROUND_ROBIN">Round robin</SelectItem>
              <SelectItem value="MANAGER_ASSIGN">Manager assigns</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Approvals mode">
          <Select value={current.approvals_mode} onValueChange={(v) => set("approvals_mode", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LIGHT">Light</SelectItem>
              <SelectItem value="STANDARD">Standard</SelectItem>
              <SelectItem value="STRICT">Strict</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Assistant work needs lawyer review">
          <Switch checked={current.assistant_review_required}
                  onCheckedChange={(v) => set("assistant_review_required", v)} />
        </Row>
        <Row label="Manager role required">
          <Switch checked={current.manager_role_required}
                  onCheckedChange={(v) => set("manager_role_required", v)} />
        </Row>
        <div className="flex justify-end gap-2 pt-2">
          {form && <Button variant="outline" onClick={() => setForm(null)}>Reset</Button>}
          <Button onClick={save} disabled={!form || busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MappingTab() {
  const { data: rows = [], isLoading } = useLgRoleMappings();
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const blank = {
    system_role: "", role_type: "LG_CASE_HANDLER" as LgRoleType,
    can_prepare: true, can_review: false, can_approve: false,
    can_post_fee: false, can_close_case: false, is_active: true,
  };
  const [draft, setDraft] = useState<any>(blank);

  const reload = () => {
    qc.invalidateQueries({ queryKey: ["lg_role_mappings"] });
    qc.invalidateQueries({ queryKey: ["lg_role_type_mapping_all"] });
  };

  const startAdd = () => { setDraft(blank); setAdding(true); setEditingId(null); };
  const startEdit = (r: any) => { setDraft({ ...r }); setEditingId(r.id); setAdding(false); };
  const cancel = () => { setAdding(false); setEditingId(null); setDraft(blank); };

  const save = async () => {
    const err = validateRoleMapping(draft);
    if (err) return toast.error(err);
    try {
      await upsertRoleMapping(draft, userCode || undefined);
      toast.success(editingId ? "Mapping updated" : "Mapping added");
      cancel();
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this role mapping?")) return;
    try {
      await deleteRoleMapping(id);
      toast.success("Mapping removed");
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) return <Loading />;




  const editorRow = (key: string) => (
    <TableRow key={key} className="bg-muted/30">
      <TableCell>
        <Input value={draft.system_role}
          onChange={(e) => setDraft({ ...draft, system_role: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
          placeholder="e.g. LEGAL_ASSISTANT" />
      </TableCell>
      <TableCell>
        <Select value={draft.role_type} onValueChange={(v) => setDraft({ ...draft, role_type: v })}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ROLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </TableCell>
      {(["can_prepare","can_review","can_approve","can_post_fee","can_close_case","is_active"] as const).map((f) => (
        <TableCell key={f}>
          <Switch checked={!!draft[f]} onCheckedChange={(v) => setDraft({ ...draft, [f]: v })} />
        </TableCell>
      ))}
      <TableCell className="text-xs text-muted-foreground">—</TableCell>
      <TableCell className="flex gap-1">
        <Button size="sm" onClick={save}>Save</Button>
        <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Security Role → Legal Role Type</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Legal does not have its own users. Each Security role is mapped to one or more Legal role-types
            that determine what the user can prepare, review, approve, post or close.
          </p>
        </div>
        <Button size="sm" onClick={startAdd} disabled={adding || !!editingId}>
          <Plus className="h-4 w-4 mr-1" /> Add mapping
        </Button>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>System Role</TableHead>
            <TableHead>Legal Role Type</TableHead>
            <TableHead>Prepare</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Approve</TableHead>
            <TableHead>Post Fee</TableHead>
            <TableHead>Close Case</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Audit</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {adding && editorRow("__new__")}
            {rows.length === 0 && !adding && (
              <TableRow><TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                No mappings configured. Built-in defaults will be applied.
              </TableCell></TableRow>
            )}
            {rows.map((r: any) => editingId === r.id ? editorRow(r.id) : (
              <TableRow key={r.id} className={r.is_active ? "" : "opacity-60"}>
                <TableCell className="font-medium">{r.system_role}</TableCell>
                <TableCell>{r.role_type}</TableCell>
                <TableCell>{r.can_prepare ? "✓" : "—"}</TableCell>
                <TableCell>{r.can_review ? "✓" : "—"}</TableCell>
                <TableCell>{r.can_approve ? "✓" : "—"}</TableCell>
                <TableCell>{r.can_post_fee ? "✓" : "—"}</TableCell>
                <TableCell>{r.can_close_case ? "✓" : "—"}</TableCell>
                <TableCell>
                  {r.is_active
                    ? <Badge variant="default">Active</Badge>
                    : <Badge variant="secondary">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <div>By: {r.created_by ?? "—"}</div>
                  <div>Updated: {r.updated_at ? formatDateForDisplay(r.updated_at) : "—"}{r.updated_by ? ` (${r.updated_by})` : ""}</div>
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(r)}
                    disabled={adding || !!editingId}>Edit</Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)}
                    disabled={adding || !!editingId}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CapabilityPreviewTab() {
  const { data: rows = [], isLoading } = useLgRoleMappings();

  // group by system_role -> set of legal role-types (only active mappings count)
  const grouped = useMemo(() => {
    const m = new Map<string, LgRoleType[]>();
    for (const r of rows as any[]) {
      if (!r.is_active) continue;
      const list = m.get(r.system_role) ?? [];
      if (!list.includes(r.role_type)) list.push(r.role_type);
      m.set(r.system_role, list);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  if (isLoading) return <Loading />;

    const previewColumns: LgColumnDef<any>[] = useMemo(() => [
    { accessorKey: "sysRole", header: "System Role", meta: { label: "System Role", pinLeft: true } },
    { 
      accessorKey: "types", 
      header: "Legal Role Types", 
      meta: { label: "Legal Role Types" },
      cell: ({ getValue }) => (
        <div className="flex flex-wrap gap-1">
          {(getValue() as string[]).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
        </div>
      )
    },
    ...PREVIEW_CAPS.map(c => ({
      id: c,
      header: c,
      meta: { label: c },
      cell: ({ row }: { row: any }) => {
        const types = row.original.types;
        const caps = new Set();
        types.forEach((t: any) => LG_BASE_MATRIX[t]?.forEach((cp: any) => caps.add(cp)));
        return caps.has(c) ? <span className="text-success">✓</span> : <span className="text-muted-foreground">—</span>;
      }
    }))
  ], []);
  const previewData = grouped.map(([sysRole, types]) => ({ sysRole, types }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Derived Capability Preview
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent className="max-w-sm">
                Shows the capabilities that <code>useLgAccess</code> grants users who hold each
                Security role, based on the active Role &amp; Capability mappings above and the
                built-in role-type matrix.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {previewData.length > 0 ? (
          <LgDataGrid
            id="lg.config.capabilities"
            columns={previewColumns}
            data={previewData}
            exportFilename="derived-capabilities-preview"
          />
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No active role mappings. Add a mapping to see derived capabilities.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PolicyTab() {
  const { data: rows = [], isLoading } = useLgPolicies();
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  const [editing, setEditing] = useState<Record<string, Partial<LgWorkflowPolicy>>>({});

  const save = async (row: LgWorkflowPolicy) => {
    const patch = editing[row.id];
    if (!patch) return;
    try {
      await updateWorkflowPolicy(row.id, patch, userCode || undefined);
      toast.success(`${row.action_label} saved`);
      setEditing((e) => { const { [row.id]: _, ...rest } = e; return rest; });
      qc.invalidateQueries({ queryKey: ["lg_workflow_policies"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const update = (id: string, k: keyof LgWorkflowPolicy, v: any) =>
    setEditing((e) => ({ ...e, [id]: { ...e[id], [k]: v } }));

  const valueOf = (r: LgWorkflowPolicy, k: keyof LgWorkflowPolicy) =>
    (editing[r.id]?.[k] ?? r[k]) as any;

  if (isLoading) return <Loading />;




  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-action approval policy</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Configure who prepares, who approves, and how strictly each Legal action is gated.
          Small departments can leave Approval Required off; larger ones can require multiple approvers.
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Approval req.</TableHead>
            <TableHead>Preparer role</TableHead>
            <TableHead>Approver role</TableHead>
            <TableHead>Min approvers</TableHead>
            <TableHead>Self approve</TableHead>
            <TableHead>Assistant prepares</TableHead>
            <TableHead>Lawyer reviews</TableHead>
            <TableHead>Active</TableHead>
            <TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className={valueOf(r, "is_active") ? "" : "opacity-60"}>
                <TableCell>
                  <div className="font-medium">{r.action_label}</div>
                  <div className="text-xs text-muted-foreground">{r.action_code}</div>
                </TableCell>
                <TableCell>
                  <Switch checked={!!valueOf(r, "approval_required")}
                    onCheckedChange={(v) => update(r.id, "approval_required", v)} />
                </TableCell>
                <TableCell>
                  <Select value={(valueOf(r, "preparer_role_type") as string) ?? "__none__"}
                    onValueChange={(v) => update(r.id, "preparer_role_type", v === "__none__" ? null : v)}>
                    <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {ROLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={(valueOf(r, "approver_role_type") as string) ?? "__none__"}
                    onValueChange={(v) => update(r.id, "approver_role_type", v === "__none__" ? null : v)}>
                    <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {ROLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input type="number" min={1} className="w-20"
                    value={(valueOf(r, "min_approvers") as number) ?? 1}
                    onChange={(e) => update(r.id, "min_approvers", Math.max(1, parseInt(e.target.value || "1", 10)))} />
                </TableCell>
                <TableCell>
                  <Switch checked={!!valueOf(r, "allow_self_approval")}
                    onCheckedChange={(v) => update(r.id, "allow_self_approval", v)} />
                </TableCell>
                <TableCell>
                  <Switch checked={!!valueOf(r, "assistant_can_prepare")}
                    onCheckedChange={(v) => update(r.id, "assistant_can_prepare", v)} />
                </TableCell>
                <TableCell>
                  <Switch checked={!!valueOf(r, "lawyer_must_review")}
                    onCheckedChange={(v) => update(r.id, "lawyer_must_review", v)} />
                </TableCell>
                <TableCell>
                  <Switch checked={!!valueOf(r, "is_active")}
                    onCheckedChange={(v) => update(r.id, "is_active", v)} />
                </TableCell>
                <TableCell>
                  <Button size="sm" disabled={!editing[r.id]} onClick={() => save(r)}>Save</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm">{label}</Label>
      <div className="w-[260px]">{children}</div>
    </div>
  );
}

function Loading() {
  return <div className="p-6 flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>;
}
