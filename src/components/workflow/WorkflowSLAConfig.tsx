import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SLAConfig {
  id: string;
  workflowName: string;
  stepName?: string;
  targetDuration: number;
  unit: "minutes" | "hours" | "days";
  warningThreshold: number;
  criticalThreshold: number;
  status: "Active" | "Inactive";
}

const mockSLAs: SLAConfig[] = [
  {
    id: "sla-001",
    workflowName: "Retirement Benefit Application",
    stepName: "Application Intake",
    targetDuration: 30,
    unit: "minutes",
    warningThreshold: 80,
    criticalThreshold: 100,
    status: "Active",
  },
  {
    id: "sla-002",
    workflowName: "Retirement Benefit Application",
    stepName: "Supervisor Review",
    targetDuration: 2,
    unit: "hours",
    warningThreshold: 80,
    criticalThreshold: 100,
    status: "Active",
  },
  {
    id: "sla-003",
    workflowName: "Sickness Benefit Claim",
    targetDuration: 1,
    unit: "days",
    warningThreshold: 75,
    criticalThreshold: 90,
    status: "Active",
  },
  {
    id: "sla-004",
    workflowName: "Employer Registration",
    targetDuration: 3,
    unit: "days",
    warningThreshold: 80,
    criticalThreshold: 95,
    status: "Active",
  },
];

export default function WorkflowSLAConfig() {
  const { toast } = useToast();
  const [slas, setSlas] = useState<SLAConfig[]>(mockSLAs);
  const [showDialog, setShowDialog] = useState(false);

  const handleCreate = () => {
    toast({
      title: "SLA Created",
      description: "SLA configuration has been created successfully",
    });
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    setSlas(slas.filter((s) => s.id !== id));
    toast({
      title: "SLA Deleted",
      description: "SLA configuration has been removed",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SLA Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Configure and manage service level agreements for workflows
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New SLA
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create SLA Configuration</DialogTitle>
              <DialogDescription>
                Define service level agreement for workflow execution
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Workflow</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wf1">Retirement Benefit Application</SelectItem>
                    <SelectItem value="wf2">Sickness Benefit Claim</SelectItem>
                    <SelectItem value="wf3">Employer Registration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Step (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select step or leave blank for entire workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Entire Workflow</SelectItem>
                    <SelectItem value="step1">Application Intake</SelectItem>
                    <SelectItem value="step2">Eligibility Check</SelectItem>
                    <SelectItem value="step3">Supervisor Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Target Duration</Label>
                  <Input type="number" placeholder="Enter value" />
                </div>
                <div className="grid gap-2">
                  <Label>Unit</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Warning Threshold (%)</Label>
                  <Input type="number" placeholder="e.g., 80" defaultValue="80" />
                </div>
                <div className="grid gap-2">
                  <Label>Critical Threshold (%)</Label>
                  <Input type="number" placeholder="e.g., 100" defaultValue="100" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create SLA</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SLAs</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slas.filter((s) => s.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground">Currently monitoring</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflow SLAs</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {slas.filter((s) => !s.stepName).length}
            </div>
            <p className="text-xs text-muted-foreground">Full workflow targets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Step SLAs</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {slas.filter((s) => s.stepName).length}
            </div>
            <p className="text-xs text-muted-foreground">Individual step targets</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SLA Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Target Duration</TableHead>
                <TableHead>Warning (%)</TableHead>
                <TableHead>Critical (%)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slas.map((sla) => (
                <TableRow key={sla.id}>
                  <TableCell className="font-medium">{sla.workflowName}</TableCell>
                  <TableCell className="text-sm">{sla.stepName || "Entire Workflow"}</TableCell>
                  <TableCell className="text-sm">
                    {sla.targetDuration} {sla.unit}
                  </TableCell>
                  <TableCell className="text-sm">{sla.warningThreshold}%</TableCell>
                  <TableCell className="text-sm">{sla.criticalThreshold}%</TableCell>
                  <TableCell>
                    <Badge
                      variant={sla.status === "Active" ? "default" : "secondary"}
                    >
                      {sla.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sla.id)}
                      >
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
