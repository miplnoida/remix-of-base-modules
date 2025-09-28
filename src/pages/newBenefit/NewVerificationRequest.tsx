import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Search,
  User,
  Building,
  Calendar,
  AlertTriangle
} from 'lucide-react';

// Mock claims data requiring verification
const mockClaims = [
  { id: 'CLM001', contributorName: 'John Contributor', benefitType: 'SICKNESS', employerId: 'EMP001', employerName: 'Government of St. Kitts & Nevis' },
  { id: 'CLM003', contributorName: 'Robert Johnson', benefitType: 'EMPLOYMENT_INJURY', employerId: 'EMP003', employerName: 'Four Seasons Resort' },
  { id: 'CLM008', contributorName: 'Lisa Brown', benefitType: 'SICKNESS', employerId: 'EMP002', employerName: 'Royal Bank of Canada' }
];

// Mock employers data
const mockEmployers = [
  { id: 'EMP001', name: 'Government of St. Kitts & Nevis', contactPerson: 'HR Manager', phone: '(869) 465-2521', email: 'hr@gov.kn' },
  { id: 'EMP002', name: 'Royal Bank of Canada', contactPerson: 'Payroll Department', phone: '(869) 465-2359', email: 'payroll@rbc.com' },
  { id: 'EMP003', name: 'Four Seasons Resort', contactPerson: 'John Smith', phone: '(869) 469-1111', email: 'hr@fourseasons.com' }
];

interface VerificationFormData {
  claimId: string;
  employerId: string;
  verificationType: string;
  urgencyLevel: string;
  verificationDetails: string;
  specificQuestions: string;
  dueDate: string;
  requestingOfficer: string;
  additionalNotes: string;
}

export const NewVerificationRequest: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<VerificationFormData>({
    claimId: '',
    employerId: '',
    verificationType: '',
    urgencyLevel: '',
    verificationDetails: '',
    specificQuestions: '',
    dueDate: '',
    requestingOfficer: '',
    additionalNotes: ''
  });

  const [claimSearch, setClaimSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof VerificationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClaimSelect = (claimId: string) => {
    const claim = mockClaims.find(c => c.id === claimId);
    if (claim) {
      setFormData(prev => ({ 
        ...prev, 
        claimId,
        employerId: claim.employerId,
        verificationType: claim.benefitType === 'EMPLOYMENT_INJURY' ? 'INCIDENT_CONFIRMATION' : 'EMPLOYMENT_STATUS'
      }));
      setClaimSearch('');
    }
  };

  const validateForm = () => {
    if (!formData.claimId) {
      toast({
        title: "Validation Error",
        description: "Please select a claim.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.verificationType || !formData.urgencyLevel) {
      toast({
        title: "Validation Error",
        description: "Please select verification type and urgency level.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.verificationDetails) {
      toast({
        title: "Validation Error",
        description: "Please provide verification details.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.dueDate) {
      toast({
        title: "Validation Error",
        description: "Please set a due date.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newVerificationId = `VER${Date.now().toString().slice(-3)}`;

      toast({
        title: "Verification Request Created",
        description: `Verification request ${newVerificationId} has been sent to the employer.`,
      });

      navigate('/newbenefit/employer-hub');
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error creating the verification request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClaims = mockClaims.filter(claim => 
    claim.id.toLowerCase().includes(claimSearch.toLowerCase()) ||
    claim.contributorName.toLowerCase().includes(claimSearch.toLowerCase())
  );

  const selectedClaim = mockClaims.find(c => c.id === formData.claimId);
  const selectedEmployer = mockEmployers.find(e => e.id === formData.employerId);

  // Set default due date to 7 days from today
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  const defaultDueDateString = defaultDueDate.toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/newbenefit/employer-hub')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employer Hub
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Employment Verification Request</h1>
          <p className="text-muted-foreground">Create a new verification request for an employer</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Select Claim</span>
            </CardTitle>
            <CardDescription>Choose the claim that requires employer verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="claimSearch">Search Claims</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="claimSearch"
                  placeholder="Search by claim ID or contributor name..."
                  value={claimSearch}
                  onChange={(e) => setClaimSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {claimSearch && (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {filteredClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-3 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleClaimSelect(claim.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{claim.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {claim.contributorName} - {claim.benefitType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Employer: {claim.employerName}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedClaim && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-green-900">Selected Claim:</p>
                <p className="text-green-700">
                  {selectedClaim.id} - {selectedClaim.contributorName} ({selectedClaim.benefitType.replace(/_/g, ' ')})
                </p>
                <p className="text-green-600 text-sm">
                  Employer: {selectedClaim.employerName}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedEmployer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Employer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Employer Name</Label>
                  <p>{selectedEmployer.name}</p>
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <p>{selectedEmployer.contactPerson}</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <p>{selectedEmployer.phone}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p>{selectedEmployer.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Verification Details</CardTitle>
            <CardDescription>Specify what needs to be verified by the employer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="verificationType">Verification Type *</Label>
              <Select value={formData.verificationType} onValueChange={(value) => handleInputChange('verificationType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select verification type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYMENT_STATUS">Employment Status Verification</SelectItem>
                  <SelectItem value="INCIDENT_CONFIRMATION">Workplace Incident Confirmation</SelectItem>
                  <SelectItem value="WAGES_VERIFICATION">Wages and Hours Verification</SelectItem>
                  <SelectItem value="ABSENCE_CONFIRMATION">Absence Period Confirmation</SelectItem>
                  <SelectItem value="GENERAL_INQUIRY">General Employment Inquiry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="urgencyLevel">Urgency Level *</Label>
              <Select value={formData.urgencyLevel} onValueChange={(value) => handleInputChange('urgencyLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine (7-10 business days)</SelectItem>
                  <SelectItem value="PRIORITY">Priority (3-5 business days)</SelectItem>
                  <SelectItem value="URGENT">Urgent (1-2 business days)</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency (Same day)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate || defaultDueDateString}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <Label htmlFor="verificationDetails">Verification Details *</Label>
              <Textarea
                id="verificationDetails"
                value={formData.verificationDetails}
                onChange={(e) => handleInputChange('verificationDetails', e.target.value)}
                placeholder="Describe what specific information needs to be verified..."
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="specificQuestions">Specific Questions (Optional)</Label>
              <Textarea
                id="specificQuestions"
                value={formData.specificQuestions}
                onChange={(e) => handleInputChange('specificQuestions', e.target.value)}
                placeholder="List any specific questions that need to be answered..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="requestingOfficer">Requesting Officer</Label>
              <Input
                id="requestingOfficer"
                value={formData.requestingOfficer}
                onChange={(e) => handleInputChange('requestingOfficer', e.target.value)}
                placeholder="Name of the requesting officer"
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                placeholder="Any additional instructions or context..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {formData.urgencyLevel === 'EMERGENCY' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Emergency Verification</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 font-medium">Emergency Verification Notice</p>
                <p className="text-red-700 text-sm">
                  This verification request has been marked as emergency. The employer will be contacted immediately 
                  via phone and email. Please ensure all contact information is accurate.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/newbenefit/employer-hub')}>
          Cancel
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating Request...' : 'Send Verification Request'}
          </Button>
        </div>
      </div>
    </div>
  );
};