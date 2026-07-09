/**
 * Communication Hub Control Center — UI page (Phase 1C-B7-A).
 *
 * Route: /admin/communication-hub/control-center
 *
 * Read/write panel for operational settings held in
 * `communication_hub_control_settings`. Every mutation writes an audit row
 * into `communication_hub_control_audit`.
 *
 * SAFETY GUARANTEES:
 *  - Does not schedule cron.
 *  - Does not invoke dispatcher, providers, or Resend.
 *  - Does not enqueue or send anything.
 *  - Does not touch notification_queue / notification_logs or any legacy
 *    business-module tables.
 *  - Secrets are never rendered — only the presence of the ENV hard gate is
 *    inferred from user input (see EMAIL_LIVE warning block).
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { toast } from "sonner";
import {
  ArrowLeft, ShieldCheck, AlertTriangle, Info, Plus, X, Save, RefreshCcw,
  Activity, Settings2, Rocket, FlaskConical, ScrollText,
} from "lucide-react";
import {
  fetchControlSettings,
  fetchRecentAudit,
  updateControlSettings,
  validateDomain,
  validateEmail,
  isHighRiskKey,
  type CommHubControlSettings,
  type CommHubControlAuditRow,
} from "./controlCenterService";
import { OperationalPanels } from "./OperationalPanels";
import { ManualDispatchTestPanel } from "./ManualDispatchTestPanel";
import { AdminTestNoticePanel } from "./AdminTestNoticePanel";
import { DeliveryReadinessPanel } from "./DeliveryReadinessPanel";
import { TrackingPolicyPanel } from "./TrackingPolicyPanel";
import { EventLiveControlPanel } from "./EventLiveControlPanel";
import { LiveWindowWizardPanel } from "./LiveWindowWizardPanel";
import { BusinessModuleReadinessMatrixPanel } from "./BusinessModuleReadinessMatrixPanel";
import { GenericEventPilotPanel } from "./GenericEventPilotPanel";
import { EventTemplateMappingPanel } from "./EventTemplateMappingPanel";
import { OperatorRehearsalWizardPanel } from "./OperatorRehearsalWizardPanel";
import { LiveReadinessGovernancePanel } from "./LiveReadinessGovernancePanel";



const HIGH_RISK_HINT =
  "High-risk changes (dispatch, dry-run, email live, cron desired, domain allowlist) require a reason.";

function summarizeValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.length === 0 ? "[]" : `[${v.join(", ")}]`;
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export default function ControlCenterPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CommHubControlSettings | null>(null);
  const [draft, setDraft] = useState<CommHubControlSettings | null>(null);
  const [audit, setAudit] = useState<CommHubControlAuditRow[]>([]);
  const [reason, setReason] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [domainConfirmed, setDomainConfirmed] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([fetchControlSettings(), fetchRecentAudit(50)]);
      setSettings(s);
      setDraft(s);
      setAudit(a);
      setReason("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load control center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const changedKeys = useMemo(() => {
    if (!settings || !draft) return [] as string[];
    const keys: string[] = [];
    (Object.keys(draft) as (keyof CommHubControlSettings)[]).forEach(k => {
      if (JSON.stringify((draft as any)[k]) !== JSON.stringify((settings as any)[k])) {
        keys.push(String(k));
      }
    });
    return keys;
  }, [settings, draft]);

  const requiresReason = changedKeys.some(isHighRiskKey);

  async function onSave() {
    if (!settings || !draft) return;
    if (requiresReason && !reason.trim()) {
      toast.error("A reason is required for high-risk changes.");
      return;
    }
    setSaving(true);
    try {
      const patch: Partial<CommHubControlSettings> = {};
      changedKeys.forEach(k => { (patch as any)[k] = (draft as any)[k]; });
      await updateControlSettings({ current: settings, patch, reason });
      toast.success("Control settings updated.");
      await reload();
      setDomainConfirmed(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof CommHubControlSettings>(key: K, value: CommHubControlSettings[K]) {
    setDraft(d => (d ? { ...d, [key]: value } : d));
  }

  function addEmail() {
    try {
      const v = validateEmail(newEmail);
      if (!draft) return;
      if (draft.allowed_email_addresses.includes(v)) throw new Error("Already in list.");
      set("allowed_email_addresses", [...draft.allowed_email_addresses, v]);
      setNewEmail("");
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid email");
    }
  }

  function removeEmail(v: string) {
    if (!draft) return;
    set("allowed_email_addresses", draft.allowed_email_addresses.filter(x => x !== v));
  }

  function addDomain() {
    try {
      if (!domainConfirmed) {
        toast.error("Confirm the domain-allowlist warning first.");
        return;
      }
      const v = validateDomain(newDomain);
      if (!draft) return;
      if (draft.allowed_email_domains.includes(v)) throw new Error("Already in list.");
      set("allowed_email_domains", [...draft.allowed_email_domains, v]);
      setNewDomain("");
    } catch (e: any) {
      toast.error(e?.message ?? "Invalid domain");
    }
  }

  function removeDomain(v: string) {
    if (!draft) return;
    set("allowed_email_domains", draft.allowed_email_domains.filter(x => x !== v));
  }

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Control Center"
          subtitle="Communication Hub — operational safety and dispatch controls"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: "Control Center" },
          ]}
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/communication-hub"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What is this screen?</AlertTitle>
          <AlertDescription>
            Control Center is where admins turn communications on/off, run safe
            dry-run tests, and review changes. Nothing here sends live email on its
            own — the server-side <code>COMMUNICATION_HUB_EMAIL_LIVE</code> gate is
            still the final switch. Use the tabs below to jump straight to what you need.
          </AlertDescription>
        </Alert>

        {loading || !draft || !settings ? (
          <Card><CardContent className="p-8 text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto">
              <TabsTrigger value="overview" className="gap-1.5">
                <Activity className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings2 className="h-4 w-4" /> Settings
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-1.5">
                <Rocket className="h-4 w-4" /> Live readiness
              </TabsTrigger>
              <TabsTrigger value="pilots" className="gap-1.5">
                <FlaskConical className="h-4 w-4" /> Pilots &amp; tests
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5">
                <ScrollText className="h-4 w-4" /> Audit
              </TabsTrigger>
            </TabsList>

            {/* ---------------- OVERVIEW ---------------- */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Current safety status
                  </CardTitle>
                  <CardDescription>
                    A quick health check of the current operational state.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>Dispatch enabled: <Badge variant={settings.dispatch_enabled ? "default" : "secondary"}>{String(settings.dispatch_enabled)}</Badge></div>
                  <div>Dry-run only: <Badge variant={settings.dry_run_only ? "default" : "outline"}>{String(settings.dry_run_only)}</Badge></div>
                  <div>Email live (DB): <Badge variant={settings.email_live_enabled ? "destructive" : "secondary"}>{String(settings.email_live_enabled)}</Badge></div>
                  <div>Cron desired: <Badge variant={settings.cron_desired_enabled ? "default" : "secondary"}>{String(settings.cron_desired_enabled)}</Badge></div>
                  <div>Batch size: <Badge variant="outline">{settings.batch_size}</Badge></div>
                  <div>Allowlist mode: <Badge variant="outline">{settings.allowed_email_domains.length > 0 ? "domain + address" : "exact-address"}</Badge></div>
                  {settings.allowed_email_domains.length > 0 && (
                    <Alert className="md:col-span-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Domain allowlist active</AlertTitle>
                      <AlertDescription>
                        Domain allowlists broaden blast radius vs exact addresses. Keep empty during pilot.
                      </AlertDescription>
                    </Alert>
                  )}
                  {settings.email_live_enabled && (
                    <Alert className="md:col-span-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>DB email-live is enabled</AlertTitle>
                      <AlertDescription>
                        The server ENV gate still has final say. Verify env before assuming live.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <OperationalPanels settings={settings} />
            </TabsContent>

            {/* ---------------- SETTINGS ---------------- */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Global controls</CardTitle>
                  <CardDescription>Master switches, batching, and retry behavior.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <ToggleRow label="dispatch_enabled" hint="Master switch (desired state)."
                    value={draft.dispatch_enabled} onChange={v => set("dispatch_enabled", v)} highRisk />
                  <ToggleRow label="dry_run_only" hint="Dry-run only mode."
                    value={draft.dry_run_only} onChange={v => set("dry_run_only", v)} highRisk />
                  <ToggleRow label="cron_desired_enabled" hint="Records desired cron state; does NOT schedule."
                    value={draft.cron_desired_enabled} onChange={v => set("cron_desired_enabled", v)} highRisk />
                  <div className="space-y-1.5">
                    <Label>batch_size (1–50)</Label>
                    <Input type="number" min={1} max={50} value={draft.batch_size}
                      onChange={e => set("batch_size", Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>max_attempts</Label>
                    <Input type="number" min={1} max={20} value={draft.max_attempts}
                      onChange={e => set("max_attempts", Math.max(1, Math.min(20, Number(e.target.value) || 1)))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>retry_base_seconds</Label>
                    <Input type="number" min={1} value={draft.retry_base_seconds}
                      onChange={e => set("retry_base_seconds", Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>retry_max_seconds</Label>
                    <Input type="number" min={1} value={draft.retry_max_seconds}
                      onChange={e => set("retry_max_seconds", Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>live_eligible_max_age_minutes (1–1440)</Label>
                    <Input type="number" min={1} max={1440} value={draft.live_eligible_max_age_minutes}
                      onChange={e => set("live_eligible_max_age_minutes", Math.max(1, Math.min(1440, Number(e.target.value) || 30)))} />
                    <p className="text-[11px] text-muted-foreground">
                      Live messages older than this (from creation) are never claimed.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>live_eligible_after (read-only)</Label>
                    <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">
                      {settings.live_eligible_after
                        ? new Date(settings.live_eligible_after).toLocaleString()
                        : "never — set automatically when email_live_enabled turns on"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Channel controls</CardTitle>
                  <CardDescription>Enable/disable each delivery channel.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <ToggleRow label="email_live_enabled" hint="DB intent for live email. Turning on records live_eligible_after=now()." highRisk
                    value={draft.email_live_enabled} onChange={v => set("email_live_enabled", v)} />
                  <ToggleRow label="sms_live_enabled" hint="Not wired yet."
                    value={draft.sms_live_enabled} onChange={v => set("sms_live_enabled", v)} />
                  <ToggleRow label="whatsapp_live_enabled" hint="Not wired yet."
                    value={draft.whatsapp_live_enabled} onChange={v => set("whatsapp_live_enabled", v)} />
                  <ToggleRow label="print_enabled" hint="Not wired yet."
                    value={draft.print_enabled} onChange={v => set("print_enabled", v)} />
                  <ToggleRow label="letter_enabled" hint="Not wired yet."
                    value={draft.letter_enabled} onChange={v => set("letter_enabled", v)} />
                  {draft.email_live_enabled && !settings.email_live_enabled && (
                    <Alert className="md:col-span-2" variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>New live window will start on save</AlertTitle>
                      <AlertDescription>
                        Only messages created AFTER save and within live_eligible_max_age_minutes will be claimable.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recipient allowlist</CardTitle>
                  <CardDescription>Pilot: keep exact-address only (rohit@mishainfotech.com).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Allowed email addresses</Label>
                    <div className="flex flex-wrap gap-2">
                      {draft.allowed_email_addresses.map(v => (
                        <Badge key={v} variant="secondary" className="gap-1">
                          {v}
                          <button className="ml-1" onClick={() => removeEmail(v)} aria-label={`remove ${v}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {draft.allowed_email_addresses.length === 0 && (
                        <span className="text-xs text-muted-foreground">(empty)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="user@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                      <Button variant="outline" onClick={addEmail}><Plus className="h-4 w-4 mr-1" />Add</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Allowed email domains <span className="text-xs text-destructive">(high-risk)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {draft.allowed_email_domains.map(v => (
                        <Badge key={v} variant="destructive" className="gap-1">
                          {v}
                          <button className="ml-1" onClick={() => removeDomain(v)} aria-label={`remove ${v}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {draft.allowed_email_domains.length === 0 && (
                        <span className="text-xs text-muted-foreground">(empty — recommended)</span>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={domainConfirmed} onChange={e => setDomainConfirmed(e.target.checked)} />
                      I understand domain allowlists broaden blast radius (no leading '@', no wildcards).
                    </label>
                    <div className="flex gap-2">
                      <Input placeholder="example.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} disabled={!domainConfirmed} />
                      <Button variant="outline" onClick={addDomain} disabled={!domainConfirmed}><Plus className="h-4 w-4 mr-1" />Add</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sticky save bar */}
              <Card className="sticky bottom-4 shadow-lg border-primary/40">
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm">
                    {changedKeys.length === 0
                      ? <span className="text-muted-foreground">No pending changes.</span>
                      : <span>Pending: <code>{changedKeys.join(", ")}</code></span>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason / comment {requiresReason && <span className="text-destructive">*</span>}</Label>
                    <Textarea value={reason} onChange={e => setReason(e.target.value)}
                      placeholder={HIGH_RISK_HINT} rows={2} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setDraft(settings); setReason(""); }} disabled={changedKeys.length === 0}>
                      Discard
                    </Button>
                    <Button onClick={onSave} disabled={saving || changedKeys.length === 0 || (requiresReason && !reason.trim())}>
                      <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ---------------- LIVE READINESS ---------------- */}
            <TabsContent value="live" className="space-y-4">
              <DeliveryReadinessPanel />
              <TrackingPolicyPanel />
              <EventLiveControlPanel />
              <LiveWindowWizardPanel />
            </TabsContent>

            {/* ---------------- PILOTS & TESTS ---------------- */}
            <TabsContent value="pilots" className="space-y-4">
              <BusinessModuleReadinessMatrixPanel />
              <EventTemplateMappingPanel />
              <GenericEventPilotPanel />
              <AdminTestNoticePanel />
              <ManualDispatchTestPanel settings={settings} />
              <OperatorRehearsalWizardPanel />
            </TabsContent>

            {/* ---------------- AUDIT ---------------- */}
            <TabsContent value="audit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit timeline</CardTitle>
                  <CardDescription>Most recent 50 changes to control settings.</CardDescription>
                </CardHeader>
                <CardContent>
                  {audit.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No changes recorded yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                          <tr>
                            <th className="py-1 pr-3">When</th>
                            <th className="py-1 pr-3">Setting</th>
                            <th className="py-1 pr-3">Old</th>
                            <th className="py-1 pr-3">New</th>
                            <th className="py-1 pr-3">Reason</th>
                            <th className="py-1 pr-3">By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {audit.map(row => (
                            <tr key={row.id} className="border-t">
                              <td className="py-1.5 pr-3 whitespace-nowrap">{new Date(row.changed_at).toLocaleString()}</td>
                              <td className="py-1.5 pr-3 font-mono text-xs">{row.setting_key}</td>
                              <td className="py-1.5 pr-3 font-mono text-xs">{summarizeValue(row.old_value)}</td>
                              <td className="py-1.5 pr-3 font-mono text-xs">{summarizeValue(row.new_value)}</td>
                              <td className="py-1.5 pr-3 max-w-[24ch] truncate" title={row.reason ?? ""}>{row.reason ?? "—"}</td>
                              <td className="py-1.5 pr-3 font-mono text-xs">{row.changed_by ? row.changed_by.slice(0, 8) : <span className="italic text-muted-foreground">System</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PermissionWrapper>
  );
}

function ToggleRow(props: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  highRisk?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div>
        <div className="text-sm font-medium flex items-center gap-2">
          <code>{props.label}</code>
          {props.highRisk && <Badge variant="destructive" className="text-[10px]">high-risk</Badge>}
        </div>
        {props.hint && <div className="text-xs text-muted-foreground">{props.hint}</div>}
      </div>
      <Switch checked={props.value} onCheckedChange={props.onChange} />
    </div>
  );
}
