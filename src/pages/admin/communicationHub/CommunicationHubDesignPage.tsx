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
      purpose="Assign templates, versions and channels for each module event."
      risk="action-capable"
      quickLinks={[
        { label: "Event & Template Wizard", href: "/admin/communication-hub/onboarding/event-template-wizard" },
        { label: "Sender Profiles", href: "/admin/communication-hub/design/sender-profiles" },
        { label: "Sender Verification", href: "/admin/communication-hub/design/sender-verification" },
        { label: "Template Library", href: "/admin/notification-templates" },
        { label: "Template Management Workspace", href: "/admin/template-management" },
        { label: "Provider Settings", href: "/admin/notifications/providers" },
        { label: "Text Blocks", href: "/admin/org/library/text-blocks" },
        { label: "Document Assets", href: "/admin/org/assets/document-assets" },
      ]}
    >
      <CommunicationHubSectionCard
        title="Event → Template mapping"
        description="Only active mappings are used at send time."
      >
        <EventTemplateMappingPanel />
      </CommunicationHubSectionCard>
    </CommunicationHubWorkspaceShell>
  );
}
