import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  CorrespondenceDirection, 
  CorrespondenceChannel, 
  CorrespondencePriority,
  PartyType,
  CreateOutgoingCorrespondenceRequest 
} from '@/types/correspondence';

interface NewCorrespondenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  prefilledPartyId?: string;
  prefilledPartyType?: PartyType;
  prefilledPartyName?: string;
}

export default function NewCorrespondenceDialog({
  open,
  onOpenChange,
  onCreated,
  prefilledPartyId,
  prefilledPartyType,
  prefilledPartyName
}: NewCorrespondenceDialogProps) {
  const [direction, setDirection] = useState<CorrespondenceDirection>(CorrespondenceDirection.OUTGOING);
  const [channel, setChannel] = useState<CorrespondenceChannel>(CorrespondenceChannel.EMAIL);
  const [territory, setTerritory] = useState<'StKitts' | 'Nevis'>('StKitts');
  const [partySearch, setPartySearch] = useState(prefilledPartyName || '');
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState<CorrespondencePriority>(CorrespondencePriority.NORMAL);
  const [openRelatedScreen, setOpenRelatedScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Additional fields for letters and emails
  const [communicationDate, setCommunicationDate] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [storingTime, setStoringTime] = useState('');
  
  // Physical delivery tracking
  const [assignedInspectorId, setAssignedInspectorId] = useState('');
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!partySearch.trim()) {
      toast.error('Party information is required');
      return;
    }

    setLoading(true);
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Correspondence logged successfully');
      onCreated?.();
      onOpenChange(false);
      
      // Reset form
      setDirection(CorrespondenceDirection.OUTGOING);
      setChannel(CorrespondenceChannel.EMAIL);
      setSubject('');
      setDetails('');
      setPartySearch(prefilledPartyName || '');
      
      if (openRelatedScreen) {
        toast.info('Opening related screen...');
      }
    } catch (error) {
      toast.error('Failed to log correspondence');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Correspondence</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as CorrespondenceDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CorrespondenceDirection.INCOMING}>Incoming</SelectItem>
                  <SelectItem value={CorrespondenceDirection.OUTGOING}>Outgoing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as CorrespondenceChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CorrespondenceChannel.PHONE}>Phone Call</SelectItem>
                  <SelectItem value={CorrespondenceChannel.EMAIL}>Email</SelectItem>
                  <SelectItem value={CorrespondenceChannel.LETTER}>Letter</SelectItem>
                  <SelectItem value={CorrespondenceChannel.SMS}>SMS</SelectItem>
                  <SelectItem value={CorrespondenceChannel.IN_PERSON}>In-Person Visit</SelectItem>
                  <SelectItem value={CorrespondenceChannel.PORTAL}>Portal Message</SelectItem>
                  <SelectItem value={CorrespondenceChannel.FAX}>Fax</SelectItem>
                  <SelectItem value={CorrespondenceChannel.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Territory</Label>
              <Select value={territory} onValueChange={(v) => setTerritory(v as 'StKitts' | 'Nevis')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="StKitts">St Kitts</SelectItem>
                  <SelectItem value="Nevis">Nevis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as CorrespondencePriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CorrespondencePriority.LOW}>Low</SelectItem>
                  <SelectItem value={CorrespondencePriority.NORMAL}>Normal</SelectItem>
                  <SelectItem value={CorrespondencePriority.HIGH}>High</SelectItem>
                  <SelectItem value={CorrespondencePriority.URGENT}>Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Party (Search by SSN, Employer ID, Name, etc.)</Label>
            <Input
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
              placeholder="Search by SSN, name, employer number..."
              disabled={!!prefilledPartyId}
            />
            {prefilledPartyId && (
              <p className="text-sm text-muted-foreground mt-1">Pre-linked to: {prefilledPartyName}</p>
            )}
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject or title"
            />
          </div>

          <div>
            <Label>Details / Notes</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Call summary, email content, letter details, visit notes..."
              rows={6}
            />
          </div>

          {/* Additional fields for letters and emails */}
          {(channel === CorrespondenceChannel.LETTER || channel === CorrespondenceChannel.EMAIL) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    {direction === CorrespondenceDirection.OUTGOING ? 'Date Sent' : 'Date Received'}
                  </Label>
                  <Input
                    type="date"
                    value={communicationDate}
                    onChange={(e) => setCommunicationDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Actual date the {channel === CorrespondenceChannel.LETTER ? 'letter' : 'email'} was {direction === CorrespondenceDirection.OUTGOING ? 'sent' : 'received'}
                  </p>
                </div>

                <div>
                  <Label>Reference Number</Label>
                  <Input
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder={channel === CorrespondenceChannel.LETTER ? 'Letter ref. no.' : 'Email tracking no.'}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    External tracking or reference number
                  </p>
                </div>
              </div>

              {channel === CorrespondenceChannel.LETTER && (
                <div>
                  <Label>Storing Time (Optional)</Label>
                  <Input
                    type="datetime-local"
                    value={storingTime}
                    onChange={(e) => setStoringTime(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Timestamp when physical letter was filed/stored
                  </p>
                </div>
              )}
            </>
          )}

          {/* Physical delivery tracking for outgoing letters */}
          {direction === CorrespondenceDirection.OUTGOING && 
           channel === CorrespondenceChannel.LETTER && (
            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium mb-3 text-sm">Physical Delivery Tracking</h4>
              
              <div className="flex items-center space-x-2 mb-3">
                <Checkbox
                  id="requiresAck"
                  checked={requiresAcknowledgement}
                  onCheckedChange={(checked) => setRequiresAcknowledgement(checked as boolean)}
                />
                <Label htmlFor="requiresAck" className="cursor-pointer">
                  Requires acknowledgement signature (mobile capture)
                </Label>
              </div>

              {requiresAcknowledgement && (
                <div>
                  <Label>Assign to Inspector</Label>
                  <Select value={assignedInspectorId} onValueChange={setAssignedInspectorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspector for delivery" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INS001">John Inspector</SelectItem>
                      <SelectItem value="INS002">Mary Field Officer</SelectItem>
                      <SelectItem value="INS003">Peter Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inspector will deliver letter and capture acknowledgement via mobile app
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="openRelated"
              checked={openRelatedScreen}
              onCheckedChange={(checked) => setOpenRelatedScreen(checked as boolean)}
            />
            <Label htmlFor="openRelated" className="cursor-pointer">
              Open related screen after saving
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Correspondence'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
