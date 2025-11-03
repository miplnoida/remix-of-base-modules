import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrearsHeatmapCell } from '@/adapters/legalDashboardAdapter';
import { useNavigate } from 'react-router-dom';

interface ArrearsHeatmapProps {
  data: ArrearsHeatmapCell[] | null;
  loading: boolean;
}

export function ArrearsHeatmap({ data, loading }: ArrearsHeatmapProps) {
  const navigate = useNavigate();

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

  const periods = [...new Set(data.map(d => d.period))].sort();
  const types = [...new Set(data.map(d => d.type))];

  const getCell = (period: string, type: string) => {
    return data.find(d => d.period === period && d.type === type);
  };

  const maxAmount = Math.max(...data.map(d => d.amount));

  const getColor = (amount: number) => {
    const intensity = amount / maxAmount;
    if (intensity > 0.75) return 'bg-red-600';
    if (intensity > 0.5) return 'bg-orange-500';
    if (intensity > 0.25) return 'bg-blue-400';
    return 'bg-blue-200';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Arrears by Period (Heatmap)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-sm font-medium text-muted-foreground border border-border">
                    Period
                  </th>
                  {types.map(type => (
                    <th key={type} className="p-2 text-center text-sm font-medium text-muted-foreground border border-border">
                      {type}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period}>
                    <td className="p-2 text-sm font-medium text-foreground border border-border whitespace-nowrap">
                      {period}
                    </td>
                    {types.map(type => {
                      const cell = getCell(period, type);
                      if (!cell) {
                        return (
                          <td key={`${period}-${type}`} className="p-2 border border-border bg-muted/30" />
                        );
                      }
                      return (
                        <Tooltip key={`${period}-${type}`}>
                          <TooltipTrigger asChild>
                            <td
                              className={`p-2 border border-border cursor-pointer hover:opacity-80 transition-opacity ${getColor(cell.amount)}`}
                              onClick={() => navigate('/legal/cases')}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="text-center text-sm font-semibold text-white">
                                {formatCurrency(cell.amount)}
                              </div>
                            </td>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border">
                            <div className="space-y-1">
                              <div className="font-semibold">{formatCurrency(cell.amount)}</div>
                              <div className="text-xs text-muted-foreground">Top Employers:</div>
                              <ul className="text-xs space-y-0.5">
                                {cell.topEmployers.map((emp, i) => (
                                  <li key={i}>• {emp}</li>
                                ))}
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span>Intensity:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-200 border border-border" />
            <span>Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-400 border border-border" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 border border-border" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 border border-border" />
            <span>Critical</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
