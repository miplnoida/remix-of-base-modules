/**
 * Communication Hub — Email Tracking Policy panel (Phase 1C-B8-F).
 *
 * Purpose:
 *   Policy foundation ONLY. Reads/writes global tracking policy defaults on
 *   `communication_hub_control_settings` and shows a small operational
 *   summary of opened/clicked delivery events over the last 24h.
 *
 * Guarantees:
 *   - Does NOT enable account-level tracking at the provider.
 *   - Does NOT change dispatcher/transport behavior.
 *   - Does NOT enqueue, dispatch, or send anything.
 *   - Defaults are OFF; any change requires a reason and writes audit rows
 *     via `updateControlSettings` (already high-risk-keyed).
 *   - Sensitive modules (Benefits, Legal, Compliance, Medical, Financial,
 *     regulatory notices) MUST remain OFF regardless of global mode; only
 *     the internal COMM_HUB module is eligible for tracking today.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Eye, MousePointerClick, ShieldAlert, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchControlSettings,
  updateControlSettings,
  type CommHubControlSettings,
  type TrackingPolicyMode,
} from "./controlCenterService";

const MODES: { value: TrackingPolicyMode; label: string; hint: string }[] = [
  { value: "off_by_default", label: "Off by default", hint: "Transport never emits tracking flags unless a future explicit override is set." },
  { value: "provider_default", label: "Provider default", hint: "Rely on account/domain-level configuration at the email provider." },
  { value: "explicit_per_event", label: "Explicit per event", hint: "Only tracked when the specific event/template opts in." },
];

interface EventCounts {
  opened24h: number;
  clicked24h: number;
  lastOpenedAt: string | null;
  lastClickedAt: string | null;
}

export function TrackingPolicyPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CommHubControlSettings | null>(null);
  const [openDefault, setOpenDefault] = useState(false);
  const [clickDefault, setClickDefault] = useState(false);
  const [mode, setMode] = useState<TrackingPolicyMode>("off_by_default");
  const [reason, setReason] = useState("");
  const [counts, setCounts] = useState<EventCounts>({
    opened24h: 0, clicked24h: 0, lastOpenedAt: null, lastClickedAt: null,
  });

  async function loadCounts() {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    // We only need small counts; two lightweight queries are fine.
    const [openedRes, clickedRes] = await Promise.all([
      (supabase as any)
        .from("communication_hub_delivery_event")
        .select("event_at", { count: "exact" })
        .eq("event_type", "opened")
        .gte("event_at", since)
        .order("event_at", { ascending: false })
        .limit(1),
      (supabase as any)
        .from("communication_hub_delivery_event")
        .select("event_at", { count: "exact" })
        .eq("event_type", "clicked")
        .gte("event_at", since)
        .order("event_at", { ascending: false })
        .limit(1),
    ]);
    setCounts({
      opened24h: openedRes.count ?? 0,
      clicked24h: clickedRes.count ?? 0,
      lastOpenedAt: openedRes.data?.[0]?.event_at ?? null,
      lastClickedAt: clickedRes.data?.[0]?.event_at ?? null,
    });
  }

  async function reload() {
    setLoading(true);
    try {
      const s = await fetchControlSettings();
      setSettings(s);
      setOpenDefault(!!s.email_open_tracking_default);
      setClickDefault(!!s.email_click_tracking_default);
      setMode(s.tracking_policy_mode ?? "off_by_default");
      setReason("");
      await loadCounts().catch(() => { /* non-fatal */ });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load tracking policy");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const dirty = useMemo(() => {
    if (!settings) return false;
    return (
      openDefault !== settings.email_open_tracking_default ||
      clickDefault !== settings.email_click_tracking_default ||
      mode !== settings.tracking_policy_mode
    );
  }, [settings, openDefault, clickDefault, mode]);

  async function onSave() {
    if (!settings || !dirty) return;
    if (!reason.trim()) {
      toast.error("A reason is required for tracking policy changes.");
      return;
    }
    setSaving(true);
    try {
      await updateControlSettings({
        current: settings,
        patch: {
          email_open_tracking_default: openDefault,
          email_click_tracking_default: clickDefault,
          tracking_policy_mode: mode,
        },
        reason,
      });
      toast.success("Tracking policy updated.");
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Update failed");
    } finally {
      setSaving(false);
    }
  }

  const anyOn = openDefault || clickDefault || mode !== "off_by_default";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary" /> Email Tracking Policy
          <Badge variant="outline" className="ml-2">Phase 1C-B8-F</Badge>
        </CardTitle>
        <CardDescription>
          Global policy for open/click tracking on outbound email. Defaults are OFF. Transport does not
          emit per-send tracking flags in this phase — see NEEDS_REVIEW note below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Tracking is analytics, not proof of delivery</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            <div>• The Resend delivery webhook (<code>email.delivered</code>) is the operational proof — not opens.</div>
            <div>• Open/click tracking has privacy and consent implications; keep OFF for Benefits, Legal, Compliance, Medical, Financial, and regulatory notices.</div>
            <div>• Only the internal <code>COMM_HUB</code> module is currently eligible for tracking. Business modules remain OFF.</div>
          </AlertDescription>
        </Alert>

        {loading || !settings ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-3">
                <Label className="flex items-center justify-between text-sm">
                  <span>Open tracking default</span>
                  <Switch checked={openDefault} onCheckedChange={setOpenDefault} />
                </Label>
                <div className="text-xs text-muted-foreground mt-1">
                  Current: <Badge variant={settings.email_open_tracking_default ? "destructive" : "secondary"}>{String(settings.email_open_tracking_default)}</Badge>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <Label className="flex items-center justify-between text-sm">
                  <span>Click tracking default</span>
                  <Switch checked={clickDefault} onCheckedChange={setClickDefault} />
                </Label>
                <div className="text-xs text-muted-foreground mt-1">
                  Current: <Badge variant={settings.email_click_tracking_default ? "destructive" : "secondary"}>{String(settings.email_click_tracking_default)}</Badge>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <Label className="text-sm">Tracking policy mode</Label>
                <select
                  className="mt-1 w-full rounded border bg-background p-2 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as TrackingPolicyMode)}
                >
                  {MODES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground mt-1">
                  {MODES.find(m => m.value === mode)?.hint}
                </div>
              </div>
            </div>

            {anyOn && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Tracking is not fully wired</AlertTitle>
                <AlertDescription>
                  Turning on defaults records intent and audits the change, but the current transport
                  does not add per-send tracking flags to the Resend payload. See NEEDS_REVIEW below.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-medium flex items-center gap-2">
                <MousePointerClick className="h-4 w-4" /> Recent tracking events (last 24h)
              </div>
              <div className="grid gap-2 md:grid-cols-2 text-sm">
                <div>Opened: <Badge variant="outline">{counts.opened24h}</Badge> {counts.lastOpenedAt && <span className="text-xs text-muted-foreground ml-2">last {new Date(counts.lastOpenedAt).toLocaleString()}</span>}</div>
                <div>Clicked: <Badge variant="outline">{counts.clicked24h}</Badge> {counts.lastClickedAt && <span className="text-xs text-muted-foreground ml-2">last {new Date(counts.lastClickedAt).toLocaleString()}</span>}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                Webhook still maps <code>email.opened</code> and <code>email.clicked</code> into
                <code className="mx-1">communication_hub_delivery_event</code> and does not overwrite
                <code className="mx-1">delivery_status</code>. Most messages will show 0 until tracking is
                explicitly enabled per event.
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking-reason">Reason (required to save)</Label>
              <Textarea
                id="tracking-reason"
                placeholder="Why is the tracking policy changing? (audited)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
              <div className="flex justify-end">
                <Button onClick={onSave} disabled={!dirty || saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save tracking policy"}
                </Button>
              </div>
            </div>

            <Alert>
              <AlertTitle>NEEDS_REVIEW — Resend per-send tracking flags</AlertTitle>
              <AlertDescription className="text-sm">
                Resend historically controls open/click tracking at the account/domain level, not per
                send. Before wiring <code>transport-email.ts</code> to emit tracking flags, confirm the
                current Resend API supports per-request <code>tracking</code> options and that our
                account/domain settings match the desired posture. Until then the message-level
                snapshot columns (<code>open_tracking_enabled</code>, <code>click_tracking_enabled</code>,
                <code>tracking_policy_source</code>) remain <code>null</code> for new sends.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
