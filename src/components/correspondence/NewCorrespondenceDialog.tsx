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
