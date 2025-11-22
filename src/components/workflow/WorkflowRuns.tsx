import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, XCircle, RotateCw } from "lucide-react";
import { mockWorkflowRuns } from "@/services/mockData/workflowData";
import RunDetailDialog from "./RunDetailDialog";
import { useToast } from "@/hooks/use-toast";

export default function WorkflowRuns() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const filteredRuns = mockWorkflowRuns.filter(
    (run) =>
      run.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      run.startedByName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "InProgress":
        return "bg-blue-100 text-blue-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleAction = (action: string, runId: string) => {
    toast({ title: action, description: `Action performed on run ${runId}` });
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{mockWorkflowRuns.length}</div>
            <p className="text-sm text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {mockWorkflowRuns.filter((r) => r.status === "InProgress").length}
            </div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {mockWorkflowRuns.filter((r) => r.status === "Completed").length}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {mockWorkflowRuns.filter((r) => r.status === "Failed").length}
            </div>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {mockWorkflowRuns.filter((r) => r.status === "Pending").length}
            </div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Input
        placeholder="Search runs..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Started By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Step</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead>Completed At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRuns.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-mono text-xs">{run.id}</TableCell>
                <TableCell className="font-medium">{run.workflowName}</TableCell>
                <TableCell>{run.startedByName}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(run.status)}>{run.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {run.currentStep || "-"}
                </TableCell>
                <TableCell className="text-sm">
                  {new Date(run.startedAt).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">
                  {run.completedAt ? new Date(run.completedAt).toLocaleString() : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRunId(run.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {run.status === "InProgress" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction("Cancel", run.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {run.status === "Failed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction("Retry", run.id)}
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <RunDetailDialog
        open={!!selectedRunId}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
        runId={selectedRunId || ""}
      />
    </div>
  );
}
