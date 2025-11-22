import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft } from 'lucide-react';
import { getServiceRequestById, getInsuredPersonById, getServiceTypeById } from '@/services/serviceRequestService';
import { CardPrintingDialog } from '@/components/service-requests/CardPrintingDialog';
import { IssueReasonCode } from '@/types/cardManagement';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ServiceRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<any>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  useEffect(() => {
    if (id) {
      const req = getServiceRequestById(id);
      setRequest(req);
    }
  }, [id]);

  if (!request) return <div className="p-6">Loading...</div>;

  const person = getInsuredPersonById(request.insuredPersonId);
  const serviceType = getServiceTypeById(request.serviceTypeId);
  
  // Determine if this is a card service and can print
  const isCardService = [
    'SVC_CARD_FIRST', 'SVC_CARD_LOST', 'SVC_CARD_STOLEN', 
    'SVC_CARD_DAMAGED', 'SVC_CARD_NAME_CHANGE', 'SVC_CARD_NON_CITIZEN'
  ].includes(request.serviceTypeId);
  
  const canPrintCard = isCardService && 
    (request.status === 'Payment Received' || request.status === 'Completed');

  const getReasonCode = (): IssueReasonCode => {
    const mapping: Record<string, IssueReasonCode> = {
      'SVC_CARD_FIRST': 'FIRST_ISSUE',
      'SVC_CARD_LOST': 'LOST',
      'SVC_CARD_STOLEN': 'STOLEN',
      'SVC_CARD_DAMAGED': 'DAMAGED',
      'SVC_CARD_NAME_CHANGE': 'NAME_CHANGE',
      'SVC_CARD_NON_CITIZEN': 'NON_CITIZEN_RENEWAL'
    };
    return mapping[request.serviceTypeId] || 'FIRST_ISSUE';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title={`Service Request: ${request.id}`}
        subtitle={serviceType?.name || 'Service Details'}
        breadcrumbs={[
          { label: 'Service Requests', href: '/person/service-requests' },
          { label: request.id }
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/person/service-requests')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {canPrintCard && (
              <Button onClick={() => setShowPrintDialog(true)}>
                <Printer className="h-4 w-4 mr-2" />
                Print Card
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Insured Person</p>
              <p className="font-medium">{person?.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge>{request.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{format(new Date(request.createdAt), 'PPP')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reason</p>
              <p>{request.reason}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CardPrintingDialog
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        serviceRequestId={request.id}
        insuredPersonId={request.insuredPersonId}
        issueReasonCode={getReasonCode()}
        onPrintComplete={() => {
          toast.success('Card printed and service request completed');
          navigate('/person/service-requests');
        }}
      />
    </div>
  );
}
