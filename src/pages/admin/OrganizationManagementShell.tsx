/**
 * Organization Management — Overview (tabbed shell).
 * Route: /admin/org/overview[/:section/:leaf][?domain=...]
 */
import { Suspense, useMemo } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { SECTIONS, ALL_LEAVES, CONFIG_DOMAIN_CODES } from "./organization/_sections";

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
      return `/admin/org/overview/configuration-center?domain=${domain}`;
    }
    return `/admin/org/overview/${leafId}`;
  };

  const goto = (leafId: string) => navigate(buildHref(leafId));
  const sectionCrumb = SECTIONS.find((s) => s.id === activeSection)?.label ?? "Foundation";

  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Organisation Management &nbsp;/&nbsp; <span className="font-medium">Overview</span> &nbsp;/&nbsp; {sectionCrumb} &nbsp;/&nbsp; {currentLeaf.label}
          </div>
          <h1 className="text-2xl font-semibold">Organisation Management</h1>
          <p className="text-sm text-muted-foreground">
            Organisation Foundation — profile, locations, departments, modules and designation hierarchy.
            Communication assets, template library, advanced configuration and validation/impact tools now live under{" "}
            <a href="/admin/template-management" className="underline text-primary">Communication &amp; Template Management</a>.
          </p>
        </div>

        <Tabs value={activeSection} onValueChange={(sid) => {
          const first = SECTIONS.find((s) => s.id === sid)?.leaves[0];
          if (first) goto(first.id);
        }}>
          <TabsList className="flex flex-wrap h-auto">
            {SECTIONS.map((s) => <TabsTrigger key={s.id} value={s.id}>{s.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>

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
