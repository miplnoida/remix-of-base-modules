import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCloneC3Config, C3ConfigWithDetails } from '@/hooks/useC3ConfigManagement';
import { useUserCode } from '@/hooks/useUserCode';
import { format, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface C3ConfigCloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceConfig: C3ConfigWithDetails | null;
}

export function C3ConfigCloneDialog({ isOpen, onClose, sourceConfig }: C3ConfigCloneDialogProps) {
  const { userCode } = useUserCode();
  const cloneConfig = useCloneC3Config();

  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [description, setDescription] = useState('');

  // Reset form when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    } else if (sourceConfig) {
      // Default new start date to day after source end date, or today
      const defaultStart = sourceConfig.end_date 
        ? format(addDays(new Date(sourceConfig.end_date), 1), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      setNewStartDate(defaultStart);
      setNewEndDate('');
      setDescription(`Cloned from configuration ${format(new Date(sourceConfig.start_date), 'MMM yyyy')}`);
    }
  };

  const handleClone = async () => {
    if (!sourceConfig || !newStartDate) return;

    await cloneConfig.mutateAsync({
      sourceId: sourceConfig.id,
      newStartDate,
      newEndDate: newEndDate || null,
      description: description || undefined,
      userCode: userCode || undefined
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Configuration</DialogTitle>
          <DialogDescription>
            Create a new configuration period based on an existing one. All parameters will be copied to the new period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sourceConfig && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium">Source Configuration</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(sourceConfig.start_date), 'dd MMM yyyy')} - {sourceConfig.end_date ? format(new Date(sourceConfig.end_date), 'dd MMM yyyy') : 'Open-ended'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newStartDate">New Start Date *</Label>
              <Input
                id="newStartDate"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndDate">New End Date</Label>
              <Input
                id="newEndDate"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                placeholder="Leave empty for open-ended"
              />
              <p className="text-xs text-muted-foreground">Leave empty for current/active period</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this configuration period..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleClone} 
            disabled={!newStartDate || cloneConfig.isPending}
          >
            {cloneConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Clone Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
