/**
 * Phase 4A — Automation activation panel.
 *
 * Shown when the platform is in AUTOMATED_PRODUCTION. Mode selection alone
 * NEVER starts automation. Arming is a separate, server-authorised action
 * that fails closed until Phase 4B provides lifecycle certification evidence.
 */
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, Zap, ZapOff } from "lucide-react";
import { toast } from "sonner";
import type { CommunicationGlobalSettings } from "@/platform/communication-hub/globalSettingsService";
import {
  armAutomation,
  disarmAutomation,
  ARM_CONFIRMATION_PHRASE,
  mapAutomationError,
} from "@/platform/communication-hub/automationService";

interface Props {
  settings: CommunicationGlobalSettings;
  onChanged?: () => void;
}

export default function AutomationStandbyPanel({ settings, onChanged }: Props) {
  const [armOpen, setArmOpen] = useState(false);
  const [disarmOpen, setDisarmOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);

  if (settings.operatingMode !== "AUTOMATED_PRODUCTION") return null;

  const state = settings.automationState;
  const stateBadge =
    state === "ARMED" ? "destructive" :
    state === "SUSPENDED" ? "secondary" : "outline";

  async function handleArm() {
    if (!reason.trim()) return toast.error("A reason is required.");
    if (confirmation.trim() !== ARM_CONFIRMATION_PHRASE) {
      return toast.error(`Please type: ${ARM_CONFIRMATION_PHRASE}`);
    }
    setWorking(true);
    try {
      await armAutomation({
        reason: reason.trim(),
        confirmation: confirmation.trim(),
        expectedVersion: settings.configurationVersion,
      });
      toast.success("Automation armed.");
      setArmOpen(false);
      setReason("");
      setConfirmation("");
      onChanged?.();
    } catch (e: any) {
      const raw = String(e?.message ?? "");
      toast.error(mapAutomationError(raw));
      console.error("[AutomationStandbyPanel] arm failed:", raw);
    } finally {
      setWorking(false);
    }
  }

  async function handleDisarm(suspend: boolean) {
    if (!reason.trim()) return toast.error("A reason is required.");
    setWorking(true);
    try {
      await disarmAutomation({ reason: reason.trim(), suspend });
      toast.success(suspend ? "Automation suspended." : "Automation disarmed.");
      setDisarmOpen(false);
      setReason("");
      onChanged?.();
    } catch (e: any) {
      const raw = String(e?.message ?? "");
      toast.error(mapAutomationError(raw));
      console.error("[AutomationStandbyPanel] disarm failed:", raw);
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600" />
            Automation activation
          </span>
          <Badge variant={stateBadge as any} className="uppercase">{state}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Automated Production is <strong>active</strong>. The scheduler, automatic
          triggers, retry worker, batch and bulk remain <strong>off</strong> until
          automation is separately armed. Arming requires an authorised administrator,
          a reason, and a typed confirmation.
        </p>

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <div>Scheduler: <strong>{settings.schedulerEnabled ? "ON" : "OFF"}</strong></div>
          <div>Automatic triggers: <strong>{settings.automaticTriggersEnabled ? "ON" : "OFF"}</strong></div>
          <div>Retry worker: <strong>{settings.retryWorkerEnabled ? "ON" : "OFF"}</strong></div>
          <div>Batch: <strong>{settings.batchEnabled ? "ON" : "OFF"}</strong></div>
          <div>Bulk: <strong>{settings.bulkEnabled ? "ON" : "OFF"}</strong></div>
        </div>

        {state === "ARMED" && settings.automationArmedAt && (
          <div className="text-[11px] text-muted-foreground">
            Armed at {new Date(settings.automationArmedAt).toLocaleString()}
            {settings.automationArmReason ? ` — ${settings.automationArmReason}` : ""}
          </div>
        )}
        {state === "SUSPENDED" && settings.automationSuspendedAt && (
          <div className="text-[11px] text-muted-foreground">
            Suspended at {new Date(settings.automationSuspendedAt).toLocaleString()}
            {settings.automationSuspensionReason ? ` — ${settings.automationSuspensionReason}` : ""}
          </div>
        )}

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Server-verified readiness</AlertTitle>
          <AlertDescription className="text-xs">
            Arming requires at least one eligible automated event, active
            template mapping, certified template version, sender readiness and
            valid provider — verified server-side. Where evidence is not yet
            available, the arm operation fails closed. No enablement is
            simulated in the browser.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          {state !== "ARMED" ? (
            <Button size="sm" onClick={() => setArmOpen(true)} disabled={working}>
              Arm Automation
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setDisarmOpen(true)} disabled={working}>
              <ZapOff className="mr-1 h-3 w-3" /> Disarm Automation
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={armOpen} onOpenChange={(o) => !o && setArmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arm Automation</DialogTitle>
            <DialogDescription>
              This turns on the scheduler, automatic triggers, retry worker, batch and
              bulk for events explicitly authorised by policy. Server-side readiness
              is enforced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Reason (recorded in audit)</label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-xs font-medium">
                Type <code>{ARM_CONFIRMATION_PHRASE}</code> to confirm
              </label>
              <Input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArmOpen(false)} disabled={working}>Cancel</Button>
            <Button onClick={handleArm} disabled={working}>
              {working ? "Arming…" : "Arm Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disarmOpen} onOpenChange={(o) => !o && setDisarmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disarm Automation</DialogTitle>
            <DialogDescription>
              This immediately disables scheduler, automatic triggers, retry worker,
              batch and bulk. It does not change the operating mode.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs font-medium">Reason (recorded in audit)</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisarmOpen(false)} disabled={working}>Cancel</Button>
            <Button variant="outline" onClick={() => handleDisarm(false)} disabled={working}>
              Disarm (Standby)
            </Button>
            <Button variant="destructive" onClick={() => handleDisarm(true)} disabled={working}>
              Disarm (Suspend)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
