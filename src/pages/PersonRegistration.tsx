
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  ArrowLeft,
  Home,
  Users,
  MapPin,
  Phone,
  Building2,
  FileText,
  Camera,
  PenTool
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PersonalInfoTab } from '@/components/person/PersonalInfoTab';
import { AddressInfoTab } from '@/components/person/AddressInfoTab';
import { EmergencyContactTab } from '@/components/person/EmergencyContactTab';
import { EmploymentInfoTab } from '@/components/person/EmploymentInfoTab';
import { DependantsTab } from '@/components/person/DependantsTab';
import { DeclarationTab } from '@/components/person/DeclarationTab';
import { PhotoSignatureTab } from '@/components/person/PhotoSignatureTab';

const PersonRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Section 1 - Personal Information
    lastName: '',
    firstName: '',
    middleName: '',
    formerName: '',
    gender: '',
    height: '',
    dateOfBirth: '',
    countryOfBirth: '',
    citizenOfStKittsNevis: false,
    dateOfResidency: '',
    maritalStatus: '',
    spouseName: '',
    spouseSocialSecurityNo: '',
    
    // Section 2 - Address Information
    homeAddress: '',
    homeStreet: '',
    homeTown: '',
    mailingAddress: '',
    mailingStreet: '',
    mailingTown: '',
    phoneNumber: '',
    mobileNumber: '',
    emailAddress: '',
    
    // Section 3 - Emergency Contact
    contactName: '',
    relationship: '',
    contactAddress: '',
    contactPhoneNumber: '',
    contactTown: '',
    contactMobileNumber: '',
    
    // Section 4a - Employment Information
    mainOccupation: '',
    employedOnWorkPermit: false,
    workPermitExpiration: '',
    registeredNPF: false,
    registeredSocialSecurity: false,
    
    // Section 4b - Current Employer
    employerName: '',
    employerPhone: '',
    employerAddress: '',
    employerTown: '',
    workedInCaricom: false,
    
    // Declaration
    declarationAccepted: false,
    applicantSignature: '',
    signatureDate: '',
    witnessName: '',
    witnessSignature: '',
    witnessDate: '',

    // Photo and Signature
    photo: null as string | null,
    signature: null as string | null
  });

  const [dependants, setDependants] = useState([
    { socialSecurityNo: '', name: '', dateOfBirth: '', gender: '', relationship: '' }
  ]);

  const [formerEmployers, setFormerEmployers] = useState([
    { employer: '', fromYear: '', toYear: '' }
  ]);

  const [caricomCountries, setCaricomCountries] = useState([
    { country: '', lastEmployer: '', periodWorked: '' }
  ]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.declarationAccepted) {
      toast({
        title: "Declaration Required",
        description: "Please accept the declaration before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Registration Submitted",
      description: "Your insured person registration has been submitted for review.",
    });
    
    console.log('Form Data:', formData);
    console.log('Dependants:', dependants);
    console.log('Former Employers:', formerEmployers);
    console.log('CARICOM Countries:', caricomCountries);
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: Users },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'emergency', label: 'Emergency Contact', icon: Phone },
    { id: 'dependants', label: 'Dependants', icon: Users },
    { id: 'employment', label: 'Employment', icon: Building2 },
    { id: 'photo-signature', label: 'Photo & Signature', icon: Camera },
    { id: 'declaration', label: 'Declaration', icon: FileText }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <UserPlus className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insured Person Registration</h1>
            <p className="text-gray-600">Application to register as an insured person</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Main Menu
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-gray-700 transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-gray-900">Person Registration</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-7">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="personal" className="mt-6">
                <PersonalInfoTab 
                  formData={formData} 
                  handleInputChange={handleInputChange} 
                />
              </TabsContent>

              <TabsContent value="address" className="mt-6">
                <AddressInfoTab 
                  formData={formData} 
                  handleInputChange={handleInputChange} 
                />
              </TabsContent>

              <TabsContent value="emergency" className="mt-6">
                <EmergencyContactTab 
                  formData={formData} 
                  handleInputChange={handleInputChange} 
                />
              </TabsContent>

              <TabsContent value="dependants" className="mt-6">
                <DependantsTab 
                  dependants={dependants}
                  setDependants={setDependants}
                />
              </TabsContent>

              <TabsContent value="employment" className="mt-6">
                <EmploymentInfoTab 
                  formData={formData}
                  handleInputChange={handleInputChange}
                  formerEmployers={formerEmployers}
                  setFormerEmployers={setFormerEmployers}
                  caricomCountries={caricomCountries}
                  setCaricomCountries={setCaricomCountries}
                />
              </TabsContent>

              <TabsContent value="photo-signature" className="mt-6">
                <PhotoSignatureTab 
                  formData={formData}
                  handleInputChange={handleInputChange}
                />
              </TabsContent>

              <TabsContent value="declaration" className="mt-6">
                <DeclarationTab 
                  formData={formData} 
                  handleInputChange={handleInputChange} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => {
              const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
              if (currentIndex > 0) {
                setActiveTab(tabs[currentIndex - 1].id);
              }
            }}
            disabled={activeTab === 'personal'}
          >
            Previous
          </Button>
          
          <div className="flex gap-3">
            <Button 
              type="button"
              onClick={() => {
                const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1].id);
                }
              }}
              disabled={activeTab === 'declaration'}
            >
              Next
            </Button>
            
            {activeTab === 'declaration' && (
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Submit Registration
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default PersonRegistration;
