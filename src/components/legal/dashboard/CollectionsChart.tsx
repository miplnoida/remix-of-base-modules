import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionsData } from '@/adapters/legalDashboardAdapter';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CollectionsChartProps {
  data: CollectionsData[] | null;
  loading: boolean;
  onClick?: () => void;
}

export function CollectionsChart({ data, loading, onClick }: CollectionsChartProps) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };

  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);
  const totalOutstanding = data.reduce((sum, d) => sum + d.outstanding, 0);
  const collectionTrend = data.length > 1 
    ? ((data[data.length - 1].collected - data[data.length - 2].collected) / data[data.length - 2].collected * 100).toFixed(1)
    : '0';

  return (
    <Card className={onClick ? "cursor-pointer hover:shadow-lg transition-all" : ""} onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Financial Collection Trends
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Last 12 months overview</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground">Total Collected</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="month"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend
              wrapperStyle={{ color: 'hsl(var(--foreground))', paddingTop: '10px' }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCollected)"
              name="Collected"
            />
            <Area
              type="monotone"
              dataKey="outstanding"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOutstanding)"
              name="Outstanding"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Outstanding Balance</div>
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatCurrency(totalOutstanding)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Month-over-Month</div>
            <div className={`text-lg font-bold ${parseFloat(collectionTrend) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {collectionTrend}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
