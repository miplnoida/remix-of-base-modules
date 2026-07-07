import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useClaimWorkflowTask, useCompleteWorkflowTask, useMyWorkflowTasks, useWorkflowTasks,
} from '@/platform/workflow/useWorkflow';
import type { WorkflowInboxFilters, WorkflowPriority, WorkflowTask, WorkflowTaskStatus } from '@/platform/workflow/workflowTypes';
import { Inbox, CheckCircle2, Hand } from 'lucide-react';

const STATUS_OPTIONS: (WorkflowTaskStatus | 'ALL')[] = ['ALL', 'OPEN', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED', 'EXPIRED', 'CANCELLED'];
const PRIORITY_OPTIONS: (WorkflowPriority | 'ALL')[] = ['ALL', 'LOW', 'NORMAL', 'HIGH', 'URGENT'];

function priorityBadge(p: WorkflowPriority) {
  const map: Record<WorkflowPriority, string> = {
    LOW: 'bg-muted text-muted-foreground',
    NORMAL: 'bg-secondary text-secondary-foreground',
    HIGH: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    URGENT: 'bg-destructive/15 text-destructive',
  };
  return <Badge variant="outline" className={map[p]}>{p}</Badge>;
}

function statusBadge(s: WorkflowTaskStatus) {
  return <Badge variant="secondary">{s.replace('_', ' ')}</Badge>;
}

function TaskTable({ tasks, isLoading, showClaim }: { tasks: WorkflowTask[]; isLoading: boolean; showClaim?: boolean }) {
  const claim = useClaimWorkflowTask();
  const complete = useCompleteWorkflowTask();
  const overdue = (t: WorkflowTask) => t.due_at && new Date(t.due_at) < new Date();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Step</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
        )}
        {!isLoading && tasks.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No tasks.</TableCell></TableRow>
        )}
        {tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <div className="font-medium">{t.task_name}</div>
              {t.task_description && <div className="text-xs text-muted-foreground">{t.task_description}</div>}
            </TableCell>
            <TableCell>{t.step_name ?? t.step_code}</TableCell>
            <TableCell>{priorityBadge(t.priority)}</TableCell>
            <TableCell>
              {t.due_at ? (
                <span className={overdue(t) ? 'text-destructive font-medium' : ''}>
                  {new Date(t.due_at).toLocaleString()}
                  {overdue(t) && <span className="ml-2 text-xs">(overdue)</span>}
                </span>
              ) : <span className="text-muted-foreground">—</span>}
            </TableCell>
            <TableCell>{statusBadge(t.task_status)}</TableCell>
            <TableCell className="text-right space-x-2">
              {showClaim && t.task_status === 'OPEN' && (
                <Button size="sm" variant="outline" onClick={() => claim.mutate(t.id)}>
                  <Hand className="w-3 h-3 mr-1" /> Claim
                </Button>
              )}
              {(t.task_status === 'CLAIMED' || t.task_status === 'IN_PROGRESS') && (
                <Button size="sm" onClick={() => complete.mutate({ taskId: t.id, outcome: 'COMPLETED' })}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function WorkflowInbox() {
  const [scope, setScope] = useState<'mine' | 'team' | 'all'>('mine');
  const [filters, setFilters] = useState<WorkflowInboxFilters>({ status: 'ALL', priority: 'ALL' });

  const mine = useMyWorkflowTasks(filters);
  const all = useWorkflowTasks(filters);

  const active = scope === 'mine' ? mine : all;
  const tasks = useMemo(() => active.data ?? [], [active.data]);

  const overdueCount = tasks.filter((t) => t.due_at && new Date(t.due_at) < new Date()).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Inbox className="w-6 h-6" /> Workflow Inbox
          </h1>
          <p className="text-sm text-muted-foreground">Review and act on workflow tasks assigned to you or your team.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Search tasks…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-56"
          />
          <Select value={filters.status ?? 'ALL'} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.priority ?? 'ALL'} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v as any }))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{PRIORITY_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {overdueCount > 0 && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">
            {overdueCount} task{overdueCount === 1 ? ' is' : 's are'} overdue and need your attention.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
            <TabsList>
              <TabsTrigger value="mine">My Tasks</TabsTrigger>
              <TabsTrigger value="team">Team Tasks</TabsTrigger>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
            </TabsList>
            <TabsContent value="mine" className="pt-4">
              <TaskTable tasks={mine.data ?? []} isLoading={mine.isLoading} />
            </TabsContent>
            <TabsContent value="team" className="pt-4">
              <TaskTable tasks={all.data ?? []} isLoading={all.isLoading} showClaim />
            </TabsContent>
            <TabsContent value="all" className="pt-4">
              <TaskTable tasks={all.data ?? []} isLoading={all.isLoading} showClaim />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
