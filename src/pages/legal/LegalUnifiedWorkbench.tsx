import { useState, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, Users, ArrowDownToLine, Briefcase, Calendar, Scale } from "lucide-react";
import { useLegalEnterpriseLabels } from "@/hooks/legal/useLegalEnterpriseLabels";
import { EnterpriseContextDebugPanel } from "@/components/legal/EnterpriseContextDebugPanel";

/**
 * Phase 3 — Unified Legal Workbench shell.
 *
 * Replaces 4 separate workbench pages with one tabbed shell.
 * Each tab mounts the existing component lazily so the legacy routes keep working.
 *
 * Header labels (module name, department name) are resolved through the
 * Enterprise Context Resolver — never hardcoded.
 *
 * Tabs:
 *  - my-work        → Legal Matters workbench (LegalWorkbench)
 *  - referrals      → Department Referrals (LegalReferralsWorkbench)
 *  - advice         → Advice & Contract Review (AdviceWorkbench, bucket=team)
 *  - awaiting       → Advice Awaiting Info (bucket=info-requested)
 *  - calendar       → Hearing Calendar link
 */

const LegalWorkbench = lazy(() => import("@/pages/legal/LegalWorkbench"));
const LegalReferralsWorkbench = lazy(() => import("@/pages/legal/LegalReferralsWorkbench"));
const AdviceWorkbench = lazy(() => import("@/pages/legal/contract-review/AdviceWorkbench"));

type TabId = "my-work" | "referrals" | "advice" | "awaiting" | "calendar";

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "my-work",   label: "My Work / Matters", icon: Briefcase },
  { id: "referrals", label: "Department Referrals", icon: ArrowDownToLine },
  { id: "advice",    label: "Advice & Contract Reviews", icon: Inbox },
  { id: "awaiting",  label: "Awaiting Information", icon: Users },
  { id: "calendar",  label: "Calendar", icon: Calendar },
];

function Fallback() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading workbench…</CardContent>
    </Card>
  );
}

export default function LegalUnifiedWorkbench() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("tab") as TabId) || "my-work";
  const [tab, setTab] = useState<TabId>(initial);
  const labels = useLegalEnterpriseLabels();

  const onChange = (v: string) => {
    setTab(v as TabId);
    const next = new URLSearchParams(params);
    next.set("tab", v);
    setParams(next, { replace: true });
  };

  const title = `${labels.moduleName} Workbench`;
  const subtitle = `Unified queue for matters, referrals, advice and calendar · ${labels.departmentName}`;

  return (
    <div className="container mx-auto p-6 space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: labels.moduleName, href: "/legal/lg/dashboard" }, { label: "Workbench" }]}
      />

      <EnterpriseContextDebugPanel
        moduleCode="LEGAL"
        trace={labels.trace}
        labels={{
          moduleName: labels.moduleName,
          departmentName: labels.departmentName,
          organizationName: labels.organizationName,
          locationName: labels.locationName,
        }}
      />

      <Tabs value={tab} onValueChange={onChange} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger key={id} value={id} className="gap-2">
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="my-work">
          <Suspense fallback={<Fallback />}><LegalWorkbench /></Suspense>
        </TabsContent>
        <TabsContent value="referrals">
          <Suspense fallback={<Fallback />}><LegalReferralsWorkbench /></Suspense>
        </TabsContent>
        <TabsContent value="advice">
          <Suspense fallback={<Fallback />}><AdviceWorkbench bucket="team" /></Suspense>
        </TabsContent>
        <TabsContent value="awaiting">
          <Suspense fallback={<Fallback />}><AdviceWorkbench bucket="info-requested" /></Suspense>
        </TabsContent>
        <TabsContent value="calendar">
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <Scale className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Hearing calendar opens in its own workspace.</p>
              <a className="text-primary underline text-sm" href="/legal/lg/hearings">Open Hearing Calendar →</a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
