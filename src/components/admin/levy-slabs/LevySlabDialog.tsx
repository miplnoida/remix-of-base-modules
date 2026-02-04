import React, { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useCreateLevySlab, useUpdateLevySlab, LevySlab } from '@/hooks/useLevySlabsManagement';

interface LevySlabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slab: LevySlab | null;
}

export const LevySlabDialog: React.FC<LevySlabDialogProps> = ({
  open,
  onOpenChange,
  slab
}) => {
  const createMutation = useCreateLevySlab();
  const updateMutation = useUpdateLevySlab();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (slab) {
      setStartDate(slab.start_date);
      setEndDate(slab.end_date);
      setIsActive(slab.is_active);
    } else {
      setStartDate('');
      setEndDate('');
      setIsActive(true);
    }
  }, [slab, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (slab) {
      await updateMutation.mutateAsync({
        id: slab.id,
        startDate,
        endDate,
        isActive
      });
    } else {
      await createMutation.mutateAsync({
        startDate,
        endDate
      });
    }

    onOpenChange(false);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slab ? 'Edit Levy Slab' : 'Create Levy Slab'}</DialogTitle>
          <DialogDescription>
            {slab
              ? 'Update the levy slab period dates and status'
              : 'Create a new levy slab period for tax bracket calculations'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {slab && (
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : slab ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
