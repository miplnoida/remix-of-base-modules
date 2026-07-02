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
const OrganizationEmailDefaultsPage = lazy(
  () => import("@/pages/admin/organization/OrganizationEmailDefaultsPage"),
);
const BaseLayoutsPage = lazy(
  () => import("@/pages/admin/organization/BaseLayoutsPage"),
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
const EmailAuditPage = lazy(
  () => import("@/pages/admin/notifications/tabs/EmailAuditPage"),
);

/**
 * Enterprise Communication Framework hub.
 * Tabs: Business Templates / Core Catalogue / Email Layouts / Email Defaults /
 *       Organization Overrides / Audit / Legacy / Report.
 */
const VALID_TABS = ["templates", "core", "base-layouts", "email-defaults", "org", "audit", "legacy", "report"] as const;
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
            <TabsTrigger value="base-layouts">Base Layouts</TabsTrigger>
            <TabsTrigger value="email-defaults">Email Defaults</TabsTrigger>
            <TabsTrigger value="org">Organization Overrides</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
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
          <TabsContent value="base-layouts" className="mt-4">
            <Suspense fallback={tabFallback}>
              <BaseLayoutsPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="email-defaults" className="mt-4">
            <Suspense fallback={tabFallback}>
              <OrganizationEmailDefaultsPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="org" className="mt-4">
            <Suspense fallback={tabFallback}>
              <OrgNotificationTemplatesPage />
            </Suspense>
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <Suspense fallback={tabFallback}>
              <EmailAuditPage />
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
