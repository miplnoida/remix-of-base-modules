import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatDisplayDate, parseDateSafe } from '@/lib/dateFormat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCountries, useDistricts, useRelations, useOccupations, useEyeColors } from '@/hooks/useIPMasterLookups';
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
  UserPlus,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ApplicationDocumentsTab } from '@/components/online-applications/ApplicationDocumentsTab';
import { useMeetingDetails, useCloseMeetingWithApproval, useCloseMeetingWithRejection } from '@/hooks/useMeetings';
import { useExternalApplicationDetail } from '@/hooks/useExternalApplicationDetail';
import { CancelMeetingDialog, RescheduleMeetingDialog } from '@/components/meetings';
import { useConvertApplicationToIP } from '@/hooks/useConvertApplicationToIP';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';
import { useValidateApplicationForConversion } from '@/hooks/useValidateApplicationForConversion';
import { ConversionValidationPanel } from '@/components/online-applications/ConversionValidationPanel';
import type { MeetingType } from '@/types/meetings';
import type { ExternalApplicationDetail, ExternalDependant } from '@/types/externalApplication';

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
  const { data: applicationData, isLoading: appLoading, refetch: refetchApplication, isFetching: appFetching } = useExternalApplicationDetail(applicationReference);

  // Validate application for conversion (only for IP-Registration meetings)
  const isIPMeeting = meetingType === 'IP-Registration';
  const { data: validationResult, isLoading: validationLoading } = useValidateApplicationForConversion(
    isIPMeeting ? applicationReference : undefined,
    isIPMeeting ? applicationData : undefined
  );

  // Initialize edited data when application loads
  useEffect(() => {
    if (applicationData) {
      setEditedData({ ...applicationData });
    }
  }, [applicationData]);

  const handleFieldChange = (field: string, value: any) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleRefresh = useCallback(async () => {
    try {
      await refetchApplication();
      setHasChanges(false);
      toast.success('Application data refreshed');
    } catch {
      toast.error('Failed to refresh application data');
    }
  }, [refetchApplication]);

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
          const dataForConversion = hasChanges ? { ...applicationData, ...editedData } : applicationData;
          await convertMutation.mutateAsync({
            applicationDetail: dataForConversion as ExternalApplicationDetail,
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
                {formatDisplayDate(meeting.meeting_date)}
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
            {/* Refresh Button */}
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="gap-2"
              disabled={appFetching}
            >
              {appFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Data
            </Button>

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
              onDataChange={(newData) => { setEditedData(newData); setHasChanges(true); }}
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
  onDataChange: (newData: Record<string, any>) => void;
}

function ApplicationEditForm({ meetingType, data, onChange, onDataChange }: ApplicationEditFormProps) {
  if (meetingType === 'IP-Registration') {
    return <InsuredPersonEditForm data={data} onChange={onChange} onDataChange={onDataChange} />;
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

// Insured Person Edit Form — aligned with ApplicationDetailPage
function InsuredPersonEditForm({ data, onChange, onDataChange }: { data: Record<string, any>; onChange: (field: string, value: any) => void; onDataChange: (newData: Record<string, any>) => void }) {
  // Master table lookups
  const { data: countries } = useCountries();
  const { data: districts } = useDistricts();
  const { data: relations } = useRelations();
  const { data: occupations } = useOccupations();
  const { data: eyeColors } = useEyeColors();

  // Dependant CRUD state
  const [depDialogOpen, setDepDialogOpen] = useState(false);
  const [depEditIndex, setDepEditIndex] = useState<number | null>(null);
  const [depForm, setDepForm] = useState<Record<string, any>>({});
  const [depDeleteIndex, setDepDeleteIndex] = useState<number | null>(null);
  // Document delete state
  const [docDeleteIndex, setDocDeleteIndex] = useState<number | null>(null);

  const dependants: any[] = Array.isArray(data.dependants) ? data.dependants : [];

  const openAddDependant = () => {
    setDepEditIndex(null);
    setDepForm({ id: `temp-${Date.now()}`, ssn: '', firstName: '', middleName: '', lastName: '', dateOfBirth: '', dateOfDeath: '', gender: '', relationship: '', address1: '', address2: '', isSchoolChild: false, isInvalid: false });
    setDepDialogOpen(true);
  };

  const openEditDependant = (index: number) => {
    setDepEditIndex(index);
    const dep = dependants[index];
    // Normalize API field names to form field names
    setDepForm({
      ...dep,
      // address: API may send `address` or `address1`/`address2`
      address1: dep.address1 ?? dep.address ?? '',
      address2: dep.address2 ?? '',
      // isSchoolChild: API sends `isInSchool` or `isSchoolChild`
      isSchoolChild: dep.isSchoolChild ?? dep.isInSchool ?? false,
      isInSchool: dep.isSchoolChild ?? dep.isInSchool ?? false,
      // isInvalid: direct mapping
      isInvalid: dep.isInvalid ?? false,
      // middleName: may not exist in API response
      middleName: dep.middleName ?? '',
      // ssn + dateOfDeath
      ssn: dep.ssn ?? '',
      dateOfDeath: dep.dateOfDeath ?? '',
    });
    setDepDialogOpen(true);
  };

  const saveDependant = () => {
    const updated = [...dependants];
    if (depEditIndex !== null) {
      updated[depEditIndex] = depForm;
    } else {
      updated.push(depForm);
    }
    onDataChange({ ...data, dependants: updated });
    setDepDialogOpen(false);
    toast.success(depEditIndex !== null ? 'Dependant updated' : 'Dependant added');
  };

  const confirmDeleteDependant = () => {
    if (depDeleteIndex === null) return;
    const updated = dependants.filter((_, i) => i !== depDeleteIndex);
    onDataChange({ ...data, dependants: updated });
    setDepDeleteIndex(null);
    toast.success('Dependant removed');
  };

  const confirmDeleteDocument = () => {
    if (docDeleteIndex === null) return;
    const docs: any[] = Array.isArray(data.documents) ? [...data.documents] : [];
    docs.splice(docDeleteIndex, 1);
    onDataChange({ ...data, documents: docs });
    setDocDeleteIndex(null);
    toast.success('Document removed from list');
  };

  // Lookup helpers
  const getCountryName = (code: string | null | undefined): string => {
    if (!code) return '';
    const country = countries?.find(c => c.code === code || c.code === code.toUpperCase());
    return country?.description || code;
  };
  const getNationalityName = (code: string | null | undefined): string => {
    if (!code) return '';
    const country = countries?.find(c => c.code === code || c.code === code.toUpperCase());
    return country?.nationality || country?.description || code;
  };
  const getDistrictName = (code: string | null | undefined): string => {
    if (!code) return '';
    const district = districts?.find(d => d.code === code || d.code === code.toUpperCase());
    return district?.description || code;
  };
  const getRelationName = (code: string | null | undefined): string => {
    if (!code) return '';
    const relation = relations?.find(r => r.code === code || r.code === code.toUpperCase());
    return relation?.description || code;
  };
  const getOccupationName = (code: string | null | undefined): string => {
    if (!code) return '';
    const occupation = occupations?.find(o => o.code === code || o.code === code.toUpperCase());
    return occupation?.short_description || code;
  };

  const resolveNpf = (): string => {
    const raw = data.npfMember;
    if (raw === true || raw === 'true' || raw === 'Y' || raw === 'Yes') return 'Y';
    if (raw === false || raw === 'false' || raw === 'N' || raw === 'No') return 'N';
    const npf = data.npf;
    if (npf === 'Y' || npf === 'N') return npf;
    return '';
  };

  const resolveCitizenship = (): string => {
    const raw = data.isCitizen;
    if (raw === true || raw === 'true' || raw === 'Y' || raw === 'Yes') return 'Y';
    if (raw === false || raw === 'false' || raw === 'N' || raw === 'No') return 'N';
    const cit = data.citizenship;
    if (cit === 'Y' || cit === 'N') return cit;
    return '';
  };

  const formatPhone = (phone: string | null | undefined, dialCode: string | null | undefined) => {
    if (!phone) return '';
    return dialCode ? `(${dialCode}) ${phone}` : phone;
  };

  const formatDateRaw = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    try {
      const dateOnly = dateStr.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[month - 1]} ${day}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="grid w-full grid-cols-7">
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
        <TabsTrigger value="documents" className="gap-1 text-xs">
          <FileText className="h-3 w-3" />
          Documents
        </TabsTrigger>
        <TabsTrigger value="remarks" className="gap-1 text-xs">
          <FileText className="h-3 w-3" />
          Remarks
        </TabsTrigger>
      </TabsList>

      {/* Personal Information Tab */}
      <TabsContent value="personal" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Title dropdown */}
          <div className="space-y-2">
            <Label className="text-sm">Title</Label>
            <Select value={data.title || ''} onValueChange={(v) => onChange('title', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select title" />
              </SelectTrigger>
              <SelectContent>
                {['Dr.', 'Miss.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Rev.'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <EditableField label="First Name" value={data.firstName} onChange={(v) => onChange('firstName', v)} />
          <EditableField label="First Middle Name" value={data.middleName1 || data.middleName} onChange={(v) => onChange('middleName1', v)} />
          <EditableField label="Second Middle Name" value={data.middleName2} onChange={(v) => onChange('middleName2', v)} />
          <EditableField label="Last Name" value={data.lastName} onChange={(v) => onChange('lastName', v)} />
          {/* Suffix dropdown */}
          <div className="space-y-2">
            <Label className="text-sm">Suffix</Label>
            <Select value={data.suffix || ''} onValueChange={(v) => onChange('suffix', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select suffix" />
              </SelectTrigger>
              <SelectContent>
                {['I', 'II', 'III', 'Jr.', 'Sr.'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <EditableField label="Maiden Name" value={data.maidenName} onChange={(v) => onChange('maidenName', v)} />
          <EditableField label="Alias" value={data.alias} onChange={(v) => onChange('alias', v)} />
          <div className="space-y-2">
            <Label className="text-sm">Gender</Label>
            <Select value={data.gender || ''} onValueChange={(v) => onChange('gender', v)}>
              <SelectTrigger className="h-9">
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
          <div className="space-y-2">
            <Label className="text-sm">Place of Birth</Label>
            <Select value={data.placeOfBirth || ''} onValueChange={(v) => onChange('placeOfBirth', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select country">{getCountryName(data.placeOfBirth) || 'Select country'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries?.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.description || c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Nationality</Label>
            <Select value={data.nationality || ''} onValueChange={(v) => onChange('nationality', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select nationality">{getNationalityName(data.nationality) || 'Select nationality'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries?.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.nationality || c.description || c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Marital Status</Label>
            <Select value={data.maritalStatus || ''} onValueChange={(v) => onChange('maritalStatus', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S">Single</SelectItem>
                <SelectItem value="M">Married</SelectItem>
                <SelectItem value="D">Divorced</SelectItem>
                <SelectItem value="W">Widowed</SelectItem>
                <SelectItem value="P">Separated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.maritalStatus === 'M' && (
            <EditableField label="Date Married" value={data.dateMarried} onChange={(v) => onChange('dateMarried', v)} type="date" />
          )}
        </div>
        <Separator />
        <h4 className="font-medium">Physical Characteristics</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Height (Feet)" value={data.heightFeet} onChange={(v) => onChange('heightFeet', v)} type="number" />
          <EditableField label="Height (Inches)" value={data.heightInches} onChange={(v) => onChange('heightInches', v)} type="number" />
          <div className="space-y-2">
            <Label className="text-sm">Eye Color</Label>
            <Select value={data.eyeColor || ''} onValueChange={(v) => onChange('eyeColor', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select eye color" />
              </SelectTrigger>
              <SelectContent>
                {eyeColors?.map(e => (
                  <SelectItem key={e.code} value={e.code}>{e.description || e.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </TabsContent>

      {/* Contact Information Tab */}
      <TabsContent value="contact" className="space-y-4">
        <h4 className="font-medium">Phone & Email</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Mobile Phone" value={data.phoneMobile} onChange={(v) => onChange('phoneMobile', v)} />
          <EditableField label="Home Phone" value={data.phoneHome} onChange={(v) => onChange('phoneHome', v)} />
          <EditableField label="Email" value={data.email} onChange={(v) => onChange('email', v)} type="email" />
        </div>
        <Separator />
        <h4 className="font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Residential Address
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Address Line 1" value={data.addressLine1} onChange={(v) => onChange('addressLine1', v)} />
          <EditableField label="Address Line 2" value={data.addressLine2} onChange={(v) => onChange('addressLine2', v)} />
          <div className="space-y-2">
            <Label className="text-sm">Postal District</Label>
            <Select value={data.postalDistrict || ''} onValueChange={(v) => onChange('postalDistrict', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select district">{getDistrictName(data.postalDistrict) || 'Select district'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {districts?.map(d => (
                  <SelectItem key={d.code} value={d.code}>{d.description || d.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Place of Residency</Label>
            <Select value={data.placeOfResidency || ''} onValueChange={(v) => onChange('placeOfResidency', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select country">{getCountryName(data.placeOfResidency) || 'Select country'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {countries?.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.description || c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Only show Residency Date when Place of Birth differs from Place of Residency */}
          {data.placeOfBirth && data.placeOfResidency && data.placeOfBirth !== data.placeOfResidency && (
            <EditableField label="Residency Date" value={data.residencyDate} onChange={(v) => onChange('residencyDate', v)} type="date" />
          )}
          {(!data.placeOfBirth || !data.placeOfResidency) && (
            <EditableField label="Residency Date" value={data.residencyDate} onChange={(v) => onChange('residencyDate', v)} type="date" />
          )}
        </div>
        <Separator />
        <h4 className="font-medium">Mailing Address</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Mailing Address 1" value={data.mailingAddr1} onChange={(v) => onChange('mailingAddr1', v)} />
          <EditableField label="Mailing Address 2" value={data.mailingAddr2} onChange={(v) => onChange('mailingAddr2', v)} />
        </div>
        <Separator />
        <h4 className="font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Emergency Contact
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Name" value={data.contactName} onChange={(v) => onChange('contactName', v)} />
          <div className="space-y-2">
            <Label className="text-sm">Relationship</Label>
            <Select value={data.contactRelation || ''} onValueChange={(v) => onChange('contactRelation', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select relation">{getRelationName(data.contactRelation) || 'Select relation'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {relations?.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <EditableField label="Address Line 1" value={data.contactAddress1 || data.contactAddress} onChange={(v) => onChange('contactAddress1', v)} />
          <EditableField label="Address Line 2" value={data.contactAddress2} onChange={(v) => onChange('contactAddress2', v)} />
          <EditableField label="Phone" value={data.contactPhone} onChange={(v) => onChange('contactPhone', v)} />
          <EditableField label="Mobile" value={data.contactMobile} onChange={(v) => onChange('contactMobile', v)} />
          <EditableField label="Email" value={data.contactEmail} onChange={(v) => onChange('contactEmail', v)} type="email" />
        </div>
      </TabsContent>

      {/* Relations Tab */}
      <TabsContent value="relations" className="space-y-4">
        <h4 className="font-medium">Parent's Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Father's Name" value={data.fatherName || [data.fatherFirstName, data.fatherLastName].filter(Boolean).join(' ')} onChange={(v) => onChange('fatherName', v)} />
          <EditableField label="Mother's Name" value={data.motherName || [data.motherFirstName, data.motherLastName].filter(Boolean).join(' ')} onChange={(v) => onChange('motherName', v)} />
        </div>
        <Separator />
        <h4 className="font-medium">Spouse Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Name" value={data.spouseName || [data.spouseFirstName, data.spouseLastName].filter(Boolean).join(' ') || ''} onChange={(v) => onChange('spouseName', v)} />
          <EditableField label="SSN" value={data.spouseSSN} onChange={(v) => onChange('spouseSSN', v)} />
          <EditableField label="Date of Birth" value={data.spouseDOB || data.spouseDateOfBirth} onChange={(v) => onChange('spouseDOB', v)} type="date" />
          <EditableField label="Address Line 1" value={data.spouseAddress1} onChange={(v) => onChange('spouseAddress1', v)} />
          <EditableField label="Address Line 2" value={data.spouseAddress2} onChange={(v) => onChange('spouseAddress2', v)} />
        </div>
        <Separator />
        <h4 className="font-medium">Beneficiary Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Name" value={data.beneficiaryName} onChange={(v) => onChange('beneficiaryName', v)} />
          <EditableField label="Address Line 1" value={data.beneficiaryAddress1 || data.beneficiaryAddress} onChange={(v) => onChange('beneficiaryAddress1', v)} />
          <EditableField label="Address Line 2" value={data.beneficiaryAddress2} onChange={(v) => onChange('beneficiaryAddress2', v)} />
        </div>
        <Separator />
        <h4 className="font-medium">Witness Information</h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Witness Name" value={data.witnessName} onChange={(v) => onChange('witnessName', v)} />
          <EditableField label="Witness Date" value={data.witnessDate} onChange={(v) => onChange('witnessDate', v)} type="date" />
        </div>
      </TabsContent>

      {/* Employment Tab */}
      <TabsContent value="employment" className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Has Work Permit</Label>
            <Select value={data.hasWorkPermit === true || data.hasWorkPermit === 'true' ? 'Y' : 'N'} onValueChange={(v) => onChange('hasWorkPermit', v === 'Y')}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Yes</SelectItem>
                <SelectItem value="N">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(data.hasWorkPermit === true || data.hasWorkPermit === 'true') && (
            <EditableField label="Work Permit Expiry" value={data.workPermitExpiry} onChange={(v) => onChange('workPermitExpiry', v)} type="date" />
          )}
          <div className="space-y-2">
            <Label className="text-sm">Occupation</Label>
            <Select value={data.occupationCode || data.occupation || ''} onValueChange={(v) => onChange('occupationCode', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select occupation">{data.occupationName || getOccupationName(data.occupationCode || data.occupation) || 'Select occupation'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {occupations?.map(o => (
                  <SelectItem key={o.code} value={o.code}>{o.short_description || o.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">NPF</Label>
            <Select value={resolveNpf()} onValueChange={(v) => { onChange('npf', v); onChange('npfMember', v === 'Y'); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Yes</SelectItem>
                <SelectItem value="N">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Citizenship</Label>
            <Select value={resolveCitizenship()} onValueChange={(v) => { onChange('citizenship', v); onChange('isCitizen', v === 'Y'); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Y">Yes</SelectItem>
                <SelectItem value="N">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator />
        <h4 className="font-medium flex items-center gap-2">
          <Building className="h-4 w-4" />
          Employer Details
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <EditableField label="Employer Name" value={data.employerName} onChange={(v) => onChange('employerName', v)} />
          <EditableField label="Address" value={data.employerAddress} onChange={(v) => onChange('employerAddress', v)} />
          <EditableField label="Town" value={data.employerTown} onChange={(v) => onChange('employerTown', v)} />
          <EditableField label="Phone" value={data.employerPhone} onChange={(v) => onChange('employerPhone', v)} />
        </div>
      </TabsContent>

      {/* Dependants Tab */}
      <TabsContent value="dependants" className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Dependants ({dependants.length})
          </h4>
          <Button size="sm" onClick={openAddDependant} className="gap-1">
            <Plus className="h-4 w-4" />
            Add Dependant
          </Button>
        </div>
        {dependants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>School Child</TableHead>
                <TableHead>Invalid</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dependants.map((dep: any, index: number) => (
                <TableRow key={dep.id || index}>
                  <TableCell className="font-medium">{dep.firstName} {dep.lastName}</TableCell>
                  <TableCell>{formatDateRaw(dep.dateOfBirth)}</TableCell>
                  <TableCell>{dep.gender === 'M' ? 'Male' : dep.gender === 'F' ? 'Female' : dep.gender === 'N' ? 'Not-Specified' : dep.gender || '—'}</TableCell>
                  <TableCell>{getRelationName(dep.relationship)}</TableCell>
                  <TableCell>{dep.address1 || (dep.livesAtSameAddress ? 'Same as Applicant' : dep.address) || '—'}</TableCell>
                  <TableCell>
                    {(dep.isSchoolChild ?? dep.isInSchool) ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {dep.isInvalid ? (
                      <Badge variant="destructive">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEditDependant(index)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDepDeleteIndex(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No dependants registered</p>
          </div>
        )}

        {/* Dependant Add/Edit Dialog */}
        <Dialog open={depDialogOpen} onOpenChange={setDepDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{depEditIndex !== null ? 'Edit Dependent' : 'Add Dependent'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Row 1: SSN + Relation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Dependent SSN (6 digits)</Label>
                  <Input
                    placeholder="Enter 6-digit SSN to auto-fill"
                    value={depForm.ssn || ''}
                    maxLength={6}
                    onChange={(e) => setDepForm(p => ({ ...p, ssn: e.target.value.replace(/\D/g, '') }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Relation</Label>
                  <Select value={depForm.relationship || ''} onValueChange={(v) => setDepForm(p => ({ ...p, relationship: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select relation">
                        {depForm.relationship ? (getRelationName(depForm.relationship) || depForm.relationship) : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {relations?.map(r => (
                        <SelectItem key={r.code} value={r.code}>{r.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: First Name + Middle Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    First Name <span className="text-destructive">*</span>{' '}
                    <span className="text-muted-foreground font-normal">{(depForm.firstName || '').length}/25</span>
                  </Label>
                  <Input
                    placeholder="Enter first name"
                    value={depForm.firstName || ''}
                    maxLength={25}
                    onChange={(e) => setDepForm(p => ({ ...p, firstName: e.target.value }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Middle Name{' '}
                    <span className="text-muted-foreground font-normal">{(depForm.middleName || '').length}/25</span>
                  </Label>
                  <Input
                    placeholder="Enter middle name"
                    value={depForm.middleName || ''}
                    maxLength={25}
                    onChange={(e) => setDepForm(p => ({ ...p, middleName: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Row 3: Surname + Date of Birth */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Surname <span className="text-destructive">*</span>{' '}
                    <span className="text-muted-foreground font-normal">{(depForm.lastName || '').length}/25</span>
                  </Label>
                  <Input
                    placeholder="Enter surname"
                    value={depForm.lastName || ''}
                    maxLength={25}
                    onChange={(e) => setDepForm(p => ({ ...p, lastName: e.target.value }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Date of Birth</Label>
                  <Input
                    type="date"
                    value={depForm.dateOfBirth?.split('T')[0] || ''}
                    onChange={(e) => setDepForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Row 4: Gender + Date of Death */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Gender</Label>
                  <Select value={depForm.gender || ''} onValueChange={(v) => setDepForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="N">Not-Specified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Date of Death</Label>
                  <Input
                    type="date"
                    value={depForm.dateOfDeath?.split('T')[0] || ''}
                    onChange={(e) => setDepForm(p => ({ ...p, dateOfDeath: e.target.value }))}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Row 5: Address Line 1 (full width) */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Address Line 1{' '}
                  <span className="text-muted-foreground font-normal">{(depForm.address1 || '').length}/50</span>
                </Label>
                <Input
                  placeholder="Enter address"
                  value={depForm.address1 || ''}
                  maxLength={50}
                  onChange={(e) => setDepForm(p => ({ ...p, address1: e.target.value }))}
                  className="h-10"
                />
              </div>

              {/* Row 6: Address Line 2 (full width) */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Address Line 2{' '}
                  <span className="text-muted-foreground font-normal">{(depForm.address2 || '').length}/50</span>
                </Label>
                <Input
                  placeholder="Enter address"
                  value={depForm.address2 || ''}
                  maxLength={50}
                  onChange={(e) => setDepForm(p => ({ ...p, address2: e.target.value }))}
                  className="h-10"
                />
              </div>

              {/* Row 7: Checkboxes */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dep-school-child"
                    checked={!!depForm.isSchoolChild}
                    onCheckedChange={(v) => setDepForm(p => ({ ...p, isSchoolChild: !!v, isInSchool: !!v }))}
                  />
                  <Label htmlFor="dep-school-child" className="text-sm font-medium cursor-pointer">School Child</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dep-invalid"
                    checked={!!depForm.isInvalid}
                    onCheckedChange={(v) => setDepForm(p => ({ ...p, isInvalid: !!v }))}
                  />
                  <Label htmlFor="dep-invalid" className="text-sm font-medium cursor-pointer">Invalid</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveDependant} disabled={!depForm.firstName?.trim() || !depForm.lastName?.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dependant Delete Confirmation */}
        <Dialog open={depDeleteIndex !== null} onOpenChange={(open) => { if (!open) setDepDeleteIndex(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Dependant
              </DialogTitle>
              <DialogDescription>
                Remove this dependant from the list? This change is in-memory only and will not affect the database until the application is approved.
              </DialogDescription>
            </DialogHeader>
            {depDeleteIndex !== null && dependants[depDeleteIndex] && (
              <p className="font-medium py-2">{dependants[depDeleteIndex].firstName} {dependants[depDeleteIndex].lastName}</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepDeleteIndex(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteDependant}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="space-y-4">
        <ApplicationDocumentsTab 
          documents={data.documents} 
          photoUrl={data.photoUrl}
          onDelete={(index: number) => setDocDeleteIndex(index)}
          showDelete
        />

        {/* Document Delete Confirmation */}
        <Dialog open={docDeleteIndex !== null} onOpenChange={(open) => { if (!open) setDocDeleteIndex(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Remove Document
              </DialogTitle>
              <DialogDescription>
                Remove this document from the list? This change is in-memory only and will not affect storage or the database.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDocDeleteIndex(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteDocument}>Remove</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Remarks Tab */}
      <TabsContent value="remarks" className="space-y-4">
        {data.remarks ? (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="whitespace-pre-wrap">{data.remarks}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No remarks provided</p>
          </div>
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
