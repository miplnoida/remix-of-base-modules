/**
 * Shared Phase 2 placeholder used by all Enterprise Communication Hub
 * operations pages. Renders no data — Phase 1 introduces no new tables.
 */
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PlaceholderPageProps {
  title: string;
  purpose: string;
  futureSources: string[];
}

export default function PlaceholderPage({ title, purpose, futureSources }: PlaceholderPageProps) {
  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-6">
        <PageHeader
          title={title}
          subtitle="Enterprise Communication Hub — Operations"
          breadcrumbs={[
            { label: "Admin", href: "/admin" },
            { label: "Communication Hub", href: "/admin/communication-hub" },
            { label: title },
          ]}
          actions={
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/communication-hub">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
              </Link>
            </Button>
          }
        />

        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Coming in Phase 2</AlertTitle>
          <AlertDescription>
            This screen is reserved for a future release. No data is displayed and no new database
            tables have been created for it in Phase 1.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What this screen will do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>{purpose}</p>
            <div>
              <div className="font-medium mb-1">Intended data sources</div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                {futureSources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
                <li><em>To be defined — no new tables introduced in Phase 1.</em></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
