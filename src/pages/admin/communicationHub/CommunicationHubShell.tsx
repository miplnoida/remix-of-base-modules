/**
 * Enterprise Communication Hub — landing shell (Phase 1).
 * Route: /admin/communication-hub
 *
 * This is a consolidation surface only. Every card links to an EXISTING
 * route (or to a placeholder page owned by this hub). No sending
 * behavior, no data model changes.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import {
  FileText, Palette, Send, Activity, Inbox, ShieldCheck, Info, ArrowRight,
} from "lucide-react";

type Item = { label: string; href: string; note?: string; deprecated?: boolean; comingSoon?: boolean; readOnly?: boolean };
type Group = { title: string; icon: React.ComponentType<{ className?: string }>; description: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Templates & Content",
    icon: FileText,
    description: "Author, version and govern the canonical template master, text blocks and document assets.",
    items: [
      { label: "Template Library", href: "/admin/notification-templates", note: "All channels & modules" },
      { label: "Template Management Workspace", href: "/admin/template-management" },
      { label: "Text Blocks", href: "/admin/org/library/text-blocks" },
      { label: "Document Assets", href: "/admin/org/assets/document-assets" },
    ],
  },
  {
    title: "Branding & Assets",
    icon: Palette,
    description: "Media, letterheads, signatures, headers/footers, disclaimers and portal branding.",
    items: [
      { label: "Media Library", href: "/admin/org/assets/media" },
      { label: "Letterheads", href: "/admin/org/assets/letterheads" },
      { label: "Signatures", href: "/admin/org/assets/signatures" },
      { label: "Headers / Footers", href: "/admin/org/assets/headers-footers" },
      { label: "Disclaimers", href: "/admin/org/assets/disclaimers" },
      { label: "Portal Branding", href: "/admin/org/assets/portal-branding" },
    ],
  },
  {
    title: "Delivery Infrastructure",
    icon: Send,
    description: "Providers, channels and configuration binding. Provider Settings is the source of truth.",
    items: [
      { label: "Provider Settings", href: "/admin/notifications/providers", note: "Database-backed" },
      { label: "Channels (mock)", href: "/admin/notifications/channels", deprecated: true },
      { label: "Configuration Center", href: "/admin/org/configuration-center?domain=communication" },
    ],
  },
  {
    title: "Operations",
    icon: Activity,
    description: "Runtime lifecycle surfaces. Read-only in this phase — retry/resend/cancel controls land later.",
    items: [
      { label: "Control Center", href: "/admin/communication-hub/control-center", note: "Safety & dispatch settings" },
      { label: "Communication Requests", href: "/admin/communication-hub/requests" },
      { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor", readOnly: true },
      { label: "Dispatch Register", href: "/admin/communication-hub/dispatch-register", readOnly: true },
      { label: "Lifecycle Event Log", href: "/admin/communication-hub/lifecycle-log", readOnly: true },
      { label: "Failed & Retry Queue", href: "/admin/communication-hub/retry-queue", readOnly: true },
      { label: "Print Queue", href: "/admin/communication-hub/print-queue", readOnly: true },
    ],
  },
  {
    title: "Correspondence",
    icon: Inbox,
    description: "Incoming, outgoing, search, archive and notification log.",
    items: [
      { label: "Correspondence Workspace", href: "/correspondence/dashboard" },
      { label: "Incoming Communications", href: "/correspondence/incoming" },
      { label: "Outgoing Communications", href: "/correspondence/outgoing" },
      { label: "Search & History", href: "/correspondence/search" },
      { label: "Archive", href: "/correspondence/archive" },
      { label: "Notification Log", href: "/admin/notifications/log" },
    ],
  },
  {
    title: "Governance & Validation",
    icon: ShieldCheck,
    description: "Health, impact analysis, usage tracing and communication governance gates.",
    items: [
      { label: "Health & Impact", href: "/admin/org/validation/health" },
      { label: "Usage Analysis", href: "/admin/org/validation/usage" },
      { label: "Communication Governance", href: "/admin/template-management/validation" },
    ],
  },
];

export default function CommunicationHubShell() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title="Enterprise Communication Hub"
          subtitle="One consolidated entry point for templates, branding, delivery, correspondence and governance."
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Enterprise Communication Hub" },
          ]}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Phase 1 — consolidation only</AlertTitle>
          <AlertDescription>
            This hub re-homes existing template, branding, provider, correspondence and governance
            screens under a single navigation shell. No configuration values, database tables, or
            runtime sending behavior have changed. Operations tiles marked <em>Coming soon</em> are
            placeholders for Phase 2.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((g) => {
            const Icon = g.icon;
            return (
              <Card key={g.title} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {g.title}
                  </CardTitle>
                  <CardDescription>{g.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-1.5">
                    {g.items.map((it) => (
                      <li key={it.href}>
                        <Link
                          to={it.href}
                          className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{it.label}</span>
                            {it.note && (
                              <span className="text-xs text-muted-foreground">— {it.note}</span>
                            )}
                            {it.deprecated && (
                              <Badge variant="outline" className="text-xs">Deprecated</Badge>
                            )}
                            {it.comingSoon && (
                              <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                            )}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PermissionWrapper>
  );
}
