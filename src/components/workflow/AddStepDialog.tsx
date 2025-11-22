import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface AddStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (step: any) => void;
  editingStep?: any;
}

const stepTypes = [
  { value: "start", label: "Start", description: "Starting point of the workflow" },
  { value: "task", label: "Task", description: "Human task requiring user input" },
  { value: "decision", label: "Decision", description: "Conditional branching point" },
  { value: "timer", label: "Timer", description: "Wait for specific duration or date" },
  { value: "automation", label: "Automation", description: "Automated action (email, webhook, etc.)" },
  { value: "subflow", label: "Subflow", description: "Call another workflow" },
  { value: "end", label: "End", description: "Terminal point of the workflow" },
];

export default function AddStepDialog({ open, onOpenChange, onSave, editingStep }: AddStepDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    stepName: "",
    stepType: "task",
    description: "",
    assignedTo: "",
    estimatedDuration: "",
    config: {} as any,
  });

  useEffect(() => {
    if (editingStep) {
      setFormData({
        stepName: editingStep.stepName || "",
        stepType: editingStep.stepType || "task",
        description: editingStep.description || "",
        assignedTo: editingStep.assignedTo || "",
        estimatedDuration: editingStep.estimatedDuration || "",
        config: editingStep.config || {},
      });
    } else {
      setFormData({
        stepName: "",
        stepType: "task",
        description: "",
        assignedTo: "",
        estimatedDuration: "",
        config: {},
      });
    }
  }, [editingStep, open]);

  const updateField = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateConfig = (key: string, value: any) => {
    setFormData({ ...formData, config: { ...formData.config, [key]: value } });
  };

  const handleSave = () => {
    if (!formData.stepName.trim()) {
      toast({ title: "Validation Error", description: "Step name is required", variant: "destructive" });
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingStep ? "Edit" : "Add"} Workflow Step</DialogTitle>
          <DialogDescription>
            Define the step properties and configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Step Name *</Label>
                <Input
                  value={formData.stepName}
                  onChange={(e) => updateField("stepName", e.target.value)}
                  placeholder="e.g., Application Intake"
                />
              </div>

              <div className="space-y-2">
                <Label>Step Type *</Label>
                <Select value={formData.stepType} onValueChange={(value) => updateField("stepType", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stepTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {stepTypes.find(t => t.value === formData.stepType)?.description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description of what this step does"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Input
                  value={formData.assignedTo}
                  onChange={(e) => updateField("assignedTo", e.target.value)}
                  placeholder="Role or user (e.g., Claims Officer)"
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Duration</Label>
                <Input
                  value={formData.estimatedDuration}
                  onChange={(e) => updateField("estimatedDuration", e.target.value)}
                  placeholder="e.g., 2 hours, 1 day"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="config" className="space-y-4 mt-4">
            {formData.stepType === "task" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Form Template</Label>
                  <Select
                    value={formData.config.formTemplate || ""}
                    onValueChange={(value) => updateConfig("formTemplate", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select form template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application-intake">Application Intake Form</SelectItem>
                      <SelectItem value="eligibility-check">Eligibility Check Form</SelectItem>
                      <SelectItem value="supervisor-review">Supervisor Review Form</SelectItem>
                      <SelectItem value="custom">Custom Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignment Method</Label>
                  <Select
                    value={formData.config.assignmentMethod || "role"}
                    onValueChange={(value) => updateConfig("assignmentMethod", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role">By Role</SelectItem>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                      <SelectItem value="manual">Manual Assignment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {formData.stepType === "decision" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Condition Logic</Label>
                  <Select
                    value={formData.config.conditionLogic || "simple"}
                    onValueChange={(value) => updateConfig("conditionLogic", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple Condition</SelectItem>
                      <SelectItem value="complex">Complex (AND/OR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Branches</Label>
                  <Input
                    type="number"
                    min="2"
                    value={formData.config.branchCount || 2}
                    onChange={(e) => updateConfig("branchCount", parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {formData.stepType === "timer" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Timer Type</Label>
                  <Select
                    value={formData.config.timerType || "duration"}
                    onValueChange={(value) => updateConfig("timerType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="duration">Wait Duration</SelectItem>
                      <SelectItem value="date">Wait Until Date</SelectItem>
                      <SelectItem value="sla">SLA Timer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration/Date</Label>
                  <Input
                    value={formData.config.timerValue || ""}
                    onChange={(e) => updateConfig("timerValue", e.target.value)}
                    placeholder="e.g., 24h, 2025-12-31, 3 days"
                  />
                </div>
              </div>
            )}

            {formData.stepType === "automation" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select
                    value={formData.config.actionType || "email"}
                    onValueChange={(value) => updateConfig("actionType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Send Email</SelectItem>
                      <SelectItem value="sms">Send SMS</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="database">Database Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>SLA (Hours)</Label>
              <Input
                type="number"
                value={formData.config.slaHours || ""}
                onChange={(e) => updateConfig("slaHours", e.target.value)}
                placeholder="e.g., 24"
              />
            </div>

            <div className="space-y-2">
              <Label>Escalation After (Hours)</Label>
              <Input
                type="number"
                value={formData.config.escalationHours || ""}
                onChange={(e) => updateConfig("escalationHours", e.target.value)}
                placeholder="e.g., 48"
              />
            </div>

            <div className="space-y-2">
              <Label>Retry Configuration</Label>
              <Input
                value={formData.config.retryConfig || ""}
                onChange={(e) => updateConfig("retryConfig", e.target.value)}
                placeholder="e.g., 3 retries with 5min interval"
              />
            </div>

            <div className="space-y-2">
              <Label>Custom Metadata (JSON)</Label>
              <Textarea
                value={formData.config.metadata || ""}
                onChange={(e) => updateConfig("metadata", e.target.value)}
                placeholder='{"key": "value"}'
                rows={4}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>{editingStep ? "Update" : "Add"} Step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
