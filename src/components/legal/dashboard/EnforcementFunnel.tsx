import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EnforcementFunnelData } from '@/adapters/legalDashboardAdapter';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EnforcementFunnelProps {
  data: EnforcementFunnelData[] | null;
  loading: boolean;
}

export function EnforcementFunnel({ data, loading }: EnforcementFunnelProps) {
  if (loading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Enforcement Funnel (Current Period)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-6">
            {data.map((stage, index) => {
              const widthPercent = (stage.count / maxCount) * 100;
              
              return (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                      {stage.delta !== 0 && (
                        <span className={`text-xs flex items-center ${stage.delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stage.delta > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                          {Math.abs(stage.delta)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-foreground">{stage.count}</span>
                      <span className="text-xs text-muted-foreground">{stage.conversionRate}%</span>
                    </div>
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative h-10 bg-muted rounded-lg overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 flex items-center justify-center text-sm font-medium text-white ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-blue-600' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${widthPercent}%` }}
                        >
                          {stage.count > 0 && <span>{stage.count} cases</span>}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover border-border">
                      <div className="space-y-1">
                        <div className="font-semibold">{stage.stage}</div>
                        <div className="text-xs">Count: {stage.count}</div>
                        <div className="text-xs">Conversion: {stage.conversionRate}%</div>
                        <div className="text-xs">
                          Period delta: {stage.delta > 0 ? '+' : ''}{stage.delta}%
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
