import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Link2, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkflowStep {
  id: string;
  workflowId: string;
  workflowName: string;
  stepNumber: number;
  stepName: string;
  stepType: string;
  assignedTo?: string;
  estimatedDuration: number;
  actualDuration?: number;
  status: string;
  linkedToDesigner: boolean;
}

const mockSteps: WorkflowStep[] = [
  {
    id: "step-001",
    workflowId: "wf-001",
    workflowName: "Retirement Benefit Application",
    stepNumber: 1,
    stepName: "Application Intake",
    stepType: "task",
    assignedTo: "Customer Service",
    estimatedDuration: 15,
    actualDuration: 12,
    status: "Active",
    linkedToDesigner: true,
  },
  {
    id: "step-002",
    workflowId: "wf-001",
    workflowName: "Retirement Benefit Application",
    stepNumber: 2,
    stepName: "Eligibility Check",
    stepType: "automation",
    estimatedDuration: 5,
    actualDuration: 3,
    status: "Active",
    linkedToDesigner: true,
  },
  {
    id: "step-003",
    workflowId: "wf-001",
    workflowName: "Retirement Benefit Application",
    stepNumber: 3,
    stepName: "Supervisor Review",
    stepType: "decision",
    assignedTo: "Supervisor",
    estimatedDuration: 30,
    actualDuration: 45,
    status: "Active",
    linkedToDesigner: true,
  },
  {
    id: "step-004",
    workflowId: "wf-002",
    workflowName: "Sickness Benefit Claim",
    stepNumber: 1,
    stepName: "Medical Certificate Upload",
    stepType: "task",
    assignedTo: "Claims Officer",
    estimatedDuration: 10,
    status: "Active",
    linkedToDesigner: false,
  },
  {
    id: "step-005",
    workflowId: "wf-002",
    workflowName: "Sickness Benefit Claim",
    stepNumber: 2,
    stepName: "Medical Verification",
    stepType: "automation",
    estimatedDuration: 15,
    status: "Active",
    linkedToDesigner: false,
  },
];

export default function WorkflowStepsManager() {
  const { toast } = useToast();
  const [steps, setSteps] = useState<WorkflowStep[]>(mockSteps);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterWorkflow, setFilterWorkflow] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const filteredSteps = steps.filter((step) => {
    const matchesSearch =
      step.stepName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      step.workflowName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWorkflow = filterWorkflow === "all" || step.workflowId === filterWorkflow;
    const matchesType = filterType === "all" || step.stepType === filterType;
    return matchesSearch && matchesWorkflow && matchesType;
  });

  const getStepTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      task: "bg-blue-100 text-blue-800",
      decision: "bg-orange-100 text-orange-800",
      automation: "bg-yellow-100 text-yellow-800",
      timer: "bg-purple-100 text-purple-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const handleLinkToDesigner = (stepId: string) => {
    toast({
      title: "Link to Designer",
      description: "Step linked to visual designer successfully",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Steps Manager</h2>
          <p className="text-sm text-muted-foreground">
            Manage workflow steps through table structure and link to designer
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Step
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search steps or workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterWorkflow} onValueChange={setFilterWorkflow}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workflows</SelectItem>
                <SelectItem value="wf-001">Retirement Benefit</SelectItem>
                <SelectItem value="wf-002">Sickness Benefit</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="decision">Decision</SelectItem>
                <SelectItem value="automation">Automation</SelectItem>
                <SelectItem value="timer">Timer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Step Name</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Est. Duration</TableHead>
                <TableHead>Avg. Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Designer Link</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSteps.map((step) => (
                <TableRow key={step.id}>
                  <TableCell className="font-semibold">{step.stepNumber}</TableCell>
                  <TableCell className="font-medium">{step.stepName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {step.workflowName}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStepTypeColor(step.stepType)} variant="secondary">
                      {step.stepType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{step.assignedTo || "-"}</TableCell>
                  <TableCell className="text-sm">{step.estimatedDuration}m</TableCell>
                  <TableCell className="text-sm">
                    {step.actualDuration ? `${step.actualDuration}m` : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={step.status === "Active" ? "default" : "secondary"}>
                      {step.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {step.linkedToDesigner ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <Link2 className="mr-1 h-3 w-3" />
                        Linked
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLinkToDesigner(step.id)}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
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
