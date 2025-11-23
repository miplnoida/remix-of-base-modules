import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Upload } from 'lucide-react';

interface ScoutingViolationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weeklyPlanItemId: string;
  inspectorId: string;
  territory: 'St Kitts' | 'Nevis';
  areaName?: string;
}

interface ViolationFormData {
  businessName: string;
  location: string;
  activityType: string;
  approximateEmployees: number;
  violationType: string;
  observations: string;
  gpsLat?: number;
  gpsLng?: number;
}

export function ScoutingViolationForm({ 
  open, 
  onOpenChange, 
  weeklyPlanItemId, 
  inspectorId, 
  territory,
  areaName 
}: ScoutingViolationFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ViolationFormData>({
    businessName: '',
    location: areaName || '',
    activityType: '',
    approximateEmployees: 1,
    violationType: 'UNREGISTERED_OPERATION',
    observations: '',
  });
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);

  const handleCaptureGPS = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'GPS Not Available',
        description: 'Your device does not support GPS location',
        variant: 'destructive'
      });
      return;
    }

    setIsCapturingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          gpsLat: position.coords.latitude,
          gpsLng: position.coords.longitude
        });
        setIsCapturingGPS(false);
        toast({
          title: 'GPS Captured',
          description: `Location: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        });
      },
      (error) => {
        setIsCapturingGPS(false);
        toast({
          title: 'GPS Error',
          description: 'Failed to capture GPS location',
          variant: 'destructive'
        });
      }
    );
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.businessName || !formData.location || !formData.violationType || !formData.observations) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Create violation record
    const violation = {
      id: `vio-${Date.now()}`,
      weeklyPlanItemId,
      inspectorId,
      territory,
      businessName: formData.businessName,
      location: formData.location,
      activityType: formData.activityType,
      approximateEmployees: formData.approximateEmployees,
      violationType: formData.violationType,
      observations: formData.observations,
      gpsLat: formData.gpsLat,
      gpsLng: formData.gpsLng,
      employerId: null, // Unlinked
      isUnlinked: true,
      status: 'OPEN',
      stage: 'VSTG_NEW_VIOLATION_CREATED',
      createdAt: new Date().toISOString()
    };

    // TODO: Save to backend
    console.log('Creating scouting violation:', violation);

    toast({
      title: 'Violation Recorded',
      description: 'Scouting finding has been recorded successfully'
    });

    // Reset form
    setFormData({
      businessName: '',
      location: areaName || '',
      activityType: '',
      approximateEmployees: 1,
      violationType: 'UNREGISTERED_OPERATION',
      observations: '',
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Scouting Finding</DialogTitle>
          <DialogDescription>
            Document a violation discovered during area scouting. This will create an unlinked violation that can later be connected to an employer once registered.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Territory: {territory}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Inspector: {inspectorId} • Plan Item: {weeklyPlanItemId}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Business Name / Description *</Label>
              <Input
                placeholder="e.g., Construction site, Restaurant, Retail store"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Location / Address *</Label>
              <Textarea
                placeholder="Detailed location description, address, or landmarks"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select
                value={formData.activityType}
                onValueChange={(value) => setFormData({ ...formData, activityType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSTRUCTION">Construction</SelectItem>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="RESTAURANT">Restaurant / Food Service</SelectItem>
                  <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                  <SelectItem value="SERVICES">Professional Services</SelectItem>
                  <SelectItem value="HOSPITALITY">Hospitality / Tourism</SelectItem>
                  <SelectItem value="AGRICULTURE">Agriculture</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Approximate # of Employees</Label>
              <Input
                type="number"
                min="1"
                value={formData.approximateEmployees}
                onChange={(e) => setFormData({ ...formData, approximateEmployees: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Violation Type *</Label>
              <Select
                value={formData.violationType}
                onValueChange={(value) => setFormData({ ...formData, violationType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNREGISTERED_OPERATION">Operating with employees but not registered</SelectItem>
                  <SelectItem value="UNREPORTED_EMPLOYEES">Employing unreported workers</SelectItem>
                  <SelectItem value="NON_NATIONALS_NO_PERMIT">Non-nationals working without permit</SelectItem>
                  <SelectItem value="FALSE_DECLARATIONS">Suspected false declarations</SelectItem>
                  <SelectItem value="UNREGISTERED_ACTIVITY">Unregistered business activity</SelectItem>
                  <SelectItem value="OTHER">Other violation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Observations / Notes *</Label>
              <Textarea
                placeholder="Detailed observations, what you saw, estimated workforce, evidence of employment, etc."
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={4}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>GPS Location</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCaptureGPS}
                  disabled={isCapturingGPS}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isCapturingGPS ? 'Capturing...' : formData.gpsLat ? 'GPS Captured ✓' : 'Capture GPS Location'}
                </Button>
              </div>
              {formData.gpsLat && formData.gpsLng && (
                <p className="text-xs text-muted-foreground">
                  Location: {formData.gpsLat.toFixed(6)}, {formData.gpsLng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Record Violation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
