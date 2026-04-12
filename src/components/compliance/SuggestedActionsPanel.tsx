import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2 } from 'lucide-react';
import { ActionStatus, ACTION_TYPE_LABELS, ActionType } from '@/types/violationActions';
import { violationActionsService } from '@/services/violationActionsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SuggestedActionsPanelProps {
  inspectorId: string;
  weekStartDate: string;
  onActionAddedToPlan: () => void;
}

export function SuggestedActionsPanel({
  inspectorId,
  weekStartDate,
  onActionAddedToPlan
}: SuggestedActionsPanelProps) {
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['ce_follow_up_suggested', inspectorId, weekStartDate],
    queryFn: () => violationActionsService.getAllPendingForInspector(inspectorId, weekStartDate, 'this-week'),
    enabled: !!inspectorId && !!weekStartDate,
  });

  const handleAddToPlan = async (actionId: string) => {
    try {
      await violationActionsService.update(actionId, {
        status: ActionStatus.SCHEDULED,
        updated_by: 'CURRENT_USER'
      });
      toast.success('Action added to weekly plan');
      queryClient.invalidateQueries({ queryKey: ['ce_follow_up_suggested'] });
      onActionAddedToPlan();
    } catch {
      toast.error('Failed to add action to plan');
    }
  };

  if (isLoading) return null;
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Follow-up Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <div key={action.id} className="flex items-start justify-between p-3 border rounded-lg">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {action.employer_name && (
                    <span className="text-sm text-muted-foreground">{action.employer_name}</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {ACTION_TYPE_LABELS[action.action_type as ActionType] || action.action_type}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{action.description}</div>
                {action.due_date && (
                  <div className="text-xs text-muted-foreground">Due: {action.due_date}</div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={() => handleAddToPlan(action.id)}>
                <Plus className="h-3 w-3 mr-1" /> Add to Plan
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
