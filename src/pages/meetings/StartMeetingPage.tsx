import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Phone,
  Mail,
  Briefcase,
  Users,
  Heart,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useMeetingDetails, useCloseMeetingWithApproval, useCloseMeetingWithRejection } from '@/hooks/useMeetings';
import { useExternalApplicationDetail } from '@/hooks/useExternalApplicationDetail';
import { CancelMeetingDialog, RescheduleMeetingDialog } from '@/components/meetings';
import { useConvertApplicationToIP } from '@/hooks/useConvertApplicationToIP';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';
import type { MeetingType } from '@/types/meetings';
import type { ExternalApplicationDetail } from '@/types/externalApplication';

const meetingTypeLabels: Record<MeetingType, string> = {
  'IP-Registration': 'Insured Person',
  'Employer-Registration': 'Employer',
  'Doctor-Registration': 'Doctor',
  'General': 'General'
};

export default function StartMeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  
  const { data: meetingData, isLoading: meetingLoading, error: meetingError, refetch: refetchMeeting } = useMeetingDetails(meetingId);
  
  // Local state for edited application data
  const [editedData, setEditedData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dialogs
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  
  // Mutations
  const approveMutation = useCloseMeetingWithApproval();
  const rejectMutation = useCloseMeetingWithRejection();
  const convertMutation = useConvertApplicationToIP();
  const { user } = useSupabaseAuth();

  // Get application reference from meeting
  const applicationReference = meetingData?.meeting?.application_reference;
  const meetingType = meetingData?.meeting?.meeting_type;
  
  // Fetch application data based on meeting type
  const { data: applicationData, isLoading: appLoading } = useExternalApplicationDetail(applicationReference);

  // Initialize edited data when application loads
  useEffect(() => {
    if (applicationData) {
      setEditedData(applicationData);
    }
  }, [applicationData]);

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleApprove = async () => {
    if (!meetingId) return;
    
    try {
      await approveMutation.mutateAsync({
        meetingId,
        applicationData: hasChanges ? editedData : undefined,
        remarks: approvalRemarks || undefined
      });

      // Convert the approved application to ip_master record
      if (meetingType === 'IP-Registration' && applicationData) {
        try {
          await convertMutation.mutateAsync({
            applicationDetail: applicationData as ExternalApplicationDetail,
            approvedBy: user?.id || '',
            sourceRoute: `/meetings/start/${meetingId}`,
          });
        } catch (convErr: any) {
          console.error('IP conversion after approval:', convErr);
          // Don't block navigation - approval already succeeded
          if (!convErr.message?.includes('DUPLICATE_CONVERSION')) {
            toast.warning('Application approved but IP record conversion needs attention.');
          }
        }
      }
      
      setApprovalDialogOpen(false);
      navigate('/meetings/manage');
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const handleReject = async () => {
    if (!meetingId || !rejectRemarks.trim()) {
      toast.error('Please provide rejection remarks');
      return;
    }
    
    try {
      await rejectMutation.mutateAsync({
        meetingId,
        remarks: rejectRemarks.trim()
      });
      
      setRejectDialogOpen(false);
      navigate('/meetings/manage');
    } catch (error) {
      console.error('Rejection failed:', error);
    }
  };

  const handleActionComplete = () => {
    refetchMeeting();
    navigate('/meetings/manage');
  };

  const formatTime = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return time;
    }
  };

  if (meetingLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (meetingError || !meetingData?.meeting) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Meeting Not Found</AlertTitle>
          <AlertDescription>
            The meeting could not be loaded. It may have been cancelled or does not exist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { meeting } = meetingData;

  // Check if meeting is in valid state
  if (!['InProgress', 'Scheduled', 'Rescheduled'].includes(meeting.status)) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/meetings/manage')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Button>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Meeting Already Completed</AlertTitle>
          <AlertDescription>
            This meeting has been {meeting.status.toLowerCase()}. You cannot perform further actions.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/meetings/manage')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Meeting In Progress</h1>
            <p className="text-muted-foreground">
              Review and process application during meeting
            </p>
          </div>
        </div>
      </div>

      {/* Meeting Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Meeting Reference</Label>
              <p className="font-semibold">{meeting.meeting_reference}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Application Reference</Label>
              <p className="font-semibold">{meeting.application_reference}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Applicant Type</Label>
              <Badge variant="outline">{meetingTypeLabels[meeting.meeting_type]}</Badge>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Scheduled Date/Time</Label>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(meeting.meeting_date), 'dd MMM yyyy')}
                <Clock className="h-4 w-4 ml-2" />
                {formatTime(meeting.meeting_time)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Current Workflow Step</Label>
              <p className="font-medium">{meeting.workflow_steps?.step_name || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Approve Button */}
            <Button
              onClick={() => setApprovalDialogOpen(true)}
              className="gap-2"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Approve Application
            </Button>

            {/* Reject Button */}
            <Button
              variant="destructive"
              onClick={() => setRejectDialogOpen(true)}
              className="gap-2"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject Application
            </Button>

            {/* Reschedule Button */}
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reschedule Meeting
            </Button>

            {/* Cancel Meeting Button */}
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(true)}
              className="gap-2 text-destructive"
            >
              <XCircle className="h-4 w-4" />
              Cancel Meeting
            </Button>
          </div>
          
          {hasChanges && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. These will be saved when you approve the application.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Application Form - Editable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Details
          </CardTitle>
          <CardDescription>
            Review and edit application information as needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : applicationData ? (
            <ApplicationEditForm
              meetingType={meeting.meeting_type}
              data={editedData}
              onChange={handleFieldChange}
            />
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Unable to load application data. Please verify the application reference.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Confirm Approval
            </DialogTitle>
            <DialogDescription>
              This will approve the application and complete the meeting.
              {hasChanges && ' All edits will be saved.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="approvalRemarks">Remarks (Optional)</Label>
            <Textarea
              id="approvalRemarks"
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Add any approval notes..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Confirm Rejection
            </DialogTitle>
            <DialogDescription>
              This will reject the application. Edited data will not be saved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectRemarks">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejectRemarks"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="Please explain the reason for rejection..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectRemarks.trim()}
            >
              {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Meeting Dialog */}
      {meetingId && (
        <CancelMeetingDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          meetingId={meetingId}
          meetingReference={meeting.meeting_reference}
          onSuccess={handleActionComplete}
        />
      )}

      {/* Reschedule Meeting Dialog */}
      {meetingId && (
        <RescheduleMeetingDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          meetingId={meetingId}
          meetingReference={meeting.meeting_reference}
          currentDate={meeting.meeting_date}
          currentTime={meeting.meeting_time}
          workflowId={meeting.workflow_id}
          onSuccess={handleActionComplete}
        />
      )}
    </div>
  );
}

// Editable Application Form Component
interface ApplicationEditFormProps {
  meetingType: MeetingType;
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

function ApplicationEditForm({ meetingType, data, onChange }: ApplicationEditFormProps) {
  if (meetingType === 'IP-Registration') {
    return <InsuredPersonEditForm data={data} onChange={onChange} />;
  }
  
  if (meetingType === 'Employer-Registration') {
    return <EmployerEditForm data={data} onChange={onChange} />;
  }
  
  if (meetingType === 'Doctor-Registration') {
    return <DoctorEditForm data={data} onChange={onChange} />;
  }
  
  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>Unknown application type</AlertDescription>
    </Alert>
  );
}

// Insured Person Edit Form
function InsuredPersonEditForm({ data, onChange }: { data: Record<string, any>; onChange: (field: string, value: any) => void }) {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="personal" className="gap-1 text-xs">
          <User className="h-3 w-3" />
          Personal
        </TabsTrigger>
        <TabsTrigger value="contact" className="gap-1 text-xs">
          <Phone className="h-3 w-3" />
          Contact
        </TabsTrigger>
        <TabsTrigger value="relations" className="gap-1 text-xs">
          <Heart className="h-3 w-3" />
          Relations
        </TabsTrigger>
        <TabsTrigger value="employment" className="gap-1 text-xs">
          <Briefcase className="h-3 w-3" />
          Employment
        </TabsTrigger>
        <TabsTrigger value="dependants" className="gap-1 text-xs">
          <Users className="h-3 w-3" />
          Dependants
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Title" value={data.title} onChange={(v) => onChange('title', v)} />
          <EditableField label="First Name" value={data.firstName} onChange={(v) => onChange('firstName', v)} />
          <EditableField label="Middle Name" value={data.middleName} onChange={(v) => onChange('middleName', v)} />
          <EditableField label="Last Name" value={data.lastName} onChange={(v) => onChange('lastName', v)} />
          <EditableField label="Maiden Name" value={data.maidenName} onChange={(v) => onChange('maidenName', v)} />
          <EditableField label="Alias" value={data.alias} onChange={(v) => onChange('alias', v)} />
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={data.gender || ''} onValueChange={(v) => onChange('gender', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="N">Not-Specified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <EditableField label="Date of Birth" value={data.dateOfBirth} onChange={(v) => onChange('dateOfBirth', v)} type="date" />
          <EditableField label="Place of Birth" value={data.placeOfBirth} onChange={(v) => onChange('placeOfBirth', v)} />
          <EditableField label="Nationality" value={data.nationality} onChange={(v) => onChange('nationality', v)} />
        </div>
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Email" value={data.email} onChange={(v) => onChange('email', v)} type="email" />
          <EditableField label="Mobile Phone" value={data.phoneMobile} onChange={(v) => onChange('phoneMobile', v)} />
          <EditableField label="Home Phone" value={data.phoneHome} onChange={(v) => onChange('phoneHome', v)} />
          <EditableField label="Work Phone" value={data.phoneWork} onChange={(v) => onChange('phoneWork', v)} />
        </div>
        <Separator />
        <h4 className="font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Address
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Address Line 1" value={data.addressLine1} onChange={(v) => onChange('addressLine1', v)} />
          <EditableField label="Address Line 2" value={data.addressLine2} onChange={(v) => onChange('addressLine2', v)} />
          <EditableField label="City" value={data.city} onChange={(v) => onChange('city', v)} />
          <EditableField label="Parish" value={data.parish} onChange={(v) => onChange('parish', v)} />
          <EditableField label="Country" value={data.country} onChange={(v) => onChange('country', v)} />
        </div>
      </TabsContent>

      <TabsContent value="relations" className="space-y-4">
        <h4 className="font-medium">Father's Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="First Name" value={data.fatherFirstName} onChange={(v) => onChange('fatherFirstName', v)} />
          <EditableField label="Last Name" value={data.fatherLastName} onChange={(v) => onChange('fatherLastName', v)} />
          <EditableField label="SSN" value={data.fatherSSN} onChange={(v) => onChange('fatherSSN', v)} />
        </div>
        <Separator />
        <h4 className="font-medium">Mother's Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="First Name" value={data.motherFirstName} onChange={(v) => onChange('motherFirstName', v)} />
          <EditableField label="Last Name" value={data.motherLastName} onChange={(v) => onChange('motherLastName', v)} />
          <EditableField label="Maiden Name" value={data.motherMaidenName} onChange={(v) => onChange('motherMaidenName', v)} />
        </div>
        <Separator />
        <h4 className="font-medium">Spouse Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="First Name" value={data.spouseFirstName} onChange={(v) => onChange('spouseFirstName', v)} />
          <EditableField label="Last Name" value={data.spouseLastName} onChange={(v) => onChange('spouseLastName', v)} />
          <EditableField label="SSN" value={data.spouseSSN} onChange={(v) => onChange('spouseSSN', v)} />
        </div>
      </TabsContent>

      <TabsContent value="employment" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Occupation" value={data.occupation} onChange={(v) => onChange('occupation', v)} />
          <EditableField label="Employer Name" value={data.employerName} onChange={(v) => onChange('employerName', v)} />
          <EditableField label="Employer Address" value={data.employerAddress} onChange={(v) => onChange('employerAddress', v)} />
          <EditableField label="Employer Town" value={data.employerTown} onChange={(v) => onChange('employerTown', v)} />
          <EditableField label="Employer Phone" value={data.employerPhone} onChange={(v) => onChange('employerPhone', v)} />
          <EditableField label="Employment Start Date" value={data.employmentStartDate} onChange={(v) => onChange('employmentStartDate', v)} type="date" />
        </div>
      </TabsContent>

      <TabsContent value="dependants" className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Dependant information is displayed in read-only mode. Use the dedicated dependants management screen to make changes.
        </p>
        {data.dependants && Array.isArray(data.dependants) && data.dependants.length > 0 ? (
          <div className="space-y-2">
            {data.dependants.map((dep: any, index: number) => (
              <div key={index} className="p-3 border rounded-lg">
                <p className="font-medium">{dep.firstName} {dep.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {dep.relationship} • DOB: {dep.dateOfBirth}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No dependants registered</p>
        )}
      </TabsContent>
    </Tabs>
  );
}

// Employer Edit Form
function EmployerEditForm({ data, onChange }: { data: Record<string, any>; onChange: (field: string, value: any) => void }) {
  return (
    <Tabs defaultValue="business" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="business" className="gap-1 text-xs">
          <Building className="h-3 w-3" />
          Business
        </TabsTrigger>
        <TabsTrigger value="contact" className="gap-1 text-xs">
          <Phone className="h-3 w-3" />
          Contact
        </TabsTrigger>
        <TabsTrigger value="address" className="gap-1 text-xs">
          <MapPin className="h-3 w-3" />
          Address
        </TabsTrigger>
        <TabsTrigger value="officials" className="gap-1 text-xs">
          <Users className="h-3 w-3" />
          Officials
        </TabsTrigger>
      </TabsList>

      <TabsContent value="business" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Business Name" value={data.businessName} onChange={(v) => onChange('businessName', v)} />
          <EditableField label="Trade Name" value={data.tradeName} onChange={(v) => onChange('tradeName', v)} />
          <EditableField label="Business Type" value={data.businessType} onChange={(v) => onChange('businessType', v)} />
          <EditableField label="Tax ID" value={data.taxId} onChange={(v) => onChange('taxId', v)} />
          <EditableField label="Date Established" value={data.dateEstablished} onChange={(v) => onChange('dateEstablished', v)} type="date" />
          <EditableField label="Number of Employees" value={data.numberOfEmployees} onChange={(v) => onChange('numberOfEmployees', v)} type="number" />
        </div>
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Email" value={data.email} onChange={(v) => onChange('email', v)} type="email" />
          <EditableField label="Phone" value={data.phone} onChange={(v) => onChange('phone', v)} />
          <EditableField label="Fax" value={data.fax} onChange={(v) => onChange('fax', v)} />
          <EditableField label="Website" value={data.website} onChange={(v) => onChange('website', v)} />
        </div>
      </TabsContent>

      <TabsContent value="address" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Address Line 1" value={data.addressLine1} onChange={(v) => onChange('addressLine1', v)} />
          <EditableField label="Address Line 2" value={data.addressLine2} onChange={(v) => onChange('addressLine2', v)} />
          <EditableField label="City" value={data.city} onChange={(v) => onChange('city', v)} />
          <EditableField label="Parish" value={data.parish} onChange={(v) => onChange('parish', v)} />
          <EditableField label="Country" value={data.country} onChange={(v) => onChange('country', v)} />
          <EditableField label="Postal Code" value={data.postalCode} onChange={(v) => onChange('postalCode', v)} />
        </div>
      </TabsContent>

      <TabsContent value="officials" className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Officials and owners are displayed in read-only mode.
        </p>
        {data.officials && Array.isArray(data.officials) && data.officials.length > 0 ? (
          <div className="space-y-2">
            {data.officials.map((official: any, index: number) => (
              <div key={index} className="p-3 border rounded-lg">
                <p className="font-medium">{official.name}</p>
                <p className="text-sm text-muted-foreground">
                  {official.position} • {official.email}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No officials registered</p>
        )}
      </TabsContent>
    </Tabs>
  );
}

// Doctor Edit Form
function DoctorEditForm({ data, onChange }: { data: Record<string, any>; onChange: (field: string, value: any) => void }) {
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="personal" className="gap-1 text-xs">
          <User className="h-3 w-3" />
          Personal
        </TabsTrigger>
        <TabsTrigger value="professional" className="gap-1 text-xs">
          <Briefcase className="h-3 w-3" />
          Professional
        </TabsTrigger>
        <TabsTrigger value="contact" className="gap-1 text-xs">
          <Phone className="h-3 w-3" />
          Contact
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Title" value={data.title} onChange={(v) => onChange('title', v)} />
          <EditableField label="First Name" value={data.firstName} onChange={(v) => onChange('firstName', v)} />
          <EditableField label="Last Name" value={data.lastName} onChange={(v) => onChange('lastName', v)} />
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={data.gender || ''} onValueChange={(v) => onChange('gender', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="N">Not-Specified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <EditableField label="Date of Birth" value={data.dateOfBirth} onChange={(v) => onChange('dateOfBirth', v)} type="date" />
          <EditableField label="Nationality" value={data.nationality} onChange={(v) => onChange('nationality', v)} />
        </div>
      </TabsContent>

      <TabsContent value="professional" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Medical License Number" value={data.licenseNumber} onChange={(v) => onChange('licenseNumber', v)} />
          <EditableField label="Specialty" value={data.specialty} onChange={(v) => onChange('specialty', v)} />
          <EditableField label="Years of Experience" value={data.yearsOfExperience} onChange={(v) => onChange('yearsOfExperience', v)} type="number" />
          <EditableField label="Practice Name" value={data.practiceName} onChange={(v) => onChange('practiceName', v)} />
          <EditableField label="Practice Address" value={data.practiceAddress} onChange={(v) => onChange('practiceAddress', v)} />
        </div>
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Email" value={data.email} onChange={(v) => onChange('email', v)} type="email" />
          <EditableField label="Phone" value={data.phone} onChange={(v) => onChange('phone', v)} />
          <EditableField label="Office Phone" value={data.officePhone} onChange={(v) => onChange('officePhone', v)} />
        </div>
        <Separator />
        <h4 className="font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Address
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Address Line 1" value={data.addressLine1} onChange={(v) => onChange('addressLine1', v)} />
          <EditableField label="Address Line 2" value={data.addressLine2} onChange={(v) => onChange('addressLine2', v)} />
          <EditableField label="City" value={data.city} onChange={(v) => onChange('city', v)} />
          <EditableField label="Parish" value={data.parish} onChange={(v) => onChange('parish', v)} />
          <EditableField label="Country" value={data.country} onChange={(v) => onChange('country', v)} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

// Reusable Editable Field Component
function EditableField({
  label,
  value,
  onChange,
  type = 'text'
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: 'text' | 'email' | 'date' | 'number';
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="h-9"
      />
    </div>
  );
}
