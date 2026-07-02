import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { HealthLevel, HealthResult } from "@/services/legal/lgRecoveryHealth";

const CONFIG: Record<HealthLevel, { className: string; Icon: typeof Activity }> = {
  HEALTHY:   { className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",   Icon: CheckCircle2 },
  ATTENTION: { className: "bg-amber-500/10 text-amber-700 border-amber-500/30",         Icon: Activity },
  HIGH_RISK: { className: "bg-orange-500/10 text-orange-700 border-orange-500/30",      Icon: AlertTriangle },
  CRITICAL:  { className: "bg-destructive/10 text-destructive border-destructive/30",    Icon: AlertCircle },
};

export function RecoveryHealthBadge({ health }: { health: HealthResult }) {
  const c = CONFIG[health.level];
  const Icon = c.Icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`gap-1 ${c.className}`}>
          <Icon className="h-3 w-3" /> {health.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="font-medium mb-1">Why: {health.label}</p>
        <ul className="text-xs space-y-0.5">
          {health.reasons.map((r) => <li key={r}>• {r}</li>)}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
