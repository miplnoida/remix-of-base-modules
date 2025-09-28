import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Building,
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Mock verification request data
const mockVerificationRequest = {
  id: 'VER001',
  claimId: 'CLM003',
  employerId: 'EMP003',
  employerName: 'Four Seasons Resort',
  employerPhone: '(869) 469-1111',
  employerEmail: 'hr@fourseasons.com',
  contactPerson: 'John Smith',
  contributorName: 'Robert Johnson',
  contributorSSN: '456-78-9123',
  requestDate: '2024-01-18',
  dueDate: '2024-01-25',
  status: 'PENDING',
  verificationType: 'EMPLOYMENT_INJURY',
  details: 'Verify employment status and incident details for back injury claim',
  incidentDate: '2024-01-08',
  incidentLocation: 'Kitchen Storage Area',
  questions: [
    'Was the employee working on the date of incident?',
    'Can you confirm the incident occurred at the workplace?',
    'Was the incident reported to management?',
    'Are there any witnesses to the incident?',
    'Has the employee been absent since the incident?'
  ]
};

export const EmploymentVerificationDetail: React.FC = () => {
  const { verificationId } = useParams<{ verificationId: string }>();
  const navigate = useNavigate();
  
  const [employerResponse, setEmployerResponse] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(mockVerificationRequest.status);
  const [reminderNotes, setReminderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendReminder = async () => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Reminder Sent",
        description: `Verification reminder sent to ${mockVerificationRequest.employerName}.`,
      });
      
      setReminderNotes('');
    } catch (error) {
      toast({
        title: "Failed to Send Reminder",
        description: "There was an error sending the reminder. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordResponse = async () => {
    if (!employerResponse.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the employer response.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Response Recorded",
        description: "Employer response has been recorded successfully.",
      });
      
      setVerificationStatus('COMPLETED');
      setEmployerResponse('');
    } catch (error) {
      toast({
        title: "Failed to Record Response",
        description: "There was an error recording the response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVerificationStatus(newStatus);
      
      toast({
        title: "Status Updated",
        description: `Verification status updated to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        title: "Failed to Update Status",
        description: "There was an error updating the status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'OVERDUE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/newbenefit/employer-hub')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Employer Hub
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              {getStatusIcon(verificationStatus)}
              <span>Verification Request {verificationId}</span>
            </h1>
            <p className="text-muted-foreground">Employment verification for claim {mockVerificationRequest.claimId}</p>
          </div>
        </div>
        <Badge variant={getStatusBadgeVariant(verificationStatus)}>
          {verificationStatus.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Contributor Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Name</Label>
              <p>{mockVerificationRequest.contributorName}</p>
            </div>
            <div>
              <Label>SSN</Label>
              <p>{mockVerificationRequest.contributorSSN}</p>
            </div>
            <div>
              <Label>Claim ID</Label>
              <p>{mockVerificationRequest.claimId}</p>
            </div>
            <div>
              <Label>Verification Type</Label>
              <p>{mockVerificationRequest.verificationType.replace('_', ' ')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Employer Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Employer</Label>
              <p>{mockVerificationRequest.employerName}</p>
            </div>
            <div>
              <Label>Contact Person</Label>
              <p>{mockVerificationRequest.contactPerson}</p>
            </div>
            <div>
              <Label>Phone</Label>
              <p>{mockVerificationRequest.employerPhone}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p>{mockVerificationRequest.employerEmail}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Request Date</Label>
              <p>{new Date(mockVerificationRequest.requestDate).toLocaleDateString()}</p>
            </div>
            <div>
              <Label>Due Date</Label>
              <p>{new Date(mockVerificationRequest.dueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <Label>Days Remaining</Label>
              <p className="text-red-600 font-medium">
                {Math.ceil((new Date(mockVerificationRequest.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>

          <div>
            <Label>Verification Request Details</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p>{mockVerificationRequest.details}</p>
            </div>
          </div>

          {mockVerificationRequest.verificationType === 'EMPLOYMENT_INJURY' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Incident Date</Label>
                <p>{new Date(mockVerificationRequest.incidentDate).toLocaleDateString()}</p>
              </div>
              <div>
                <Label>Incident Location</Label>
                <p>{mockVerificationRequest.incidentLocation}</p>
              </div>
            </div>
          )}

          <div>
            <Label>Verification Questions</Label>
            <ul className="space-y-2 mt-2">
              {mockVerificationRequest.questions.map((question, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {verificationStatus === 'PENDING' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Send reminders or update verification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSendReminder} disabled={isSubmitting}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email Reminder
              </Button>
              <Button variant="outline" disabled={isSubmitting}>
                <Phone className="h-4 w-4 mr-2" />
                Call Employer
              </Button>
              <Button variant="outline" onClick={() => handleUpdateStatus('OVERDUE')} disabled={isSubmitting}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Mark as Overdue
              </Button>
              <Button variant="outline" onClick={() => handleUpdateStatus('ESCALATED')} disabled={isSubmitting}>
                <FileText className="h-4 w-4 mr-2" />
                Escalate to Compliance
              </Button>
            </div>

            <div>
              <Label htmlFor="reminderNotes">Reminder Notes (Optional)</Label>
              <Textarea
                id="reminderNotes"
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
                placeholder="Add any specific notes for the reminder..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Record Employer Response</CardTitle>
          <CardDescription>Document the response received from the employer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="employerResponse">Employer Response *</Label>
            <Textarea
              id="employerResponse"
              value={employerResponse}
              onChange={(e) => setEmployerResponse(e.target.value)}
              placeholder="Record the employer's response to the verification request..."
              rows={6}
              required
            />
          </div>

          <div>
            <Label htmlFor="responseMethod">Response Method</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="How was the response received?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PHONE">Phone Call</SelectItem>
                <SelectItem value="FAX">Fax</SelectItem>
                <SelectItem value="MAIL">Postal Mail</SelectItem>
                <SelectItem value="IN_PERSON">In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleRecordResponse} disabled={isSubmitting || !employerResponse.trim()}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Recording...' : 'Record Response'}
            </Button>
            <Button variant="outline" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </CardContent>
      </Card>

      {verificationStatus === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Verification Complete</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-900 font-medium">Verification has been completed successfully.</p>
              <p className="text-green-700 text-sm">The employer response has been recorded and the claim can proceed to the next stage.</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button onClick={() => navigate(`/newbenefit/claim-360/${mockVerificationRequest.claimId}`)}>
                <FileText className="h-4 w-4 mr-2" />
                View Claim
              </Button>
              <Button variant="outline" onClick={() => navigate('/newbenefit/employer-hub')}>
                Back to Employer Hub
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};