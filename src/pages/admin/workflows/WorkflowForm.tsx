import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { MODULE_NAMES } from '@/hooks/useActionPermission';
import {
  useWorkflowWithSteps,
  useCreateWorkflow,
  useUpdateWorkflow,
  useSaveWorkflowSteps,
  WorkflowStep,
  WorkflowStepAction,
  WorkflowActionNotification,
} from '@/hooks/useWorkflows';
import { useDbRoles } from '@/hooks/useRolesData';
import { useDesignations } from '@/hooks/useDesignations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StepFormData {
  id?: string;
  step_number: number;
  step_name: string;
  assigned_role: string | null;
  assigned_designation: string | null;
  action_type: string;
  sla_hours: number;
  is_final_step: boolean;
  isOpen: boolean;
  actions: ActionFormData[];
}

interface ActionFormData {
  id?: string;
  action_name: string;
  action_type: string;
  is_final_action: boolean;
  display_order: number;
  notifications: NotificationFormData[];
}

interface NotificationFormData {
  id?: string;
  notification_type: string;
  template_id: string | null;
}

const PROCESS_TYPES = [
  'Application Approval',
  'Invoice Approval',
  'HR Approval',
  'Leave Request',
  'Purchase Order',
  'Expense Claim',
  'Document Review',
  'Custom',
];

const ACTION_TYPES = [
  'Approve',
  'Reject',
  'SendBack',
  'Escalate',
  'AutoApprove',
  'Review',
  'Custom',
];

const NOTIFICATION_TYPES = ['Email', 'SMS', 'Push', 'In-App'];

export default function WorkflowForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    process_type: '',
    default_sla_hours: 24,
    is_active: false,
  });

  const [steps, setSteps] = useState<StepFormData[]>([]);

  const { data: workflow, isLoading } = useWorkflowWithSteps(isEditing ? id : null);
  const { data: roles } = useDbRoles();
  const { data: designations } = useDesignations();
  const { data: templates } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const saveSteps = useSaveWorkflowSteps();

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        process_type: workflow.process_type,
        default_sla_hours: workflow.default_sla_hours,
        is_active: workflow.is_active,
      });

      setSteps(
        workflow.steps.map((step, idx) => ({
          id: step.id,
          step_number: step.step_number,
          step_name: step.step_name,
          assigned_role: step.assigned_role,
          assigned_designation: step.assigned_designation,
          action_type: step.action_type,
          sla_hours: step.sla_hours,
          is_final_step: step.is_final_step,
          isOpen: idx === 0,
          actions: step.actions.map(action => ({
            id: action.id,
            action_name: action.action_name,
            action_type: action.action_type,
            is_final_action: action.is_final_action,
            display_order: action.display_order,
            notifications: action.notifications.map(n => ({
              id: n.id,
              notification_type: n.notification_type,
              template_id: n.template_id,
            })),
          })),
        }))
      );
    }
  }, [workflow]);

  const addStep = () => {
    const newStepNumber = steps.length + 1;
    setSteps([
      ...steps,
      {
        step_number: newStepNumber,
        step_name: `Step ${newStepNumber}`,
        assigned_role: null,
        assigned_designation: null,
        action_type: 'Review',
        sla_hours: 24,
        is_final_step: false,
        isOpen: true,
        actions: [
          {
            action_name: 'Approve',
            action_type: 'Approve',
            is_final_action: false,
            display_order: 0,
            notifications: [],
          },
        ],
      },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Renumber steps
    newSteps.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: keyof StepFormData, value: any) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;

    // If marking as final, unmark others
    if (field === 'is_final_step' && value === true) {
      newSteps.forEach((step, i) => {
        if (i !== index) step.is_final_step = false;
      });
    }

    setSteps(newSteps);
  };

  const addAction = (stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].actions.push({
      action_name: 'New Action',
      action_type: 'Custom',
      is_final_action: false,
      display_order: newSteps[stepIndex].actions.length,
      notifications: [],
    });
    setSteps(newSteps);
  };

  const removeAction = (stepIndex: number, actionIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].actions = newSteps[stepIndex].actions.filter((_, i) => i !== actionIndex);
    setSteps(newSteps);
  };

  const updateAction = (stepIndex: number, actionIndex: number, field: keyof ActionFormData, value: any) => {
    const newSteps = [...steps];
    (newSteps[stepIndex].actions[actionIndex] as any)[field] = value;
    setSteps(newSteps);
  };

  const addNotification = (stepIndex: number, actionIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].actions[actionIndex].notifications.push({
      notification_type: 'Email',
      template_id: null,
    });
    setSteps(newSteps);
  };

  const removeNotification = (stepIndex: number, actionIndex: number, notifIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].actions[actionIndex].notifications = 
      newSteps[stepIndex].actions[actionIndex].notifications.filter((_, i) => i !== notifIndex);
    setSteps(newSteps);
  };

  const updateNotification = (
    stepIndex: number,
    actionIndex: number,
    notifIndex: number,
    field: keyof NotificationFormData,
    value: any
  ) => {
    const newSteps = [...steps];
    (newSteps[stepIndex].actions[actionIndex].notifications[notifIndex] as any)[field] = value;
    setSteps(newSteps);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Workflow name is required', variant: 'destructive' });
      return false;
    }
    if (!formData.process_type) {
      toast({ title: 'Error', description: 'Process type is required', variant: 'destructive' });
      return false;
    }
    if (steps.length === 0) {
      toast({ title: 'Error', description: 'At least one step is required', variant: 'destructive' });
      return false;
    }
    const finalSteps = steps.filter(s => s.is_final_step);
    if (finalSteps.length !== 1) {
      toast({ title: 'Error', description: 'Exactly one step must be marked as final', variant: 'destructive' });
      return false;
    }
    for (const step of steps) {
      if (!step.step_name.trim()) {
        toast({ title: 'Error', description: 'All steps must have a name', variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let workflowId = id;

      if (isEditing) {
        await updateWorkflow.mutateAsync({ id: id!, ...formData });
      } else {
        const newWorkflow = await createWorkflow.mutateAsync(formData);
        workflowId = newWorkflow.id;
      }

      // Save steps
      await saveSteps.mutateAsync({
        workflowId: workflowId!,
        steps: steps.map(step => ({
          step_number: step.step_number,
          step_name: step.step_name,
          assigned_role: step.assigned_role,
          assigned_designation: step.assigned_designation,
          action_type: step.action_type,
          sla_hours: step.sla_hours,
          is_final_step: step.is_final_step,
          actions: step.actions.map(action => ({
            action_name: action.action_name,
            action_type: action.action_type as any,
            next_step_id: null,
            is_final_action: action.is_final_action,
            display_order: action.display_order,
            notifications: action.notifications,
          })),
        })),
      });

      navigate('/admin/workflows');
    } catch (error) {
      // Error toast is handled in mutations
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PermissionWrapper moduleName={MODULE_NAMES.WORKFLOW_MANAGEMENT}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/workflows')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Workflow' : 'Create Workflow'}
            </h1>
          </div>
          <Button onClick={handleSave} disabled={createWorkflow.isPending || updateWorkflow.isPending || saveSteps.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Workflow
          </Button>
        </div>

        {/* Main Form Fields */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
            <CardDescription>Configure the basic workflow settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workflow Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter workflow name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="process_type">Process Type *</Label>
                <Select
                  value={formData.process_type}
                  onValueChange={(value) => setFormData({ ...formData, process_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select process type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESS_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter workflow description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sla">Default SLA (hours)</Label>
                <Input
                  id="sla"
                  type="number"
                  value={formData.default_sla_hours}
                  onChange={(e) => setFormData({ ...formData, default_sla_hours: parseInt(e.target.value) || 24 })}
                  min={1}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Workflow Steps</CardTitle>
                <CardDescription>Define the approval steps for this workflow</CardDescription>
              </div>
              <Button onClick={addStep}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No steps defined. Click "Add Step" to create your first workflow step.
              </div>
            ) : (
              steps.map((step, stepIndex) => (
                <Collapsible
                  key={stepIndex}
                  open={step.isOpen}
                  onOpenChange={(open) => updateStep(stepIndex, 'isOpen', open)}
                >
                  <Card className="border-l-4 border-l-primary">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {step.isOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <Badge variant="outline">Step {step.step_number}</Badge>
                            <span className="font-medium">{step.step_name}</span>
                            {step.is_final_step && (
                              <Badge variant="secondary">Final Step</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStep(stepIndex);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4 pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Step Name *</Label>
                            <Input
                              value={step.step_name}
                              onChange={(e) => updateStep(stepIndex, 'step_name', e.target.value)}
                              placeholder="Enter step name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Action Type</Label>
                            <Select
                              value={step.action_type}
                              onValueChange={(value) => updateStep(stepIndex, 'action_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_TYPES.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Assigned Role</Label>
                            <Select
                              value={step.assigned_role || '__none__'}
                              onValueChange={(value) => updateStep(stepIndex, 'assigned_role', value === '__none__' ? null : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {roles?.map((role) => (
                                  <SelectItem key={role.id} value={role.role_name}>
                                    {role.role_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Assigned Designation</Label>
                            <Select
                              value={step.assigned_designation || '__none__'}
                              onValueChange={(value) => updateStep(stepIndex, 'assigned_designation', value === '__none__' ? null : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select designation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {designations?.map((des) => (
                                  <SelectItem key={des.id} value={des.name}>
                                    {des.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>SLA (hours)</Label>
                            <Input
                              type="number"
                              value={step.sla_hours}
                              onChange={(e) => updateStep(stepIndex, 'sla_hours', parseInt(e.target.value) || 24)}
                              min={1}
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-8">
                            <Switch
                              checked={step.is_final_step}
                              onCheckedChange={(checked) => updateStep(stepIndex, 'is_final_step', checked)}
                            />
                            <Label>Final Step</Label>
                          </div>
                        </div>

                        {/* Step Actions */}
                        <div className="space-y-3 mt-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-base font-semibold">Step Actions</Label>
                            <Button variant="outline" size="sm" onClick={() => addAction(stepIndex)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add Action
                            </Button>
                          </div>
                          
                          {step.actions.map((action, actionIndex) => (
                            <Card key={actionIndex} className="bg-muted/30">
                              <CardContent className="pt-4 space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="grid grid-cols-2 gap-3 flex-1">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Action Name</Label>
                                      <Input
                                        value={action.action_name}
                                        onChange={(e) => updateAction(stepIndex, actionIndex, 'action_name', e.target.value)}
                                        placeholder="Action name"
                                        className="h-8"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Action Type</Label>
                                      <Select
                                        value={action.action_type}
                                        onValueChange={(value) => updateAction(stepIndex, actionIndex, 'action_type', value)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ACTION_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                              {type}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => removeAction(stepIndex, actionIndex)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>

                                {/* Notifications */}
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <Label className="text-xs">Notifications</Label>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-xs"
                                      onClick={() => addNotification(stepIndex, actionIndex)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add
                                    </Button>
                                  </div>
                                  {action.notifications.map((notif, notifIndex) => (
                                    <div key={notifIndex} className="flex gap-2 items-center">
                                      <Select
                                        value={notif.notification_type}
                                        onValueChange={(value) => updateNotification(stepIndex, actionIndex, notifIndex, 'notification_type', value)}
                                      >
                                        <SelectTrigger className="h-7 w-24">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {NOTIFICATION_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>
                                              {type}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Select
                                        value={notif.template_id || '__none__'}
                                        onValueChange={(value) => updateNotification(stepIndex, actionIndex, notifIndex, 'template_id', value === '__none__' ? null : value)}
                                      >
                                        <SelectTrigger className="h-7 flex-1">
                                          <SelectValue placeholder="Select template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">None</SelectItem>
                                          {templates?.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                              {t.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => removeNotification(stepIndex, actionIndex, notifIndex)}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PermissionWrapper>
  );
}
