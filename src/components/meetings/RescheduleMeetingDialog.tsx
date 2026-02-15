import { useState, useMemo, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { CalendarIcon, Clock, Loader2, RefreshCw, User, Building2, AlertTriangle, Mail, Phone, MapPin } from 'lucide-react';
import { useRescheduleMeeting } from '@/hooks/useMeetings';
import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { formatDisplayDate, formatDateForStorage } from '@/lib/dateFormat';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useMeetingDepartmentsForWorkflow,
  useUsersForOfficeDepartment,
  useUserMeetingsForDate,
  useUserMeetingsForDateRange,
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
  workflowInstanceId?: string;
  stepId?: string;
  applicationReference?: string;
  onSuccess?: () => void;
}

function to12Hour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

function generateTimeSlots(bufferMinutes: number, startTime?: string, endTime?: string): string[] {
  const start = startTime ? startTime.split(':').map(Number) : [8, 0];
  const end = endTime ? endTime.split(':').map(Number) : [16, 0];
  const interval = Math.max(bufferMinutes, 10);
  const slots: string[] = [];
  let h = start[0], m = start[1];
  while (h < end[0] || (h === end[0] && m <= end[1])) {
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    m += interval;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
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
  workflowInstanceId,
  stepId,
  applicationReference,
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

  // Get unique offices
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

  // Auto-select first office when data loads
  useEffect(() => {
    if (open && availableOffices.length > 0 && !selectedOffice) {
      setSelectedOffice(availableOffices[0].code);
    }
  }, [open, availableOffices, selectedOffice]);

  // Auto-select first department
  useEffect(() => {
    if (selectedOffice && availableDepartments.length > 0 && !availableDepartments.find(d => d.id === selectedDepartment)) {
      setSelectedDepartment(availableDepartments[0].id);
    }
  }, [selectedOffice, availableDepartments, selectedDepartment]);

  // Fetch users
  const { data: usersInDept = [] } = useUsersForOfficeDepartment(selectedOffice, selectedDepartment);

  // Auto-select first employee
  useEffect(() => {
    if (usersInDept.length > 0 && !usersInDept.find(u => u.id === selectedUserId)) {
      setSelectedUserId(usersInDept[0].id);
    }
  }, [usersInDept, selectedUserId]);

  // 2-week range
  const today = new Date();
  const twoWeeksLater = addDays(today, 14);
  const rangeStart = format(today, 'yyyy-MM-dd');
  const rangeEnd = format(twoWeeksLater, 'yyyy-MM-dd');
  const { data: rangeMeetings = [] } = useUserMeetingsForDateRange(selectedUserId, rangeStart, rangeEnd);

  const dateStr = newDate ? formatDateForStorage(newDate) : undefined;
  const { data: userMeetings = [] } = useUserMeetingsForDate(selectedUserId, dateStr);

  const selectedOfficeInfo = availableOffices.find((o) => o.code === selectedOffice);
  const timeSlots = generateTimeSlots(bufferMinutes, selectedOfficeInfo?.start_time, selectedOfficeInfo?.end_time);
  const hasConfiguredDepts = configuredDepts.length > 0;

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    rangeMeetings.forEach((m: any) => {
      const d = m.date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(m);
    });
    return map;
  }, [rangeMeetings]);

  const handleTimeSelect = async (time: string) => {
    setSelectedTime(time);
    setOverlapError('');

    if (!selectedUserId || !dateStr || !selectedOffice) return;

    setIsValidating(true);
    try {
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

    if (!newDate) { setError('Please select a new meeting date'); return; }
    if (!selectedOffice || !selectedDepartment || !selectedUserId) { setError('Please select office, department and person'); return; }
    if (!selectedTime) { setError('Please select a meeting time'); return; }
    if (!remarks.trim()) { setError('Please provide a reason for rescheduling'); return; }
    if (overlapError) { toast.error('Cannot reschedule: time conflict exists'); return; }

    const selectedUser = usersInDept.find((u) => u.id === selectedUserId);
    const officeAddr = selectedOfficeInfo
      ? [selectedOfficeInfo.description, selectedOfficeInfo.address1, selectedOfficeInfo.address2].filter(Boolean).join(', ')
      : '';

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
        contactEmail: selectedOfficeInfo?.email || '',
        contactPhone: (selectedOfficeInfo?.phone || '').replace(/[^+\d]/g, ''),
        officeAddress: officeAddr,
      });

      onOpenChange(false);
      resetForm();

      // Trigger workflow action API (non-blocking)
      if (workflowId && workflowInstanceId && stepId) {
        try {
          const { data: apiResult, error: apiError } = await supabase.functions.invoke('workflow-action-api', {
            body: {
              action: 'execute',
              workflowId,
              workflowStepId: stepId,
              workflowInstanceId,
              taskId: null,
              actionCode: 'ScheduleMeeting',
              applicationData: {
                application_reference_no: applicationReference || '',
                application_reference_number: applicationReference || '',
                reference_number: applicationReference || '',
              },
              meetingData: {
                meeting_reference_no: meetingReference,
                meeting_reference_number: meetingReference,
                meeting_date: dateStr,
                meeting_time: selectedTime,
                office_address: officeAddr,
                contact_person: selectedUser?.user_code || profile?.user_code || '',
                remarks: remarks.trim(),
                status: 'Rescheduled',
              },
              workflowContext: {
                action_code: 'ScheduleMeeting',
                instance_id: workflowInstanceId,
                step_id: stepId,
                source_module: 'meeting_reschedule',
                source_record_id: applicationReference || meetingId,
                user_remarks: remarks.trim(),
              },
            },
          });

          if (apiError) {
            console.error('[RescheduleMeetingDialog] Workflow API error (non-blocking):', apiError);
          }
        } catch (err) {
          console.error('[RescheduleMeetingDialog] Failed to invoke workflow action API (non-blocking):', err);
        }
      }

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reschedule Meeting
          </DialogTitle>
          <DialogDescription>
            Reschedule meeting <strong>{meetingReference}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Schedule */}
          {(currentDate || currentTime) && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">Current Schedule</Label>
              <p className="font-medium">
                {currentDate && formatDisplayDate(currentDate)}
                {currentTime && ` at ${to12Hour(currentTime)}`}
              </p>
            </div>
          )}

          {!hasConfiguredDepts && (
            <div className="p-3 border rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-600" />
              No departments configured for this workflow.
            </div>
          )}

          {hasConfiguredDepts && (
            <>
              {/* Step 1: Office & Department */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">1. Select Office & Department</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Office Location <span className="text-destructive">*</span></Label>
                    <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedDepartment(''); setSelectedUserId(''); setSelectedTime(''); setNewDate(undefined); setOverlapError(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOffices.map((o) => (
                          <SelectItem key={o.code} value={o.code}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3" />
                              {o.description}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Department <span className="text-destructive">*</span></Label>
                    <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedUserId(''); setSelectedTime(''); setNewDate(undefined); setOverlapError(''); }} disabled={!selectedOffice}>
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

                {/* Office Info */}
                {selectedOffice && selectedOfficeInfo && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <Label className="text-xs font-semibold text-primary mb-2 block">Office Information</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs block">Address</span>
                          <p className="font-medium text-xs">{[selectedOfficeInfo.description, selectedOfficeInfo.address1, selectedOfficeInfo.address2].filter(Boolean).join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs block">Email</span>
                          <p className="font-medium text-xs">{selectedOfficeInfo.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="text-muted-foreground text-xs block">Phone</span>
                          <p className="font-medium text-xs">{selectedOfficeInfo.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Step 2: Employee Radio */}
              {selectedDepartment && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">2. Select Meeting Person <span className="text-destructive">*</span></Label>
                  {usersInDept.length > 0 ? (
                    <RadioGroup
                      value={selectedUserId}
                      onValueChange={(v) => { setSelectedUserId(v); setSelectedTime(''); setNewDate(undefined); setOverlapError(''); }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      {usersInDept.map((u) => (
                        <Label
                          key={u.id}
                          htmlFor={`reschedule-user-${u.id}`}
                          className={cn(
                            'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                            selectedUserId === u.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <RadioGroupItem value={u.id} id={`reschedule-user-${u.id}`} />
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                              {u.employee_code && <p className="text-xs text-muted-foreground">{u.employee_code}</p>}
                            </div>
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                  ) : (
                    <p className="text-sm text-muted-foreground p-3 border rounded-md border-dashed">
                      No users found in this office-department combination.
                    </p>
                  )}
                </div>
              )}

              {selectedUserId && (
                <>
                  <Separator />

                  {/* Step 3: Date & 2-week calendar */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">3. Select New Meeting Date <span className="text-destructive">*</span></Label>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {usersInDept.find(u => u.id === selectedUserId)?.full_name}'s schedule (next 2 weeks)
                      </Label>
                      <div className="grid grid-cols-7 gap-1 text-xs">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
                        ))}
                        {Array.from({ length: 14 }, (_, i) => {
                          const day = addDays(today, i);
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const dayMeetings = meetingsByDate.get(dayStr) || [];
                          const isSelected = newDate && formatDateForStorage(newDate) === dayStr;
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                          const elements: React.ReactNode[] = [];
                          if (i === 0) {
                            for (let pad = 0; pad < day.getDay(); pad++) {
                              elements.push(<div key={`pad-${pad}`} />);
                            }
                          }
                          elements.push(
                            <button
                              key={dayStr}
                              type="button"
                              onClick={() => { setNewDate(day); setSelectedTime(''); setOverlapError(''); }}
                              className={cn(
                                'relative p-1.5 rounded text-center transition-colors',
                                isSelected ? 'bg-primary text-primary-foreground font-bold' : '',
                                !isSelected && isWeekend ? 'text-muted-foreground/50' : '',
                                !isSelected && !isWeekend ? 'hover:bg-accent' : '',
                              )}
                            >
                              <span className="block">{day.getDate()}</span>
                              {dayMeetings.length > 0 && (
                                <span className={cn(
                                  'block text-[9px] leading-none mt-0.5',
                                  isSelected ? 'text-primary-foreground/80' : 'text-destructive'
                                )}>
                                  {dayMeetings.length} mtg{dayMeetings.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </button>
                          );
                          return elements;
                        }).flat()}
                      </div>
                    </div>

                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !newDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newDate ? formatDisplayDate(newDate) : 'Or pick from calendar...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                        <Calendar
                          mode="single"
                          selected={newDate}
                          onSelect={(date) => { setNewDate(date as Date); setCalendarOpen(false); setSelectedTime(''); setOverlapError(''); }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {/* Existing meetings on date */}
              {selectedUserId && dateStr && newDate && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Meetings on {formatDisplayDate(newDate)}</Label>
                  {userMeetings.length > 0 ? (
                    <div className="space-y-1">
                      {userMeetings.map((m: any) => (
                        <div key={m.meeting_id || m.id} className="flex items-center gap-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs">
                          <Clock className="h-3 w-3 text-destructive shrink-0" />
                          <span className="font-medium">{to12Hour(m.meeting_time)}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="truncate">{m.meeting_reference}</span>
                          {m.status && (
                            <Badge variant={m.status === 'Scheduled' ? 'secondary' : 'default'} className="text-[10px] ml-auto shrink-0">
                              {m.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No existing meetings on this date.</p>
                  )}
                </div>
              )}

              {/* Step 4: Time */}
              {newDate && selectedUserId && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      4. Select Meeting Time <span className="text-destructive">*</span>
                      <span className="text-xs font-normal text-muted-foreground ml-2">({bufferMinutes}-min intervals)</span>
                    </Label>
                    <ScrollArea className="max-h-40">
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {timeSlots.map((slot) => {
                          const isOccupied = userMeetings.some((m: any) => {
                            if (!m.meeting_time) return false;
                            const meetingMinutes = parseInt(m.meeting_time.split(':')[0]) * 60 + parseInt(m.meeting_time.split(':')[1]);
                            const slotMinutes = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
                            return Math.abs(meetingMinutes - slotMinutes) < bufferMinutes;
                          });
                          return (
                            <Button
                              key={slot}
                              type="button"
                              variant={selectedTime === slot ? 'default' : isOccupied ? 'ghost' : 'outline'}
                              size="sm"
                              disabled={isOccupied}
                              onClick={() => handleTimeSelect(slot)}
                              className={cn(
                                'text-xs h-8',
                                isOccupied && 'opacity-40 line-through',
                                selectedTime === slot && 'ring-2 ring-primary'
                              )}
                            >
                              {to12Hour(slot)}
                            </Button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {isValidating && <p className="text-xs text-muted-foreground">Validating time slot...</p>}
                    {overlapError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {overlapError}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Remarks (mandatory for reschedule) */}
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
            </>
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
