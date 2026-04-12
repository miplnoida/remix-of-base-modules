import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, AlertCircle, Calendar, Building2, MapPin, Loader2 } from 'lucide-react';
import { FollowUpAction, ActionStatus, ACTION_TYPE_LABELS, ActionType } from '@/types/violationActions';
import { violationActionsService } from '@/services/violationActionsService';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface PendingFollowUpActionsProps {
  inspectorId: string;
  weekStartDate: string;
  onAddToPlan: (action: FollowUpAction) => void;
}

type FilterType = 'this-week' | 'past-due' | 'all-pending';

export function PendingFollowUpActions({
  inspectorId,
  weekStartDate,
  onAddToPlan
}: PendingFollowUpActionsProps) {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterType>('this-week');

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['ce_follow_up_pending', inspectorId, weekStartDate, activeFilter],
    queryFn: () => violationActionsService.getAllPendingForInspector(inspectorId, weekStartDate, activeFilter),
    enabled: !!inspectorId && !!weekStartDate,
  });

  const handleAddToPlan = (action: FollowUpAction) => {
    onAddToPlan(action);
    toast({ title: 'Added to Plan', description: 'Action has been added to your weekly plan' });
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'URGENT') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'HIGH') return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Group by employer
  const grouped = actions.reduce((acc, action) => {
    const key = action.employer_id || 'unlinked';
    if (!acc[key]) {
      acc[key] = { employer_id: action.employer_id, employer_name: action.employer_name, actions: [] };
    }
    acc[key].actions.push(action);
    return acc;
  }, {} as Record<string, { employer_id?: string | null; employer_name?: string | null; actions: FollowUpAction[] }>);

  if (!weekStartDate) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          Pending Follow-up Actions
        </CardTitle>
        <p className="text-sm text-muted-foreground">Open follow-up actions assigned to you</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="this-week">This Week</TabsTrigger>
            <TabsTrigger value="past-due">Past Due</TabsTrigger>
            <TabsTrigger value="all-pending">All Pending</TabsTrigger>
          </TabsList>

          <TabsContent value={activeFilter} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No pending actions for this filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(grouped).map((group) => (
                  <div key={group.employer_id || 'unlinked'} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between pb-3 border-b">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-lg">{group.employer_name || 'Unlinked'}</span>
                        </div>
                        <div className="text-xs text-muted-foreground ml-7">
                          {group.actions.length} action{group.actions.length > 1 ? 's' : ''} pending
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleAddToPlan(group.actions[0])}>
                        <Plus className="h-4 w-4 mr-1" /> Add to Plan
                      </Button>
                    </div>

                    <div className="space-y-2 ml-7">
                      {group.actions.map((action) => (
                        <div key={action.id} className="border-l-2 border-muted pl-3 py-2 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {ACTION_TYPE_LABELS[action.action_type as ActionType] || action.action_type}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(action.priority)}`}>
                              {action.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-foreground">{action.description}</div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {action.due_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Due: {format(new Date(action.due_date), 'PP')}</span>
                              </div>
                            )}
                            <span>Source: {action.source}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
