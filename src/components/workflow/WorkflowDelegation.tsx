import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, UserCheck, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Delegation {
  id: string;
  fromUser: string;
  toUser: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Scheduled" | "Expired";
  workflowTypes?: string[];
}

const mockDelegations: Delegation[] = [
  {
    id: "del-001",
    fromUser: "John Doe",
    toUser: "Jane Smith",
    reason: "Annual Leave",
    startDate: "2024-11-25",
    endDate: "2024-12-05",
    status: "Scheduled",
    workflowTypes: ["All Workflows"],
  },
  {
    id: "del-002",
    fromUser: "Sarah Williams",
    toUser: "Mike Johnson",
    reason: "Medical Leave",
    startDate: "2024-11-20",
    endDate: "2024-11-30",
    status: "Active",
    workflowTypes: ["Compliance Audits", "Field Inspections"],
  },
  {
    id: "del-003",
    fromUser: "Robert Brown",
    toUser: "Emily Davis",
    reason: "Training Assignment",
    startDate: "2024-11-01",
    endDate: "2024-11-15",
    status: "Expired",
    workflowTypes: ["Benefit Applications"],
  },
];

export default function WorkflowDelegation() {
  const { toast } = useToast();
  const [delegations, setDelegations] = useState<Delegation[]>(mockDelegations);
  const [showDialog, setShowDialog] = useState(false);

  const handleCreateDelegation = () => {
    toast({
      title: "Delegation Created",
      description: "Workflow delegation has been created successfully",
    });
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    setDelegations(delegations.filter((d) => d.id !== id));
    toast({
      title: "Delegation Removed",
      description: "Delegation has been removed successfully",
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Active: "bg-green-100 text-green-800",
      Scheduled: "bg-blue-100 text-blue-800",
      Expired: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const activeCount = delegations.filter((d) => d.status === "Active").length;
  const scheduledCount = delegations.filter((d) => d.status === "Scheduled").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Delegation</h2>
          <p className="text-sm text-muted-foreground">
            Manage workflow assignments when users are unavailable
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Delegation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Delegation</DialogTitle>
              <DialogDescription>
                Assign workflow responsibilities to another user during absence
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>From User</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user1">John Doe</SelectItem>
                    <SelectItem value="user2">Jane Smith</SelectItem>
                    <SelectItem value="user3">Mike Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>To User (Delegate)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select delegate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user1">John Doe</SelectItem>
                    <SelectItem value="user2">Jane Smith</SelectItem>
                    <SelectItem value="user3">Mike Johnson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Reason</Label>
                <Input placeholder="e.g., Annual Leave, Medical Leave" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Workflow Types</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workflows</SelectItem>
                    <SelectItem value="benefits">Benefit Applications</SelectItem>
                    <SelectItem value="compliance">Compliance Audits</SelectItem>
                    <SelectItem value="registration">Registrations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDelegation}>Create Delegation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Delegations</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <p className="text-xs text-muted-foreground">Upcoming delegations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{delegations.length}</div>
            <p className="text-xs text-muted-foreground">All delegations</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delegation Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From User</TableHead>
                <TableHead>To User (Delegate)</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Workflow Types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.map((delegation) => (
                <TableRow key={delegation.id}>
                  <TableCell className="font-medium">{delegation.fromUser}</TableCell>
                  <TableCell>{delegation.toUser}</TableCell>
                  <TableCell className="text-sm">{delegation.reason}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(delegation.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(delegation.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {delegation.workflowTypes?.join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(delegation.status)} variant="secondary">
                      {delegation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(delegation.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
