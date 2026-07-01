/**
 * Phase 1 shell — new 5-section Organization Management IA.
 *
 * Wraps the existing tab pages behind the approved route structure without
 * changing their internals. Old `/admin/organization-management?tab=*` URLs
 * redirect here (see AppRoutes.tsx).
 *
 * Sections: Foundation → Brand Assets → Library → Configuration Center →
 * Validation. Communication Configuration Center (Phase 5) is scaffolded as
 * a placeholder that will host the runtime resolution preview.
 */
import { lazy, Suspense, useMemo } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

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
// AssetAssignmentsPage removed in Phase 8 — superseded by ConfigurationCenterPage.
const UsageValidationPage = lazy(() => import("@/pages/admin/organization/UsageValidationPage"));
const ValidationImpactPage = lazy(() => import("@/pages/admin/organization/ValidationImpactPage"));
const ConfigurationCenterPage = lazy(() => import("@/pages/admin/organization/ConfigurationCenterPage"));

type Leaf = { id: string; label: string; node: JSX.Element };
type Section = { id: string; label: string; leaves: Leaf[] };

const SECTIONS: Section[] = [
  {
    id: "foundation", label: "Foundation",
    leaves: [
      { id: "foundation/profile",     label: "Organization Profile", node: <OrganizationProfilePage /> },
      { id: "foundation/locations",   label: "Locations & Branches", node: <LocationsPage /> },
      { id: "foundation/departments", label: "Departments",          node: <DepartmentProfilesPage /> },
      { id: "foundation/modules",     label: "Modules",              node: <ModuleProfilesPage /> },
    ],
  },
  {
    id: "assets", label: "Brand Assets",
    leaves: [
      { id: "assets/media",          label: "Media Library",     node: <MediaLibraryPage /> },
      { id: "assets/letterheads",    label: "Letterheads",       node: <LetterheadsPage /> },
      { id: "assets/document-assets",label: "Document Assets",   node: <DocumentAssetsPage /> },
      { id: "assets/portal-branding",label: "Portal Branding",   node: <PortalBrandingPage /> },
      { id: "assets/categories",     label: "Asset Categories",  node: <AssetCategoryMasterPage /> },
    ],
  },
  {
    id: "library", label: "Communication Library",
    leaves: [
      { id: "library/text-blocks",             label: "Text Blocks",             node: <TextBlocksPage /> },
      { id: "library/notification-templates",  label: "Notification Templates",  node: <NotificationTemplatesPage /> },
    ],
  },
  {
    id: "configuration-center", label: "Configuration Center",
    leaves: [
      { id: "configuration-center", label: "Assignments", node: <ConfigurationCenterPage /> },
    ],
  },
  {
    id: "validation", label: "Validation & Impact",
    leaves: [
      { id: "validation/engine", label: "Engine Health",      node: <ValidationImpactPage /> },
      { id: "validation/usage",  label: "Legacy Asset Usage", node: <UsageValidationPage /> },
    ],
  },
];


const ALL_LEAVES = SECTIONS.flatMap((s) => s.leaves);

/** Legacy assignments page (kept accessible in Phase 1 for parity). */
export const LegacyAssetAssignmentsRoute = () => (
  <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
    <AssetAssignmentsPage />
  </Suspense>
);

export default function OrganizationManagementShell() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const activeLeaf = useMemo<string>(() => {
    const section = params.section ?? "";
    const leaf = params.leaf ?? "";
    if (section && leaf) return `${section}/${leaf}`;

    if (location.pathname.endsWith("/configuration-center")) return "configuration-center";
    if (location.pathname.endsWith("/validation")) return "validation/engine";
    return "foundation/profile";
  }, [params, location.pathname]);

  const activeSection = SECTIONS.find((s) => s.leaves.some((l) => l.id === activeLeaf))?.id ?? "foundation";
  const currentNode = ALL_LEAVES.find((l) => l.id === activeLeaf)?.node ?? <OrganizationProfilePage />;

  const goto = (leafId: string) => {
    if (leafId === "configuration-center") navigate("/admin/org/configuration-center");
    else navigate(`/admin/org/${leafId}`);
  };

  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Organization Management</h1>
          <p className="text-sm text-muted-foreground">
            Five-stage lifecycle: Foundation → Brand Assets → Library → Configuration Center → Validation.
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

        {/* Sub-nav for the active section (only when it has >1 leaf) */}
        {(() => {
          const section = SECTIONS.find((s) => s.id === activeSection);
          if (!section || section.leaves.length <= 1) return null;
          return (
            <div className="flex flex-wrap gap-2 border-b pb-2">
              {section.leaves.map((leaf) => (
                <NavLink
                  key={leaf.id}
                  to={`/admin/org/${leaf.id}`}
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
          {currentNode}
        </Suspense>
      </div>
    </PermissionWrapper>
  );
}
