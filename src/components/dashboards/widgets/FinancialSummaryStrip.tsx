import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchFinancialSummary } from '@/services/dashboardDataService';

function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export function FinancialSummaryStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard_financial_summary'],
    queryFn: fetchFinancialSummary,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center h-[80px]">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const financials = [
    { label: 'Monthly Contributions', value: formatCurrency(Number(data?.monthly_contributions ?? 0)), icon: DollarSign, positive: true },
    { label: 'Benefits Paid (MTD)', value: formatCurrency(Number(data?.benefits_paid_mtd ?? 0)), icon: TrendingDown, positive: false },
    { label: 'Net Fund Surplus', value: formatCurrency(Number(data?.net_surplus ?? 0)), icon: TrendingUp, positive: Number(data?.net_surplus ?? 0) >= 0 },
    { label: 'Outstanding Arrears', value: formatCurrency(Number(data?.outstanding_arrears ?? 0)), icon: Wallet, positive: false },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {financials.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-none">{f.label}</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{f.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
