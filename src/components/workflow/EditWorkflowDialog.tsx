import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowModeSelector from "./WorkflowModeSelector";
import WorkflowDesigner from "./WorkflowDesigner";
import ManualWorkflowBuilder from "./ManualWorkflowBuilder";

interface EditWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: any;
}

export default function EditWorkflowDialog({ open, onOpenChange, workflow }: EditWorkflowDialogProps) {
  const [builderMode, setBuilderMode] = useState<"designer" | "manual">("designer");

  if (!workflow) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Workflow: {workflow.name}</DialogTitle>
          <DialogDescription>
            Choose your preferred editing mode and modify the workflow
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          <WorkflowModeSelector
            selectedMode={builderMode}
            onModeChange={setBuilderMode}
          />

          {builderMode === "designer" ? (
            <div className="h-[calc(100vh-400px)]">
              <WorkflowDesigner />
            </div>
          ) : (
            <ManualWorkflowBuilder
              workflowId={workflow.id}
              initialSteps={workflow.steps || []}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
