/**
 * EPIC 4A-UX-IA — Design & Templates workspace.
 * Route: /admin/communication-hub/design
 * Hosts Event/Template mapping and links to Template Library, Provider Settings,
 * Template Management Workspace. No sending logic.
 */
import CommunicationHubWorkspaceShell, {
  CommunicationHubSectionCard,
} from "./components/CommunicationHubWorkspaceShell";
import { EventTemplateMappingPanel } from "./controlCenter/EventTemplateMappingPanel";

export default function CommunicationHubDesignPage() {
  return (
    <CommunicationHubWorkspaceShell
      title="Design & Templates"
      purpose="Assign which template, version and channel are used per module/event. Author templates and configure provider settings."
      risk="action-capable"
      quickLinks={[
        { label: "Event & Template Wizard", href: "/admin/communication-hub/onboarding/event-template-wizard", description: "Self-service event + template creation" },
        { label: "Sender Profiles", href: "/admin/communication-hub/design/sender-profiles", description: "From-Email registry (EPIC CH-S1)" },
        { label: "Template Library", href: "/admin/notification-templates", description: "Canonical template master" },
        { label: "Template Management Workspace", href: "/admin/template-management" },
        { label: "Provider Settings", href: "/admin/notifications/providers", description: "Email / SMS provider config" },
        { label: "Text Blocks", href: "/admin/org/library/text-blocks" },
        { label: "Document Assets", href: "/admin/org/assets/document-assets" },
      ]}
    >
      <CommunicationHubSectionCard
        title="Event → Template mapping"
        description="This decides which actual template is used for each module / event / channel. Only active mappings are used at send time."
      >
        <EventTemplateMappingPanel />
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
