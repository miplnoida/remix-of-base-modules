/**
 * EPIC 4A-UX-IA — Module Onboarding workspace.
 * Route: /admin/communication-hub/onboarding
 * Business Module Registry + Readiness Matrix + rollout guidance. No sending.
 */
import { Link } from "react-router-dom";
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { BusinessModuleCommunicationRegistryPanel } from "./controlCenter/BusinessModuleCommunicationRegistryPanel";
import { BusinessModuleReadinessMatrixPanel } from "./controlCenter/BusinessModuleReadinessMatrixPanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, Wand2 } from "lucide-react";

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
      <CommunicationHubSectionCard
        title="Event & Template Onboarding Wizard"
        description="Create an event, define tokens, author a template, map it and dry-run — from one screen. Dry-run only; no live email."
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Use Module Adapter Tests to fire the same dry-runs through real module code paths.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/communication-hub/onboarding/module-adapter-tests">
                Module Adapter Tests
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/communication-hub/onboarding/event-template-wizard">
                <Wand2 className="h-4 w-4 mr-2" /> Start Wizard
              </Link>
            </Button>
          </div>
        </div>
      </CommunicationHubSectionCard>


      <CommunicationHubSectionCard
        title="Business module communication registry"
        description="Every discovered communication event by module, with recipient type, risk, template and mapping status."
      >
        <BusinessModuleCommunicationRegistryPanel />
      </CommunicationHubSectionCard>

      <CommunicationHubSectionCard
        title="Business module readiness matrix"
        description="Mapping, template, event status, latest dry-run, blockers, live candidate."
      >
        <BusinessModuleReadinessMatrixPanel />
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
