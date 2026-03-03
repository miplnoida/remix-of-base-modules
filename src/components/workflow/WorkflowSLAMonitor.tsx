import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SLAViolation {
  id: string;
  workflowName: string;
  runId: string;
  stepName?: string;
  targetDuration: number;
  actualDuration: number;
  slaProgress: number;
  severity: "Warning" | "Critical";
  status: "Active" | "Resolved";
  startedAt: string;
}

const mockViolations: SLAViolation[] = [
  {
    id: "vio-001",
    workflowName: "Retirement Benefit Application",
    runId: "run-001",
    stepName: "Supervisor Review",
    targetDuration: 120,
    actualDuration: 165,
    slaProgress: 137,
    severity: "Critical",
    status: "Active",
    startedAt: "2024-11-22T08:30:00Z",
  },
  {
    id: "vio-002",
    workflowName: "Employer Registration",
    runId: "run-003",
    stepName: "Document Verification",
    targetDuration: 180,
    actualDuration: 156,
    slaProgress: 86,
    severity: "Warning",
    status: "Active",
    startedAt: "2024-11-22T09:15:00Z",
  },
  {
    id: "vio-003",
    workflowName: "Sickness Benefit Claim",
    runId: "run-005",
    targetDuration: 240,
    actualDuration: 268,
    slaProgress: 111,
    severity: "Critical",
    status: "Resolved",
    startedAt: "2024-11-21T14:00:00Z",
  },
];

export default function WorkflowSLAMonitor() {
  const activeViolations = mockViolations.filter((v) => v.status === "Active");
  const criticalCount = activeViolations.filter((v) => v.severity === "Critical").length;
  const warningCount = activeViolations.filter((v) => v.severity === "Warning").length;

  const getSeverityColor = (severity: string) => {
    return severity === "Critical" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">SLA Monitoring</h2>
        <p className="text-sm text-muted-foreground">
          Track and manage service level agreement violations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Violations</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeViolations.length}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground">Exceeded target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <p className="text-xs text-muted-foreground">Approaching limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89.2%</div>
            <p className="text-xs text-muted-foreground">Within SLA targets</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Violations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current and recent SLA violations requiring attention
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Run ID</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>SLA Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockViolations.map((violation) => (
                <TableRow key={violation.id}>
                  <TableCell>
                    <Badge className={getSeverityColor(violation.severity)} variant="secondary">
                      {violation.severity === "Critical" ? (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {violation.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{violation.workflowName}</TableCell>
                  <TableCell className="text-sm font-mono">{violation.runId}</TableCell>
                  <TableCell className="text-sm">{violation.stepName || "Entire Workflow"}</TableCell>
                  <TableCell className="text-sm">{violation.targetDuration}m</TableCell>
                  <TableCell className="text-sm">{violation.actualDuration}m</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(violation.slaProgress, 100)}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">
                        {violation.slaProgress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={violation.status === "Active" ? "destructive" : "outline"}>
                      {violation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                      {violation.status === "Active" && (
                        <Button variant="ghost" size="sm">
                          Escalate
                        </Button>
                      )}
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
