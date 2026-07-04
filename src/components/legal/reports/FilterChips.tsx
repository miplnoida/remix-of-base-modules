/**
 * EPIC-09C Part 3 — Filter Chips
 * Renders one badge per active URL filter with an X to clear it.
 * Used by receiving pages (cases, hearings, recovery, etc.) to
 * make drilldown-supplied filters visible and dismissable.
 */
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useDashboardFilters, type DashboardFilters } from "@/hooks/legal/useDashboardFilters";

const LABELS: Partial<Record<keyof DashboardFilters, string>> = {
  dateFrom: "From", dateTo: "To",
  matterType: "Matter", courtId: "Court", judgeId: "Judge", fundCode: "Fund",
  employerId: "Employer", officerId: "Officer", counselId: "Counsel",
  status: "Status", priority: "Priority", territory: "Region", riskRating: "Risk",
  recoveryStage: "Stage", consentStatus: "Consent", today: "Today", view: "View", cat: "Category",
};

export function FilterChips() {
  const { chips, patch } = useDashboardFilters();
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {chips.map(([k, v]) => (
        <Badge key={k} variant="secondary" className="gap-1">
          <span className="text-[10px] uppercase text-muted-foreground">{LABELS[k] ?? k}</span>
          <span>{v}</span>
          <button aria-label={`Clear ${k}`} onClick={() => patch({ [k]: undefined } as any)}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
