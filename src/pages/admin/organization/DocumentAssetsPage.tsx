/**
 * DocumentAssetsPage — DEPRECATED (Phase 8, retained as read-only stub).
 *
 * The original page was a CRUD writer on the legacy `comm_asset_mapping`
 * table. Document-level asset overrides now flow through the Configuration
 * Center engine (`core_configuration_assignment`, domain='branding' or
 * 'communication'). This stub is kept so any bookmarked URLs and sidebar
 * entries continue to render an explanatory panel instead of a 404.
 *
 * Remove this file entirely when the sidebar link is retired and
 * `comm_asset_mapping` is dropped — see
 * docs/architecture/comm-asset-mapping-cleanup.md.
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PermissionWrapper } from "@/components/ui/permission-wrapper";
import { AlertTriangle, ArrowRight } from "lucide-react";

export default function DocumentAssetsPage() {
  return (
    <PermissionWrapper moduleName="organization_management">
      <div className="container mx-auto p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Document Assets</h1>
          <p className="text-sm text-muted-foreground">
            Per-document logo, header, footer, seal, signature, QR and watermark overrides.
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This screen has moved.</AlertTitle>
          <AlertDescription>
            Document-level asset overrides are now managed by the Configuration Center under
            the Branding and Communication domains. The legacy <code>comm_asset_mapping</code>
            table is deprecated and read-only pending removal.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where to configure now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Branding domain</strong> — logos, letterheads, seals, portal themes, document assets.
              <div className="mt-1">
                <Button asChild size="sm">
                  <Link to="/admin/org/configuration-center">
                    Open Configuration Center <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
            <div>
              <strong>Communication domain</strong> — per-document template, signature and text-block overrides.
              <div className="mt-1">
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/org/configuration-center">
                    Open Communication assignments <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Runtime document generation reads exclusively from the Configuration Center
              engine. No further writes should be made to <code>comm_asset_mapping</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
