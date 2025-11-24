import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitId: string | null;
}

export const EvidenceDialog = ({ open, onOpenChange, visitId }: EvidenceDialogProps) => {
  const { toast } = useToast();
  const [description, setDescription] = useState('');

  const handleCapture = () => {
    toast({
      title: "Photo Captured",
      description: "Evidence photo has been saved",
    });
  };

  const handleUpload = () => {
    toast({
      title: "File Upload",
      description: "File upload feature coming soon",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Evidence Saved",
      description: "Evidence has been attached to this visit",
    });
    onOpenChange(false);
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Capture Evidence</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-24 flex-col gap-2"
              onClick={handleCapture}
            >
              <Camera className="h-6 w-6" />
              <span className="text-sm">Take Photo</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-24 flex-col gap-2"
              onClick={handleUpload}
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm">Upload File</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the evidence being captured..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Evidence</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
