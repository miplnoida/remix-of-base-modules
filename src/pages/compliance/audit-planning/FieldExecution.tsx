import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, PlayCircle, CheckCircle } from 'lucide-react';
import { WeeklyPlanItem, InspectionVisitStatus, ItemType } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { violationService } from '@/services/violationService';
import { ExecutePlanItemDialog } from '@/components/compliance/ExecutePlanItemDialog';
import { toast } from 'sonner';

export default function FieldExecution() {
  const [planItems, setPlanItems] = useState<WeeklyPlanItem[]>([]);
  const [activeViolationsCount, setActiveViolationsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [executingItem, setExecutingItem] = useState<WeeklyPlanItem | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadData();
    requestGPSPermission();
  }, []);

  const requestGPSPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          toast.error('Unable to get GPS location. Some features may be limited.');
        }
      );
    }
  };

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
      toast.error('Failed to load field execution data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getTodayVisits = () => {
    const today = new Date().toISOString().split('T')[0];
    return planItems.filter(item => 
      item.plannedDate === today &&
      (item.status === InspectionVisitStatus.NOT_STARTED || 
       item.status === InspectionVisitStatus.IN_PROGRESS)
    );
  };

  const getStatusColor = (status: InspectionVisitStatus) => {
    switch (status) {
      case InspectionVisitStatus.COMPLETED:
        return 'bg-success/10 text-success';
      case InspectionVisitStatus.IN_PROGRESS:
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getItemTypeLabel = (type: ItemType) => {
    return type === ItemType.EMPLOYER_VISIT ? 'Employer Visit' : 'Scouting';
  };

  const todayVisits = getTodayVisits();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Execution"
        subtitle="Check-in, conduct visits, collect evidence, and record findings"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Weekly Audit Planning', href: '/compliance/audit-planning/my-plans' },
          { label: 'Field Execution' }
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
              Today's Visits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayVisits.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              GPS Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MapPin className={gpsLocation ? 'h-5 w-5 text-success' : 'h-5 w-5 text-warning'} />
              <Badge variant={gpsLocation ? 'default' : 'secondary'}>
                {gpsLocation ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {gpsLocation && (
              <p className="text-xs text-muted-foreground mt-1">
                {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Visits */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Scheduled Visits</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : todayVisits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No visits scheduled for today
            </div>
          ) : (
            <div className="space-y-4">
              {todayVisits.map((item) => (
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
                          {item.plannedStartTime && (
                            <>
                              <Clock className="inline h-3 w-3 mr-1" />
                              {item.plannedStartTime} - {item.plannedEndTime}
                            </>
                          )}
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
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Start Visit
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
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All This Week's Visits */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Schedule ({planItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {planItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{getItemTypeLabel(item.itemType)}</Badge>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="font-medium">
                    {item.itemType === ItemType.EMPLOYER_VISIT
                      ? item.employerName
                      : item.areaName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.plannedDate}
                    {item.plannedStartTime && ` • ${item.plannedStartTime} - ${item.plannedEndTime}`}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExecutingItem(item)}
                >
                  {item.status === InspectionVisitStatus.COMPLETED ? 'View' : 'Execute'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
