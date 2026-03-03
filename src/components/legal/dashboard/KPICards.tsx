import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { KPIData } from '@/adapters/legalDashboardAdapter';
import { TrendingUp, TrendingDown, AlertCircle, Scale, FileText, DollarSign, Gavel, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface KPICardsProps {
  data: KPIData | null;
  loading: boolean;
  onActiveCasesClick?: () => void;
  onMissedPaymentClick?: () => void;
  onHearingsClick?: () => void;
}

export function KPICards({ data, loading, onActiveCasesClick, onMissedPaymentClick, onHearingsClick }: KPICardsProps) {
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

  const collectionRate = data.financial.owed > 0 
    ? ((data.financial.collected / data.financial.owed) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Active Cases */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-info/10 to-info/20 dark:from-info/5 dark:to-info/10 border-info/30"
        onClick={onActiveCasesClick || (() => navigate('/legal/cases'))}
        role="button"
        tabIndex={0}
        aria-label="View active cases"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-info">Active Cases</CardTitle>
            <Scale className="h-5 w-5 text-info" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground">{data.activeCases}</div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs bg-info/15 text-info">
              <FileText className="h-3 w-3 mr-1" />
              {data.newThisPeriod.count} new
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-success/10 to-success/20 dark:from-success/5 dark:to-success/10 border-success/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-success">Financial Overview</CardTitle>
            <DollarSign className="h-5 w-5 text-success" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-success mb-1">Total Owed</div>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(data.financial.owed)}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-success/20">
              <div>
                <div className="text-xs text-muted-foreground">Collected</div>
                <div className="text-sm font-semibold text-success">
                  {formatCurrency(data.financial.collected)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="text-sm font-semibold text-warning">
                  {formatCurrency(data.financial.outstanding)}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="w-full justify-center text-success border-success/30">
              {collectionRate}% Collection Rate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enforcement Pipeline */}
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-secondary/10 to-secondary/20 dark:from-secondary/5 dark:to-secondary/10 border-secondary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-secondary-foreground">Enforcement Pipeline</CardTitle>
            <Gavel className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-info"></div>
                <span className="text-xs text-muted-foreground">Summons</span>
              </div>
              <span className="text-sm font-bold text-foreground">{data.enforcementStage.summons}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="text-xs text-muted-foreground">JDS</span>
              </div>
              <span className="text-sm font-bold text-foreground">{data.enforcementStage.jds}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning"></div>
                <span className="text-xs text-muted-foreground">Warrant</span>
              </div>
              <span className="text-sm font-bold text-foreground">{data.enforcementStage.warrant}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive"></div>
                <span className="text-xs text-muted-foreground">Writ</span>
              </div>
              <span className="text-sm font-bold text-foreground">{data.enforcementStage.writ}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missed Payment */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-destructive/10 to-destructive/20 dark:from-destructive/5 dark:to-destructive/10 border-destructive/30"
        onClick={onMissedPaymentClick || (() => navigate('/legal/cases?filter=missedpayment'))}
        role="button"
        tabIndex={0}
        aria-label="View cases with missed payments"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-destructive">
              Missed Payment for a Month
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold mb-2 text-foreground">
            {data.postJudgmentRisk}
          </div>
          <Badge variant="destructive" className="w-full justify-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Payment Overdue
          </Badge>
        </CardContent>
      </Card>

      {/* Hearings This Month */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-warning/10 to-warning/20 dark:from-warning/5 dark:to-warning/10 border-warning/30"
        onClick={onHearingsClick || (() => navigate('/legal/hearings'))}
        role="button"
        tabIndex={0}
        aria-label="View hearings this month"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-warning">Scheduled Hearings</CardTitle>
            <Calendar className="h-5 w-5 text-warning" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground mb-2">{data.hearingsThisMonth}</div>
          <Badge variant="outline" className="w-full justify-center text-warning border-warning/30">
            This Month
          </Badge>
        </CardContent>
      </Card>

      {/* New Cases Trend */}
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-accent/20 to-accent/30 dark:from-accent/10 dark:to-accent/15 border-accent/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-accent-foreground">New Cases Trend</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-foreground mb-2">{data.newThisPeriod.count}</div>
          <div className="text-xs text-muted-foreground mb-2">This Period</div>
          <div className="flex gap-0.5 h-8 items-end">
            {data.newThisPeriod.sparkline.map((val, i) => {
              const maxVal = Math.max(...data.newThisPeriod.sparkline);
              const height = (val / maxVal) * 100;
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-primary/60 rounded-t transition-all hover:bg-primary"
                  style={{ height: `${height}%` }}
                  title={`Month ${i + 1}: ${val}`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
