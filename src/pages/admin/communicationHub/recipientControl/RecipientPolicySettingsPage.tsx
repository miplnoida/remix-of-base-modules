/**
 * CH-SIMPLE-P2B — Recipient Policy Settings (canonical UI).
 *
 * The single admin surface for the fully configurable recipient policy
 * exposed by `communication_hub_recipient_policy`. Every change is written
 * through the `set_communication_recipient_policy` RPC — never with a direct
 * table update — so validation, versioning, and audit are atomic.
 *
 * This page is READ-ONLY safe: it never sends any communication.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Loader2, Trash2, Plus, ShieldCheck, RotateCcw, Save, TestTube2, CheckCircle2, Pencil, Eraser, BadgeCheck } from "lucide-react";
import {
  fetchRecipientPolicy,
  updateRecipientPolicy,
  evaluateRecipientPolicy,
  fetchRecipientPolicyAudit,
  setRecipientTestIdentity,
  type RecipientPolicy,
  type RecipientPolicyMode,
  type RecipientPolicyNamedAddress,
  type RecipientPolicyDomain,
  type RecipientPolicyEvaluation,
  type RecipientPolicyAuditEntry,
} from "@/platform/communication-hub/recipientPolicyService";

const MODE_OPTIONS: { value: RecipientPolicyMode; label: string; description: string; certified: boolean }[] = [
  { value: "DISABLED", label: "Disabled", description: "No recipients are authorised. All sends are blocked.", certified: true },
  { value: "SINGLE_CONFIGURED_RECIPIENT", label: "Single configured recipient", description: "Only one exact configured address may receive live email.", certified: true },
  { value: "APPROVED_NAMED_RECIPIENTS", label: "Approved named recipients", description: "Only individually approved addresses (active entries only) may receive email.", certified: true },
  { value: "APPROVED_DOMAINS", label: "Approved domains", description: "Any address at an active approved domain may receive email.", certified: true },
  { value: "CONTROLLED_EXTERNAL_RECIPIENTS", label: "Controlled external recipients", description: "Reserved for a future certified epic. Not selectable.", certified: false },
];

function normEmail(v: string): string {
  return v.trim().toLowerCase();
}
function normDomain(v: string): string {
  let d = v.trim().toLowerCase();
  if (d.startsWith("@")) d = d.slice(1);
  return d;
}

export default function CommHubRecipientPolicySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [server, setServer] = useState<RecipientPolicy | null>(null);
  const [draft, setDraft] = useState<RecipientPolicy | null>(null);
  const [reason, setReason] = useState("");
  const [audit, setAudit] = useState<RecipientPolicyAuditEntry[]>([]);

  const [newNamed, setNewNamed] = useState("");
  const [newNamedNote, setNewNamedNote] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newDomainNote, setNewDomainNote] = useState("");

  const [testTo, setTestTo] = useState("");
  const [testCc, setTestCc] = useState("");
  const [testBcc, setTestBcc] = useState("");
  const [testResult, setTestResult] = useState<RecipientPolicyEvaluation | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([fetchRecipientPolicy(), fetchRecipientPolicyAudit(50)]);
      setServer(p);
      setDraft(p);
      setAudit(a);
    } catch (e) {
      toast.error(`Failed to load recipient policy: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dirty = useMemo(() => {
    if (!server || !draft) return false;
    return JSON.stringify(server) !== JSON.stringify(draft);
  }, [server, draft]);

  const modeMeta = useMemo(
    () => MODE_OPTIONS.find((m) => m.value === (draft?.activeMode ?? "DISABLED")),
    [draft?.activeMode]
  );

  if (loading || !draft || !server) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading recipient policy…
      </div>
    );
  }

  function patch<K extends keyof RecipientPolicy>(k: K, v: RecipientPolicy[K]) {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
  }

  function addNamed() {
    const address = normEmail(newNamed);
    if (!address || !/^\S+@\S+\.\S+$/.test(address)) {
      toast.error("Enter a valid email address."); return;
    }
    if (draft!.approvedNamedAddresses.some((n) => n.address === address)) {
      toast.error("Address already listed."); return;
    }
    const next: RecipientPolicyNamedAddress = { address, active: true, note: newNamedNote.trim() || null };
    patch("approvedNamedAddresses", [...draft!.approvedNamedAddresses, next]);
    setNewNamed(""); setNewNamedNote("");
  }
  function toggleNamed(i: number, active: boolean) {
    const next = [...draft!.approvedNamedAddresses];
    next[i] = { ...next[i], active };
    patch("approvedNamedAddresses", next);
  }
  function removeNamed(i: number) {
    const next = [...draft!.approvedNamedAddresses];
    next.splice(i, 1);
    patch("approvedNamedAddresses", next);
  }

  function addDomain() {
    const domain = normDomain(newDomain);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      toast.error("Enter a valid domain (example.com)."); return;
    }
    if (draft!.approvedDomains.some((d) => d.domain === domain)) {
      toast.error("Domain already listed."); return;
    }
    const next: RecipientPolicyDomain = { domain, active: true, note: newDomainNote.trim() || null };
    patch("approvedDomains", [...draft!.approvedDomains, next]);
    setNewDomain(""); setNewDomainNote("");
  }
  function toggleDomain(i: number, active: boolean) {
    const next = [...draft!.approvedDomains];
    next[i] = { ...next[i], active };
    patch("approvedDomains", next);
  }
  function removeDomain(i: number) {
    const next = [...draft!.approvedDomains];
    next.splice(i, 1);
    patch("approvedDomains", next);
  }

  async function save() {
    if (!reason.trim()) { toast.error("A change reason is required."); return; }
    if (draft!.activeMode === "CONTROLLED_EXTERNAL_RECIPIENTS") {
      toast.error("CONTROLLED_EXTERNAL_RECIPIENTS is not certified yet."); return;
    }
    setSaving(true);
    try {
      const singleChanged = draft!.singleConfiguredAddress !== server!.singleConfiguredAddress;
      const singleForRpc: string | null | undefined = singleChanged
        ? draft!.singleConfiguredAddress ?? null
        : undefined;

      const updated = await updateRecipientPolicy({
        activeMode: draft!.activeMode,
        singleConfiguredAddress: singleForRpc,
        approvedNamedAddresses: draft!.approvedNamedAddresses,
        approvedDomains: draft!.approvedDomains,
        maxRecipientsPerRequest: draft!.maxRecipientsPerRequest,
        maxToRecipients: draft!.maxToRecipients,
        ccAllowed: draft!.ccAllowed,
        maxCcRecipients: draft!.maxCcRecipients,
        bccAllowed: draft!.bccAllowed,
        maxBccRecipients: draft!.maxBccRecipients,
        externalAddressesPermitted: draft!.externalAddressesPermitted,
        subdomainsPermitted: draft!.subdomainsPermitted,
        reason: reason.trim(),
      });
      setServer(updated);
      setDraft(updated);
      setReason("");
      const a = await fetchRecipientPolicyAudit(50);
      setAudit(a);
      toast.success("Recipient policy updated.");
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function reset() { setDraft(server); setReason(""); }

  async function runTest() {
    setTesting(true);
    try {
      const split = (s: string) =>
        s.split(/[,\s;]+/).map((v) => normEmail(v)).filter((v) => v.length > 0);
      const ev = await evaluateRecipientPolicy({
        to: split(testTo),
        cc: split(testCc),
        bcc: split(testBcc),
      });
      setTestResult(ev);
    } catch (e) {
      toast.error(`Evaluator error: ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recipient Policy Settings</h1>
          <p className="text-muted-foreground text-sm">
            The single, fully configurable authoriser for every outbound recipient.
            No email address is hardcoded in application code — this record is the only source of truth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">policy v{server.policyVersion}</Badge>
          <Badge variant="outline">config v{server.configurationVersion}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operating mode</CardTitle>
          <CardDescription>
            Select which recipient-set model this environment permits. Every mode is a positive-list
            authoriser evaluated by <code>evaluate_comm_hub_recipient_policy</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <Label>Active mode</Label>
            <Select value={draft.activeMode} onValueChange={(v) => patch("activeMode", v as RecipientPolicyMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODE_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value} disabled={!m.certified}>
                    {m.label}{!m.certified ? " (not certified)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modeMeta && <p className="text-muted-foreground text-sm">{modeMeta.description}</p>}
          </div>

          {draft.activeMode === "SINGLE_CONFIGURED_RECIPIENT" && (
            <div className="grid gap-2">
              <Label>Single configured recipient address</Label>
              <Input
                type="email"
                value={draft.singleConfiguredAddress ?? ""}
                onChange={(e) => patch("singleConfiguredAddress", e.target.value || null)}
                placeholder="ops@example.com"
              />
              <p className="text-muted-foreground text-xs">
                In this mode, only this exact address is authorised (case-insensitive). Any other recipient is blocked.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {draft.activeMode === "SINGLE_CONFIGURED_RECIPIENT" && (
        <TestRecipientIdentityCard policy={server} onChanged={load} />
      )}


      {(draft.activeMode === "APPROVED_NAMED_RECIPIENTS" || draft.activeMode === "SINGLE_CONFIGURED_RECIPIENT") && (
        <Card>
          <CardHeader>
            <CardTitle>Approved named addresses</CardTitle>
            <CardDescription>Individually approved recipient addresses. Only active entries are authorised.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="name@example.com" value={newNamed} onChange={(e) => setNewNamed(e.target.value)} />
              <Input placeholder="Note (optional)" value={newNamedNote} onChange={(e) => setNewNamedNote(e.target.value)} />
              <Button type="button" onClick={addNamed}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </div>
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.approvedNamedAddresses.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-muted-foreground text-sm">No approved named addresses yet.</TableCell></TableRow>
                )}
                {draft.approvedNamedAddresses.map((n, i) => (
                  <TableRow key={`${n.address}-${i}`}>
                    <TableCell className="font-mono text-xs">{n.address}</TableCell>
                    <TableCell><Switch checked={n.active} onCheckedChange={(v) => toggleNamed(i, v)} /></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{n.note ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeNamed(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {draft.activeMode === "APPROVED_DOMAINS" && (
        <Card>
          <CardHeader>
            <CardTitle>Approved domains</CardTitle>
            <CardDescription>Any recipient at an active domain is authorised. Subdomain rule below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
              <Input placeholder="example.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
              <Input placeholder="Note (optional)" value={newDomainNote} onChange={(e) => setNewDomainNote(e.target.value)} />
              <Button type="button" onClick={addDomain}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={draft.subdomainsPermitted}
                onCheckedChange={(v) => patch("subdomainsPermitted", v)} />
              <Label>Permit subdomains of approved domains (e.g. billing.example.com under example.com)</Label>
            </div>
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.approvedDomains.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-muted-foreground text-sm">No approved domains yet.</TableCell></TableRow>
                )}
                {draft.approvedDomains.map((d, i) => (
                  <TableRow key={`${d.domain}-${i}`}>
                    <TableCell className="font-mono text-xs">{d.domain}</TableCell>
                    <TableCell><Switch checked={d.active} onCheckedChange={(v) => toggleDomain(i, v)} /></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{d.note ?? "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeDomain(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recipient limits</CardTitle>
          <CardDescription>Hard ceilings applied per request. Event-level limits, when provided, are always narrower.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label>Total recipients per request</Label>
            <Input type="number" min={1} value={draft.maxRecipientsPerRequest}
              onChange={(e) => patch("maxRecipientsPerRequest", Math.max(1, Number(e.target.value)))} />
          </div>
          <div>
            <Label>Max TO recipients</Label>
            <Input type="number" min={1} value={draft.maxToRecipients}
              onChange={(e) => patch("maxToRecipients", Math.max(1, Number(e.target.value)))} />
          </div>
          <div />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={draft.ccAllowed} onCheckedChange={(v) => patch("ccAllowed", v)} />
              <Label>CC allowed</Label>
            </div>
            <Input type="number" min={0} value={draft.maxCcRecipients} disabled={!draft.ccAllowed}
              onChange={(e) => patch("maxCcRecipients", Math.max(0, Number(e.target.value)))} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={draft.bccAllowed} onCheckedChange={(v) => patch("bccAllowed", v)} />
              <Label>BCC allowed</Label>
            </div>
            <Input type="number" min={0} value={draft.maxBccRecipients} disabled={!draft.bccAllowed}
              onChange={(e) => patch("maxBccRecipients", Math.max(0, Number(e.target.value)))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={draft.externalAddressesPermitted}
              onCheckedChange={(v) => patch("externalAddressesPermitted", v)} />
            <Label>Permit external (non-domain) addresses</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change reason & save</CardTitle>
          <CardDescription>Every recipient-policy change is audited per-field. A reason is mandatory.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Add QA operator jane@example.com for APPROVED_NAMED_RECIPIENTS pilot (ticket OPS-4321)" />
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={!dirty || saving || !reason.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save policy
            </Button>
            <Button variant="outline" onClick={reset} disabled={!dirty || saving}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            {dirty && <Badge variant="secondary">Unsaved changes</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TestTube2 className="h-4 w-4" /> Test the current policy</CardTitle>
          <CardDescription>
            Calls the canonical evaluator against the SAVED policy. Does not send any communication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <div>
              <Label>To (comma or space separated)</Label>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="alice@example.com" />
            </div>
            <div>
              <Label>Cc</Label>
              <Input value={testCc} onChange={(e) => setTestCc(e.target.value)} placeholder="bob@example.com" />
            </div>
            <div>
              <Label>Bcc</Label>
              <Input value={testBcc} onChange={(e) => setTestBcc(e.target.value)} placeholder="ops@example.com" />
            </div>
          </div>
          <Button onClick={runTest} disabled={testing}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Evaluate
          </Button>
          {testResult && (
            <Alert variant={testResult.allowed ? "default" : "destructive"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {testResult.allowed ? "Allowed" : "Blocked"} — mode {testResult.releaseMode}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-xs">
                  <div><strong>Matched:</strong> {testResult.matchedRecipients.join(", ") || "—"}</div>
                  <div><strong>Blocked:</strong> {testResult.blockedRecipients.join(", ") || "—"}</div>
                  {testResult.blockers.length > 0 && (
                    <div><strong>Blockers:</strong> {testResult.blockers.map((b) => b.code + (b.address ? `:${b.address}` : "") + (b.reason ? `(${b.reason})` : "")).join(", ")}</div>
                  )}
                  <div className="text-muted-foreground">Evaluator ran against policy v{testResult.policyVersion} / config v{testResult.configurationVersion}.</div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>The most recent per-field changes to this policy.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Old → New</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Ver.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground text-sm">No audit entries yet.</TableCell></TableRow>
              )}
              {audit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(a.changedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{a.changedField}</TableCell>
                  <TableCell className="max-w-md truncate font-mono text-[11px]">
                    {JSON.stringify(a.oldValue)} → {JSON.stringify(a.newValue)}
                  </TableCell>
                  <TableCell className="text-xs">{a.reason ?? "—"}</TableCell>
                  <TableCell className="text-xs">p{a.policyVersion}/c{a.configurationVersion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
