import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Briefcase, 
  Building2,
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  RefreshCw,
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  FileText,
  Users,
  Globe,
  ClipboardCheck,
  UserCircle,
  Factory,
  ScrollText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useEmployerApplicationDetail } from '@/hooks/useEmployerApplicationDetail';
import { useApproveEmployerApplication, useRejectEmployerApplication, getEmployerStatusVariant } from '@/hooks/useEmployerApplications';

// Helper functions
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
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
  };
  return statusMap[status?.toLowerCase()] || status;
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value ? 'Yes' : 'No';
}

// Detail field component
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

export default function EmployerApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  
  const { data: application, isLoading, error, isFetching, refetch } = useEmployerApplicationDetail(applicationId);
  
  const approveApplication = useApproveEmployerApplication();
  const rejectApplication = useRejectEmployerApplication();

  const [actionDialog, setActionDialog] = useState<{ open: boolean; type: 'approve' | 'reject' }>({
    open: false,
    type: 'approve',
  });
  const [actionRemarks, setActionRemarks] = useState('');

  const isAdmin = user?.role === 'admin' || hasPermission('system_administration');
  const isOfficer = hasPermission('process_claims') || hasPermission('approve_benefits');
  const canApprove = isAdmin || isOfficer;
  const isPending = application?.status?.toLowerCase() === 'submitted' || application?.status?.toLowerCase() === 'pending';

  const handleConfirmAction = async () => {
    // Use the normalized application.id for API calls
    const actionId = application?.id || applicationId;
    if (!actionId) return;

    if (actionDialog.type === 'approve') {
      await approveApplication.mutateAsync({
        applicationId: actionId,
        remarks: actionRemarks,
      });
    } else {
      await rejectApplication.mutateAsync({
        applicationId: actionId,
        remarks: actionRemarks,
      });
    }

    setActionDialog({ open: false, type: 'approve' });
    setActionRemarks('');
    refetch();
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
              Application: {application.reference_number || application.id}
            </h1>
            <p className="text-muted-foreground">
              Submitted on {formatDate(application.submitted_at || application.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={getEmployerStatusVariant(application.status)} className="text-sm px-3 py-1">
            {formatStatusDisplay(application.status)}
          </Badge>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          {canApprove && isPending && (
            <>
              <Button 
                variant="default" 
                className="gap-2"
                onClick={() => setActionDialog({ open: true, type: 'approve' })}
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </Button>
              <Button 
                variant="destructive" 
                className="gap-2"
                onClick={() => setActionDialog({ open: true, type: 'reject' })}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary/10">
                <Building2 className="h-10 w-10 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold">
                {application.trading_name || application.legal_name || application.employer_name || 'Unnamed Employer'}
              </h2>
              {application.legal_name && application.trading_name && application.legal_name !== application.trading_name && (
                <p className="text-muted-foreground">Legal Name: {application.legal_name}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {application.email || '—'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {formatPhone(application.mobile, application.mobile_dial_code)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {application.country || '—'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {application.employee_count != null ? `${application.employee_count} employees` : '—'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Detail Sections */}
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <Factory className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="workforce" className="gap-2">
            <Users className="h-4 w-4" />
            Workforce
          </TabsTrigger>
          <TabsTrigger value="officials" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Officials
          </TabsTrigger>
          <TabsTrigger value="owners" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Owners
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <Globe className="h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="declaration" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Declaration
          </TabsTrigger>
        </TabsList>

        {/* Business Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Employer registration and business classification</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Trade Name" value={application.trading_name} />
              <DetailField label="Legal Name" value={application.legal_name} />
              <DetailField label="Employer Email" value={application.employer_email} />
              <DetailField label="Ownership Type" value={application.ownership_name || application.ownership_code} />
              <DetailField label="Sector" value={application.sector_name || application.sector_code} />
              <DetailField label="Industry" value={application.industry_name || application.industry_code} />
              <DetailField label="Office" value={application.office_name || application.office_code} />
              <DetailField label="Parent Reg. No." value={application.parent_reg_no} />
              <DetailField label="Registration ID" value={application.registration_id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile Tab (Acquisition History) */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Business Profile
              </CardTitle>
              <CardDescription>Incorporation and acquisition history</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Date Incorporated" value={formatDate(application.date_incorporated)} />
              <DetailField label="Acquired Business" value={formatBoolean(application.is_acquired)} />
              <DetailField label="Acquisition Date" value={formatDate(application.date_acquired)} />
              <DetailField label="Previous Owner" value={application.previous_owner} />
              <DetailField label="Previous Owner SSB Reg. No." value={application.previous_owner_reg_no} />
              <DetailField label="Activity Type" value={application.activity_type_name || application.activity_type} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contact Person
              </CardTitle>
              <CardDescription>Primary contact details for the employer</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Contact Name" value={application.contact_name} />
              <DetailField label="Email" value={application.email} />
              <DetailField label="Mobile" value={formatPhone(application.mobile, application.mobile_dial_code)} />
              <DetailField label="Phone" value={formatPhone(application.phone, application.phone_dial_code)} />
              <DetailField label="Fax" value={formatPhone(application.fax, application.fax_dial_code)} />
              <DetailField label="Country" value={application.country} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address Tab */}
        <TabsContent value="address">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  HQ Address
                </CardTitle>
                <CardDescription>Headquarters / Physical address</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField label="Address Line 1" value={application.address_line1} />
                <DetailField label="Address Line 2" value={application.address_line2} />
                <DetailField label="Country" value={application.hq_country || application.country} />
                <DetailField label="Country Code" value={application.hq_country_code || application.country_code} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Mailing Address
                </CardTitle>
                <CardDescription>Postal / Mailing address</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField label="Address Line 1" value={application.mailing_address_line1} />
                <DetailField label="Address Line 2" value={application.mailing_address_line2} />
                <DetailField label="City" value={application.mailing_city} />
                <DetailField label="Country" value={application.mailing_country} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Workforce Tab */}
        <TabsContent value="workforce">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Workforce Details
              </CardTitle>
              <CardDescription>Employee counts and payroll information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Application Date" value={formatDate(application.application_date)} />
              <DetailField label="Wages First Paid" value={formatDate(application.wages_first_paid_date)} />
              <DetailField label="Male Employees" value={application.male_count?.toString()} />
              <DetailField label="Female Employees" value={application.female_count?.toString()} />
              <DetailField label="Total Employees" value={application.employee_count?.toString()} />
              <DetailField label="Payroll Frequency" value={application.payroll_frequency} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Officials Tab */}
        <TabsContent value="officials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Key Officials
              </CardTitle>
              <CardDescription>Officers and key personnel ({application.officials?.length || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {application.officials && application.officials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title / Position</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SSN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.officials.map((official) => (
                      <TableRow key={official.id}>
                        <TableCell className="font-medium">{official.name}</TableCell>
                        <TableCell>{official.title}</TableCell>
                        <TableCell>{official.phone}</TableCell>
                        <TableCell>{official.email || '—'}</TableCell>
                        <TableCell>{official.ssn || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <UserCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No officials listed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Owners Tab */}
        <TabsContent value="owners">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Owners / Partners / Directors
              </CardTitle>
              <CardDescription>Business ownership information ({application.owners?.length || application.total_owners || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {application.owners && application.owners.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SSN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.owners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="font-medium">{owner.name}</TableCell>
                        <TableCell>{owner.title}</TableCell>
                        <TableCell>{owner.phone}</TableCell>
                        <TableCell>{owner.email || '—'}</TableCell>
                        <TableCell>{owner.ssn || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No owners listed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Business Locations
              </CardTitle>
              <CardDescription>Places of business ({application.locations?.length || application.total_locations || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {application.locations && application.locations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trade Name</TableHead>
                      <TableHead>Address 1</TableHead>
                      <TableHead>Address 2</TableHead>
                      <TableHead>Activity Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">{location.trade_name || '—'}</TableCell>
                        <TableCell>{location.address1}</TableCell>
                        <TableCell>{location.address2 || '—'}</TableCell>
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

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>Supporting documents ({application.documents?.length || application.total_documents || 0})</CardDescription>
            </CardHeader>
            <CardContent>
              {application.documents && application.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {application.documents.map((doc) => {
                    const documentUrl = doc.download_url || doc.url || doc.signed_url;
                    return (
                      <Card key={doc.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.name || doc.file_name || 'Document'}</p>
                            <p className="text-sm text-muted-foreground">{doc.type || doc.document_type || '—'}</p>
                            {doc.uploaded_at && (
                              <p className="text-xs text-muted-foreground">{formatDate(doc.uploaded_at)}</p>
                            )}
                          </div>
                          {documentUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Declaration Tab */}
        <TabsContent value="declaration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Declaration & Signature
              </CardTitle>
              <CardDescription>Signatory information and declaration status</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="md:col-span-2">
                <DetailField label="Remarks / Notes" value={application.remarks} />
              </div>
            </CardContent>
          </Card>
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

      {/* Action Dialog */}
      <Dialog 
        open={actionDialog.open} 
        onOpenChange={(open) => !open && setActionDialog({ open: false, type: 'approve' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog.type === 'approve' ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {actionDialog.type === 'approve' ? 'Approve' : 'Reject'} Application
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' 
                ? 'This will approve the employer application and notify the applicant.'
                : 'This will reject the application. Please provide a reason.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">
                Reference: {application.reference_number || application.id}
              </p>
              <p className="text-sm text-muted-foreground">
                {application.trading_name || application.legal_name || application.employer_name}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="remarks">
                Remarks {actionDialog.type === 'reject' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="remarks"
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder={actionDialog.type === 'approve' 
                  ? 'Optional remarks for the approval...'
                  : 'Please provide a reason for rejection...'}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setActionDialog({ open: false, type: 'approve' })}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.type === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={
                (actionDialog.type === 'reject' && !actionRemarks.trim()) ||
                approveApplication.isPending ||
                rejectApplication.isPending
              }
            >
              {(approveApplication.isPending || rejectApplication.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {actionDialog.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
