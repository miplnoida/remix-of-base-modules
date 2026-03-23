import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Briefcase, 
  Building2,
  Mail, 
  Phone, 
  MapPin,
  RefreshCw,
  AlertTriangle,
  Loader2,
  FileText,
  Users,
  Globe,
  ClipboardCheck,
  UserCircle,
  Factory,
  ScrollText,
  MessageSquare,
  Play,
  Calendar,
  Monitor,
  StickyNote,
  Download,
  Eye,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { useEmployerApplicationDetail } from '@/hooks/useEmployerApplicationDetail';
import { getEmployerStatusVariant } from '@/hooks/useEmployerApplications';
import { WorkflowActionButtons } from '@/components/workflow/WorkflowActionButtons';
import { MeetingActionButtons } from '@/components/meetings/MeetingActionButtons';
import { useApplicationMeeting } from '@/hooks/useApplicationMeeting';
import { toast } from 'sonner';

// Helper functions
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

function formatPhone(phone: string | null | undefined, dialCode: string | null | undefined): string {
  if (!phone) return '—';
  if (dialCode) return `(${dialCode}) ${phone}`;
  return phone;
}

function formatStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    submitted: 'Submitted',
    in_progress: 'In Progress',
    active: 'Active',
    under_review: 'Under Review',
    cancelled: 'Cancelled',
    appointment_scheduled: 'Appointment Scheduled',
  };
  return statusMap[status?.toLowerCase()] || status;
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value ? 'Yes' : 'No';
}

// Detail field component for review layout
function DetailField({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

// Section header component
function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function EmployerApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  
  const { data: application, isLoading, error, isFetching, refetch } = useEmployerApplicationDetail(applicationId);

  // Meeting integration
  const applicationRef = application?.reference_number || application?.id || applicationId;
  const { meeting, isLoading: isMeetingLoading, invalidate: invalidateMeeting } = useApplicationMeeting(applicationRef);

  const handleActionComplete = () => {
    refetch();
    invalidateMeeting();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Application</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Application Not Found</AlertTitle>
          <AlertDescription>
            The requested employer application could not be found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalEmployees = (application.male_count || 0) + (application.female_count || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              Employer Application Review
            </h1>
            <p className="text-muted-foreground">
              {application.reference_number || application.id} • Submitted {formatDate(application.submitted_at || application.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={getEmployerStatusVariant(application.status)} className="text-sm px-3 py-1">
            {formatStatusDisplay(application.status)}
          </Badge>

          {meeting && meeting.status === 'InProgress' && (
            <Button variant="default" className="gap-2" onClick={() => navigate(`/meetings/start/${meeting.id}`)}>
              <Play className="h-4 w-4" />
              Go to Meeting
            </Button>
          )}

          {meeting && meeting.status !== 'InProgress' && (
            <MeetingActionButtons meeting={meeting} onActionComplete={handleActionComplete} />
          )}

          {meeting && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Meeting: {meeting.status}
            </Badge>
          )}

          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <WorkflowActionButtons
            sourceModule="online-employer-applications"
            sourceRecordId={application.reference_number || application.id || applicationId || null}
            onActionComplete={(action) => {
              toast.success(`Action "${action}" completed successfully`);
              handleActionComplete();
            }}
          />
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold">
                {application.trade_name || application.legal_name || application.employer_name || 'Unnamed Employer'}
              </h2>
              {application.legal_name && application.trade_name && application.legal_name !== application.trade_name && (
                <p className="text-sm text-muted-foreground">Employer Name: {application.employer_name}</p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{application.email || application.business_email || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  {formatPhone(application.mobile, application.mobile_dial_code)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {application.country || '—'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  {application.total_employees != null ? `${application.total_employees} employees` : totalEmployees > 0 ? `${totalEmployees} employees` : '—'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Detail Sections - Matching Public Portal Steps */}
      <Tabs defaultValue="employer-profile" className="space-y-4">
        <TabsList className="w-full grid grid-cols-4 lg:grid-cols-8 h-auto gap-0">
          <TabsTrigger value="employer-profile" className="gap-1.5 text-xs px-2 py-2">
            <Factory className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Employer Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="basic-details" className="gap-1.5 text-xs px-2 py-2">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Basic Details</span>
            <span className="sm:hidden">Basic</span>
          </TabsTrigger>
          <TabsTrigger value="contact-reach" className="gap-1.5 text-xs px-2 py-2">
            <Phone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Contact & Reach</span>
            <span className="sm:hidden">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="tech-finance" className="gap-1.5 text-xs px-2 py-2">
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tech & Finance</span>
            <span className="sm:hidden">Tech</span>
          </TabsTrigger>
          <TabsTrigger value="owners" className="gap-1.5 text-xs px-2 py-2">
            <UserCircle className="h-3.5 w-3.5" />
            Owners
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5 text-xs px-2 py-2">
            <Globe className="h-3.5 w-3.5" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-xs px-2 py-2">
            <FileText className="h-3.5 w-3.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="notes-declaration" className="gap-1.5 text-xs px-2 py-2">
            <ClipboardCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notes</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Employer Profile (matches portal Step 1) */}
        <TabsContent value="employer-profile">
          <div className="space-y-6">
            {/* Previous Owner Information */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Users} title="Previous Owner Information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailField label="Previous Owner" value={application.previous_owner} />
                  {/* <DetailField label="Previous Owner SSB Reg. No." value={application.previous_owner_reg_no} /> */}
                  <DetailField label="Previous Owner Address" value={application.prev_owner_address1} />
                  <DetailField label="Previous Owner Address 2" value={application.previous_owner_address2} />
                </div>
              </CardContent>
            </Card>

            {/* Acquisition / Incorporation */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Factory} title="Acquisition / Incorporation" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailField 
                    label="Acquired Company" 
                    value={
                      <Badge variant={application.is_acquired ? 'default' : 'secondary'}>
                        {formatBoolean(application.is_acquired)}
                      </Badge>
                    } 
                  />
                  <DetailField label="Acquisition Date" value={formatDate(application.date_acquired)} />
                  <DetailField label="Incorporated Date" value={formatDate(application.incorporated_date)} />
                </div>
              </CardContent>
            </Card>

            {/* Organization Classification */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Shield} title="Organization Classification" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Ownership Type" value={application.ownership_code} />
                  <DetailField label="Sector" value={application.sector_code} />
                </div>
              </CardContent>
            </Card>

            {/* Organization Details */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Building2} title="Organization Details" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailField label="Parent Registration Number" value={application.parent_reg_no} />
                  <DetailField label="Office" value={application.office_code} />
                  <DetailField label="Industry" value={application.industry_code} />
                  <DetailField label="Registration ID" value={application.registration_id} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Basic Details (matches portal Step 2) */}
        <TabsContent value="basic-details">
          <div className="space-y-6">
            {/* Business Identity */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Building2} title="Business Identity" subtitle="Core employer information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailField label="Employer Name" value={application.legal_name || application.employer_name} />
                  <DetailField label="Trade Name" value={application.trade_name} />
                  <DetailField label="E-Mail Address" value={application.business_email || application.email} />
                </div>
              </CardContent>
            </Card>

            {/* Addresses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <SectionHeader icon={MapPin} title="HQ Address" subtitle="Headquarters / Physical address" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailField label="HQ Address 1" value={application.hq_address1} />
                    <DetailField label="HQ Address 2" value={application.hq_address2} />
                    <DetailField label="Country" value={application.hq_country || application.country} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <SectionHeader icon={Mail} title="Mailing Address" subtitle="Postal / Mailing address" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailField label="Mailing Address 1" value={application.mailing_address1} />
                    <DetailField label="Mailing Address 2" value={application.mailing_address2} />
                    {/* <DetailField label="Country" value={application.mailing_country} /> */}
                    {/* {application.same_as_physical != null && (
                      <DetailField label="Same as HQ" value={formatBoolean(application.same_as_physical)} />
                    )} */}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dates & Employees */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Calendar} title="Dates & Employees" subtitle="Important dates and workforce information" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailField label="Date of Application" value={formatDate(application.application_date)} />
                  <DetailField label="Date Wages First Paid" value={formatDate(application.wages_first_paid_date)} />
                  <DetailField label="Total Employees" value={application.total_employees?.toString() || totalEmployees > 0 ? totalEmployees.toString() : '—'} />
                  <DetailField label="Male Employees" value={application.male_count?.toString() ?? '0'} />
                  <DetailField label="Female Employees" value={application.female_count?.toString() ?? '0'} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Contact & Reach (matches portal Step 3) */}
        <TabsContent value="contact-reach">
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={Phone} title="Contact Information" subtitle="Business telephone and fax" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Contact Telephone Number" value={formatPhone(application.contact_telephone, application.contact_telephone_dial_code)} />
                  <DetailField label="Contact Fax Number" value={formatPhone(application.contact_fax, application.contact_fax_dial_code)} />
                  <DetailField label="Contact Name" value={application.contact_name} />
                  <DetailField label="Mobile" value={formatPhone(application.mobile, application.mobile_dial_code)} />
                  <DetailField label="Email" value={application.email} />
                  <DetailField label="Country" value={application.country} />
                </div>
              </CardContent>
            </Card>

            {/* Location Information */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={MapPin} title="Location Information" subtitle="Business location and activity" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DetailField label="Village" value={application.village_code} />
                  {/* <DetailField label="Activity Type" value={application.activity_type_name || application.activity_type} /> */}
                  {/* <DetailField label="Inspector Code" value={application.inspector_name || application.inspector_code} /> */}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Tech & Finance (matches portal Step 4) */}
        <TabsContent value="tech-finance">
          <Card>
            <CardContent className="p-6">
              <SectionHeader icon={Monitor} title="Computer Payroll Information" subtitle="Technology and payroll processing details" />
              <div className="space-y-6">
                <DetailField 
                  label="Is payroll processed using a computerised system?" 
                  value={
                    <Badge variant={application.computer_payroll ? 'default' : 'secondary'}>
                      {application.computer_payroll ? 'Yes' : 'No'}
                    </Badge>
                  }
                />
                {application.computer_payroll && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DetailField label="Make / Model" value={application.make_model} />
                    {/* <DetailField label="Disk / Tape" value={application.disk_tape} /> */}
                  </div>
                )}
                <Separator />
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <DetailField label="Payroll Frequency" value={application.payroll_frequency} />
                </div> */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Owners (matches portal Step 5) */}
        <TabsContent value="owners">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCircle className="h-5 w-5" />
                    Owners / Partners / Directors
                  </CardTitle>
                  <CardDescription>Business ownership information ({application.owners?.length || application.total_owners || 0} records)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {application.owners && application.owners.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SSN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.owners.map((owner, idx) => (
                      <TableRow key={owner.id || idx}>
                        <TableCell className="font-medium">{owner.name || '—'}</TableCell>
                        <TableCell>{owner.title || '—'}</TableCell>
                        <TableCell>{formatPhone(owner.phone, owner.phone_dial_code) || '—'}</TableCell>
                        <TableCell>{owner.email || '—'}</TableCell>
                        <TableCell>{owner.ssn || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No owners / partners / directors listed</p>
                </div>
              )}

              {/* Also show officials if present */}
              {application.officials && application.officials.length > 0 && (
                <>
                  <Separator className="my-6" />
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold">Key Officials</h4>
                    <p className="text-xs text-muted-foreground">Officers and key personnel ({application.officials.length})</p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead>Title / Position</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>SSN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {application.officials.map((official, idx) => (
                        <TableRow key={official.id || idx}>
                          <TableCell className="font-medium">{official.name || '—'}</TableCell>
                          <TableCell>{official.title || '—'}</TableCell>
                          <TableCell>{official.phone || '—'}</TableCell>
                          <TableCell>{official.email || '—'}</TableCell>
                          <TableCell>{official.ssn || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Locations (matches portal Step 6) */}
        <TabsContent value="locations">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-5 w-5" />
                Places of Business
              </CardTitle>
              <CardDescription>All business locations including branches or additional sites ({application.locations?.length || application.total_locations || 0} records)</CardDescription>
            </CardHeader>
            <CardContent>
              {application.locations && application.locations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Trade Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Activity Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.locations.map((location, idx) => (
                      <TableRow key={location.id || idx}>
                        <TableCell className="font-medium">{location.trade_name || '—'}</TableCell>
                        <TableCell>
                          {[location.address1, location.address2].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                        <TableCell>{location.activity_type || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No additional locations listed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Documents (matches portal Step 7) */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>Supporting documents submitted with the application ({application.documents?.length || application.total_documents || 0} files)</CardDescription>
            </CardHeader>
            <CardContent>
              {application.documents && application.documents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.documents.map((doc, idx) => {
                      const documentUrl = doc.download_url || doc.url || doc.signed_url;
                      return (
                        <TableRow key={doc.id || idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{doc.document_type || doc.type || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[300px]">{doc.file_name || doc.name || 'Document'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(doc.uploaded_at)}</TableCell>
                          <TableCell className="text-right">
                            {documentUrl && (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={documentUrl} target="_blank" rel="noopener noreferrer" title="View">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={documentUrl} download title="Download">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 8: Notes & Declaration (matches portal Steps 8 + 10) */}
        <TabsContent value="notes-declaration">
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardContent className="p-6">
                <SectionHeader icon={StickyNote} title="Notes" subtitle="Additional notes about the registration" />
                {application.remarks ? (
                  <div className="rounded-lg bg-muted/50 border p-4">
                    <p className="text-sm whitespace-pre-wrap">{application.remarks}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No notes added</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Declaration */}
            {/* <Card>
              <CardContent className="p-6">
                <SectionHeader icon={ClipboardCheck} title="Declaration & Signature" subtitle="Signatory information and declaration status" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <DetailField label="Signatory Name" value={application.signatory_name} />
                  <DetailField label="Signatory Title" value={application.signatory_title} />
                  <DetailField 
                    label="Declaration Accepted" 
                    value={
                      <Badge variant={application.declaration_accepted ? 'default' : 'secondary'}>
                        {formatBoolean(application.declaration_accepted)}
                      </Badge>
                    } 
                  />
                  <DetailField label="Declaration Date" value={formatDate(application.declaration_date)} />
                </div>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rejection Reason (if any) */}
      {application.rejection_reason && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Rejection Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{application.rejection_reason}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
