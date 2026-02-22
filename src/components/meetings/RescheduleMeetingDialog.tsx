import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek } from 'date-fns';
import { Check, Clock, Loader2, RefreshCw, User, Building2, AlertTriangle, Mail, Phone, MapPin, Info } from 'lucide-react';
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
  const endTotalMins = end[0] * 60 + end[1];
  const lastSlotMins = endTotalMins - interval;
  const slots: string[] = [];
  let h = start[0], m = start[1];
  while (h * 60 + m <= lastSlotMins) {
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    m += interval;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

/** Build a strict 28-day array aligned to the configured week start day. */
function buildFourWeekDays(today: Date, weekStartDay: number): Date[] {
  const weekStart = startOfWeek(today, { weekStartsOn: weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
  const days: Date[] = [];
  for (let i = 0; i < 28; i++) days.push(addDays(weekStart, i));
  return days;
}

export function RescheduleMeetingDialog({
  open, onOpenChange, meetingId, meetingReference, currentDate, currentTime,
  workflowId, workflowInstanceId, stepId, applicationReference, onSuccess,
}: RescheduleMeetingDialogProps) {
  const { getSetting } = useSystemSettingsContext();
  const { profile } = useSupabaseAuth();
  const rescheduleMutation = useRescheduleMeeting();
  const checkOverlap = useCheckMeetingOverlap();
  const validateHours = useValidateOfficeHours();

  const [newDate, setNewDate] = useState<Date | undefined>();
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [overlapError, setOverlapError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Toggle: true = release the previously booked slot (default ON)
  const [releasePreviousSlot, setReleasePreviousSlot] = useState(true);

  const bufferMinutes = parseInt(getSetting('meeting_buffer_minutes', '20'), 10);
  const nonWorkingDaysSetting = getSetting('non_working_days', '0,6');
  const nonWorkingDays = useMemo(() => nonWorkingDaysSetting.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n)), [nonWorkingDaysSetting]);

  // Week start: 0=Sun,1=Mon
  const weekStartDay = useMemo(() => {
    const raw = getSetting('week_start_day', '0');
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [getSetting]);

  const { data: configuredDepts = [] } = useMeetingDepartmentsForWorkflow(workflowId);

  const availableOffices = useMemo(() => {
    const officeMap = new Map<string, { code: string; description: string; start_time?: string; end_time?: string; email?: string; phone?: string; address1?: string; address2?: string }>();
    configuredDepts.forEach((d) => {
      if (d.office && !officeMap.has(d.office_code)) {
        officeMap.set(d.office_code, {
          code: d.office_code, description: d.office.description,
          start_time: d.office.office_start_time, end_time: d.office.office_end_time,
          email: d.office.office_email || undefined, phone: d.office.office_phone || undefined,
          address1: d.office.address1, address2: d.office.address2,
        });
      }
    });
    return Array.from(officeMap.values());
  }, [configuredDepts]);

  const availableDepartments = useMemo(() => {
    return configuredDepts.filter((d) => d.office_code === selectedOffice).map((d) => ({ id: d.department_id, name: d.department?.name || '' }));
  }, [configuredDepts, selectedOffice]);

  useEffect(() => { if (open && availableOffices.length > 0 && !selectedOffice) setSelectedOffice(availableOffices[0].code); }, [open, availableOffices, selectedOffice]);
  useEffect(() => { if (selectedOffice && availableDepartments.length > 0 && !availableDepartments.find(d => d.id === selectedDepartment)) setSelectedDepartment(availableDepartments[0].id); }, [selectedOffice, availableDepartments, selectedDepartment]);

  const { data: usersInDept = [] } = useUsersForOfficeDepartment(selectedOffice, selectedDepartment);
  useEffect(() => { if (usersInDept.length > 0 && !usersInDept.find(u => u.id === selectedUserId)) setSelectedUserId(usersInDept[0].id); }, [usersInDept, selectedUserId]);

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  // Capture current time in minutes at render time
  const nowTimeMinutes = useMemo(() => today.getHours() * 60 + today.getMinutes(), []);

  // Returns true if a time slot string "HH:MM" is in the past relative to now, when today is selected
  const isSlotInPast = (slot: string): boolean => {
    const activeDateStr = newDate ? formatDateForStorage(newDate) : undefined;
    if (!activeDateStr || activeDateStr !== todayStr) return false;
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m <= nowTimeMinutes;
  };

  // Strict 4-week aligned days
  const calendarDays = useMemo(() => buildFourWeekDays(today, weekStartDay), [weekStartDay]);

  // Ordered column headers
  const dayHeaders = useMemo(() => {
    const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result = [];
    for (let i = 0; i < 7; i++) result.push(allDays[(weekStartDay + i) % 7]);
    return result;
  }, [weekStartDay]);

  const rangeStart = format(calendarDays[0], 'yyyy-MM-dd');
  const rangeEnd = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd');
  const { data: rangeMeetings = [] } = useUserMeetingsForDateRange(selectedUserId, rangeStart, rangeEnd);

  const dateStr = newDate ? formatDateForStorage(newDate) : undefined;
  const { data: userMeetings = [] } = useUserMeetingsForDate(selectedUserId, dateStr);

  const selectedOfficeInfo = availableOffices.find((o) => o.code === selectedOffice);
  const timeSlots = generateTimeSlots(bufferMinutes, selectedOfficeInfo?.start_time, selectedOfficeInfo?.end_time);
  const hasConfiguredDepts = configuredDepts.length > 0;

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    rangeMeetings.forEach((m: any) => { const d = m.date; if (!map.has(d)) map.set(d, []); map.get(d)!.push(m); });
    return map;
  }, [rangeMeetings]);

  const handleTimeSelect = async (time: string) => {
    // Guard: never allow selecting a past slot for today
    if (isSlotInPast(time)) {
      setOverlapError('Cannot select a time slot that is already in the past for today.');
      return;
    }
    setSelectedTime(time);
    setOverlapError('');
    if (!selectedUserId || !dateStr || !selectedOffice) return;
    setIsValidating(true);
    try {
      const hoursResult = await validateHours.mutateAsync({ office_code: selectedOffice, meeting_time: time + ':00', buffer_minutes: bufferMinutes });
      if (!hoursResult.is_valid) { setOverlapError((hoursResult as any).message || 'Outside office hours'); setIsValidating(false); return; }
      const overlapResult = await checkOverlap.mutateAsync({ assigned_user_id: selectedUserId, meeting_date: dateStr, meeting_start_time: time + ':00', buffer_minutes: bufferMinutes, exclude_meeting_id: meetingId });
      if (overlapResult.has_overlap) { const ovr = overlapResult as any; setOverlapError(`Conflicts with ${ovr.conflicting_reference || ''} (${to12Hour(ovr.conflicting_start_time || '')})`); }
    } catch (err) { console.error('Validation error:', err); }
    setIsValidating(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!newDate) { setError('Please select a new meeting date'); return; }
    if (!selectedOffice || !selectedDepartment || !selectedUserId) { setError('Please select office, department and person'); return; }
    if (!selectedTime) { setError('Please select a meeting time'); return; }
    if (!remarks.trim()) { setError('Please provide a reason for rescheduling'); return; }
    if (overlapError) { toast.error('Cannot reschedule: time conflict exists'); return; }
    // Frontend guard: reject past time slots for today at submit time
    if (isSlotInPast(selectedTime)) {
      setError('The selected time has already passed. Please choose a future time slot.');
      setSelectedTime('');
      setOverlapError('');
      return;
    }

    const selectedUser = usersInDept.find((u) => u.id === selectedUserId);
    const officeAddr = selectedOfficeInfo ? [selectedOfficeInfo.description, selectedOfficeInfo.address1, selectedOfficeInfo.address2].filter(Boolean).join(', ') : '';

    try {
      await rescheduleMutation.mutateAsync({
        meetingId, newDate: dateStr!, newTime: selectedTime, remarks: remarks.trim(),
        officeCode: selectedOffice, departmentId: selectedDepartment, assignedUserId: selectedUserId,
        contactPerson: selectedUser?.user_code || profile?.user_code || '',
        contactEmail: selectedOfficeInfo?.email || '', contactPhone: (selectedOfficeInfo?.phone || '').replace(/[^+\d]/g, ''),
        officeAddress: officeAddr,
        releasePreviousSlot,
      });
      onOpenChange(false);
      resetForm();

      if (workflowId && workflowInstanceId && stepId) {
        try {
          await supabase.functions.invoke('workflow-action-api', {
            body: {
              action: 'execute', workflowId, workflowStepId: stepId, workflowInstanceId, taskId: null, actionCode: 'ScheduleMeeting',
              applicationData: { application_reference_no: applicationReference || '', application_reference_number: applicationReference || '', reference_number: applicationReference || '' },
              meetingData: { meeting_reference_no: meetingReference, meeting_reference_number: meetingReference, meeting_date: dateStr, meeting_time: selectedTime, office_address: officeAddr, contact_person: selectedUser?.user_code || profile?.user_code || '', contact_person_name: selectedUser?.full_name || profile?.full_name || '', remarks: remarks.trim(), status: 'Rescheduled' },
              workflowContext: { action_code: 'ScheduleMeeting', instance_id: workflowInstanceId, step_id: stepId, source_module: 'meeting_reschedule', source_record_id: applicationReference || meetingId, user_remarks: remarks.trim() },
            },
          });
        } catch (err) { console.error('[RescheduleMeetingDialog] Workflow API error (non-blocking):', err); }
      }
      if (onSuccess) onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to reschedule meeting'); }
  };

  const resetForm = () => { setNewDate(undefined); setSelectedOffice(''); setSelectedDepartment(''); setSelectedUserId(''); setSelectedTime(''); setRemarks(''); setOverlapError(''); setError(null); setReleasePreviousSlot(true); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] flex flex-col p-0 gap-0">
        {/* Fixed header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reschedule Meeting
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4 text-xs">
            <span>Meeting: <strong>{meetingReference}</strong></span>
            {currentDate && <span>Current: <strong>{formatDisplayDate(currentDate)}{currentTime && ` at ${to12Hour(currentTime)}`}</strong></span>}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="px-6 pt-3 shrink-0">
            <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
          </div>
        )}

        {!hasConfiguredDepts ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-900/20 text-sm max-w-md text-center">
              <AlertTriangle className="h-5 w-5 inline mr-2 text-amber-600" />
              No departments configured for this workflow.
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT PANEL */}
            <div className="lg:w-[340px] shrink-0 border-r flex flex-col p-4 gap-4 overflow-hidden">
              <div className="space-y-1.5 shrink-0">
                <Label className="text-xs font-semibold">Office Location <span className="text-destructive">*</span></Label>
                <Select value={selectedOffice} onValueChange={(v) => { setSelectedOffice(v); setSelectedDepartment(''); setSelectedUserId(''); setSelectedTime(''); setNewDate(undefined); setOverlapError(''); }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {availableOffices.map((o) => (
                      <SelectItem key={o.code} value={o.code}><div className="flex items-center gap-2"><Building2 className="h-3 w-3" />{o.description}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOffice && selectedOfficeInfo && (
                <div className="p-2.5 bg-primary/5 rounded-lg space-y-1.5 text-xs shrink-0">
                  <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">{[selectedOfficeInfo.address1, selectedOfficeInfo.address2].filter(Boolean).join(', ') || 'N/A'}</span></div>
                  <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">{selectedOfficeInfo.email || 'N/A'}</span></div>
                  <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground shrink-0" /><span>{selectedOfficeInfo.phone || 'N/A'}</span></div>
                </div>
              )}

              <div className="space-y-1.5 shrink-0">
                <Label className="text-xs font-semibold">Department <span className="text-destructive">*</span></Label>
                <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedUserId(''); setSelectedTime(''); setNewDate(undefined); setOverlapError(''); }} disabled={!selectedOffice}>
                  <SelectTrigger className="h-9"><SelectValue placeholder={selectedOffice ? "Select department" : "Select office first"} /></SelectTrigger>
                  <SelectContent>{availableDepartments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              <Separator className="shrink-0" />

              {/* Meeting Person – scrollable with highlight */}
              {selectedDepartment && (
                <div className="space-y-1.5 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <Label className="text-xs font-semibold shrink-0">Meeting Person <span className="text-destructive">*</span></Label>
                  {usersInDept.length > 0 ? (
                    <div className="flex-1 overflow-y-auto pr-0.5">
                      <RadioGroup value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setSelectedTime(''); setNewDate(undefined); setOverlapError(''); }} className="space-y-1.5">
                        {usersInDept.map((u) => (
                          <Label key={u.id} htmlFor={`reschedule-user-${u.id}`} className={cn(
                            'flex items-center gap-2.5 p-2 border rounded-lg cursor-pointer transition-colors text-sm',
                            selectedUserId === u.id
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/30 ring-1 ring-green-500/30'
                              : 'border-border hover:border-primary/50'
                          )}>
                            <RadioGroupItem value={u.id} id={`reschedule-user-${u.id}`} className="sr-only" />
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
                              selectedUserId === u.id
                                ? "bg-green-500 text-white"
                                : "bg-primary/10"
                            )}>
                              {selectedUserId === u.id ? <Check className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">{u.full_name || u.email}</p>
                              {u.employee_code && <p className="text-[10px] text-muted-foreground">{u.employee_code}</p>}
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground p-2 border rounded-md border-dashed">No users found.</p>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT PANEL – scrollable content, fixed footer */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {!selectedUserId ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  Select an office, department and person to view availability
                </div>
              ) : (
                /* Scrollable content area */
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* 4-week calendar grid – strictly 28 days aligned to week start */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      {usersInDept.find(u => u.id === selectedUserId)?.full_name}'s Schedule — Next 4 Weeks
                    </Label>
                    <div className="grid grid-cols-7 gap-1 text-xs">
                      {dayHeaders.map(d => (
                        <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
                      ))}

                      {calendarDays.map((day) => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const dayMeetings = meetingsByDate.get(dayStr) || [];
                        const isSelected = newDate && formatDateForStorage(newDate) === dayStr;
                        const isToday = todayStr === dayStr;
                        const isBeforeToday = day < today && !isToday;
                        const isNonWorking = nonWorkingDays.includes(day.getDay());
                        const isDisabled = isNonWorking || isBeforeToday;

                        return (
                          <button
                            key={dayStr}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => { if (!isDisabled) { setNewDate(day); setSelectedTime(''); setOverlapError(''); } }}
                            className={cn(
                              'relative p-2 rounded text-center transition-colors',
                              isSelected ? 'bg-gray-300 font-bold' : '',
                              isToday && !isSelected ? 'bg-gray-200 dark:bg-gray-600' : '',
                              isDisabled ? 'text-muted-foreground/40 bg-muted/30 cursor-not-allowed' : '',
                              !isSelected && !isToday && !isDisabled ? 'hover:bg-accent' : ''
                            )}
                          >
                            {/* Date number with inline badge attached */}
                            <span className="inline-flex items-center justify-center gap-0.5">
                              <span className="text-sm">{day.getDate()}</span>
                              {dayMeetings.length > 0 && (
                                <span className={cn(
                                  'inline-flex items-center justify-center rounded-full text-[9px] font-bold h-3.5 min-w-3.5 px-0.5',
                                  isSelected ? 'text-gray-300' : 'bg-destructive text-destructive-foreground'
                                )}>
                                  {dayMeetings.length}
                                </span>
                              )}
                            </span>
                            <span className="block text-[9px] text-muted-foreground">{format(day, 'MMM')}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meetings on selected date + Time slots side by side */}
                  {newDate && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Existing meetings – max-h matches time section, scrollable */}
                      <div className="space-y-2 flex flex-col">
                        <Label className="text-xs font-semibold shrink-0">Meetings on {formatDisplayDate(newDate)}</Label>
                        <div className="overflow-y-auto max-h-[180px] space-y-1 pr-0.5">
                          {userMeetings.length > 0 ? (
                            userMeetings.map((m: any) => (
                              <div key={m.meeting_id || m.id} className="flex items-center gap-2 p-1.5 bg-destructive/5 border border-destructive/20 rounded text-xs">
                                <Clock className="h-3 w-3 text-destructive shrink-0" />
                                <span className="font-medium">{to12Hour(m.meeting_time)}</span>
                                <span className="truncate text-muted-foreground">{m.meeting_reference}</span>
                                {m.status && <Badge variant="secondary" className="text-[9px] ml-auto shrink-0">{m.status}</Badge>}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded">No meetings on this date.</p>
                          )}
                        </div>
                      </div>

                      {/* Time slots */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">
                          Select Time <span className="text-destructive">*</span>
                          <span className="font-normal text-muted-foreground ml-1">({bufferMinutes}-min)</span>
                        </Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 max-h-[180px] overflow-y-auto pr-0.5">
                           {timeSlots.map((slot) => {
                             const isPast = isSlotInPast(slot);
                             const isOccupied = userMeetings.some((m: any) => {
                               if (!m.meeting_time) return false;
                               const meetingMin = parseInt(m.meeting_time.split(':')[0]) * 60 + parseInt(m.meeting_time.split(':')[1]);
                               const meetingEndMin = m.meeting_end_time ? parseInt(m.meeting_end_time.split(':')[0]) * 60 + parseInt(m.meeting_end_time.split(':')[1]) : meetingMin + bufferMinutes;
                               const slotMin = parseInt(slot.split(':')[0]) * 60 + parseInt(slot.split(':')[1]);
                               const slotEndMin = slotMin + bufferMinutes;
                               return slotMin < meetingEndMin && slotEndMin > meetingMin;
                             });
                             const isDisabledSlot = isOccupied || isPast;
                             return (
                               <Button key={slot} type="button"
                                 variant={selectedTime === slot ? 'default' : isDisabledSlot ? 'ghost' : 'outline'}
                                 size="sm" disabled={isDisabledSlot}
                                 onClick={() => handleTimeSelect(slot)}
                                 className={cn('text-xs h-7',
                                   isDisabledSlot && 'opacity-40',
                                   isPast && 'line-through',
                                   selectedTime === slot && 'ring-2 ring-primary'
                                 )}>
                                 {to12Hour(slot)}
                               </Button>
                             );
                           })}
                         </div>
                         {newDate && formatDateForStorage(newDate) === todayStr && (
                           <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                             <Clock className="h-3 w-3" /> Past slots for today are disabled
                           </p>
                         )}
                         {isValidating && <p className="text-[10px] text-muted-foreground">Validating...</p>}
                         {overlapError && <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{overlapError}</p>}
                      </div>
                    </div>
                  )}

                  {/* Reason for Rescheduling – always below both columns */}
                  {newDate && (
                    <div className="space-y-1.5">
                      <Label className="text-xs" htmlFor="rescheduleRemarks">
                        Reason for Rescheduling <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="rescheduleRemarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Please explain why this meeting is being rescheduled..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

        {/* Fixed footer – always visible, never scrolls */}
        <DialogFooter className="px-6 py-3 border-t shrink-0 flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Release Previous Slot Toggle – left-aligned in footer */}
          <div className="flex items-center gap-2.5 flex-1">
            <Switch
              id="releasePreviousSlot"
              checked={releasePreviousSlot}
              onCheckedChange={setReleasePreviousSlot}
              className="shrink-0"
            />
            <div className="min-w-0">
              <Label htmlFor="releasePreviousSlot" className="text-xs font-semibold cursor-pointer block">
                Release Previous Time Slot
              </Label>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {releasePreviousSlot
                  ? <><span className="text-green-600 dark:text-green-400 font-medium">ON</span> — slot <span className="font-medium text-foreground">{currentDate && formatDisplayDate(currentDate)}{currentTime && ` at ${to12Hour(currentTime)}`}</span> will be freed</>
                  : <><span className="text-amber-600 dark:text-amber-400 font-medium">OFF</span> — slot <span className="font-medium text-foreground">{currentDate && formatDisplayDate(currentDate)}{currentTime && ` at ${to12Hour(currentTime)}`}</span> stays blocked</>
                }
              </p>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button type="button" size="sm" onClick={handleSubmit}
              disabled={rescheduleMutation.isPending || !newDate || !selectedOffice || !selectedDepartment || !selectedUserId || !selectedTime || !!overlapError}>
              {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reschedule Meeting
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
