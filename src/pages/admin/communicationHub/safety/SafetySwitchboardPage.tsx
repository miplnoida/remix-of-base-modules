/**
 * EPIC CH-SAFE-1 — Communication Safety Switchboard.
 * Route: /admin/communication-hub/safety
 *
 * Human-friendly view over global safety gates. Reads live from
 * communication_hub_control_settings and communication_hub_gate_catalog.
 * All mutations flow through the existing controlCenterService (which
 * writes to communication_hub_control_audit) so we do NOT create a
 * parallel audit trail. Never sends email; never touches request/message
 * tables; never enables cron/bulk on its own.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, AlertTriangle, Zap, Info, ArrowRight, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
  fetchControlSettings, fetchGateCatalog, fetchLiveQueueSnapshot,
  computePresetChanges, applyGateChange, confirmationPhraseFor, isDangerousChange,
  type GateCatalogRow, type SystemModePreset,
} from "./safetyService";
import type { CommHubControlSettings } from "../controlCenter/controlCenterService";
import { allBlockerExplanations } from "./plainLanguageBlockers";

const PRESETS: { value: SystemModePreset; label: string }[] = [
  { value: "safe_mode", label: "Safe Mode / Dry Run Only" },
  { value: "internal_live_testing", label: "Internal Live Testing" },
  { value: "production_internal_live", label: "Production Internal Live" },
  { value: "external_live_controlled", label: "External Live Controlled" },
  { value: "emergency_stop", label: "Emergency Stop" },
];

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    critical: "bg-destructive text-destructive-foreground",
    high: "bg-warning text-warning-foreground",
    medium: "bg-info text-info-foreground",
    low: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[sev] ?? map.low}>{sev.toUpperCase()}</Badge>;
}

export default function SafetySwitchboardPage() {
  const [settings, setSettings] = useState<CommHubControlSettings | null>(null);
  const [gates, setGates] = useState<GateCatalogRow[]>([]);
  const [queue, setQueue] = useState<{ live_queued: number; failed: number }>({ live_queued: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [preset, setPreset] = useState<SystemModePreset | "">("");
  const [confirmDialog, setConfirmDialog] = useState<null | {
    title: string;
    description: string;
    changes: Array<{ key: string; from: unknown; to: unknown; dangerous: boolean }>;
    patch: Partial<CommHubControlSettings>;
    expectedConfirmation: string | null;
  }>(null);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [newDomain, setNewDomain] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [s, g, q] = await Promise.all([
        fetchControlSettings(),
        fetchGateCatalog(),
        fetchLiveQueueSnapshot(),
      ]);
      setSettings(s);
      setGates(g);
      setQueue(q);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load safety switchboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const presetComputed = useMemo(() => {
    if (!preset || !settings) return null;
    return computePresetChanges(preset as SystemModePreset, settings);
  }, [preset, settings]);

  function openConfirm(patch: Partial<CommHubControlSettings>, opts?: { title?: string; requireTyped?: boolean; phrase?: string }) {
    if (!settings) return;
    const changes = (Object.keys(patch) as Array<keyof CommHubControlSettings>).flatMap((k) => {
      const from = (settings as any)[k];
      const to = (patch as any)[k];
      if (JSON.stringify(from) === JSON.stringify(to)) return [];
      return [{ key: String(k), from, to, dangerous: isDangerousChange(String(k), from, to) }];
    });
    if (changes.length === 0) {
      toast.info("No changes to apply.");
      return;
    }
    const dangerous = changes.some((c) => c.dangerous);
    const expected = opts?.requireTyped ?? dangerous ? (opts?.phrase ?? "CONFIRM CHANGE") : null;
    setTypedConfirmation("");
    setConfirmDialog({
      title: opts?.title ?? "Apply safety change",
      description: dangerous
        ? "This change EXPANDS the send blast radius. It requires typed confirmation."
        : "Review the changes below and confirm.",
      changes,
      patch,
      expectedConfirmation: expected,
    });
  }

  async function confirmApply() {
    if (!settings || !confirmDialog) return;
    if (!reason.trim()) { toast.error("Please provide a reason."); return; }
    setSaving(true);
    try {
      const next = await applyGateChange({
        current: settings,
        patch: confirmDialog.patch,
        reason,
        typedConfirmation,
        expectedConfirmation: confirmDialog.expectedConfirmation,
      });
      setSettings(next);
      setConfirmDialog(null);
      setTypedConfirmation("");
      setReason("");
      setPreset("");
      toast.success("Safety change applied.");
      void load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to apply change");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="p-6">
        <PageHeader
          title="Communication Safety Switchboard"
          subtitle="Loading safety state..."
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: "Safety Switchboard" },
          ]}
        />
      </div>
    );
  }

  const systemModeSummary = (() => {
    if (!settings.dispatch_enabled) return { label: "Emergency Stop", tone: "destructive" as const };
    if (settings.dry_run_only) return { label: "Safe Mode (Dry Run Only)", tone: "warning" as const };
    if (settings.email_live_enabled && settings.cron_desired_enabled) return { label: "Production Live (Scheduled)", tone: "success" as const };
    if (settings.email_live_enabled) return { label: "Live (Manual)", tone: "info" as const };
    return { label: "Live email OFF", tone: "warning" as const };
  })();

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Communication Safety Switchboard"
        subtitle="Plain-language view of every safety gate. Risk-aware confirmation on every change."
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Communication Hub", href: "/admin/communication-hub" },
          { label: "Safety Switchboard" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCcw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/communication-hub/control-center">Control Center</Link>
            </Button>
            <Button variant="default" size="sm" asChild>
              <Link to="/admin/communication-hub/recipient-control">Open Recipient Control Center</Link>
            </Button>
          </div>
        }
      />

      {/* Recipient release mode summary (EPIC CH-RECIPIENT-1) */}
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>
          Recipient release mode:{" "}
          <Badge className="ml-1">{(settings as any).recipient_release_mode ?? "single_recipient_pilot"}</Badge>
        </AlertTitle>
        <AlertDescription className="text-xs space-y-1 mt-1">
          <div>Allowed emails: <strong>{settings.allowed_email_addresses.length}</strong> ({settings.allowed_email_addresses.join(", ") || "none"})</div>
          <div>Allowed domains: <strong>{settings.allowed_email_domains.length}</strong> ({settings.allowed_email_domains.join(", ") || "none"})</div>
          <div>External domains: <Badge variant="secondary">blocked in this phase</Badge></div>
          <div>Bulk: <Badge variant="secondary">OFF</Badge> · Cron: <Badge variant={settings.cron_desired_enabled ? "destructive" : "secondary"}>{settings.cron_desired_enabled ? "ON" : "OFF"}</Badge></div>
          <div><Link to="/admin/communication-hub/recipient-control" className="underline">Manage recipient release mode →</Link></div>
        </AlertDescription>
      </Alert>

      {/* Current mode banner */}
      <Alert variant={systemModeSummary.tone === "destructive" ? "destructive" : "default"}>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Current system mode: {systemModeSummary.label}</AlertTitle>
        <AlertDescription>
          Live queue: <strong>{queue.live_queued}</strong> · Failed: <strong>{queue.failed}</strong>.
          Change global safety here; per-event policy lives on{" "}
          <Link to="/admin/communication-hub/governance/send-policies" className="underline">Send Policies</Link>.
        </AlertDescription>
      </Alert>

      {/* Shared reason */}
      <Card>
        <CardHeader>
          <CardTitle>Reason for this session's changes</CardTitle>
          <CardDescription>Required for every safety change and written to the audit trail.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is the safety state changing? (audited)"
            rows={2}
          />
        </CardContent>
      </Card>

      {/* System mode preset */}
      <Card>
        <CardHeader>
          <CardTitle>1. System Mode</CardTitle>
          <CardDescription>Pick a preset — we preview every change before applying.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[280px]">
              <Label>Preset</Label>
              <Select value={preset} onValueChange={(v) => setPreset(v as SystemModePreset)}>
                <SelectTrigger><SelectValue placeholder="Choose a preset..." /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={!presetComputed || presetComputed.changes.length === 0}
              onClick={() => presetComputed && openConfirm(presetComputed.patch, {
                title: `Apply preset: ${presetComputed.label}`,
                requireTyped: presetComputed.requiresTypedConfirmation,
                phrase: presetComputed.confirmationPhrase ?? undefined,
              })}
            >
              Preview &amp; Apply
            </Button>
          </div>
          {presetComputed && (
            <div className="rounded-md border p-3 bg-muted/40 space-y-2">
              <div className="text-sm font-medium">{presetComputed.label}</div>
              <div className="text-sm text-muted-foreground">{presetComputed.description}</div>
              {presetComputed.changes.length === 0 ? (
                <div className="text-sm text-success">System already matches this preset.</div>
              ) : (
                <ul className="text-sm space-y-1">
                  {presetComputed.changes.map((c) => (
                    <li key={c.key} className="flex items-center gap-2">
                      {c.dangerous ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      <code className="text-xs">{c.key}</code>: <span className="text-muted-foreground">{String(c.from)}</span> <ArrowRight className="h-3 w-3" /> <span className="font-medium">{String(c.to)}</span>
                      {c.dangerous && <Badge variant="destructive" className="ml-2">Typed confirmation</Badge>}
                    </li>
                  ))}
                </ul>
              )}
              {presetComputed.requiresTypedConfirmation && (
                <div className="text-xs text-muted-foreground">
                  Confirmation phrase: <code>{presetComputed.confirmationPhrase}</code>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider live controls */}
      <Card>
        <CardHeader>
          <CardTitle>2. Provider Live Controls</CardTitle>
          <CardDescription>Master switches for dispatcher, dry-run, and live email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Dispatcher enabled"
            hint="Master switch. When off, nothing is processed by the Hub."
            checked={settings.dispatch_enabled}
            onChange={(v) => openConfirm({ dispatch_enabled: v }, { title: v ? "Enable dispatcher" : "Disable dispatcher" })}
          />
          <ToggleRow
            label="Dry Run Only"
            hint="When on, every send is simulated. Turning OFF requires typed confirmation."
            checked={settings.dry_run_only}
            onChange={(v) => openConfirm({ dry_run_only: v }, {
              title: v ? "Turn Dry Run Only ON" : "Turn Dry Run Only OFF",
              requireTyped: !v, phrase: "TURN OFF DRY RUN",
            })}
          />
          <ToggleRow
            label="Live email enabled"
            hint="Real email delivery via the provider. Turning ON requires typed confirmation."
            checked={settings.email_live_enabled}
            onChange={(v) => openConfirm({ email_live_enabled: v }, {
              title: v ? "Enable live email" : "Disable live email",
              requireTyped: v, phrase: "ENABLE LIVE EMAIL",
            })}
          />
        </CardContent>
      </Card>

      {/* Recipient allowlist */}
      <Card>
        <CardHeader>
          <CardTitle>3. Recipient Allowlist</CardTitle>
          <CardDescription>Approved domains for live delivery. Adding a domain requires typed confirmation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(settings.allowed_email_domains ?? []).length === 0 && (
              <span className="text-sm text-muted-foreground">No domains allowlisted.</span>
            )}
            {(settings.allowed_email_domains ?? []).map((d) => (
              <Badge key={d} variant="secondary" className="gap-2">
                {d}
                <button
                  className="text-xs underline"
                  onClick={() => openConfirm({
                    allowed_email_domains: (settings.allowed_email_domains ?? []).filter((x) => x !== d),
                  }, { title: `Remove domain ${d}` })}
                >
                  remove
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
            />
            <Button
              onClick={() => {
                const v = newDomain.trim().toLowerCase();
                if (!v) return;
                const list = Array.from(new Set([...(settings.allowed_email_domains ?? []), v]));
                openConfirm({ allowed_email_domains: list }, {
                  title: `Add domain ${v}`,
                  requireTyped: true, phrase: `ADD DOMAIN ${v.toUpperCase()}`,
                });
                setNewDomain("");
              }}
            >
              Add domain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduler */}
      <Card>
        <CardHeader>
          <CardTitle>4. Scheduler / Cron</CardTitle>
          <CardDescription>Controls whether the scheduled dispatcher auto-drains the queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleRow
            label="Scheduler enabled"
            hint="Enabling requires typed confirmation."
            checked={settings.cron_desired_enabled}
            onChange={(v) => openConfirm({ cron_desired_enabled: v }, {
              title: v ? "Enable scheduler" : "Disable scheduler",
              requireTyped: v, phrase: "ENABLE SCHEDULER",
            })}
          />
        </CardContent>
      </Card>

      {/* Bulk protection (informational — cap fields live in policy layer) */}
      <Card>
        <CardHeader>
          <CardTitle>5. Bulk Protection</CardTitle>
          <CardDescription>Bulk sending is disabled globally by default. Per-event caps live on Send Policies.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>Global batch size: <strong>{settings.batch_size}</strong></div>
          <div>Increasing batch size &gt; 50 requires an approved change control ticket.</div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/communication-hub/governance/send-policies">Open Send Policies <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>

      {/* Live queue */}
      <Card>
        <CardHeader>
          <CardTitle>6. Live Queue</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6 text-sm">
          <div>Queued (live): <strong>{queue.live_queued}</strong></div>
          <div>Failed: <strong>{queue.failed}</strong></div>
          <Link to="/admin/communication-hub/delivery-monitor" className="underline">Open Delivery Monitor</Link>
          <Link to="/admin/communication-hub/retry-queue" className="underline">Open Retry Queue</Link>
        </CardContent>
      </Card>

      {/* Emergency stop */}
      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Zap className="h-5 w-5" /> Emergency Stop
          </CardTitle>
          <CardDescription>Turns off dispatcher, live email, and scheduler in one click.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            disabled={!settings.dispatch_enabled && !settings.email_live_enabled && !settings.cron_desired_enabled}
            onClick={() => openConfirm(
              { dispatch_enabled: false, email_live_enabled: false, cron_desired_enabled: false, dry_run_only: true },
              { title: "Engage Emergency Stop" },
            )}
          >
            Engage Emergency Stop
          </Button>
        </CardContent>
      </Card>

      {/* Gate catalogue */}
      <Card>
        <CardHeader>
          <CardTitle>Gate Catalogue</CardTitle>
          <CardDescription>All safety gates in the Hub, in plain language.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {gates.map((g) => (
              <div key={g.id} className="rounded-md border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{g.gate_name}</div>
                  {severityBadge(g.severity)}
                </div>
                <div className="text-xs text-muted-foreground uppercase">{g.category}</div>
                <p className="text-sm">{g.plain_language_description}</p>
                {g.recommended_fix && <p className="text-xs text-muted-foreground">Fix: {g.recommended_fix}</p>}
                {g.fixing_screen_url && (
                  <Link to={g.fixing_screen_url} className="text-xs underline">Open fix screen</Link>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plain-language blocker dictionary */}
      <Card>
        <CardHeader>
          <CardTitle>Plain-language blocker messages</CardTitle>
          <CardDescription>What we show admins/operators when a send is blocked.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {allBlockerExplanations().map((b) => (
            <div key={b.code} className="text-sm border rounded-md p-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <code className="text-xs">{b.code}</code>
                {severityBadge(b.severity)}
              </div>
              <div className="font-medium mt-1">{b.headline}</div>
              <div className="text-muted-foreground">{b.message}</div>
              <div className="text-xs mt-1">{b.fixHint}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDialog} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog?.title}</DialogTitle>
            <DialogDescription>{confirmDialog?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ul className="text-sm space-y-1">
              {confirmDialog?.changes.map((c) => (
                <li key={c.key} className="flex items-center gap-2">
                  {c.dangerous ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                  <code className="text-xs">{c.key}</code>
                  <span className="text-muted-foreground">{JSON.stringify(c.from)}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-medium">{JSON.stringify(c.to)}</span>
                </li>
              ))}
            </ul>
            <div>
              <Label>Reason (audited)</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            {confirmDialog?.expectedConfirmation && (
              <div>
                <Label>Type the exact phrase to confirm:</Label>
                <div className="text-xs text-muted-foreground mb-1"><code>{confirmDialog.expectedConfirmation}</code></div>
                <Input value={typedConfirmation} onChange={(e) => setTypedConfirmation(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={saving}>Cancel</Button>
            <Button onClick={confirmApply} disabled={saving}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border rounded-md p-3">
      <div>
        <div className="font-medium text-sm">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
