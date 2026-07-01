/**
 * Organization Management — Direct Leaf renderer.
 * Route: /admin/org/:section/:leaf   (also supports /admin/org/configuration-center?domain=...)
 * Renders a single leaf with a compact breadcrumb — no top-level section tabs.
 */
import { Suspense, useMemo } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { SECTIONS, ALL_LEAVES, CONFIG_DOMAIN_CODES } from "./_sections";

export default function OrganizationDirectLeaf() {
  const params = useParams();
  const location = useLocation();
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

  const section = SECTIONS.find((s) => s.leaves.some((l) => l.id === activeLeaf));
  const currentLeaf = ALL_LEAVES.find((l) => l.id === activeLeaf) ?? ALL_LEAVES[0];
  const sectionLabel = section?.label ?? "Foundation";

  const overviewHref = activeLeaf.startsWith("configuration-center/")
    ? `/admin/org/overview/configuration-center?domain=${activeLeaf.split("/")[1]}`
    : `/admin/org/overview/${activeLeaf}`;

  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Organization Management &nbsp;/&nbsp; {sectionLabel} &nbsp;/&nbsp;{" "}
            <span className="font-medium">{currentLeaf.label}</span>
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Direct</span>
            <Link to={overviewHref} className="ml-3 text-primary hover:underline">Open in Overview →</Link>
          </div>
          <h1 className="text-xl font-semibold">{currentLeaf.label}</h1>
        </div>
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
          {currentLeaf.render()}
        </Suspense>
      </div>
    </PermissionWrapper>
  );
}
