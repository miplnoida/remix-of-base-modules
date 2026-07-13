/**
 * EPIC 2B — Shared shell for Communication Hub read-only operations
 * consoles. Keeps every page consistent (breadcrumb, back-to-hub,
 * "Read-only in this phase" banner).
 */
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { ArrowLeft, ShieldAlert } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  section?: string;
  parentBreadcrumbs?: Array<{ label: string; href?: string }>;
  currentBreadcrumbLabel?: string;
  children: React.ReactNode;
}

export default function OperationsShell({
  title,
  subtitle,
  section,
  parentBreadcrumbs,
  currentBreadcrumbLabel,
  children,
}: Props) {
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Communication Hub", href: "/admin/communication-hub" },
    ...(section ? [{ label: section }] : []),
    ...(parentBreadcrumbs ?? []),
    { label: currentBreadcrumbLabel ?? title },
  ];
  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title={title}
          subtitle={subtitle ?? "Enterprise Communication Hub — Operations"}
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: title },
          ]}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/communication-hub"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub</Link>
            </Button>
          }
        />
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Read-only</AlertTitle>
          <AlertDescription>
            No retry, resend, cancel or suppress actions here. Recipient details are masked and provider responses are sanitised.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    </PermissionWrapper>
  );
}
