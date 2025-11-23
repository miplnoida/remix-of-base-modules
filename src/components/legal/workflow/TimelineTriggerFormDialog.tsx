import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  TimelineTriggerConfig,
  mockStages,
  mockStatuses,
  mockInternalAlertTemplates,
  mockLetterTemplates,
  mockTaskTemplates
} from '@/data/mockLegalWorkflow';

interface TimelineTriggerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: TimelineTriggerConfig | null;
  onSave: (trigger: TimelineTriggerConfig) => void;
}

export function TimelineTriggerFormDialog({
  open,
  onOpenChange,
  trigger,
  onSave
}: TimelineTriggerFormDialogProps) {
  const [formData, setFormData] = useState<Partial<TimelineTriggerConfig>>({
    stageId: '',
    statusId: '',
    graceDays: 0,
    escalationDays: 0,
    reminderEveryDays: null,
    nextStatusId: null,
    sendInternalAlert: false,
    internalNotificationTemplateId: null,
    sendExternalLetter: false,
    letterTemplateId: null,
    createTask: false,
    taskTemplateId: null,
    actionMode: 'suggest',
    active: true
  });

  useEffect(() => {
    if (trigger) {
      setFormData(trigger);
    } else {
      setFormData({
        stageId: '',
        statusId: '',
        graceDays: 0,
        escalationDays: 0,
        reminderEveryDays: null,
        nextStatusId: null,
        sendInternalAlert: false,
        internalNotificationTemplateId: null,
        sendExternalLetter: false,
        letterTemplateId: null,
        createTask: false,
        taskTemplateId: null,
        actionMode: 'suggest',
        active: true
      });
    }
  }, [trigger, open]);

  const currentStatus = mockStatuses.find(s => s.id === formData.statusId);
  const availableNextStatuses = currentStatus
    ? mockStatuses.filter(s => 
        currentStatus.allowedNextStatusIds.includes(s.id) || 
        s.stageId === currentStatus.stageId
      )
    : mockStatuses;

  const handleSave = () => {
    if (!formData.stageId || !formData.statusId) {
      return;
    }

    onSave({
      id: trigger?.id || '',
      ...formData
    } as TimelineTriggerConfig);
  };

  const stageName = mockStages.find(s => s.id === formData.stageId)?.name;
  const statusName = mockStatuses.find(s => s.id === formData.statusId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Timelines & Triggers</DialogTitle>
          <DialogDescription>
            {statusName ? `for ${statusName}` : 'Define timing rules and automated actions'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stage & Status (Read-only if editing) */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <h3 className="text-lg font-semibold">Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <div className="text-sm font-medium p-2 bg-background rounded border">
                  {stageName || 'Not selected'}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="text-sm font-medium p-2 bg-background rounded border">
                  {statusName || 'Not selected'}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Time Thresholds */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Time Thresholds</h3>
            
            <div className="space-y-2">
              <Label htmlFor="graceDays">Grace Days</Label>
              <Input
                id="graceDays"
                type="number"
                min="0"
                value={formData.graceDays}
                onChange={(e) => setFormData({ ...formData, graceDays: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Wait this many days after entering status before first action
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="escalationDays">Escalate After (Days)</Label>
              <Input
                id="escalationDays"
                type="number"
                min="0"
                value={formData.escalationDays}
                onChange={(e) => setFormData({ ...formData, escalationDays: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Escalate or suggest moving to next status after this many days
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderDays">Reminder Every (Days)</Label>
              <Input
                id="reminderDays"
                type="number"
                min="0"
                placeholder="Leave blank for no reminders"
                value={formData.reminderEveryDays || ''}
                onChange={(e) => setFormData({ ...formData, reminderEveryDays: e.target.value ? parseInt(e.target.value) : null })}
              />
              <p className="text-xs text-muted-foreground">
                Send repeated reminders every X days (optional)
              </p>
            </div>
          </div>

          <Separator />

          {/* Next Step */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Next Step (Status Progression)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="nextStatus">Suggested Next Status</Label>
              <Select
                value={formData.nextStatusId || 'none'}
                onValueChange={(value) => setFormData({ ...formData, nextStatusId: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No suggestion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No suggestion</SelectItem>
                  {availableNextStatuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Actions to Trigger</h3>

            {/* Internal Alert */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internalAlert"
                  checked={formData.sendInternalAlert}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, sendInternalAlert: checked === true })
                  }
                />
                <Label htmlFor="internalAlert" className="font-medium">Send Internal Alert (Bring-up)</Label>
              </div>

              {formData.sendInternalAlert && (
                <Select
                  value={formData.internalNotificationTemplateId || ''}
                  onValueChange={(value) => setFormData({ ...formData, internalNotificationTemplateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification template" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockInternalAlertTemplates.map(tmpl => (
                      <SelectItem key={tmpl} value={tmpl}>
                        {tmpl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* External Letter */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="externalLetter"
                  checked={formData.sendExternalLetter}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, sendExternalLetter: checked === true })
                  }
                />
                <Label htmlFor="externalLetter" className="font-medium">Send External Letter / Email</Label>
              </div>

              {formData.sendExternalLetter && (
                <Select
                  value={formData.letterTemplateId || ''}
                  onValueChange={(value) => setFormData({ ...formData, letterTemplateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select letter template" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockLetterTemplates.map(tmpl => (
                      <SelectItem key={tmpl} value={tmpl}>
                        {tmpl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Task */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createTask"
                  checked={formData.createTask}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, createTask: checked === true })
                  }
                />
                <Label htmlFor="createTask" className="font-medium">Create Follow-up Task</Label>
              </div>

              {formData.createTask && (
                <Select
                  value={formData.taskTemplateId || ''}
                  onValueChange={(value) => setFormData({ ...formData, taskTemplateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task template" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockTaskTemplates.map(tmpl => (
                      <SelectItem key={tmpl} value={tmpl}>
                        {tmpl.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <Separator />

          {/* Action Mode */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Action Mode</h3>
            <p className="text-sm text-muted-foreground">
              UI only - determines how the system presents status change suggestions
            </p>

            <RadioGroup
              value={formData.actionMode}
              onValueChange={(value: any) => setFormData({ ...formData, actionMode: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suggest" id="suggest" />
                <Label htmlFor="suggest" className="font-normal">
                  Suggest change only (user decides)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto_suggest" id="auto_suggest" />
                <Label htmlFor="auto_suggest" className="font-normal">
                  Auto-suggest next status when user opens case
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto_transition" id="auto_transition" />
                <Label htmlFor="auto_transition" className="font-normal">
                  (Future) Auto-transition allowed
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Active Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
