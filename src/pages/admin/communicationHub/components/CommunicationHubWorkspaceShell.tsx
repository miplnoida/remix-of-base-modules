/**
 * EPIC 4A-UX-IA — Shared workspace shell for Communication Hub sub-workspaces.
 *
 * Renders: PageHeader with breadcrumbs + back link, a standard safety banner,
 * optional quick-link nav, and children. Read-only shell — no sending or
 * mutating logic. Individual panels retain their own permission gates.
 */
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { ArrowLeft, ArrowRight, ShieldAlert, Info } from "lucide-react";

export type WorkspaceQuickLink = {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
};

export type WorkspaceRisk = "safe" | "read-only" | "action-capable" | "high-risk";

interface Props {
  title: string;
  purpose: string;
  risk?: WorkspaceRisk;
  permissionModule?: string;
  quickLinks?: WorkspaceQuickLink[];
  children: React.ReactNode;
}

function RiskBadge({ risk }: { risk: WorkspaceRisk }) {
  const map: Record<WorkspaceRisk, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    "safe":            { label: "Safe / informational", variant: "secondary" },
    "read-only":       { label: "Read-only",            variant: "outline" },
    "action-capable":  { label: "Action-capable",       variant: "default" },
    "high-risk":       { label: "High-risk actions",    variant: "destructive" },
  };
  const cfg = map[risk];
  return <Badge variant={cfg.variant} className="text-[11px]">{cfg.label}</Badge>;
}

export function CommunicationHubSafetyBanner({ risk = "read-only" }: { risk?: WorkspaceRisk }) {
  if (risk === "high-risk") {
    return (
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>High-risk actions</AlertTitle>
        <AlertDescription>
          Actions here can affect live sending. Every operation is server-gated and requires typed confirmation.
        </AlertDescription>
      </Alert>
    );
  }
  if (risk === "safe" || risk === "read-only") return null;
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Action-capable screen</AlertTitle>
      <AlertDescription>
        Certain actions require permission and pass server-side safeguards. No live email is sent from this screen.
      </AlertDescription>
    </Alert>
  );
}

export function CommunicationHubSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function CommunicationHubQuickLinks({ links }: { links: WorkspaceQuickLink[] }) {
  if (!links.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Related</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 md:grid-cols-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                to={l.href}
                className="group flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{l.label}</span>
                  {l.description && (
                    <span className="ml-2 text-xs text-muted-foreground">{l.description}</span>
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
}

export default function CommunicationHubWorkspaceShell({
  title,
  purpose,
  risk = "read-only",
  permissionModule = "system_administration",
  quickLinks,
  children,
}: Props) {
  return (
    <PermissionWrapper moduleName={permissionModule}>
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title={title}
          subtitle={purpose}
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: title },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <RiskBadge risk={risk} />
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/communication-hub">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
                </Link>
              </Button>
            </div>
          }
        />
        <CommunicationHubSafetyBanner risk={risk} />
        {children}
        {quickLinks && quickLinks.length > 0 && <CommunicationHubQuickLinks links={quickLinks} />}
      </div>
    </PermissionWrapper>
  );
}
