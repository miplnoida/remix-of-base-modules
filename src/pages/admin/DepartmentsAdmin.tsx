import { useSearchParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const DepartmentManagement = lazy(() => import("@/pages/admin/DepartmentManagement"));
const OrgDepartmentProfilesPage = lazy(
  () => import("@/pages/admin/organization/DepartmentProfilesPage"),
);
const OrgDepartmentMappingPage = lazy(
  () => import("@/pages/admin/organization/DepartmentMappingPage"),
);

const VALID_TABS = ["departments", "profiles", "mapping"] as const;
type TabKey = (typeof VALID_TABS)[number];

const tabFallback = (
  <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
    Loading…
  </div>
);

/**
 * Canonical Departments admin page.
 *
 * Phase 3 dedup: merges
 *   - /admin/departments                       (DepartmentManagement)
 *   - /admin/organization/departments          (OrgDepartmentProfilesPage)
 *   - /admin/organization/department-mapping   (OrgDepartmentMappingPage)
 * into one tabbed page at /admin/departments.
 */
export default function DepartmentsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as TabKey)
    : "departments";

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "departments") next.delete("tab");
            else next.set("tab", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="mapping">Module Mapping</TabsTrigger>
          </TabsList>

          <TabsContent value="departments" className="mt-4">
            <Suspense fallback={tabFallback}>
              <DepartmentManagement />
            </Suspense>
          </TabsContent>
          <TabsContent value="profiles" className="mt-4">
            <Suspense fallback={tabFallback}>
              <OrgDepartmentProfilesPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="mapping" className="mt-4">
            <Suspense fallback={tabFallback}>
              <OrgDepartmentMappingPage />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
