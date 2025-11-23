import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { WeeklyPlanItem, ItemType, InspectionVisitStatus } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { violationService } from '@/services/violationService';
import { violationActionsService } from '@/services/violationActionsService';
import { AddPlanItemDialog } from '@/components/compliance/AddPlanItemDialog';
import { ExecutePlanItemDialog } from '@/components/compliance/ExecutePlanItemDialog';
import { SuggestedActionsPanel } from '@/components/compliance/SuggestedActionsPanel';
import { toast } from 'sonner';

export default function WeeklyPlanBuilder() {
  const [planItems, setPlanItems] = useState<WeeklyPlanItem[]>([]);
  const [activeViolationsCount, setActiveViolationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [executingItem, setExecutingItem] = useState<WeeklyPlanItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [items, activeViolations] = await Promise.all([
        inspectionService.getWeeklyPlanItems('inspector-001'),
        violationService.getActiveByInspectorId('inspector-001')
      ]);
      setPlanItems(items);
      setActiveViolationsCount(activeViolations.length);
    } catch (error) {
      toast.error('Failed to load weekly plan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: InspectionVisitStatus) => {
    switch (status) {
      case InspectionVisitStatus.COMPLETED:
        return 'bg-success/10 text-success';
      case InspectionVisitStatus.IN_PROGRESS:
        return 'bg-warning/10 text-warning';
      case InspectionVisitStatus.ABORTED:
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getItemTypeLabel = (type: ItemType) => {
    return type === ItemType.EMPLOYER_VISIT ? 'Employer Visit' : 'Scouting';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly Plan Builder"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance' },
          { label: 'Violations', href: '/compliance/violations' },
          { label: 'Weekly Plan Builder' }
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeViolationsCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planned This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{planItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {planItems.filter(i => i.status === InspectionVisitStatus.COMPLETED).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Actions Panel */}
      <SuggestedActionsPanel
        inspectorId="inspector-001"
        weekStartDate={new Date().toISOString().split('T')[0]}
        onActionAddedToPlan={loadData}
      />

      {/* Plan Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>This Week's Plan</CardTitle>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : planItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No planned activities yet. Click "Add Activity" to start.
            </div>
          ) : (
            <div className="space-y-4">
              {planItems.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getItemTypeLabel(item.itemType)}</Badge>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="font-medium">
                          {item.itemType === ItemType.EMPLOYER_VISIT
                            ? item.employerName
                            : item.areaName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.plannedDate} {item.plannedStartTime && `• ${item.plannedStartTime} - ${item.plannedEndTime}`}
                        </div>
                        {item.itemType === ItemType.SCOUTING && item.focusNotes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.focusNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {item.status === InspectionVisitStatus.NOT_STARTED && (
                        <Button
                          size="sm"
                          onClick={() => setExecutingItem(item)}
                        >
                          Start
                        </Button>
                      )}
                      {item.status === InspectionVisitStatus.IN_PROGRESS && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExecutingItem(item)}
                        >
                          Continue
                        </Button>
                      )}
                      {item.status === InspectionVisitStatus.COMPLETED && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExecutingItem(item)}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddPlanItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onItemAdded={loadData}
      />

      {executingItem && (
        <ExecutePlanItemDialog
          planItem={executingItem}
          open={!!executingItem}
          onOpenChange={(open) => !open && setExecutingItem(null)}
          onComplete={loadData}
        />
      )}
    </div>
  );
}
