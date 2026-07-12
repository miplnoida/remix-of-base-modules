/**
 * EPIC CH-TEST-2 / CH-TEST-3B — Readiness cards for Test & Diagnostics.
 * Renders per-gate status and, when the validator supplies them, shows the
 * current vs required value and a "fix" deep link to the correct screen.
 */
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReadinessCheck, ReadinessStatus } from "./validateBusinessCommunication";

const ICON: Record<ReadinessStatus, JSX.Element> = {
  ready: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  blocked: <XCircle className="h-4 w-4 text-destructive" />,
  not_configured: <Circle className="h-4 w-4 text-muted-foreground" />,
  unknown: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
};

const LABEL: Record<ReadinessStatus, string> = {
  ready: "Ready",
  warning: "Warning",
  blocked: "Blocked",
  not_configured: "Not configured",
  unknown: "Unknown",
};

export function ReadinessCards({ checks }: { checks: ReadinessCheck[] }) {
  if (!checks.length) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {checks.map((c) => (
        <div key={c.key} className="flex items-start gap-2 rounded-md border p-2.5">
          <div className="mt-0.5">{ICON[c.status]}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{c.label}</span>
              <span className="text-[10px] text-muted-foreground">{LABEL[c.status]}</span>
            </div>
            {(c.message || c.code) && (
              <div className="text-[11px] text-muted-foreground" title={c.message ?? c.code}>
                {c.message ?? c.code}
              </div>
            )}
            {(c.currentValue != null || c.requiredValue != null) && (
              <div className="mt-1 text-[10px] leading-tight">
                {c.currentValue != null && (
                  <div>
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-mono">{c.currentValue}</span>
                  </div>
                )}
                {c.requiredValue != null && (
                  <div>
                    <span className="text-muted-foreground">Required: </span>
                    <span className="font-mono">{c.requiredValue}</span>
                  </div>
                )}
              </div>
            )}
            {c.fixHref && (
              <Link
                to={c.fixHref}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                {c.fixLabel ?? "Open fix screen"} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReadinessCards;
