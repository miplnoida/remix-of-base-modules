import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft, 
  Stethoscope, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  RefreshCw,
  AlertTriangle,
  Loader2,
  FileText,
  User,
  Briefcase,
  Award,
  GraduationCap,
  Building
} from 'lucide-react';
import { format } from 'date-fns';
import { useDoctorApplicationDetail, getDoctorStatusVariant } from '@/hooks/useDoctorApplications';
import { WorkflowActionButtons } from '@/components/workflow/WorkflowActionButtons';
import { toast } from 'sonner';

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

function formatGender(gender: string | null | undefined): string {
  if (!gender) return '—';
  const g = gender.toUpperCase();
  if (g === 'M') return 'Male';
  if (g === 'F') return 'Female';
  if (g === 'N') return 'Not-Specified';
  return gender;
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

export default function DoctorApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  
  const { data: application, isLoading, error, isFetching, refetch } = useDoctorApplicationDetail(applicationId);

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
            The requested doctor application could not be found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Normalize field names from API response
  const referenceNumber = application.reference_number || application.referenceNumber || application.id;
  const fullName = application.full_name || application.fullName ||
    [application.first_name || application.firstName, application.middle_name || application.middleName, application.last_name || application.lastName].filter(Boolean).join(' ') ||
    'Unknown';
  const status = application.status || 'Pending';
  const email = application.email;
  const mobile = application.mobile;
  const mobileDialCode = application.mobile_dial_code || application.mobileDialCode;
  const phone = application.phone;
  const phoneDialCode = application.phone_dial_code || application.phoneDialCode;
  const dateOfBirth = application.date_of_birth || application.dateOfBirth;
  const gender = application.gender || application.sex;
  const nationality = application.nationality;
  const specialty = application.specialty;
  const licenseNumber = application.license_number || application.licenseNumber;
  const submittedAt = application.submitted_at || application.submittedAt || application.created_at || application.createdAt;

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
              <Stethoscope className="h-6 w-6 text-primary" />
              Application: {referenceNumber}
            </h1>
            <p className="text-muted-foreground">
              Submitted on {formatDate(submittedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={getDoctorStatusVariant(status)} className="text-sm px-3 py-1">
            {formatStatusDisplay(status)}
          </Badge>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2">
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          {/* Dynamic workflow action buttons based on workflow configuration */}
          <WorkflowActionButtons
            sourceModule="online-doctor-applications"
            sourceRecordId={referenceNumber || applicationId || null}
            onActionComplete={(action, endState) => {
              toast.success(`Action "${action}" completed successfully`);
              refetch();
            }}
          />
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl bg-primary/10">
                <Stethoscope className="h-10 w-10 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold">{fullName}</h2>
              {specialty && (
                <p className="text-muted-foreground">Specialty: {specialty}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {email || '—'}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {formatPhone(mobile, mobileDialCode)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  DOB: {formatDate(dateOfBirth)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Award className="h-4 w-4" />
                  License: {licenseNumber || '—'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Detail Sections */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="professional" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Professional
          </TabsTrigger>
          <TabsTrigger value="qualifications" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Qualifications
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-2">
            <Building className="h-4 w-4" />
            Practice
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic personal details of the applicant</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="First Name" value={application.first_name || application.firstName} />
              <DetailField label="Middle Name" value={application.middle_name || application.middleName} />
              <DetailField label="Last Name" value={application.last_name || application.lastName} />
              <DetailField label="Date of Birth" value={formatDate(dateOfBirth)} />
              <DetailField label="Gender" value={formatGender(gender)} />
              <DetailField label="Nationality" value={nationality} />
              <DetailField label="ID Number" value={application.id_number || application.idNumber} />
              <DetailField label="ID Type" value={application.id_type || application.idType} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Tab */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>Contact details and address information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Email" value={email} />
              <DetailField label="Mobile" value={formatPhone(mobile, mobileDialCode)} />
              <DetailField label="Phone" value={formatPhone(phone, phoneDialCode)} />
              <DetailField label="Address Line 1" value={application.address_line1 || application.addressLine1} />
              <DetailField label="Address Line 2" value={application.address_line2 || application.addressLine2} />
              <DetailField label="City" value={application.city} />
              <DetailField label="Parish" value={application.parish} />
              <DetailField label="Country" value={application.country} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Professional Tab */}
        <TabsContent value="professional">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Professional Information
              </CardTitle>
              <CardDescription>Medical specialization and licensing details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Specialty" value={specialty} />
              <DetailField label="Sub-Specialty" value={application.sub_specialty || application.subSpecialty} />
              <DetailField label="License Number" value={licenseNumber} />
              <DetailField label="License Expiry" value={formatDate(application.license_expiry || application.licenseExpiry)} />
              <DetailField label="Medical Council Reg. No." value={application.medical_council_reg || application.medicalCouncilReg} />
              <DetailField label="Years of Experience" value={application.years_experience || application.yearsExperience} />
              <DetailField label="Registration Type" value={application.registration_type || application.registrationType} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education & Qualifications
              </CardTitle>
              <CardDescription>Academic qualifications and certifications</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Medical School" value={application.medical_school || application.medicalSchool} />
              <DetailField label="Graduation Year" value={application.graduation_year || application.graduationYear} />
              <DetailField label="Degree" value={application.degree} />
              <DetailField label="Internship Hospital" value={application.internship_hospital || application.internshipHospital} />
              <DetailField label="Internship Completion" value={formatDate(application.internship_completion || application.internshipCompletion)} />
              <DetailField label="Residency Program" value={application.residency_program || application.residencyProgram} />
              <DetailField label="Board Certification" value={application.board_certification || application.boardCertification} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Practice Tab */}
        <TabsContent value="practice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Practice Information
              </CardTitle>
              <CardDescription>Current practice and employment details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DetailField label="Practice Name" value={application.practice_name || application.practiceName} />
              <DetailField label="Practice Address" value={application.practice_address || application.practiceAddress} />
              <DetailField label="Hospital Affiliation" value={application.hospital_affiliation || application.hospitalAffiliation} />
              <DetailField label="Practice Type" value={application.practice_type || application.practiceType} />
              <DetailField label="Office Phone" value={formatPhone(application.office_phone || application.officePhone, application.office_phone_dial_code)} />
              <DetailField label="Office Email" value={application.office_email || application.officeEmail} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Uploaded documents and attachments</CardDescription>
            </CardHeader>
            <CardContent>
              {application.documents && Array.isArray(application.documents) && application.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {application.documents.map((doc: any, index: number) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name || doc.document_name || `Document ${index + 1}`}</p>
                          <p className="text-sm text-muted-foreground">{doc.type || doc.document_type || 'Unknown type'}</p>
                        </div>
                        {(doc.url || doc.download_url) && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.url || doc.download_url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        )}
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
    </div>
  );
}
