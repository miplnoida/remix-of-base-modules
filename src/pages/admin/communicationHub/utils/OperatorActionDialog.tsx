/**
 * EPIC 2C — Confirmation dialog for admin-only Communication Hub operator
 * actions on Retry Queue rows. Requires a reason + typed confirmation.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ACTION_SPECS, runOperatorAction, type OperatorActionKind } from "./operatorActions";
import type { DeliveryMonitorRow } from "./operationsService";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: OperatorActionKind | null;
  row: DeliveryMonitorRow | null;
  onCompleted: () => void;
}

export default function OperatorActionDialog({ open, onOpenChange, kind, row, onCompleted }: Props) {
  const [reason, setReason] = useState("");
  const [phrase, setPhrase] = useState("");
  const [running, setRunning] = useState(false);
  const spec = kind ? ACTION_SPECS[kind] : null;

  useEffect(() => {
    if (!open) {
      setReason("");
      setPhrase("");
      setRunning(false);
    }
  }, [open]);

  if (!spec || !row) return (
    <Dialog open={open} onOpenChange={onOpenChange}><DialogContent /></Dialog>
  );

  const phraseOk = phrase.trim() === spec.confirmationPhrase;
  const reasonOk = reason.trim().length >= 6;
  const canRun = phraseOk && reasonOk && !running;

  const submit = async () => {
    if (!canRun) return;
    setRunning(true);
    const res = await runOperatorAction({ kind: spec.kind, messageId: row.message_id, reason: reason.trim() });
    setRunning(false);
    if (!res.ok) {
      toast.error(`Action failed: ${res.error}`);
      return;
    }
    toast.success(`${spec.label} — request ${row.request_no}, message ${row.message_id.slice(0, 8)}…`);
    onCompleted();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{spec.label}</DialogTitle>
          <DialogDescription>{spec.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded border p-3 bg-muted/50 space-y-1">
            <div><span className="text-muted-foreground">Request:</span> <span className="font-mono">{row.request_no}</span></div>
            <div><span className="text-muted-foreground">Message:</span> <span className="font-mono text-xs">{row.message_id}</span></div>
            <div><span className="text-muted-foreground">Module / Event:</span> {row.module_code} / {row.event_code}</div>
            <div><span className="text-muted-foreground">Status:</span> {row.message_status} · <span className="text-muted-foreground">Mode:</span> {row.test_mode ? "test" : "live"}</div>
          </div>
          {spec.danger && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>One-message action, audited</AlertTitle>
              <AlertDescription>
                This affects exactly one message. No provider call. Recorded in
                communication_event_log and communication_hub_control_audit.
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-1">
            <Label>Reason (required, min 6 chars)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Why is this action being performed?" />
          </div>
          <div className="space-y-1">
            <Label>Type <code className="font-mono">{spec.confirmationPhrase}</code> to confirm</Label>
            <Input value={phrase} onChange={e => setPhrase(e.target.value)} placeholder={spec.confirmationPhrase} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>Cancel</Button>
          <Button onClick={submit} disabled={!canRun}>
            {running && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {spec.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
