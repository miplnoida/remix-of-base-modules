import React, { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertTriangle,
  Loader2,
  Calendar,
  Heart,
  UserPlus,
  Building,
  RefreshCw,
  Download,
  Eye as EyeIcon,
  MessageSquare,
} from 'lucide-react';
import { useExternalApplicationDetail } from '@/hooks/useExternalApplicationDetail';
import { formatStatusDisplay, getStatusVariant } from '@/types/externalApplication';
import { WorkflowActionButtons } from '@/components/workflow/WorkflowActionButtons';
import { useConvertToIPRegistration, validateApplicationForConversion } from '@/hooks/useConvertToIPRegistration';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';
import { useCountries, useDistricts, useRelations, useOccupations } from '@/hooks/useIPMasterLookups';
import { ApplicationDocumentsTab } from '@/components/online-applications/ApplicationDocumentsTab';
import { ConversionValidationPanel } from '@/components/online-applications/ConversionValidationPanel';
import { checkWorkflowEligibility, type WorkflowEligibilityResult } from '@/services/workflowEligibilityService';
import { triggerIPRegistrationWorkflow } from '@/services/workflowTriggerService';
import { WorkflowInitiationDialog } from '@/components/workflow/WorkflowInitiationDialog';

export default function ApplicationDetailPage() {
  const { referenceNumber } = useParams<{ referenceNumber: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: application, isLoading, error, refetch, isFetching } = useExternalApplicationDetail(referenceNumber);
  const { convert: convertToIP, isConverting, conversionErrors } = useConvertToIPRegistration();
  const { user } = useSupabaseAuth();
  const { userCode } = useUserCode();

  // Workflow initiation state
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowEligibility, setWorkflowEligibility] = useState<WorkflowEligibilityResult | null>(null);
  const [pendingConversionResult, setPendingConversionResult] = useState<{ ssn: string; unique_uuid: string; recordName: string } | null>(null);
  const [isInitiatingWorkflow, setIsInitiatingWorkflow] = useState(false);

  // Master table lookups
  const { data: countries } = useCountries();
  const { data: districts } = useDistricts();
  const { data: relations } = useRelations();
  const { data: occupations } = useOccupations();

  // Build valid relation codes set for conversion
  const validRelationCodes = React.useMemo(() => {
    return new Set((relations || []).map((r: any) => String(r.code).toUpperCase()));
  }, [relations]);

  // Client-side preflight errors (shown in ValidationPanel without calling RPC)
  const preflightErrors = React.useMemo(() => {
    if (!application) return [];
    return validateApplicationForConversion(application);
  }, [application]);

  // Lookup helpers
  const getCountryName = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const country = countries?.find(c => c.code === code || c.code === code.toUpperCase());
    return country?.description || code;
  };

  const getNationalityName = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const country = countries?.find(c => c.code === code || c.code === code.toUpperCase());
    return country?.nationality || country?.description || code;
  };

  /** Resolve NPF value from API (npfMember boolean or npf Y/N string) */
  const resolveNpf = (): string => {
    const raw = (application as any)?.npfMember;
    if (raw === true || raw === 'true' || raw === 'Y' || raw === 'Yes') return 'Yes';
    if (raw === false || raw === 'false' || raw === 'N' || raw === 'No') return 'No';
    // fall back to npf field
    const npf = application?.npf;
    if (npf === 'Y') return 'Yes';
    if (npf === 'N') return 'No';
    return npf || '—';
  };

  /** Resolve Citizenship value from API (isCitizen boolean or citizenship Y/N string) */
  const resolveCitizenship = (): string => {
    const raw = (application as any)?.isCitizen;
    if (raw === true || raw === 'true' || raw === 'Y' || raw === 'Yes') return 'Yes';
    if (raw === false || raw === 'false' || raw === 'N' || raw === 'No') return 'No';
    const cit = application?.citizenship;
    if (cit === 'Y') return 'Yes';
    if (cit === 'N') return 'No';
    return cit || '—';
  };

  const getDistrictName = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const district = districts?.find(d => d.code === code || d.code === code.toUpperCase());
    return district?.description || code;
  };

  const getRelationName = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const relation = relations?.find(r => r.code === code || r.code === code.toUpperCase());
    return relation?.description || code;
  };

  const getOccupationName = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const occupation = occupations?.find(o => o.code === code || o.code === code.toUpperCase());
    return occupation?.short_description || code;
  };

  /**
   * Format date string WITHOUT timezone conversion.
   * If the API returns "2026-02-10", display exactly "Feb 10, 2026".
   */
  const formatDateRaw = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      // Extract date parts directly from the string to avoid timezone shifting
      const dateOnly = dateStr.split('T')[0]; // Get "YYYY-MM-DD" part
      const [year, month, day] = dateOnly.split('-').map(Number);
      if (!year || !month || !day) return dateStr;
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[month - 1]} ${day}, ${year}`;
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
              Submitted on {formatDateRaw(application.submittedAt)}
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
          <WorkflowActionButtons
            sourceModule="online-insured-person-applications"
            sourceRecordId={referenceNumber || null}
            onActionComplete={async (action, endState) => {
              toast.success(`Action "${action}" completed successfully`);
              refetch();
              // Convert to IP record on approval, then check workflow eligibility
              if (endState === 'Approved' || endState === 'Completed') {
                if (application) {
                  if (preflightErrors.length > 0) {
                    toast.error(`Cannot convert: ${preflightErrors[0].message}. Please resolve validation errors first.`);
                    return;
                  }
                  const result = await convertToIP({
                    applicationDetail: application,
                    userId: user?.id || '',
                    userCode: userCode || '',
                    validRelationCodes,
                    sourceRoute: `/online-applications/insured-person/${referenceNumber}`,
                  });
                  if (result.success) {
                    toast.success(result.message || 'IP Registration created successfully');
                    
                    // Check workflow eligibility dynamically
                    if (result.ssn && result.unique_uuid) {
                      const recordName = `${application.firstName || ''} ${application.lastName || ''}`.trim();
                      const eligibility = await checkWorkflowEligibility({
                        sourceRecordId: result.unique_uuid,
                      });
                      
                      if (eligibility.eligible) {
                        // Show confirmation dialog instead of auto-triggering
                        setWorkflowEligibility(eligibility);
                        setPendingConversionResult({ ssn: result.ssn, unique_uuid: result.unique_uuid, recordName });
                        setWorkflowDialogOpen(true);
                      } else {
                        console.log(`[ApplicationDetailPage] Workflow not eligible: ${eligibility.reason}`);
                      }
                    }
                  } else if (result.message && !result.message.includes('DUPLICATE')) {
                    toast.error(result.message);
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Conversion Validation Panel — uses preflight client-side errors */}
      <ConversionValidationPanel
        isLoading={false}
        result={
          preflightErrors.length > 0
            ? {
                valid: false,
                already_converted: false,
                errors: preflightErrors.map(e => ({ field: e.field, type: 'MISSING' as const, message: e.message })),
                warnings: [],
                error_count: preflightErrors.length,
                warning_count: 0,
              }
            : null
        }
      />

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
                  {application.firstName} {application.middleName1 || application.middleName} {application.lastName}
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
                  DOB: {formatDateRaw(application.dateOfBirth)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Details */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
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
          <TabsTrigger value="remarks" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Remarks
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
                <InfoField label="First Middle Name" value={application.middleName1 || application.middleName} />
                <InfoField label="Second Middle Name" value={application.middleName2} />
                <InfoField label="Last Name" value={application.lastName} />
                <InfoField label="Suffix" value={application.suffix} />
                <InfoField label="Maiden Name" value={application.maidenName} />
                <InfoField label="Alias" value={application.alias} />
                <InfoField label="Gender" value={formatGender(application.gender)} />
                <InfoField label="Date of Birth" value={formatDateRaw(application.dateOfBirth)} />
                <InfoField label="Place of Birth" value={getCountryName(application.placeOfBirth)} />
                <InfoField label="Nationality" value={getNationalityName(application.nationality)} />
                <InfoField label="Marital Status" value={formatMaritalStatus(application.maritalStatus)} />
                {application.dateMarried && (
                  <InfoField label="Date Married" value={formatDateRaw(application.dateMarried)} />
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
                  <InfoField label="Postal District" value={getDistrictName(application.postalDistrict)} />
                  <InfoField label="Place of Residency" value={getCountryName(application.placeOfResidency)} />
                  <InfoField label="Residency Date" value={formatDateRaw(application.residencyDate)} />
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
                  <InfoField label="Relationship" value={getRelationName(application.contactRelation)} />
                  <InfoField label="Address Line 1" value={application.contactAddress1 || application.contactAddress} />
                  <InfoField label="Address Line 2" value={application.contactAddress2} />
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
                <h3 className="font-medium mb-3">Parent's Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Father's Name" value={application.fatherName || [application.fatherFirstName, application.fatherLastName].filter(Boolean).join(' ')} />
                  <InfoField label="Mother's Name" value={application.motherName || [application.motherFirstName, application.motherLastName].filter(Boolean).join(' ')} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Spouse Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Name" value={application.spouseName || [application.spouseFirstName, application.spouseLastName].filter(Boolean).join(' ') || null} />
                  <InfoField label="SSN" value={application.spouseSSN} />
                  <InfoField label="Date of Birth" value={formatDateRaw(application.spouseDOB || application.spouseDateOfBirth)} />
                  <InfoField label="Address Line 1" value={application.spouseAddress1} />
                  <InfoField label="Address Line 2" value={application.spouseAddress2} />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-3">Beneficiary Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Name" value={application.beneficiaryName} />
                  <InfoField label="Address Line 1" value={application.beneficiaryAddress1 || application.beneficiaryAddress} />
                  <InfoField label="Address Line 2" value={application.beneficiaryAddress2} />
                </div>
              </div>
              
              <Separator />
              <div>
                <h3 className="font-medium mb-3">Witness Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <InfoField label="Witness Name" value={application.witnessName} />
                  <InfoField label="Witness Date" value={formatDateRaw(application.witnessDate)} />
                </div>
              </div>
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
                <InfoField label="Has Work Permit" value={application.hasWorkPermit ? 'Yes' : 'No'} />
                <InfoField label="Work Permit Expiry" value={formatDateRaw(application.workPermitExpiry)} />
                <InfoField label="Occupation" value={application.occupationName || getOccupationName(application.occupationCode || application.occupation)} />
                <InfoField label="NPF" value={resolveNpf()} />
                <InfoField label="Citizenship" value={resolveCitizenship()} />
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
                </div>
              </div>
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
                      <TableHead>Address</TableHead>
                      <TableHead>School Child</TableHead>
                      <TableHead>Invalid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {application.dependants.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">
                          {dep.firstName} {dep.lastName}
                        </TableCell>
                        <TableCell>{formatDateRaw(dep.dateOfBirth)}</TableCell>
                        <TableCell>{formatGender(dep.gender)}</TableCell>
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
          <ApplicationDocumentsTab 
            documents={application.documents} 
            photoUrl={application.photoUrl} 
          />
        </TabsContent>

        {/* Remarks Tab */}
        <TabsContent value="remarks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Remarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.remarks ? (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="whitespace-pre-wrap">{application.remarks}</p>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No remarks provided</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Workflow Initiation Confirmation Dialog */}
      <WorkflowInitiationDialog
        open={workflowDialogOpen}
        onOpenChange={setWorkflowDialogOpen}
        eligibility={workflowEligibility}
        applicationStatus="Pending (P)"
        recordName={pendingConversionResult?.recordName || ''}
        isInitiating={isInitiatingWorkflow}
        onConfirm={async () => {
          if (!pendingConversionResult) return;
          setIsInitiatingWorkflow(true);
          try {
            const wfId = await triggerIPRegistrationWorkflow({
              uniqueUuid: pendingConversionResult.unique_uuid,
              ssn: pendingConversionResult.ssn,
              recordName: pendingConversionResult.recordName,
              userId: user?.id,
            });
            if (wfId) {
              toast.success('Workflow instance initiated successfully.');
              queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
            } else {
              toast.error('Failed to initiate workflow instance.');
            }
          } catch (err) {
            toast.error(`Workflow initiation error: ${err instanceof Error ? err.message : String(err)}`);
          } finally {
            setIsInitiatingWorkflow(false);
            setWorkflowDialogOpen(false);
            setPendingConversionResult(null);
          }
        }}
        onDecline={() => {
          setWorkflowDialogOpen(false);
          setPendingConversionResult(null);
          toast.info('Workflow initiation declined. You can initiate it later from the registration view.');
        }}
      />
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
