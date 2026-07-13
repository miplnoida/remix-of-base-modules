/**
 * EPIC CH-S2 — Sender Verification Console.
 * Route: /admin/communication-hub/design/sender-verification
 *
 * Manual verification workflow for @secureserve.biz sender identities and DNS records.
 * No API keys. No provider secrets. All writes audited via SECURITY DEFINER RPCs.
 */
import { useEffect, useMemo, useState } from "react";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import CommunicationHubDataTable, { type HubTableColumn } from "./components/CommunicationHubDataTable";
import { AbsoluteTime, YesNoBadge } from "./components/tableFormatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShieldCheck, RefreshCcw, AlertTriangle, Lock } from "lucide-react";
import {
  listSenderProfiles,
  setSenderIdentityStatus,
  setSenderDomainVerified,
  setSenderVerification,
  enableSenderProfile,
  disableSenderProfile,
  runSenderProbe,
  SENDER_DNS_STATUS_OPTIONS,
  type SenderProbeAction,
  type SenderProfile,
} from "./services/senderProfileService";

function statusBadge(v: string) {
  const cls =
    v === "valid" || v === "verified"
      ? "bg-primary/10 text-primary border-primary/20"
      : v === "invalid" || v === "rejected" || v === "disabled"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : v === "pending"
      ? "bg-accent/30 text-accent-foreground border-accent/20"
      : "bg-muted text-muted-foreground";
  return <Badge variant="outline" className={cls}>{v}</Badge>;
}

interface DnsEditState {
  spf_status: string;
  dkim_status: string;
  dmarc_status: string;
  verification_notes: string;
  reason: string;
}

export default function SenderVerificationPage() {
  const [rows, setRows] = useState<SenderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SenderProfile | null>(null);
  const [form, setForm] = useState<DnsEditState>({
    spf_status: "unknown", dkim_status: "unknown", dmarc_status: "unknown",
    verification_notes: "", reason: "",
  });
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try { setRows(await listSenderProfiles()); }
    catch (e: any) { toast.error(e.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  function openEdit(row: SenderProfile) {
    setEditing(row);
    setForm({
      spf_status: row.spf_status,
      dkim_status: row.dkim_status,
      dmarc_status: row.dmarc_status,
      verification_notes: row.verification_notes ?? "",
      reason: "",
    });
  }

  async function saveDns() {
    if (!editing) return;
    if (!form.reason.trim()) { toast.error("Reason is required"); return; }
    setSaving(true);
    try {
      await setSenderVerification(editing.id, {
        spf_status: form.spf_status, dkim_status: form.dkim_status, dmarc_status: form.dmarc_status,
        verification_notes: form.verification_notes || null, reason: form.reason,
      });
      toast.success("DNS status updated");
      setEditing(null);
      await reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  async function markIdentity(row: SenderProfile, status: "verified" | "pending" | "rejected") {
    const reason = window.prompt(`Reason for marking identity ${status} on ${row.from_email}:`) ?? "";
    if (!reason.trim()) { toast.error("Reason required"); return; }
    try {
      await setSenderIdentityStatus(row.id, status, reason);
      toast.success(`Identity marked ${status}`);
      await reload();
    } catch (e: any) { toast.error(e.message ?? "Update failed"); }
  }

  async function markDomain(row: SenderProfile, verified: boolean) {
    const reason = window.prompt(
      `Reason for marking domain ${verified ? "verified" : "unverified"} on ${row.from_email}:`,
    ) ?? "";
    if (!reason.trim()) { toast.error("Reason required"); return; }
    try {
      await setSenderDomainVerified(row.id, verified, reason);
      toast.success(`Domain ${verified ? "verified" : "unverified"}`);
      await reload();
    } catch (e: any) { toast.error(e.message ?? "Update failed"); }
  }

  async function toggleEnabled(row: SenderProfile) {
    const reason = window.prompt(
      `Reason for ${row.is_enabled ? "disabling" : "enabling"} ${row.from_email}:`,
    ) ?? "";
    if (!reason.trim()) { toast.error("Reason required"); return; }
    try {
      if (row.is_enabled) await disableSenderProfile(row.id, reason);
      else await enableSenderProfile(row.id, reason);
      toast.success("Updated");
      await reload();
    } catch (e: any) { toast.error(e.message ?? "Update failed"); }
  }

  const [probing, setProbing] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<Record<string, any> | null>(null);

  async function runProbe(row: SenderProfile, action: SenderProbeAction) {
    const label =
      action === "provider_probe" ? "Provider probe" :
      action === "dns_probe" ? "DNS probe" : "Combined verification";
    const reason = window.prompt(`Reason for ${label} on ${row.from_email}:`) ?? "";
    if (!reason.trim()) { toast.error("Reason required"); return; }
    let selector: string | null = row.dkim_selector;
    if (action !== "provider_probe" && !selector) {
      const ans = window.prompt(
        `DKIM selector for ${row.from_email} (e.g. "resend"). Leave blank to skip DKIM check:`,
        "",
      );
      if (ans !== null && ans.trim()) selector = ans.trim();
    }
    setProbing(row.id);
    try {
      const res = await runSenderProbe({
        sender_profile_id: row.id,
        action,
        reason,
        dkim_selector: selector,
      });
      if (!res.ok) { toast.error(res.error ?? "Probe failed"); return; }
      setProbeResult({ from_email: row.from_email, ...res.result });
      toast.success(`${label} complete`);
      await reload();
    } catch (e: any) {
      toast.error(e.message ?? "Probe failed");
    } finally {
      setProbing(null);
    }
  }

  return (
    <CommunicationHubWorkspaceShell
      title="Sender Verification"
      purpose="Record SPF/DKIM/DMARC and identity status for each sender profile."
      risk="action-capable"
      quickLinks={[
        { label: "Sender Profiles", href: "/admin/communication-hub/design/sender-profiles" },
        { label: "Design & Templates", href: "/admin/communication-hub/design" },
        { label: "Governance & Live Control", href: "/admin/communication-hub/governance" },
      ]}
    >
      <CommunicationHubSectionCard
        title="Sender identity & DNS posture"
        description="Every change is audited with a required reason. Probes are read-only and never send email."
      >
        <Alert>
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Read-only probes — no email is sent</AlertTitle>
          <AlertDescription>
            Probes never send email and never expose provider secrets. Manual verification remains available.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end mt-3 mb-2">
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground p-4">Loading sender profiles…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 border-b">From email</th>
                  <th className="p-2 border-b">Category</th>
                  <th className="p-2 border-b">Provider</th>
                  <th className="p-2 border-b">Identity</th>
                  <th className="p-2 border-b">Domain</th>
                  <th className="p-2 border-b">SPF</th>
                  <th className="p-2 border-b">DKIM</th>
                  <th className="p-2 border-b">DMARC</th>
                  <th className="p-2 border-b">DKIM selector</th>
                  <th className="p-2 border-b">Enabled</th>
                  <th className="p-2 border-b">Last checked</th>
                  <th className="p-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b align-top">
                    <td className="p-2">
                      <div className="font-mono text-[11px]">{r.from_email}</div>
                      <div className="text-[10px] text-muted-foreground">{r.profile_name}</div>
                    </td>
                    <td className="p-2"><Badge variant="outline">{r.sender_category}</Badge></td>
                    <td className="p-2"><Badge variant="outline">{r.provider_code}</Badge></td>
                    <td className="p-2">{statusBadge(r.provider_identity_status)}</td>
                    <td className="p-2">{r.domain_verified ? statusBadge("valid") : statusBadge("pending")}</td>
                    <td className="p-2">{statusBadge(r.spf_status)}</td>
                    <td className="p-2">{statusBadge(r.dkim_status)}</td>
                    <td className="p-2">{statusBadge(r.dmarc_status)}</td>
                    <td className="p-2 font-mono text-[10px]">{r.dkim_selector ?? "—"}</td>
                    <td className="p-2">{r.is_enabled ? <Badge>enabled</Badge> : <Badge variant="destructive">disabled</Badge>}</td>
                    <td className="p-2 text-[10px] text-muted-foreground">
                      {r.last_checked_at ? new Date(r.last_checked_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={probing === r.id} onClick={() => runProbe(r, "combined_probe")}>Combined probe</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={probing === r.id} onClick={() => runProbe(r, "provider_probe")}>Provider</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" disabled={probing === r.id} onClick={() => runProbe(r, "dns_probe")}>DNS</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => openEdit(r)}>DNS…</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markIdentity(r, "verified")}>Mark verified</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markIdentity(r, "pending")}>Pending</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markIdentity(r, "rejected")}>Reject</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markDomain(r, !r.domain_verified)}>
                          {r.domain_verified ? "Unverify domain" : "Verify domain"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => toggleEnabled(r)}>
                          {r.is_enabled ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={12} className="p-4 text-center text-muted-foreground">No sender profiles.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CommunicationHubSectionCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" /> Latest probe result
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          {probeResult ? (
            <details open>
              <summary className="cursor-pointer">Technical details</summary>
              <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto max-h-64 mt-2">
{JSON.stringify(probeResult, null, 2)}
              </pre>
            </details>
          ) : (
            <p>Run a probe from the Actions column to see the result summary here.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DNS status — {editing?.from_email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(["spf_status","dkim_status","dmarc_status"] as const).map((k) => (
              <div key={k} className="grid gap-1">
                <Label>{k.replace("_status","").toUpperCase()}</Label>
                <Select value={form[k]} onValueChange={(v) => setForm(f => ({ ...f, [k]: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENDER_DNS_STATUS_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="grid gap-1">
              <Label>Verification notes</Label>
              <Textarea rows={3} value={form.verification_notes}
                onChange={(e) => setForm(f => ({ ...f, verification_notes: e.target.value }))} />
            </div>
            <div className="grid gap-1">
              <Label>Reason (required, audited)</Label>
              <Input value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Re-checked SPF/DKIM against dig results" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveDns} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CommunicationHubWorkspaceShell>
  );
}
