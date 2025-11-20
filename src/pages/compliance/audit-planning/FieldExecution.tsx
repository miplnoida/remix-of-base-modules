import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MapPin,
  Clock,
  Camera,
  FileText,
  CheckCircle,
  PlayCircle,
  StopCircle,
  Upload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  WeeklyAuditPlan,
  PlannedVisit,
  VisitExecutionStatus,
  GPSLocation
} from '@/types/weeklyAuditPlan';
import { weeklyAuditPlanService } from '@/services/weeklyAuditPlanService';

export default function FieldExecution() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<WeeklyAuditPlan[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<PlannedVisit | null>(null);
  const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [findings, setFindings] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApprovedPlans();
    requestGPSPermission();
  }, []);

  const loadApprovedPlans = async () => {
    try {
      const data = await weeklyAuditPlanService.getAll({
        inspectorId: 'inspector-001' // Would come from auth
      });
      setPlans(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load plans',
        variant: 'destructive'
      });
    }
  };

  const requestGPSPermission = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          toast({
            title: 'GPS Error',
            description: 'Unable to get GPS location. Please enable location services.',
            variant: 'destructive'
          });
        }
      );
    }
  };

  const handleCheckIn = async (visit: PlannedVisit) => {
    if (!gpsLocation) {
      toast({
        title: 'GPS Required',
        description: 'GPS location is required for check-in',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await weeklyAuditPlanService.updateVisitExecution({
        visitId: visit.id,
        checkInTime: new Date().toISOString(),
        checkInGPS: gpsLocation,
        executionStatus: VisitExecutionStatus.IN_PROGRESS
      });

      toast({
        title: 'Checked In',
        description: `Checked in at ${visit.employerName}`
      });

      setSelectedVisit(visit);
      await loadApprovedPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check in',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedVisit || !gpsLocation) return;

    setLoading(true);
    try {
      await weeklyAuditPlanService.updateVisitExecution({
        visitId: selectedVisit.id,
        checkOutTime: new Date().toISOString(),
        checkOutGPS: gpsLocation,
        visitNotes,
        findings,
        executionStatus: VisitExecutionStatus.COMPLETED
      });

      toast({
        title: 'Checked Out',
        description: 'Visit completed successfully'
      });

      setSelectedVisit(null);
      setVisitNotes('');
      setFindings('');
      await loadApprovedPlans();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to check out',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTodayVisits = () => {
    const today = new Date().toISOString().split('T')[0];
    return plans.flatMap(p =>
      p.plannedVisits.filter(v =>
        v.visitDate === today &&
        (v.executionStatus === VisitExecutionStatus.PLANNED ||
         v.executionStatus === VisitExecutionStatus.IN_PROGRESS)
      )
    );
  };

  const todayVisits = getTodayVisits();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Field Execution"
        subtitle="Check-in, conduct visits, and collect evidence"
        breadcrumbs={[
          { label: 'Compliance', href: '/compliance/dashboard' },
          { label: 'Field Operations', href: '/compliance/field-operations' },
          { label: 'Field Execution' }
        ]}
      />

      {/* GPS Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className={gpsLocation ? 'h-5 w-5 text-green-600' : 'h-5 w-5 text-yellow-600'} />
              <span className="font-medium">GPS Status:</span>
              <Badge variant={gpsLocation ? 'default' : 'secondary'}>
                {gpsLocation ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {gpsLocation && (
              <p className="text-sm text-muted-foreground">
                Lat: {gpsLocation.latitude.toFixed(6)}, Lng: {gpsLocation.longitude.toFixed(6)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Visit */}
      {selectedVisit && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-600" />
              Visit In Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Employer</Label>
                <p className="font-medium">{selectedVisit.employerName}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Visit Type</Label>
                <p className="font-medium">{selectedVisit.visitType.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Checked In</Label>
                <p className="font-medium">
                  {selectedVisit.checkInTime ? new Date(selectedVisit.checkInTime).toLocaleTimeString() : '-'}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Duration</Label>
                <p className="font-medium">{selectedVisit.duration.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Visit Notes</Label>
              <Textarea
                placeholder="Enter visit notes, observations, and activities..."
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Findings</Label>
              <Textarea
                placeholder="Document findings, issues, and recommendations..."
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Audit Checklist
              </Button>
            </div>

            <Button onClick={handleCheckOut} disabled={loading} className="w-full" size="lg">
              <StopCircle className="h-4 w-4 mr-2" />
              Check Out & Complete Visit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's Visits */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Scheduled Visits ({todayVisits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayVisits.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No visits scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {todayVisits.map((visit) => (
                <div key={visit.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {visit.plannedStartTime} - {visit.plannedEndTime}
                      </span>
                      <Badge variant={
                        visit.executionStatus === VisitExecutionStatus.IN_PROGRESS ? 'default' :
                        visit.executionStatus === VisitExecutionStatus.COMPLETED ? 'secondary' :
                        'outline'
                      }>
                        {visit.executionStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-medium">{visit.employerName}</p>
                      <p className="text-sm text-muted-foreground">{visit.purpose}</p>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Type: {visit.visitType.replace(/_/g, ' ')}</span>
                      <span>•</span>
                      <span>Duration: {visit.duration.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {visit.executionStatus === VisitExecutionStatus.PLANNED && (
                      <Button
                        onClick={() => handleCheckIn(visit)}
                        disabled={loading || !!selectedVisit}
                        size="sm"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    )}
                    {visit.executionStatus === VisitExecutionStatus.COMPLETED && (
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
