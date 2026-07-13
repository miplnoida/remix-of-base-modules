/**
 * EPIC CH-P1 — Send Policy Management page.
 * Route: /admin/communication-hub/governance/send-policies
 *
 * Admin-only. Lists per-event send policies with mode, recipient policy,
 * approval status, and safe edit/approve/disable actions. Never sends email,
 * never opens a live window, never creates a communication_request.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, ShieldAlert, Info, ArrowLeft, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CommunicationHubDataTable, { type HubTableColumn } from "../components/CommunicationHubDataTable";
import { ModuleEventPair, YesNoBadge } from "../components/tableFormatters";
import {
  approveSendPolicy,
  fetchSendPolicies,
  isDangerousPolicyChange,
  updateSendPolicy,
  type CommHubEventSendPolicy,
  type SendPolicy,
  type RecipientPolicy,
} from "./sendPolicyService";

const SEND_POLICIES: SendPolicy[] = [
  "disabled","dry_run_only","prepare_only","manual_review","manual_live","auto_live_internal","auto_live_external",
];
const RECIPIENT_POLICIES: RecipientPolicy[] = ["internal_only","external_allowed","mixed","system_only"];

export default function CommHubSendPoliciesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CommHubEventSendPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<CommHubEventSendPolicy | null>(null);

  async function reload() {
    setLoading(true); setErr(null);
    try { setRows(await fetchSendPolicies()); }
    catch (e: any) { setErr(e?.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  return (
    <div className="container mx-auto max-w-7xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/admin/communication-hub/governance" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Governance & Live Control
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">Send Policy Management</h1>
          <p className="text-sm text-muted-foreground">
            Per-event send policies. Governs whether an event runs in dry-run, manual review, manual live, or auto-live mode.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/communication-hub/safety">Open Safety Switchboard</Link>
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Policy metadata only — no sends happen here</AlertTitle>
        <AlertDescription className="text-xs">
          Actual sending continues to run through the governed live pilot and workflow paths, all of which enforce existing safety gates.
        </AlertDescription>
      </Alert>

      {err && (
        <Alert variant="destructive"><ShieldAlert className="h-4 w-4" /><AlertDescription>{err}</AlertDescription></Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configured policies</CardTitle>
          <CardDescription>Change management is audited and requires a reason for high-risk changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No policies configured yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr className="text-left">
                    <th className="py-2 pr-3">Module</th>
                    <th className="py-2 pr-3">Event</th>
                    <th className="py-2 pr-3">Ch</th>
                    <th className="py-2 pr-3">Send policy</th>
                    <th className="py-2 pr-3">Recipient policy</th>
                    <th className="py-2 pr-3">Internal domains</th>
                    <th className="py-2 pr-3">Max</th>
                    <th className="py-2 pr-3">Approved</th>
                    <th className="py-2 pr-3">Enabled</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-3 font-mono text-xs">{r.module_code}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{r.event_code}</td>
                      <td className="py-2 pr-3 text-xs">{r.channel}</td>
                      <td className="py-2 pr-3"><PolicyBadge p={r.send_policy} /></td>
                      <td className="py-2 pr-3 text-xs">{r.recipient_policy}</td>
                      <td className="py-2 pr-3 text-xs">
                        {(r.allowed_internal_domains ?? []).map((d) => (
                          <Badge key={d} variant="outline" className="mr-1 text-[10px]">{d}</Badge>
                        ))}
                      </td>
                      <td className="py-2 pr-3 text-xs">{r.max_recipients_per_send}</td>
                      <td className="py-2 pr-3">
                        {r.approved_by ? <Badge className="text-[10px]"><ShieldCheck className="h-3 w-3 mr-1" />yes</Badge>
                                       : <Badge variant="outline" className="text-[10px]">no</Badge>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.is_enabled ? "default" : "outline"} className="text-[10px]">{r.is_enabled ? "on" : "off"}</Badge>
                      </td>
                      <td className="py-2 pr-3 space-x-2 whitespace-nowrap">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Quick links</CardTitle></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
          <QuickLink to="/admin/communication-hub/governance" label="Governance & Live Control" />
          <QuickLink to="/admin/communication-hub/design/sender-profiles" label="Sender Profiles" />
          <QuickLink to="/admin/communication-hub/design/sender-verification" label="Sender Verification" />
          <QuickLink to="/admin/communication-hub/onboarding/event-template-wizard" label="Event Template Mapping" />
        </CardContent>
      </Card>

      {editing && (
        <EditPolicyDialog
          policy={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); toast({ title: "Policy updated" }); }}
          onApproved={() => { setEditing(null); reload(); toast({ title: "Policy approved" }); }}
        />
      )}
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent">
      <ExternalLink className="h-3.5 w-3.5" /> <span className="text-xs">{label}</span>
    </Link>
  );
}

function PolicyBadge({ p }: { p: SendPolicy }) {
  const map: Record<SendPolicy, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
    disabled: { label: "disabled", variant: "outline" },
    dry_run_only: { label: "dry-run", variant: "outline" },
    prepare_only: { label: "prepare", variant: "outline" },
    manual_review: { label: "manual review", variant: "secondary" },
    manual_live: { label: "manual live", variant: "default" },
    auto_live_internal: { label: "auto internal", variant: "default" },
    auto_live_external: { label: "auto external", variant: "destructive" },
  };
  const m = map[p];
  return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
}

function EditPolicyDialog({
  policy, onClose, onSaved, onApproved,
}: {
  policy: CommHubEventSendPolicy;
  onClose: () => void;
  onSaved: () => void;
  onApproved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<CommHubEventSendPolicy>(policy);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [saving, setSaving] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");
  const [approving, setApproving] = useState(false);
  const [domainsInternal, setDomainsInternal] = useState((policy.allowed_internal_domains ?? []).join(", "));

  const dangerous = useMemo(() => isDangerousPolicyChange(policy, form), [policy, form]);
  const needsTyped = dangerous.dangerous;
  const typedOk = typed.trim().toUpperCase() === "CONFIRM";

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Partial<CommHubEventSendPolicy> = {
        send_policy: form.send_policy,
        recipient_policy: form.recipient_policy,
        allow_internal_recipients: form.allow_internal_recipients,
        allow_external_recipients: form.allow_external_recipients,
        allowed_internal_domains: domainsInternal.split(",").map((s) => s.trim()).filter(Boolean),
        max_recipients_per_send: Number(form.max_recipients_per_send) || 1,
        max_sends_per_entity_per_event: Number(form.max_sends_per_entity_per_event) || 1,
        duplicate_window_minutes: Number(form.duplicate_window_minutes) || 0,
        require_typed_confirmation_for_send: form.require_typed_confirmation_for_send,
        require_typed_confirmation_for_policy_change: form.require_typed_confirmation_for_policy_change,
        is_enabled: form.is_enabled,
      };
      if (needsTyped && !typedOk) throw new Error("Type CONFIRM to apply this high-risk change.");
      await updateSendPolicy({ current: policy, patch, reason });
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await approveSendPolicy(policy, approveNotes);
      onApproved();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e?.message, variant: "destructive" });
    } finally { setApproving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit send policy — {policy.module_code} / {policy.event_code}</DialogTitle>
          <DialogDescription>Changes are audited. Reason is required.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Send policy</Label>
            <Select value={form.send_policy} onValueChange={(v) => setForm({ ...form, send_policy: v as SendPolicy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEND_POLICIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Recipient policy</Label>
            <Select value={form.recipient_policy} onValueChange={(v) => setForm({ ...form, recipient_policy: v as RecipientPolicy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RECIPIENT_POLICIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Allowed internal domains (comma-separated)</Label>
            <Input value={domainsInternal} onChange={(e) => setDomainsInternal(e.target.value)} placeholder="mishainfotech.com" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.allow_internal_recipients} onCheckedChange={(v) => setForm({ ...form, allow_internal_recipients: v })} />
            <Label>Allow internal recipients</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.allow_external_recipients} onCheckedChange={(v) => setForm({ ...form, allow_external_recipients: v })} />
            <Label>Allow external recipients</Label>
          </div>
          <div>
            <Label>Max recipients per send</Label>
            <Input type="number" min={1} value={form.max_recipients_per_send} onChange={(e) => setForm({ ...form, max_recipients_per_send: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Duplicate window (minutes)</Label>
            <Input type="number" min={0} value={form.duplicate_window_minutes} onChange={(e) => setForm({ ...form, duplicate_window_minutes: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_enabled} onCheckedChange={(v) => setForm({ ...form, is_enabled: v })} />
            <Label>Enabled</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.require_typed_confirmation_for_send} onCheckedChange={(v) => setForm({ ...form, require_typed_confirmation_for_send: v })} />
            <Label>Require typed confirmation per send</Label>
          </div>
        </div>

        {dangerous.dangerous && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>High-risk change</AlertTitle>
            <AlertDescription className="text-xs">
              {dangerous.reasons.join("; ")}. Type <code>CONFIRM</code> to acknowledge.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div>
            <Label>Reason (required)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this change?" />
          </div>
          {needsTyped && (
            <div>
              <Label>Typed confirmation</Label>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type CONFIRM" />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !reason.trim() || (needsTyped && !typedOk)}>
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Save changes
          </Button>
        </DialogFooter>

        {!policy.approved_by && (
          <div className="mt-4 rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Approve this policy</div>
            <Textarea value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="Approval notes" />
            <Button size="sm" onClick={handleApprove} disabled={approving}>
              {approving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />} Mark approved
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
