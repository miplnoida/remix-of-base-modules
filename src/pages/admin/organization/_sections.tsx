/**
 * Shared Organization Management IA definition.
 * Consumed by both the Overview tabbed shell (`OrganizationManagementShell`)
 * and the direct leaf renderer (`OrganizationDirectLeaf`).
 */
import { lazy } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const OrganizationProfilePage      = lazy(() => import("@/pages/admin/organization/OrganizationProfilePage"));
const LocationsPage                = lazy(() => import("@/pages/admin/organization/LocationsPage"));
const MediaLibraryPage             = lazy(() => import("@/pages/admin/organization/MediaLibraryPage"));
const AssetCategoryMasterPage      = lazy(() => import("@/pages/admin/organization/AssetCategoryMasterPage"));
const LetterheadsPage              = lazy(() => import("@/pages/admin/organization/LetterheadsPage"));
const TemplatesDesignerPage        = lazy(() => import("@/pages/admin/organization/TemplatesDesignerPage"));
const PortalBrandingPage           = lazy(() => import("@/pages/admin/organization/PortalBrandingPage"));
const DocumentAssetsPage           = lazy(() => import("@/pages/admin/organization/DocumentAssetsPage"));
const TextBlocksPage               = lazy(() => import("@/pages/admin/organization/TextBlocksPage"));
const NotificationTemplatesPage    = lazy(() => import("@/pages/admin/organization/NotificationTemplatesPage"));
const DepartmentProfilesPage       = lazy(() => import("@/pages/admin/organization/DepartmentProfilesPage"));
const ModuleProfilesPage           = lazy(() => import("@/pages/admin/organization/ModuleProfilesPage"));
const DesignationHierarchy         = lazy(() => import("@/pages/admin/DesignationHierarchy"));
const UsageValidationPage          = lazy(() => import("@/pages/admin/organization/UsageValidationPage"));
const ValidationImpactPage         = lazy(() => import("@/pages/admin/organization/ValidationImpactPage"));
const ConfigurationCenterPage      = lazy(() => import("@/pages/admin/organization/ConfigurationCenterPage"));

export type Leaf = { id: string; label: string; render: () => JSX.Element };
export type Section = { id: string; label: string; leaves: Leaf[] };

export function ReuseBanner({ title, description }: { title: string; description: string }) {
  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

export const SECTIONS: Section[] = [
  {
    id: "foundation", label: "Foundation",
    leaves: [
      { id: "foundation/profile",       label: "Organization Profile",  render: () => <OrganizationProfilePage /> },
      { id: "foundation/locations",     label: "Locations & Branches",  render: () => <LocationsPage /> },
      { id: "foundation/departments",   label: "Departments",           render: () => <DepartmentProfilesPage /> },
      { id: "foundation/modules",       label: "Modules",               render: () => <ModuleProfilesPage /> },
      { id: "foundation/designations",  label: "Designation Hierarchy", render: () => <DesignationHierarchy /> },
    ],
  },
  {
    id: "assets", label: "Brand Assets",
    leaves: [
      { id: "assets/media",           label: "Media Library",    render: () => <MediaLibraryPage /> },
      { id: "assets/letterheads",     label: "Letterheads",      render: () => <LetterheadsPage /> },
      { id: "assets/signatures",      label: "Signatures",       render: () => (<><ReuseBanner title="Signatures" description="Signature images are stored in the Media Library (type = signature). Upload / manage them here, then assign per module or officer in Configuration Center → Branding." /><MediaLibraryPage /></>) },
      { id: "assets/headers-footers", label: "Headers / Footers",render: () => (<><ReuseBanner title="Headers & Footers" description="Header / footer images live in the Media Library (categories letterhead_header, letterhead_footer). Wire them into a letterhead in Brand Assets → Letterheads, then assign per module in Configuration Center → Branding." /><MediaLibraryPage /></>) },
      { id: "assets/disclaimers",     label: "Disclaimers",      render: () => (<><ReuseBanner title="Disclaimers" description="Reusable disclaimer copy lives in Text Blocks. Assign per template in Communication Library → Templates." /><TextBlocksPage /></>) },
      { id: "assets/portal-branding", label: "Portal Branding",  render: () => <PortalBrandingPage /> },
      { id: "assets/document-assets", label: "Document Assets",  render: () => <DocumentAssetsPage /> },
      { id: "assets/categories",      label: "Asset Categories", render: () => <AssetCategoryMasterPage /> },
    ],
  },
  {
    id: "library", label: "Communication Library",
    leaves: [
      { id: "library/templates",     label: "Templates",              render: () => <TemplatesDesignerPage /> },
      { id: "library/notification-templates", label: "Notification Templates", render: () => (<><ReuseBanner title="Notification Templates" description="Email / SMS / WhatsApp / in-app notification templates (registration, OTP, workflow alerts). Long-form official documents are authored in Templates." /><NotificationTemplatesPage /></>) },
      { id: "library/text-blocks",   label: "Text Blocks",            render: () => <TextBlocksPage /> },
      { id: "library/tokens",        label: "Tokens",                 render: () => (<><ReuseBanner title="Tokens" description="Merge tokens are surfaced inside Templates and Text Blocks. Manage them in-context on any template." /><TextBlocksPage /></>) },
      { id: "library/categories",    label: "Categories",             render: () => (<><ReuseBanner title="Template Categories" description="Categories are shared with Brand Assets. Manage the master list in Asset Categories." /><AssetCategoryMasterPage /></>) },
      { id: "library/channels",      label: "Channels",               render: () => (<><ReuseBanner title="Channels" description="Channels (email / SMS / in-app) are configured per template. Open Notification Templates and pick the channel tab." /><NotificationTemplatesPage /></>) },
      { id: "library/languages",     label: "Languages / Translations", render: () => (<><ReuseBanner title="Languages & Translations" description="Localized variants live alongside each template. Use the language selector inside Notification Templates." /><NotificationTemplatesPage /></>) },
    ],
  },
  {
    id: "configuration-center", label: "Configuration Center",
    leaves: [
      { id: "configuration-center/communication", label: "Communication", render: () => <ConfigurationCenterPage /> },
      { id: "configuration-center/workflow",      label: "Workflow",      render: () => <ConfigurationCenterPage /> },
      { id: "configuration-center/numbering",     label: "Numbering",     render: () => <ConfigurationCenterPage /> },
      { id: "configuration-center/branding",      label: "Branding",      render: () => <ConfigurationCenterPage /> },
      { id: "configuration-center/reporting",     label: "Reporting",     render: () => <ConfigurationCenterPage /> },
      { id: "configuration-center/ai",            label: "AI",            render: () => <ConfigurationCenterPage /> },
    ],
  },
  {
    id: "validation", label: "Validation & Impact",
    leaves: [
      { id: "validation/health",    label: "Health Dashboard",   render: () => <ValidationImpactPage /> },
      { id: "validation/usage",     label: "Usage Validation",   render: () => <UsageValidationPage /> },
      { id: "validation/impact",    label: "Impact Analysis",    render: () => (<><ReuseBanner title="Impact Analysis" description="Cross-reference view built on top of the engine-health dataset." /><ValidationImpactPage /></>) },
      { id: "validation/broken",    label: "Broken References",  render: () => (<><ReuseBanner title="Broken References" description="Legacy asset usage report highlights orphaned or missing references." /><UsageValidationPage /></>) },
    ],
  },
];

export const ALL_LEAVES: Leaf[] = SECTIONS.flatMap((s) => s.leaves);
export const CONFIG_DOMAIN_CODES = new Set(["communication", "workflow", "numbering", "branding", "reporting", "ai"]);
