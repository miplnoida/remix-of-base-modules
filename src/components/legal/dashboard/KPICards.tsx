import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { KPIData } from '@/adapters/legalDashboardAdapter';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KPICardsProps {
  data: KPIData | null;
  loading: boolean;
}

export function KPICards({ data, loading }: KPICardsProps) {
  const navigate = useNavigate();

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* Active Cases */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate('/legal/cases')}
        role="button"
        tabIndex={0}
        aria-label="View active cases"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{data.activeCases}</div>
        </CardContent>
      </Card>

      {/* New This Period */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate('/legal/cases')}
        role="button"
        tabIndex={0}
        aria-label="View new cases this period"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">New This Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{data.newThisPeriod.count}</div>
          <div className="flex items-center mt-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 mr-1" />
            <span>12-month trend</span>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="col-span-1 md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Financial</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Owed:</span>
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(data.financial.owed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Collected:</span>
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(data.financial.collected)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Outstanding:</span>
              <span className="text-sm font-semibold text-orange-600">
                {formatCurrency(data.financial.outstanding)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enforcement Stage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Enforcement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Summons:</span>
              <span className="font-semibold text-foreground">{data.enforcementStage.summons}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">JDS:</span>
              <span className="font-semibold text-foreground">{data.enforcementStage.jds}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Warrant:</span>
              <span className="font-semibold text-foreground">{data.enforcementStage.warrant}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Writ:</span>
              <span className="font-semibold text-foreground">{data.enforcementStage.writ}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 14-Day Post-Judgment at Risk */}
      <Card
        className={`cursor-pointer hover:shadow-md transition-shadow ${
          data.postJudgmentRisk > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''
        }`}
        onClick={() => navigate('/legal/cases')}
        role="button"
        tabIndex={0}
        aria-label="View post-judgment cases at risk"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            {data.postJudgmentRisk > 0 && <AlertCircle className="h-4 w-4 text-red-500" />}
            14-Day Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${data.postJudgmentRisk > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {data.postJudgmentRisk}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Post-judgment</div>
        </CardContent>
      </Card>

      {/* Hearings This Month */}
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate('/legal/hearings')}
        role="button"
        tabIndex={0}
        aria-label="View hearings this month"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Hearings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{data.hearingsThisMonth}</div>
          <div className="text-xs text-muted-foreground mt-1">This month</div>
        </CardContent>
      </Card>
    </div>
  );
}
