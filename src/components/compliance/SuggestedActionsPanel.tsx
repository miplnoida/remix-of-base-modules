import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { ViolationAction, ActionStatus } from '@/types/violationActions';
import { violationActionsService } from '@/services/violationActionsService';
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
  const [actions, setActions] = useState<ViolationAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActions();
  }, [inspectorId, weekStartDate]);

  const loadActions = async () => {
    try {
      setLoading(true);
      const suggestedActions = await violationActionsService.getAllPendingForInspector(
        inspectorId,
        weekStartDate,
        'this-week'
      );
      setActions(suggestedActions);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPlan = async (action: ViolationAction) => {
    try {
      // In real implementation, create WeeklyPlanItem from action
      await violationActionsService.update(action.id, {
        status: ActionStatus.IN_WEEKLY_PLAN,
        linkedWeeklyPlanItemId: `wpi-${Date.now()}`
      });
      
      toast.success('Action added to weekly plan');
      loadActions();
      onActionAddedToPlan();
    } catch (error) {
      toast.error('Failed to add action to plan');
      console.error(error);
    }
  };

  if (loading || actions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Follow-up Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.id}
              className="flex items-start justify-between p-3 border rounded-lg"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{action.violationNumber}</span>
                  {action.employerName && (
                    <span className="text-sm text-muted-foreground">• {action.employerName}</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {action.actionType}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {action.description}
                </div>
                {action.dueDate && (
                  <div className="text-xs text-muted-foreground">
                    Due: {action.dueDate}
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddToPlan(action)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add to Plan
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
