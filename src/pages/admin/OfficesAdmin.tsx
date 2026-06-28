import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import OfficeManagement from "./OfficeManagement";
import OfficeIPManagement from "./OfficeIPManagement";
import OrgLocationsPage from "./organization/LocationsPage";

/**
 * Canonical Offices admin page.
 *
 * Phase 3 dedup: merges three former surfaces
 *   - /admin/offices                    (OfficeManagement      — tb_office CRUD)
 *   - /admin/office-ip-management       (OfficeIPManagement    — IP whitelist)
 *   - /admin/organization/locations     (LocationsPage         — comm office_locations)
 * into one tabbed page. Old URLs redirect here with ?tab=...
 */
const VALID_TABS = ["offices", "ip", "locations"] as const;
type TabKey = (typeof VALID_TABS)[number];

export default function OfficesAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as TabKey)
    : "offices";

  return (
    <PermissionWrapper moduleName="office_locations">
      <div className="container mx-auto p-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "offices") next.delete("tab");
            else next.set("tab", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="offices">Offices</TabsTrigger>
            <TabsTrigger value="ip">IP Whitelist</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="offices" className="mt-4">
            <OfficeManagement />
          </TabsContent>
          <TabsContent value="ip" className="mt-4">
            <OfficeIPManagement />
          </TabsContent>
          <TabsContent value="locations" className="mt-4">
            <OrgLocationsPage />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
