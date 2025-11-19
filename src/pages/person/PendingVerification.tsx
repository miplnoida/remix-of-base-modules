import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { getAllServiceRequests, updateServiceRequest, getInsuredPersonById, getServiceTypeById } from '@/services/serviceRequestService';

export default function PendingVerificationPage() {
  const [requests, setRequests] = useState(
    getAllServiceRequests().filter(r => r.verificationRequired && r.verificationStatus === 'Pending')
  );
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  const handleApprove = (requestId: string) => {
    const updated = updateServiceRequest(requestId, {
      verificationStatus: 'Approved',
      verifiedBy: 'Current Officer',
      verifiedAt: new Date().toISOString(),
      verificationNotes,
      status: 'Invoice Generated'
    });
    if (updated) {
      setRequests(requests.filter(r => r.id !== requestId));
      setSelectedRequest(null);
      setVerificationNotes('');
    }
  };

  const handleReject = (requestId: string) => {
    const updated = updateServiceRequest(requestId, {
      verificationStatus: 'Rejected',
      verifiedBy: 'Current Officer',
      verifiedAt: new Date().toISOString(),
      verificationNotes,
      status: 'Rejected'
    });
    if (updated) {
      setRequests(requests.filter(r => r.id !== requestId));
      setSelectedRequest(null);
      setVerificationNotes('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pending Verification</h1>
        <p className="text-muted-foreground">Review and approve service requests that require verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No requests pending verification</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const insuredPerson = getInsuredPersonById(request.insuredPersonId);
                const serviceType = getServiceTypeById(request.serviceTypeId);
                const isExpanded = selectedRequest === request.id;

                return (
                  <div key={request.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="font-medium">{request.id}</p>
                          <Badge variant="outline">Pending Verification</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Insured Person:</span> {insuredPerson?.fullName} ({insuredPerson?.ssn})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Service:</span> {serviceType?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Created:</span> {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        {request.attachments && request.attachments.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Attachments:</span> {request.attachments.length} file(s)
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(isExpanded ? null : request.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {isExpanded ? 'Collapse' : 'Review'}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <div>
                          <Label>Verification Notes</Label>
                          <Textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            placeholder="Enter verification notes, findings, or reason for approval/rejection..."
                            rows={4}
                          />
                        </div>
                        {request.attachments && request.attachments.length > 0 && (
                          <div>
                            <Label>Attachments</Label>
                            <div className="space-y-2 mt-2">
                              {request.attachments.map((att) => (
                                <div key={att.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <div>
                                    <p className="text-sm font-medium">{att.filename}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(att.size / 1024).toFixed(2)} KB - {new Date(att.uploadedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Button variant="ghost" size="sm">View</Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => handleReject(request.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleApprove(request.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
