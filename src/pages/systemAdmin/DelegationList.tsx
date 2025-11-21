import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { delegations, positions } from "@/services/mockData/systemAdminData";
import { useToast } from "@/hooks/use-toast";
import { DelegationFormDialog } from "@/components/systemAdmin/DelegationFormDialog";
import { Delegation } from "@/types/systemAdmin";

export default function DelegationList() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | undefined>();
  
  const getPositionName = (positionId: string) => {
    return positions.find(p => p.positionId === positionId)?.positionName || "N/A";
  };

  const isActive = (delegation: typeof delegations[0]) => {
    const now = new Date();
    const start = new Date(delegation.startDate);
    const end = new Date(delegation.endDate);
    return now >= start && now <= end;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delegation Management</h1>
          <p className="text-muted-foreground">Manage temporary delegations and acting authority</p>
        </div>
        <Button onClick={() => { setSelectedDelegation(undefined); setFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Delegation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active & Upcoming Delegations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From Position</TableHead>
                <TableHead>To Position</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.map((delegation) => (
                <TableRow key={delegation.delegationId}>
                  <TableCell className="font-medium">
                    {delegation.fromPositionId && getPositionName(delegation.fromPositionId)}
                  </TableCell>
                  <TableCell>
                    {delegation.toPositionId && getPositionName(delegation.toPositionId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{delegation.scope}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{new Date(delegation.startDate).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">
                        to {new Date(delegation.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isActive(delegation) ? (
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    ) : new Date(delegation.startDate) > new Date() ? (
                      <Badge className="bg-blue-100 text-blue-800">Upcoming</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Expired</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{delegation.reason}</TableCell>
                   <TableCell>
                     <div className="flex gap-2">
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => { setSelectedDelegation(delegation); setFormOpen(true); }}
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => toast({ title: "Delete Delegation", description: `Delegation ${delegation.delegationId} would be deleted`, variant: "destructive" })}
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

      <DelegationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        delegation={selectedDelegation}
        onSave={(delegation) => {
          toast({
            title: selectedDelegation ? "Delegation Updated" : "Delegation Created",
            description: `Delegation has been ${selectedDelegation ? "updated" : "created"} successfully.`,
          });
        }}
      />
    </div>
  );
}
