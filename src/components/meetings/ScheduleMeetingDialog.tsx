import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { useScheduleMeeting } from '@/hooks/useMeetings';
import { useSystemSettingsContext } from '@/contexts/SystemSettingsContext';
import type { MeetingType, ScheduleMeetingFormData } from '@/types/meetings';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

const formSchema = z.object({
  meetingDate: z.date({ required_error: 'Meeting date is required' }),
  meetingTime: z.string().min(1, 'Meeting time is required'),
  contactPerson: z.string().min(1, 'Contact person is required'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  officeAddress: z.string().min(1, 'Office address is required'),
  remarks: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const scheduleMutation = useScheduleMeeting();

  const defaultAddress = getSetting('default_office_address', 'Social Security Board, Bay Road, Basseterre, St. Kitts');
  const contactName = profile?.full_name || user?.email || '';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meetingDate: undefined,
      meetingTime: '',
      contactPerson: contactName,
      contactEmail: user?.email || '',
      contactPhone: '',
      officeAddress: defaultAddress,
      remarks: ''
    }
  });

  const onSubmit = async (values: FormValues) => {
    const formData: ScheduleMeetingFormData = {
      applicationReference,
      meetingType,
      workflowInstanceId,
      workflowId,
      stepId,
      meetingDate: format(values.meetingDate, 'yyyy-MM-dd'),
      meetingTime: values.meetingTime,
      contactPerson: values.contactPerson,
      contactEmail: values.contactEmail || undefined,
      contactPhone: values.contactPhone || undefined,
      officeAddress: values.officeAddress,
      remarks: values.remarks || undefined
    };

    const result = await scheduleMutation.mutateAsync(formData);
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    onOpenChange(false);
    form.reset();
  };

  const getMeetingTypeLabel = (type: MeetingType): string => {
    switch (type) {
      case 'IP-Registration': return 'Insured Person Registration';
      case 'Employer-Registration': return 'Employer Registration';
      case 'Doctor-Registration': return 'Doctor Registration';
      default: return 'General';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Meeting</DialogTitle>
          <DialogDescription>
            Schedule a meeting for application review
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Read-only Application Info */}
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meeting Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !form.watch('meetingDate') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('meetingDate') 
                      ? format(form.watch('meetingDate'), 'PPP')
                      : 'Select date'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('meetingDate')}
                    onSelect={(date) => {
                      form.setValue('meetingDate', date as Date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.meetingDate && (
                <p className="text-xs text-destructive">{form.formState.errors.meetingDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Meeting Time *</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  className="pl-10"
                  {...form.register('meetingTime')}
                />
              </div>
              {form.formState.errors.meetingTime && (
                <p className="text-xs text-destructive">{form.formState.errors.meetingTime.message}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-2">
            <Label>Contact Person *</Label>
            <Input {...form.register('contactPerson')} placeholder="Enter contact name" />
            {form.formState.errors.contactPerson && (
              <p className="text-xs text-destructive">{form.formState.errors.contactPerson.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" {...form.register('contactEmail')} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input {...form.register('contactPhone')} placeholder="+1-869-..." />
            </div>
          </div>

          {/* Office Address */}
          <div className="space-y-2">
            <Label>Office Address *</Label>
            <Textarea 
              {...form.register('officeAddress')} 
              placeholder="Enter meeting location"
              rows={2}
            />
            {form.formState.errors.officeAddress && (
              <p className="text-xs text-destructive">{form.formState.errors.officeAddress.message}</p>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea 
              {...form.register('remarks')} 
              placeholder="Additional notes or instructions..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={scheduleMutation.isPending}>
              {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
