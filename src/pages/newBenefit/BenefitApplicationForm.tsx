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
  Info
} from 'lucide-react';

interface FormData {
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
    contactPhone: '',
    contactEmail: currentUser?.email || '',
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

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = async () => {
    toast({
      title: "Draft Saved",
      description: "Your application has been saved as a draft.",
    });
  };

  const handleSubmit = async () => {
    if (!config || !currentUser?.ssn) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare claim data based on benefit type
      const claimData: any = {
        ssn: currentUser.ssn,
        benefitType: config.type,
        status: 'DRAFT' as const,
        priority: 'NORMAL' as const,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        bankAccount: formData.bankAccount,
        bankRoutingNumber: formData.bankRoutingNumber,
        declaration: formData.declaration,
        digitalSignature: formData.digitalSignature
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
        // Add other benefit types as needed
      }

      const newClaim = await newBenefitService.submitClaim(claimData);
      
      toast({
        title: "Application Submitted",
        description: `Your application ${newClaim.id} has been submitted successfully.`,
      });
      
      navigate('/newbenefit/my-claims');
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

  const renderStepContent = () => {
    if (!config) return null;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Verify and update your contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ssn">Social Security Number</Label>
                    <Input id="ssn" value={currentUser?.ssn || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={`${currentUser?.firstName} ${currentUser?.lastName}`} disabled />
                  </div>
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
                <CardDescription>Where should we send your benefit payments?</CardDescription>
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

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Benefit-Specific Information</CardTitle>
                <CardDescription>Please provide details specific to your {config.title.toLowerCase()}</CardDescription>
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
                          <SelectValue placeholder="Select your employer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMP001">Government of St. Kitts & Nevis</SelectItem>
                          <SelectItem value="EMP002">Royal Bank of Canada</SelectItem>
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
                        placeholder="Briefly describe your condition..."
                      />
                    </div>
                  </>
                )}

                {config.type === 'MATERNITY' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expectedDeliveryDate">Expected Delivery Date *</Label>
                        <Input 
                          id="expectedDeliveryDate" 
                          type="date"
                          value={formData.expectedDeliveryDate}
                          onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="confinementDate">Actual Confinement Date (if delivered)</Label>
                        <Input 
                          id="confinementDate" 
                          type="date"
                          value={formData.confinementDate}
                          onChange={(e) => handleInputChange('confinementDate', e.target.value)}
                        />
                      </div>
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
                    <div>
                      <Label htmlFor="witnesses">Witnesses (Names and Contact Information)</Label>
                      <Textarea 
                        id="witnesses"
                        value={formData.witnesses}
                        onChange={(e) => handleInputChange('witnesses', e.target.value)}
                        placeholder="List any witnesses to the incident..."
                      />
                    </div>
                  </>
                )}

                {/* Add other benefit type forms similarly */}
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
                <CardDescription>Upload the necessary supporting documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Upload Documents</p>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
                
                {/* Required documents list */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Required Documents for {config.title}:</h4>
                  <div className="space-y-2">
                    {config.type === 'SICKNESS' && (
                      <>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Medical Certificate from Licensed Physician</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">Employer's Confirmation of Last Day Worked</span>
                        </div>
                      </>
                    )}
                    {config.type === 'MATERNITY' && (
                      <>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Medical Certificate of Pregnancy</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">Birth Certificate (after delivery)</span>
                        </div>
                      </>
                    )}
                    {/* Add other document requirements */}
                  </div>
                </div>

                {uploadedDocs.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Uploaded Documents:</h4>
                    <div className="space-y-2">
                      {uploadedDocs.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{doc}</span>
                          <Button variant="outline" size="sm">Remove</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Declaration and Signature</CardTitle>
                <CardDescription>Review and confirm your application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Declaration</p>
                      <p className="text-sm text-blue-700 mt-1">
                        I declare that the information provided in this application is true and complete to the best of my knowledge. 
                        I understand that providing false information may result in denial of benefits and potential legal action.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="declaration" 
                    checked={formData.declaration}
                    onCheckedChange={(checked) => handleInputChange('declaration', checked as boolean)}
                  />
                  <Label htmlFor="declaration" className="text-sm">
                    I agree to the declaration above and authorize the Social Security Board to verify the information provided.
                  </Label>
                </div>

                <div>
                  <Label htmlFor="digitalSignature">Digital Signature *</Label>
                  <Input 
                    id="digitalSignature"
                    value={formData.digitalSignature}
                    onChange={(e) => handleInputChange('digitalSignature', e.target.value)}
                    placeholder="Type your full name as digital signature"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    By typing your name, you are electronically signing this application.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  if (!config) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Benefit Type</h1>
        <p className="text-muted-foreground mb-4">The requested benefit type was not found.</p>
        <Button asChild>
          <a href="/newbenefit/apply">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Benefits
          </a>
        </Button>
      </div>
    );
  }

  const totalSteps = 4;
  const isLastStep = currentStep === totalSteps;
  const canProceed = currentStep === 1 ? formData.contactPhone && formData.contactEmail && formData.bankAccount : true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/newbenefit/apply')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Benefits
          </Button>
          <h1 className="text-2xl font-bold">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <Badge variant="outline">
          Step {currentStep} of {totalSteps}
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Form Content */}
      {renderStepContent()}

      {/* Navigation Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              {isLastStep ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.declaration || !formData.digitalSignature || isSubmitting}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              ) : (
                <Button 
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};