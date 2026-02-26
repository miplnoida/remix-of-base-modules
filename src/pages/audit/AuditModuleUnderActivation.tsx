import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ArrowLeft, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuditRouteByPath } from '@/config/auditRouteConfig';

/**
 * Placeholder page for audit modules that are under activation.
 * Matches the existing page shell/header pattern used by other audit pages.
 * Shown when a feature flag is disabled.
 */
export default function AuditModuleUnderActivation() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeEntry = getAuditRouteByPath(location.pathname);

  const moduleName = routeEntry?.label || 'Module';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{moduleName}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            This module is under activation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The <strong>{moduleName}</strong> module is currently being configured and will be available soon.
            Please check back later or contact your system administrator for more information.
          </p>
          {routeEntry && (
            <p className="text-xs text-muted-foreground mt-3">
              Module: {routeEntry.moduleKey} | Category: {routeEntry.category}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
