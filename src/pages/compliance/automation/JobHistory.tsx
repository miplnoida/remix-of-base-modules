import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Timer, CheckCircle, XCircle, Clock, Search, Eye, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockHistory = [
  { id: 'JH-001', jobName: 'Daily Violation Scan', startTime: '2026-03-08 06:00:12', endTime: '2026-03-08 06:02:45', duration: '2m 33s', status: 'success', recordsProcessed: 1247, violationsCreated: 3, errors: 0 },
  { id: 'JH-002', jobName: 'Weekly Escalation Review', startTime: '2026-03-03 07:00:00', endTime: '2026-03-03 07:01:18', duration: '1m 18s', status: 'success', recordsProcessed: 45, violationsCreated: 0, errors: 0 },
  { id: 'JH-003', jobName: 'Monthly Penalty/Interest Recalc', startTime: '2026-03-01 02:00:00', endTime: '2026-03-01 02:08:42', duration: '8m 42s', status: 'success', recordsProcessed: 892, violationsCreated: 0, errors: 0 },
  { id: 'JH-004', jobName: 'Monthly Risk Reclassification', startTime: '2026-03-01 04:00:00', endTime: '2026-03-01 04:03:15', duration: '3m 15s', status: 'failed', recordsProcessed: 156, violationsCreated: 0, errors: 12 },
  { id: 'JH-005', jobName: 'Daily Violation Scan', startTime: '2026-03-07 06:00:08', endTime: '2026-03-07 06:02:30', duration: '2m 22s', status: 'success', recordsProcessed: 1247, violationsCreated: 1, errors: 0 },
  { id: 'JH-006', jobName: 'Daily Violation Scan', startTime: '2026-03-06 06:00:05', endTime: '2026-03-06 06:02:18', duration: '2m 13s', status: 'success', recordsProcessed: 1245, violationsCreated: 5, errors: 0 },
  { id: 'JH-007', jobName: 'Weekly Escalation Review', startTime: '2026-02-24 07:00:00', endTime: '2026-02-24 07:01:05', duration: '1m 05s', status: 'success', recordsProcessed: 38, violationsCreated: 0, errors: 0 },
];

const JobHistory = () => {
  const [jobFilter, setJobFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = mockHistory.filter(h =>
    (jobFilter === 'All' || h.jobName === jobFilter) &&
    (search === '' || h.id.toLowerCase().includes(search.toLowerCase()))
  );

  const jobNames = ['All', ...Array.from(new Set(mockHistory.map(h => h.jobName)))];

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
        <Button variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Executions</p><p className="text-2xl font-bold text-foreground">{mockHistory.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Successful</p><p className="text-2xl font-bold text-success">{mockHistory.filter(h => h.status === 'success').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-destructive">{mockHistory.filter(h => h.status === 'failed').length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Violations Created</p><p className="text-2xl font-bold text-primary">{mockHistory.reduce((sum, h) => sum + h.violationsCreated, 0)}</p></CardContent></Card>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">ID</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Job Name</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Start Time</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Duration</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Records</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Violations</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Errors</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-b last:border-0 border-border hover:bg-muted/50">
                    <td className="py-2 px-3 font-mono text-xs text-foreground">{h.id}</td>
                    <td className="py-2 px-3 text-foreground">{h.jobName}</td>
                    <td className="py-2 px-3 text-foreground text-xs">{h.startTime}</td>
                    <td className="py-2 px-3 text-muted-foreground">{h.duration}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant={h.status === 'success' ? 'default' : 'destructive'} className="text-[10px] gap-1">
                        {h.status === 'success' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {h.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">{h.recordsProcessed.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-foreground">{h.violationsCreated}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={h.errors > 0 ? 'text-destructive font-medium' : 'text-foreground'}>{h.errors}</span>
                    </td>
                    <td className="py-2 px-3 text-right"><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobHistory;
