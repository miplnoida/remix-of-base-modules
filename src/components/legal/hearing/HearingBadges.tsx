import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CheckCircle2, Circle, AlertTriangle, TrendingUp, TrendingDown, Minus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReadinessResult, RecoveryImpactResult } from "@/services/legal/lgHearingWorkbenchService";

export function ReadinessBadge({ result }: { result: ReadinessResult }) {
  const cfg =
    result.level === "READY"
      ? { cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", label: "Ready" }
      : result.level === "NEARLY_READY"
      ? { cls: "bg-amber-500/10 text-amber-700 border-amber-500/20", label: "Nearly Ready" }
      : { cls: "bg-destructive/10 text-destructive border-destructive/20", label: "Not Ready" };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
          {result.level === "READY" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {cfg.label} · {result.percent}%
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-xs">
        <div className="font-medium mb-2">Hearing readiness</div>
        <ul className="space-y-1">
          {result.checks.map((c) => (
            <li key={c.code} className="flex items-center gap-2">
              {c.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
              <span className={c.ok ? "" : "text-muted-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function RecoveryImpactBadge({ result }: { result: RecoveryImpactResult }) {
  const cfg =
    result.impact === "POSITIVE"
      ? { icon: <TrendingUp className="h-3 w-3" />, cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", label: "Positive" }
      : result.impact === "DELAYED"
      ? { icon: <TrendingDown className="h-3 w-3" />, cls: "bg-amber-500/10 text-amber-700 border-amber-500/20", label: "Delayed" }
      : result.impact === "CRITICAL"
      ? { icon: <XCircle className="h-3 w-3" />, cls: "bg-destructive/10 text-destructive border-destructive/20", label: "Critical" }
      : { icon: <Minus className="h-3 w-3" />, cls: "bg-muted text-muted-foreground border-border", label: "Neutral" };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.cls)}>
          {cfg.icon}
          {cfg.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-xs">
        <div className="font-medium mb-1">Recovery impact</div>
        <div className="text-muted-foreground">{result.reason}</div>
      </PopoverContent>
    </Popover>
  );
}

export function ReadinessDot({ result }: { result: ReadinessResult }) {
  const color = result.level === "READY" ? "bg-emerald-500" : result.level === "NEARLY_READY" ? "bg-amber-500" : "bg-destructive";
  return <span title={`Readiness ${result.percent}%`} className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}
