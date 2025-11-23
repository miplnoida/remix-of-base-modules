import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle, Calendar, User, AlertCircle } from 'lucide-react';
import { ViolationAction, ActionType, ActionPriority, ActionStatus } from '@/types/violationActions';
import { violationActionsService } from '@/services/violationActionsService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ViolationActionPlanTabProps {
  violationId: string;
}

export function ViolationActionPlanTab({ violationId }: ViolationActionPlanTabProps) {
  const { toast } = useToast();
  const [actions, setActions] = useState<ViolationAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [actionType, setActionType] = useState<ActionType>(ActionType.CALL);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [suggestedWeek, setSuggestedWeek] = useState('');
  const [priority, setPriority] = useState<ActionPriority>(ActionPriority.NORMAL);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadActions();
  }, [violationId]);

  const loadActions = async () => {
    setIsLoading(true);
    try {
      const data = await violationActionsService.getByViolationId(violationId);
      setActions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load action plan',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAction = async () => {
    if (!description.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter an action description',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await violationActionsService.create({
        violationId,
        assignedToUserId: 'current-user',
        actionType,
        description,
        dueDate: dueDate || undefined,
        suggestedWeek: suggestedWeek || undefined,
        priority
      });

      toast({
        title: 'Success',
        description: 'Action added to plan'
      });

      // Reset form
      setActionType(ActionType.CALL);
      setDescription('');
      setDueDate('');
      setSuggestedWeek('');
      setPriority(ActionPriority.NORMAL);
      setShowAddForm(false);
      
      loadActions();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create action',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: ActionStatus) => {
    switch (status) {
      case ActionStatus.PLANNED:
        return <Badge variant="outline">Planned</Badge>;
      case ActionStatus.IN_WEEKLY_PLAN:
        return <Badge variant="secondary">In Weekly Plan</Badge>;
      case ActionStatus.COMPLETED:
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case ActionStatus.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: ActionPriority) => {
    switch (priority) {
      case ActionPriority.URGENT:
        return <Badge variant="destructive">Urgent</Badge>;
      case ActionPriority.HIGH:
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case ActionPriority.NORMAL:
        return <Badge variant="outline">Normal</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Action Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Follow-up Action Plan
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and track follow-up actions for this violation
              </p>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {showAddForm ? 'Cancel' : 'Add Action'}
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4 border-t pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action Type *</Label>
                <Select value={actionType} onValueChange={(value) => setActionType(value as ActionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ActionType.CALL}>Call</SelectItem>
                    <SelectItem value={ActionType.EMPLOYER_VISIT}>Employer Visit</SelectItem>
                    <SelectItem value={ActionType.LETTER_NOTICE}>Letter/Notice</SelectItem>
                    <SelectItem value={ActionType.DOCUMENT_REQUEST}>Document Request</SelectItem>
                    <SelectItem value={ActionType.CHECK_REGISTRATION}>Check Registration Status</SelectItem>
                    <SelectItem value={ActionType.ESCALATE_LEGAL}>Escalate to Legal</SelectItem>
                    <SelectItem value={ActionType.FOLLOW_UP_PAYMENT}>Follow-up Payment</SelectItem>
                    <SelectItem value={ActionType.INSPECTION}>Inspection</SelectItem>
                    <SelectItem value={ActionType.OTHER}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as ActionPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ActionPriority.NORMAL}>Normal</SelectItem>
                    <SelectItem value={ActionPriority.HIGH}>High</SelectItem>
                    <SelectItem value={ActionPriority.URGENT}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the action to be taken..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Suggested Week Start</Label>
                <Input
                  type="date"
                  value={suggestedWeek}
                  onChange={(e) => setSuggestedWeek(e.target.value)}
                  placeholder="Week start date for planning"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAction} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Action'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planned & Completed Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading actions...</div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No actions created yet. Add the first action above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due / Suggested</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <Badge variant="outline">{action.actionType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm">{action.description}</p>
                      {action.linkedWeeklyPlanItemId && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Linked to weekly plan
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {action.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(action.dueDate), 'PP')}
                          </div>
                        )}
                        {action.suggestedWeek && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Week: {format(new Date(action.suggestedWeek), 'PP')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(action.priority)}</TableCell>
                    <TableCell>{getStatusBadge(action.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <User className="h-3 w-3" />
                        {action.assignedToName}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
