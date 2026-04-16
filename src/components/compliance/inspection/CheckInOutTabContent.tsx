import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { WeeklyPlanItem, InspectionVisit, InspectionVisitStatus } from '@/types/inspectionTypes';
import { inspectionService } from '@/services/inspectionService';
import { toast } from 'sonner';

interface CheckInOutTabContentProps {
  planItem: WeeklyPlanItem;
  visit: InspectionVisit | null;
  onVisitUpdate: (visit: InspectionVisit) => void;
}

export function CheckInOutTabContent({ planItem, visit, onVisitUpdate }: CheckInOutTabContentProps) {
  const [checkInLocation, setCheckInLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      const newVisit = await inspectionService.checkIn(planItem.id, {
        location: checkInLocation
      });
      onVisitUpdate(newVisit);
      toast.success('Checked in successfully');
      setCheckInLocation('');
    } catch (error) {
      toast.error('Failed to check in');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!visit) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-sm text-muted-foreground mb-4">
          Start this visit by checking in. Once checked in, you can proceed to record employer interaction, working papers, evidence, and findings.
        </div>

        <div className="space-y-2">
          <Label>Location (Optional)</Label>
          <Input
            value={checkInLocation}
            onChange={(e) => setCheckInLocation(e.target.value)}
            placeholder="Enter location or GPS coordinates"
          />
        </div>

        <Button onClick={handleCheckIn} disabled={loading}>
          {loading ? 'Checking in...' : 'Check In'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Check-in Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Check-in Details</h3>
          <Badge variant="outline" className="bg-success/10 text-success">
            Checked In
          </Badge>
          {visit.visitStatus === InspectionVisitStatus.COMPLETED && (
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Completed
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {visit.checkInTime && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{new Date(visit.checkInTime).toLocaleString()}</span>
            </div>
          )}
          {visit.checkInLocation && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{visit.checkInLocation}</span>
            </div>
          )}
        </div>
      </div>

      {visit.visitStatus === InspectionVisitStatus.IN_PROGRESS && (
        <div className="p-4 rounded-lg bg-accent/50 border text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Visit in progress</p>
          <p>Complete the Employer Interaction, Working Papers, Evidence, and Findings tabs, then use the <strong>Check-out</strong> tab to close this visit.</p>
        </div>
      )}

      {/* Check-out summary if completed */}
      {visit.visitStatus === InspectionVisitStatus.COMPLETED && visit.checkOutTime && (
        <div className="space-y-3 pt-4 border-t">
          <h3 className="font-medium">Check-out Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{new Date(visit.checkOutTime).toLocaleString()}</span>
            </div>
            {visit.checkOutLocation && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{visit.checkOutLocation}</span>
              </div>
            )}
            {visit.notes && (
              <div className="mt-3">
                <div className="text-xs font-medium text-muted-foreground mb-1">Visit Summary:</div>
                <div className="text-sm whitespace-pre-wrap">{visit.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
