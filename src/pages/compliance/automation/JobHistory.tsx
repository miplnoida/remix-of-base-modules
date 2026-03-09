import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, CheckCircle, XCircle, Search, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface AutomationRun {
  id: string;
  job_id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  records_processed: number | null;
  records_affected: number | null;
  error_message: string | null;
  triggered_by: string | null;
}

interface AutomationJob {
  id: string;
  name: string;
}

const JobHistory = () => {
  const [jobFilter, setJobFilter] = useState('All');
  const [search, setSearch] = useState('');

  const { data: jobs = [] } = useQuery({
    queryKey: ['ce_automation_jobs_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_automation_jobs').select('id, name');
      if (error) throw error;
      return (data || []) as unknown as AutomationJob[];
    },
  });

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['ce_automation_runs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ce_automation_runs').select('*').order('started_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data || []) as unknown as AutomationRun[];
    },
  });

  const jobNameMap = Object.fromEntries(jobs.map(j => [j.id, j.name]));
  const jobNames = ['All', ...jobs.map(j => j.name)];

  const filtered = runs.filter(h => {
    const jName = jobNameMap[h.job_id] || 'Unknown';
    return (jobFilter === 'All' || jName === jobFilter) &&
      (search === '' || h.id.toLowerCase().includes(search.toLowerCase()));
  });

  const getDuration = (start: string, end: string | null) => {
    if (!end) return 'Running...';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Timer className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold text-foreground">Job Execution History</h1>
          </div>
          <p className="text-muted-foreground">View execution logs and results for all automation jobs</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Executions</p><p className="text-2xl font-bold text-foreground">{runs.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Successful</p><p className="text-2xl font-bold text-success">{runs.filter(h => h.status === 'COMPLETED').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-destructive">{runs.filter(h => h.status === 'FAILED').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Records Processed</p><p className="text-2xl font-bold text-primary">{runs.reduce((sum, h) => sum + (h.records_processed || 0), 0).toLocaleString()}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by execution ID..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-[260px]"><SelectValue placeholder="Filter by job" /></SelectTrigger>
              <SelectContent>{jobNames.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No execution history found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Job Name</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Start Time</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Duration</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Records</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Affected</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Triggered By</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(h => (
                    <tr key={h.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                      <td className="py-2 px-3 text-foreground">{jobNameMap[h.job_id] || 'Unknown'}</td>
                      <td className="py-2 px-3 text-foreground text-xs">{new Date(h.started_at).toLocaleString()}</td>
                      <td className="py-2 px-3 text-muted-foreground">{getDuration(h.started_at, h.completed_at)}</td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant={h.status === 'COMPLETED' ? 'default' : h.status === 'FAILED' ? 'destructive' : 'secondary'} className="text-[10px] gap-1">
                          {h.status === 'COMPLETED' ? <CheckCircle className="h-3 w-3" /> : h.status === 'FAILED' ? <XCircle className="h-3 w-3" /> : null}
                          {h.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-right text-foreground">{(h.records_processed || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-foreground">{h.records_affected || 0}</td>
                      <td className="py-2 px-3 text-foreground">{h.triggered_by}</td>
                      <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JobHistory;
