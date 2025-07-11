import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Save,
  User,
  Shield,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Users,
  Heart,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
  Camera
} from 'lucide-react';

// Import registration tabs
import { RegisterPersonForm } from '@/components/ip/RegisterPersonForm';
import { DependentTab } from '@/components/ip/DependentTab';
import { NotesTab } from '@/components/ip/NotesTab';
import { NPFTab } from '@/components/ip/NPFTab';
import { PhotoTab } from '@/components/ip/PhotoTab';
import { CaricomTab } from '@/components/ip/CaricomTab';

const EditInsuredPerson = () => {
  const { ssn } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for tabs and collapsible sections
  const [activeTab, setActiveTab] = useState('register');
  const [isRegisterSectionOpen, setIsRegisterSectionOpen] = useState(true);

  // State for form data - initialized with mock data
  const [formData, setFormData] = useState({
    ssn: '123456',
    surname: 'Doe',
    firstname: 'John',
    middlename: 'Michael',
    previousName: '',
    dob: '1985-03-15',
    sex: 'Male',
    alias: '',
    primaryOccup: 'Accountant',
    selfRefNo: 'IP001',
    aspNum: 'ASP123',
    status: 'Active',
    residentAddr1: '123 Main Street',
    residentAddr2: 'Apt 2B',
    district: 'Basseterre Zone 01',
    mailAddr1: '123 Main Street',
    mailAddr2: 'Apt 2B',
    birthPlace: 'St. Kitts',
    nationality: 'Kittitian',
    dateOfResidency: '2020-01-01',
    maritalStatus: 'Married',
    dateMarried: '2010-06-15',
    spouseName: 'Jane Doe',
    spouseAddr: '123 Main Street',
    fatherName: 'Robert Doe',
    motherName: 'Mary Doe',
    beneficiary: 'Jane Doe',
    benAddr: '123 Main Street',
    contactName: 'Emergency Contact',
    contactRelation: 'Sister',
    contactAddr: '456 Oak Street',
    phone: '+1869-465-1234',
    email: 'john.doe@email.com',
    workPermit: 'No',
    npf: 'Yes'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    // In a real application, this would send data to the backend
    console.log('Saving person data:', formData);
    toast({
      title: "Success",
      description: "Insured person details have been updated successfully.",
    });
    navigate(`/person/view/${ssn}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Inactive':
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      case 'Verify':
        return <Badge className="bg-blue-100 text-blue-800">Verify</Badge>;
      case 'Suspend':
        return <Badge className="bg-orange-100 text-orange-800">Suspend</Badge>;
      case 'Ceased':
        return <Badge className="bg-gray-100 text-gray-800">Ceased</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/person/view/${ssn}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to View
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <User className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Edit: {formData.firstname} {formData.middlename} {formData.surname}
            </h1>
            <p className="text-gray-600">SSN: {formData.ssn} | {getStatusBadge(formData.status)}</p>
          </div>
        </div>
        <div className="flex gap-3">
          
          <Button 
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
          <Button 
            onClick={handleSave}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Submit
          </Button>
        </div>
      </div>

      {/* Form Sections */}
      <div className="space-y-6">
        {/* Register Person Form Tabs Section - Collapsible */}
        <Collapsible open={isRegisterSectionOpen} onOpenChange={setIsRegisterSectionOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Registration Information
                  </CardTitle>
                  {isRegisterSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="register" className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Register Person</span>
                    </TabsTrigger>
                    <TabsTrigger value="dependent" className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="hidden sm:inline">Dependent</span>
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Notes</span>
                    </TabsTrigger>
                    <TabsTrigger value="npf" className="flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      <span className="hidden sm:inline">NPF</span>
                    </TabsTrigger>
                    <TabsTrigger value="photo" className="flex items-center gap-1">
                      <Camera className="h-4 w-4" />
                      <span className="hidden sm:inline">Photo</span>
                    </TabsTrigger>
                    <TabsTrigger value="caricom" className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">Caricom</span>
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    <TabsContent value="register">
                      <RegisterPersonForm />
                    </TabsContent>
                    
                    <TabsContent value="dependent">
                      <DependentTab />
                    </TabsContent>
                    
                    <TabsContent value="notes">
                      <NotesTab />
                    </TabsContent>
                    
                    <TabsContent value="npf">
                      <NPFTab />
                    </TabsContent>
                    
                    <TabsContent value="photo">
                      <PhotoTab />
                    </TabsContent>
                    
                    <TabsContent value="caricom">
                      <CaricomTab />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>Update contact details and communication preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
            <CardDescription>Update residential and mailing addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Residential Address</h4>
                <div>
                  <Label htmlFor="residentAddr1">Address Line 1 *</Label>
                  <Input
                    id="residentAddr1"
                    value={formData.residentAddr1}
                    onChange={(e) => handleInputChange('residentAddr1', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="residentAddr2">Address Line 2</Label>
                  <Input
                    id="residentAddr2"
                    value={formData.residentAddr2}
                    onChange={(e) => handleInputChange('residentAddr2', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="district">District *</Label>
                  <Select value={formData.district} onValueChange={(value) => handleInputChange('district', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Basseterre Zone 01">Basseterre Zone 01</SelectItem>
                      <SelectItem value="Basseterre Zone 02">Basseterre Zone 02</SelectItem>
                      <SelectItem value="Charlestown">Charlestown</SelectItem>
                      <SelectItem value="Sandy Point">Sandy Point</SelectItem>
                      <SelectItem value="Dieppe Bay">Dieppe Bay</SelectItem>
                      <SelectItem value="Cayon">Cayon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Mailing Address</h4>
                <div>
                  <Label htmlFor="mailAddr1">Address Line 1</Label>
                  <Input
                    id="mailAddr1"
                    value={formData.mailAddr1}
                    onChange={(e) => handleInputChange('mailAddr1', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="mailAddr2">Address Line 2</Label>
                  <Input
                    id="mailAddr2"
                    value={formData.mailAddr2}
                    onChange={(e) => handleInputChange('mailAddr2', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Place & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Place & Legal Status
            </CardTitle>
            <CardDescription>Update place of birth, nationality and legal status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="birthPlace">Place of Birth *</Label>
                <Input
                  id="birthPlace"
                  value={formData.birthPlace}
                  onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality *</Label>
                <Select value={formData.nationality} onValueChange={(value) => handleInputChange('nationality', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kittitian">Kittitian</SelectItem>
                    <SelectItem value="Nevisian">Nevisian</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
              <div>
                <Label htmlFor="workPermit">Work Permit Required</Label>
                <Select value={formData.workPermit} onValueChange={(value) => handleInputChange('workPermit', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="npf">NPF Member</Label>
                <Select value={formData.npf} onValueChange={(value) => handleInputChange('npf', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Family Information
            </CardTitle>
            <CardDescription>Update family and emergency contact details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Marital & Family</h4>
                <div>
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={(value) => handleInputChange('maritalStatus', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                      <SelectItem value="Common Law">Common Law</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateMarried">Date Married</Label>
                  <Input
                    id="dateMarried"
                    type="date"
                    value={formData.dateMarried}
                    onChange={(e) => handleInputChange('dateMarried', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="spouseName">Spouse Name</Label>
                  <Input
                    id="spouseName"
                    value={formData.spouseName}
                    onChange={(e) => handleInputChange('spouseName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="fatherName">Father's Name</Label>
                  <Input
                    id="fatherName"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange('fatherName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="motherName">Mother's Name</Label>
                  <Input
                    id="motherName"
                    value={formData.motherName}
                    onChange={(e) => handleInputChange('motherName', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Emergency Contact</h4>
                <div>
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactRelation">Relationship *</Label>
                  <Select value={formData.contactRelation} onValueChange={(value) => handleInputChange('contactRelation', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contactAddr">Contact Address</Label>
                  <Textarea
                    id="contactAddr"
                    value={formData.contactAddr}
                    onChange={(e) => handleInputChange('contactAddr', e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="beneficiary">Beneficiary</Label>
                  <Input
                    id="beneficiary"
                    value={formData.beneficiary}
                    onChange={(e) => handleInputChange('beneficiary', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/person/view/${ssn}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditInsuredPerson;
