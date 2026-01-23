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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Heart,
  UserPlus,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { useExternalApplicationDetail } from '@/hooks/useExternalApplicationDetail';
import { useApproveApplication, useRejectApplication } from '@/hooks/useOnlineApplications';
import { formatStatusDisplay, getStatusVariant } from '@/types/externalApplication';

export default function ApplicationDetailPage() {
  const { referenceNumber } = useParams<{ referenceNumber: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
  }>({ open: false, type: 'approve' });
  const [actionRemarks, setActionRemarks] = useState('');

  const { data: application, isLoading, error, refetch, isFetching } = useExternalApplicationDetail(referenceNumber);
  const approveApplication = useApproveApplication();
  const rejectApplication = useRejectApplication();

  const isAdmin = user?.role === 'admin' || hasPermission('system_administration');
  const isOfficer = hasPermission('process_claims') || hasPermission('approve_benefits');
  const canApprove = isAdmin || isOfficer;
  const isPending = application?.status?.toLowerCase() === 'pending';

  const handleConfirmAction = async () => {
    if (!referenceNumber) return;

    if (actionDialog.type === 'approve') {
      await approveApplication.mutateAsync({
        applicationId: referenceNumber,
        remarks: actionRemarks,
      });
    } else {
      await rejectApplication.mutateAsync({
        applicationId: referenceNumber,
        remarks: actionRemarks,
      });
    }

    setActionDialog({ open: false, type: 'approve' });
    setActionRemarks('');
    refetch();
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatPhone = (phone: string | null | undefined, dialCode: string | null | undefined) => {
    if (!phone) return '—';
    return dialCode ? `(${dialCode}) ${phone}` : phone;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to Load Application</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Application not found or failed to load.'}
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
              Application: {application.referenceNumber}
            </h1>
            <p className="text-muted-foreground">
              Submitted on {formatDate(application.submittedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(application.status)} className="text-sm px-3 py-1">
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
              <AvatarImage src={application.photoUrl || undefined} alt="Applicant photo" />
              <AvatarFallback className="text-2xl">
                {application.firstName?.[0]}{application.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                {application.title && <span className="text-muted-foreground">{application.title}</span>}
                <h2 className="text-xl font-semibold">
                  {application.firstName} {application.middleName} {application.lastName}
                  {application.suffix && <span className="ml-1">{application.suffix}</span>}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {application.email}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {formatPhone(application.phoneMobile, application.phoneMobileDialCode)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  DOB: {formatDate(application.dateOfBirth)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Details */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="relations" className="gap-2">
            <Heart className="h-4 w-4" />
            Relations
          </TabsTrigger>
          <TabsTrigger value="employment" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="dependants" className="gap-2">
            <Users className="h-4 w-4" />
            Dependants
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <InfoField label="Title" value={application.title} />
                <InfoField label="First Name" value={application.firstName} />
                <InfoField label="Middle Name" value={application.middleName} />
                <InfoField label="Last Name" value={application.lastName} />
                <InfoField label="Suffix" value={application.suffix} />
                <InfoField label="Maiden Name" value={application.maidenName} />
                <InfoField label="Alias" value={application.alias} />
                <InfoField label="Gender" value={formatGender(application.gender)} />
                <InfoField label="Date of Birth" value={formatDate(application.dateOfBirth)} />
                <InfoField label="Place of Birth" value={application.placeOfBirth} />
                <InfoField label="Nationality" value={application.nationality} />
                <InfoField label="Marital Status" value={formatMaritalStatus(application.maritalStatus)} />
                {application.dateMarried && (
                  <InfoField label="Date Married" value={formatDate(application.dateMarried)} />
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Physical Characteristics</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField 
                    label="Height" 
                    value={application.heightFeet || application.heightInches 
                      ? `${application.heightFeet || 0}' ${application.heightInches || 0}"`
                      : null} 
                  />
                  <InfoField label="Eye Color" value={application.eyeColor} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Information Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Phone & Email</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Mobile Phone" value={formatPhone(application.phoneMobile, application.phoneMobileDialCode)} />
                  <InfoField label="Home Phone" value={formatPhone(application.phoneHome, application.phoneHomeDialCode)} />
                  <InfoField label="Work Phone" value={formatPhone(application.phoneWork, application.phoneWorkDialCode)} />
                  <InfoField label="Fax" value={formatPhone(application.fax, application.faxDialCode)} />
                  <InfoField label="Email" value={application.email} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Residential Address
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Address Line 1" value={application.addressLine1} />
                  <InfoField label="Address Line 2" value={application.addressLine2} />
                  <InfoField label="City" value={application.city} />
                  <InfoField label="Parish" value={application.parish} />
                  <InfoField label="Postal District" value={application.postalDistrict} />
                  <InfoField label="Country" value={application.country} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Mailing Address</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Mailing Address 1" value={application.mailingAddr1} />
                  <InfoField label="Mailing Address 2" value={application.mailingAddr2} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Name" value={application.contactName} />
                  <InfoField label="Relationship" value={application.contactRelation} />
                  <InfoField label="Address" value={application.contactAddress} />
                  <InfoField label="Phone" value={formatPhone(application.contactPhone, application.contactPhoneDialCode)} />
                  <InfoField label="Mobile" value={formatPhone(application.contactMobile, application.contactMobileDialCode)} />
                  <InfoField label="Email" value={application.contactEmail} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Relations Tab */}
        <TabsContent value="relations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Family Relations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Father's Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="First Name" value={application.fatherFirstName} />
                  <InfoField label="Last Name" value={application.fatherLastName} />
                  <InfoField label="SSN" value={application.fatherSSN} />
                  <InfoField label="Date of Birth" value={formatDate(application.fatherDOB)} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Mother's Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="First Name" value={application.motherFirstName} />
                  <InfoField label="Last Name" value={application.motherLastName} />
                  <InfoField label="Maiden Name" value={application.motherMaidenName} />
                  <InfoField label="SSN" value={application.motherSSN} />
                  <InfoField label="Date of Birth" value={formatDate(application.motherDOB)} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Spouse Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="First Name" value={application.spouseFirstName} />
                  <InfoField label="Last Name" value={application.spouseLastName} />
                  <InfoField label="SSN" value={application.spouseSSN} />
                  <InfoField label="Date of Birth" value={formatDate(application.spouseDOB)} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Beneficiary Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Name" value={application.beneficiaryName} />
                  <InfoField label="Address" value={application.beneficiaryAddress} />
                </div>
              </div>
              
              {(application.witnessName || application.witnessDate) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-3">Witness Information</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <InfoField label="Name" value={application.witnessName} />
                      <InfoField label="Date" value={formatDate(application.witnessDate)} />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Tab */}
        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <InfoField label="Self-Employed" value={application.isSelfEmployed ? 'Yes' : 'No'} />
                <InfoField label="Has Work Permit" value={application.hasWorkPermit ? 'Yes' : 'No'} />
                {application.hasWorkPermit && (
                  <InfoField label="Work Permit Expiry" value={formatDate(application.workPermitExpiry)} />
                )}
                <InfoField label="Occupation" value={application.occupation} />
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Employer Details
                </h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Employer Name" value={application.employerName} />
                  <InfoField label="Address" value={application.employerAddress} />
                  <InfoField label="Town" value={application.employerTown} />
                  <InfoField label="Phone" value={formatPhone(application.employerPhone, application.employerPhoneDialCode)} />
                  <InfoField label="Email" value={application.employerEmail} />
                  <InfoField label="Start Date" value={formatDate(application.employmentStartDate)} />
                </div>
              </div>
              
              {application.remarks && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-3">Remarks</h3>
                    <p className="text-muted-foreground">{application.remarks}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependants Tab */}
        <TabsContent value="dependants">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Dependants
                <Badge variant="secondary">{application.dependants?.length || 0}</Badge>
              </CardTitle>
              <CardDescription>
                List of dependants registered with this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              {application.dependants && application.dependants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>In School</TableHead>
                      <TableHead>Same Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.dependants.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">
                          {dep.firstName} {dep.lastName}
                        </TableCell>
                        <TableCell>{formatDate(dep.dateOfBirth)}</TableCell>
                        <TableCell>{formatGender(dep.gender)}</TableCell>
                        <TableCell>{dep.relationship}</TableCell>
                        <TableCell>
                          {dep.isInSchool ? (
                            <Badge variant="default">Yes</Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {dep.livesAtSameAddress ? (
                            <Badge variant="default">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">{dep.address || 'No'}</span>
                          )}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Attached Documents
              </CardTitle>
              <CardDescription>
                Documents submitted with this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {application.photoUrl && (
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Passport Photo</p>
                      <p className="text-sm text-muted-foreground">Applicant photograph</p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href={application.photoUrl} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                )}
                
                {!application.photoUrl && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents attached</p>
                    <p className="text-sm mt-1">Documents will appear here when uploaded by the applicant</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve/Reject Dialog */}
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
                ? 'This will approve the application and notify the applicant.'
                : 'This will reject the application. Please provide a reason.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium">Reference: {application.referenceNumber}</p>
              <p className="text-sm text-muted-foreground">
                {application.firstName} {application.lastName}
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
                rows={3}
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
              {actionDialog.type === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for displaying field values
function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}

function formatGender(gender: string | null | undefined): string {
  if (!gender) return '—';
  const genderMap: Record<string, string> = {
    'M': 'Male',
    'F': 'Female',
    'N': 'Not-Specified',
    'S': 'Not-Specified',
  };
  return genderMap[gender.toUpperCase()] || gender;
}

function formatMaritalStatus(status: string | null | undefined): string {
  if (!status) return '—';
  const statusMap: Record<string, string> = {
    'S': 'Single',
    'M': 'Married',
    'D': 'Divorced',
    'W': 'Widowed',
    'P': 'Separated',
  };
  return statusMap[status.toUpperCase()] || status;
}
