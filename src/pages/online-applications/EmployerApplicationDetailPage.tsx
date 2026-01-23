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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Banknote,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useEmployerApplicationDetail, EmployerApplicationDetail } from '@/hooks/useEmployerApplicationDetail';
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
    if (!applicationId) return;

    if (actionDialog.type === 'approve') {
      await approveApplication.mutateAsync({
        applicationId,
        remarks: actionRemarks,
      });
    } else {
      await rejectApplication.mutateAsync({
        applicationId,
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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-3">
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
                {application.employer_name || application.trading_name || 'Unnamed Employer'}
              </h2>
              {application.trading_name && application.trading_name !== application.employer_name && (
                <p className="text-muted-foreground">Trading as: {application.trading_name}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mt-4">
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
                  {application.city || application.parish || application.country || '—'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Detail Sections */}
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="banking" className="gap-2">
            <Banknote className="h-4 w-4" />
            Banking
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Business Details Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Employer registration and business details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Employer Name" value={application.employer_name} />
              <DetailField label="Trading Name" value={application.trading_name} />
              <DetailField label="Business Type" value={application.business_type} />
              <DetailField label="Industry Type" value={application.industry_type} />
              <DetailField label="Tax ID / TIN" value={application.tax_id} />
              <DetailField label="Registration Date" value={formatDate(application.registration_date)} />
              <DetailField label="Employee Count" value={application.employee_count?.toString()} />
              <DetailField label="Payroll Frequency" value={application.payroll_frequency} />
              <DetailField label="Registration ID" value={application.registration_id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Details Tab */}
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
              <DetailField label="Title" value={application.contact_title} />
              <DetailField label="Position" value={application.contact_position} />
              <DetailField label="Email" value={application.email} />
              <DetailField label="Mobile" value={formatPhone(application.mobile, application.mobile_dial_code)} />
              <DetailField label="Phone" value={formatPhone(application.phone, application.phone_dial_code)} />
              <DetailField label="Fax" value={formatPhone(application.fax, application.fax_dial_code)} />
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
                  Physical Address
                </CardTitle>
                <CardDescription>Business location address</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField label="Address Line 1" value={application.address_line1} />
                <DetailField label="Address Line 2" value={application.address_line2} />
                <DetailField label="City" value={application.city} />
                <DetailField label="Parish / State" value={application.parish} />
                <DetailField label="Country" value={application.country} />
                <DetailField label="Postal Code" value={application.postal_code} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Mailing Address
                </CardTitle>
                <CardDescription>
                  {application.same_as_physical ? 'Same as physical address' : 'Separate mailing address'}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {application.same_as_physical ? (
                  <p className="text-muted-foreground col-span-2">Same as physical address</p>
                ) : (
                  <>
                    <DetailField label="Address Line 1" value={application.mailing_address_line1} />
                    <DetailField label="Address Line 2" value={application.mailing_address_line2} />
                    <DetailField label="City" value={application.mailing_city} />
                    <DetailField label="Parish / State" value={application.mailing_parish} />
                    <DetailField label="Country" value={application.mailing_country} />
                    <DetailField label="Postal Code" value={application.mailing_postal_code} />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Banking Information
              </CardTitle>
              <CardDescription>Bank account details for contributions</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DetailField label="Bank Name" value={application.bank_name} />
              <DetailField label="Branch" value={application.bank_branch} />
              <DetailField label="Account Number" value={application.bank_account_number} />
              <DetailField label="Account Type" value={application.bank_account_type} />
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
              <CardDescription>Supporting documents submitted with the application</CardDescription>
            </CardHeader>
            <CardContent>
              {application.documents && application.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {application.documents.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(doc.uploaded_at)}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    </Card>
                  ))}
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
      </Tabs>

      {/* Remarks Section */}
      {(application.remarks || application.rejection_reason) && (
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.remarks && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Applicant Remarks</p>
                <p>{application.remarks}</p>
              </div>
            )}
            {application.rejection_reason && (
              <div>
                <p className="text-sm text-destructive mb-1">Rejection Reason</p>
                <p className="text-destructive">{application.rejection_reason}</p>
              </div>
            )}
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
                {application.employer_name || application.trading_name}
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
