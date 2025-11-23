import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Plus, Eye, FileText } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface EnforcementAction {
  actionId: string;
  caseNumber: string;
  partyName: string;
  actionType: string;
  actionDate: string;
  status: string;
  amountEnforced: number;
  bailiff: string;
  outcome: string;
  notes: string;
}

const mockEnforcementActions: EnforcementAction[] = [
  {
    actionId: "ENF-001",
    caseNumber: "SSB/LGL/001/2024",
    partyName: "ABC Construction Ltd",
    actionType: "Writ of Execution",
    actionDate: "2024-11-01",
    status: "In Progress",
    amountEnforced: 84000,
    bailiff: "Bailiff Roberts",
    outcome: "Pending",
    notes: "Property seizure scheduled"
  },
  {
    actionId: "ENF-002",
    caseNumber: "SSB/LGL/003/2024",
    partyName: "John Doe",
    actionType: "Garnishment Order",
    actionDate: "2024-10-15",
    status: "Active",
    amountEnforced: 15300,
    bailiff: "N/A",
    outcome: "Monthly deductions active",
    notes: "Employer complying with garnishment"
  }
];

const EnforcementActions = () => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddEnforcement = () => {
    toast({
      title: "Enforcement Action Created",
      description: "Enforcement action has been successfully recorded",
    });
    setIsAddDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Enforcement Actions"
        subtitle="Writs, warrants, and garnishment orders"
        breadcrumbs={[
          { label: "Legal Management", href: "/legal/dashboard" },
          { label: "Court Orders & Enforcement", href: "/legal/court-orders" },
          { label: "Enforcement Actions" }
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Enforcements</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockEnforcementActions.length}</div>
            <p className="text-xs text-muted-foreground">In progress or active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Writs of Execution</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockEnforcementActions.filter(e => e.actionType === "Writ of Execution").length}
            </div>
            <p className="text-xs text-muted-foreground">Asset seizure orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Garnishments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockEnforcementActions.filter(e => e.actionType === "Garnishment Order").length}
            </div>
            <p className="text-xs text-muted-foreground">Wage garnishments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warrants</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Arrest warrants issued</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Enforcement Action Dialog */}
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Enforcement Action
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Enforcement Action</DialogTitle>
              <DialogDescription>
                Record new enforcement action following court order
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Case Number *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">SSB/LGL/001/2024</SelectItem>
                      <SelectItem value="2">SSB/LGL/002/2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Enforcement Type *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="writ">Writ of Execution</SelectItem>
                      <SelectItem value="garnishment">Garnishment Order</SelectItem>
                      <SelectItem value="warrant">Warrant of Arrest</SelectItem>
                      <SelectItem value="seizure">Asset Seizure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Action Date *</Label>
                  <Input type="date" />
                </div>

                <div className="space-y-2">
                  <Label>Amount to Enforce (EC$) *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bailiff / Officer</Label>
                <Input placeholder="Assigned bailiff or enforcement officer" />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={3} placeholder="Additional notes or instructions" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEnforcement}>
                  Create Action
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enforcement Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enforcement Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action ID</TableHead>
                  <TableHead>Case Number</TableHead>
                  <TableHead>Party Name</TableHead>
                  <TableHead>Action Type</TableHead>
                  <TableHead>Action Date</TableHead>
                  <TableHead className="text-right">Amount Enforced</TableHead>
                  <TableHead>Bailiff/Officer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockEnforcementActions.map((action) => (
                  <TableRow key={action.actionId}>
                    <TableCell className="font-medium">{action.actionId}</TableCell>
                    <TableCell>{action.caseNumber}</TableCell>
                    <TableCell>{action.partyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{action.actionType}</Badge>
                    </TableCell>
                    <TableCell>{action.actionDate}</TableCell>
                    <TableCell className="text-right font-semibold">
                      EC${action.amountEnforced.toLocaleString()}
                    </TableCell>
                    <TableCell>{action.bailiff}</TableCell>
                    <TableCell>
                      <Badge variant={action.status === "Active" ? "default" : "secondary"}>
                        {action.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{action.outcome}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnforcementActions;
