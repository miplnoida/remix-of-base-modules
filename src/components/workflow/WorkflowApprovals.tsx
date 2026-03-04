import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Check, X, Clock, AlertCircle, Eye, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyPendingApprovals, formatWaitingTime, PendingApproval } from "@/hooks/useWorkflowPendingApprovals";
import { useNavigate } from "react-router-dom";

export default function WorkflowApprovals() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: approvals = [], isLoading, error } = useMyPendingApprovals();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredApprovals = approvals.filter(
    (approval) =>
      approval.workflow_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.step_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.source_record_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (approval.submitter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: "bg-destructive/10 text-destructive",
      Medium: "bg-warning/15 text-warning",
      Low: "bg-success/10 text-success",
    };
    return colors[priority] || "bg-muted text-muted-foreground";
  };

  const handleViewRecord = (approval: PendingApproval) => {
    // Navigate to the appropriate detail page based on source_module
    if (approval.source_module === 'insured_person_registration') {
      navigate(`/ip-registration/edit/${approval.source_record_id}`);
    } else {
      // Generic fallback
      toast({
        title: "View Record",
        description: `Navigating to ${approval.source_record_name}`,
      });
    }
  };

  const pendingCount = approvals.filter((a) => a.status === "Pending").length;
  const overdueCount = approvals.filter((a) => a.is_overdue).length;
  const highPriorityCount = approvals.filter((a) => a.priority === "High").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading pending approvals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>Failed to load approvals: {error.message}</span>
      </div>
    );
  }

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
            <Clock className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
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
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No pending approvals</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Record</TableHead>
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
                  <TableRow 
                    key={approval.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewRecord(approval)}
                  >
                    <TableCell className="font-medium">{approval.workflow_name}</TableCell>
                    <TableCell className="text-sm">{approval.step_name}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {approval.source_record_name}
                    </TableCell>
                    <TableCell className="text-sm">{approval.submitter_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(approval.priority)} variant="secondary">
                        {approval.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatWaitingTime(approval.created_at)}</TableCell>
                    <TableCell className="text-sm">
                      {approval.due_at 
                        ? new Date(approval.due_at).toLocaleString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={approval.is_overdue ? "destructive" : "outline"}
                      >
                        {approval.is_overdue ? 'Overdue' : approval.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRecord(approval)}
                          title="View and take action"
                        >
                          <Eye className="h-4 w-4 text-info" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
