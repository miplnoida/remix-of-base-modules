import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, History } from "lucide-react";
import { approvalMatrix, roles, positions } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";
import { ApprovalMatrixFormDialog } from "@/components/systemAdmin/ApprovalMatrixFormDialog";
import { ApprovalMatrixAuditHistory } from "@/components/systemAdmin/ApprovalMatrixAuditHistory";
import { ApprovalMatrix } from "@/types/systemAdmin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ApprovalMatrixWriteOff() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedMatrix, setSelectedMatrix] = useState<ApprovalMatrix | undefined>();

  const filteredMatrix = approvalMatrix.filter(m => m.processType === "WriteOff" && m.activeFlag);

  const getApproverName = (matrix: typeof approvalMatrix[0]) => {
    if (matrix.approverType === "Role" && matrix.approverRoleId) {
      return roles.find(r => r.roleId === matrix.approverRoleId)?.roleName || "N/A";
    }
    if (matrix.approverType === "Position" && matrix.approverPositionId) {
      return positions.find(p => p.positionId === matrix.approverPositionId)?.positionName || "N/A";
    }
    return "N/A";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Write-Off Approval Matrix</h1>
          <p className="text-muted-foreground">Configure amount-based write-off approval workflows</p>
        </div>
        <Button onClick={() => { setSelectedMatrix(undefined); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Write-Off Approval Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount Range (XCD)</TableHead>
                <TableHead>Approver Type</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Sequence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMatrix
                .sort((a, b) => a.rangeMinXCD - b.rangeMinXCD)
                .map((matrix) => (
                  <TableRow key={matrix.approvalMatrixId}>
                    <TableCell className="font-medium">
                      {matrix.rangeMinXCD.toLocaleString()} - {matrix.rangeMaxXCD.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{matrix.approverType}</Badge>
                    </TableCell>
                    <TableCell>{getApproverName(matrix)}</TableCell>
                    <TableCell>{matrix.sequenceOrder}</TableCell>
                    <TableCell>
                      <Badge className="bg-primary/10 text-primary">Active</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {matrix.lastModifiedBy && matrix.lastModifiedOn
                        ? `${matrix.lastModifiedBy} on ${new Date(matrix.lastModifiedOn).toLocaleDateString()}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedMatrix(matrix); setFormOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedMatrix(matrix); setHistoryOpen(true); }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast({ title: "Delete Rule", description: `Rule ${matrix.approvalMatrixId} would be deleted`, variant: "destructive" })}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApprovalMatrixFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        matrix={selectedMatrix}
        processType="WriteOff"
        onSave={(matrix) => {
          toast({
            title: selectedMatrix ? "Rule Updated" : "Rule Created",
            description: `Approval rule for Write-Off has been ${selectedMatrix ? "updated" : "created"} successfully.`,
          });
        }}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit History</DialogTitle>
          </DialogHeader>
          {selectedMatrix && selectedMatrix.changeHistory && (
            <ApprovalMatrixAuditHistory history={selectedMatrix.changeHistory} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
