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
import { RefreshCcw, ShieldCheck, Plus, X, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
}

interface TemplateOption {
  id: string;
  code: string;
  is_active: boolean;
  active_version_id: string | null;
}

export function EventTemplateMappingPanel() {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [synthOpen, setSynthOpen] = useState(false);
  const [target, setTarget] = useState<MappingRow | null>(null);

  const [form, setForm] = useState({
    module_code: "", event_code: "", channel: "email",
    template_code: "", risk_level: "low", reason: "",
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
      const [mapRes, tplRes] = await Promise.all([
        (supabase as any).from("communication_hub_event_template_map")
          .select("*").order("module_code").order("event_code").order("channel"),
        (supabase as any).from("core_template")
          .select("id, code, is_active, active_version_id")
          .eq("is_active", true).order("code").limit(500),
      ]);
      setRows((mapRes.data ?? []) as MappingRow[]);
      setTemplates((tplRes.data ?? []) as TemplateOption[]);
    } finally { setLoading(false); }
  }

  useEffect(() => { void reload(); }, []);

  const templateByCode = useMemo(() => {
    const m: Record<string, TemplateOption> = {};
    for (const t of templates) m[t.code] = t;
    return m;
  }, [templates]);

  function openAdd() {
    setTarget(null);
    setForm({ module_code: "", event_code: "", channel: "email", template_code: "", risk_level: "low", reason: "" });
    setEditOpen(true);
  }
  function openEdit(r: MappingRow) {
    setTarget(r);
    setForm({
      module_code: r.module_code, event_code: r.event_code, channel: r.channel,
      template_code: r.template_code, risk_level: r.risk_level ?? "low",
      reason: "",
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
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) { toast.error("Not signed in."); return; }
      const { data, error } = await (supabase as any).rpc("upsert_comm_hub_event_template_mapping", {
        p_module_code: form.module_code.trim(),
        p_event_code: form.event_code.trim(),
        p_channel: form.channel,
        p_template_code: form.template_code.trim(),
        p_reason: form.reason.trim(),
        p_actor_user_id: uid,
        p_risk_level: form.risk_level,
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
            <ShieldCheck className="h-4 w-4 text-primary" /> Event → Template Mapping (EPIC 2D)
          </CardTitle>
          <CardDescription>
            Canonical event/channel → template mapping used by the live-gate evaluator and
            business-module dry-runs. Admin-only. All changes audited. No send here.
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
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading mappings…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 border-b">Module / Event</th>
                  <th className="p-2 border-b">Channel</th>
                  <th className="p-2 border-b">Template</th>
                  <th className="p-2 border-b">Template state</th>
                  <th className="p-2 border-b">Risk</th>
                  <th className="p-2 border-b">Mapping</th>
                  <th className="p-2 border-b">Updated</th>
                  <th className="p-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const t = templateByCode[r.template_code];
                  const tplState = !t ? "missing"
                    : t.is_active && t.active_version_id ? "active" : "inactive";
                  return (
                    <tr key={r.id} className="align-top border-b">
                      <td className="p-2">
                        <div className="font-mono text-[11px]">{r.module_code}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{r.event_code}</div>
                      </td>
                      <td className="p-2"><Badge variant="outline">{r.channel}</Badge></td>
                      <td className="p-2 font-mono text-[10px]">{r.template_code}</td>
                      <td className="p-2">
                        <Badge variant={tplState === "active" ? "secondary" : "destructive"}>{tplState}</Badge>
                      </td>
                      <td className="p-2"><Badge variant="outline">{r.risk_level}</Badge></td>
                      <td className="p-2">
                        <Badge variant={r.active ? "secondary" : "destructive"}>{r.active ? "active" : "disabled"}</Badge>
                        <div className="text-[10px] text-muted-foreground">{r.mapping_source}</div>
                      </td>
                      <td className="p-2 text-[10px]">{new Date(r.updated_at).toLocaleString()}</td>
                      <td className="p-2 space-x-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Update</Button>
                        {r.active && (
                          <Button size="sm" variant="ghost" onClick={() => openDisable(r)}>Disable</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openSynth(r)} title="Create synthetic failed dry-run">
                          <FlaskConical className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={8} className="p-3 text-center text-muted-foreground">No mappings configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Alert>
          <AlertTitle className="text-xs">Synthetic failed test message</AlertTitle>
          <AlertDescription className="text-xs">
            Use the <FlaskConical className="inline h-3 w-3" /> button per row to create ONE synthetic
            <code className="mx-1">status=failed</code> dry-run message (test_mode=true, no provider call)
            so operators can rehearse retry / cancel / clear-lock in the Failed &amp; Retry Queue.
          </AlertDescription>
        </Alert>
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
