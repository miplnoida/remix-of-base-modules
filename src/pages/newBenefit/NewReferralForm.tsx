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
  Stethoscope,
  Calendar
} from 'lucide-react';

// Mock claims data
const mockClaims = [
  { id: 'CLM001', contributorName: 'John Contributor', benefitType: 'SICKNESS', status: 'EVIDENCE_REVIEW' },
  { id: 'CLM003', contributorName: 'Robert Johnson', benefitType: 'EMPLOYMENT_INJURY', status: 'ELIGIBILITY_CHECK' },
  { id: 'CLM005', contributorName: 'David Wilson', benefitType: 'INVALIDITY', status: 'CALCULATION' },
  { id: 'CLM007', contributorName: 'Sarah Martinez', benefitType: 'INVALIDITY', status: 'EVIDENCE_REVIEW' }
];

const mockBoardMembers = [
  { id: 'DR001', name: 'Dr. James Smith', specialty: 'Orthopedics' },
  { id: 'DR002', name: 'Dr. Mary Williams', specialty: 'Neurology' },
  { id: 'DR003', name: 'Dr. Robert Brown', specialty: 'General Medicine' },
  { id: 'DR004', name: 'Dr. Linda Johnson', specialty: 'Cardiology' }
];

interface ReferralFormData {
  claimId: string;
  medicalCondition: string;
  reasonForReferral: string;
  urgencyLevel: string;
  preferredBoardMembers: string[];
  medicalHistory: string;
  currentSymptoms: string;
  previousTreatments: string;
  requestingOfficer: string;
}

export const NewReferralForm: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ReferralFormData>({
    claimId: '',
    medicalCondition: '',
    reasonForReferral: '',
    urgencyLevel: '',
    preferredBoardMembers: [],
    medicalHistory: '',
    currentSymptoms: '',
    previousTreatments: '',
    requestingOfficer: ''
  });

  const [claimSearch, setClaimSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof ReferralFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClaimSelect = (claimId: string) => {
    const claim = mockClaims.find(c => c.id === claimId);
    if (claim) {
      setFormData(prev => ({ ...prev, claimId }));
      setClaimSearch('');
    }
  };

  const handleBoardMemberToggle = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredBoardMembers: prev.preferredBoardMembers.includes(memberId)
        ? prev.preferredBoardMembers.filter(id => id !== memberId)
        : [...prev.preferredBoardMembers, memberId]
    }));
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

    if (!formData.medicalCondition || !formData.reasonForReferral) {
      toast({
        title: "Validation Error",
        description: "Please provide medical condition and reason for referral.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.urgencyLevel) {
      toast({
        title: "Validation Error",
        description: "Please select urgency level.",
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

      toast({
        title: "Referral Created",
        description: `Medical board referral created for claim ${formData.claimId}.`,
      });

      navigate('/newbenefit/medical-board');
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error creating the referral. Please try again.",
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/newbenefit/medical-board')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Medical Board Hub
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Medical Board Referral</h1>
          <p className="text-muted-foreground">Create a new referral for medical board evaluation</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Select Claim</span>
            </CardTitle>
            <CardDescription>Choose the claim that requires medical board evaluation</CardDescription>
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
                      </div>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {claim.status.replace(/_/g, ' ')}
                      </span>
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
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Stethoscope className="h-5 w-5" />
              <span>Medical Information</span>
            </CardTitle>
            <CardDescription>Provide details about the medical condition requiring evaluation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="medicalCondition">Medical Condition *</Label>
              <Input
                id="medicalCondition"
                value={formData.medicalCondition}
                onChange={(e) => handleInputChange('medicalCondition', e.target.value)}
                placeholder="e.g., Lower back injury, Chronic heart condition"
                required
              />
            </div>

            <div>
              <Label htmlFor="reasonForReferral">Reason for Medical Board Referral *</Label>
              <Textarea
                id="reasonForReferral"
                value={formData.reasonForReferral}
                onChange={(e) => handleInputChange('reasonForReferral', e.target.value)}
                placeholder="Explain why this case needs medical board evaluation..."
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="urgencyLevel">Urgency Level *</Label>
              <Select value={formData.urgencyLevel} onValueChange={(value) => handleInputChange('urgencyLevel', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select urgency level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">Routine (4-6 weeks)</SelectItem>
                  <SelectItem value="PRIORITY">Priority (2-3 weeks)</SelectItem>
                  <SelectItem value="URGENT">Urgent (1 week)</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency (48 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currentSymptoms">Current Symptoms</Label>
              <Textarea
                id="currentSymptoms"
                value={formData.currentSymptoms}
                onChange={(e) => handleInputChange('currentSymptoms', e.target.value)}
                placeholder="Describe current symptoms and limitations..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="medicalHistory">Relevant Medical History</Label>
              <Textarea
                id="medicalHistory"
                value={formData.medicalHistory}
                onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                placeholder="Include relevant previous medical conditions, surgeries, treatments..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="previousTreatments">Previous Treatments</Label>
              <Textarea
                id="previousTreatments"
                value={formData.previousTreatments}
                onChange={(e) => handleInputChange('previousTreatments', e.target.value)}
                placeholder="List previous treatments, medications, therapies..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferred Board Members</CardTitle>
            <CardDescription>Select specialists based on the medical condition (optional)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockBoardMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.preferredBoardMembers.includes(member.id)}
                      onChange={() => handleBoardMemberToggle(member.id)}
                      className="rounded"
                    />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.specialty}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrative Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="requestingOfficer">Requesting Officer</Label>
              <Input
                id="requestingOfficer"
                value={formData.requestingOfficer}
                onChange={(e) => handleInputChange('requestingOfficer', e.target.value)}
                placeholder="Name of the requesting officer"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/newbenefit/medical-board')}>
          Cancel
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating Referral...' : 'Create Referral'}
          </Button>
        </div>
      </div>
    </div>
  );
};