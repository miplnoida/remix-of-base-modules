import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";
import { useDebtSummary } from "@/hooks/useLegalDebtTracking";

interface DebtSummaryCardProps {
  caseId: string;
}

export function DebtSummaryCard({ caseId }: DebtSummaryCardProps) {
  const summary = useDebtSummary(caseId);

  const paymentProgress = summary.totalDebt > 0 
    ? (summary.totalPaid / summary.totalDebt) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Debt Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Debt</p>
            <p className="text-2xl font-bold">${summary.totalDebt.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="text-2xl font-bold text-destructive">${summary.totalBalance.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold text-green-600 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              ${summary.totalPaid.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Payment Progress</p>
            <p className="text-lg font-semibold">{paymentProgress.toFixed(1)}%</p>
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${Math.min(paymentProgress, 100)}%` }}
          />
        </div>

        {summary.overdueCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {summary.overdueCount} Overdue Payment{summary.overdueCount > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Total overdue: ${summary.overdueAmount.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {summary.totalBalance === 0 && summary.totalDebt > 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm font-medium text-green-600">
              All debts paid in full
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
