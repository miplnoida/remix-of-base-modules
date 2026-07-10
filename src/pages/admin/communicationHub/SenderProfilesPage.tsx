/**
 * EPIC CH-S1 — Sender Profiles admin page.
 * Route: /admin/communication-hub/design/sender-profiles
 * Admin-only. Read via SELECT; writes go through SECURITY DEFINER RPCs.
 * NO SENDING. NO SECRETS. NO PROVIDER CONFIG.
 */
import { useEffect, useMemo, useState } from "react";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RefreshCcw, Plus, Pencil, Copy, ShieldCheck, ShieldAlert, Star,
  CheckCircle2, XCircle, Power, PowerOff, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listSenderProfiles,
  createSenderProfile,
  updateSenderProfile,
  enableSenderProfile,
  disableSenderProfile,
  setDefaultSenderProfile,
  setSenderIdentityStatus,
  setSenderDomainVerified,
  SENDER_CATEGORY_OPTIONS,
  SENDER_AUDIENCE_OPTIONS,
  SENDER_RISK_OPTIONS,
  type SenderProfile,
} from "./services/senderProfileService";

interface FormState {
  id: string | null;
  profile_code: string;
  profile_name: string;
  from_email: string;
  display_name: string;
  reply_to_email: string;
  sender_category: string;
  audience_type: string;
  risk_level: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  id: null, profile_code: "", profile_name: "", from_email: "", display_name: "",
  reply_to_email: "", sender_category: "notifications", audience_type: "external",
  risk_level: "low", notes: "",
};

export default function SenderProfilesPage() {
  const [rows, setRows] = useState<SenderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [fCategory, setFCategory] = useState("all");
  const [fAudience, setFAudience] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fEnabled, setFEnabled] = useState("all");

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  async function reload() {
    setLoading(true);
    try { setRows(await listSenderProfiles()); }
    catch (e: any) { toast.error(e.message ?? "Failed to load"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (fCategory !== "all" && r.sender_category !== fCategory) return false;
    if (fAudience !== "all" && r.audience_type !== fAudience) return false;
    if (fStatus !== "all" && r.provider_identity_status !== fStatus) return false;
    if (fEnabled === "enabled" && !r.is_enabled) return false;
    if (fEnabled === "disabled" && r.is_enabled) return false;
    if (q) {
      const s = q.toLowerCase();
      const hay = `${r.profile_name} ${r.from_email} ${r.display_name} ${r.sender_category} ${r.profile_code}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [rows, q, fCategory, fAudience, fStatus, fEnabled]);

  function openAdd() { setForm(EMPTY_FORM); setEditOpen(true); }
  function openEdit(r: SenderProfile) {
    setForm({
      id: r.id, profile_code: r.profile_code, profile_name: r.profile_name,
      from_email: r.from_email, display_name: r.display_name,
      reply_to_email: r.reply_to_email ?? "", sender_category: r.sender_category,
      audience_type: r.audience_type, risk_level: r.risk_level, notes: r.notes ?? "",
    });
    setEditOpen(true);
  }

  async function save() {
    if (!form.profile_code || !form.profile_name || !form.from_email || !form.display_name) {
      toast.error("Profile code, name, from_email, and display name are required.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        profile_code: form.profile_code,
        profile_name: form.profile_name,
        from_email: form.from_email,
        display_name: form.display_name,
        reply_to_email: form.reply_to_email || null,
        sender_category: form.sender_category,
        audience_type: form.audience_type,
        risk_level: form.risk_level,
        notes: form.notes || null,
      };
      if (form.id) await updateSenderProfile(form.id, payload);
      else await createSenderProfile(payload);
      toast.success("Sender profile saved.");
      setEditOpen(false);
      await reload();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setBusy(false); }
  }

  async function runAction(fn: () => Promise<any>, okMsg: string) {
    setBusy(true);
    try { await fn(); toast.success(okMsg); await reload(); }
    catch (e: any) { toast.error(e.message ?? "Action failed"); }
    finally { setBusy(false); }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    toast.success(`Copied ${email}`);
  }

  return (
    <CommunicationHubWorkspaceShell
      title="Sender Profiles"
      purpose="Central From-Email registry. Every event maps to one sender profile. Verification is required before live external sends. No secrets or provider credentials are stored here."
      risk="action-capable"
      quickLinks={[
        { label: "Design & Templates", href: "/admin/communication-hub/design" },
        { label: "Event & Template Wizard", href: "/admin/communication-hub/onboarding/event-template-wizard" },
        { label: "Provider Settings", href: "/admin/notifications/providers" },
      ]}
    >
      <CommunicationHubSectionCard
        title="Sender Profile Registry (EPIC CH-S1)"
        description="Only enabled + verified senders may be used for live external emails. Only one profile is the system default."
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Sender Profiles
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> Add sender
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-6">
              <Input placeholder="Search email/name/category" value={q} onChange={(e) => setQ(e.target.value)} className="md:col-span-2" />
              <Select value={fCategory} onValueChange={setFCategory}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {SENDER_CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fAudience} onValueChange={setFAudience}>
                <SelectTrigger><SelectValue placeholder="Audience" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All audiences</SelectItem>
                  {SENDER_AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fStatus} onValueChange={setFStatus}>
                <SelectTrigger><SelectValue placeholder="Verification" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {["pending","verified","rejected","disabled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={fEnabled} onValueChange={setFEnabled}>
                <SelectTrigger><SelectValue placeholder="Enabled" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left p-2">Profile</th>
                    <th className="text-left p-2">From email</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">Audience</th>
                    <th className="text-left p-2">Risk</th>
                    <th className="text-left p-2">Verification</th>
                    <th className="text-left p-2">State</th>
                    <th className="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No sender profiles match filters.</td></tr>
                  )}
                  {!loading && filtered.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">
                        <div className="font-medium flex items-center gap-1">
                          {r.profile_name}
                          {r.is_default && <Star className="h-3 w-3 text-amber-500" aria-label="default" />}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">{r.profile_code}</div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono text-xs">{r.from_email}</div>
                        <div className="text-[10px] text-muted-foreground">{r.display_name}</div>
                      </td>
                      <td className="p-2"><Badge variant="outline">{r.sender_category}</Badge></td>
                      <td className="p-2"><Badge variant="outline">{r.audience_type}</Badge></td>
                      <td className="p-2"><Badge variant="outline">{r.risk_level}</Badge></td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1">
                          <Badge variant={r.provider_identity_status === "verified" ? "secondary" : "destructive"}>
                            {r.provider_identity_status === "verified"
                              ? <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              : <ShieldAlert className="h-3 w-3 mr-1 inline" />}
                            {r.provider_identity_status}
                          </Badge>
                          <Badge variant={r.domain_verified ? "secondary" : "destructive"} className="text-[10px]">
                            domain {r.domain_verified ? "verified" : "unverified"}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant={r.is_enabled ? "secondary" : "destructive"}>
                          {r.is_enabled ? "enabled" : "disabled"}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(r)} disabled={busy}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Copy email" onClick={() => copyEmail(r.from_email)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          {r.is_enabled ? (
                            <Button size="icon" variant="ghost" title="Disable"
                              onClick={() => runAction(() => disableSenderProfile(r.id, "admin disabled sender"), "Sender disabled")}
                              disabled={busy}>
                              <PowerOff className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" title="Enable"
                              onClick={() => runAction(() => enableSenderProfile(r.id, "admin enabled sender"), "Sender enabled")}
                              disabled={busy}>
                              <Power className="h-3 w-3" />
                            </Button>
                          )}
                          {r.provider_identity_status !== "verified" && (
                            <Button size="icon" variant="ghost" title="Mark verified"
                              onClick={() => runAction(() => setSenderIdentityStatus(r.id, "verified", "admin marked identity verified"), "Marked verified")}
                              disabled={busy}>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            </Button>
                          )}
                          {r.provider_identity_status !== "pending" && (
                            <Button size="icon" variant="ghost" title="Reset to pending"
                              onClick={() => runAction(() => setSenderIdentityStatus(r.id, "pending", "admin reset identity to pending"), "Reset to pending")}
                              disabled={busy}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title={r.domain_verified ? "Unverify domain" : "Mark domain verified"}
                            onClick={() => runAction(
                              () => setSenderDomainVerified(r.id, !r.domain_verified, r.domain_verified ? "admin unverified domain" : "admin verified domain"),
                              r.domain_verified ? "Domain unverified" : "Domain verified",
                            )}
                            disabled={busy}>
                            <ShieldCheck className={"h-3 w-3 " + (r.domain_verified ? "text-emerald-600" : "")} />
                          </Button>
                          {!r.is_default && (
                            <Button size="icon" variant="ghost" title="Make default"
                              onClick={() => runAction(() => setDefaultSenderProfile(r.id, "admin set as default sender"), "Default updated")}
                              disabled={busy}>
                              <Star className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Alert>
              <AlertTitle className="text-xs">Verification required for live external sends</AlertTitle>
              <AlertDescription className="text-xs">
                A sender is only usable for live external email when it is enabled, has
                <code className="mx-1">provider_identity_status=verified</code> and
                <code className="mx-1">domain_verified=true</code>. Provider credentials
                are NEVER stored here — this registry only names the From address governance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </CommunicationHubSectionCard>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Update sender profile" : "Add sender profile"}</DialogTitle>
            <DialogDescription>
              from_email must be <code>@secureserve.biz</code>. New profiles start as
              enabled but not verified and cannot be used for live external sends until verified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Profile code</Label>
                <Input value={form.profile_code} onChange={e => setForm(f => ({ ...f, profile_code: e.target.value.toUpperCase() }))} disabled={!!form.id} />
              </div>
              <div>
                <Label>Profile name</Label>
                <Input value={form.profile_name} onChange={e => setForm(f => ({ ...f, profile_name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>From email</Label>
                <Input value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} placeholder="something@secureserve.biz" />
              </div>
              <div className="col-span-2">
                <Label>Display name</Label>
                <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Reply-to (optional)</Label>
                <Input value={form.reply_to_email} onChange={e => setForm(f => ({ ...f, reply_to_email: e.target.value }))} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.sender_category} onValueChange={v => setForm(f => ({ ...f, sender_category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENDER_CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={form.audience_type} onValueChange={v => setForm(f => ({ ...f, audience_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENDER_AUDIENCE_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Risk level</Label>
                <Select value={form.risk_level} onValueChange={v => setForm(f => ({ ...f, risk_level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENDER_RISK_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CommunicationHubWorkspaceShell>
  );
}
