/**
 * EPIC 4A-UX-IA — Testing & Pilots workspace.
 * Route: /admin/communication-hub/pilots
 * Generic Event Pilot, Operator Rehearsal, Admin Test Notice, Manual Dispatch Test.
 * All actions are permission-gated + typed-confirmation + dry-run/live gated in server.
 */
import { useEffect, useState } from "react";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { GenericEventPilotPanel } from "./controlCenter/GenericEventPilotPanel";
import { OperatorRehearsalWizardPanel } from "./controlCenter/OperatorRehearsalWizardPanel";
import { AdminTestNoticePanel } from "./controlCenter/AdminTestNoticePanel";
import { ManualDispatchTestPanel } from "./controlCenter/ManualDispatchTestPanel";
import { fetchControlSettings, type CommHubControlSettings } from "./controlCenter/controlCenterService";
import { toast } from "sonner";

export default function CommunicationHubPilotsPage() {
  const [settings, setSettings] = useState<CommHubControlSettings | null>(null);

  useEffect(() => {
    fetchControlSettings()
      .then(setSettings)
      .catch((e) => toast.error(e?.message ?? "Failed to load control settings"));
  }, []);

  return (
    <CommunicationHubWorkspaceShell
      title="Testing & Controlled Validation"
      purpose="Dry-run tools to validate templates, mappings and dispatch without going live."
      risk="action-capable"
      quickLinks={[
        { label: "Design & Templates", href: "/admin/communication-hub/design" },
        { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor" },
        { label: "Dispatch Register", href: "/admin/communication-hub/dispatch-register" },
        { label: "Lifecycle Event Log", href: "/admin/communication-hub/lifecycle-log" },
        { label: "Governance & Live Control", href: "/admin/communication-hub/governance" },
      ]}
    >
      <CommunicationHubSectionCard
        title="Event Validation Console"
        description="Send a dry-run for any mapped event. Recipient is locked to the internal allowlist."
      >
        <GenericEventPilotPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Operator Action Rehearsal"
        description="Guided rehearsal of preflight, event live control, dispatch, and evidence checks."
      >
        <OperatorRehearsalWizardPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Admin Test Notice"
        description="Quick admin test notice for smoke-testing template resolution and lifecycle logs."
      >
        <AdminTestNoticePanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Manual Dispatch Test"
        description="Manually claim and dispatch a queued dry-run message to exercise the dispatcher."
      >
        {settings ? (
          <ManualDispatchTestPanel settings={settings} />
        ) : (
          <div className="text-sm text-muted-foreground">Loading control settings…</div>
        )}
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
