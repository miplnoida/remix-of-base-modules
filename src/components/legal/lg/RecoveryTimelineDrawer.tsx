import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Check } from "lucide-react";
import { TIMELINE_STAGES, computeCurrentTimelineStage } from "@/services/legal/lgRecoveryHealth";
import type { RecoveryWorkbenchRow } from "@/services/legal/lgRecoveryWorkbenchService";

export function RecoveryTimelineDrawer({
  row,
  open,
  onOpenChange,
}: {
  row: RecoveryWorkbenchRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!row) return null;
  const current = computeCurrentTimelineStage(row);
  const currentIdx = TIMELINE_STAGES.indexOf(current);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <SheetTitle>Recovery Timeline</SheetTitle>
          <p className="text-xs text-muted-foreground">{row.matter_no} · {row.party_name ?? "—"}</p>
        </SheetHeader>
        <ol className="mt-6 relative border-l ml-3 space-y-4">
          {TIMELINE_STAGES.map((stage, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            const dot = done
              ? "bg-emerald-500 border-emerald-500 text-white"
              : active
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-muted border-border text-muted-foreground";
            return (
              <li key={stage} className="ml-4">
                <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full border ${dot}`}>
                  {done ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{idx + 1}</span>}
                </span>
                <div className={`text-sm ${active ? "font-semibold" : done ? "" : "text-muted-foreground"}`}>
                  {stage}
                </div>
                {active && <div className="text-[11px] text-primary">Current stage</div>}
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
