import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface RecordServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  partyName?: string;
  onServiceRecorded: () => void;
}

export function RecordServiceDialog({ 
  open, 
  onOpenChange, 
  caseId, 
  partyName,
  onServiceRecorded 
}: RecordServiceDialogProps) {
  const [method, setMethod] = useState('Personal');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [server, setServer] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  const handleSubmit = () => {
    if (!date || !server || !address) {
      toast.error('Please fill in all required fields');
      return;
    }

    // In real implementation, this would call an API
    toast.success('Service attempt recorded');
    onServiceRecorded();
    handleClose();
  };

  const handleClose = () => {
    setMethod('Personal');
    setDate('');
    setTime('');
    setServer('');
    setAddress('');
    setNotes('');
    setProof(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Record Service of Process</DialogTitle>
          {partyName && (
            <p className="text-sm text-muted-foreground">Party: {partyName}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Service Method *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal">Personal Service</SelectItem>
                <SelectItem value="Mail">Certified Mail</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Courier">Courier Service</SelectItem>
                <SelectItem value="Substituted">Substituted Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Server Name *</Label>
            <Input
              placeholder="Name of person who served"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Address Served *</Label>
            <Textarea
              placeholder="Full address where service was attempted"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any additional details about the service attempt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Proof of Service</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                id="proof-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setProof(e.target.files?.[0] || null)}
              />
              <label htmlFor="proof-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {proof ? proof.name : 'Click to upload proof document'}
                </p>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Record Service</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
