import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Download, ShieldCheck, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, XCircle, Ban, ShieldOff } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { useCloudflareConfig } from '@/hooks/useCloudflareConfig';

const PAGE_SIZE = 20;

const LoginSecurityLogs: React.FC = () => {
  const [page, setPage] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [emailFilter, setEmailFilter] = useState('');
  const { data: cfConfig, isLoading: cfLoading } = useCloudflareConfig();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['login-security-events', page, dateFrom, dateTo, resultFilter, riskFilter, emailFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from('login_security_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) query = query.lte('created_at', new Date(dateTo + 'T23:59:59').toISOString());
      if (resultFilter !== 'all') query = query.eq('verification_result', resultFilter);
      if (riskFilter !== 'all') query = query.eq('risk_level', riskFilter);
      if (emailFilter) query = query.ilike('user_email', `%${emailFilter}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: data || [], count: count || 0 };
    }
  });

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'passed': return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Passed</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'skipped': return <Badge className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Skipped</Badge>;
      case 'rate_limited': return <Badge className="bg-orange-600 text-white"><Ban className="h-3 w-3 mr-1" />Rate Limited</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      default: return <Badge variant="outline">{result}</Badge>;
    }
  };

  const getLoginBadge = (success: boolean | null) => {
    if (success === true) return <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
    if (success === false) return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low': return <Badge variant="outline" className="border-green-500 text-green-600">Low</Badge>;
      case 'medium': return <Badge className="bg-yellow-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Medium</Badge>;
      case 'high': return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />High</Badge>;
      default: return <Badge variant="secondary">{risk}</Badge>;
    }
  };

  const handleExport = () => {
    if (!data?.logs?.length) return;
    const headers = ['Timestamp', 'Email', 'Login Result', 'Verification', 'Risk Level', 'Token Valid', 'IP Address', 'Device Fingerprint', 'Failure Reason'];
    const rows = data.logs.map((log: any) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.user_email || '',
      log.login_success ? 'Success' : 'Failed',
      log.verification_result,
      log.risk_level,
      log.turnstile_token_valid ? 'Yes' : 'No',
      log.ip_address || '',
      log.device_fingerprint || '',
      log.failure_reason || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-security-events-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Summary stats
  const totalCount = data?.count || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Cloudflare status banner */}
      {!cfLoading && cfConfig && !cfConfig.enabled && (
        <Alert variant="destructive">
          <ShieldOff className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Cloudflare human verification is currently <strong>disabled</strong>. 
            Login attempts are not being verified for bot activity. Enable it from{' '}
            <a href="/admin/global-settings" className="underline font-medium">Global Settings</a>.
          </AlertDescription>
        </Alert>
      )}
      {!cfLoading && cfConfig?.enabled && (
        <Alert className="border-primary/30 bg-primary/5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertDescription>
            Cloudflare human verification is <strong>enabled</strong>. Allowed risk level:{' '}
            <Badge variant="outline" className="ml-1">
              {cfConfig.allowedRiskLevel === 'LOW' ? 'Low only' : cfConfig.allowedRiskLevel === 'MEDIUM' ? 'Low + Medium' : 'All risks'}
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Login Verification Logs
          </h1>
          <p className="text-muted-foreground">Monitor Cloudflare Turnstile human verification events and login security</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!data?.logs?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label>Verification Result</Label>
              <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                  <SelectItem value="rate_limited">Rate Limited</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select value={riskFilter} onValueChange={(v) => { setRiskFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input placeholder="Search email..." value={emailFilter} onChange={(e) => { setEmailFilter(e.target.value); setPage(0); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                   <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Login Result</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Failure Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm">{log.user_email || '-'}</TableCell>
                      <TableCell>{getLoginBadge(log.login_success)}</TableCell>
                      <TableCell>{getResultBadge(log.verification_result)}</TableCell>
                      <TableCell>{getRiskBadge(log.risk_level)}</TableCell>
                      <TableCell className="font-mono text-xs">{log.ip_address || '-'}</TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate text-destructive">
                        {log.failure_reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No login verification events found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {totalCount > 0
                    ? `Showing ${page * PAGE_SIZE + 1} – ${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount}`
                    : 'No records'}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= totalCount}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginSecurityLogs;
