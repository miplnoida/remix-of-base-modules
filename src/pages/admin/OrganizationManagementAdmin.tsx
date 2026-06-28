/**
 * Canonical Organization Management surface.
 *
 * Single tabbed page that hosts every Organization-foundation screen so
 * administrators have one place to configure enterprise defaults,
 * department/module overrides and the reusable communication asset
 * library used by the enterprise resolver.
 */
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const OrganizationProfilePage = lazy(() => import("@/pages/admin/organization/OrganizationProfilePage"));
const LocationsPage = lazy(() => import("@/pages/admin/organization/LocationsPage"));
const MediaLibraryPage = lazy(() => import("@/pages/admin/organization/MediaLibraryPage"));
const TextBlocksPage = lazy(() => import("@/pages/admin/organization/TextBlocksPage"));
const DepartmentProfilesPage = lazy(() => import("@/pages/admin/organization/DepartmentProfilesPage"));
const ModuleProfilesPage = lazy(() => import("@/pages/admin/organization/ModuleProfilesPage"));
const AssetAssignmentsPage = lazy(() => import("@/pages/admin/organization/AssetAssignmentsPage"));
const UsageValidationPage = lazy(() => import("@/pages/admin/organization/UsageValidationPage"));

const TABS = [
  { id: "organization", label: "Organization Profile", node: <OrganizationProfilePage /> },
  { id: "locations", label: "Locations & Branches", node: <LocationsPage /> },
  { id: "assets", label: "Communication Assets", node: <MediaLibraryPage /> },
  { id: "text-blocks", label: "Text Blocks", node: <TextBlocksPage /> },
  { id: "departments", label: "Department Profiles", node: <DepartmentProfilesPage /> },
  { id: "modules", label: "Module Profiles", node: <ModuleProfilesPage /> },
  { id: "assignments", label: "Asset Assignments", node: <AssetAssignmentsPage /> },
  { id: "usage", label: "Usage & Validation", node: <UsageValidationPage /> },
] as const;

export default function OrganizationManagementAdmin() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") ?? "organization";

  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Organization Management</h1>
          <p className="text-sm text-muted-foreground">
            Enterprise foundation. Masters stay the source of truth — profiles only extend them, and every module
            reads branding, location, DMS and AI context through the single enterprise resolver.
          </p>
        </div>
        <Tabs value={active} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
          <TabsList className="flex flex-wrap h-auto">
            {TABS.map((t) => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-4">
              <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
                {t.node}
              </Suspense>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
