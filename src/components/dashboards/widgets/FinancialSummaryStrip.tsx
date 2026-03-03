import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const financials = [
  { label: 'Monthly Contributions', value: '$12.5M', icon: DollarSign, trend: '+3.2%', positive: true },
  { label: 'Benefits Paid (MTD)', value: '$8.2M', icon: TrendingDown, trend: '+1.5%', positive: false },
  { label: 'Net Fund Surplus', value: '$4.3M', icon: TrendingUp, trend: '+8.4%', positive: true },
  { label: 'Outstanding Arrears', value: '$2.1M', icon: Wallet, trend: '-12.3%', positive: true },
];

export function FinancialSummaryStrip() {
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
                <span className={`text-[11px] font-medium ${f.positive ? 'text-secondary' : 'text-destructive'}`}>
                  {f.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
