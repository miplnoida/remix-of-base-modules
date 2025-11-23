import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LegalStage } from '@/data/mockLegalWorkflow';
import { toast } from 'sonner';

interface StageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: LegalStage | null;
  onSave: (stage: Omit<LegalStage, 'id'>) => void;
}

const PRESET_COLOURS = [
  '#94a3b8', '#60a5fa', '#a78bfa', '#f59e0b', 
  '#ef4444', '#10b981', '#6b7280', '#8b5cf6',
  '#ec4899', '#06b6d4'
];

export function StageFormDialog({ open, onOpenChange, stage, onSave }: StageFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    order: 1,
    active: true,
    colour: PRESET_COLOURS[0]
  });

  useEffect(() => {
    if (stage) {
      setFormData({
        name: stage.name,
        code: stage.code,
        order: stage.order,
        active: stage.active,
        colour: stage.colour || PRESET_COLOURS[0]
      });
    } else {
      setFormData({
        name: '',
        code: '',
        order: 1,
        active: true,
        colour: PRESET_COLOURS[0]
      });
    }
  }, [stage, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Stage name is required');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Stage code is required');
      return;
    }

    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stage ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Stage Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Pre-Legal Review"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Stage Code *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. PRE_LEGAL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Display Order</Label>
            <Input
              id="order"
              type="number"
              min="1"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="space-y-2">
            <Label>Colour</Label>
            <div className="grid grid-cols-10 gap-2">
              {PRESET_COLOURS.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: colour,
                    borderColor: formData.colour === colour ? '#000' : 'transparent'
                  }}
                  onClick={() => setFormData({ ...formData, colour })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {stage ? 'Update' : 'Create'} Stage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
