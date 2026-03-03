import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Play, Pause, StopCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface WorkflowExecution {
  id: string;
  workflowName: string;
  status: "Running" | "Paused" | "Completed" | "Failed";
  currentStep: string;
  progress: number;
  startedAt: string;
  elapsedTime: string;
  estimatedCompletion: string;
  assignedTo: string;
}

const mockExecutions: WorkflowExecution[] = [
  {
    id: "exec-001",
    workflowName: "Retirement Benefit Application",
    status: "Running",
    currentStep: "Supervisor Review (Step 3/5)",
    progress: 60,
    startedAt: "2024-11-22T08:30:00Z",
    elapsedTime: "2h 15m",
    estimatedCompletion: "1h 30m remaining",
    assignedTo: "John Doe",
  },
  {
    id: "exec-002",
    workflowName: "Sickness Benefit Claim",
    status: "Running",
    currentStep: "Medical Verification (Step 2/4)",
    progress: 50,
    startedAt: "2024-11-22T09:00:00Z",
    elapsedTime: "1h 45m",
    estimatedCompletion: "1h 45m remaining",
    assignedTo: "Jane Smith",
  },
  {
    id: "exec-003",
    workflowName: "Employer Registration",
    status: "Paused",
    currentStep: "Document Verification (Step 2/6)",
    progress: 33,
    startedAt: "2024-11-22T07:00:00Z",
    elapsedTime: "3h 45m",
    estimatedCompletion: "Paused",
    assignedTo: "Mike Johnson",
  },
  {
    id: "exec-004",
    workflowName: "Compliance Audit",
    status: "Running",
    currentStep: "Field Inspection (Step 4/7)",
    progress: 57,
    startedAt: "2024-11-22T06:30:00Z",
    elapsedTime: "4h 15m",
    estimatedCompletion: "3h remaining",
    assignedTo: "Sarah Williams",
  },
];

export default function WorkflowExecutionMonitor() {
  const [executions] = useState<WorkflowExecution[]>(mockExecutions);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExecutions = executions.filter(
    (exec) =>
      exec.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Running: "bg-info/10 text-info",
      Paused: "bg-warning/15 text-warning",
      Completed: "bg-success/10 text-success",
      Failed: "bg-destructive/10 text-destructive",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  const runningCount = executions.filter((e) => e.status === "Running").length;
  const pausedCount = executions.filter((e) => e.status === "Paused").length;
  const avgProgress =
    executions.reduce((sum, e) => sum + e.progress, 0) / executions.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Execution Monitor</h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of running workflow instances
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Play className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningCount}</div>
            <p className="text-xs text-muted-foreground">Active executions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pausedCount}</div>
            <p className="text-xs text-muted-foreground">Waiting for action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Overall completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2h 45m</div>
            <p className="text-xs text-muted-foreground">Current average</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by workflow or assignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Step</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Elapsed Time</TableHead>
                <TableHead>Est. Completion</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExecutions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell className="font-medium">{exec.workflowName}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(exec.status)} variant="secondary">
                      {exec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{exec.currentStep}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={exec.progress} className="w-20" />
                      <span className="text-sm text-muted-foreground">{exec.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{exec.elapsedTime}</TableCell>
                  <TableCell className="text-sm">{exec.estimatedCompletion}</TableCell>
                  <TableCell className="text-sm">{exec.assignedTo}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {exec.status === "Running" && (
                        <Button variant="ghost" size="sm">
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {exec.status === "Paused" && (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <StopCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
