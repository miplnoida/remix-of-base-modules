import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  User,
  Building,
  Stethoscope,
  Clock,
  Eye,
  UserPlus,
  Send,
  History
} from "lucide-react";
import { medicalService } from "@/services/medicalService";
import { MORE_INFO_REASONS, REJECTION_REASONS, DoctorApplicationStatus } from "@/types/medical";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<DoctorApplicationStatus, { label: string; color: string }> = {
  'Draft': { label: 'Draft', color: 'bg-gray-500' },
  'Submitted': { label: 'Submitted', color: 'bg-blue-500' },
  'Manual-Entered': { label: 'Manual Entry', color: 'bg-purple-500' },
  'Under-Review': { label: 'Under Review', color: 'bg-amber-500' },
  'More-Info-Requested': { label: 'More Info Requested', color: 'bg-orange-500' },
  'Approved': { label: 'Approved', color: 'bg-green-500' },
  'Rejected': { label: 'Rejected', color: 'bg-red-500' },
};

export default function DoctorApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [moreInfoDialogOpen, setMoreInfoDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const [selectedMoreInfoReasons, setSelectedMoreInfoReasons] = useState<string[]>([]);
  const [moreInfoMessage, setMoreInfoMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState("");

  const { data: application, isLoading } = useQuery({
    queryKey: ['doctor-application', id],
    queryFn: () => medicalService.getApplicationById(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, note, data }: { status: DoctorApplicationStatus; note?: string; data?: any }) =>
      medicalService.updateApplicationStatus(id!, status, note, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-application', id] });
      queryClient.invalidateQueries({ queryKey: ['doctor-applications'] });
    },
  });

  const handleApprove = () => {
    updateStatusMutation.mutate(
      { status: 'Approved', note: internalNote || 'Application approved. Doctor account created.' },
      {
        onSuccess: () => {
          toast.success('Application approved! Doctor account created and activation email sent.');
          setApproveDialogOpen(false);
          setInternalNote("");
        },
      }
    );
  };

  const handleRequestMoreInfo = () => {
    updateStatusMutation.mutate(
      {
        status: 'More-Info-Requested',
        note: `Requested more information: ${selectedMoreInfoReasons.join(', ')}. ${moreInfoMessage}`,
        data: { moreInfoReason: selectedMoreInfoReasons.join(', ') },
      },
      {
        onSuccess: () => {
          toast.success('Request for more information sent to doctor.');
          setMoreInfoDialogOpen(false);
          setSelectedMoreInfoReasons([]);
          setMoreInfoMessage("");
        },
      }
    );
  };

  const handleReject = () => {
    updateStatusMutation.mutate(
      {
        status: 'Rejected',
        note: `Application rejected: ${rejectionReason}`,
        data: { rejectionReason, rejectionMessage },
      },
      {
        onSuccess: () => {
          toast.success('Application rejected. Notification sent to doctor.');
          setRejectDialogOpen(false);
          setRejectionReason("");
          setRejectionMessage("");
        },
      }
    );
  };

  const handleAssign = () => {
    if (selectedReviewer) {
      medicalService.assignReviewer(id!, selectedReviewer, 'Selected Reviewer').then(() => {
        queryClient.invalidateQueries({ queryKey: ['doctor-application', id] });
        toast.success('Reviewer assigned successfully.');
        setAssignDialogOpen(false);
        setSelectedReviewer("");
      });
    }
  };

  const handleStartReview = () => {
    updateStatusMutation.mutate(
      { status: 'Under-Review', note: 'Review started.' },
      {
        onSuccess: () => {
          toast.success('Application moved to Under Review.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="outline" onClick={() => navigate('/medical/applications')}>
          Back to Applications
        </Button>
      </div>
    );
  }

  const canApprove = ['Submitted', 'Manual-Entered', 'Under-Review', 'More-Info-Requested'].includes(application.status);
  const canReject = ['Submitted', 'Manual-Entered', 'Under-Review', 'More-Info-Requested'].includes(application.status);
  const canRequestMoreInfo = ['Submitted', 'Manual-Entered', 'Under-Review'].includes(application.status);
  const canStartReview = ['Submitted', 'Manual-Entered'].includes(application.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/medical/applications')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {application.title} {application.firstName} {application.lastName}
              </h1>
              <Badge className={`${statusConfig[application.status].color} text-white`}>
                {statusConfig[application.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {application.referenceNumber} • {application.applicationType} Application
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {canStartReview && (
            <Button variant="outline" onClick={handleStartReview}>
              <Eye className="h-4 w-4 mr-2" />
              Start Review
            </Button>
          )}
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign
          </Button>
          {canRequestMoreInfo && (
            <Button variant="outline" onClick={() => setMoreInfoDialogOpen(true)}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Request Info
            </Button>
          )}
          {canReject && (
            <Button variant="destructive" onClick={() => setRejectDialogOpen(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          )}
          {canApprove && (
            <Button onClick={() => setApproveDialogOpen(true)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          )}
        </div>
      </div>

      {/* Application Header Info */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Reference Number</p>
              <p className="font-mono font-medium">{application.referenceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Submitted Date</p>
              <p className="font-medium">{format(new Date(application.submittedDate), 'MMM d, yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
              <p className="font-medium">{format(new Date(application.lastUpdated), 'MMM d, yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned Reviewer</p>
              <p className="font-medium">{application.assignedReviewerName || 'Unassigned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details" className="gap-2">
            <User className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents ({application.documents.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <History className="h-4 w-4" />
            Notes & History ({application.internalNotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Personal Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{application.title} {application.firstName} {application.lastName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="font-medium">{format(new Date(application.dateOfBirth), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nationality</p>
                    <p className="font-medium">{application.nationality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">National ID</p>
                    <p className="font-mono text-sm">{application.nationalId}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{application.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{application.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{application.address}</p>
                </div>
              </CardContent>
            </Card>

            {/* Professional Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Professional & Licensing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Registration Number</p>
                    <p className="font-mono font-medium">{application.localRegistrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Registration Authority</p>
                    <p className="font-medium">{application.registrationAuthority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Speciality</p>
                    <p className="font-medium">{application.speciality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Years of Experience</p>
                    <p className="font-medium">{application.yearsOfExperience} years</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">License Expiry Date</p>
                  <p className={`font-medium ${new Date(application.licenseExpiryDate) < new Date() ? 'text-red-500' : ''}`}>
                    {format(new Date(application.licenseExpiryDate), 'MMM d, yyyy')}
                    {new Date(application.licenseExpiryDate) < new Date() && ' (EXPIRED)'}
                  </p>
                </div>
                {application.otherJurisdictions && (
                  <div>
                    <p className="text-xs text-muted-foreground">Other Jurisdictions</p>
                    <p className="font-medium">{application.otherJurisdictions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Practice Locations */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Practice Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {application.practiceLocations.map((location) => (
                    <div key={location.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{location.facilityName}</p>
                        {location.isPrimary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="text-muted-foreground">Island: <span className="text-foreground">{location.island}</span></span>
                        <span className="text-muted-foreground">Phone: <span className="text-foreground">{location.phone}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Benefit Permissions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Benefit Permissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Sickness Benefit Referrals</span>
                    <Badge variant={application.benefitPermissions.canStartSicknessClaims ? 'default' : 'secondary'}>
                      {application.benefitPermissions.canStartSicknessClaims ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Injury Benefit Referrals</span>
                    <Badge variant={application.benefitPermissions.canStartInjuryClaims ? 'default' : 'secondary'}>
                      {application.benefitPermissions.canStartInjuryClaims ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>Maternity Benefit Referrals</span>
                    <Badge variant={application.benefitPermissions.canStartMaternityClaims ? 'default' : 'secondary'}>
                      {application.benefitPermissions.canStartMaternityClaims ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uploaded Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {application.documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
                ) : (
                  application.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type} • {doc.fileSize} • Uploaded {doc.uploadedDate}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal Notes & Action History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {application.internalNotes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No notes or history</p>
                ) : (
                  application.internalNotes.map((note) => (
                    <div key={note.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{note.authorName}</span>
                          {note.action && (
                            <Badge variant="outline" className="text-xs">{note.action}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), 'MMM d, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Application</DialogTitle>
            <DialogDescription>
              Approving will create a doctor account and send activation email to {application.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-green-700">Account will be created with:</p>
              <ul className="text-sm text-green-600 mt-2 space-y-1">
                <li>• Username: {application.email}</li>
                <li>• Role: Doctor</li>
                <li>• Sickness Claims: {application.benefitPermissions.canStartSicknessClaims ? 'Enabled' : 'Disabled'}</li>
                <li>• Injury Claims: {application.benefitPermissions.canStartInjuryClaims ? 'Enabled' : 'Disabled'}</li>
                <li>• Maternity Claims: {application.benefitPermissions.canStartMaternityClaims ? 'Enabled' : 'Disabled'}</li>
              </ul>
            </div>
            <div>
              <Label>Internal Note (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this approval..."
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* More Info Dialog */}
      <Dialog open={moreInfoDialogOpen} onOpenChange={setMoreInfoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request More Information</DialogTitle>
            <DialogDescription>
              Select reasons and add a message for the doctor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Reasons</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {MORE_INFO_REASONS.map((reason) => (
                  <div key={reason} className="flex items-center space-x-2">
                    <Checkbox
                      id={reason}
                      checked={selectedMoreInfoReasons.includes(reason)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMoreInfoReasons([...selectedMoreInfoReasons, reason]);
                        } else {
                          setSelectedMoreInfoReasons(selectedMoreInfoReasons.filter(r => r !== reason));
                        }
                      }}
                    />
                    <Label htmlFor={reason} className="text-sm font-normal">{reason}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Additional Message</Label>
              <Textarea
                placeholder="Add specific instructions or details..."
                value={moreInfoMessage}
                onChange={(e) => setMoreInfoMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoreInfoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestMoreInfo} disabled={selectedMoreInfoReasons.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejection. This will be communicated to the applicant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message to Doctor</Label>
              <Textarea
                placeholder="Explain the rejection and any next steps..."
                value={rejectionMessage}
                onChange={(e) => setRejectionMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Reviewer</DialogTitle>
            <DialogDescription>
              Select a staff member to review this application.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Select Reviewer</Label>
            <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
              <SelectTrigger>
                <SelectValue placeholder="Select reviewer..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user-001">Sarah Johnson</SelectItem>
                <SelectItem value="user-002">James Williams</SelectItem>
                <SelectItem value="user-003">Mary Brown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedReviewer}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
