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
const EmailLayoutsPage = lazy(
  () => import("@/pages/admin/organization/EmailLayoutsPage"),
);
const LegacyBridgeTab = lazy(
  () => import("@/pages/admin/notifications/tabs/LegacyBridgeTab"),
);
const ArchitectureReportTab = lazy(
  () => import("@/pages/admin/notifications/tabs/ArchitectureReportTab"),
);
const RuntimeValidationPanel = lazy(
  () => import("@/pages/admin/notifications/tabs/RuntimeValidationPanel"),
);

/**
 * Enterprise Communication Framework hub.
 *
 * Notification Templates remains the central entry point. Do NOT rename this
 * route — legacy application code links here. It evolved into a five-tab hub:
 *   templates  → Business Templates (business content only; branding resolves at render time)
 *   core       → Core Catalogue (BASE_* layouts + shared shells)
 *   org        → Organization Overrides (communication defaults)
 *   legacy     → Read-only bridge to notification_templates
 *   report     → Architecture / runtime validation report
 */
const VALID_TABS = ["templates", "core", "email-layouts", "org", "legacy", "report"] as const;
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
            <TabsTrigger value="templates">Business Templates</TabsTrigger>
            <TabsTrigger value="core">Core Catalogue</TabsTrigger>
            <TabsTrigger value="org">Organization Overrides</TabsTrigger>
            <TabsTrigger value="legacy">Legacy</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4 space-y-6">
            <Suspense fallback={tabFallback}>
              <RuntimeValidationPanel />
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
          <TabsContent value="legacy" className="mt-4">
            <Suspense fallback={tabFallback}>
              <LegacyBridgeTab />
            </Suspense>
          </TabsContent>
          <TabsContent value="report" className="mt-4">
            <Suspense fallback={tabFallback}>
              <ArchitectureReportTab />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
