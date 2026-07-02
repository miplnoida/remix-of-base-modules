import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Alert } from "@/services/legal/lgRecoveryHealth";

const TONE: Record<Alert["severity"], string> = {
  info: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
};

export function RecoveryAlertsCell({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => (
        <Tooltip key={a.key + a.label}>
          <TooltipTrigger asChild>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${TONE[a.severity]}`}>
              {a.label}
            </span>
          </TooltipTrigger>
          <TooltipContent>{a.tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
