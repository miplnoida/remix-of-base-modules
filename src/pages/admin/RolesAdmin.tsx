import { useSearchParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const AdminRoleList = lazy(() => import("@/pages/admin/roles/RoleList"));
const RolePermissionManagement = lazy(
  () => import("@/pages/admin/RolePermissionManagement"),
);
const RoleHierarchy = lazy(() => import("@/pages/admin/RoleHierarchy"));

/**
 * Canonical Roles admin page.
 *
 * Phase 3 dedup: merges three former surfaces
 *   - /admin/roles               (AdminRoleList            — enterprise role catalogue)
 *   - /admin/roles-permissions   (RolePermissionManagement — permission matrix)
 *   - /admin/role-hierarchy      (RoleHierarchy            — reporting tree)
 * into one tabbed page at /admin/roles. Old URLs redirect with ?tab=...
 */
const VALID_TABS = ["roles", "permissions", "hierarchy"] as const;
type TabKey = (typeof VALID_TABS)[number];

const tabFallback = (
  <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
    Loading…
  </div>
);

export default function RolesAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as TabKey)
    : "roles";

  return (
    <PermissionWrapper moduleName="manage_users">
      <div className="container mx-auto p-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "roles") next.delete("tab");
            else next.set("tab", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="mt-4">
            <Suspense fallback={tabFallback}>
              <AdminRoleList />
            </Suspense>
          </TabsContent>
          <TabsContent value="permissions" className="mt-4">
            <Suspense fallback={tabFallback}>
              <RolePermissionManagement />
            </Suspense>
          </TabsContent>
          <TabsContent value="hierarchy" className="mt-4">
            <Suspense fallback={tabFallback}>
              <RoleHierarchy />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
