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
          <div className="space-y-4">
            {(() => {
              // Group actions by employer
              const groupedByEmployer = actions.reduce((acc, action) => {
                const key = action.employerId || 'unlinked';
                if (!acc[key]) {
                  acc[key] = {
                    employerId: action.employerId,
                    employerName: action.employerName,
                    territory: action.territory,
                    actions: [],
                    allInPlan: true,
                  };
                }
                acc[key].actions.push(action);
                if (action.status !== ActionStatus.IN_WEEKLY_PLAN) {
                  acc[key].allInPlan = false;
                }
                return acc;
              }, {} as Record<string, { employerId: string | null; employerName: string | null; territory: string | null; actions: ViolationAction[]; allInPlan: boolean }>);

              return Object.values(groupedByEmployer).map((group) => (
                <div
                  key={group.employerId || 'unlinked'}
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Employer Header */}
                  <div className="flex items-start justify-between pb-3 border-b">
                    <div className="space-y-1">
                      {group.employerId ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <span className="font-semibold text-lg">{group.employerName}</span>
                          </div>
                          {group.territory && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground ml-7">
                              <MapPin className="h-3 w-3" />
                              <span>{group.territory}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-5 w-5" />
                          <span className="font-semibold">Unlinked Violations (Scouting)</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground ml-7">
                        {group.actions.length} violation{group.actions.length > 1 ? 's' : ''} requiring follow-up
                      </div>
                    </div>

                    {group.employerId && (
                      <Button
                        size="sm"
                        onClick={() => handleAddToPlan(group.actions[0])}
                        disabled={group.allInPlan}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {group.allInPlan ? 'In Plan' : 'Add to Plan'}
                      </Button>
                    )}
                  </div>

                  {/* Violations List */}
                  <div className="space-y-2 ml-7">
                    {group.actions.map((action) => (
                      <div
                        key={action.id}
                        className="border-l-2 border-muted pl-3 py-2 space-y-2"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs">
                            {action.violationNumber}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{action.actionType}</Badge>
                          <Badge className={`text-xs ${getPriorityColor(action.priority)}`}>
                            {action.priority}
                          </Badge>
                          {action.status === ActionStatus.IN_WEEKLY_PLAN && (
                            <Badge variant="secondary" className="text-xs">In Plan</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-foreground">
                          {action.description}
                        </div>

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
                              <span>Suggested: {format(new Date(action.suggestedWeek), 'PP')}</span>
                            </div>
                          )}
                          <span>By: {action.createdByName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
