import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Activity, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const PerformanceMonitor: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');

  const getStartDate = () => {
    switch (timeRange) {
      case '1h': return subHours(new Date(), 1);
      case '24h': return subDays(new Date(), 1);
      case '7d': return subDays(new Date(), 7);
      case '30d': return subDays(new Date(), 30);
      default: return subDays(new Date(), 7);
    }
  };

  // Fetch from system_technical_logs (internal API calls)
  const { data: technicalLogs = [], isLoading: loadingTech, refetch: refetchTech } = useQuery({
    queryKey: ['perf-technical-logs', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_technical_logs')
        .select('api_name, execution_time_ms, status, timestamp, module')
        .gte('timestamp', getStartDate().toISOString())
        .order('timestamp', { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch from api_logs (external proxy API calls)
  const { data: apiLogs = [], isLoading: loadingApi, refetch: refetchApi } = useQuery({
    queryKey: ['perf-api-logs', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_logs')
        .select('api_name, duration_ms, is_success, execution_timestamp, module, http_method')
        .gte('execution_timestamp', getStartDate().toISOString())
        .order('execution_timestamp', { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data || [];
    }
  });

  const isLoading = loadingTech || loadingApi;
  const refetch = () => { refetchTech(); refetchApi(); };

  // Combine all metrics into a unified format
  const allMetrics = React.useMemo(() => {
    const techEntries = technicalLogs.map(t => ({
      api_name: t.api_name || 'unknown',
      execution_time_ms: t.execution_time_ms || 0,
      is_success: t.status === 'success',
      timestamp: t.timestamp,
      module: t.module || 'Internal',
      source: 'internal' as const,
    }));
    const apiEntries = apiLogs.map(a => ({
      api_name: a.api_name || 'unknown',
      execution_time_ms: a.duration_ms || 0,
      is_success: a.is_success ?? true,
      timestamp: a.execution_timestamp,
      module: a.module || 'External',
      source: 'external' as const,
    }));
    return [...techEntries, ...apiEntries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [technicalLogs, apiLogs]);

  // Aggregate for time-series charts
  const aggregatedData = React.useMemo(() => {
    if (allMetrics.length === 0) return [];
    
    const bucketFormat = timeRange === '1h' ? 'HH:mm' : timeRange === '24h' ? 'MM-dd HH:00' : 'MM-dd';
    const grouped: Record<string, { count: number; totalTime: number; errors: number }> = {};
    
    allMetrics.forEach((m) => {
      const bucket = format(new Date(m.timestamp), bucketFormat);
      if (!grouped[bucket]) grouped[bucket] = { count: 0, totalTime: 0, errors: 0 };
      grouped[bucket].count++;
      grouped[bucket].totalTime += m.execution_time_ms;
      if (!m.is_success) grouped[bucket].errors++;
    });

    return Object.entries(grouped).map(([time, data]) => ({
      time,
      avgResponseTime: Math.round(data.totalTime / data.count),
      errorRate: Number(((data.errors / data.count) * 100).toFixed(1)),
      requestCount: data.count,
    }));
  }, [allMetrics, timeRange]);

  // Summary stats
  const stats = React.useMemo(() => {
    if (allMetrics.length === 0) return { avgTime: 0, errorRate: '0.0', totalRequests: 0, p95: 0 };
    const times = allMetrics.map(m => m.execution_time_ms).sort((a, b) => a - b);
    const errors = allMetrics.filter(m => !m.is_success).length;
    return {
      avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      errorRate: ((errors / allMetrics.length) * 100).toFixed(1),
      totalRequests: allMetrics.length,
      p95: times[Math.floor(times.length * 0.95)] || 0,
    };
  }, [allMetrics]);

  // Top slowest APIs (aggregated avg)
  const slowestApis = React.useMemo(() => {
    const grouped: Record<string, { totalTime: number; count: number; errors: number; source: string }> = {};
    allMetrics.forEach(m => {
      if (!grouped[m.api_name]) grouped[m.api_name] = { totalTime: 0, count: 0, errors: 0, source: m.source };
      grouped[m.api_name].totalTime += m.execution_time_ms;
      grouped[m.api_name].count++;
      if (!m.is_success) grouped[m.api_name].errors++;
    });
    return Object.entries(grouped)
      .map(([name, d]) => ({ api_name: name, avgTime: Math.round(d.totalTime / d.count), count: d.count, errors: d.errors, source: d.source }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
  }, [allMetrics]);

  // Module breakdown for pie chart
  const moduleBreakdown = React.useMemo(() => {
    const grouped: Record<string, number> = {};
    allMetrics.forEach(m => {
      const mod = m.module || 'Unknown';
      grouped[mod] = (grouped[mod] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [allMetrics]);

  const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#8b5cf6'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Performance Monitor
          </h1>
          <p className="text-muted-foreground">Monitor API performance and system health across all modules</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <Button key={range} variant={timeRange === range ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange(range)}>
                {range}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.avgTime}ms</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Error Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{stats.errorRate}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total API Calls</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">P95 Response Time</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.p95}ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : allMetrics.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No performance data available for the selected time range. Try a wider range or trigger some API calls.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>API Response Time</CardTitle>
              <CardDescription>Average response time over time (ms)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="ms" />
                    <Tooltip formatter={(v: number) => [`${v}ms`, 'Avg Response Time']} />
                    <Line type="monotone" dataKey="avgResponseTime" stroke="hsl(var(--primary))" strokeWidth={2} dot={aggregatedData.length < 30} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Request Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Request Volume</CardTitle>
              <CardDescription>Number of API calls over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="requestCount" fill="hsl(var(--primary))" name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Error Rate Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Error Rate (%)</CardTitle>
              <CardDescription>Percentage of failed calls over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Error Rate']} />
                    <Bar dataKey="errorRate" fill="hsl(var(--destructive))" name="Error Rate" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Module Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Calls by Module</CardTitle>
              <CardDescription>Distribution of API calls across modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={moduleBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {moduleBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Slowest APIs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top 10 Slowest APIs (by avg response time)</CardTitle>
              <CardDescription>Identifies performance bottlenecks across internal and external APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Name</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowestApis.map((api, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{api.api_name}</TableCell>
                      <TableCell><Badge variant={api.avgTime > 1000 ? 'destructive' : 'secondary'}>{api.avgTime}ms</Badge></TableCell>
                      <TableCell>{api.count}</TableCell>
                      <TableCell>{api.errors > 0 ? <span className="text-destructive font-medium">{api.errors}</span> : '0'}</TableCell>
                      <TableCell><Badge variant="outline">{api.source === 'external' ? 'External' : 'Internal'}</Badge></TableCell>
                      <TableCell>
                        <Badge className={api.avgTime > 1000 ? 'bg-red-500' : api.avgTime > 500 ? 'bg-yellow-500' : 'bg-green-500'}>
                          {api.avgTime > 1000 ? 'Slow' : api.avgTime > 500 ? 'Moderate' : 'Fast'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {slowestApis.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No performance data available</TableCell></TableRow>
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
