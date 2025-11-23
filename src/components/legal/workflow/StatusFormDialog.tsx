import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  mockStages, 
  mockDocumentTemplates, 
  mockNotificationTemplates, 
  mockTaskTemplates,
  LegalStatus 
} from '@/data/mockLegalWorkflow';
import { toast } from 'sonner';

interface StatusFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: LegalStatus | null;
  onSave: (status: Omit<LegalStatus, 'id'>) => void;
  allStatuses: LegalStatus[];
}

export function StatusFormDialog({ open, onOpenChange, status, onSave, allStatuses }: StatusFormDialogProps) {
  const [formData, setFormData] = useState<Omit<LegalStatus, 'id'>>({
    name: '',
    code: '',
    stageId: mockStages[0]?.id || '',
    orderInStage: 1,
    active: true,
    description: '',
    isStartStatus: false,
    isEndStatus: false,
    requiresDocument: false,
    documentTemplate: '',
    triggersNotification: false,
    notificationTemplate: '',
    triggersTask: false,
    taskTemplate: '',
    allowedNextStatusIds: []
  });

  useEffect(() => {
    if (status) {
      setFormData({
        name: status.name,
        code: status.code,
        stageId: status.stageId,
        orderInStage: status.orderInStage,
        active: status.active,
        description: status.description || '',
        isStartStatus: status.isStartStatus,
        isEndStatus: status.isEndStatus,
        requiresDocument: status.requiresDocument,
        documentTemplate: status.documentTemplate || '',
        triggersNotification: status.triggersNotification,
        notificationTemplate: status.notificationTemplate || '',
        triggersTask: status.triggersTask,
        taskTemplate: status.taskTemplate || '',
        allowedNextStatusIds: status.allowedNextStatusIds
      });
    } else {
      setFormData({
        name: '',
        code: '',
        stageId: mockStages[0]?.id || '',
        orderInStage: 1,
        active: true,
        description: '',
        isStartStatus: false,
        isEndStatus: false,
        requiresDocument: false,
        documentTemplate: '',
        triggersNotification: false,
        notificationTemplate: '',
        triggersTask: false,
        taskTemplate: '',
        allowedNextStatusIds: []
      });
    }
  }, [status, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Status name is required');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Status code is required');
      return;
    }
    if (!formData.stageId) {
      toast.error('Please select a stage');
      return;
    }

    onSave(formData);
  };

  const handleToggleNextStatus = (statusId: string) => {
    setFormData({
      ...formData,
      allowedNextStatusIds: formData.allowedNextStatusIds.includes(statusId)
        ? formData.allowedNextStatusIds.filter(id => id !== statusId)
        : [...formData.allowedNextStatusIds, statusId]
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{status ? 'Edit Status' : 'Add New Status'}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Status Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Pending Legal Review"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Status Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. PENDING_REVIEW"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Belongs to Stage *</Label>
                <Select value={formData.stageId} onValueChange={(value) => setFormData({ ...formData, stageId: value })}>
                  <SelectTrigger id="stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Order within Stage</Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  value={formData.orderInStage}
                  onChange={(e) => setFormData({ ...formData, orderInStage: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when this status is used..."
                rows={3}
              />
            </div>

            {/* Flags */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label htmlFor="active" className="text-sm">Active</Label>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label htmlFor="isStart" className="text-sm">Start Status</Label>
                <Switch
                  id="isStart"
                  checked={formData.isStartStatus}
                  onCheckedChange={(checked) => setFormData({ ...formData, isStartStatus: checked })}
                />
              </div>

              <div className="flex items-center justify-between border rounded-lg p-3">
                <Label htmlFor="isEnd" className="text-sm">End Status</Label>
                <Switch
                  id="isEnd"
                  checked={formData.isEndStatus}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEndStatus: checked })}
                />
              </div>
            </div>

            {/* Document */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="requiresDoc">Requires Document</Label>
                <Switch
                  id="requiresDoc"
                  checked={formData.requiresDocument}
                  onCheckedChange={(checked) => setFormData({ ...formData, requiresDocument: checked })}
                />
              </div>
              {formData.requiresDocument && (
                <div className="space-y-2">
                  <Label htmlFor="docTemplate">Document Template</Label>
                  <Select 
                    value={formData.documentTemplate} 
                    onValueChange={(value) => setFormData({ ...formData, documentTemplate: value })}
                  >
                    <SelectTrigger id="docTemplate">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockDocumentTemplates.map((template) => (
                        <SelectItem key={template} value={template}>
                          {template}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Notification */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="triggersNotif">Triggers Notification</Label>
                <Switch
                  id="triggersNotif"
                  checked={formData.triggersNotification}
                  onCheckedChange={(checked) => setFormData({ ...formData, triggersNotification: checked })}
                />
              </div>
              {formData.triggersNotification && (
                <div className="space-y-2">
                  <Label htmlFor="notifTemplate">Notification Template</Label>
                  <Select 
                    value={formData.notificationTemplate} 
                    onValueChange={(value) => setFormData({ ...formData, notificationTemplate: value })}
                  >
                    <SelectTrigger id="notifTemplate">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockNotificationTemplates.map((template) => (
                        <SelectItem key={template} value={template}>
                          {template}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Task */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="triggersTask">Triggers Task</Label>
                <Switch
                  id="triggersTask"
                  checked={formData.triggersTask}
                  onCheckedChange={(checked) => setFormData({ ...formData, triggersTask: checked })}
                />
              </div>
              {formData.triggersTask && (
                <div className="space-y-2">
                  <Label htmlFor="taskTemplate">Task Template</Label>
                  <Select 
                    value={formData.taskTemplate} 
                    onValueChange={(value) => setFormData({ ...formData, taskTemplate: value })}
                  >
                    <SelectTrigger id="taskTemplate">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockTaskTemplates.map((template) => (
                        <SelectItem key={template} value={template}>
                          {template}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Allowed Next Statuses */}
            <div className="space-y-3 border rounded-lg p-4">
              <Label>Allowed Next Statuses</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select which statuses this status can transition to
              </p>
              <ScrollArea className="h-48 border rounded p-3">
                <div className="space-y-2">
                  {allStatuses
                    .filter(s => s.id !== status?.id)
                    .map((s) => (
                      <div key={s.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`next-${s.id}`}
                          checked={formData.allowedNextStatusIds.includes(s.id)}
                          onCheckedChange={() => handleToggleNextStatus(s.id)}
                        />
                        <label
                          htmlFor={`next-${s.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {s.name} <span className="text-muted-foreground">({mockStages.find(st => st.id === s.stageId)?.name})</span>
                        </label>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {status ? 'Update' : 'Create'} Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
