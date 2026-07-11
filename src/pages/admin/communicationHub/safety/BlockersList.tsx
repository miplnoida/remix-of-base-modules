/**
 * EPIC CH-SAFE-2 — Reusable list of plain-language blockers.
 *
 * Given raw blocker codes (as returned by the pilot / policy evaluators),
 * renders each with a human headline + message + fix link, keeping the
 * technical code visible under a small "Details" chip.
 */
import { Link } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { explainBlockers } from "./plainLanguageBlockers";

interface Props {
  codes: Array<string | null | undefined> | null | undefined;
  title?: string;
  emptyMessage?: string;
  compact?: boolean;
}

const SEVERITY_TONE: Record<string, "default" | "destructive"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "default",
};

export function BlockersList({ codes, title = "Why this is blocked", emptyMessage, compact }: Props) {
  const items = explainBlockers(codes);
  if (items.length === 0) {
    return emptyMessage ? (
      <div className="text-xs text-muted-foreground">{emptyMessage}</div>
    ) : null;
  }
  return (
    <div className="space-y-2">
      {title && <div className="text-xs font-medium text-muted-foreground uppercase">{title}</div>}
      {items.map((b) => (
        <Alert key={b.code} variant={SEVERITY_TONE[b.severity] ?? "default"} className={compact ? "py-2" : ""}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            {b.headline}
            <Badge variant="outline" className="text-[10px] font-mono">{b.code}</Badge>
          </AlertTitle>
          <AlertDescription>
            <div>{b.message}</div>
            <div className="text-xs mt-1">
              {b.fixHint}{" "}
              {b.fixHref && (
                <Link to={b.fixHref} className="inline-flex items-center gap-1 underline">
                  Fix screen <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

export default BlockersList;
