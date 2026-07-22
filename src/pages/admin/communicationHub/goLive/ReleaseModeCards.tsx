/**
 * CH-GL — Mode-driven Go Live entry point.
 *
 * Five cards + Emergency Stop. Operator selects a named mode; the server
 * applies the complete profile atomically via
 * `apply_communication_release_mode`. Individual technical switches
 * (dispatch_enabled, dry_run_only, email_live_enabled, scheduler,
 * automation, batch, bulk) are never surfaced here.
 */
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  applyReleaseMode,
  MODE_CARDS,
  requiresTypedConfirmation,
  type CommunicationOperatingMode,
} from "@/platform/communication-hub/releaseModeService";
import {
  fetchGlobalSettings,
  type CommunicationGlobalSettings,
} from "@/platform/communication-hub/globalSettingsService";

interface Props {
  onModeChanged?: (newMode: CommunicationOperatingMode) => void;
  /**
   * Per-mode advisory text from server-side stage readiness. Rendered as
   * an inline advisory inside the card. Never disables the card. Mode
   * selection is a platform action; event certification is enforced
   * separately by the send evaluator.
   */
  modeLockReason?: Partial<Record<CommunicationOperatingMode, string | null>>;
  /** Optional audit-only scope. Not required for mode selection. */
  moduleCode?: string | null;
  eventCode?: string | null;
  channel?: string | null;
}

const EMERGENCY_STOP_DEFAULT_REASON = "Emergency Stop activated from Go Live";

export default function ReleaseModeCards({
  onModeChanged,
  modeLockReason,
  moduleCode,
  eventCode,
  channel,
}: Props) {
  const [settings, setSettings] = useState<CommunicationGlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<CommunicationOperatingMode | null>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [applying, setApplying] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setSettings(await fetchGlobalSettings());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load hub settings");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); }, []);

  const currentMode = settings?.operatingMode ?? null;
  const isEmergency = currentMode === "EMERGENCY_STOP";

  function openMode(mode: CommunicationOperatingMode) {
    setReason(mode === "EMERGENCY_STOP" ? EMERGENCY_STOP_DEFAULT_REASON : "");
    setConfirmation("");
    setPending(mode);
  }

  async function handleApply() {
    if (!pending || !settings) return;
    const phrase = requiresTypedConfirmation(pending);
    if (phrase && confirmation.trim() !== phrase) {
      toast.error(`Please type: ${phrase}`);
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the change.");
      return;
    }
    setApplying(true);
    try {
      const res = await applyReleaseMode({
        newMode: pending,
        reason: reason.trim(),
        expectedVersion: settings.configurationVersion,
        // Server requires event scope only for Manual/Automated Production;
        // it ignores the fields for other transitions.
        moduleCode: moduleCode ?? null,
        eventCode: eventCode ?? null,
        channel: channel ?? null,
      });
      toast.success(`Mode set to ${res.new_mode}`);
      setPending(null);
      await refresh();
      onModeChanged?.(res.new_mode);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("configuration_version_conflict")) {
        toast.error("Settings were changed elsewhere. Refresh and try again.");
        await refresh();
      } else if (msg.includes("not_authorised")) {
        toast.error("You do not have permission to change the operating mode.");
      } else if (msg.includes("unknown_operating_mode")) {
        toast.error("The requested operating mode is not recognised.");
      } else if (msg.includes("settings_singleton_missing")) {
        toast.error("Communication Hub settings are missing. Contact platform admin.");
      } else if (msg.includes("mode_derived_field_direct_write")) {
        toast.error("This setting is managed by the operating mode.");
      } else if (msg.includes("authentication_required")) {
        toast.error("Your session has expired. Please sign in again.");
      } else if (/type|enum|invalid input/i.test(msg)) {
        toast.error("Operating mode could not be changed. No mode settings were changed.");
        console.error("[ReleaseModeCards] mode transition raw error:", msg);
      } else {
        toast.error(msg || "Failed to apply mode");
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Operating mode</h2>
          <p className="text-sm text-muted-foreground">
            Pick one named mode. The server applies the entire internal profile atomically.
            Individual technical switches are managed by the mode and not directly editable.
          </p>
        </div>
        {loading ? (
          <Badge variant="outline">Loading…</Badge>
        ) : (
          <Badge variant={isEmergency ? "destructive" : "default"} className="uppercase">
            Current: {currentMode ?? "unknown"}
          </Badge>
        )}
      </div>

      {isEmergency && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Emergency Stop is engaged</AlertTitle>
          <AlertDescription>
            New dispatch is blocked. Historical evidence is preserved. To resume,
            an authorised administrator must explicitly select another operating mode.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {MODE_CARDS.map((c) => {
          const isCurrent = currentMode === c.mode;
          const advisory = modeLockReason?.[c.mode] ?? null;
          const hasAdvisory = !isCurrent && !!advisory;
          const isAutoProd = c.mode === "AUTOMATED_PRODUCTION";
          const autoState = settings?.automationState ?? "STANDBY";
          return (
            <Card
              key={c.mode}
              className={isCurrent ? "border-primary" : ""}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{c.label}</span>
                  {isCurrent ? (
                    <Badge variant="secondary" className="text-[10px]">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {isAutoProd ? `Active — ${autoState}` : "Active"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      {isAutoProd ? "Available — will enter Standby" : "Available"}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">{c.headline}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
                {isAutoProd && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px]">
                    Selecting this mode does <strong>not</strong> start any scheduler,
                    automatic trigger, retry worker, batch or bulk processing.
                    Automation must be armed separately after switching.
                  </div>
                )}
                {hasAdvisory && (
                  <div className="rounded-md border border-dashed bg-muted/40 p-2 text-[11px]">
                    <span className="font-medium">Advisory: </span>{advisory}
                    <div className="mt-1 text-muted-foreground">
                      The mode can be selected. Individual events must still be certified before they can send.
                    </div>
                  </div>
                )}
                <Button
                  size="sm"
                  variant={c.danger ? "destructive" : (isCurrent ? "outline" : "default")}
                  disabled={isCurrent || loading || applying}
                  onClick={() => openMode(c.mode)}
                  className="w-full"
                >
                  {isCurrent
                    ? "Active"
                    : c.mode === "EMERGENCY_STOP"
                      ? "Engage Emergency Stop"
                      : `Switch to ${c.label}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Managed internally by operating mode</AlertTitle>
        <AlertDescription className="text-xs">
          Dispatcher, dry-run enforcement, live-email transport, scheduler, automatic
          triggers, retry worker, batch and bulk are set by the selected mode. They are
          not individually editable and cannot be changed through legacy screens.
        </AlertDescription>
      </Alert>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending === "EMERGENCY_STOP" ? "Engage Emergency Stop?" : "Confirm mode change"}
            </DialogTitle>
            <DialogDescription>
              {pending === "EMERGENCY_STOP" ? (
                <>
                  This immediately blocks <strong>all new dispatch</strong> across the
                  Communication Hub. Historical evidence is preserved. An authorised
                  administrator must select another mode later to resume.
                </>
              ) : (
                <>
                  You are about to switch the Communication Hub to{" "}
                  <strong>{pending ? MODE_CARDS.find((c) => c.mode === pending)?.label : ""}</strong>.
                  This applies the entire mode profile atomically and increments the
                  configuration version once.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Reason (recorded in audit)</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            {pending && requiresTypedConfirmation(pending) && (
              <div>
                <label className="text-xs font-medium">
                  Type <code>{requiresTypedConfirmation(pending)}</code> to confirm
                </label>
                <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)} disabled={applying}>Cancel</Button>
            <Button
              variant={pending && MODE_CARDS.find((c) => c.mode === pending)?.danger ? "destructive" : "default"}
              onClick={handleApply}
              disabled={applying}
            >
              {applying
                ? "Applying…"
                : pending === "EMERGENCY_STOP"
                  ? "Engage Emergency Stop"
                  : "Apply mode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
