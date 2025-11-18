import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, User, AlertCircle, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuditActivity } from '@/types/audit';
import { departments } from '@/data/auditData';

interface ActivityRescheduleDialogProps {
  activity: AuditActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityRescheduleDialog({ activity, open, onOpenChange }: ActivityRescheduleDialogProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [newStartDate, setNewStartDate] = React.useState('');
  const [newStartTime, setNewStartTime] = React.useState('');
  const [newEndDate, setNewEndDate] = React.useState('');
  const [newEndTime, setNewEndTime] = React.useState('');
  const [reason, setReason] = React.useState('');

  if (!activity) return null;

  const department = departments.find(d => d.id === activity.departmentId);

  const handleReschedule = () => {
    if (!newStartDate || !newStartTime || !newEndDate || !newEndTime || !reason) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Activity Rescheduled",
      description: `${activity.title} has been rescheduled successfully.`
    });
    
    // Reset form
    setNewStartDate('');
    setNewStartTime('');
    setNewEndDate('');
    setNewEndTime('');
    setReason('');
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Low': 'bg-green-500',
      'Medium': 'bg-orange-600',
      'High': 'bg-red-500'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'Planned': 'bg-blue-500',
      'Scheduled': 'bg-cyan-500',
      'In Progress': 'bg-orange-600',
      'Completed': 'bg-green-500',
      'Cancelled': 'bg-red-500',
      'Rescheduled': 'bg-purple-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Activity Details */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{activity.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              </div>
              <div className="flex gap-2">
                <Badge className={getStatusColor(activity.status)}>{activity.status}</Badge>
                <Badge className={getPriorityColor(activity.priority)}>{activity.priority}</Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Auditor</div>
                  <div className="text-muted-foreground">{activity.auditorName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Location</div>
                  <div className="text-muted-foreground">{activity.location}</div>
                </div>
              </div>
              {department && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Department</div>
                    <div className="text-muted-foreground">{department.name}</div>
                  </div>
                </div>
              )}
              {activity.functionArea && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Function Area</div>
                    <div className="text-muted-foreground">{activity.functionArea}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="font-medium text-sm">Activity Type</div>
              <Badge variant="outline">{activity.type}</Badge>
              <Badge variant="outline" className="ml-2">{activity.controlArea}</Badge>
            </div>
          </div>

          {/* Previous Schedule */}
          <div className="space-y-3 p-4 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <h4 className="font-semibold">Previous Schedule</h4>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">Start Date & Time</div>
                <div className="mt-1">
                  {new Date(activity.startDate).toLocaleDateString()} at{' '}
                  {new Date(activity.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">End Date & Time</div>
                <div className="mt-1">
                  {new Date(activity.endDate).toLocaleDateString()} at{' '}
                  {new Date(activity.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* New Schedule */}
          <div className="space-y-4 p-4 border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <h4 className="font-semibold">New Schedule *</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newStartDate">New Start Date *</Label>
                <Input
                  id="newStartDate"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newStartTime">New Start Time *</Label>
                <Input
                  id="newStartTime"
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newEndDate">New End Date *</Label>
                <Input
                  id="newEndDate"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newEndTime">New End Time *</Label>
                <Input
                  id="newEndTime"
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Reason for Rescheduling */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Rescheduling *</Label>
            <Textarea
              id="reason"
              placeholder="Explain why this activity needs to be rescheduled..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule}>
              <History className="h-4 w-4 mr-2" />
              Reschedule Activity
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
