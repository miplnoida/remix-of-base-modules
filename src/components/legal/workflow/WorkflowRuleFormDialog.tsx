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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  LegalWorkflowRule,
  mockStages,
  mockStatuses,
  mockCaseCategories,
  mockInternalAlertTemplates,
  mockLetterTemplates,
  mockTaskTemplates
} from '@/data/mockLegalWorkflow';

interface WorkflowRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: LegalWorkflowRule | null;
  onSave: (rule: LegalWorkflowRule) => void;
}

export function WorkflowRuleFormDialog({
  open,
  onOpenChange,
  rule,
  onSave
}: WorkflowRuleFormDialogProps) {
  const [formData, setFormData] = useState<Partial<LegalWorkflowRule>>({
    name: '',
    description: '',
    active: true,
    stageId: '',
    statusId: '',
    daysInStatus: 14,
    minOutstandingAmount: null,
    maxOutstandingAmount: null,
    caseCategory: null,
    suggestNextStatusId: null,
    autoChangeStatus: false,
    sendInternalAlert: false,
    internalNotificationTemplateId: null,
    sendExternalLetter: false,
    letterTemplateId: null,
    createTask: false,
    taskTemplateId: null
  });

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        name: '',
        description: '',
        active: true,
        stageId: '',
        statusId: '',
        daysInStatus: 14,
        minOutstandingAmount: null,
        maxOutstandingAmount: null,
        caseCategory: null,
        suggestNextStatusId: null,
        autoChangeStatus: false,
        sendInternalAlert: false,
        internalNotificationTemplateId: null,
        sendExternalLetter: false,
        letterTemplateId: null,
        createTask: false,
        taskTemplateId: null
      });
    }
  }, [rule, open]);

  const availableStatuses = formData.stageId
    ? mockStatuses.filter(s => s.stageId === formData.stageId)
    : mockStatuses;

  const handleSave = () => {
    if (!formData.name || !formData.stageId || !formData.statusId) {
      return;
    }

    onSave({
      id: rule?.id || '',
      ...formData
    } as LegalWorkflowRule);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Workflow Rule' : 'Add Workflow Rule'}</DialogTitle>
          <DialogDescription>
            Define conditions and actions for automated workflow processing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Escalate After 30 Days"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when this rule should run and what it does"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>

          <Separator />

          {/* Trigger Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Trigger Conditions</h3>
            <p className="text-sm text-muted-foreground">
              When a case remains in the specified status for N days, this rule becomes eligible to run
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage *</Label>
                <Select
                  value={formData.stageId}
                  onValueChange={(value) => setFormData({ ...formData, stageId: value, statusId: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockStages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.statusId}
                  onValueChange={(value) => setFormData({ ...formData, statusId: value })}
                  disabled={!formData.stageId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Days in Status *</Label>
              <Input
                id="days"
                type="number"
                min="1"
                value={formData.daysInStatus}
                onChange={(e) => setFormData({ ...formData, daysInStatus: parseInt(e.target.value) || 14 })}
              />
            </div>
          </div>

          <Separator />

          {/* Optional Conditions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Optional Conditions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimum Outstanding Amount</Label>
                <Input
                  id="minAmount"
                  type="number"
                  min="0"
                  placeholder="Leave blank for no minimum"
                  value={formData.minOutstandingAmount || ''}
                  onChange={(e) => setFormData({ ...formData, minOutstandingAmount: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxAmount">Maximum Outstanding Amount</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  min="0"
                  placeholder="Leave blank for no maximum"
                  value={formData.maxOutstandingAmount || ''}
                  onChange={(e) => setFormData({ ...formData, maxOutstandingAmount: e.target.value ? parseFloat(e.target.value) : null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Case Category</Label>
              <Select
                value={formData.caseCategory || 'none'}
                onValueChange={(value) => setFormData({ ...formData, caseCategory: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any category</SelectItem>
                  {mockCaseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Actions Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Actions</h3>

            {/* Status Change */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="suggestStatus"
                  checked={!!formData.suggestNextStatusId}
                  onCheckedChange={(checked) => 
                    setFormData({ 
                      ...formData, 
                      suggestNextStatusId: checked === true ? '' : null,
                      autoChangeStatus: false
                    })
                  }
                />
                <Label htmlFor="suggestStatus" className="font-medium">Suggest Next Status</Label>
              </div>

              {formData.suggestNextStatusId !== null && (
                <>
                  <Select
                    value={formData.suggestNextStatusId}
                    onValueChange={(value) => setFormData({ ...formData, suggestNextStatusId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select suggested status" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockStatuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center space-x-2 ml-6">
                    <Switch
                      id="autoChange"
                      checked={formData.autoChangeStatus}
                      onCheckedChange={(checked) => setFormData({ ...formData, autoChangeStatus: checked })}
                    />
                    <Label htmlFor="autoChange" className="text-sm text-muted-foreground">
                      Allow auto-status change in future (UI only)
                    </Label>
                  </div>
                </>
              )}
            </div>

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
                <Label htmlFor="internalAlert" className="font-medium">Send Internal Alert</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
