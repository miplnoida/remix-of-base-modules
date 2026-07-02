/**
 * Legal State Components (EPIC-05A)
 * Reusable Loading / Empty / Error / Permission / Offline / Retry states.
 * Never expose raw backend errors — friendly UI only, technical detail collapsed.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Inbox, Loader2, Lock, WifiOff, RefreshCw, ChevronDown } from "lucide-react";
import { useState } from "react";

export function LgLoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <div className="text-sm">{label}</div>
      </CardContent>
    </Card>
  );
}

export function LgEmptyState({
  title = "Nothing to show",
  description = "No records match the current filters.",
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-10 flex flex-col items-center justify-center gap-2 text-center">
        <div className="text-muted-foreground">{icon ?? <Inbox className="h-8 w-8" />}</div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground max-w-md">{description}</div>
        {action}
      </CardContent>
    </Card>
  );
}

function classifyError(err: unknown): "PERMISSION" | "NETWORK" | "BACKEND" {
  const msg = String((err as any)?.message ?? err ?? "").toLowerCase();
  if (msg.includes("permission") || msg.includes("rls") || msg.includes("not authorized") || msg.includes("row-level security")) return "PERMISSION";
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("offline")) return "NETWORK";
  return "BACKEND";
}

export function LgErrorState({
  error,
  onRetry,
  title,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const kind = classifyError(error);
  const cfg =
    kind === "PERMISSION"
      ? { icon: <Lock className="h-6 w-6" />, headline: "You don't have access to this data", desc: "Please contact your Legal supervisor if you believe this is a mistake." }
      : kind === "NETWORK"
      ? { icon: <WifiOff className="h-6 w-6" />, headline: "Connection issue", desc: "We couldn't reach the server. Check your connection and retry." }
      : { icon: <AlertCircle className="h-6 w-6" />, headline: title ?? "Something went wrong", desc: "The data couldn't be loaded. You can retry now or try again later." };

  // Log technical detail for engineers
  if (typeof console !== "undefined") console.error("[LgErrorState]", error);

  const detail = (error as any)?.message ?? String(error ?? "");

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-6 flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 text-destructive">{cfg.icon}<span className="font-medium">{cfg.headline}</span></div>
        <div className="text-sm text-muted-foreground">{cfg.desc}</div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
            </Button>
          )}
          {detail && (
            <Button size="sm" variant="ghost" onClick={() => setShowDetail((v) => !v)}>
              <ChevronDown className={"h-3.5 w-3.5 mr-1 transition-transform " + (showDetail ? "rotate-180" : "")} />
              Technical details
            </Button>
          )}
        </div>
        {showDetail && detail && (
          <pre className="w-full whitespace-pre-wrap text-[11px] bg-background border rounded p-2 text-muted-foreground max-h-40 overflow-auto">{detail}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export function LgPermissionState() {
  return (
    <LgErrorState error={new Error("permission denied")} title="Access restricted" />
  );
}
