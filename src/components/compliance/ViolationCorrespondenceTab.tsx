import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, FileText, Plus } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ViolationCorrespondenceTabProps {
  violationId: string;
  employerId?: string;
  employerName?: string;
}

export function ViolationCorrespondenceTab({ 
  violationId, 
  employerId, 
  employerName 
}: ViolationCorrespondenceTabProps) {
  const { toast } = useToast();
  const [showLogCallDialog, setShowLogCallDialog] = useState(false);
  const [showSendLetterDialog, setShowSendLetterDialog] = useState(false);

  // Mock correspondence data
  const mockCorrespondence = [
    {
      id: 'corr-001',
      date: '2024-01-15',
      channel: 'Call',
      direction: 'Outgoing',
      subject: 'Registration Follow-up',
      status: 'Completed',
      summary: 'Called employer regarding registration requirement. Agreed to visit office next week.'
    },
    {
      id: 'corr-002',
      date: '2024-01-18',
      channel: 'Letter',
      direction: 'Outgoing',
      subject: 'Formal Notice - Registration Required',
      status: 'Sent',
      summary: 'Formal letter sent notifying employer of registration requirements and penalties.'
    }
  ];

  const handleLogCall = () => {
    toast({
      title: 'Call Logged',
      description: 'Call record created and linked to violation'
    });
    setShowLogCallDialog(false);
  };

  const handleSendLetter = () => {
    toast({
      title: 'Letter Queued',
      description: 'Letter has been queued for sending and linked to violation'
    });
    setShowSendLetterDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            All communications are tracked through the central correspondence system
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowLogCallDialog(true)}>
              <Phone className="h-4 w-4 mr-2" />
              Log Call
            </Button>
            <Button variant="outline" onClick={() => setShowSendLetterDialog(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Send Letter / Email
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Notice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Correspondence History */}
      <Card>
        <CardHeader>
          <CardTitle>Correspondence History</CardTitle>
          <p className="text-sm text-muted-foreground">
            All correspondence linked to this violation and employer
          </p>
        </CardHeader>
        <CardContent>
          {mockCorrespondence.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No correspondence recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {mockCorrespondence.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.channel === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                      {item.channel === 'Letter' && <Mail className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-semibold">{item.subject}</span>
                    </div>
                    <Badge variant={item.status === 'Completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{item.date}</span>
                    <Badge variant="outline">{item.channel}</Badge>
                    <Badge variant="outline">{item.direction}</Badge>
                  </div>
                  <p className="text-sm">{item.summary}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Call Dialog */}
      <Dialog open={showLogCallDialog} onOpenChange={setShowLogCallDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Phone Call</DialogTitle>
            <DialogDescription>
              Record call details. This will be saved in the central correspondence system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Call Type</Label>
              <Select defaultValue="outgoing">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outgoing">Outgoing</SelectItem>
                  <SelectItem value="incoming">Incoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input placeholder="Name of person spoken to" />
            </div>
            <div className="space-y-2">
              <Label>Call Summary</Label>
              <Textarea placeholder="Summarize the conversation..." rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Follow-up Required?</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes - Create action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLogCallDialog(false)}>Cancel</Button>
              <Button onClick={handleLogCall}>Log Call</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Letter Dialog */}
      <Dialog open={showSendLetterDialog} onOpenChange={setShowSendLetterDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Letter / Email</DialogTitle>
            <DialogDescription>
              Generate and send correspondence to the employer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select letter template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="registration-notice">Registration Notice</SelectItem>
                  <SelectItem value="payment-reminder">Payment Reminder</SelectItem>
                  <SelectItem value="compliance-warning">Compliance Warning</SelectItem>
                  <SelectItem value="custom">Custom Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Delivery Method</Label>
              <Select defaultValue="letter">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">Physical Letter</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea placeholder="Any special instructions or notes..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSendLetterDialog(false)}>Cancel</Button>
              <Button onClick={handleSendLetter}>Queue for Sending</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
