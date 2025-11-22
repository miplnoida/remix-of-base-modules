import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApprovalRequest {
  id: string;
  workflowName: string;
  stepName: string;
  submittedBy: string;
  submittedAt: string;
  priority: "High" | "Medium" | "Low";
  waitingTime: string;
  dueDate: string;
  status: "Pending" | "Overdue";
}

const mockApprovals: ApprovalRequest[] = [
  {
    id: "apr-001",
    workflowName: "Retirement Benefit Application",
    stepName: "Supervisor Review",
    submittedBy: "John Doe",
    submittedAt: "2024-11-22T08:30:00Z",
    priority: "High",
    waitingTime: "2h 15m",
    dueDate: "2024-11-22T18:00:00Z",
    status: "Pending",
  },
  {
    id: "apr-002",
    workflowName: "Employer Registration",
    stepName: "Manager Approval",
    submittedBy: "Jane Smith",
    submittedAt: "2024-11-21T14:00:00Z",
    priority: "High",
    waitingTime: "20h 45m",
    dueDate: "2024-11-22T12:00:00Z",
    status: "Overdue",
  },
  {
    id: "apr-003",
    workflowName: "Sickness Benefit Claim",
    stepName: "Medical Review Approval",
    submittedBy: "Mike Johnson",
    submittedAt: "2024-11-22T09:00:00Z",
    priority: "Medium",
    waitingTime: "1h 45m",
    dueDate: "2024-11-23T09:00:00Z",
    status: "Pending",
  },
  {
    id: "apr-004",
    workflowName: "Compliance Audit",
    stepName: "Director Approval",
    submittedBy: "Sarah Williams",
    submittedAt: "2024-11-22T07:00:00Z",
    priority: "High",
    waitingTime: "3h 45m",
    dueDate: "2024-11-22T16:00:00Z",
    status: "Pending",
  },
  {
    id: "apr-005",
    workflowName: "Fee Waiver Request",
    stepName: "Finance Manager Approval",
    submittedBy: "Robert Brown",
    submittedAt: "2024-11-22T10:30:00Z",
    priority: "Low",
    waitingTime: "15m",
    dueDate: "2024-11-24T10:30:00Z",
    status: "Pending",
  },
];

export default function WorkflowApprovals() {
  const { toast } = useToast();
  const [approvals] = useState<ApprovalRequest[]>(mockApprovals);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApprovals = approvals.filter(
    (approval) =>
      approval.workflowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.stepName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.submittedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-red-100 text-red-800",
      Medium: "bg-yellow-100 text-yellow-800",
      Low: "bg-green-100 text-green-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const handleApprove = (id: string) => {
    toast({
      title: "Approved",
      description: "Approval request has been approved successfully",
    });
  };

  const handleReject = (id: string) => {
    toast({
      title: "Rejected",
      description: "Approval request has been rejected",
      variant: "destructive",
    });
  };

  const pendingCount = approvals.filter((a) => a.status === "Pending").length;
  const overdueCount = approvals.filter((a) => a.status === "Overdue").length;
  const highPriorityCount = approvals.filter((a) => a.priority === "High").length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Approval Requests</h2>
        <p className="text-sm text-muted-foreground">
          Manage pending workflow approvals and review requests
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityCount}</div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search approvals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Waiting Time</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApprovals.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell className="font-medium">{approval.workflowName}</TableCell>
                  <TableCell className="text-sm">{approval.stepName}</TableCell>
                  <TableCell className="text-sm">{approval.submittedBy}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(approval.priority)} variant="secondary">
                      {approval.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{approval.waitingTime}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(approval.dueDate).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={approval.status === "Overdue" ? "destructive" : "outline"}
                    >
                      {approval.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleApprove(approval.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReject(approval.id)}
                      >
                        <X className="h-4 w-4 text-red-600" />
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
