import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import WorkflowModeSelector from "./WorkflowModeSelector";
import { useNavigate } from "react-router-dom";

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workflow: any) => void;
}

const categories = [
  { value: "benefits", label: "Benefits" },
  { value: "contributions", label: "Contributions" },
  { value: "compliance", label: "Compliance" },
  { value: "finance", label: "Finance" },
  { value: "customer-service", label: "Customer Service" },
];

export default function CreateWorkflowDialog({ open, onOpenChange, onSave }: CreateWorkflowDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<"mode" | "details">("mode");
  const [selectedMode, setSelectedMode] = useState<"designer" | "manual">("designer");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "benefits",
    owner: "",
    tags: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleModeNext = () => {
    setStep("details");
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Workflow name is required", variant: "destructive" });
      return;
    }

    const workflow = {
      id: `wf-${Date.now()}`,
      ...formData,
      builderMode: selectedMode,
      status: "Draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(workflow);
    toast({ 
      title: "Workflow Created", 
      description: `"${formData.name}" has been created. Opening ${selectedMode} builder...` 
    });
    onOpenChange(false);
    setStep("mode");
    setFormData({ name: "", description: "", category: "benefits", owner: "", tags: "" });
    // Navigate to designer page
    navigate("/admin/workflow-management");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) setStep("mode");
    }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogDescription>
            {step === "mode" 
              ? "Choose how you want to build your workflow"
              : "Define the basic properties of your new workflow"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === "mode" ? (
            <>
              <WorkflowModeSelector
                selectedMode={selectedMode}
                onModeChange={setSelectedMode}
              />
              <div className="flex justify-end">
                <Button onClick={handleModeNext}>
                  Next: Enter Details
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Workflow Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g., Retirement Benefit Application"
                />
              </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description of what this workflow does"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(value) => updateField("category", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Process Owner</Label>
              <Input
                value={formData.owner}
                onChange={(e) => updateField("owner", e.target.value)}
                placeholder="e.g., Benefits Manager"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="e.g., retirement, pension, benefits"
            />
          </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep("mode")}>Back</Button>
                <Button onClick={handleCreate}>Create & Open Builder</Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
