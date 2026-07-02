import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay } from "@/lib/format-config";
import { Eye, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RecoveryHealthBadge } from "./RecoveryHealthBadge";
import { RecoveryAlertsCell } from "./RecoveryAlertsCell";
import {
  computeAlerts,
  computeHealth,
  computeNextAction,
} from "@/services/legal/lgRecoveryHealth";
import type { RecoveryWorkbenchRow } from "@/services/legal/lgRecoveryWorkbenchService";

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export function RecoverySnapshotPanel({
  row,
  open,
  onOpenChange,
}: {
  row: RecoveryWorkbenchRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  if (!row) return null;
  const health = computeHealth(row);
  const alerts = computeAlerts(row);
  const next = computeNextAction(row);

  const line = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-2 text-sm py-1 border-b last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{row.matter_no}</SheetTitle>
          <p className="text-xs text-muted-foreground">{row.party_name ?? "—"}</p>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <RecoveryHealthBadge health={health} />
          <Badge variant="outline">{next.label}</Badge>
        </div>

        <div className="mt-3">
          <RecoveryAlertsCell alerts={alerts} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/legal/lg/cases/${row.id}`)}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Open Matter
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/legal/lg/cases/${row.id}?tab=recovery`)}>
            <Wallet className="h-3.5 w-3.5 mr-1" /> Recovery Tab
          </Button>
        </div>

        <section className="mt-5">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Party</h4>
          {line("Type", row.party_type ?? "—")}
          {line("Reference", row.party_ref ?? "—")}
          {line("Territory", row.territory ?? "—")}
        </section>

        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Financial</h4>
          {line("Principal", money(row.principal_due))}
          {line("Interest", money(row.interest))}
          {line("Penalty", money(row.penalty))}
          {line("Court + Legal", money(row.court_cost + row.legal_cost))}
          {line("Other Charges", money(row.other_charges))}
          {line("Total Recoverable", money(row.total_recoverable))}
          {line("Paid", money(row.total_paid))}
          {line("Outstanding", money(row.outstanding_balance))}
          {line("Recovery %", `${row.recovery_pct.toFixed(1)}%`)}
          {line("Arrangement", row.arrangement_status ?? "—")}
          {line("Last Payment", row.last_payment_date ? formatDateForDisplay(row.last_payment_date) : "—")}
        </section>

        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Case</h4>
          {line("Status", row.legal_status ?? "—")}
          {line("Stage", row.case_stage ?? "—")}
          {line("Officer", row.assigned_officer_name ?? "—")}
          {line("Team", row.team_code ?? "—")}
          {line("Next Action", row.next_action_date ? formatDateForDisplay(row.next_action_date) : "—")}
          {line("Next Hearing", row.next_hearing_date ? formatDateForDisplay(row.next_hearing_date) : "—")}
          {line("Ageing", `${row.ageing_days}d (${row.ageing_bucket})`)}
          {line("SLA", row.sla_status)}
          {line("Open Tasks", row.open_task_count)}
          {line("Documents", row.document_count)}
          {line("Last Activity", row.last_activity ? formatDateForDisplay(row.last_activity) : "—")}
        </section>
      </SheetContent>
    </Sheet>
  );
}
