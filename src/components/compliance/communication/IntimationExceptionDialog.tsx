/**
 * IntimationExceptionDialog
 *
 * Governance dialog used to formally exception a missed pre-visit
 * Audit Intimation. Captures:
 *   - reason code (controlled vocabulary)
 *   - notes (free text)
 *   - optional "send late intimation" toggle that opens the composer
 *     immediately after the exception is recorded.
 *
 * Persists to a small audit-trail row on the next ce_audit_communications
 * record created for this visit (sent_late + late_reason on the new row),
 * AND a standalone exception event on the visit so the gate can show
 * "Exception recorded" even when no late send happens.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const COMM = "ce_audit_communications" as any;
const EVT = "ce_audit_communication_events" as any;

const REASONS: { value: string; label: string }[] = [
  { value: "urgent_visit", label: "Urgent / unannounced visit required" },
  { value: "employer_unreachable", label: "Employer contact unreachable" },
  { value: "oversight", label: "Oversight by inspector" },
  { value: "system_issue", label: "System / template unavailable" },
  { value: "other", label: "Other (specify in notes)" },
];

export interface IntimationExceptionResult {
  reason: string;
  notes: string;
  /** true if user also wants to send a late intimation now. */
  sendLate: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  inspectionId: string;
  employerId: string;
  userCode?: string;
  /** Called after exception is logged. If sendLate=true, parent should open composer. */
  onRecorded: (r: IntimationExceptionResult) => void;
}

export function IntimationExceptionDialog({
  open, onOpenChange, inspectionId, userCode, onRecorded,
}: Props) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [sendLate, setSendLate] = useState(true);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReason(""); setNotes(""); setSendLate(true); setBusy(false);
  };

  const submit = async () => {
    if (!reason) {
      toast.error("Please select a reason for the exception.");
      return;
    }
    if (reason === "other" && !notes.trim()) {
      toast.error("Please describe the reason in notes when 'Other' is selected.");
      return;
    }
    setBusy(true);
    try {
      // Persist a standalone exception event on the visit. This survives
      // even if the inspector decides not to send a late intimation.
      const { error } = await (supabase.from(EVT) as any).insert({
        communication_id: null,
        event_type: "intimation_exception_recorded",
        actor_user_id: userCode ?? null,
        payload: {
          inspection_id: inspectionId,
          reason,
          reason_label: REASONS.find((r) => r.value === reason)?.label,
          notes: notes.trim() || null,
          send_late: sendLate,
          recorded_at: new Date().toISOString(),
        },
      });
      if (error) throw error;

      toast.success("Exception recorded", {
        description: sendLate
          ? "Opening composer to send the late intimation…"
          : "The missed pre-visit intimation has been logged.",
      });

      onRecorded({ reason, notes: notes.trim(), sendLate });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Failed to record exception", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Record Pre-visit Intimation Exception
          </DialogTitle>
          <DialogDescription>
            The audit visit has already started without a pre-visit Audit
            Intimation. Capture the reason for governance — and optionally
            send a late intimation now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">
              Notes {reason === "other" && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context that helps a reviewer understand why intimation was missed…"
              rows={3}
            />
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={sendLate}
              onCheckedChange={(v) => setSendLate(!!v)}
              className="mt-0.5"
            />
            <span>
              Also send a <strong>Late Audit Intimation</strong> now.
              <span className="block text-xs text-muted-foreground">
                Opens the composer with the Audit Intimation template and marks
                the send as late on the audit trail.
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy
              ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              : sendLate ? <Send className="h-3.5 w-3.5 mr-1" /> : null}
            {sendLate ? "Record & Send Late" : "Record Exception"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IntimationExceptionDialog;
