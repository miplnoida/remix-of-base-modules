import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [checkOutLocation, setCheckOutLocation] = useState('');
  const [notes, setNotes] = useState('');
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

  const handleCheckOut = async () => {
    if (!visit) return;

    try {
      setLoading(true);
      const updatedVisit = await inspectionService.checkOut(visit.id, {
        location: checkOutLocation,
        notes
      });
      onVisitUpdate(updatedVisit);
      toast.success('Checked out successfully');
    } catch (error) {
      toast.error('Failed to check out');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!visit) {
    return (
      <div className="space-y-4 py-4">
        <div className="text-sm text-muted-foreground mb-4">
          Start this visit by checking in
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
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{new Date(visit.checkInTime!).toLocaleString()}</span>
          </div>
          {visit.checkInLocation && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{visit.checkInLocation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Check-out Section */}
      {visit.visitStatus === InspectionVisitStatus.IN_PROGRESS && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Check Out</h3>

          <div className="space-y-2">
            <Label>Location (Optional)</Label>
            <Input
              value={checkOutLocation}
              onChange={(e) => setCheckOutLocation(e.target.value)}
              placeholder="Enter location"
            />
          </div>

          <div className="space-y-2">
            <Label>Visit Summary</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter visit summary and key observations..."
              rows={4}
            />
          </div>

          <Button onClick={handleCheckOut} disabled={loading}>
            {loading ? 'Checking out...' : 'Check Out & Complete Visit'}
          </Button>
        </div>
      )}

      {/* Check-out Info */}
      {visit.visitStatus === InspectionVisitStatus.COMPLETED && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Check-out Details</h3>
            <Badge variant="outline" className="bg-success/10 text-success">
              Completed
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{new Date(visit.checkOutTime!).toLocaleString()}</span>
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
                <div className="text-sm">{visit.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
