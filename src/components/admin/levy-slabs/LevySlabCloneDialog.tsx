import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useCloneLevySlab } from '@/hooks/useLevySlabsManagement';

interface LevySlabCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceSlabId: string | null;
}

export const LevySlabCloneDialog: React.FC<LevySlabCloneDialogProps> = ({
  open,
  onOpenChange,
  sourceSlabId
}) => {
  const cloneMutation = useCloneLevySlab();

  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceSlabId) return;

    await cloneMutation.mutateAsync({
      sourceSlabId,
      newStartDate,
      newEndDate
    });

    setNewStartDate('');
    setNewEndDate('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Levy Slab</DialogTitle>
          <DialogDescription>
            Create a new levy slab with the same tax brackets as the selected slab. 
            All slab details will be copied to the new period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="newStartDate">New Start Date</Label>
              <Input
                id="newStartDate"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndDate">New End Date</Label>
              <Input
                id="newEndDate"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={cloneMutation.isPending}>
              {cloneMutation.isPending ? 'Cloning...' : 'Clone Slab'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
