import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Play, Pause, Eye, Edit, Trash2, Plus, Search, Filter, Calendar, BarChart3, Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { schedulerService } from '@/services/schedulerService';
import { SchedulerTask, TaskFilters, ScheduleTaskRequest, TaskExecutionLog } from '@/types/scheduler';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const CentralScheduler = () => {
  const [tasks, setTasks] = useState<SchedulerTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SchedulerTask | null>(null);
  const [executionHistory, setExecutionHistory] = useState<TaskExecutionLog[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showReportsDialog, setShowReportsDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // New Task Form State
  const [newTask, setNewTask] = useState<Partial<ScheduleTaskRequest>>({
    taskType: 'Background Process',
    scheduleType: 'Recurring',
    priority: 'Medium',
    maxRetryCount: 3,
    payloadJson: {}
  });

  useEffect(() => {
    loadTasks();
  }, [filters]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await schedulerService.getTasks(filters);
      setTasks(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load scheduled tasks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async (task: SchedulerTask) => {
    try {
      if (task.status === 'Active') {
        await schedulerService.pauseTask(task.id);
        toast({
          title: 'Task Paused',
          description: `${task.taskName} has been paused`,
        });
      } else {
        await schedulerService.resumeTask(task.id);
        toast({
          title: 'Task Resumed',
          description: `${task.taskName} has been resumed`,
        });
      }
      loadTasks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    }
  };

  const handleRunNow = async (task: SchedulerTask) => {
    try {
      await schedulerService.runTaskNow(task.id);
      toast({
        title: 'Task Executed',
        description: `${task.taskName} has been executed successfully`,
      });
      loadTasks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to execute task',
        variant: 'destructive',
      });
    }
  };

  const handleViewHistory = async (task: SchedulerTask) => {
    try {
      const history = await schedulerService.getTaskExecutionHistory(task.id);
      setExecutionHistory(history);
      setSelectedTask(task);
      setShowHistoryDialog(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load execution history',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (task: SchedulerTask) => {
    if (!confirm(`Are you sure you want to delete "${task.taskName}"?`)) return;
    
    try {
      await schedulerService.deleteTask(task.id);
      toast({
        title: 'Task Deleted',
        description: `${task.taskName} has been deleted`,
      });
      loadTasks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.taskId || !newTask.moduleName || !newTask.taskName || !newTask.taskType) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      await schedulerService.scheduleTask(newTask as ScheduleTaskRequest);
      toast({
        title: 'Task Created',
        description: `${newTask.taskName} has been scheduled successfully`,
      });
      setShowCreateDialog(false);
      setNewTask({
        taskType: 'Background Process',
        scheduleType: 'Recurring',
        priority: 'Medium',
        maxRetryCount: 3,
        payloadJson: {}
      });
      loadTasks();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const getExecutionStats = () => {
    const allLogs: TaskExecutionLog[] = [];
    tasks.forEach(task => {
      const logs = schedulerService.getTaskExecutionHistory(task.id);
      if (Array.isArray(logs)) {
        allLogs.push(...logs);
      }
    });

    const last24Hours = allLogs.filter(log => 
      new Date(log.executionStartAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    return {
      totalExecutions: last24Hours.length,
      successful: last24Hours.filter(l => l.status === 'Success').length,
      failed: last24Hours.filter(l => l.status === 'Failed').length,
      running: last24Hours.filter(l => l.status === 'Running').length,
    };
  };

  const stats = getExecutionStats();

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Active: 'bg-green-100 text-green-800',
      Paused: 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-blue-100 text-blue-800',
      Failed: 'bg-red-100 text-red-800',
      Disabled: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      Low: 'bg-gray-100 text-gray-600',
      Medium: 'bg-blue-100 text-blue-600',
      High: 'bg-orange-100 text-orange-600',
      Critical: 'bg-red-100 text-red-600',
    };
    return <Badge className={variants[priority] || ''}>{priority}</Badge>;
  };

  const filteredTasks = tasks.filter(task =>
    task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.moduleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central Scheduler</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor automated tasks across all modules
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowReportsDialog(true)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule New Task
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Executions (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalExecutions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalExecutions > 0 
                ? Math.round((stats.successful / stats.totalExecutions) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.successful} successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Failed Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.failed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filters.moduleName || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, moduleName: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="C3 Management">C3 Management</SelectItem>
                <SelectItem value="Compliance">Compliance</SelectItem>
                <SelectItem value="Benefits">Benefits</SelectItem>
                <SelectItem value="Internal Audit">Internal Audit</SelectItem>
                <SelectItem value="Accounting">Accounting</SelectItem>
                <SelectItem value="Workflow Engine">Workflow Engine</SelectItem>
                <SelectItem value="Notification System">Notification System</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, status: value === 'all' ? undefined : value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Paused">Paused</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.taskType || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, taskType: value === 'all' ? undefined : value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Task Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Notification">Notification</SelectItem>
                <SelectItem value="Workflow Action">Workflow Action</SelectItem>
                <SelectItem value="Background Process">Background Process</SelectItem>
                <SelectItem value="Data Process">Data Process</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) =>
                setFilters({ ...filters, priority: value === 'all' ? undefined : value as any })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Tasks</CardTitle>
          <CardDescription>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.taskName}</TableCell>
                  <TableCell>{task.moduleName}</TableCell>
                  <TableCell>{task.taskType}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {task.scheduleType === 'Recurring' && task.cronExpression}
                      {task.scheduleType === 'Recurring' && task.frequencyMinutes && `Every ${task.frequencyMinutes}m`}
                      {task.scheduleType === 'One-time' && 'One-time'}
                      {task.scheduleType === 'Event-offset' && 'Event-based'}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(task.status)}</TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell className="text-sm">
                    {task.nextRunAt ? format(new Date(task.nextRunAt), 'MMM d, HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {task.lastRunAt ? format(new Date(task.lastRunAt), 'MMM d, HH:mm') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewHistory(task)}
                        title="View History"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRunNow(task)}
                        title="Run Now"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePauseResume(task)}
                        title={task.status === 'Active' ? 'Pause' : 'Resume'}
                      >
                        {task.status === 'Active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Execution History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Execution History</DialogTitle>
            <DialogDescription>
              {selectedTask?.taskName} - {selectedTask?.moduleName}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Execution Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Executed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executionHistory.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.executionStartAt), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          log.status === 'Success'
                            ? 'bg-green-100 text-green-800'
                            : log.status === 'Failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.executionEndAt &&
                        `${Math.round(
                          (new Date(log.executionEndAt).getTime() -
                            new Date(log.executionStartAt).getTime()) /
                            1000
                        )}s`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.executionDetails && (
                        <pre className="text-xs">
                          {JSON.stringify(log.executionDetails, null, 2)}
                        </pre>
                      )}
                      {log.errorMessage && (
                        <span className="text-red-600">{log.errorMessage}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{log.executedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Task</DialogTitle>
            <DialogDescription>
              Create a new scheduled task for automated execution
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskId">Task ID *</Label>
                <Input
                  id="taskId"
                  placeholder="TASK_UNIQUE_ID"
                  value={newTask.taskId || ''}
                  onChange={(e) => setNewTask({ ...newTask, taskId: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moduleName">Module *</Label>
                <Select value={newTask.moduleName} onValueChange={(value) => setNewTask({ ...newTask, moduleName: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C3 Management">C3 Management</SelectItem>
                    <SelectItem value="Compliance">Compliance</SelectItem>
                    <SelectItem value="Benefits">Benefits</SelectItem>
                    <SelectItem value="Internal Audit">Internal Audit</SelectItem>
                    <SelectItem value="Accounting">Accounting</SelectItem>
                    <SelectItem value="Workflow Engine">Workflow Engine</SelectItem>
                    <SelectItem value="Notification System">Notification System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taskName">Task Name *</Label>
              <Input
                id="taskName"
                placeholder="Enter descriptive task name"
                value={newTask.taskName || ''}
                onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taskType">Task Type *</Label>
                <Select value={newTask.taskType} onValueChange={(value: any) => setNewTask({ ...newTask, taskType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Notification">Notification</SelectItem>
                    <SelectItem value="Workflow Action">Workflow Action</SelectItem>
                    <SelectItem value="Background Process">Background Process</SelectItem>
                    <SelectItem value="Data Process">Data Process</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduleType">Schedule Type *</Label>
                <Select value={newTask.scheduleType} onValueChange={(value: any) => setNewTask({ ...newTask, scheduleType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One-time">One-time</SelectItem>
                    <SelectItem value="Recurring">Recurring</SelectItem>
                    <SelectItem value="Event-offset">Event-offset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cronExpression">Cron Expression</Label>
                <Input
                  id="cronExpression"
                  placeholder="0 0 * * * (daily at midnight)"
                  value={newTask.cronExpression || ''}
                  onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Example: 0 0 5 * * (daily at 5 AM)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this task does..."
                value={newTask.description || ''}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payloadJson">Payload JSON (Optional)</Label>
              <Textarea
                id="payloadJson"
                placeholder='{"key": "value"}'
                value={JSON.stringify(newTask.payloadJson, null, 2)}
                onChange={(e) => {
                  try {
                    setNewTask({ ...newTask, payloadJson: JSON.parse(e.target.value) });
                  } catch (err) {
                    // Invalid JSON, ignore
                  }
                }}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask}>
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports Dialog */}
      <Dialog open={showReportsDialog} onOpenChange={setShowReportsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scheduler Reports & Analytics</DialogTitle>
            <DialogDescription>
              View task execution history and performance metrics
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Execution Statistics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Execution Statistics (Last 24 Hours)</h3>
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{stats.totalExecutions}</div>
                      <p className="text-sm text-muted-foreground">Total Executions</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">{stats.successful}</div>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                      <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                      <div className="text-2xl font-bold text-yellow-600">{stats.running}</div>
                      <p className="text-sm text-muted-foreground">Running</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Executions by Module */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Recent Executions by Module</h3>
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Last Execution</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Next Run</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.slice(0, 10).map((task) => {
                        const lastLog = schedulerService.getTaskExecutionHistory(task.id)[0];
                        return (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.moduleName}</TableCell>
                            <TableCell>{task.taskName}</TableCell>
                            <TableCell className="text-sm">
                              {task.lastRunAt ? format(new Date(task.lastRunAt), 'MMM d, HH:mm:ss') : '-'}
                            </TableCell>
                            <TableCell>
                              {lastLog && (
                                <Badge
                                  className={
                                    lastLog.status === 'Success'
                                      ? 'bg-green-100 text-green-800'
                                      : lastLog.status === 'Failed'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }
                                >
                                  {lastLog.status}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {lastLog && lastLog.executionEndAt
                                ? `${Math.round(
                                    (new Date(lastLog.executionEndAt).getTime() -
                                      new Date(lastLog.executionStartAt).getTime()) /
                                      1000
                                  )}s`
                                : '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {task.nextRunAt ? format(new Date(task.nextRunAt), 'MMM d, HH:mm') : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Tasks by Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Tasks by Status</h3>
              <div className="grid grid-cols-5 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {tasks.filter(t => t.status === 'Active').length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Active</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {tasks.filter(t => t.status === 'Paused').length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Paused</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {tasks.filter(t => t.status === 'Completed').length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Completed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {tasks.filter(t => t.status === 'Failed').length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Failed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {tasks.filter(t => t.status === 'Disabled').length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Disabled</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CentralScheduler;
