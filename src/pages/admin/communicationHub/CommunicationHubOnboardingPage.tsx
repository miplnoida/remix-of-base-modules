/**
 * EPIC 4A-UX-IA — Module Onboarding workspace.
 * Route: /admin/communication-hub/onboarding
 * Business Module Registry + Readiness Matrix + rollout guidance. No sending.
 */
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { BusinessModuleCommunicationRegistryPanel } from "./controlCenter/BusinessModuleCommunicationRegistryPanel";
import { BusinessModuleReadinessMatrixPanel } from "./controlCenter/BusinessModuleReadinessMatrixPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function CommunicationHubOnboardingPage() {
  return (
    <CommunicationHubWorkspaceShell
      title="Module Onboarding"
      purpose="Connect business modules (Legal, Insured Person, Benefits, Employer, Compliance, Appeals...) to the Communication Hub sending spine."
      risk="safe"
      quickLinks={[
        { label: "Design & Templates", href: "/admin/communication-hub/design" },
        { label: "Testing & Pilots", href: "/admin/communication-hub/pilots" },
        { label: "Governance & Live Control", href: "/admin/communication-hub/governance" },
      ]}
    >
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Rollout phases</AlertTitle>
        <AlertDescription>
          Phase 1 — inventory (registry). Phase 2 — seed templates &amp; map events (Design).
          Phase 3 — dry-run validation (Pilots). Phase 4 — governed live pilot (Governance).
          Phase 5 — module adapter cutover (EPIC 4C). Legacy notification paths are retained
          until parity is proven.
        </AlertDescription>
      </Alert>

      <CommunicationHubSectionCard
        title="Business module communication registry"
        description="Every discovered communication event across modules with recipient type, risk, current method, legacy path, template status, mapping status and integration status."
      >
        <BusinessModuleCommunicationRegistryPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Business module readiness matrix"
        description="Aggregated readiness view: mapping ✓, template ✓, event status, latest dry-run, blockers, live candidate."
      >
        <BusinessModuleReadinessMatrixPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Legacy replacement tracker"
        description="Tracks which module send-paths still use legacy notification_queue / notification_logs and which have moved to the sending spine."
      >
        <p className="text-sm text-muted-foreground">
          Placeholder — to be populated in EPIC 4C (Actual Module Adapters). No legacy path is
          removed until parity is proven and a live pilot has completed.
        </p>
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
