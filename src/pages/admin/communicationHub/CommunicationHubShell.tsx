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
  LayoutDashboard, Boxes, FlaskConical, Rocket,
} from "lucide-react";
import TraceCenterSummaryPanel from "./TraceCenterSummaryPanel";

type Item = { label: string; href: string; note?: string; deprecated?: boolean; comingSoon?: boolean; readOnly?: boolean };
type Group = { title: string; icon: React.ComponentType<{ className?: string }>; description: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Start here",
    icon: LayoutDashboard,
    description: "Safety dashboard and the workspaces that make up the Communication Hub.",
    items: [
      { label: "Safety Switchboard", href: "/admin/communication-hub/safety", note: "Plain-language safety gates & mode presets" },
      { label: "Control Center", href: "/admin/communication-hub/control-center", note: "Safety & global controls" },
    ],
  },
  {
    title: "Operations",
    icon: Activity,
    description: "Runtime monitoring and evidence. Reads are live; operator actions are permission-gated.",
    items: [
      { label: "Trace Center", href: "/admin/communication-hub/traces", note: "Universal communication trace & diagnosis" },
      { label: "Recipient Policy (canonical)", href: "/admin/communication-hub/recipient-policy", note: "CH-SIMPLE-P2B configurable modes, limits & audit" },
      { label: "Recipient Control Center", href: "/admin/communication-hub/recipient-control", note: "Legacy allowlists & release modes" },
      { label: "Communication Requests", href: "/admin/communication-hub/requests" },
      { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor", readOnly: true },
      { label: "Dispatch Register", href: "/admin/communication-hub/dispatch-register", readOnly: true },
      { label: "Lifecycle Event Log", href: "/admin/communication-hub/lifecycle-log", readOnly: true },
      { label: "Failed & Retry Queue", href: "/admin/communication-hub/retry-queue", note: "Operator actions available" },
      { label: "Print Queue", href: "/admin/communication-hub/print-queue", readOnly: true },
    ],
  },
  {
    title: "Design & Templates",
    icon: Palette,
    description: "Assign templates to module/event/channel, author templates, and configure providers.",
    items: [
      { label: "Event → Template mapping", href: "/admin/communication-hub/design", note: "Action-capable" },
      { label: "Template Library", href: "/admin/notification-templates" },
      { label: "Template Management Workspace", href: "/admin/template-management" },
      { label: "Provider Settings", href: "/admin/notifications/providers" },
      { label: "Text Blocks", href: "/admin/org/library/text-blocks" },
      { label: "Document Assets", href: "/admin/org/assets/document-assets" },
    ],
  },
  {
    title: "Module Onboarding",
    icon: Boxes,
    description: "Onboard Legal, Insured Person, Benefits, Employer, Compliance and Appeals modules onto the sending spine.",
    items: [
      { label: "Business Module Registry", href: "/admin/communication-hub/onboarding" },
      { label: "Readiness Matrix", href: "/admin/communication-hub/onboarding" },
    ],
  },
  {
    title: "Testing & Controlled Validation",
    icon: FlaskConical,
    description: "Internal dry-run and controlled validation tools. Recipient locked to the allowlist.",
    items: [
      { label: "Communication Test & Diagnostics", href: "/admin/communication-hub/test-diagnostics", note: "Canonical test path — validate, preview, dry-run, controlled live" },
      { label: "Event Validation Console", href: "/admin/communication-hub/pilots", note: "Action-capable" },
      { label: "Operator Action Rehearsal", href: "/admin/communication-hub/pilots" },
      { label: "Admin Test Notice", href: "/admin/communication-hub/pilots" },
      { label: "Manual Dispatch Test", href: "/admin/communication-hub/pilots" },
    ],
  },
  {
    title: "Governance & Live Control",
    icon: Rocket,
    description: "Approve live-readiness, open and close live windows, and run governed controlled live sends. High-risk.",
    items: [
      { label: "Live Readiness Governance", href: "/admin/communication-hub/governance" },
      { label: "Event Live Control", href: "/admin/communication-hub/governance" },
      { label: "Live Window Wizard", href: "/admin/communication-hub/governance" },
      { label: "Governed Controlled Live Send", href: "/admin/communication-hub/governance", note: "High-risk" },
      { label: "Send Policies", href: "/admin/communication-hub/governance/send-policies" },
      { label: "Automation Settings", href: "/admin/communication-hub/governance/automation-settings" },
    ],
  },
  {
    title: "Production Readiness",
    icon: ShieldCheck,
    description: "Assess and promote events for controlled live sending. Central entry point for production readiness activities.",
    items: [
      { label: "Production Readiness Command Center", href: "/admin/communication-hub/production-readiness", note: "Single view of gates, blockers & next step" },
      { label: "All Events Live Readiness", href: "/admin/communication-hub/live-readiness/all-events", note: "Per-event live-manual eligibility & controlled promotion" },
      { label: "Control Center", href: "/admin/communication-hub/control-center", note: "Global safety & dispatch controls" },
      { label: "Communication Test & Diagnostics", href: "/admin/communication-hub/test-diagnostics" },
      { label: "Trace Center", href: "/admin/communication-hub/traces" },
      { label: "Delivery Monitor", href: "/admin/communication-hub/delivery-monitor", readOnly: true },
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
    title: "Settings & Audit",
    icon: ShieldCheck,
    description: "Global controls, allowlists, and control-setting audit timeline.",
    items: [
      { label: "Control Center — Settings", href: "/admin/communication-hub/control-center" },
      { label: "Control Center — Audit", href: "/admin/communication-hub/control-center" },
      { label: "Communication Governance", href: "/admin/template-management/validation" },
      { label: "Health & Impact", href: "/admin/org/validation/health" },
      { label: "Usage Analysis", href: "/admin/org/validation/usage" },
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
            { label: "Communication Hub" },
          ]}
        />

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How this hub works</AlertTitle>
          <AlertDescription>
            Operational screens show live data. Live email is only produced via the Governed Controlled Live Send in <em>Governance & Live Control</em>; all other screens are safe.
          </AlertDescription>
        </Alert>

        <TraceCenterSummaryPanel />

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
                            {it.readOnly && (
                              <Badge variant="secondary" className="text-xs">Read-only</Badge>
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
