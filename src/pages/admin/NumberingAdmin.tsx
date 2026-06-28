import { useSearchParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const NumberingRulesAdmin = lazy(() => import("@/pages/admin/NumberingRulesAdmin"));
const ReferenceSequencesAdmin = lazy(
  () => import("@/pages/systemAdmin/ReferenceSequencesAdmin"),
);

const VALID_TABS = ["rules", "sequences"] as const;
type TabKey = (typeof VALID_TABS)[number];

const tabFallback = (
  <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
    Loading…
  </div>
);

/**
 * Canonical Numbering admin page.
 *
 * Phase 3 dedup: merges
 *   - /admin/numbering-rules     (NumberingRulesAdmin)
 *   - /admin/reference-sequences (ReferenceSequencesAdmin)
 * into one tabbed page at /admin/numbering.
 */
export default function NumberingAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as TabKey)
    : "rules";

  return (
    <PermissionWrapper moduleName="system_administration">
      <div className="container mx-auto p-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "rules") next.delete("tab");
            else next.set("tab", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="rules">Numbering Rules</TabsTrigger>
            <TabsTrigger value="sequences">Reference Sequences</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="mt-4">
            <Suspense fallback={tabFallback}>
              <NumberingRulesAdmin />
            </Suspense>
          </TabsContent>
          <TabsContent value="sequences" className="mt-4">
            <Suspense fallback={tabFallback}>
              <ReferenceSequencesAdmin />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
