/**
 * Configuration Center — Phase 1 placeholder.
 *
 * First consumer of the generic `core_configuration_assignment` engine.
 * Phase 5 implementation will add:
 *   - Domain × Business Event × Scope × Resource assignment grid
 *   - Rule-set editor (channel, language, fallback, condition, priority)
 *   - Runtime resolution preview (calls resolveConfiguration() and renders
 *     the trace showing which scope tier won and why)
 *
 * See docs/architecture/configuration-assignment-engine.md and
 * docs/architecture/scope-precedence.md.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const DOMAINS = [
  { code: "communication", label: "Communication", status: "planned-phase-5", enabled: true },
  { code: "workflow",      label: "Workflow",       status: "planned-phase-6", enabled: false },
  { code: "numbering",     label: "Numbering",      status: "planned-phase-6", enabled: false },
  { code: "branding",      label: "Branding",       status: "planned-phase-6", enabled: false },
  { code: "reporting",     label: "Reporting",      status: "planned-phase-7", enabled: false },
  { code: "ai",            label: "AI",             status: "planned-phase-7", enabled: false },
];

export default function ConfigurationCenterPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Configuration Center</h2>
        <p className="text-sm text-muted-foreground">
          Single place where scope decides which template, asset, sequence, theme, model or workflow
          is used. Communication is the first consumer; other domains follow the same engine.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Phase 1 — engine scaffolded, UI arriving in Phase 5.</AlertTitle>
        <AlertDescription>
          The generic <code>core_configuration_assignment</code> table is created and empty. The
          Communication Configuration Center (assignment grid + runtime resolution preview) is the
          next shippable slice. Scope precedence is fixed and documented in
          <code className="mx-1">docs/architecture/scope-precedence.md</code>.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered domains</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DOMAINS.map((d) => (
            <div key={d.code} className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <div className="font-medium">{d.label}</div>
                <div className="text-xs text-muted-foreground">domain: <code>{d.code}</code></div>
              </div>
              <Badge variant={d.enabled ? "default" : "secondary"}>{d.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scope precedence (most specific wins)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm space-y-1 list-decimal pl-6">
            <li>USER</li>
            <li>WORKFLOW_STAGE</li>
            <li>WORKFLOW</li>
            <li>LOCATION</li>
            <li>DEPARTMENT</li>
            <li>MODULE</li>
            <li>ORG</li>
            <li>GLOBAL (system default)</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
