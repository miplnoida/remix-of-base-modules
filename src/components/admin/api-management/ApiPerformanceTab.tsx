import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Activity, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AccessLog {
  id: string;
  api_key_id: string | null;
  endpoint: string;
  http_method: string;
  request_ip: string;
  response_status: number;
  response_time_ms: number;
  error_message: string | null;
  created_at: string;
}

interface MetricSummary {
  total: number;
  success: number;
  failure: number;
  avgResponseTime: number;
  peakResponseTime: number;
  errorRate: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

const ApiPerformanceTab: React.FC = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterEndpoint, setFilterEndpoint] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('public_api_access_logs')
      .select('*')
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(1000);

    const { data, error } = await query;
    if (error) {
      toast.error('Failed to load access logs');
    } else {
      setLogs((data || []) as unknown as AccessLog[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [dateFrom, dateTo]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterEndpoint !== 'all' && log.endpoint !== filterEndpoint) return false;
      if (filterStatus === 'success' && log.response_status >= 400) return false;
      if (filterStatus === 'error' && log.response_status < 400) return false;
      return true;
    });
  }, [logs, filterEndpoint, filterStatus]);

  const metrics: MetricSummary = useMemo(() => {
    const total = filteredLogs.length;
    const success = filteredLogs.filter(l => l.response_status < 400).length;
    const failure = total - success;
    const times = filteredLogs.map(l => l.response_time_ms || 0);
    return {
      total,
      success,
      failure,
      avgResponseTime: total > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / total) : 0,
      peakResponseTime: times.length > 0 ? Math.max(...times) : 0,
      errorRate: total > 0 ? Math.round((failure / total) * 100 * 10) / 10 : 0,
    };
  }, [filteredLogs]);

  const endpointBreakdown = useMemo(() => {
    const map: Record<string, { total: number; success: number; failure: number; avgTime: number }> = {};
    filteredLogs.forEach(log => {
      if (!map[log.endpoint]) map[log.endpoint] = { total: 0, success: 0, failure: 0, avgTime: 0 };
      map[log.endpoint].total++;
      if (log.response_status < 400) map[log.endpoint].success++;
      else map[log.endpoint].failure++;
      map[log.endpoint].avgTime += log.response_time_ms || 0;
    });
    return Object.entries(map).map(([endpoint, stats]) => ({
      endpoint,
      total: stats.total,
      success: stats.success,
      failure: stats.failure,
      avgTime: Math.round(stats.avgTime / stats.total),
      errorRate: Math.round((stats.failure / stats.total) * 100 * 10) / 10,
    })).sort((a, b) => b.total - a.total);
  }, [filteredLogs]);

  const dailyChart = useMemo(() => {
    const map: Record<string, { date: string; requests: number; errors: number }> = {};
    filteredLogs.forEach(log => {
      const day = format(new Date(log.created_at), 'MM/dd');
      if (!map[day]) map[day] = { date: day, requests: 0, errors: 0 };
      map[day].requests++;
      if (log.response_status >= 400) map[day].errors++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredLogs]);

  const uniqueEndpoints = useMemo(() => [...new Set(logs.map(l => l.endpoint).filter(Boolean))], [logs]);

  const pieData = [
    { name: 'Success', value: metrics.success },
    { name: 'Errors', value: metrics.failure },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label>Endpoint</Label>
              <Select value={filterEndpoint} onValueChange={setFilterEndpoint}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Endpoints</SelectItem>
                  {uniqueEndpoints.map(ep => <SelectItem key={ep} value={ep}>{ep}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="pt-4 text-center">
          <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{metrics.total}</p>
          <p className="text-xs text-muted-foreground">Total Requests</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <CheckCircle className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{metrics.success}</p>
          <p className="text-xs text-muted-foreground">Success</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold">{metrics.failure}</p>
          <p className="text-xs text-muted-foreground">Failures</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{metrics.avgResponseTime}ms</p>
          <p className="text-xs text-muted-foreground">Avg Response</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{metrics.peakResponseTime}ms</p>
          <p className="text-xs text-muted-foreground">Peak Response</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 text-center">
          <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold">{metrics.errorRate}%</p>
          <p className="text-xs text-muted-foreground">Error Rate</p>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Daily Request Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="requests" fill="hsl(var(--primary))" name="Requests" radius={[4, 4, 0, 0]} />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Errors" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Success vs Errors</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Breakdown */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Requests by Endpoint</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Failures</TableHead>
                <TableHead>Error Rate</TableHead>
                <TableHead>Avg Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpointBreakdown.map(row => (
                <TableRow key={row.endpoint}>
                  <TableCell className="font-mono text-xs">{row.endpoint}</TableCell>
                  <TableCell>{row.total}</TableCell>
                  <TableCell className="text-primary">{row.success}</TableCell>
                  <TableCell className="text-destructive">{row.failure}</TableCell>
                  <TableCell>
                    <Badge variant={row.errorRate > 10 ? 'destructive' : 'outline'}>{row.errorRate}%</Badge>
                  </TableCell>
                  <TableCell>{row.avgTime}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiPerformanceTab;
