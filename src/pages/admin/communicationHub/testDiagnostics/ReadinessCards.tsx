/**
 * EPIC CH-TEST-2 — Readiness cards for the Test & Diagnostics console.
 *
 * Displays one small tile per gate (Event, Template, Tokens, Recipient,
 * Sender, Policy, Review, Duplicate, Channel, Provider, Live).
 * Pure presentation — data is supplied by validateBusinessCommunication.
 */
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Circle } from "lucide-react";
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
              <div className="text-[11px] text-muted-foreground truncate" title={c.message ?? c.code}>
                {c.message ?? c.code}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReadinessCards;
