import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowScheme } from "@/types/systemAdmin";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface WorkflowStepsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: WorkflowScheme;
}

export function WorkflowStepsDialog({ open, onOpenChange, workflow }: WorkflowStepsDialogProps) {
  const { toast } = useToast();

  const mockSteps = [
    { stepNumber: 1, stepName: "Department Review", approverType: "Supervisor", isFinalStep: false },
    { stepNumber: 2, stepName: "Manager Approval", approverType: "Role", isFinalStep: false },
    { stepNumber: 3, stepName: "Final Authorization", approverType: "Position", isFinalStep: true },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Workflow Steps: {workflow.name}</DialogTitle>
          <DialogDescription>
            Define the approval steps and sequence for this workflow
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button 
              size="sm"
              onClick={() => toast({ title: "Add Step", description: "Step creation form would open here" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step #</TableHead>
                <TableHead>Step Name</TableHead>
                <TableHead>Approver Type</TableHead>
                <TableHead>Final Step</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSteps.map((step) => (
                <TableRow key={step.stepNumber}>
                  <TableCell className="font-medium">{step.stepNumber}</TableCell>
                  <TableCell>{step.stepName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{step.approverType}</Badge>
                  </TableCell>
                  <TableCell>
                    {step.isFinalStep && <Badge className="bg-blue-100 text-blue-800">Final</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toast({ title: "Edit Step", description: `Editing step ${step.stepNumber}` })}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toast({ title: "Delete Step", description: `Deleting step ${step.stepNumber}` })}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
