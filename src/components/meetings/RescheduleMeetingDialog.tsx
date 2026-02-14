import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, Loader2, RefreshCw, User, AlertTriangle } from 'lucide-react';
import { useRescheduleMeeting } from '@/hooks/useMeetings';
import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDisplayDate, formatDateForStorage } from '@/lib/dateFormat';
import { toast } from 'sonner';
import {
  useMeetingDepartmentsForWorkflow,
  useUsersForOfficeDepartment,
  useUserMeetingsForDate,
  useCheckMeetingOverlap,
  useValidateOfficeHours,
} from '@/hooks/useWorkflowMeetingDepartments';

interface RescheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  meetingReference: string;
  currentDate?: string;
  currentTime?: string;
  workflowId?: string;
  onSuccess?: () => void;
}

// Convert 24h time to 12h format
function to12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

// Generate time slots in 30-min intervals
function generateTimeSlots(startTime?: string, endTime?: string): string[] {
  const start = startTime ? startTime.split(':').map(Number) : [8, 0];
  const end = endTime ? endTime.split(':').map(Number) : [16, 0];
  const slots: string[] = [];
  let h = start[0], m = start[1];
  while (h < end[0] || (h === end[0] && m <= end[1])) {
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { h++; m = 0; }
  }
  return slots;
}

export function RescheduleMeetingDialog({
  open,
  onOpenChange,
  meetingId,
  meetingReference,
  currentDate,
  currentTime,
  workflowId,
  onSuccess,
}: RescheduleMeetingDialogProps) {
  const { getSetting } = useSystemSettingsContext();
  const { profile } = useSupabaseAuth();
  const rescheduleMutation = useRescheduleMeeting();
  const checkOverlap = useCheckMeetingOverlap();
  const validateHours = useValidateOfficeHours();

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newDate, setNewDate] = useState<Date | undefined>();
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [overlapError, setOverlapError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bufferMinutes = parseInt(getSetting('meeting_buffer_minutes', '20'), 10);

  // Fetch workflow-configured departments
  const { data: configuredDepts = [] } = useMeetingDepartmentsForWorkflow(workflowId);

  // Get unique offices from configured departments
  const availableOffices = useMemo(() => {
    const officeMap = new Map<string, { code: string; description: string; start_time?: string; end_time?: string }>();
    configuredDepts.forEach((d) => {
      if (d.office && !officeMap.has(d.office_code)) {
        officeMap.set(d.office_code, {
          code: d.office_code,
          description: d.office.description,
          start_time: d.office.office_start_time,
          end_time: d.office.office_end_time,
        });
      }
    });
    return Array.from(officeMap.values());
  }, [configuredDepts]);

  // Get departments for selected office
  const availableDepartments = useMemo(() => {
    return configuredDepts
      .filter((d) => d.office_code === selectedOffice)
      .map((d) => ({ id: d.department_id, name: d.department?.name || '' }));
  }, [configuredDepts, selectedOffice]);

  // Fetch users in selected office/department
  const { data: usersInDept = [] } = useUsersForOfficeDepartment(selectedOffice, selectedDepartment);

  // Fetch selected user's meetings for the selected date
  const dateStr = newDate ? formatDateForStorage(newDate) : undefined;
  const { data: userMeetings = [] } = useUserMeetingsForDate(selectedUserId, dateStr);

  // Get office timings for time slot generation
  const selectedOfficeInfo = availableOffices.find((o) => o.code === selectedOffice);
  const timeSlots = generateTimeSlots(selectedOfficeInfo?.start_time, selectedOfficeInfo?.end_time);

  const hasConfiguredDepts = configuredDepts.length > 0;

  const handleTimeSelect = async (time: string) => {
    setSelectedTime(time);
    setOverlapError('');

    if (!selectedUserId || !dateStr || !selectedOffice) return;

    setIsValidating(true);
    try {
      // Validate office hours
      const hoursResult = await validateHours.mutateAsync({
        office_code: selectedOffice,
        meeting_time: time + ':00',
        buffer_minutes: bufferMinutes,
      });

      if (!hoursResult.is_valid) {
        setOverlapError((hoursResult as any).message || 'Meeting time is outside office hours');
        setIsValidating(false);
        return;
      }

      // Check overlap (exclude current meeting)
      const overlapResult = await checkOverlap.mutateAsync({
        assigned_user_id: selectedUserId,
        meeting_date: dateStr,
        meeting_start_time: time + ':00',
        buffer_minutes: bufferMinutes,
        exclude_meeting_id: meetingId,
      });

      if (overlapResult.has_overlap) {
        const ovr = overlapResult as any;
        setOverlapError(
          `Conflicts with meeting ${ovr.conflicting_reference || ''} (${to12Hour(ovr.conflicting_start_time || '')})`
        );
      }
    } catch (err) {
      console.error('Validation error:', err);
    }
    setIsValidating(false);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!newDate) {
      setError('Please select a new meeting date');
      return;
    }
    if (!selectedOffice || !selectedDepartment || !selectedUserId) {
      setError('Please select office, department and person');
      return;
    }
    if (!selectedTime) {
      setError('Please select a meeting time');
      return;
    }
    if (!remarks.trim()) {
      setError('Please provide a reason for rescheduling');
      return;
    }
    if (overlapError) {
      toast.error('Cannot reschedule: time conflict exists');
      return;
    }

    const selectedUser = usersInDept.find((u) => u.id === selectedUserId);

    try {
      await rescheduleMutation.mutateAsync({
        meetingId,
        newDate: dateStr!,
        newTime: selectedTime,
        remarks: remarks.trim(),
        officeCode: selectedOffice,
        departmentId: selectedDepartment,
        assignedUserId: selectedUserId,
        contactPerson: selectedUser?.user_code || profile?.user_code || '',
        contactEmail: selectedUser?.email || '',
      });

      onOpenChange(false);
      resetForm();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule meeting');
    }
  };

  const resetForm = () => {
    setNewDate(undefined);
    setSelectedOffice('');
    setSelectedDepartment('');
    setSelectedUserId('');
    setSelectedTime('');
    setRemarks('');
    setOverlapError('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reschedule Meeting
          </DialogTitle>
          <DialogDescription>
            Reschedule meeting <strong>{meetingReference}</strong>. The existing record will be updated with the new schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Schedule Info */}
          {(currentDate || currentTime) && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Current Schedule</Label>
              <p className="font-medium">
                {currentDate && formatDisplayDate(currentDate)}
                {currentTime && ` at ${to12Hour(currentTime)}`}
              </p>
            </div>
          )}

          {/* Step 1: Meeting Date */}
          <div className="space-y-2">
            <Label>1. Select New Meeting Date <span className="text-destructive">*</span></Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !newDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? formatDisplayDate(newDate) : 'Select new date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={(date) => {
                    setNewDate(date as Date);
                    setCalendarOpen(false);
                    setSelectedTime('');
                    setOverlapError('');
                  }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Step 2: Office & Department */}
          {newDate && (
            <>
              {hasConfiguredDepts ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>2. Office Location <span className="text-destructive">*</span></Label>
                    <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedDepartment(''); setSelectedUserId(''); setSelectedTime(''); setOverlapError(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOffices.map((o) => (
                          <SelectItem key={o.code} value={o.code}>{o.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department <span className="text-destructive">*</span></Label>
                    <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedUserId(''); setSelectedTime(''); setOverlapError(''); }} disabled={!selectedOffice}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedOffice ? 'Select department' : 'Select office first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDepartments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-600" />
                  No departments configured for this workflow. Please configure meeting departments in the workflow settings.
                </div>
              )}
            </>
          )}

          {/* Step 3: Select Person */}
          {selectedDepartment && (
            <div className="space-y-2">
              <Label>3. Select Meeting Person <span className="text-destructive">*</span></Label>
              {usersInDept.length > 0 ? (
                <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setSelectedTime(''); setOverlapError(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a person" />
                  </SelectTrigger>
                  <SelectContent>
                    {usersInDept.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {u.full_name || u.email}
                          {u.employee_code && <span className="text-muted-foreground">({u.employee_code})</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground p-2 border rounded-md border-dashed">
                  No users found in this office-department combination.
                </p>
              )}
            </div>
          )}

          {/* User's existing meetings for selected date */}
          {selectedUserId && dateStr && userMeetings.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Existing Meetings on {formatDisplayDate(newDate!)}</Label>
              <div className="flex flex-wrap gap-2">
                {userMeetings.map((m: any) => (
                  <Badge key={m.meeting_id} variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {to12Hour(m.meeting_time)} - {m.meeting_reference}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Time Selection */}
          {selectedUserId && (
            <div className="space-y-2">
              <Label>4. Select Meeting Time <span className="text-destructive">*</span> <span className="text-xs text-muted-foreground">(12-hour format)</span></Label>
              <Select value={selectedTime} onValueChange={handleTimeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((slot) => {
                    const isOccupied = userMeetings.some((m: any) => m.meeting_time?.startsWith(slot));
                    return (
                      <SelectItem key={slot} value={slot} disabled={isOccupied}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {to12Hour(slot)}
                          {isOccupied && <Badge variant="destructive" className="text-xs ml-2">Occupied</Badge>}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {isValidating && <p className="text-xs text-muted-foreground">Validating time slot...</p>}
              {overlapError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overlapError}
                </p>
              )}
            </div>
          )}

          {/* Remarks */}
          {selectedTime && !overlapError && (
            <div className="space-y-2">
              <Label htmlFor="rescheduleRemarks">
                Reason for Rescheduling <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rescheduleRemarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Please explain why this meeting is being rescheduled..."
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              rescheduleMutation.isPending ||
              !newDate ||
              !selectedOffice ||
              !selectedDepartment ||
              !selectedUserId ||
              !selectedTime ||
              !!overlapError
            }
          >
            {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reschedule Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
