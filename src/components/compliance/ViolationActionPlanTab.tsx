import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, User, AlertCircle, Loader2, CheckCircle2, XCircle, Play } from 'lucide-react';
import { ActionType, ActionPriority, ActionStatus, ACTION_TYPE_LABELS } from '@/types/violationActions';
import { violationActionsService } from '@/services/violationActionsService';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface ViolationActionPlanTabProps {
  violationId: string;
  employerId?: string;
  employerName?: string;
}

export function ViolationActionPlanTab({ violationId, employerId, employerName }: ViolationActionPlanTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionType, setActionType] = useState<string>(ActionType.CALL);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<string>(ActionPriority.NORMAL);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryKey = ['ce_follow_up_actions', violationId];

  const { data: actions = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => violationActionsService.getByViolationId(violationId),
    enabled: !!violationId,
  });

  const handleCreateAction = async () => {
    if (!description.trim()) {
      toast({ title: 'Required', description: 'Please enter an action description', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await violationActionsService.create({
        violation_id: violationId,
        employer_id: employerId,
        employer_name: employerName,
        action_type: actionType,
        description,
        priority,
        due_date: dueDate || undefined,
        source: 'MANUAL',
        created_by: 'CURRENT_USER'
      });

      toast({ title: 'Success', description: 'Follow-up action created' });
      setActionType(ActionType.CALL);
      setDescription('');
      setDueDate('');
      setPriority(ActionPriority.NORMAL);
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey });
    } catch (error: any) {
      const isDedupe = error?.message?.includes('duplicate') || error?.code === '23505';
      toast({
        title: isDedupe ? 'Duplicate Action' : 'Error',
        description: isDedupe
          ? 'An active follow-up of this type already exists for this violation.'
          : 'Failed to create action',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    try {
      const update: any = { status: newStatus, updated_by: 'CURRENT_USER' };
      if (newStatus === ActionStatus.COMPLETED) {
        update.completed_at = new Date().toISOString();
        update.completed_by = 'CURRENT_USER';
      }
      await violationActionsService.update(actionId, update);
      toast({ title: 'Updated', description: `Status changed to ${newStatus}` });
      queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string; label: string }> = {
      PLANNED: { variant: 'outline', label: 'Planned' },
      SCHEDULED: { variant: 'secondary', label: 'Scheduled' },
      IN_PROGRESS: { variant: 'default', className: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      COMPLETED: { variant: 'default', className: 'bg-green-100 text-green-800', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      OVERDUE: { variant: 'destructive', label: 'Overdue' },
    };
    const s = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={s.variant} className={s.className}>{s.label}</Badge>;
  };

  const getPriorityBadge = (p: string) => {
    if (p === 'URGENT') return <Badge variant="destructive">Urgent</Badge>;
    if (p === 'HIGH') return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
    return <Badge variant="outline">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Follow-up Actions
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
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_TYPE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority *</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea placeholder="Describe the follow-up action..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button onClick={handleCreateAction} disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Action'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle>All Follow-up Actions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No follow-up actions yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action) => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <Badge variant="outline">{ACTION_TYPE_LABELS[action.action_type as ActionType] || action.action_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm">{action.description}</p>
                      {action.outcome && <p className="text-xs text-muted-foreground mt-1">Outcome: {action.outcome}</p>}
                    </TableCell>
                    <TableCell>
                      {action.due_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(action.due_date), 'PP')}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getPriorityBadge(action.priority)}</TableCell>
                    <TableCell>{getStatusBadge(action.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{action.source}</span>
                    </TableCell>
                    <TableCell>
                      {!['COMPLETED', 'CANCELLED'].includes(action.status) && (
                        <div className="flex gap-1">
                          {action.status === ActionStatus.PLANNED && (
                            <Button size="sm" variant="ghost" title="Start" onClick={() => handleStatusChange(action.id, ActionStatus.IN_PROGRESS)}>
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" title="Complete" onClick={() => handleStatusChange(action.id, ActionStatus.COMPLETED)}>
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Cancel" onClick={() => handleStatusChange(action.id, ActionStatus.CANCELLED)}>
                            <XCircle className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      )}
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
