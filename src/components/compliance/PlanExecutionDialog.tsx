import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Calendar,
  Building2,
  Navigation
} from 'lucide-react';
import { PlannedVisit, VisitExecutionStatus } from '@/types/weeklyAuditPlan';
import { useToast } from '@/hooks/use-toast';

interface PlanExecutionDialogProps {
  visits: PlannedVisit[];
  planNumber: string;
  weekPeriod: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function PlanExecutionDialog({ 
  visits, 
  planNumber, 
  weekPeriod, 
  onClose, 
  onRefresh 
}: PlanExecutionDialogProps) {
  const { toast } = useToast();
  const [selectedVisit, setSelectedVisit] = useState<PlannedVisit | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  };

  const handleCheckIn = async (visit: PlannedVisit) => {
    setGettingLocation(true);
    try {
      const position = await getCurrentLocation();
      const now = new Date();
      const checkInTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      toast({
        title: 'Checked In',
        description: `Checked in at ${checkInTime} for ${visit.employerName || visit.areaName}`,
      });

      // Update visit status
      visit.executionStatus = VisitExecutionStatus.IN_PROGRESS;
      visit.checkInTime = checkInTime;
      visit.checkInGPSLat = position.coords.latitude;
      visit.checkInGPSLng = position.coords.longitude;

      onRefresh();
    } catch (error) {
      toast({
        title: 'Check-In Failed',
        description: 'Unable to get location. Please enable location services.',
        variant: 'destructive'
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCheckOut = async (visit: PlannedVisit) => {
    setGettingLocation(true);
    try {
      const position = await getCurrentLocation();
      const now = new Date();
      const checkOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      toast({
        title: 'Checked Out',
        description: `Checked out at ${checkOutTime}`,
      });

      // Update visit status
      visit.executionStatus = VisitExecutionStatus.COMPLETED;
      visit.checkOutTime = checkOutTime;
      visit.checkOutGPSLat = position.coords.latitude;
      visit.checkOutGPSLng = position.coords.longitude;
      visit.visitNotes = checkOutNotes;

      onRefresh();
      setSelectedVisit(null);
      setCheckOutNotes('');
    } catch (error) {
      toast({
        title: 'Check-Out Failed',
        description: 'Unable to get location. Please enable location services.',
        variant: 'destructive'
      });
    } finally {
      setGettingLocation(false);
    }
  };

  const getStatusBadge = (status: VisitExecutionStatus) => {
    const configs = {
      [VisitExecutionStatus.PLANNED]: { color: 'bg-gray-100 text-gray-800', label: 'Planned' },
      [VisitExecutionStatus.IN_PROGRESS]: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      [VisitExecutionStatus.COMPLETED]: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      [VisitExecutionStatus.RESCHEDULED]: { color: 'bg-yellow-100 text-yellow-800', label: 'Rescheduled' },
      [VisitExecutionStatus.CANCELLED]: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };
    const config = configs[status];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const completedVisits = visits.filter(v => v.executionStatus === VisitExecutionStatus.COMPLETED).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Execute Plan: {planNumber}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Week: {weekPeriod} • Progress: {completedVisits} / {visits.length} visits completed
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-bold">{completedVisits}/{visits.length}</div>
                  <div className="text-sm text-muted-foreground">Visits Completed</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-600">
                    {Math.round((completedVisits / visits.length) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visits List */}
          <div className="space-y-3">
            {visits.map((visit) => (
              <Card key={visit.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {visit.itemType === 'EMPLOYER_VISIT' ? (
                          <Building2 className="h-5 w-5 text-primary" />
                        ) : (
                          <MapPin className="h-5 w-5 text-primary" />
                        )}
                        <h3 className="font-semibold text-lg">
                          {visit.employerName || visit.areaName}
                        </h3>
                        {getStatusBadge(visit.executionStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{visit.dayOfWeek}, {visit.visitDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{visit.duration}</span>
                        </div>
                      </div>

                      {visit.checkInTime && (
                        <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-900">
                            Checked in at {visit.checkInTime}
                          </span>
                        </div>
                      )}

                      {visit.checkOutTime && (
                        <div className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-900">
                            Checked out at {visit.checkOutTime}
                          </span>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        <strong>Purpose:</strong> {visit.purpose}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {visit.executionStatus === VisitExecutionStatus.PLANNED && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(visit)}
                          disabled={gettingLocation}
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          {gettingLocation ? 'Getting Location...' : 'Check In'}
                        </Button>
                      )}

                      {visit.executionStatus === VisitExecutionStatus.IN_PROGRESS && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVisit(visit)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Check Out
                        </Button>
                      )}

                      {visit.executionStatus === VisitExecutionStatus.COMPLETED && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Check-Out Dialog */}
        {selectedVisit && (
          <Dialog open={!!selectedVisit} onOpenChange={() => setSelectedVisit(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Check Out</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Visit</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedVisit.employerName || selectedVisit.areaName}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Check-In Time</Label>
                  <div className="text-sm text-muted-foreground">
                    {selectedVisit.checkInTime}
                  </div>
                </div>

                <div>
                  <Label htmlFor="checkOutNotes">Visit Notes</Label>
                  <Textarea
                    id="checkOutNotes"
                    value={checkOutNotes}
                    onChange={(e) => setCheckOutNotes(e.target.value)}
                    placeholder="Enter any observations, findings, or notes from the visit..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedVisit(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleCheckOut(selectedVisit)}
                    disabled={gettingLocation}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {gettingLocation ? 'Checking Out...' : 'Confirm Check Out'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
