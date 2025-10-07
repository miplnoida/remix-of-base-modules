import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, PieChart, Calendar } from "lucide-react";
import { useFinancialSummary } from "@/hooks/useFinancialTracking";

interface FinancialDashboardProps {
  caseId: string;
}

export function FinancialDashboard({ caseId }: FinancialDashboardProps) {
  const summary = useFinancialSummary(caseId);

  const paymentProgress = summary.total_debt > 0 
    ? (summary.total_paid / summary.total_debt) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Debt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.total_debt.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Including penalties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${summary.total_paid.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.payment_count} payment{summary.payment_count !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${summary.outstanding_balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentProgress.toFixed(1)}% collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Penalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">${summary.total_penalties.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.overdue_count} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 transition-all duration-300"
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Paid: ${summary.total_paid.toFixed(2)}</span>
              <span className="font-semibold">{paymentProgress.toFixed(1)}%</span>
              <span className="text-muted-foreground">Remaining: ${summary.outstanding_balance.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Debt Breakdown by Contribution Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">SS - Insured Person</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                ${summary.total_ss_insured.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">SS - Employer</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                ${summary.total_ss_employer.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Housing & Social Levy</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                ${summary.total_levy.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Employment Insurance</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                ${summary.total_ei.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wage Periods Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Wage Periods Tracked
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{summary.wage_periods_count}</p>
              <p className="text-sm text-muted-foreground">Total wage periods recorded</p>
            </div>
            {summary.overdue_count > 0 && (
              <Badge variant="destructive" className="text-base px-4 py-2">
                {summary.overdue_count} Overdue
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
