/**
 * Organization Management shell — full 5-section IA.
 *
 * Foundation · Brand Assets · Communication Library · Configuration Center ·
 * Validation & Impact. Every leaf re-parents an existing screen — no
 * duplicate implementations. Configuration Center leaves deep-link into the
 * generic engine via `?domain=<code>`; Brand Assets sub-leaves that don't
 * yet have a dedicated screen re-use Media Library / Text Blocks with a
 * context banner selected by `?ctx=<slot>`.
 */
import { lazy, Suspense, useMemo } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const OrganizationProfilePage = lazy(() => import("@/pages/admin/organization/OrganizationProfilePage"));
const LocationsPage = lazy(() => import("@/pages/admin/organization/LocationsPage"));
const MediaLibraryPage = lazy(() => import("@/pages/admin/organization/MediaLibraryPage"));
const AssetCategoryMasterPage = lazy(() => import("@/pages/admin/organization/AssetCategoryMasterPage"));
const LetterheadsPage = lazy(() => import("@/pages/admin/organization/LetterheadsPage"));
const PortalBrandingPage = lazy(() => import("@/pages/admin/organization/PortalBrandingPage"));
const DocumentAssetsPage = lazy(() => import("@/pages/admin/organization/DocumentAssetsPage"));
const TextBlocksPage = lazy(() => import("@/pages/admin/organization/TextBlocksPage"));
const NotificationTemplatesPage = lazy(() => import("@/pages/admin/organization/NotificationTemplatesPage"));
const DepartmentProfilesPage = lazy(() => import("@/pages/admin/organization/DepartmentProfilesPage"));
const ModuleProfilesPage = lazy(() => import("@/pages/admin/organization/ModuleProfilesPage"));
const DesignationHierarchy = lazy(() => import("@/pages/admin/DesignationHierarchy"));
const UsageValidationPage = lazy(() => import("@/pages/admin/organization/UsageValidationPage"));
const ValidationImpactPage = lazy(() => import("@/pages/admin/organization/ValidationImpactPage"));
const ConfigurationCenterPage = lazy(() => import("@/pages/admin/organization/ConfigurationCenterPage"));

type Leaf = {
  id: string;
  label: string;
  render: () => JSX.Element;
};
type Section = { id: string; label: string; leaves: Leaf[] };

/** Small context banner for leaves that re-use an existing screen. */
function ReuseBanner({ title, description }: { title: string; description: string }) {
  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}

const SECTIONS: Section[] = [
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
      { id: "assets/signatures",      label: "Signatures",       render: () => (<><ReuseBanner title="Signatures" description="Signatures are stored in the Media Library. Upload with type = signature, then assign via Configuration Center → Branding." /><MediaLibraryPage /></>) },
      { id: "assets/headers-footers", label: "Headers / Footers",render: () => (<><ReuseBanner title="Headers & Footers" description="Managed as document assets. Upload media or configure a letterhead, then wire it up in Configuration Center → Branding." /><LetterheadsPage /></>) },
      { id: "assets/disclaimers",     label: "Disclaimers",      render: () => (<><ReuseBanner title="Disclaimers" description="Reusable disclaimer copy lives in Text Blocks. Assign per template in Communication Library." /><TextBlocksPage /></>) },
      { id: "assets/portal-branding", label: "Portal Branding",  render: () => <PortalBrandingPage /> },
      { id: "assets/document-assets", label: "Document Assets",  render: () => <DocumentAssetsPage /> },
      { id: "assets/categories",      label: "Asset Categories", render: () => <AssetCategoryMasterPage /> },
    ],
  },
  {
    id: "library", label: "Communication Library",
    leaves: [
      { id: "library/templates",     label: "Templates",              render: () => <NotificationTemplatesPage /> },
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

const ALL_LEAVES = SECTIONS.flatMap((s) => s.leaves);

/** Configuration-center domain codes that map to `?domain=<code>` on the engine page. */
const CONFIG_DOMAIN_CODES = new Set(["communication", "workflow", "numbering", "branding", "reporting", "ai"]);

/** Legacy alias — preserves /admin/organization/asset-assignments bookmarks. */
export { default as LegacyAssetAssignmentsRoute } from "@/pages/admin/organization/ConfigurationCenterPage";

export default function OrganizationManagementShell() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeLeaf = useMemo<string>(() => {
    const section = params.section ?? "";
    const leaf = params.leaf ?? "";
    if (section && leaf) return `${section}/${leaf}`;

    if (location.pathname.endsWith("/configuration-center")) {
      const d = searchParams.get("domain");
      return CONFIG_DOMAIN_CODES.has(d ?? "") ? `configuration-center/${d}` : "configuration-center/communication";
    }
    if (location.pathname.endsWith("/validation")) return "validation/health";
    return "foundation/profile";
  }, [params, location.pathname, searchParams]);

  const activeSection = SECTIONS.find((s) => s.leaves.some((l) => l.id === activeLeaf))?.id ?? "foundation";
  const currentLeaf = ALL_LEAVES.find((l) => l.id === activeLeaf) ?? ALL_LEAVES[0];

  const buildHref = (leafId: string): string => {
    if (leafId.startsWith("configuration-center/")) {
      const domain = leafId.split("/")[1];
      return `/admin/org/configuration-center?domain=${domain}`;
    }
    return `/admin/org/${leafId}`;
  };

  const goto = (leafId: string) => navigate(buildHref(leafId));

  const sectionCrumb = SECTIONS.find((s) => s.id === activeSection)?.label ?? "Foundation";

  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Organization Management &nbsp;/&nbsp; {sectionCrumb} &nbsp;/&nbsp; {currentLeaf.label}
          </div>
          <h1 className="text-2xl font-semibold">Organization Management</h1>
          <p className="text-sm text-muted-foreground">
            Foundation → Brand Assets → Communication Library → Configuration Center → Validation &amp; Impact.
            Runtime is a read-only consumer of the Configuration Center.
          </p>
        </div>

        {/* Top-level 5 sections */}
        <Tabs value={activeSection} onValueChange={(sid) => {
          const first = SECTIONS.find((s) => s.id === sid)?.leaves[0];
          if (first) goto(first.id);
        }}>
          <TabsList className="flex flex-wrap h-auto">
            {SECTIONS.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>

        {/* Sub-nav for the active section */}
        {(() => {
          const section = SECTIONS.find((s) => s.id === activeSection);
          if (!section || section.leaves.length <= 1) return null;
          return (
            <div className="flex flex-wrap gap-2 border-b pb-2">
              {section.leaves.map((leaf) => (
                <NavLink
                  key={leaf.id}
                  to={buildHref(leaf.id)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    activeLeaf === leaf.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {leaf.label}
                </NavLink>
              ))}
            </div>
          );
        })()}

        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          {currentLeaf.render()}
        </Suspense>
      </div>
    </PermissionWrapper>
  );
}

