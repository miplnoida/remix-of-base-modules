import { Badge } from "@/components/ui/badge";
import type { OperationalAlert } from "@/services/legal/lgIntakeDecisionService";

const TONE: Record<OperationalAlert["severity"], string> = {
  high:   "bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-300",
  low:    "bg-sky-500/10 text-sky-700 border-sky-500/40 dark:text-sky-300",
};

export function OperationalAlertsBadges({ alerts }: { alerts: OperationalAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => (
        <Badge key={a.key} variant="outline" className={`${TONE[a.severity]} text-[10px]`} title={a.detail}>
          {a.label}{a.detail ? ` · ${a.detail}` : ""}
        </Badge>
      ))}
    </div>
  );
}
