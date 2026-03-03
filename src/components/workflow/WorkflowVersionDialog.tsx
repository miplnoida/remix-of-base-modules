import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, RotateCcw, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowVersion {
  versionNumber: number;
  changeDescription: string;
  createdBy: string;
  createdAt: string;
  isActive: boolean;
}

interface WorkflowVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
}

const mockVersions: WorkflowVersion[] = [
  {
    versionNumber: 3,
    changeDescription: "Added SLA timeout notification step",
    createdBy: "John Manager",
    createdAt: "2025-01-15T10:30:00",
    isActive: true,
  },
  {
    versionNumber: 2,
    changeDescription: "Updated eligibility check conditions to include new income thresholds",
    createdBy: "Sarah Admin",
    createdAt: "2024-12-20T14:15:00",
    isActive: false,
  },
  {
    versionNumber: 1,
    changeDescription: "Initial workflow version",
    createdBy: "Sarah Admin",
    createdAt: "2024-11-10T09:00:00",
    isActive: false,
  },
];

export default function WorkflowVersionDialog({ open, onOpenChange, workflowName }: WorkflowVersionDialogProps) {
  const { toast } = useToast();

  const handleViewDiff = (version: number) => {
    toast({ title: "View Diff", description: `Showing changes in version ${version}` });
  };

  const handleRollback = (version: number) => {
    toast({
      title: "Rollback Initiated",
      description: `Rolling back to version ${version}. This will create a new version.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History - {workflowName}</DialogTitle>
          <DialogDescription>
            View and manage different versions of this workflow
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Change Description</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockVersions.map((version) => (
              <TableRow key={version.versionNumber}>
                <TableCell className="font-mono font-semibold">
                  v{version.versionNumber}
                </TableCell>
                <TableCell className="max-w-md">
                  {version.changeDescription}
                </TableCell>
                <TableCell>{version.createdBy}</TableCell>
                <TableCell className="text-sm">
                  {new Date(version.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  {version.isActive ? (
                    <Badge className="bg-primary/10 text-primary">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Archived</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDiff(version.versionNumber)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!version.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRollback(version.versionNumber)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
