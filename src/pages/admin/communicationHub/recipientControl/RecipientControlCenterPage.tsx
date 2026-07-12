/**
 * EPIC CH-RECIPIENT-1 — Recipient Control Center.
 * Route: /admin/communication-hub/recipient-control
 *
 * Progressive recipient release governance:
 *  - View current recipient_release_mode
 *  - See the 7-stage progression (future stages locked)
 *  - Manage allowed individual emails (mode-appropriate)
 *  - Manage allowed domains (this epic: mishainfotech.com only)
 *  - See blocked / future domains
 *  - See volume protection (bulk/cron off)
 *  - See recent audit history
 *  - Change mode with reason + typed confirmation
 *
 * SAFETY: no email is sent, no request/message rows are created, no cron
 * or bulk toggles, no legacy queue writes. Mutations go through the shared
 * updateControlSettings service so the audit trail is unified.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck, Lock, ArrowLeft, RefreshCcw, Plus, X, AlertTriangle, Info, ArrowRight,
} from "lucide-react";
import {
  fetchRecipientSettings, applyRecipientModeChange, updateAllowlists,
  validateRecipientMode, getStage, RECIPIENT_MODE_STAGES,
  FUTURE_BLOCKED_DOMAINS_HINT,
  type RecipientReleaseMode, type RecipientReleaseSettings, type ValidatorResult,
} from "./recipientControlService";
import { fetchRecentAudit, type CommHubControlAuditRow } from "../controlCenter/controlCenterService";
import { EventRecipientScopeCard, LEGAL_INTERNAL_CASE_ASSIGNMENT_SCOPE } from "./EventRecipientScopeCard";

export default function RecipientControlCenterPage() {
  const [settings, setSettings] = useState<RecipientReleaseSettings | null>(null);
  const [validator, setValidator] = useState<ValidatorResult | null>(null);
  const [audit, setAudit] = useState<CommHubControlAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [manageReason, setManageReason] = useState("");

  const [modeDialog, setModeDialog] = useState<{
    nextMode: RecipientReleaseMode;
  } | null>(null);
  const [modeReason, setModeReason] = useState("");
  const [modeTyped, setModeTyped] = useState("");

  async function load() {
    setLoading(true);
    try {
      const s = await fetchRecipientSettings();
      setSettings(s);
      const v = await validateRecipientMode({
        mode: s.recipient_release_mode,
        addresses: s.allowed_email_addresses,
        domains: s.allowed_email_domains,
      });
      setValidator(v);
      const a = await fetchRecentAudit(30);
      // Filter to only recipient-related audit rows for signal-to-noise.
      setAudit(a.filter(r =>
        r.setting_key === "recipient_release_mode"
        || r.setting_key === "allowed_email_addresses"
        || r.setting_key === "allowed_email_domains"
      ));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load Recipient Control Center");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  const currentStage = settings ? getStage(settings.recipient_release_mode) : null;

  async function addEmail() {
    if (!settings) return;
    const v = newEmail.trim().toLowerCase();
    if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Enter a valid email address."); return;
    }
    if (settings.allowed_email_addresses.includes(v)) { toast.error("Already listed."); return; }
    if (!manageReason.trim()) { toast.error("Enter a reason (audited) before changing the allowlist."); return; }
    setSaving(true);
    try {
      await updateAllowlists({
        current: settings,
        nextAddresses: [...settings.allowed_email_addresses, v],
        reason: manageReason,
      });
      toast.success(`Added ${v}`);
      setNewEmail("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add email");
    } finally { setSaving(false); }
  }

  async function removeEmail(v: string) {
    if (!settings) return;
    if (!manageReason.trim()) { toast.error("Enter a reason (audited) before changing the allowlist."); return; }
    setSaving(true);
    try {
      await updateAllowlists({
        current: settings,
        nextAddresses: settings.allowed_email_addresses.filter(x => x !== v),
        reason: manageReason,
      });
      toast.success(`Removed ${v}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove email");
    } finally { setSaving(false); }
  }

  async function addDomain() {
    if (!settings) return;
    const v = newDomain.trim().toLowerCase();
    if (v !== "mishainfotech.com") {
      toast.error("Only mishainfotech.com may be allowlisted in this epic.");
      return;
    }
    if (settings.allowed_email_domains.includes(v)) { toast.error("Already listed."); return; }
    if (!manageReason.trim()) { toast.error("Enter a reason (audited) before changing the allowlist."); return; }
    setSaving(true);
    try {
      await updateAllowlists({
        current: settings,
        nextDomains: [...settings.allowed_email_domains, v],
        reason: manageReason,
      });
      toast.success(`Added domain ${v}`);
      setNewDomain("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to add domain");
    } finally { setSaving(false); }
  }

  async function removeDomain(v: string) {
    if (!settings) return;
    if (!manageReason.trim()) { toast.error("Enter a reason (audited) before changing the allowlist."); return; }
    setSaving(true);
    try {
      await updateAllowlists({
        current: settings,
        nextDomains: settings.allowed_email_domains.filter(x => x !== v),
        reason: manageReason,
      });
      toast.success(`Removed domain ${v}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove domain");
    } finally { setSaving(false); }
  }

  async function submitModeChange() {
    if (!settings || !modeDialog) return;
    const stage = getStage(modeDialog.nextMode);
    if (!stage.typedConfirmation) return;
    setSaving(true);
    try {
      await applyRecipientModeChange({
        current: settings,
        nextMode: modeDialog.nextMode,
        reason: modeReason,
        typedConfirmation: modeTyped,
      });
      toast.success(`Recipient mode set to ${stage.label}`);
      setModeDialog(null); setModeReason(""); setModeTyped("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to change mode");
    } finally { setSaving(false); }
  }

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Recipient Control Center"
          subtitle="Communication Hub — progressive recipient release governance"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: "Recipient Control" },
          ]}
          actions={
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/communication-hub/safety"><ArrowLeft className="h-4 w-4 mr-1" /> Safety Switchboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={load} disabled={loading || saving}>
                <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
              </Button>
            </div>
          }
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>What this screen controls</AlertTitle>
          <AlertDescription className="text-sm">
            Recipient release mode is the single governance switch that determines who the
            Communication Hub may target for live email. Nothing on this screen sends email,
            enables cron, enables bulk sending, or allows external recipients in this epic.
          </AlertDescription>
        </Alert>

        {loading || !settings || !currentStage ? (
          <Card><CardContent className="p-8 text-sm text-muted-foreground">Loading…</CardContent></Card>
        ) : (
          <>
            {/* 1. Current Mode Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Current mode
                </CardTitle>
                <CardDescription>{currentStage.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div>Mode: <Badge>{currentStage.label}</Badge></div>
                <div>Validator: {validator?.ok
                  ? <Badge variant="secondary">ok</Badge>
                  : <Badge variant="destructive">blocked</Badge>}
                </div>
                {validator && validator.blockers.length > 0 && (
                  <Alert variant="destructive" className="md:col-span-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Current configuration is not valid for this mode</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-5 text-xs">
                        {validator.blockers.map((b, i) => (
                          <li key={i}><code>{b.code}</code>: {b.message}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* 2. Mode Progression */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mode progression</CardTitle>
                <CardDescription>Move stepwise. Future stages are locked in this epic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {RECIPIENT_MODE_STAGES.map(stage => {
                  const isCurrent = stage.mode === settings.recipient_release_mode;
                  return (
                    <div key={stage.mode}
                      className={`flex items-start justify-between gap-3 border rounded-md p-3 ${isCurrent ? "border-primary bg-primary/5" : ""}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">#{stage.order}</span>
                          <span className="font-medium text-sm">{stage.label}</span>
                          {isCurrent && <Badge variant="default">current</Badge>}
                          {stage.locked && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> future — locked</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                      </div>
                      <div>
                        {stage.locked ? (
                          <Button size="sm" variant="outline" disabled title="Future phase not enabled">
                            <Lock className="h-3.5 w-3.5 mr-1" /> Locked
                          </Button>
                        ) : isCurrent ? (
                          <Button size="sm" variant="secondary" disabled>Active</Button>
                        ) : (
                          <Button size="sm" onClick={() => {
                            setModeDialog({ nextMode: stage.mode });
                            setModeReason(""); setModeTyped("");
                          }}>
                            Set as active
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Manage allowlist reason (shared) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reason for allowlist changes (audited)</CardTitle>
                <CardDescription>Required before adding or removing emails/domains below.</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={2}
                  value={manageReason}
                  onChange={e => setManageReason(e.target.value)}
                  placeholder="e.g. Add QA operator john@mishainfotech.com for internal_named_users pilot (ticket OPS-4200)"
                />
              </CardContent>
            </Card>

            {/* 3. Allowed Individual Emails */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Allowed individual emails</CardTitle>
                <CardDescription>Individual addresses the Hub may deliver live email to.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {settings.allowed_email_addresses.length === 0 && (
                    <span className="text-sm text-muted-foreground">No addresses configured.</span>
                  )}
                  {settings.allowed_email_addresses.map(a => (
                    <Badge key={a} variant="secondary" className="gap-2">
                      {a}
                      <button className="hover:text-destructive"
                        title="Remove" aria-label={`Remove ${a}`}
                        onClick={() => removeEmail(a)} disabled={saving}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="name@mishainfotech.com" />
                  <Button onClick={addEmail} disabled={saving}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rules by mode: <code>single_recipient_pilot</code> allows only <code>rohit@mishainfotech.com</code>;
                  <code> internal_named_users</code> / <code>internal_domain_pilot</code> allow @mishainfotech.com addresses.
                </p>
              </CardContent>
            </Card>

            {/* 4. Allowed Domains */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Allowed domains</CardTitle>
                <CardDescription>Only <code>mishainfotech.com</code> is permitted in this epic.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {settings.allowed_email_domains.length === 0 && (
                    <span className="text-sm text-muted-foreground">No domains configured.</span>
                  )}
                  {settings.allowed_email_domains.map(d => (
                    <Badge key={d} variant="secondary" className="gap-2">
                      {d}
                      <button className="hover:text-destructive"
                        title="Remove" aria-label={`Remove ${d}`}
                        onClick={() => removeDomain(d)} disabled={saving}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="mishainfotech.com" />
                  <Button onClick={addDomain} disabled={saving}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 5. Blocked / Future domains */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Blocked / future domains</CardTitle>
                <CardDescription>External domains cannot be allowlisted in this epic.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {FUTURE_BLOCKED_DOMAINS_HINT.map(d => (
                  <Badge key={d} variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" /> {d}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            {/* 6. Volume protection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Volume protection</CardTitle>
                <CardDescription>Batch / bulk / cron are OFF in this epic.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                <div>Max recipients per send: <Badge variant="outline">1 (per-event cap)</Badge></div>
                <div>Bulk send: <Badge variant="secondary">OFF</Badge></div>
                <div>Cron dispatch: <Badge variant={settings.cron_desired_enabled ? "destructive" : "secondary"}>{settings.cron_desired_enabled ? "ON" : "OFF"}</Badge></div>
                <div>Global batch size: <Badge variant="outline">{settings.batch_size}</Badge></div>
                <p className="md:col-span-2 text-xs text-muted-foreground">
                  Per-event caps live on <Link className="underline" to="/admin/communication-hub/governance/send-policies">Send Policies</Link>.
                  Toggle cron/bulk from the <Link className="underline" to="/admin/communication-hub/safety">Safety Switchboard</Link>.
                </p>
              </CardContent>
            </Card>

            {/* Event-level scope for the pilot event */}
            <EventRecipientScopeCard scope={LEGAL_INTERNAL_CASE_ASSIGNMENT_SCOPE} />

            {/* 7. Audit history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent recipient-related audit</CardTitle>
                <CardDescription>Last 30 recipient-mode and allowlist changes.</CardDescription>
              </CardHeader>
              <CardContent>
                {audit.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No recipient-related audit entries yet.</div>
                ) : (
                  <div className="space-y-2">
                    {audit.map(row => (
                      <div key={row.id} className="border rounded-md p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <code>{row.setting_key}</code>
                          <span className="text-muted-foreground">{new Date(row.changed_at).toLocaleString()}</span>
                        </div>
                        {row.reason && <div className="mt-1 text-muted-foreground">{row.reason}</div>}
                        <div className="mt-1 flex items-center gap-2 font-mono">
                          <span className="text-muted-foreground">{JSON.stringify(row.old_value)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{JSON.stringify(row.new_value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Mode change dialog */}
        <Dialog open={!!modeDialog} onOpenChange={(o) => !o && setModeDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Change recipient mode →{" "}
                {modeDialog ? getStage(modeDialog.nextMode).label : ""}
              </DialogTitle>
              <DialogDescription>
                {modeDialog ? getStage(modeDialog.nextMode).description : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm">Read this before continuing</AlertTitle>
                <AlertDescription className="text-xs">
                  Changing the recipient mode changes the set of email recipients the Hub may
                  target for future live sends. Make sure the current allowlist satisfies the
                  new mode's validator (see rules on the previous screen). No email will be
                  sent by this action.
                </AlertDescription>
              </Alert>
              <div>
                <Label>Reason (audited)</Label>
                <Textarea rows={2} value={modeReason} onChange={e => setModeReason(e.target.value)}
                  placeholder="Why is this change happening now?" />
              </div>
              {modeDialog && getStage(modeDialog.nextMode).typedConfirmation && (
                <div>
                  <Label>Type the exact phrase to confirm:</Label>
                  <div className="text-xs text-muted-foreground mb-1">
                    <code>{getStage(modeDialog.nextMode).typedConfirmation}</code>
                  </div>
                  <Input value={modeTyped} onChange={e => setModeTyped(e.target.value)}
                    className={modeTyped && modeTyped !== getStage(modeDialog.nextMode).typedConfirmation
                      ? "border-destructive" : ""} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModeDialog(null)} disabled={saving}>Cancel</Button>
              <Button onClick={submitModeChange} disabled={saving}>Apply mode change</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionWrapper>
  );
}
