import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatDisplayDate, formatDateForStorage } from '@/lib/dateFormat';
import { CalendarIcon, Clock, Loader2, User, Building2, AlertTriangle } from 'lucide-react';
import { useScheduleMeeting } from '@/hooks/useMeetings';
import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import type { MeetingType, ScheduleMeetingFormData } from '@/types/meetings';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import {
  useMeetingDepartmentsForWorkflow,
  useUsersForOfficeDepartment,
  useUserMeetingsForDate,
  useCheckMeetingOverlap,
  useValidateOfficeHours,
} from '@/hooks/useWorkflowMeetingDepartments';
import { toast } from 'sonner';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationReference: string;
  meetingType: MeetingType;
  workflowInstanceId?: string;
  workflowId?: string;
  stepId?: string;
  onSuccess?: (data: any) => void;
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

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  applicationReference,
  meetingType,
  workflowInstanceId,
  workflowId,
  stepId,
  onSuccess
}: ScheduleMeetingDialogProps) {
  const { getSetting } = useSystemSettingsContext();
  const { user, profile } = useSupabaseAuth();
  const scheduleMutation = useScheduleMeeting();
  const checkOverlap = useCheckMeetingOverlap();
  const validateHours = useValidateOfficeHours();

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>();
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [overlapError, setOverlapError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const bufferMinutes = parseInt(getSetting('meeting_buffer_minutes', '20'), 10);
  const defaultAddress = getSetting('default_office_address', 'Social Security Board, Bay Road, Basseterre, St. Kitts');

  // Fetch workflow-configured departments
  const { data: configuredDepts = [] } = useMeetingDepartmentsForWorkflow(workflowId);

  // Get unique offices from configured departments
  const availableOffices = useMemo(() => {
    const officeMap = new Map<string, { code: string; description: string; start_time?: string; end_time?: string; email?: string; phone?: string; address1?: string; address2?: string }>();
    configuredDepts.forEach((d) => {
      if (d.office && !officeMap.has(d.office_code)) {
        officeMap.set(d.office_code, {
          code: d.office_code,
          description: d.office.description,
          start_time: d.office.office_start_time,
          end_time: d.office.office_end_time,
          email: d.office.office_email || undefined,
          phone: d.office.office_phone || undefined,
          address1: d.office.address1,
          address2: d.office.address2,
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
  const dateStr = meetingDate ? formatDateForStorage(meetingDate) : undefined;
  const { data: userMeetings = [] } = useUserMeetingsForDate(selectedUserId, dateStr);

  // Get office timings for time slot generation
  const selectedOfficeInfo = availableOffices.find((o) => o.code === selectedOffice);
  const timeSlots = generateTimeSlots(selectedOfficeInfo?.start_time, selectedOfficeInfo?.end_time);

  const getMeetingTypeLabel = (type: MeetingType): string => {
    switch (type) {
      case 'IP-Registration': return 'Insured Person';
      case 'Employer-Registration': return 'Employer';
      case 'Doctor-Registration': return 'Doctor';
      default: return 'General';
    }
  };

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

      // Check overlap
      const overlapResult = await checkOverlap.mutateAsync({
        assigned_user_id: selectedUserId,
        meeting_date: dateStr,
        meeting_start_time: time + ':00',
        buffer_minutes: bufferMinutes,
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
    if (!meetingDate || !selectedOffice || !selectedDepartment || !selectedUserId || !selectedTime) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (overlapError) {
      toast.error('Cannot schedule: time conflict exists');
      return;
    }

    const selectedUser = usersInDept.find((u) => u.id === selectedUserId);
    const officeAddr = selectedOfficeInfo
      ? [selectedOfficeInfo.description, selectedOfficeInfo.address1, selectedOfficeInfo.address2].filter(Boolean).join(', ')
      : defaultAddress;
    const formData: ScheduleMeetingFormData = {
      applicationReference,
      meetingType,
      workflowInstanceId,
      workflowId,
      stepId,
      meetingDate: formatDateForStorage(meetingDate),
      meetingTime: selectedTime,
      contactPerson: selectedUser?.user_code || profile?.user_code || '',
      contactEmail: selectedOfficeInfo?.email || '',
      contactPhone: selectedOfficeInfo?.phone || '',
      officeAddress: officeAddr,
      remarks: remarks || undefined,
    };

    // Pass extra fields via metadata in the formData
    (formData as any).officeCode = selectedOffice;
    (formData as any).departmentId = selectedDepartment;
    (formData as any).assignedUserId = selectedUserId;

    try {
      const result = await scheduleMutation.mutateAsync(formData);
      if (onSuccess) onSuccess(result);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      // handled by mutation
    }
  };

  const resetForm = () => {
    setMeetingDate(undefined);
    setSelectedOffice('');
    setSelectedDepartment('');
    setSelectedUserId('');
    setSelectedTime('');
    setRemarks('');
    setOverlapError('');
  };

  const hasConfiguredDepts = configuredDepts.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <DialogDescription>Schedule a meeting for application review</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Application Info */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Application Reference</Label>
              <p className="font-medium">{applicationReference}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Meeting Type</Label>
              <p className="font-medium">{getMeetingTypeLabel(meetingType)}</p>
            </div>
          </div>

          {/* Step 1: Meeting Date */}
          <div className="space-y-2">
            <Label>1. Select Meeting Date *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !meetingDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {meetingDate ? formatDisplayDate(meetingDate) : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={meetingDate}
                  onSelect={(date) => {
                    setMeetingDate(date as Date);
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

          {/* Step 2: Office & Department (only if date selected) */}
          {meetingDate && (
            <>
              {hasConfiguredDepts ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>2. Office Location *</Label>
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
                    <Label>Department *</Label>
                    <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedUserId(''); setSelectedTime(''); setOverlapError(''); }} disabled={!selectedOffice}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedOffice ? "Select department" : "Select office first"} />
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
              <Label>3. Select Meeting Person *</Label>
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
              <Label className="text-sm">Existing Meetings on {formatDisplayDate(meetingDate!)}</Label>
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
              <Label>4. Select Meeting Time * <span className="text-xs text-muted-foreground">(12-hour format)</span></Label>
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
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Additional notes or instructions..."
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
            onClick={handleSubmit}
            disabled={
              scheduleMutation.isPending ||
              !meetingDate ||
              !selectedOffice ||
              !selectedDepartment ||
              !selectedUserId ||
              !selectedTime ||
              !!overlapError
            }
          >
            {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
