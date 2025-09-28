import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { newBenefitService } from '@/services/newBenefitService';
import { BenefitType } from '@/types/newBenefit';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Upload, 
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  User
} from 'lucide-react';

// Mock insured persons data
const mockInsuredPersons = [
  { ssn: '123-45-6789', name: 'John Contributor', status: 'ACTIVE' },
  { ssn: '987-65-4321', name: 'Sarah Johnson', status: 'ACTIVE' },
  { ssn: '456-78-9123', name: 'Robert Wilson', status: 'ACTIVE' },
  { ssn: '321-65-9874', name: 'Maria Garcia', status: 'ACTIVE' },
  { ssn: '654-32-1987', name: 'David Brown', status: 'ACTIVE' }
];

interface FormData {
  // Selected Insured Person
  selectedSSN: string;
  selectedPersonName: string;
  
  // Common fields
  contactPhone: string;
  contactEmail: string;
  bankAccount: string;
  bankRoutingNumber: string;
  declaration: boolean;
  digitalSignature: string;
  
  // Sickness specific
  lastDayWorked: string;
  expectedReturnDate: string;
  employerId: string;
  symptoms: string;
  
  // Maternity specific
  expectedDeliveryDate: string;
  confinementDate: string;
  
  // Employment Injury specific
  incidentDate: string;
  incidentTime: string;
  incidentLocation: string;
  incidentDescription: string;
  witnesses: string;
  subBenefit: string;
  
  // Funeral Grant specific
  deceasedSSN: string;
  relationship: string;
  funeralDate: string;
  
  // Age Pension/Grant specific
  retirementDate: string;
  
  // Invalidity specific
  disabilityStartDate: string;
  disabilityDescription: string;
  
  // Survivors specific
  deceasedSSN_survivors: string;
  relationship_survivors: string;
  dependentChildren: string;
  
  // Assistance specific
  monthlyIncome: string;
  unemploymentDuration: string;
}

const benefitConfigs: Record<string, { title: string; type: BenefitType; description: string }> = {
  'sickness': {
    title: 'Sickness Benefit Application',
    type: 'SICKNESS',
    description: 'Apply for weekly payments when unable to work due to illness or injury'
  },
  'maternity': {
    title: 'Maternity Benefit Application',
    type: 'MATERNITY',
    description: 'Apply for weekly payments before and after childbirth'
  },
  'employment-injury': {
    title: 'Employment Injury Benefit Application',
    type: 'EMPLOYMENT_INJURY',
    description: 'Apply for compensation for work-related injuries or disabilities'
  },
  'funeral-grant': {
    title: 'Funeral Grant Application',
    type: 'FUNERAL_GRANT',
    description: 'Apply for assistance with funeral expenses'
  },
  'age-pension': {
    title: 'Age Pension Application',
    type: 'AGE_PENSION',
    description: 'Apply for monthly pension benefits at retirement'
  },
  'age-grant': {
    title: 'Age Grant Application',
    type: 'AGE_GRANT',
    description: 'Apply for one-time payment if not eligible for pension'
  },
  'invalidity': {
    title: 'Invalidity Benefit Application',
    type: 'INVALIDITY',
    description: 'Apply for monthly benefits due to permanent disability'
  },
  'survivors': {
    title: 'Survivors Benefit Application',
    type: 'SURVIVORS_PENSION',
    description: 'Apply for benefits as surviving spouse or child'
  },
  'assistance': {
    title: 'Non-Contributory Pension Application',
    type: 'NON_CONTRIBUTORY_PENSION',
    description: 'Apply for assistance if you do not qualify for contributory benefits'
  }
};

export const BenefitApplicationForm: React.FC = () => {
  const { benefitType } = useParams<{ benefitType: string }>();
  const navigate = useNavigate();
  const { currentUser } = useNewBenefitAuth();
  
  const config = benefitType ? benefitConfigs[benefitType] : null;
  
  const [formData, setFormData] = useState<FormData>({
    selectedSSN: '',
    selectedPersonName: '',
    contactPhone: '',
    contactEmail: '',
    bankAccount: '',
    bankRoutingNumber: '',
    declaration: false,
    digitalSignature: '',
    lastDayWorked: '',
    expectedReturnDate: '',
    employerId: '',
    symptoms: '',
    expectedDeliveryDate: '',
    confinementDate: '',
    incidentDate: '',
    incidentTime: '',
    incidentLocation: '',
    incidentDescription: '',
    witnesses: '',
    subBenefit: '',
    deceasedSSN: '',
    relationship: '',
    funeralDate: '',
    retirementDate: '',
    disabilityStartDate: '',
    disabilityDescription: '',
    deceasedSSN_survivors: '',
    relationship_survivors: '',
    dependentChildren: '',
    monthlyIncome: '',
    unemploymentDuration: ''
  });
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [ssnSearch, setSsnSearch] = useState('');

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePersonSelect = (ssn: string) => {
    const person = mockInsuredPersons.find(p => p.ssn === ssn);
    if (person) {
      setFormData(prev => ({
        ...prev,
        selectedSSN: ssn,
        selectedPersonName: person.name,
        contactEmail: `${person.name.toLowerCase().replace(' ', '.')}@example.com`
      }));
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.selectedSSN) {
      toast({
        title: "Validation Error",
        description: "Please select an insured person first.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Draft Saved",
      description: "Your application has been saved as a draft.",
    });
  };

  const validateForm = () => {
    if (!formData.selectedSSN) {
      toast({
        title: "Validation Error",
        description: "Please select an insured person.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.contactPhone || !formData.contactEmail) {
      toast({
        title: "Validation Error",
        description: "Please provide contact information.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.bankAccount || !formData.bankRoutingNumber) {
      toast({
        title: "Validation Error",
        description: "Please provide banking information.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.declaration) {
      toast({
        title: "Validation Error",
        description: "Please accept the declaration.",
        variant: "destructive"
      });
      return false;
    }

    // Benefit-specific validation
    if (config?.type === 'SICKNESS' && (!formData.lastDayWorked || !formData.employerId)) {
      toast({
        title: "Validation Error",
        description: "Please provide last day worked and employer information.",
        variant: "destructive"
      });
      return false;
    }

    if (config?.type === 'EMPLOYMENT_INJURY' && (!formData.incidentDate || !formData.incidentDescription)) {
      toast({
        title: "Validation Error",
        description: "Please provide incident details.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!config || !validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare claim data based on benefit type
      const claimData: any = {
        ssn: formData.selectedSSN,
        benefitType: config.type,
        status: 'SUBMITTED' as const,
        submissionDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0],
        priority: 'NORMAL' as const,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        bankAccount: formData.bankAccount,
        bankRoutingNumber: formData.bankRoutingNumber,
        declaration: formData.declaration,
        digitalSignature: currentUser?.username || 'SYSTEM'
      };

      // Add specific benefit data
      switch (config.type) {
        case 'SICKNESS':
          claimData.sicknessData = {
            lastDayWorked: formData.lastDayWorked,
            expectedReturnDate: formData.expectedReturnDate,
            employerId: formData.employerId,
            medicalCertificateId: 'DOC_PLACEHOLDER'
          };
          break;
        case 'MATERNITY':
          claimData.maternityData = {
            expectedDeliveryDate: formData.expectedDeliveryDate,
            confinementDate: formData.confinementDate,
            medicalProofId: 'DOC_PLACEHOLDER'
          };
          break;
        case 'EMPLOYMENT_INJURY':
          claimData.employmentInjuryData = {
            subBenefit: formData.subBenefit as any,
            incidentId: 'INC_PLACEHOLDER'
          };
          break;
        case 'FUNERAL_GRANT':
          claimData.funeralGrantData = {
            deceasedSSN: formData.deceasedSSN,
            relationship: formData.relationship,
            deathCertificateId: 'DOC_PLACEHOLDER',
            funeralInvoiceId: 'DOC_PLACEHOLDER'
          };
          break;
        case 'AGE_PENSION':
          claimData.agePensionData = {
            age: 65,
            contributionWeeks: 520,
            residenceConfirmed: true
          };
          break;
        case 'INVALIDITY':
          claimData.invalidityData = {
            medicalBoardCertificateId: 'DOC_PLACEHOLDER',
            doctorReportId: 'DOC_PLACEHOLDER',
            disabilityStartDate: formData.disabilityStartDate,
            impairmentPercentage: 0
          };
          break;
      }

      const newClaim = await newBenefitService.submitClaim(claimData);
      
      toast({
        title: "Application Submitted",
        description: `Application ${newClaim.id} submitted successfully for ${formData.selectedPersonName}.`,
      });
      
      navigate('/newbenefit/worklists');
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPersons = mockInsuredPersons.filter(person => 
    person.ssn.includes(ssnSearch) || 
    person.name.toLowerCase().includes(ssnSearch.toLowerCase())
  );

  if (!config) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Benefit Type</h1>
        <p className="text-muted-foreground mb-4">The requested benefit type is not supported.</p>
        <Button onClick={() => navigate('/newbenefit/apply')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Benefit Selection
        </Button>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Select Insured Person</span>
                </CardTitle>
                <CardDescription>Choose the insured person for this {config.title.toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ssnSearch">Search by SSN or Name</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ssnSearch"
                      placeholder="Search for an insured person..."
                      value={ssnSearch}
                      onChange={(e) => setSsnSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredPersons.map((person) => (
                    <div
                      key={person.ssn}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        formData.selectedSSN === person.ssn ? 'bg-primary/10 border-primary' : ''
                      }`}
                      onClick={() => handlePersonSelect(person.ssn)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{person.name}</p>
                          <p className="text-sm text-muted-foreground">SSN: {person.ssn}</p>
                        </div>
                        <Badge variant={person.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {person.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {formData.selectedSSN && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium text-green-900">Selected Person:</p>
                    <p className="text-green-700">{formData.selectedPersonName} ({formData.selectedSSN})</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Verify and update contact details for {formData.selectedPersonName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPhone">Contact Phone *</Label>
                    <Input 
                      id="contactPhone" 
                      value={formData.contactPhone}
                      onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                      placeholder="(869) 555-0123"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <Input 
                      id="contactEmail" 
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Banking Information</CardTitle>
                <CardDescription>Where should benefit payments be sent?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankAccount">Bank Account Number *</Label>
                    <Input 
                      id="bankAccount" 
                      value={formData.bankAccount}
                      onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bankRoutingNumber">Bank Routing Number *</Label>
                    <Input 
                      id="bankRoutingNumber" 
                      value={formData.bankRoutingNumber}
                      onChange={(e) => handleInputChange('bankRoutingNumber', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Benefit-Specific Information</CardTitle>
                <CardDescription>Provide details specific to {config.title.toLowerCase()}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.type === 'SICKNESS' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="lastDayWorked">Last Day Worked *</Label>
                        <Input 
                          id="lastDayWorked" 
                          type="date"
                          value={formData.lastDayWorked}
                          onChange={(e) => handleInputChange('lastDayWorked', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                        <Input 
                          id="expectedReturnDate" 
                          type="date"
                          value={formData.expectedReturnDate}
                          onChange={(e) => handleInputChange('expectedReturnDate', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="employerId">Employer *</Label>
                      <Select value={formData.employerId} onValueChange={(value) => handleInputChange('employerId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMP001">Government of St. Kitts & Nevis</SelectItem>
                          <SelectItem value="EMP002">Royal Bank of Canada</SelectItem>
                          <SelectItem value="EMP003">Four Seasons Resort</SelectItem>
                          <SelectItem value="OTHER">Other (will specify)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="symptoms">Description of Illness/Symptoms</Label>
                      <Textarea 
                        id="symptoms"
                        value={formData.symptoms}
                        onChange={(e) => handleInputChange('symptoms', e.target.value)}
                        placeholder="Briefly describe the condition..."
                      />
                    </div>
                  </>
                )}

                {config.type === 'EMPLOYMENT_INJURY' && (
                  <>
                    <div>
                      <Label htmlFor="subBenefit">Type of Employment Injury Benefit *</Label>
                      <Select value={formData.subBenefit} onValueChange={(value) => handleInputChange('subBenefit', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select benefit type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INJURY">Temporary Injury Benefit</SelectItem>
                          <SelectItem value="DISABLEMENT">Permanent Disablement</SelectItem>
                          <SelectItem value="DEATH">Death Benefits</SelectItem>
                          <SelectItem value="MEDICAL_EXPENSES">Medical Expenses</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="incidentDate">Date of Incident *</Label>
                        <Input 
                          id="incidentDate" 
                          type="date"
                          value={formData.incidentDate}
                          onChange={(e) => handleInputChange('incidentDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="incidentTime">Time of Incident</Label>
                        <Input 
                          id="incidentTime" 
                          type="time"
                          value={formData.incidentTime}
                          onChange={(e) => handleInputChange('incidentTime', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="incidentLocation">Location of Incident *</Label>
                      <Input 
                        id="incidentLocation"
                        value={formData.incidentLocation}
                        onChange={(e) => handleInputChange('incidentLocation', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="incidentDescription">Description of Incident *</Label>
                      <Textarea 
                        id="incidentDescription"
                        value={formData.incidentDescription}
                        onChange={(e) => handleInputChange('incidentDescription', e.target.value)}
                        placeholder="Provide detailed description of what happened..."
                        required
                      />
                    </div>
                  </>
                )}

                {/* Add other benefit type forms here */}
                
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Declaration & Submission</CardTitle>
                <CardDescription>Review and confirm your application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Application Summary:</h4>
                  <ul className="text-sm space-y-1">
                    <li>Insured Person: {formData.selectedPersonName} ({formData.selectedSSN})</li>
                    <li>Benefit Type: {config.title}</li>
                    <li>Contact: {formData.contactPhone} / {formData.contactEmail}</li>
                    <li>Bank Account: {formData.bankAccount}</li>
                  </ul>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="declaration"
                    checked={formData.declaration}
                    onCheckedChange={(checked) => handleInputChange('declaration', checked as boolean)}
                  />
                  <Label htmlFor="declaration" className="text-sm">
                    I declare that the information provided is true and accurate to the best of my knowledge. 
                    I understand that providing false information may result in the denial of benefits or legal consequences.
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/newbenefit/apply')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
            </div>
            {step < 4 && <div className={`h-1 w-8 ${step < currentStep ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {renderStepContent()}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Previous
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          {currentStep < 4 ? (
            <Button 
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={currentStep === 1 && !formData.selectedSSN}
            >
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};