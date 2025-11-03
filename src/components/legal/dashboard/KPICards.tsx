import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { KPIData } from '@/adapters/legalDashboardAdapter';
import { TrendingUp, TrendingDown, AlertCircle, Scale, FileText, DollarSign, Gavel, Calendar, AlertTriangle } from 'lucide-react';
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

  const collectionRate = data.financial.owed > 0 
    ? ((data.financial.collected / data.financial.owed) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Active Cases - Enhanced */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800"
        onClick={() => navigate('/legal/cases')}
        role="button"
        tabIndex={0}
        aria-label="View active cases"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Active Cases</CardTitle>
            <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">{data.activeCases}</div>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              <FileText className="h-3 w-3 mr-1" />
              {data.newThisPeriod.count} new
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary - Enhanced */}
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Financial Overview</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">Total Owed</div>
              <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {formatCurrency(data.financial.owed)}
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-800">
              <div>
                <div className="text-xs text-muted-foreground">Collected</div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(data.financial.collected)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {formatCurrency(data.financial.outstanding)}
                </div>
              </div>
            </div>
            <Badge variant="outline" className="w-full justify-center text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
              {collectionRate}% Collection Rate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Enforcement Pipeline - Enhanced */}
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Enforcement Pipeline</CardTitle>
            <Gavel className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs text-muted-foreground">Summons</span>
              </div>
              <span className="text-sm font-bold text-purple-900 dark:text-purple-100">{data.enforcementStage.summons}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-xs text-muted-foreground">JDS</span>
              </div>
              <span className="text-sm font-bold text-purple-900 dark:text-purple-100">{data.enforcementStage.jds}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-xs text-muted-foreground">Warrant</span>
              </div>
              <span className="text-sm font-bold text-purple-900 dark:text-purple-100">{data.enforcementStage.warrant}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-xs text-muted-foreground">Writ</span>
              </div>
              <span className="text-sm font-bold text-purple-900 dark:text-purple-100">{data.enforcementStage.writ}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 14-Day Post-Judgment at Risk - Enhanced */}
      <Card
        className={`cursor-pointer hover:shadow-lg transition-all hover:scale-105 ${
          data.postJudgmentRisk > 0 
            ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50 border-red-300 dark:border-red-800' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/50 dark:to-gray-900/50 border-gray-200 dark:border-gray-800'
        }`}
        onClick={() => navigate('/legal/cases')}
        role="button"
        tabIndex={0}
        aria-label="View post-judgment cases at risk"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className={`text-sm font-medium ${
              data.postJudgmentRisk > 0 ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'
            }`}>
              14-Day Risk Alert
            </CardTitle>
            {data.postJudgmentRisk > 0 ? (
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-4xl font-bold mb-2 ${
            data.postJudgmentRisk > 0 ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {data.postJudgmentRisk}
          </div>
          {data.postJudgmentRisk > 0 ? (
            <Badge variant="destructive" className="w-full justify-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              Action Required
            </Badge>
          ) : (
            <Badge variant="outline" className="w-full justify-center text-gray-600 dark:text-gray-400">
              All Clear
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Hearings This Month - Enhanced */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 border-amber-200 dark:border-amber-800"
        onClick={() => navigate('/legal/hearings')}
        role="button"
        tabIndex={0}
        aria-label="View hearings this month"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Scheduled Hearings</CardTitle>
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-amber-900 dark:text-amber-100 mb-2">{data.hearingsThisMonth}</div>
          <Badge variant="outline" className="w-full justify-center text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
            This Month
          </Badge>
        </CardContent>
      </Card>

      {/* New Cases Trend - Enhanced */}
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-indigo-200 dark:border-indigo-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-300">New Cases Trend</CardTitle>
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-indigo-900 dark:text-indigo-100 mb-2">{data.newThisPeriod.count}</div>
          <div className="text-xs text-muted-foreground mb-2">This Period</div>
          <div className="flex gap-0.5 h-8 items-end">
            {data.newThisPeriod.sparkline.map((val, i) => {
              const maxVal = Math.max(...data.newThisPeriod.sparkline);
              const height = (val / maxVal) * 100;
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-indigo-400 dark:bg-indigo-600 rounded-t transition-all hover:bg-indigo-600 dark:hover:bg-indigo-400"
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
