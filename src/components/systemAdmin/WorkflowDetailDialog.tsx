import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowScheme } from "@/types/systemAdmin";
import { Badge } from "@/components/ui/badge";

interface WorkflowDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowScheme;
}

export function WorkflowDetailDialog({ open, onOpenChange, workflow }: WorkflowDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workflow Details</DialogTitle>
          <DialogDescription>
            Complete workflow scheme information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Workflow Name</p>
            <p className="font-medium text-lg">{workflow.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Scheme ID</p>
              <p className="font-medium">{workflow.schemeId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Module</p>
              <Badge variant="outline">{workflow.moduleName}</Badge>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Description</p>
            <p className="font-medium">{workflow.description}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            {workflow.isActive ? (
              <Badge className="bg-success/10 text-success">Active</Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground">Inactive</Badge>
            )}
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Workflow Steps</p>
            <p className="text-sm text-muted-foreground italic">
              Use "Configure Steps" to manage workflow approval steps
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
