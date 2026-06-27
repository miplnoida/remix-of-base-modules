import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import DesignationManagement from "./DesignationManagement";
import DesignationHierarchy from "./DesignationHierarchy";

/**
 * Canonical Designations admin page.
 *
 * Phase 3 dedup: merges three former surfaces
 *   - /admin/designations               (DesignationManagement — CRUD)
 *   - /admin/designation-hierarchy      (DesignationHierarchy   — tree)
 *   - /admin/master-data/designations   (DesignationMasterManagement — duplicate CRUD)
 * into one tabbed page. The duplicate master-data CRUD is dropped; permissions
 * from `md_designations` are preserved here via PermissionWrapper.
 */
export default function DesignationsAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "hierarchy" ? "hierarchy" : "list";

  return (
    <PermissionWrapper moduleName="md_designations">
      <div className="container mx-auto p-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "list") next.delete("tab");
            else next.set("tab", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="list">Designations</TabsTrigger>
            <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            <DesignationManagement />
          </TabsContent>
          <TabsContent value="hierarchy" className="mt-4">
            <DesignationHierarchy />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
