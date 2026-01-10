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
  description: string;
  assigned_role: string | null;
  assigned_designation: string | null;
  action_type: string;
  sla_hours: number;
  is_final_step: boolean;
  isOpen: boolean;
  // New fields for PART 4
  approver_type: 'role' | 'designation' | 'specific_users' | 'department_head' | 'designation_hierarchy';
  approver_role_ids: string[];
  approver_designation_ids: string[];
  approver_user_ids: string[];
  parallel_approval: boolean;
  required_approvals: number;
  auto_approve_on_timeout: boolean;
  has_condition: boolean;
  condition_expression: any;
  escalation_enabled: boolean;
  escalation_notification_type: string;
  escalation_module_id: string | null;
  escalation_template_id: string | null;
  actions: ActionFormData[];
}

interface ActionFormData {
  id?: string;
  action_name: string;
  action_type: 'Approve' | 'Reject' | 'ReviewForPrevious' | 'QueryToApplicant';
  is_final_action: boolean;
  display_order: number;
  // Next step routing configuration
  next_step_type: 'next_step' | 'specific_step' | 'end_workflow' | 'send_back_to_applicant';
  next_step_id: string | null;
  end_state: 'Approved' | 'Rejected' | null;
  // Notification fields for actions
  notification_type: string;
  notification_module_id: string | null;
  notification_template_id: string | null;
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

const APPROVER_TYPES = [
  { value: 'role', label: 'By Role' },
  { value: 'designation', label: 'By Designation' },
  { value: 'specific_users', label: 'Specific Users' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'designation_hierarchy', label: 'Higher level in Designation Hierarchy' },
];

const STEP_ACTION_TYPES = [
  { value: 'Approve', label: 'Approve', description: 'Move to next step or complete workflow' },
  { value: 'Reject', label: 'Reject', description: 'Reject application and close workflow' },
  { value: 'ReviewForPrevious', label: 'Review for Previous Reviewer', description: 'Send back to previous step' },
  { value: 'QueryToApplicant', label: 'Query to Applicant', description: 'Request more info from applicant' },
];

const NEXT_STEP_TYPES = [
  { value: 'next_step', label: 'Next Step', description: 'Continue to the next step in sequence' },
  { value: 'specific_step', label: 'Specific Step', description: 'Go to a specific step' },
  { value: 'end_workflow', label: 'End Workflow', description: 'Complete the workflow with final status' },
  { value: 'send_back_to_applicant', label: 'Send Back to Applicant', description: 'Request applicant to provide more info' },
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
  
  // Fetch active users for specific user assignment
  const { data: users } = useQuery({
    queryKey: ['active-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch parent modules only
  const { data: parentModules } = useQuery({
    queryKey: ['parent-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, display_name')
        .is('parent_id', null)
        .eq('is_enabled', true)
        .order('display_name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['notification-templates-with-module'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('id, name, channel, module_id')
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
          description: (step as any).description || '',
          assigned_role: step.assigned_role,
          assigned_designation: step.assigned_designation,
          action_type: step.action_type,
          sla_hours: step.sla_hours,
          is_final_step: step.is_final_step,
          isOpen: idx === 0,
          // New fields
          approver_type: ((step as any).approver_type || 'role') as StepFormData['approver_type'],
          approver_role_ids: (step as any).approver_role_ids || [],
          approver_designation_ids: (step as any).approver_designation_ids || [],
          approver_user_ids: (step as any).approver_user_ids || [],
          parallel_approval: (step as any).parallel_approval || false,
          required_approvals: (step as any).required_approvals || 1,
          auto_approve_on_timeout: (step as any).auto_approve_on_timeout || false,
          has_condition: (step as any).has_condition || false,
          condition_expression: (step as any).condition_expression || null,
          escalation_enabled: (step as any).escalation_enabled || false,
          escalation_notification_type: (step as any).escalation_notification_type || '',
          escalation_module_id: (step as any).escalation_module_id || null,
          escalation_template_id: (step as any).escalation_template_id || null,
          actions: step.actions.map(action => ({
            id: action.id,
            action_name: action.action_name,
            action_type: action.action_type as ActionFormData['action_type'],
            is_final_action: action.is_final_action,
            display_order: action.display_order,
            next_step_type: ((action as any).next_step_type || 'next_step') as ActionFormData['next_step_type'],
            next_step_id: (action as any).next_step_id || null,
            end_state: ((action as any).end_state || null) as ActionFormData['end_state'],
            notification_type: (action as any).notification_type || '',
            notification_module_id: (action as any).notification_module_id || null,
            notification_template_id: (action as any).notification_template_id || null,
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
        description: '',
        assigned_role: null,
        assigned_designation: null,
        action_type: 'Review',
        sla_hours: 24,
        is_final_step: false,
        isOpen: true,
        approver_type: 'role',
        approver_role_ids: [],
        approver_designation_ids: [],
        approver_user_ids: [],
        parallel_approval: false,
        required_approvals: 1,
        auto_approve_on_timeout: false,
        has_condition: false,
        condition_expression: null,
        escalation_enabled: false,
        escalation_notification_type: '',
        escalation_module_id: null,
        escalation_template_id: null,
        actions: [
          {
            action_name: 'Approve',
            action_type: 'Approve',
            is_final_action: false,
            display_order: 0,
            next_step_type: 'next_step',
            next_step_id: null,
            end_state: null,
            notification_type: '',
            notification_module_id: null,
            notification_template_id: null,
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
      action_type: 'Approve',
      is_final_action: false,
      display_order: newSteps[stepIndex].actions.length,
      next_step_type: 'next_step',
      next_step_id: null,
      end_state: null,
      notification_type: '',
      notification_module_id: null,
      notification_template_id: null,
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
          description: step.description || null,
          assigned_role: step.assigned_role,
          assigned_designation: step.assigned_designation,
          action_type: step.action_type,
          sla_hours: step.sla_hours,
          is_final_step: step.is_final_step,
          // New approver fields
          approver_type: step.approver_type,
          approver_role_ids: step.approver_role_ids.length > 0 ? step.approver_role_ids : null,
          approver_designation_ids: step.approver_designation_ids.length > 0 ? step.approver_designation_ids : null,
          approver_user_ids: step.approver_user_ids.length > 0 ? step.approver_user_ids : null,
          parallel_approval: step.parallel_approval,
          required_approvals: step.required_approvals,
          auto_approve_on_timeout: step.auto_approve_on_timeout,
          has_condition: step.has_condition,
          condition_expression: step.condition_expression,
          escalation_enabled: step.escalation_enabled,
          escalation_notification_type: step.escalation_notification_type || null,
          escalation_module_id: step.escalation_module_id,
          escalation_template_id: step.escalation_template_id,
          actions: step.actions.map(action => ({
            action_name: action.action_name,
            action_type: action.action_type as any,
            next_step_type: action.next_step_type,
            next_step_id: action.next_step_id,
            end_state: action.end_state,
            is_final_action: action.is_final_action,
            display_order: action.display_order,
            notification_type: action.notification_type || null,
            notification_module_id: action.notification_module_id,
            notification_template_id: action.notification_template_id,
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
                  <Card className="overflow-hidden shadow-lg border-0 rounded-lg">
                    <div className="flex">
                      {/* Vertical Step Name Label - Different color for each step */}
                      <div 
                        className="flex items-center justify-center w-14 min-h-[100px] shrink-0"
                        style={{ 
                          backgroundColor: [
                            '#7c3aed', // violet
                            '#2563eb', // blue
                            '#059669', // emerald
                            '#d97706', // amber
                            '#dc2626', // red
                            '#0891b2', // cyan
                            '#c026d3', // fuchsia
                            '#4f46e5', // indigo
                          ][stepIndex % 8]
                        }}
                      >
                        <span 
                          className="text-white font-bold text-sm tracking-widest uppercase whitespace-nowrap px-3 py-2"
                          style={{ 
                            writingMode: 'vertical-rl', 
                            transform: 'rotate(180deg)',
                            letterSpacing: '0.15em',
                          }}
                        >
                          {step.step_name}
                        </span>
                      </div>
                      
                      {/* Step Content */}
                      <div className="flex-1 bg-card">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                {step.isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <Badge variant="outline" className="bg-primary/10 border-primary text-primary">
                                  Step {step.step_number}
                                </Badge>
                                <span className="font-semibold text-foreground">{step.step_name}</span>
                                {step.is_final_step && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Final Step
                                  </Badge>
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
                      <CardContent className="space-y-6 pt-0">
                        {/* Step Identity Section */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b pb-2">Step Identity</h4>
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
                              <Label>Step Order</Label>
                              <Input
                                type="number"
                                value={step.step_number}
                                onChange={(e) => {
                                  const newOrder = parseInt(e.target.value);
                                  if (newOrder > 0 && newOrder <= steps.length) {
                                    const newSteps = [...steps];
                                    newSteps.forEach(s => {
                                      if (s.step_number >= newOrder && s !== step) {
                                        s.step_number = s.step_number + 1;
                                      }
                                    });
                                    step.step_number = newOrder;
                                    newSteps.sort((a, b) => a.step_number - b.step_number);
                                    setSteps(newSteps);
                                  }
                                }}
                                min={1}
                                max={steps.length}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={step.description}
                              onChange={(e) => updateStep(stepIndex, 'description', e.target.value)}
                              placeholder="Enter step description"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Approver Configuration Section */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b pb-2">Approver Configuration</h4>
                          <div className="space-y-2">
                            <Label>Approver Type *</Label>
                            <Select
                              value={step.approver_type}
                              onValueChange={(value: StepFormData['approver_type']) => updateStep(stepIndex, 'approver_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select approver type" />
                              </SelectTrigger>
                              <SelectContent>
                                {APPROVER_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Dynamic Approver Selection based on type */}
                          {step.approver_type === 'role' && (
                            <div className="space-y-2">
                              <Label>Select Roles</Label>
                              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                                {roles?.map((role) => (
                                  <label key={role.id} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={step.approver_role_ids.includes(role.id)}
                                      onChange={(e) => {
                                        const ids = e.target.checked 
                                          ? [...step.approver_role_ids, role.id]
                                          : step.approver_role_ids.filter(id => id !== role.id);
                                        updateStep(stepIndex, 'approver_role_ids', ids);
                                      }}
                                      className="rounded"
                                    />
                                    {role.role_name}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.approver_type === 'designation' && (
                            <div className="space-y-2">
                              <Label>Select Designations</Label>
                              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                                {designations?.map((des) => (
                                  <label key={des.id} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={step.approver_designation_ids.includes(des.id)}
                                      onChange={(e) => {
                                        const ids = e.target.checked 
                                          ? [...step.approver_designation_ids, des.id]
                                          : step.approver_designation_ids.filter(id => id !== des.id);
                                        updateStep(stepIndex, 'approver_designation_ids', ids);
                                      }}
                                      className="rounded"
                                    />
                                    {des.name}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.approver_type === 'specific_users' && (
                            <div className="space-y-2">
                              <Label>Select Users</Label>
                              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                                {users?.map((user) => (
                                  <label key={user.id} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={step.approver_user_ids.includes(user.id)}
                                      onChange={(e) => {
                                        const ids = e.target.checked 
                                          ? [...step.approver_user_ids, user.id]
                                          : step.approver_user_ids.filter(id => id !== user.id);
                                        updateStep(stepIndex, 'approver_user_ids', ids);
                                      }}
                                      className="rounded"
                                    />
                                    {user.full_name || user.email}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {step.approver_type === 'department_head' && (
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                              The department head of the applicant's department will be resolved at runtime.
                            </p>
                          )}

                          {step.approver_type === 'designation_hierarchy' && (
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                              Approvers will be resolved from higher levels in the applicant's designation hierarchy.
                            </p>
                          )}
                        </div>

                        {/* Parallel Approval Section */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b pb-2">Parallel Approval</h4>
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={step.parallel_approval}
                              onCheckedChange={(checked) => updateStep(stepIndex, 'parallel_approval', checked)}
                            />
                            <Label>Enable Parallel Approval</Label>
                          </div>
                          {step.parallel_approval && (
                            <div className="space-y-2">
                              <Label>Required Approvals</Label>
                              <Input
                                type="number"
                                value={step.required_approvals}
                                onChange={(e) => updateStep(stepIndex, 'required_approvals', parseInt(e.target.value) || 1)}
                                min={1}
                                className="w-32"
                              />
                              <p className="text-xs text-muted-foreground">
                                Step completes when this number of approvers approve.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* SLA Controls Section */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b pb-2">SLA Controls</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Step SLA (hours)</Label>
                              <Input
                                type="number"
                                value={step.sla_hours}
                                onChange={(e) => updateStep(stepIndex, 'sla_hours', parseInt(e.target.value) || 24)}
                                min={1}
                              />
                            </div>
                            <div className="flex items-center gap-4 pt-6">
                              <Switch
                                checked={step.auto_approve_on_timeout}
                                onCheckedChange={(checked) => updateStep(stepIndex, 'auto_approve_on_timeout', checked)}
                              />
                              <Label>Auto-approve on timeout</Label>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={step.is_final_step}
                              onCheckedChange={(checked) => updateStep(stepIndex, 'is_final_step', checked)}
                            />
                            <Label>Final Step</Label>
                          </div>
                        </div>

                        {/* Conditional Step Section */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b pb-2">Conditional Step</h4>
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={step.has_condition}
                              onCheckedChange={(checked) => updateStep(stepIndex, 'has_condition', checked)}
                            />
                            <Label>Step has condition</Label>
                          </div>
                          {step.has_condition && (
                            <div className="space-y-2">
                              <Label>Condition Expression (JSON)</Label>
                              <Textarea
                                value={step.condition_expression ? JSON.stringify(step.condition_expression, null, 2) : ''}
                                onChange={(e) => {
                                  try {
                                    const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                                    updateStep(stepIndex, 'condition_expression', parsed);
                                  } catch {
                                    // Invalid JSON, don't update
                                  }
                                }}
                                placeholder='{"field": "invoice_amount", "operator": ">", "value": 10000}'
                                rows={3}
                              />
                              <p className="text-xs text-muted-foreground">
                                Define conditions on application data. If true, step is auto-approved.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Escalation on SLA Breach Section */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-sm border-b pb-2">Escalation on SLA Breach</h4>
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={step.escalation_enabled}
                              onCheckedChange={(checked) => updateStep(stepIndex, 'escalation_enabled', checked)}
                            />
                            <Label>Enable Escalation</Label>
                          </div>
                          {step.escalation_enabled && (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Notification Type</Label>
                                <Select
                                  value={step.escalation_notification_type}
                                  onValueChange={(value) => updateStep(stepIndex, 'escalation_notification_type', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {NOTIFICATION_TYPES.map((type) => (
                                      <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Module</Label>
                                <Select
                                  value={step.escalation_module_id || '__none__'}
                                  onValueChange={(value) => updateStep(stepIndex, 'escalation_module_id', value === '__none__' ? null : value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select module" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {parentModules?.map((m) => (
                                      <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Template</Label>
                                <Select
                                  value={step.escalation_template_id || '__none__'}
                                  onValueChange={(value) => updateStep(stepIndex, 'escalation_template_id', value === '__none__' ? null : value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">None</SelectItem>
                                    {templates?.filter(t => !step.escalation_module_id || t.module_id === step.escalation_module_id).map((t) => (
                                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Step Actions - PART 5 */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-sm border-b pb-2 flex-1">Step Actions</h4>
                            <Button variant="outline" size="sm" onClick={() => addAction(stepIndex)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add Action
                            </Button>
                          </div>
                          
                          {step.actions.map((action, actionIndex) => (
                            <Card key={actionIndex} className="bg-muted/30 border-l-4 border-l-blue-400">
                              <CardContent className="pt-4 space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 space-y-4">
                                    {/* Action Identity */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label>Action Name</Label>
                                        <Input
                                          value={action.action_name}
                                          onChange={(e) => updateAction(stepIndex, actionIndex, 'action_name', e.target.value)}
                                          placeholder="Action name"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Action Type *</Label>
                                        <Select
                                          value={action.action_type}
                                          onValueChange={(value: ActionFormData['action_type']) => updateAction(stepIndex, actionIndex, 'action_type', value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {STEP_ACTION_TYPES.map((type) => (
                                              <SelectItem key={type.value} value={type.value}>
                                                <div className="flex flex-col">
                                                  <span>{type.label}</span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                          {STEP_ACTION_TYPES.find(t => t.value === action.action_type)?.description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Next Step Routing Configuration */}
                                    <div className="space-y-3 p-3 bg-background rounded-md border border-primary/20">
                                      <Label className="text-sm font-medium text-primary">Next Step Routing *</Label>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">What happens next?</Label>
                                          <Select
                                            value={action.next_step_type}
                                            onValueChange={(value: ActionFormData['next_step_type']) => {
                                              updateAction(stepIndex, actionIndex, 'next_step_type', value);
                                              // Reset related fields when type changes
                                              if (value !== 'specific_step') {
                                                updateAction(stepIndex, actionIndex, 'next_step_id', null);
                                              }
                                              if (value !== 'end_workflow') {
                                                updateAction(stepIndex, actionIndex, 'end_state', null);
                                              } else {
                                                // Set default end_state based on action type
                                                updateAction(stepIndex, actionIndex, 'end_state', action.action_type === 'Reject' ? 'Rejected' : 'Approved');
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {NEXT_STEP_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                  {type.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <p className="text-xs text-muted-foreground">
                                            {NEXT_STEP_TYPES.find(t => t.value === action.next_step_type)?.description}
                                          </p>
                                        </div>
                                        
                                        {/* Specific Step Selector */}
                                        {action.next_step_type === 'specific_step' && (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Select Step</Label>
                                            <Select
                                              value={action.next_step_id || '__none__'}
                                              onValueChange={(value) => updateAction(stepIndex, actionIndex, 'next_step_id', value === '__none__' ? null : value)}
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Select step" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__none__">Select a step...</SelectItem>
                                                {steps.map((s, idx) => (
                                                  <SelectItem key={idx} value={s.id || `temp-${idx}`} disabled={!s.id}>
                                                    Step {s.step_number}: {s.step_name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                        
                                        {/* End State Selector */}
                                        {action.next_step_type === 'end_workflow' && (
                                          <div className="space-y-1">
                                            <Label className="text-xs">End State</Label>
                                            <Select
                                              value={action.end_state || 'Approved'}
                                              onValueChange={(value: 'Approved' | 'Rejected') => updateAction(stepIndex, actionIndex, 'end_state', value)}
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="Approved">Mark as Approved</SelectItem>
                                                <SelectItem value="Rejected">Mark as Rejected</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        )}
                                        
                                        {/* Send Back to Applicant - show restart step option */}
                                        {action.next_step_type === 'send_back_to_applicant' && (
                                          <div className="space-y-1">
                                            <Label className="text-xs">Restart From Step</Label>
                                            <Select
                                              value={action.next_step_id || '__first__'}
                                              onValueChange={(value) => updateAction(stepIndex, actionIndex, 'next_step_id', value === '__first__' ? null : value)}
                                            >
                                              <SelectTrigger className="h-8">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="__first__">First Step (default)</SelectItem>
                                                {steps.map((s, idx) => (
                                                  <SelectItem key={idx} value={s.id || `temp-${idx}`} disabled={!s.id}>
                                                    Step {s.step_number}: {s.step_name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                              When applicant resubmits, workflow will restart from this step.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-3 p-3 bg-background rounded-md border">
                                      <Label className="text-sm font-medium">Action Notification</Label>
                                      <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Type</Label>
                                          <Select
                                            value={action.notification_type || '__none__'}
                                            onValueChange={(value) => updateAction(stepIndex, actionIndex, 'notification_type', value === '__none__' ? '' : value)}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">None</SelectItem>
                                              {NOTIFICATION_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Module</Label>
                                          <Select
                                            value={action.notification_module_id || '__none__'}
                                            onValueChange={(value) => updateAction(stepIndex, actionIndex, 'notification_module_id', value === '__none__' ? null : value)}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Select module" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">None</SelectItem>
                                              {parentModules?.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Template</Label>
                                          <Select
                                            value={action.notification_template_id || '__none__'}
                                            onValueChange={(value) => updateAction(stepIndex, actionIndex, 'notification_template_id', value === '__none__' ? null : value)}
                                          >
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Select template" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="__none__">None</SelectItem>
                                              {templates?.filter(t => !action.notification_module_id || t.module_id === action.notification_module_id).map((t) => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Notification sent when this action is executed.
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeAction(stepIndex, actionIndex)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {step.actions.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground text-sm border rounded-md border-dashed">
                              No actions defined. Click "Add Action" to create step actions.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                      </div>
                    </div>
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
