/**
 * EPIC 2D — Event → Template Mapping panel.
 *
 * Admin-only view/edit of `communication_hub_event_template_map`.
 * Writes go through SECURITY DEFINER RPCs
 *   upsert_comm_hub_event_template_mapping
 *   disable_comm_hub_event_template_mapping
 *
 * Also exposes an admin-only "Create synthetic failed test message" action
 * (RPC: create_comm_hub_synthetic_failed_test_message) so operators can safely
 * rehearse the Retry Queue actions. NO provider call, test_mode only, audited.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { RefreshCcw, ShieldCheck, Plus, X, FlaskConical, Loader2, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { CommunicationHubDataTable, type HubTableColumn } from "../components/CommunicationHubDataTable";
import { IconAction, RowActionGroup } from "../components/RowActions";
import { AbsoluteTime } from "../components/tableFormatters";

interface MappingRow {
  id: string;
  module_code: string;
  event_code: string;
  channel: string;
  template_code: string;
  template_id: string | null;
  active: boolean;
  risk_level: string;
  mapping_source: string;
  reason: string | null;
  updated_at: string;
  sender_profile_id: string | null;
}

interface TemplateOption {
  id: string;
  code: string;
  is_active: boolean;
  active_version_id: string | null;
}

interface SenderOption {
  id: string;
  profile_name: string;
  from_email: string;
  display_name: string;
  is_enabled: boolean;
  provider_identity_status: string;
  domain_verified: boolean;
  sender_category: string;
}

export function EventTemplateMappingPanel() {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [senders, setSenders] = useState<SenderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);
  const [target, setTarget] = useState<MappingRow | null>(null);

  // Filters
  const [fModule, setFModule] = useState<string>("all");
  const [fChannel, setFChannel] = useState<string>("all");
  const [fRisk, setFRisk] = useState<string>("all");
  const [fActive, setFActive] = useState<string>("all");
  const [fTplState, setFTplState] = useState<string>("all");
  const [q, setQ] = useState("");
  const [qTpl, setQTpl] = useState("");

  const [form, setForm] = useState({
    module_code: "", event_code: "", channel: "email",
    template_code: "", risk_level: "low", reason: "",
    sender_profile_id: "" as string,
  });
  const [disableReason, setDisableReason] = useState("");
  const [busy, setBusy] = useState(false);

  // Synthetic-failed inputs
  const [synthForm, setSynthForm] = useState({
    module_code: "", event_code: "", template_code: "", reason:
      "Create synthetic failed dry-run for operator action rehearsal.",
  });

  async function reload() {
    setLoading(true);
    try {
      const [mapRes, tplRes, sndRes] = await Promise.all([
        (supabase as any).from("communication_hub_event_template_map")
          .select("*").order("module_code").order("event_code").order("channel"),
        (supabase as any).from("core_template")
          .select("id, code, is_active, active_version_id")
          .eq("is_active", true).order("code").limit(500),
        (supabase as any).from("communication_hub_sender_profile")
          .select("id, profile_name, from_email, display_name, is_enabled, provider_identity_status, domain_verified, sender_category")
          .order("sender_category").order("from_email"),
      ]);
      setRows((mapRes.data ?? []) as MappingRow[]);
      setTemplates((tplRes.data ?? []) as TemplateOption[]);
      setSenders((sndRes.data ?? []) as SenderOption[]);
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  const templateByCode = useMemo(() => {
    const m: Record<string, TemplateOption> = {};
    for (const t of templates) m[t.code] = t;
    return m;
  }, [templates]);
  const senderById = useMemo(() => {
    const m: Record<string, SenderOption> = {};
    for (const s of senders) m[s.id] = s;
    return m;
  }, [senders]);

  function openAdd() {
    setTarget(null);
    setForm({ module_code: "", event_code: "", channel: "email", template_code: "", risk_level: "low", reason: "", sender_profile_id: "" });
    setEditOpen(true);
  }
  function openEdit(r: MappingRow) {
    setTarget(r);
    setForm({
      module_code: r.module_code, event_code: r.event_code, channel: r.channel,
      template_code: r.template_code, risk_level: r.risk_level ?? "low",
      reason: "", sender_profile_id: r.sender_profile_id ?? "",
    });
    setEditOpen(true);
  }
  function openDisable(r: MappingRow) {
    setTarget(r); setDisableReason(""); setDisableOpen(true);
  }
  function openSynth(r: MappingRow) {
    setSynthForm({
      module_code: r.module_code, event_code: r.event_code, template_code: r.template_code,
      reason: "Create synthetic failed dry-run for operator action rehearsal.",
    });
    setSynthOpen(true);
  }

  async function saveMapping() {
    if (!form.reason.trim()) { toast.error("Reason required."); return; }
    if (!form.template_code || !form.module_code || !form.event_code) {
      toast.error("Module, event, and template are required."); return;
    }
    if (!target && !form.sender_profile_id) {
      toast.error("Sender profile is required for new mappings.");
      return;
    }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      const { data, error } = await (supabase as any).rpc("upsert_comm_hub_event_template_mapping_v2", {
        p_module_code: form.module_code.trim(),
        p_event_code: form.event_code.trim(),
        p_channel: form.channel,
        p_template_code: form.template_code.trim(),
        p_reason: form.reason.trim(),
        p_actor_user_id: uid,
        p_risk_level: form.risk_level,
        p_sender_profile_id: form.sender_profile_id || null,
      });
      if (error) { toast.error(error.message ?? "Save failed"); return; }
      if ((data as any)?.ok !== true) { toast.error(JSON.stringify(data)); return; }
      toast.success("Mapping saved.");
      setEditOpen(false);
      await reload();
    } finally { setBusy(false); }
  }

  async function disableMapping() {
    if (!target) return;
    if (!disableReason.trim()) { toast.error("Reason required."); return; }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      const { data, error } = await (supabase as any).rpc("disable_comm_hub_event_template_mapping", {
        p_module_code: target.module_code,
        p_event_code: target.event_code,
        p_channel: target.channel,
        p_reason: disableReason.trim(),
        p_actor_user_id: uid,
      });
      if (error) { toast.error(error.message ?? "Disable failed"); return; }
      if ((data as any)?.ok !== true) { toast.error(JSON.stringify(data)); return; }
      toast.success("Mapping disabled.");
      setDisableOpen(false);
      await reload();
    } finally { setBusy(false); }
  }

  async function createSynthetic() {
    if (!synthForm.reason.trim()) { toast.error("Reason required."); return; }
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      const { data, error } = await (supabase as any).rpc("create_comm_hub_synthetic_failed_test_message", {
        p_module_code: synthForm.module_code,
        p_event_code: synthForm.event_code,
        p_template_code: synthForm.template_code,
        p_reason: synthForm.reason.trim(),
        p_actor_user_id: uid,
      });
      if (error) { toast.error(error.message ?? "Failed"); return; }
      toast.success(`Synthetic failed dry-run created — request ${(data as any)?.request_no}. Visit Retry Queue to rehearse actions.`);
      setSynthOpen(false);
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Event → Template Mapping
          </CardTitle>
          <CardDescription>
            Canonical event/channel → template mapping. Admin-only. All changes are audited.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add / update mapping
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(() => {
          const modules = Array.from(new Set(rows.map(r => r.module_code))).sort();
          const channels = Array.from(new Set(rows.map(r => r.channel))).sort();
          const filtered = rows.filter(r => {
            if (fModule !== "all" && r.module_code !== fModule) return false;
            if (fChannel !== "all" && r.channel !== fChannel) return false;
            if (fRisk !== "all" && r.risk_level !== fRisk) return false;
            if (fActive === "active" && !r.active) return false;
            if (fActive === "disabled" && r.active) return false;
            const t = templateByCode[r.template_code];
            const tplState = !t ? "missing" : t.is_active && t.active_version_id ? "active" : "inactive";
            if (fTplState !== "all" && fTplState !== tplState) return false;
            if (q && !`${r.module_code} ${r.event_code}`.toLowerCase().includes(q.toLowerCase())) return false;
            if (qTpl && !r.template_code.toLowerCase().includes(qTpl.toLowerCase())) return false;
            return true;
          });

          const columns: HubTableColumn<MappingRow>[] = [
            {
              key: "moduleEvent", header: "Module / Event", sticky: "left", sortable: true, minWidth: 200,
              sortValue: (r) => `${r.module_code}:${r.event_code}`,
              cell: (r) => (
                <div>
                  <div className="font-mono text-[11px]">{r.module_code}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{r.event_code}</div>
                </div>
              ),
            },
            { key: "channel", header: "Channel", sortable: true, sortValue: (r) => r.channel, cell: (r) => <Badge variant="outline">{r.channel}</Badge> },
            { key: "template", header: "Template", sortable: true, sortValue: (r) => r.template_code, cell: (r) => <span className="font-mono text-[10px]">{r.template_code}</span> },
            {
              key: "tplState", header: "Template state", sortable: true,
              sortValue: (r) => {
                const t = templateByCode[r.template_code];
                return !t ? "missing" : t.is_active && t.active_version_id ? "active" : "inactive";
              },
              cell: (r) => {
                const t = templateByCode[r.template_code];
                const s = !t ? "missing" : t.is_active && t.active_version_id ? "active" : "inactive";
                return <Badge variant={s === "active" ? "secondary" : "destructive"}>{s}</Badge>;
              },
            },
            { key: "risk", header: "Risk", sortable: true, sortValue: (r) => r.risk_level, cell: (r) => <Badge variant="outline">{r.risk_level}</Badge> },
            {
              key: "sender", header: "Sender", sortable: true,
              sortValue: (r) => senderById[r.sender_profile_id ?? ""]?.from_email ?? "zzz",
              cell: (r) => {
                const s = r.sender_profile_id ? senderById[r.sender_profile_id] : null;
                if (!s) return <Badge variant="destructive" className="text-[10px]">missing</Badge>;
                const verified = s.provider_identity_status === "verified" && s.domain_verified;
                return (
                  <div className="min-w-[160px]">
                    <div className="font-mono text-[10px]">{s.from_email}</div>
                    <div className="flex gap-1 mt-0.5">
                      <Badge variant={s.is_enabled ? "secondary" : "destructive"} className="text-[9px]">
                        {s.is_enabled ? "enabled" : "disabled"}
                      </Badge>
                      <Badge variant={verified ? "secondary" : "outline"} className="text-[9px]">
                        {verified ? "verified" : "pending"}
                      </Badge>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "mapping", header: "Mapping", sortable: true, sortValue: (r) => (r.active ? "active" : "disabled"),
              cell: (r) => (
                <div>
                  <Badge variant={r.active ? "secondary" : "destructive"}>{r.active ? "active" : "disabled"}</Badge>
                  <div className="text-[10px] text-muted-foreground">{r.mapping_source}</div>
                </div>
              ),
            },
            { key: "updated", header: "Updated", sortable: true, sortValue: (r) => r.updated_at, cell: (r) => <AbsoluteTime value={r.updated_at} /> },
            {
              key: "actions", header: "Actions", sticky: "right", className: "w-[160px]",
              cell: (r) => (
                <RowActionGroup>
                  <IconAction icon={Pencil} label="Update mapping" onClick={() => openEdit(r)} />
                  {r.active && (
                    <IconAction icon={X} label="Disable mapping" danger onClick={() => openDisable(r)} />
                  )}
                  <IconAction
                    icon={Copy}
                    label="Copy template code"
                    onClick={() => {
                      navigator.clipboard.writeText(r.template_code);
                      toast.success("Template code copied");
                    }}
                  />
                  <IconAction icon={FlaskConical} label="Create synthetic failed dry-run" onClick={() => openSynth(r)} />
                </RowActionGroup>
              ),
            },
          ];

          return (
            <CommunicationHubDataTable
              screenKey="event-template-mapping"
              rows={filtered}
              columns={columns}
              loading={loading}
              getRowKey={(r) => r.id}
              defaultSort={{ key: "moduleEvent", direction: "asc" }}
              emptyMessage="No mappings match the current filters."
              toolbar={
                <div className="grid gap-2 md:grid-cols-7">
                  <Input placeholder="Search module/event…" value={q} onChange={e => setQ(e.target.value)} className="md:col-span-2" />
                  <Input placeholder="Search template…" value={qTpl} onChange={e => setQTpl(e.target.value)} />
                  <Select value={fModule} onValueChange={setFModule}><SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All modules</SelectItem>{modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={fChannel} onValueChange={setFChannel}><SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All channels</SelectItem>{channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={fRisk} onValueChange={setFRisk}><SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All risks</SelectItem>{["low","medium","high","sensitive"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={fActive} onValueChange={setFActive}><SelectTrigger><SelectValue placeholder="Mapping" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent>
                  </Select>
                  <Select value={fTplState} onValueChange={setFTplState}><SelectTrigger><SelectValue placeholder="Template state" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All templates</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="missing">Missing</SelectItem></SelectContent>
                  </Select>
                </div>
              }
            />
          );
        })()}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Technical details</summary>
          <p className="mt-2">
            Use the <FlaskConical className="inline h-3 w-3" /> row action to create a synthetic
            failed dry-run message (test_mode, no provider call) so operators can rehearse
            retry / cancel / clear-lock in the Retry Queue.
          </p>
        </details>
      </CardContent>

      {/* Add / update mapping dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target ? "Update mapping" : "Add mapping"}</DialogTitle>
            <DialogDescription>
              Writes go through the audited SECURITY DEFINER RPC. Template must exist with an active version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Module code</Label>
                <Input value={form.module_code} onChange={e => setForm(f => ({ ...f, module_code: e.target.value }))} disabled={!!target} />
              </div>
              <div>
                <Label>Event code</Label>
                <Input value={form.event_code} onChange={e => setForm(f => ({ ...f, event_code: e.target.value }))} disabled={!!target} />
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v }))} disabled={!!target}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["email","sms","whatsapp","push","in_app","print","letter"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm(f => ({ ...f, risk_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low","medium","high","sensitive"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={form.template_code} onValueChange={v => setForm(f => ({ ...f, template_code: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose active template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.code}>
                      {t.code} {t.active_version_id ? "" : " (no active version)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sender profile {!target && <span className="text-destructive">*</span>}</Label>
              <Select
                value={form.sender_profile_id || "__none"}
                onValueChange={v => setForm(f => ({ ...f, sender_profile_id: v === "__none" ? "" : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Choose sender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">(no sender)</SelectItem>
                  {senders.map(s => (
                    <SelectItem key={s.id} value={s.id} disabled={!s.is_enabled}>
                      {s.profile_name} — {s.from_email}
                      {!s.is_enabled ? " (disabled)"
                        : s.provider_identity_status !== "verified" ? " (pending)"
                        : !s.domain_verified ? " (domain unverified)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Manage senders in <a className="underline" href="/admin/communication-hub/design/sender-profiles">Sender Profiles</a>.
              </p>
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={saveMapping} disabled={busy}>
              {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Save mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable mapping</DialogTitle>
            <DialogDescription>
              Disables this event/channel mapping. Evaluator will report
              <code className="mx-1">template_code_unresolved_for_event</code> until re-enabled.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="rounded border p-2 bg-muted/50 text-xs">
              {target?.module_code} / {target?.event_code} / {target?.channel} → <code>{target?.template_code}</code>
            </div>
            <Label>Reason (required)</Label>
            <Textarea rows={3} value={disableReason} onChange={e => setDisableReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={disableMapping} disabled={busy || !disableReason.trim()}>
              {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}<X className="h-3 w-3 mr-1" />Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Synthetic failed helper */}
      <Dialog open={synthOpen} onOpenChange={setSynthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create synthetic failed dry-run</DialogTitle>
            <DialogDescription>
              Creates ONE test_mode=true message with status=failed for operator rehearsal.
              No provider call. Recipient locked to rohit@mishainfotech.com. Audited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="rounded border p-2 bg-muted/50 text-xs">
              {synthForm.module_code} / {synthForm.event_code} → <code>{synthForm.template_code}</code>
            </div>
            <Label>Reason (required)</Label>
            <Textarea rows={2} value={synthForm.reason} onChange={e => setSynthForm(f => ({ ...f, reason: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSynthOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={createSynthetic} disabled={busy || !synthForm.reason.trim()}>
              {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Create synthetic failed message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
