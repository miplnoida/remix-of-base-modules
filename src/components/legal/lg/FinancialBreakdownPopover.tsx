import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateForDisplay } from "@/lib/format-config";
import type { RecoveryWorkbenchRow } from "@/services/legal/lgRecoveryWorkbenchService";

const money = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

export function FinancialBreakdownPopover({
  row,
  children,
}: {
  row: RecoveryWorkbenchRow;
  children: React.ReactNode;
}) {
  const rows: [string, string][] = [
    ["Principal", money(row.principal_due)],
    ["Interest", money(row.interest)],
    ["Penalty", money(row.penalty)],
    ["Court Cost", money(row.court_cost)],
    ["Legal Cost", money(row.legal_cost)],
    ["Other Charges", money(row.other_charges)],
    ["Total Recoverable", money(row.total_recoverable)],
    ["Payments Received", money(row.total_paid)],
    ["Outstanding", money(row.outstanding_balance)],
    ["Recovery %", `${row.recovery_pct.toFixed(1)}%`],
    ["Arrangement", row.arrangement_status ?? "—"],
    ["Last Payment", row.last_payment_date ? formatDateForDisplay(row.last_payment_date) : "—"],
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-right w-full hover:underline focus:outline-none focus:ring-1 focus:ring-primary rounded-sm">
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3">
        <p className="text-sm font-semibold mb-2">Financial Breakdown</p>
        <div className="space-y-1 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
