import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database, Search, RefreshCw, AlertTriangle, CheckCircle,
  Clock, Loader2, Play
} from 'lucide-react';
import { useLedgerEntries, useLedgerPeriods, useTriggerAutomationJob } from '@/hooks/useComplianceLedger';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'XCD', minimumFractionDigits: 2 }).format(amount);

export default function LedgerAdministration() {
  const [entryFilters, setEntryFilters] = useState<{
    employerId?: string; fundType?: string; entryType?: string; status?: string; period?: string;
  }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: entries = [], isLoading: entriesLoading } = useLedgerEntries(entryFilters);
  const { data: periods = [], isLoading: periodsLoading } = useLedgerPeriods();
  const triggerJob = useTriggerAutomationJob();

  // Automation jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['ce_automation_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_automation_jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Recent automation runs
  const { data: runs = [] } = useQuery({
    queryKey: ['ce_automation_runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ce_automation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const filteredPeriods = periods.filter(p =>
    !searchTerm || p.employer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.period.includes(searchTerm)
  );

  const handleTriggerJob = (jobCode: string) => {
    const functionMap: Record<string, string> = {
      PENALTY_ENGINE: 'ce-penalty-engine',
      BREACH_MONITOR: 'ce-breach-monitor',
      RISK_RECALC: 'ce-risk-recalculation',
    };
    const functionName = functionMap[jobCode];
    if (functionName) {
      triggerJob.mutate({ functionName, body: { triggered_by: 'ADMIN' } });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="h-6 w-6" /> Ledger Administration
        </h1>
        <p className="text-muted-foreground">
          Manage financial ledger periods, entries, reconciliation, and automation jobs
        </p>
      </div>

      <Tabs defaultValue="periods">
        <TabsList>
          <TabsTrigger value="periods">Period Summaries</TabsTrigger>
          <TabsTrigger value="entries">Ledger Entries</TabsTrigger>
          <TabsTrigger value="automation">Automation Jobs</TabsTrigger>
          <TabsTrigger value="runs">Run History</TabsTrigger>
        </TabsList>

        {/* Period Summaries */}
        <TabsContent value="periods" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employer or period..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {periodsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead className="text-right">Principal</TableHead>
                      <TableHead className="text-right">Penalties</TableHead>
                      <TableHead className="text-right">Interest</TableHead>
                      <TableHead className="text-right">Payments</TableHead>
                      <TableHead className="text-right">Waivers</TableHead>
                      <TableHead className="text-right font-bold">Balance</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPeriods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No period summaries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPeriods.slice(0, 100).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-sm">{p.employer_id}</TableCell>
                          <TableCell className="font-mono">{p.period}</TableCell>
                          <TableCell><Badge variant="outline">{p.fund_type}</Badge></TableCell>
                          <TableCell className="text-right">{formatCurrency(p.principal_due)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(p.penalties)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.interest)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(p.payments)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.waivers)}</TableCell>
                          <TableCell className="text-right font-bold">
                            <span className={p.balance > 0 ? 'text-destructive' : 'text-green-600'}>
                              {formatCurrency(p.balance)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{p.entry_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ledger Entries */}
        <TabsContent value="entries" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Input
              placeholder="Employer ID"
              className="w-40"
              value={entryFilters.employerId || ''}
              onChange={(e) => setEntryFilters({ ...entryFilters, employerId: e.target.value || undefined })}
            />
            <Select value={entryFilters.fundType || 'all'} onValueChange={(v) => setEntryFilters({ ...entryFilters, fundType: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Fund" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Funds</SelectItem>
                <SelectItem value="SS">SS</SelectItem>
                <SelectItem value="LEVY">LEVY</SelectItem>
                <SelectItem value="EI">EI</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entryFilters.status || 'all'} onValueChange={(v) => setEntryFilters({ ...entryFilters, status: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="POSTED">POSTED</SelectItem>
                <SelectItem value="REVERSED">REVERSED</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Period (YYYYMM)"
              className="w-40"
              value={entryFilters.period || ''}
              onChange={(e) => setEntryFilters({ ...entryFilters, period: e.target.value || undefined })}
            />
          </div>

          {entriesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Fund</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No ledger entries found
                        </TableCell>
                      </TableRow>
                    ) : (
                      entries.map((e: any) => (
                        <TableRow key={e.id} className={e.status === 'REVERSED' ? 'opacity-50' : ''}>
                          <TableCell className="text-sm">{new Date(e.posted_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono text-sm">{e.employer_id}</TableCell>
                          <TableCell className="font-mono text-sm">{e.period}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{e.fund_type}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{e.entry_type?.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {e.debit_amount > 0 ? formatCurrency(e.debit_amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-600">
                            {e.credit_amount > 0 ? formatCurrency(e.credit_amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(e.running_balance)}</TableCell>
                          <TableCell>
                            <Badge variant={e.status === 'POSTED' ? 'default' : 'destructive'} className="text-xs">
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{e.posted_by}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Automation Jobs */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { code: 'PENALTY_ENGINE', name: 'Penalty Engine', desc: 'Calculate and post penalties for overdue employers', icon: AlertTriangle },
              { code: 'BREACH_MONITOR', name: 'Breach Monitor', desc: 'Detect arrangement breaches from missed installments', icon: RefreshCw },
              { code: 'RISK_RECALC', name: 'Risk Recalculation', desc: 'Recalculate employer risk scores using active policy', icon: CheckCircle },
            ].map((job) => {
              const dbJob = jobs.find((j: any) => j.job_code === job.code);
              return (
                <Card key={job.code}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <job.icon className="h-4 w-4" /> {job.name}
                      </CardTitle>
                      <Badge variant={dbJob?.is_enabled ? 'default' : 'secondary'}>
                        {dbJob?.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{job.desc}</p>
                    {dbJob && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Last Run: {dbJob.last_run_at ? new Date(dbJob.last_run_at).toLocaleString() : 'Never'}</p>
                        <p>Status: <Badge variant="outline" className="text-xs">{dbJob.last_run_status || 'N/A'}</Badge></p>
                        {dbJob.schedule_cron && <p>Schedule: <code>{dbJob.schedule_cron}</code></p>}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleTriggerJob(job.code)}
                      disabled={triggerJob.isPending}
                    >
                      {triggerJob.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Run History */}
        <TabsContent value="runs">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Processed</TableHead>
                    <TableHead className="text-right">Affected</TableHead>
                    <TableHead>Triggered By</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No automation runs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.started_at ? new Date(r.started_at).toLocaleString() : '-'}</TableCell>
                        <TableCell className="text-sm">{r.completed_at ? new Date(r.completed_at).toLocaleString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            r.status === 'Completed' ? 'default' :
                            r.status === 'Running' ? 'secondary' :
                            'destructive'
                          } className="text-xs">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.records_processed ?? '-'}</TableCell>
                        <TableCell className="text-right">{r.records_affected ?? '-'}</TableCell>
                        <TableCell className="text-sm">{r.triggered_by}</TableCell>
                        <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                          {r.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
