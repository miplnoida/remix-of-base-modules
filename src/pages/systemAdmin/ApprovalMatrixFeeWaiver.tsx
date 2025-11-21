import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, History, Eye, Filter, FileText, Settings } from "lucide-react";
import { approvalMatrix, roles, positions } from "@/services/mockData/systemAdminData";
import { feeWaiverRequests, feeWaiverConfigurations } from "@/services/mockData/feeWaiverData";
import { useToast } from "@/hooks/use-toast";
import { ApprovalMatrixFormDialog } from "@/components/systemAdmin/ApprovalMatrixFormDialog";
import { ApprovalMatrixAuditHistory } from "@/components/systemAdmin/ApprovalMatrixAuditHistory";
import { FeeWaiverRequestDialog } from "@/components/systemAdmin/FeeWaiverRequestDialog";
import { ApprovalMatrix } from "@/types/systemAdmin";
import { FeeWaiverRequest } from "@/types/feeWaiver";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ApprovalMatrixFeeWaiver() {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMatrix, setSelectedMatrix] = useState<ApprovalMatrix | undefined>();
  const [selectedRequest, setSelectedRequest] = useState<FeeWaiverRequest | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const filteredMatrix = approvalMatrix.filter(m => m.processType === "FeeWaiver" && m.activeFlag);
  
  const filteredRequests = feeWaiverRequests.filter(req => {
    const matchesSearch = req.waiverNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.payerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.contextReference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || req.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || req.feeCategory === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getApproverName = (matrix: typeof approvalMatrix[0]) => {
    if (matrix.approverType === "Role" && matrix.approverRoleId) {
      return roles.find(r => r.roleId === matrix.approverRoleId)?.roleName || "N/A";
    }
    if (matrix.approverType === "Position" && matrix.approverPositionId) {
      return positions.find(p => p.positionId === matrix.approverPositionId)?.positionName || "N/A";
    }
    return "N/A";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Submitted': 'bg-blue-100 text-blue-800',
      'UnderReview': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const totalStats = {
    totalRequests: feeWaiverRequests.length,
    pending: feeWaiverRequests.filter(r => ['Draft', 'Submitted', 'UnderReview'].includes(r.status)).length,
    approved: feeWaiverRequests.filter(r => r.status === 'Approved').length,
    rejected: feeWaiverRequests.filter(r => r.status === 'Rejected').length,
    totalWaived: feeWaiverRequests
      .filter(r => r.status === 'Approved')
      .reduce((sum, r) => sum + r.calculatedWaiverAmount, 0),
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fee Waiver Management</h1>
          <p className="text-muted-foreground">Comprehensive fee waiver request and approval workflow system</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalStats.totalRequests}</div>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{totalStats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{totalStats.approved}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{totalStats.rejected}</div>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">XCD {totalStats.totalWaived.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Waived</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            <FileText className="mr-2 h-4 w-4" />
            Waiver Requests
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="mr-2 h-4 w-4" />
            Fee Configuration
          </TabsTrigger>
          <TabsTrigger value="approval-matrix">
            <History className="mr-2 h-4 w-4" />
            Approval Matrix
          </TabsTrigger>
        </TabsList>

        {/* Waiver Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Input
                  placeholder="Search by waiver number, payer, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="UnderReview">Under Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="Compliance">Compliance</SelectItem>
                  <SelectItem value="Benefits">Benefits</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => { setSelectedRequest(undefined); setRequestDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              New Waiver Request
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waiver Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Fee Name</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Waiver Type</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Waived</TableHead>
                    <TableHead className="text-right">After Waiver</TableHead>
                    <TableHead>Initiator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.waiverRequestId}>
                      <TableCell className="font-medium">{request.waiverNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.feeCategory}</Badge>
                      </TableCell>
                      <TableCell>{request.feeName}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.payerName}</div>
                          <div className="text-sm text-muted-foreground">{request.payerIdentification}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{request.contextReference}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {request.waiverType === 'Percentage' 
                            ? `${request.waiverPercentage}%` 
                            : `XCD ${request.waiverAmount}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">XCD {request.originalFeeAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-orange-600 font-medium">
                        -XCD {request.calculatedWaiverAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        XCD {request.amountAfterWaiver.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{request.initiatorName}</div>
                          <div className="text-muted-foreground">{request.initiatorType}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedRequest(request); setDetailsOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedRequest(request); setRequestDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setConfigDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Fee Configuration
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Waiver Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee Category</TableHead>
                    <TableHead>Fee Code</TableHead>
                    <TableHead>Fee Name</TableHead>
                    <TableHead>Waiverable</TableHead>
                    <TableHead>Max %</TableHead>
                    <TableHead>Max Amount (XCD)</TableHead>
                    <TableHead>Min Approval</TableHead>
                    <TableHead>Allowed Initiators</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeWaiverConfigurations.map((config) => (
                    <TableRow key={config.configId}>
                      <TableCell>
                        <Badge variant="outline">{config.feeCategory}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{config.feeCode}</TableCell>
                      <TableCell className="font-medium">{config.feeName}</TableCell>
                      <TableCell>
                        {config.allowWaiver ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>{config.maxWaiverPercentage}%</TableCell>
                      <TableCell>XCD {config.maxWaiverAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{config.minimumApprovalLevel}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {config.allowedInitiators.map((init) => (
                            <Badge key={init} variant="outline" className="text-xs">
                              {init}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Matrix Tab */}
        <TabsContent value="approval-matrix" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setSelectedMatrix(undefined); setFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Approval Rule
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Waiver Approval Rules</CardTitle>
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
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
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
        </TabsContent>
      </Tabs>

      {/* Waiver Request Dialog */}
      <FeeWaiverRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        request={selectedRequest}
        onSave={(request) => {
          toast({
            title: selectedRequest ? "Request Updated" : "Request Created",
            description: `Fee waiver request has been ${selectedRequest ? "updated" : "created"} successfully.`,
          });
        }}
      />

      {/* Approval Matrix Dialog */}
      <ApprovalMatrixFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        matrix={selectedMatrix}
        processType="FeeWaiver"
        onSave={(matrix) => {
          toast({
            title: selectedMatrix ? "Rule Updated" : "Rule Created",
            description: `Approval rule for Fee Waiver has been ${selectedMatrix ? "updated" : "created"} successfully.`,
          });
        }}
      />

      {/* Audit History Dialog */}
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

      {/* Request Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fee Waiver Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.waiverNumber} - {selectedRequest?.status}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Fee Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fee Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Fee Category</p>
                    <p className="font-medium">{selectedRequest.feeCategory}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fee Name</p>
                    <p className="font-medium">{selectedRequest.feeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fee Code</p>
                    <p className="font-mono">{selectedRequest.feeCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Original Amount</p>
                    <p className="text-lg font-semibold">XCD {selectedRequest.originalFeeAmount.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Waiver Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Waiver Calculation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Waiver Type</p>
                      <Badge variant="secondary" className="mt-1">
                        {selectedRequest.waiverType === 'Percentage' 
                          ? `${selectedRequest.waiverPercentage}%` 
                          : `XCD ${selectedRequest.waiverAmount}`}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Waived Amount</p>
                      <p className="text-lg font-semibold text-orange-600">
                        -XCD {selectedRequest.calculatedWaiverAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount After Waiver</p>
                      <p className="text-lg font-semibold text-green-600">
                        XCD {selectedRequest.amountAfterWaiver.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payer & Context */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payer & Context</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payer Name</p>
                    <p className="font-medium">{selectedRequest.payerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payer Type</p>
                    <p className="font-medium">{selectedRequest.payerType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payer ID</p>
                    <p className="font-mono">{selectedRequest.payerIdentification}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Context Reference</p>
                    <p className="font-medium">{selectedRequest.contextReference}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Justification */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Justification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <Badge className="mt-1">{selectedRequest.waiverReason}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Details</p>
                    <p className="text-sm mt-1">{selectedRequest.justificationDetails}</p>
                  </div>
                  {selectedRequest.supportingDocuments.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Supporting Documents</p>
                      {selectedRequest.supportingDocuments.map((doc) => (
                        <Badge key={doc.documentId} variant="outline" className="mr-2">
                          {doc.documentName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Approval History */}
              {selectedRequest.approvalHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Approval History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedRequest.approvalHistory.map((approval) => (
                        <div key={approval.approvalId} className="flex items-start gap-3 border-l-2 border-primary pl-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{approval.approverName}</span>
                              <Badge variant="outline">{approval.approvalLevel}</Badge>
                              <Badge className={
                                approval.approvalAction === 'Approved' ? 'bg-green-100 text-green-800' :
                                approval.approvalAction === 'Rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {approval.approvalAction}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{approval.comments}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(approval.approvalDate).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
