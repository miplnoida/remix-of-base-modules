import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Eye, FileText, Download, AlertCircle, User } from 'lucide-react';
import { getAllServiceRequests, updateServiceRequest, getInsuredPersonById, getServiceTypeById, getServiceCategoryById } from '@/services/serviceRequestService';
import { ServiceRequest } from '@/types/serviceRequest';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PendingVerificationPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = () => {
    const allRequests = getAllServiceRequests().filter(
      r => r.verificationRequired && r.verificationStatus === 'Pending'
    );
    setRequests(allRequests);
  };

  const canUserApprove = (request: ServiceRequest) => {
    // User cannot approve their own submitted request
    return request.createdBy !== user?.name;
  };

  const handleViewDetails = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setVerificationNotes('');
    setActionType(null);
    setDialogOpen(true);
  };

  const handleApproveClick = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setActionType('approve');
    setVerificationNotes('');
    setDialogOpen(true);
  };

  const handleRejectClick = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setActionType('reject');
    setVerificationNotes('');
    setDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedRequest || !actionType) return;

    if (actionType === 'approve') {
      const updated = updateServiceRequest(selectedRequest.id, {
        verificationStatus: 'Approved',
        verifiedBy: user?.name || 'System',
        verifiedAt: new Date().toISOString(),
        verificationNotes,
        status: 'Invoice Generated'
      });
      if (updated) {
        toast.success('Service request approved and invoice generated');
        loadRequests();
      }
    } else if (actionType === 'reject') {
      const updated = updateServiceRequest(selectedRequest.id, {
        verificationStatus: 'Rejected',
        verifiedBy: user?.name || 'System',
        verifiedAt: new Date().toISOString(),
        verificationNotes,
        status: 'Rejected'
      });
      if (updated) {
        toast.success('Service request rejected');
        loadRequests();
      }
    }

    setDialogOpen(false);
    setSelectedRequest(null);
    setActionType(null);
  };

  const handleDownloadAttachment = (attachment: { filename: string; size: number }) => {
    toast.info(`Downloading ${attachment.filename}...`);
    // Mock download - in real app would fetch from storage
  };

  const pendingCount = requests.length;
  const canApproveCount = requests.filter(r => canUserApprove(r)).length;
  const ownSubmissionsCount = requests.filter(r => !canUserApprove(r)).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Pending Verification"
        subtitle="Review and approve service requests that require verification before invoice generation"
        breadcrumbs={[
          { label: 'Service Requests', href: '/person/service-requests' },
          { label: 'Pending Verification' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Can Approve</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{canApproveCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Own Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{ownSubmissionsCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No requests pending verification</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const insuredPerson = getInsuredPersonById(request.insuredPersonId);
                const serviceType = getServiceTypeById(request.serviceTypeId);
                const category = getServiceCategoryById(request.serviceCategoryId);
                const canApprove = canUserApprove(request);

                return (
                  <div key={request.id} className="flex items-start justify-between p-4 bg-muted/50 rounded-lg border">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-lg">{request.id}</p>
                        <StatusBadge status="Pending Verification" />
                        {!canApprove && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <User className="h-3 w-3 mr-1" />
                            Your Submission
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-muted-foreground">Insured Person:</span>{' '}
                          <span className="font-medium">{insuredPerson?.fullName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SSN:</span>{' '}
                          <span className="font-medium">{insuredPerson?.ssn}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Service Category:</span>{' '}
                          <span className="font-medium">{category?.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Service Type:</span>{' '}
                          <span className="font-medium">{serviceType?.name}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Reason:</span>{' '}
                          <span className="font-medium">{request.reason}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted By:</span>{' '}
                          <span className="font-medium">{request.createdBy}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted On:</span>{' '}
                          <span className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {request.attachments && request.attachments.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{request.attachments.length} document(s) attached</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {canApprove ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveClick(request)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClick(request)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Alert className="ml-2 py-2 px-3">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Cannot approve own submission
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Service Request'}
              {actionType === 'reject' && 'Reject Service Request'}
              {!actionType && 'Service Request Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Request ID</Label>
                      <p className="font-medium">{selectedRequest.id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Submitted By</Label>
                      <p className="font-medium">{selectedRequest.createdBy}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Submitted On</Label>
                      <p className="font-medium">
                        {new Date(selectedRequest.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Insured Person Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Insured Person Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const person = getInsuredPersonById(selectedRequest.insuredPersonId);
                    return person ? (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Full Name</Label>
                          <p className="font-medium">{person.fullName}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">SSN</Label>
                          <p className="font-medium">{person.ssn}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="font-medium">{person.email}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Phone</Label>
                          <p className="font-medium">{person.contactPhone}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Person details not found</p>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Service Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const serviceType = getServiceTypeById(selectedRequest.serviceTypeId);
                    const category = getServiceCategoryById(selectedRequest.serviceCategoryId);
                    return (
                      <div className="space-y-3 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Service Category</Label>
                          <p className="font-medium">{category?.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Service Type</Label>
                          <p className="font-medium">{serviceType?.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{serviceType?.description}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Reason for Request</Label>
                          <p className="font-medium">{selectedRequest.reason}</p>
                        </div>
                        {selectedRequest.internalNotes && (
                          <div>
                            <Label className="text-muted-foreground">Internal Notes</Label>
                            <p className="font-medium">{selectedRequest.internalNotes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Attached Documents */}
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Attached Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedRequest.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium text-sm">{attachment.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {(attachment.size / 1024).toFixed(2)} KB • Uploaded{' '}
                                {new Date(attachment.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadAttachment(attachment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Verification Notes */}
              {actionType && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {actionType === 'approve' ? 'Approval Notes' : 'Rejection Reason'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder={
                        actionType === 'approve'
                          ? 'Enter any notes about this approval (optional)'
                          : 'Enter reason for rejection (required)'
                      }
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              )}

              {/* Self-approval warning */}
              {!canUserApprove(selectedRequest) && actionType && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You cannot approve or reject this request because you submitted it. Only other officers can perform verification on your submissions.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {actionType ? 'Cancel' : 'Close'}
            </Button>
            {actionType && selectedRequest && canUserApprove(selectedRequest) && (
              <Button
                variant={actionType === 'approve' ? 'default' : 'destructive'}
                onClick={handleConfirmAction}
                disabled={actionType === 'reject' && !verificationNotes.trim()}
              >
                {actionType === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Approval
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirm Rejection
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
