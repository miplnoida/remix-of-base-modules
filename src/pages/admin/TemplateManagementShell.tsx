/**
 * Communication & Template Management — user-facing shell (OM-4).
 * Route: /admin/template-management[/:section/:leaf][?domain=...]
 *
 * Renders the same underlying section catalogue as Organisation Management but
 * filtered to communication/asset/library/configuration/validation sections so
 * templates are no longer buried inside "Organisation Foundation". Business
 * logic and page components are 100% reused via `_sections.tsx` — this shell
 * only relabels navigation and groups.
 */
import { Suspense, useMemo } from "react";
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import {
  TEMPLATE_SECTIONS,
  ALL_LEAVES,
  CONFIG_DOMAIN_CODES,
} from "./organization/_sections";

const DEFAULT_LEAF = "assets/media";

export default function TemplateManagementShell() {
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
    return DEFAULT_LEAF;
  }, [params, location.pathname, searchParams]);

  const activeSection =
    TEMPLATE_SECTIONS.find((s) => s.leaves.some((l) => l.id === activeLeaf))?.id ?? "assets";
  const currentLeaf =
    ALL_LEAVES.find((l) => l.id === activeLeaf) ??
    TEMPLATE_SECTIONS[0]?.leaves[0] ??
    ALL_LEAVES[0];

  const buildHref = (leafId: string): string => {
    if (leafId.startsWith("configuration-center/")) {
      const domain = leafId.split("/")[1];
      return `/admin/template-management/configuration-center?domain=${domain}`;
    }
    return `/admin/template-management/${leafId}`;
  };

  const goto = (leafId: string) => navigate(buildHref(leafId));
  const sectionCrumb = TEMPLATE_SECTIONS.find((s) => s.id === activeSection)?.label ?? "Assets";

  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-4">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Communication &amp; Template Management &nbsp;/&nbsp; {sectionCrumb} &nbsp;/&nbsp;{" "}
            <span className="font-medium">{currentLeaf.label}</span>
          </div>
          <h1 className="text-2xl font-semibold">Communication &amp; Template Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage official communication templates and related resources — media
            assets, brand layouts, template library, channels, languages, and
            usage/impact validation. Organisation Foundation (offices, departments,
            designations) lives under Organisation Management.
          </p>
        </div>

        <Tabs
          value={activeSection}
          onValueChange={(sid) => {
            const first = TEMPLATE_SECTIONS.find((s) => s.id === sid)?.leaves[0];
            if (first) goto(first.id);
          }}
        >
          <TabsList className="flex flex-wrap h-auto">
            {TEMPLATE_SECTIONS.map((s) => (
              <TabsTrigger key={s.id} value={s.id}>
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {(() => {
          const section = TEMPLATE_SECTIONS.find((s) => s.id === activeSection);
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
