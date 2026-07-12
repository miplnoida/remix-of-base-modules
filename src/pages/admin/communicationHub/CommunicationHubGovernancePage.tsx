/**
 * EPIC 4A-UX-IA — Governance & Live Control workspace.
 * Route: /admin/communication-hub/governance
 * Live readiness governance, governed live pilot, event live control,
 * live window wizard, tracking policy, delivery readiness.
 * High-risk: every action still requires typed confirmation + server gates.
 */
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { LiveReadinessGovernancePanel } from "./controlCenter/LiveReadinessGovernancePanel";
import { GovernedLivePilotPanel } from "./controlCenter/GovernedLivePilotPanel";
import { EventLiveControlPanel } from "./controlCenter/EventLiveControlPanel";
import { LiveWindowWizardPanel } from "./controlCenter/LiveWindowWizardPanel";
import { TrackingPolicyPanel } from "./controlCenter/TrackingPolicyPanel";
import { DeliveryReadinessPanel } from "./controlCenter/DeliveryReadinessPanel";

export default function CommunicationHubGovernancePage() {
  return (
    <CommunicationHubWorkspaceShell
      title="Governance & Live Control"
      purpose="Approve live readiness, open or close live windows, and control per-event live status."
      risk="high-risk"
      quickLinks={[
        { label: "Send Policies", href: "/admin/communication-hub/governance/send-policies", description: "Per-event send policy" },
        { label: "Control Center", href: "/admin/communication-hub/control-center", description: "Global safety switches" },
        { label: "Testing & Controlled Validation", href: "/admin/communication-hub/pilots" },
        { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor" },
        { label: "Lifecycle Event Log", href: "/admin/communication-hub/lifecycle-log" },
      ]}
    >
      <CommunicationHubSectionCard
        title="Delivery readiness"
        description="Provider health, allowlist state, and channel readiness."
      >
        <DeliveryReadinessPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Tracking policy"
        description="Which lifecycle events are recorded, retention, and evidence scope."
      >
        <TrackingPolicyPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Event live control"
        description="Per-event live enablement."
      >
        <EventLiveControlPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Live readiness governance"
        description="Sign-offs required before any event can go live."
      >
        <LiveReadinessGovernancePanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Live window wizard"
        description="Open and close bounded live windows with typed confirmation."
      >
        <LiveWindowWizardPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Governed Controlled Live Send"
        description="The only path that can produce a live send. Preflight, typed confirmation, live window and locked recipient are all required."
      >
        <GovernedLivePilotPanel />
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
