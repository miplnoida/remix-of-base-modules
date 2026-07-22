/**
 * CH-GL-01 Slice C — ControlledStubPanel.
 *
 * Dedicated Go Live surface for the RUN_CONTROLLED_STUB action.
 *
 * This is the ONLY panel that should be used inside the Go Live journey
 * for Stage 5. It is a thin wrapper over `ControlledLivePanel`, which is
 * itself pinned to `action: "RUN_CONTROLLED_STUB"` at the client contract
 * layer (Slice B) and enforced server-side (Slice A). The wrapper exists
 * so the operator surface is unambiguous:
 *
 *   Stage 5 — Run Controlled Stub  → ControlledStubPanel
 *   Stage 6 — Send One Real Email  → OneRealEmailPanel (locked)
 *
 * The stub stage is a provider simulation. It creates exactly one
 * request/message row, records a CONTROLLED_STUB certification, and never
 * dispatches through the real-email provider — even when environment
 * flags for real email are set.
 */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FlaskConical } from "lucide-react";
import ControlledLivePanel, {
  type ControlledLivePanelProps,
} from "./ControlledLivePanel";

export type ControlledStubPanelProps = ControlledLivePanelProps;

export function ControlledStubPanel(props: ControlledStubPanelProps) {
  return (
    <div className="space-y-3">
      <Alert>
        <FlaskConical className="h-4 w-4" />
        <AlertTitle>Controlled Stub — provider simulation</AlertTitle>
        <AlertDescription>
          This stage runs exactly one certified send against the deterministic
          provider stub. No real email leaves the platform, regardless of
          environment flags. A successful run records a{" "}
          <code className="font-mono">CONTROLLED_STUB</code> certification
          which is the prerequisite for Send One Real Email.
        </AlertDescription>
      </Alert>
      <ControlledLivePanel {...props} />
    </div>
  );
}

export default ControlledStubPanel;
