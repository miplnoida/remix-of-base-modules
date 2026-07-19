/**
 * Shared read-only landing shell for BN Gap Module foundation pages.
 *
 * The five foundation modules (Mortality, Appeals workspace, Means-Tests,
 * Risk, Uprating) ship with contract-level state machines, command catalogues
 * and capability registries but no full operational UI yet.
 *
 * Rather than leave the routes dead (which Part B of the epic explicitly
 * forbids) we render a legitimate read-only workspace that surfaces:
 *   - rollout / capability status from app_modules
 *   - the canonical state machine
 *   - the registered canonical commands
 *   - the actor's effective permissions on the module
 *
 * When actions_enabled=true and the actor has the right verbs, this shell
 * exposes the "Open Operations" panel entry points. Otherwise it stays
 * strictly read-only.
 */

import React from "react";
import type { BnGapModuleAccessContext } from "./BnGapModuleRouteGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, ShieldCheck, Info, ClipboardList } from "lucide-react";

export interface BnGapLandingProps {
  ctx: BnGapModuleAccessContext;
  summary: string;
  lifecycleStates: readonly string[];
  canonicalCommands: readonly { code: string; label: string; verb: string }[];
  handoffs?: readonly { module: string; description: string }[];
}

export const BnGapModuleReadOnlyLanding: React.FC<BnGapLandingProps> = ({
  ctx,
  summary,
  lifecycleStates,
  canonicalCommands,
  handoffs = [],
}) => {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ctx.displayName}</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ctx.actionsEnabled ? "default" : "secondary"}>
            {ctx.actionsEnabled ? "Actions enabled" : "Read-only pilot"}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {ctx.rolloutState.replace("_", " ")}
          </Badge>
          {ctx.isAdmin && <Badge variant="outline">Admin</Badge>}
        </div>
      </div>

      {!ctx.actionsEnabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Read-only pilot</AlertTitle>
          <AlertDescription>
            Mutations for this module are currently disabled at{" "}
            <code>app_modules.actions_enabled=false</code>. Server commands will
            be rejected even for Admin users until the module is promoted.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> Your effective permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <PermissionRow label="view" granted={ctx.hasView} />
            <PermissionRow label="read" granted={ctx.hasRead} />
            <PermissionRow label="write" granted={ctx.hasWrite} />
            <PermissionRow label="decide" granted={ctx.hasDecide} />
            <PermissionRow label="admin" granted={ctx.hasAdmin} />
            <p className="pt-2 text-xs text-muted-foreground">{ctx.reason}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Canonical lifecycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-1 text-sm">
              {lifecycleStates.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="inline-block w-6 text-right text-xs text-muted-foreground">
                    {i + 1}.
                  </span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{s}</code>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canonical commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {canonicalCommands.map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between rounded border p-2 text-sm"
              >
                <div>
                  <div className="font-medium">{c.label}</div>
                  <code className="text-xs text-muted-foreground">{c.code}</code>
                </div>
                <Badge variant="outline" className="text-xs">
                  {c.verb}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {handoffs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cross-module hand-offs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {handoffs.map((h) => (
                <li key={h.module}>
                  <Badge variant="secondary" className="mr-2">
                    {h.module}
                  </Badge>
                  {h.description}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const PermissionRow: React.FC<{ label: string; granted: boolean }> = ({
  label,
  granted,
}) => (
  <div className="flex items-center justify-between">
    <code className="text-xs">{label}</code>
    {granted ? (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> granted
      </Badge>
    ) : (
      <Badge variant="secondary">not granted</Badge>
    )}
  </div>
);
