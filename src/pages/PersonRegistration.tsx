
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UserPlus,
  ArrowLeft,
  Home,
  Upload,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Users,
  FileText,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PersonRegistration = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
    witnessDate: ''
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

  const addDependant = () => {
    setDependants([...dependants, { socialSecurityNo: '', name: '', dateOfBirth: '', gender: '', relationship: '' }]);
  };

  const addFormerEmployer = () => {
    setFormerEmployers([...formerEmployers, { employer: '', fromYear: '', toYear: '' }]);
  };

  const addCaricomCountry = () => {
    setCaricomCountries([...caricomCountries, { country: '', lastEmployer: '', periodWorked: '' }]);
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
        {/* Section 1 - Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Section 1 - Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="middleName">Middle Name(s)</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => handleInputChange('middleName', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="formerName">Former/Maiden/Alias Name</Label>
                <Input
                  id="formerName"
                  value={formData.formerName}
                  onChange={(e) => handleInputChange('formerName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (e.g. 5'4")</Label>
                <Input
                  id="height"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Gender *</Label>
              <RadioGroup 
                value={formData.gender} 
                onValueChange={(value) => handleInputChange('gender', value)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="M" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="F" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth (dd/mm/yyyy) *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="countryOfBirth">Country of Birth</Label>
                <Input
                  id="countryOfBirth"
                  value={formData.countryOfBirth}
                  onChange={(e) => handleInputChange('countryOfBirth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateOfResidency">Date of Residency</Label>
                <Input
                  id="dateOfResidency"
                  type="date"
                  value={formData.dateOfResidency}
                  onChange={(e) => handleInputChange('dateOfResidency', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="citizenOfStKittsNevis"
                checked={formData.citizenOfStKittsNevis}
                onCheckedChange={(checked) => handleInputChange('citizenOfStKittsNevis', checked)}
              />
              <Label htmlFor="citizenOfStKittsNevis">Citizen of St. Kitts & Nevis?</Label>
            </div>

            <div>
              <Label>Marital Status</Label>
              <RadioGroup 
                value={formData.maritalStatus} 
                onValueChange={(value) => handleInputChange('maritalStatus', value)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Single" id="single" />
                  <Label htmlFor="single">Single</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Married" id="married" />
                  <Label htmlFor="married">Married</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Divorced" id="divorced" />
                  <Label htmlFor="divorced">Divorced</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Widowed" id="widowed" />
                  <Label htmlFor="widowed">Widowed</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Separated" id="separated" />
                  <Label htmlFor="separated">Separated</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Common-law" id="commonlaw" />
                  <Label htmlFor="commonlaw">Common-law</Label>
                </div>
              </RadioGroup>
            </div>

            {(formData.maritalStatus === 'Married' || formData.maritalStatus === 'Common-law') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouseName">Spouse's Name</Label>
                  <Input
                    id="spouseName"
                    value={formData.spouseName}
                    onChange={(e) => handleInputChange('spouseName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="spouseSocialSecurityNo">Spouse's Social Security No.</Label>
                  <Input
                    id="spouseSocialSecurityNo"
                    value={formData.spouseSocialSecurityNo}
                    onChange={(e) => handleInputChange('spouseSocialSecurityNo', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2 - Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Section 2 - Address Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Home Address</h4>
                <div>
                  <Label htmlFor="homeStreet">Street</Label>
                  <Input
                    id="homeStreet"
                    value={formData.homeStreet}
                    onChange={(e) => handleInputChange('homeStreet', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="homeTown">Town/Village/Island</Label>
                  <Input
                    id="homeTown"
                    value={formData.homeTown}
                    onChange={(e) => handleInputChange('homeTown', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Mailing Address (if different from home address)</h4>
                <div>
                  <Label htmlFor="mailingStreet">Street</Label>
                  <Input
                    id="mailingStreet"
                    value={formData.mailingStreet}
                    onChange={(e) => handleInputChange('mailingStreet', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mailingTown">Town/Village/Island</Label>
                  <Input
                    id="mailingTown"
                    value={formData.mailingTown}
                    onChange={(e) => handleInputChange('mailingTown', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input
                  id="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="emailAddress">E-mail Address</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => handleInputChange('emailAddress', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 - Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Section 3 - Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={formData.relationship}
                  onChange={(e) => handleInputChange('relationship', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactAddress">Address</Label>
                <Input
                  id="contactAddress"
                  value={formData.contactAddress}
                  onChange={(e) => handleInputChange('contactAddress', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contactPhoneNumber">Phone Number</Label>
                <Input
                  id="contactPhoneNumber"
                  value={formData.contactPhoneNumber}
                  onChange={(e) => handleInputChange('contactPhoneNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactTown">Town/Village/Island</Label>
                <Input
                  id="contactTown"
                  value={formData.contactTown}
                  onChange={(e) => handleInputChange('contactTown', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="contactMobileNumber">Mobile Number</Label>
                <Input
                  id="contactMobileNumber"
                  value={formData.contactMobileNumber}
                  onChange={(e) => handleInputChange('contactMobileNumber', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dependants Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dependants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Social Security No.</TableHead>
                  <TableHead>Name of Dependant</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Relationship to Insured</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependants.map((dependant, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={dependant.socialSecurityNo}
                        onChange={(e) => {
                          const newDependants = [...dependants];
                          newDependants[index].socialSecurityNo = e.target.value;
                          setDependants(newDependants);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={dependant.name}
                        onChange={(e) => {
                          const newDependants = [...dependants];
                          newDependants[index].name = e.target.value;
                          setDependants(newDependants);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={dependant.dateOfBirth}
                        onChange={(e) => {
                          const newDependants = [...dependants];
                          newDependants[index].dateOfBirth = e.target.value;
                          setDependants(newDependants);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={dependant.gender}
                        onValueChange={(value) => {
                          const newDependants = [...dependants];
                          newDependants[index].gender = value;
                          setDependants(newDependants);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={dependant.relationship}
                        onChange={(e) => {
                          const newDependants = [...dependants];
                          newDependants[index].relationship = e.target.value;
                          setDependants(newDependants);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="button" onClick={addDependant} className="mt-2">
              Add Dependant
            </Button>
          </CardContent>
        </Card>

        {/* Section 4a - Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Section 4a - Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mainOccupation">Main Occupation</Label>
              <Input
                id="mainOccupation"
                value={formData.mainOccupation}
                onChange={(e) => handleInputChange('mainOccupation', e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="employedOnWorkPermit"
                checked={formData.employedOnWorkPermit}
                onCheckedChange={(checked) => handleInputChange('employedOnWorkPermit', checked)}
              />
              <Label htmlFor="employedOnWorkPermit">Are you employed on a work permit?</Label>
            </div>

            {formData.employedOnWorkPermit && (
              <div>
                <Label htmlFor="workPermitExpiration">If yes, state date of expiration</Label>
                <Input
                  id="workPermitExpiration"
                  type="date"
                  value={formData.workPermitExpiration}
                  onChange={(e) => handleInputChange('workPermitExpiration', e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registeredNPF"
                  checked={formData.registeredNPF}
                  onCheckedChange={(checked) => handleInputChange('registeredNPF', checked)}
                />
                <Label htmlFor="registeredNPF">Have you been previously registered for National Provident Fund in this Federation?</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registeredSocialSecurity"
                  checked={formData.registeredSocialSecurity}
                  onCheckedChange={(checked) => handleInputChange('registeredSocialSecurity', checked)}
                />
                <Label htmlFor="registeredSocialSecurity">Have you been previously registered for Social Security in this Federation?</Label>
              </div>
            </div>

            {(formData.registeredNPF || formData.registeredSocialSecurity) && (
              <div>
                <Label className="text-sm font-medium">If you answered 'yes' to being registered in either Fund, please state your former employer(s) and year(s) you worked:</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer(s)</TableHead>
                      <TableHead>From (year)</TableHead>
                      <TableHead>To (year)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formerEmployers.map((employer, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={employer.employer}
                            onChange={(e) => {
                              const newEmployers = [...formerEmployers];
                              newEmployers[index].employer = e.target.value;
                              setFormerEmployers(newEmployers);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={employer.fromYear}
                            onChange={(e) => {
                              const newEmployers = [...formerEmployers];
                              newEmployers[index].fromYear = e.target.value;
                              setFormerEmployers(newEmployers);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={employer.toYear}
                            onChange={(e) => {
                              const newEmployers = [...formerEmployers];
                              newEmployers[index].toYear = e.target.value;
                              setFormerEmployers(newEmployers);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button type="button" onClick={addFormerEmployer} className="mt-2">
                  Add Former Employer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4b - Current Employer */}
        <Card>
          <CardHeader>
            <CardTitle>Section 4b - Current Employer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employerName">Employer's Name</Label>
                <Input
                  id="employerName"
                  value={formData.employerName}
                  onChange={(e) => handleInputChange('employerName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="employerPhone">Phone Number</Label>
                <Input
                  id="employerPhone"
                  value={formData.employerPhone}
                  onChange={(e) => handleInputChange('employerPhone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employerAddress">Employer's Address</Label>
                <Input
                  id="employerAddress"
                  value={formData.employerAddress}
                  onChange={(e) => handleInputChange('employerAddress', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="employerTown">Town/Village/Island</Label>
                <Input
                  id="employerTown"
                  value={formData.employerTown}
                  onChange={(e) => handleInputChange('employerTown', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="workedInCaricom"
                checked={formData.workedInCaricom}
                onCheckedChange={(checked) => handleInputChange('workedInCaricom', checked)}
              />
              <Label htmlFor="workedInCaricom">Have you ever worked in another CARICOM country?</Label>
            </div>

            {formData.workedInCaricom && (
              <div>
                <Label className="text-sm font-medium">If you answered 'yes' to the above question please list the countries and your last employer in the table below:</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>CARICOM Countries</TableHead>
                      <TableHead>Last Employer</TableHead>
                      <TableHead>Period Worked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caricomCountries.map((country, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={country.country}
                            onChange={(e) => {
                              const newCountries = [...caricomCountries];
                              newCountries[index].country = e.target.value;
                              setCaricomCountries(newCountries);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={country.lastEmployer}
                            onChange={(e) => {
                              const newCountries = [...caricomCountries];
                              newCountries[index].lastEmployer = e.target.value;
                              setCaricomCountries(newCountries);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={country.periodWorked}
                            onChange={(e) => {
                              const newCountries = [...caricomCountries];
                              newCountries[index].periodWorked = e.target.value;
                              setCaricomCountries(newCountries);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button type="button" onClick={addCaricomCountry} className="mt-2">
                  Add CARICOM Country
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Declaration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Declaration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm">
                I solemnly and sincerely declare that I am the applicant named herein and that the information given on this form is correct
                to the best of my knowledge and belief and that if there is any statement given which I know to be false, I am liable to legal
                action.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="declarationAccepted"
                checked={formData.declarationAccepted}
                onCheckedChange={(checked) => handleInputChange('declarationAccepted', checked)}
              />
              <Label htmlFor="declarationAccepted" className="text-sm font-medium">
                I accept the declaration above *
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicantSignature">Signature or mark/right thumb impression of applicant</Label>
                <Input
                  id="applicantSignature"
                  value={formData.applicantSignature}
                  onChange={(e) => handleInputChange('applicantSignature', e.target.value)}
                  placeholder="Type your full name"
                />
              </div>
              <div>
                <Label htmlFor="signatureDate">Date (dd/mm/yyyy)</Label>
                <Input
                  id="signatureDate"
                  type="date"
                  value={formData.signatureDate}
                  onChange={(e) => handleInputChange('signatureDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="witnessName">Name of witness/guardian (Type in BLOCK LETTERS)</Label>
                <Input
                  id="witnessName"
                  value={formData.witnessName}
                  onChange={(e) => handleInputChange('witnessName', e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div>
                <Label htmlFor="witnessDate">Date (dd/mm/yyyy)</Label>
                <Input
                  id="witnessDate"
                  type="date"
                  value={formData.witnessDate}
                  onChange={(e) => handleInputChange('witnessDate', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="witnessSignature">Signature of witness/guardian (If applicant is unable to write or is under age 16)</Label>
              <Input
                id="witnessSignature"
                value={formData.witnessSignature}
                onChange={(e) => handleInputChange('witnessSignature', e.target.value)}
                placeholder="Type witness full name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button type="submit" size="lg" className="px-8">
            Submit Registration
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PersonRegistration;
