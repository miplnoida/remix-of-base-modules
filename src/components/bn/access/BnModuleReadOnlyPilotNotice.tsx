/**
 * BnModuleReadOnlyPilotNotice
 *
 * Minimal placeholder rendered inside a `BnModuleRouteGate` for business
 * modules that are currently in read-only pilot (i.e. `actions_enabled=false`).
 *
 * Intentionally lightweight: it exists so the routes are not dead links
 * while the module's canonical UI is being assembled. The rich readiness
 * catalogue (commands, lifecycle, capability matrix) lives in Benefits
 * Diagnostics and MUST NOT be rendered on business routes.
 */
import React from "react";
import type { BnModuleAccessContext } from "./BnModuleRouteGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export interface BnModuleReadOnlyPilotNoticeProps {
  ctx: BnModuleAccessContext;
  title: string;
  summary: string;
}

export const BnModuleReadOnlyPilotNotice: React.FC<BnModuleReadOnlyPilotNoticeProps> = ({
  ctx,
  title,
  summary,
}) => {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">{title}</h1>
        {!ctx.actionsEnabled && (
          <Badge variant="secondary">Read-only pilot</Badge>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>About this module</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>{summary}</p>
          {!ctx.actionsEnabled && (
            <p className="mt-3">
              Actions are currently disabled. Full workflow will be enabled
              once the module completes its internal pilot certification.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
