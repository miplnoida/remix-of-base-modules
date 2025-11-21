import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { approvalMatrix, roles, positions } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";

export default function ApprovalMatrixList() {
  const [activeProcess, setActiveProcess] = useState("Payment");
  const { toast } = useToast();

  const processTypes = [...new Set(approvalMatrix.map(m => m.processType))];
  const filteredMatrix = approvalMatrix.filter(m => m.processType === activeProcess && m.activeFlag);

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
          <h1 className="text-3xl font-bold">Approval Matrix</h1>
          <p className="text-muted-foreground">Configure amount-based approval workflows</p>
        </div>
        <Button onClick={() => toast({ title: "Add Rule", description: `Add new approval rule for ${activeProcess}` })}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Rules by Process Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeProcess} onValueChange={setActiveProcess}>
            <TabsList className="grid w-full grid-cols-5">
              {processTypes.map(type => (
                <TabsTrigger key={type} value={type}>
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>

            {processTypes.map(type => (
              <TabsContent key={type} value={type}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount Range (XCD)</TableHead>
                      <TableHead>Approver Type</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Sequence</TableHead>
                      <TableHead>Status</TableHead>
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
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => toast({ title: "Edit Rule", description: `Editing approval rule ${matrix.approvalMatrixId}` })}
                              >
                                <Edit className="h-4 w-4" />
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
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
