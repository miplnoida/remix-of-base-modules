import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle, Calendar, Building2, MapPin } from 'lucide-react';
import { ViolationAction, ActionType, ActionStatus } from '@/types/violationActions';
import { violationActionsService } from '@/services/violationActionsService';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SuggestedFollowUpActionsProps {
  inspectorId: string;
  weekStartDate: string;
  onAddToPlan: (action: ViolationAction) => void;
}

export function SuggestedFollowUpActions({ 
  inspectorId, 
  weekStartDate,
  onAddToPlan
}: SuggestedFollowUpActionsProps) {
  const { toast } = useToast();
  const [actions, setActions] = useState<ViolationAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSuggestedActions();
  }, [inspectorId, weekStartDate]);

  const loadSuggestedActions = async () => {
    if (!weekStartDate) return;
    
    setIsLoading(true);
    try {
      const data = await violationActionsService.getSuggestedForInspector(
        inspectorId,
        weekStartDate
      );
      setActions(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load suggested actions',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlan = (action: ViolationAction) => {
    onAddToPlan(action);
    toast({
      title: 'Added to Plan',
      description: 'Action has been added to your weekly plan'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!weekStartDate) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Suggested Follow-up Actions for This Week
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Open violation actions assigned to you that are due this week or have suggested completion dates
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading suggested actions...</div>
        ) : actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No follow-up actions suggested for this week</p>
            <p className="text-xs mt-1">Actions will appear here when violations have planned follow-ups</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => (
              <div
                key={action.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {action.violationNumber}
                      </Badge>
                      <Badge variant="outline">{action.actionType}</Badge>
                      <Badge className={getPriorityColor(action.priority)}>
                        {action.priority}
                      </Badge>
                      {action.status === ActionStatus.IN_WEEKLY_PLAN && (
                        <Badge variant="secondary">In Plan</Badge>
                      )}
                    </div>
                    
                    {/* Employer Info */}
                    {action.employerId ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{action.employerName}</span>
                        {action.territory && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{action.territory}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>Unlinked Violation (Scouting)</span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleAddToPlan(action)}
                    disabled={action.status === ActionStatus.IN_WEEKLY_PLAN}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {action.status === ActionStatus.IN_WEEKLY_PLAN ? 'In Plan' : 'Add to Plan'}
                  </Button>
                </div>

                {/* Description */}
                <div className="text-sm">
                  <p className="text-foreground">{action.description}</p>
                </div>

                {/* Due Date Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {action.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Due: {format(new Date(action.dueDate), 'PP')}</span>
                    </div>
                  )}
                  {action.suggestedWeek && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Suggested Week: {format(new Date(action.suggestedWeek), 'PP')}</span>
                    </div>
                  )}
                  <span>Created by: {action.createdByName}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
