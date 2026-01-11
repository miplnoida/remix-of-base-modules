import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const PerformanceMonitor: React.FC = () => {
  const [timeRange, setTimeRange] = useState('24h');

  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['performance-metrics', timeRange],
    queryFn: async () => {
      const startDate = timeRange === '24h' 
        ? subDays(new Date(), 1) 
        : timeRange === '7d' 
        ? subDays(new Date(), 7) 
        : subDays(new Date(), 30);

      const { data, error } = await supabase
        .from('system_performance_metrics')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: slowestApis } = useQuery({
    queryKey: ['slowest-apis', timeRange],
    queryFn: async () => {
      const startDate = timeRange === '24h' 
        ? subDays(new Date(), 1) 
        : timeRange === '7d' 
        ? subDays(new Date(), 7) 
        : subDays(new Date(), 30);

      const { data, error } = await supabase
        .from('system_performance_metrics')
        .select('api_name, execution_time_ms')
        .gte('timestamp', startDate.toISOString())
        .order('execution_time_ms', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    }
  });

  // Aggregate metrics for charts
  const aggregatedData = React.useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    const grouped: Record<string, { count: number; totalTime: number; errors: number }> = {};
    
    metrics.forEach((m) => {
      const hour = format(new Date(m.timestamp), 'MM-dd HH:00');
      if (!grouped[hour]) {
        grouped[hour] = { count: 0, totalTime: 0, errors: 0 };
      }
      grouped[hour].count++;
      grouped[hour].totalTime += m.execution_time_ms || 0;
      if (m.status === 'failed') grouped[hour].errors++;
    });

    return Object.entries(grouped).map(([time, data]) => ({
      time,
      avgResponseTime: Math.round(data.totalTime / data.count),
      errorRate: ((data.errors / data.count) * 100).toFixed(1),
      requestCount: data.count
    }));
  }, [metrics]);

  // Calculate summary stats
  const stats = React.useMemo(() => {
    if (!metrics || metrics.length === 0) return { avgTime: 0, errorRate: 0, totalRequests: 0, p95: 0 };
    
    const times = metrics.map(m => m.execution_time_ms || 0).sort((a, b) => a - b);
    const errors = metrics.filter(m => m.status === 'failed').length;
    
    return {
      avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      errorRate: ((errors / metrics.length) * 100).toFixed(1),
      totalRequests: metrics.length,
      p95: times[Math.floor(times.length * 0.95)] || 0
    };
  }, [metrics]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Performance Monitor
          </h1>
          <p className="text-muted-foreground">Monitor API performance and system health</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {['24h', '7d', '30d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.avgTime}ms</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{stats.errorRate}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">P95 Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.p95}ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Response Time</CardTitle>
              <CardDescription>Average response time over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgResponseTime" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Error Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Error Rate</CardTitle>
              <CardDescription>Error percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="errorRate" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Slowest APIs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Slowest APIs</CardTitle>
              <CardDescription>Top 10 slowest API calls</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Name</TableHead>
                    <TableHead>Execution Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowestApis?.map((api, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{api.api_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={api.execution_time_ms > 1000 ? 'destructive' : 'secondary'}>
                          {api.execution_time_ms}ms
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={api.execution_time_ms > 1000 ? 'bg-red-500' : api.execution_time_ms > 500 ? 'bg-yellow-500' : 'bg-green-500'}>
                          {api.execution_time_ms > 1000 ? 'Slow' : api.execution_time_ms > 500 ? 'Moderate' : 'Fast'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!slowestApis || slowestApis.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
