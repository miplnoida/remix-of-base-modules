import { useSearchParams } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";

const NotificationTemplateManager = lazy(
  () => import("@/pages/admin/notifications/NotificationTemplateManager"),
);
const CoreTemplateAdmin = lazy(() => import("@/pages/admin/CoreTemplateAdmin"));
const OrgNotificationTemplatesPage = lazy(
  () => import("@/pages/admin/organization/NotificationTemplatesPage"),
);

/**
 * Canonical Notification Templates admin page.
 *
 * Phase 3 dedup: merges five former admin surfaces
 *   - /admin/notifications/templates              (legacy AdminNotificationTemplates)
 *   - /admin/notifications/notification-templates (NotificationTemplateManager — richest)
 *   - /admin/organization/notification-templates  (Org overrides)
 *   - /admin/core-templates                       (Core catalogue + usage map)
 *   - /notifications/templates                    (TemplateManagement — duplicate)
 * into one tabbed page at /admin/notification-templates.
 */
const VALID_TABS = ["templates", "core", "org"] as const;
type TabKey = (typeof VALID_TABS)[number];

const tabFallback = (
  <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground text-sm">
    Loading…
  </div>
);

export default function NotificationTemplatesAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: TabKey = (VALID_TABS as readonly string[]).includes(raw ?? "")
    ? (raw as TabKey)
    : "templates";

  return (
    <PermissionWrapper moduleName="notification_templates">
      <div className="container mx-auto p-6">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            const next = new URLSearchParams(searchParams);
            if (value === "templates") next.delete("tab");
            else next.set("tab", value);
            setSearchParams(next, { replace: true });
          }}
        >
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="core">Core Catalogue</TabsTrigger>
            <TabsTrigger value="org">Organization Overrides</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4">
            <Suspense fallback={tabFallback}>
              <NotificationTemplateManager />
            </Suspense>
          </TabsContent>
          <TabsContent value="core" className="mt-4">
            <Suspense fallback={tabFallback}>
              <CoreTemplateAdmin />
            </Suspense>
          </TabsContent>
          <TabsContent value="org" className="mt-4">
            <Suspense fallback={tabFallback}>
              <OrgNotificationTemplatesPage />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
