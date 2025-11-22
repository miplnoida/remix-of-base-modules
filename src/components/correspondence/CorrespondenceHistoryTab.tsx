import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Phone, Mail, FileText, MessageSquare, Users, Eye } from 'lucide-react';
import NewCorrespondenceDialog from './NewCorrespondenceDialog';
import { PartyType } from '@/types/correspondence';

interface CorrespondenceHistoryTabProps {
  entityId: string;
  entityType: 'employer' | 'insured' | 'case' | 'benefit' | 'invoice' | 'property';
  entityName: string;
}

export default function CorrespondenceHistoryTab({
  entityId,
  entityType,
  entityName
}: CorrespondenceHistoryTabProps) {
  const [showNewDialog, setShowNewDialog] = useState(false);

  // Mock data
  const mockCorrespondence = [
    {
      id: '1',
      date: '2024-01-15',
      direction: 'Outgoing',
      channel: 'Email',
      subject: 'Contribution reminder for December 2023',
      status: 'Sent',
      territory: 'St Kitts',
      communicationDate: '2024-01-15',
      referenceNumber: 'EMAIL-CONTRIB-20240115-001'
    },
    {
      id: '2',
      date: '2024-01-10',
      direction: 'Incoming',
      channel: 'Phone',
      subject: 'Query about payment arrangement',
      status: 'Closed',
      territory: 'St Kitts',
      communicationDate: null,
      referenceNumber: null
    },
    {
      id: '3',
      date: '2023-12-20',
      direction: 'Outgoing',
      channel: 'Letter',
      subject: 'Compliance notice - Missing C3',
      status: 'Delivered',
      territory: 'St Kitts',
      communicationDate: '2023-12-20',
      referenceNumber: 'LTR-COMP-20231220-005',
      storingTime: '2023-12-20T16:45:00Z'
    }
  ];

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'letter': return <FileText className="h-4 w-4" />;
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'visit':
      case 'in-person': return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'Incoming' ? 'text-blue-600' : 'text-green-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Correspondence History</h3>
          <p className="text-sm text-muted-foreground">
            All communications related to {entityName}
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Correspondence
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Comm. Date</TableHead>
              <TableHead>Ref. No.</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Territory</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCorrespondence.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No correspondence records found
                </TableCell>
              </TableRow>
            ) : (
              mockCorrespondence.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.date}</TableCell>
                  <TableCell className="text-sm">
                    {item.communicationDate ? (
                      <div>
                        <div>{item.communicationDate}</div>
                        {item.storingTime && (
                          <div className="text-xs text-muted-foreground">
                            Stored: {new Date(item.storingTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-mono">
                    {item.referenceNumber || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className={getDirectionColor(item.direction)}>
                      {item.direction}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(item.channel)}
                      <span>{item.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.subject}</TableCell>
                  <TableCell>{item.territory}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewCorrespondenceDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        prefilledPartyId={entityId}
        prefilledPartyType={entityType === 'employer' ? PartyType.EMPLOYER : PartyType.INSURED_PERSON}
        prefilledPartyName={entityName}
        onCreated={() => {
          // Refresh list
        }}
      />
    </div>
  );
}
