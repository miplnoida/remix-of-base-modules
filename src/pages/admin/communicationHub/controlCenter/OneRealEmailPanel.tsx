/**
 * CH-GL-01 Slice C — OneRealEmailPanel.
 *
 * Dedicated Go Live surface for the SEND_ONE_REAL_EMAIL action.
 *
 * Slice C ships this as a LOCKED placeholder. The action is defined in
 * the server contract (`certification_kind = 'ONE_REAL_EMAIL'`, Slice A)
 * and the client type (`ControlledLiveAction = 'SEND_ONE_REAL_EMAIL'`,
 * Slice B), but the orchestrator wiring, one-use grant flow, and
 * operator UI for a real provider send are intentionally NOT enabled
 * from this page.
 *
 * Unlocking real email requires:
 *   - A passing Controlled Stub certification for this event.
 *   - Platform administrators explicitly opening the real-provider gate.
 *   - Event certification for `live_manual_only` / `live_cron_allowed`.
 *
 * None of those toggles are exposed here; this panel exists so the Go
 * Live journey renders a truthful Stage 6 rather than reusing the
 * Controlled Stub panel.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lock, ShieldAlert } from "lucide-react";

export interface OneRealEmailPanelProps {
  /** True when the Controlled Stub stage has been certified for this event. */
  controlledStubCertified: boolean;
  /** Server-side stage lock reason from `useStageReadiness`, if any. */
  lockReason?: string | null;
}

export function OneRealEmailPanel({
  controlledStubCertified,
  lockReason,
}: OneRealEmailPanelProps) {
  const primaryReason = controlledStubCertified
    ? (lockReason ??
      "Prerequisites for a real email send have not been satisfied.")
    : "Complete the Controlled Stub certification first. The real-provider gate is not opened from this page.";

  return (
    <div className="space-y-3">
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Locked
          <Badge variant="outline">SEND_ONE_REAL_EMAIL</Badge>
        </AlertTitle>
        <AlertDescription>{primaryReason}</AlertDescription>
      </Alert>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Why this stage is separated</AlertTitle>
        <AlertDescription>
          Send One Real Email is a distinct, audited action from Run
          Controlled Stub. It requires a fresh one-use server grant, a
          real-provider transport, and a passing Controlled Stub
          certification. Real sending is never inferred from a stub result.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default OneRealEmailPanel;
