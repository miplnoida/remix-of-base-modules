import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ItemType } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { toast } from 'sonner';

interface AddPlanItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}

export function AddPlanItemDialog({ open, onOpenChange, onItemAdded }: AddPlanItemDialogProps) {
  const [itemType, setItemType] = useState<ItemType>(ItemType.EMPLOYER_VISIT);
  const [territory, setTerritory] = useState<'St Kitts' | 'Nevis'>('St Kitts');
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedStartTime, setPlannedStartTime] = useState('');
  const [plannedEndTime, setPlannedEndTime] = useState('');
  const [employerId, setEmployerId] = useState('');
  const [areaName, setAreaName] = useState('');
  const [focusNotes, setFocusNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (itemType === ItemType.EMPLOYER_VISIT && !employerId) {
      toast.error('Please enter an Employer ID');
      return;
    }
    
    if (itemType === ItemType.SCOUTING && !areaName) {
      toast.error('Please enter an Area Name');
      return;
    }

    try {
      setLoading(true);
      await inspectionService.createWeeklyPlanItem({
        itemType,
        employerId: itemType === ItemType.EMPLOYER_VISIT ? employerId : undefined,
        territory,
        plannedDate,
        plannedStartTime,
        plannedEndTime,
        areaName: itemType === ItemType.SCOUTING ? areaName : undefined,
        focusNotes: itemType === ItemType.SCOUTING ? focusNotes : undefined
      });
      
      toast.success('Activity added to weekly plan');
      onItemAdded();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to add activity');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItemType(ItemType.EMPLOYER_VISIT);
    setTerritory('St Kitts');
    setPlannedDate('');
    setPlannedStartTime('');
    setPlannedEndTime('');
    setEmployerId('');
    setAreaName('');
    setFocusNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Activity to Weekly Plan</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Activity Type</Label>
            <Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ItemType.EMPLOYER_VISIT}>Employer Visit</SelectItem>
                <SelectItem value={ItemType.SCOUTING}>Scouting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Territory</Label>
            <Select value={territory} onValueChange={(value) => setTerritory(value as 'St Kitts' | 'Nevis')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="St Kitts">St Kitts</SelectItem>
                <SelectItem value="Nevis">Nevis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {itemType === ItemType.EMPLOYER_VISIT ? (
            <div className="space-y-2">
              <Label>Employer ID</Label>
              <Input
                value={employerId}
                onChange={(e) => setEmployerId(e.target.value)}
                placeholder="EMP-2024-001"
                required
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Area Name</Label>
                <Input
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Basseterre Industrial Zone"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Focus Notes (Optional)</Label>
                <Textarea
                  value={focusNotes}
                  onChange={(e) => setFocusNotes(e.target.value)}
                  placeholder="Check for unregistered businesses..."
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Planned Date</Label>
            <Input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={plannedStartTime}
                onChange={(e) => setPlannedStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={plannedEndTime}
                onChange={(e) => setPlannedEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add to Plan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
