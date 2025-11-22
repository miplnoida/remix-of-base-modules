import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface AcknowledgementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correspondenceId: string;
  correspondenceSubject: string;
  onAcknowledge: (data: AcknowledgementData) => void;
}

export interface AcknowledgementData {
  recipientName: string;
  recipientSignatureData: string;
  deliveryNotes: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

export function AcknowledgementDialog({
  open,
  onOpenChange,
  correspondenceId,
  correspondenceSubject,
  onAcknowledge,
}: AcknowledgementDialogProps) {
  const [recipientName, setRecipientName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  const captureGPS = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          toast.success('GPS location captured');
        },
        (error) => {
          toast.error('Failed to capture GPS location');
          console.error('GPS error:', error);
        }
      );
    } else {
      toast.error('GPS not available on this device');
    }
  };

  const handleSubmit = () => {
    if (!recipientName.trim()) {
      toast.error('Please enter recipient name');
      return;
    }
    if (!signature.trim()) {
      toast.error('Please capture signature');
      return;
    }

    onAcknowledge({
      recipientName: recipientName.trim(),
      recipientSignatureData: signature,
      deliveryNotes: deliveryNotes.trim(),
      gpsLatitude: gpsCoords?.lat,
      gpsLongitude: gpsCoords?.lng,
    });

    // Reset form
    setRecipientName('');
    setDeliveryNotes('');
    setSignature('');
    setGpsCoords(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Acknowledge Delivery
          </DialogTitle>
          <DialogDescription>
            Confirm delivery of: <strong>{correspondenceSubject}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipientName">Recipient Name *</Label>
            <Input
              id="recipientName"
              placeholder="Name of person who received"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signature">Signature * (Mobile App Feature)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center bg-muted/30">
              <p className="text-sm text-muted-foreground mb-2">
                Signature capture available in mobile app
              </p>
              <Input
                id="signature"
                placeholder="Enter signature code or use mobile app"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryNotes">Delivery Notes</Label>
            <Textarea
              id="deliveryNotes"
              placeholder="Any additional notes about delivery..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>GPS Location (Optional)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={captureGPS}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {gpsCoords ? 'GPS Captured' : 'Capture GPS'}
              </Button>
              {gpsCoords && (
                <span className="text-xs text-muted-foreground">
                  {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              Confirm Delivery
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
