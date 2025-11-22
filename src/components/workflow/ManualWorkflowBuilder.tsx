import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MoveUp, MoveDown, Save, Upload, Eye, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddStepDialog from "./AddStepDialog";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  stepName: string;
  stepType: string;
  description: string;
  assignedTo?: string;
  estimatedDuration?: string;
  config?: any;
}

interface ManualWorkflowBuilderProps {
  workflowId?: string;
  initialSteps?: WorkflowStep[];
  onSave?: (steps: WorkflowStep[]) => void;
}

export default function ManualWorkflowBuilder({ workflowId, initialSteps = [], onSave }: ManualWorkflowBuilderProps) {
  const { toast } = useToast();
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps.length > 0 ? initialSteps : []);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  const getStepTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      start: "bg-green-100 text-green-800",
      task: "bg-blue-100 text-blue-800",
      decision: "bg-orange-100 text-orange-800",
      timer: "bg-purple-100 text-purple-800",
      automation: "bg-yellow-100 text-yellow-800",
      subflow: "bg-cyan-100 text-cyan-800",
      end: "bg-red-100 text-red-800",
    };
    return colors[type.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const handleAddStep = (newStep: Omit<WorkflowStep, "id" | "stepNumber">) => {
    const step: WorkflowStep = {
      ...newStep,
      id: `step-${Date.now()}`,
      stepNumber: steps.length + 1,
    };
    setSteps([...steps, step]);
    toast({ title: "Step Added", description: `"${step.stepName}" has been added to the workflow` });
  };

  const handleEditStep = (updatedStep: WorkflowStep) => {
    setSteps(steps.map(s => s.id === updatedStep.id ? updatedStep : s));
    toast({ title: "Step Updated", description: `"${updatedStep.stepName}" has been updated` });
    setEditingStep(null);
  };

  const handleDeleteStep = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    setSteps(steps.filter(s => s.id !== stepId).map((s, index) => ({ ...s, stepNumber: index + 1 })));
    toast({ title: "Step Deleted", description: `"${step?.stepName}" has been removed from the workflow` });
  };

  const handleMoveUp = (stepId: string) => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index > 0) {
      const newSteps = [...steps];
      [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
      setSteps(newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 })));
    }
  };

  const handleMoveDown = (stepId: string) => {
    const index = steps.findIndex(s => s.id === stepId);
    if (index < steps.length - 1) {
      const newSteps = [...steps];
      [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      setSteps(newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 })));
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(steps);
    }
    toast({
      title: "Workflow Saved",
      description: `"${workflowName}" has been saved as draft`,
    });
  };

  const handlePublish = () => {
    toast({
      title: "Workflow Published",
      description: `"${workflowName}" is now active and ready for execution`,
    });
  };

  const handlePreview = () => {
    toast({
      title: "Preview Mode",
      description: "Showing workflow execution preview...",
    });
  };

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Workflow name"
                  className="text-lg font-semibold"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </Button>
                <Button onClick={handlePublish} size="sm" variant="default">
                  <Upload className="mr-2 h-4 w-4" />
                  Publish
                </Button>
                <Button onClick={handlePreview} size="sm" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button size="sm" variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  Versions
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Workflow Steps</CardTitle>
              <Button onClick={() => setShowAddStep(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {steps.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="mb-4">No steps added yet. Click "Add Step" to get started.</p>
                <Button onClick={() => setShowAddStep(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Step
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Step Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((step) => (
                    <TableRow key={step.id}>
                      <TableCell className="font-semibold">{step.stepNumber}</TableCell>
                      <TableCell className="font-medium">{step.stepName}</TableCell>
                      <TableCell>
                        <Badge className={getStepTypeColor(step.stepType)} variant="secondary">
                          {step.stepType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {step.description}
                      </TableCell>
                      <TableCell className="text-sm">{step.assignedTo || "-"}</TableCell>
                      <TableCell className="text-sm">{step.estimatedDuration || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(step.id)}
                            disabled={step.stepNumber === 1}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(step.id)}
                            disabled={step.stepNumber === steps.length}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStep(step);
                              setShowAddStep(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStep(step.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddStepDialog
        open={showAddStep}
        onOpenChange={(open) => {
          setShowAddStep(open);
          if (!open) setEditingStep(null);
        }}
        onSave={(step) => {
          if (editingStep) {
            handleEditStep({ ...step, id: editingStep.id, stepNumber: editingStep.stepNumber });
          } else {
            handleAddStep(step);
          }
          setShowAddStep(false);
        }}
        editingStep={editingStep}
      />
    </>
  );
}
