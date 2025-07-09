
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  User, 
  MapPin, 
  Users, 
  Shield, 
  CreditCard, 
  Clock, 
  Camera, 
  FileText,
  Plus,
  Trash2,
  UserCheck,
  Save,
  Printer,
  IdCard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ComprehensiveIPForm = () => {
  const { toast } = useToast();
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [relations, setRelations] = useState<any[]>([]);
  const [dependents, setDependents] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    // Basic Details
    surname: '',
    firstname: '',
    middlename: '',
    age: '',
    sex: '',
    dateOfBirth: '',
    maritalStatus: '',
    height: '',
    birthPlace: '',
    nationality: '',
    dateMarried: '',
    eyeColor: '',
    occupation: '',
    workPermit: false,
    workPermitExpiration: '',
    dateResident: '',
    npf: false,
    plOfResidence: '',
    applicationDate: new Date().toISOString().split('T')[0],
    telNumber: '',
    mobileNumber: '',
    email: '',
    citizenship: false,
    dateOfDeath: '',
    signatureOnFile: false,
    
    // Address
    mailingAddress: '',
    residentAddress: '',
    postalDistrict: '',
    
    // Verification
    maritalStatusVerification: '',
    birthStatusVerification: '',
    deathStatusVerification: '',
    nameStatusVerification: '',
    dateOfVerification: '',
    verifiedBy: '',
    
    // Registration Card Details
    pemCardDate: '',
    tempCardDate: '',
    dateCardRecvd: '',
    cardExpiration: '',
    
    // Transaction Details
    dateOfEntry: new Date().toISOString().split('T')[0],
    registrationDate: '',
    enteredBy: '',
    dateModified: '',
    userId: '',
    terminationDate: '',
    terminationCode: ''
  });

  const [nameDetails, setNameDetails] = useState({
    title: '',
    first: '',
    middle: '',
    surname: '',
    maiden: '',
    suffix: '',
    alias: ''
  });

  const postalDistricts = [
    'Basseterre Zone 01', 'Basseterre Zone 02', 'Basseterre Zone 03', 'Basseterre Zone 04',
    'Basseterre Zone 05', 'Basseterre Zone 06', 'Basseterre Zone 07', 'Basseterre Zone 08',
    'Basseterre Zone 09', 'Basseterre Zone 10', 'Basseterre Zone 11', 'Cayon Zone 06',
    'Charlestown', 'Dieppe Bay', 'Zone 04', 'Gingerland', 'Old Road Zone 02',
    'Overseas', 'Sandy Point Zone 03', 'Tabernacle Zone 05', 'Unknown'
  ];

  const countries = [
    'St. Kitts and Nevis', 'Antigua and Barbuda', 'Barbados', 'Dominica', 'Grenada',
    'Jamaica', 'St. Lucia', 'St. Vincent and the Grenadines', 'Trinidad and Tobago',
    'United States', 'Canada', 'United Kingdom', 'Other'
  ];

  const occupations = [
    'A.C Equipment Tec', 'Ablebodied Seaman', 'Accountant', 'Accounts Clerk',
    'Teacher', 'Nurse', 'Doctor', 'Engineer', 'Lawyer', 'Police Officer', 'Farmer'
  ];

  const verificationDocuments = [
    'Baptism Certificate', 'Birth Certificate', 'Certificate of Death', 'Deed Poll',
    'Adoption Certificate', 'Affidavit', 'Divorce Certificate', 'Identification Card',
    'Identification Letter', 'Marriage Certificate', 'Passport', 'Document not Available'
  ];

  const addRelation = (type: string) => {
    const newRelation = {
      id: Date.now().toString(),
      type,
      data: {}
    };
    setRelations([...relations, newRelation]);
  };

  const removeRelation = (id: string) => {
    setRelations(relations.filter(r => r.id !== id));
  };

  const handleSubmit = (action: 'save' | 'print' | 'generateId' | 'verifyData') => {
    console.log(`${action} clicked`, { formData, relations, dependents, notes });
    toast({
      title: `IP ${action === 'generateId' ? 'ID Card Generated' : 
                 action === 'verifyData' ? 'Verification Requested' : 
                 action === 'print' ? 'Printed' : 'Saved'}`,
      description: `Insured Person has been ${action}d successfully.`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Insured Person</h1>
          <p className="text-gray-600">Complete all sections to register a new insured person</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column - Basic Details & Address */}
        <div className="space-y-6">
          {/* Basic Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="surname">Surname *</Label>
                  <Input
                    id="surname"
                    value={formData.surname}
                    onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="firstname">First Name *</Label>
                  <Input
                    id="firstname"
                    value={formData.firstname}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstname: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="middlename">Middle Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="middlename"
                      value={formData.middlename}
                      onChange={(e) => setFormData(prev => ({ ...prev, middlename: e.target.value }))}
                    />
                    <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">Name</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Complete Name Details</DialogTitle>
                          <DialogDescription>Add complete name information</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Title</Label>
                            <Select value={nameDetails.title} onValueChange={(value) => setNameDetails(prev => ({ ...prev, title: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dr.">Dr.</SelectItem>
                                <SelectItem value="Miss.">Miss.</SelectItem>
                                <SelectItem value="Mr.">Mr.</SelectItem>
                                <SelectItem value="Mrs.">Mrs.</SelectItem>
                                <SelectItem value="Ms.">Ms.</SelectItem>
                                <SelectItem value="Prof.">Prof.</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Suffix</Label>
                            <Select value={nameDetails.suffix} onValueChange={(value) => setNameDetails(prev => ({ ...prev, suffix: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="I">I</SelectItem>
                                <SelectItem value="II">II</SelectItem>
                                <SelectItem value="III">III</SelectItem>
                                <SelectItem value="Jr.">Jr.</SelectItem>
                                <SelectItem value="Sr.">Sr.</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Maiden Name</Label>
                            <Input value={nameDetails.maiden} onChange={(e) => setNameDetails(prev => ({ ...prev, maiden: e.target.value }))} />
                          </div>
                          <div>
                            <Label>Alias</Label>
                            <Input value={nameDetails.alias} onChange={(e) => setNameDetails(prev => ({ ...prev, alias: e.target.value }))} />
                          </div>
                        </div>
                        <Button onClick={() => setShowNameDialog(false)}>Save Name Details</Button>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div>
                  <Label htmlFor="sex">Sex *</Label>
                  <Select value={formData.sex} onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Not Specified">Not Specified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select value={formData.maritalStatus} onValueChange={(value) => setFormData(prev => ({ ...prev, maritalStatus: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Common Law">Common Law</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Separated">Separated</SelectItem>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Unknown">Unknown</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Select value={formData.occupation} onValueChange={(value) => setFormData(prev => ({ ...prev, occupation: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {occupations.map(occ => (
                        <SelectItem key={occ} value={occ}>{occ}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="telNumber">Telephone Number</Label>
                  <Input
                    id="telNumber"
                    placeholder="+1-869-XXX-XXXX"
                    value={formData.telNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, telNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="mobileNumber">Mobile Number</Label>
                  <Input
                    id="mobileNumber"
                    placeholder="+1-869-XXX-XXXX"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6 flex-wrap">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="workPermit"
                    checked={formData.workPermit}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, workPermit: !!checked }))}
                  />
                  <Label htmlFor="workPermit">Work Permit</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="npf"
                    checked={formData.npf}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, npf: !!checked }))}
                  />
                  <Label htmlFor="npf">NPF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="citizenship"
                    checked={formData.citizenship}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, citizenship: !!checked }))}
                  />
                  <Label htmlFor="citizenship">Citizenship</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="signatureOnFile"
                    checked={formData.signatureOnFile}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, signatureOnFile: !!checked }))}
                  />
                  <Label htmlFor="signatureOnFile">Signature on File</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="mailingAddress">Mailing Address</Label>
                  <Textarea
                    id="mailingAddress"
                    placeholder="Enter mailing address"
                    value={formData.mailingAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, mailingAddress: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="residentAddress">Resident Address</Label>
                  <Textarea
                    id="residentAddress"
                    placeholder="Enter resident address"
                    value={formData.residentAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, residentAddress: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="postalDistrict">Postal District</Label>
                  <Select value={formData.postalDistrict} onValueChange={(value) => setFormData(prev => ({ ...prev, postalDistrict: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {postalDistricts.map(district => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Relations Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => addRelation('Beneficiary')} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Beneficiary
                </Button>
                <Button onClick={() => addRelation('Contact')} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
                <Button onClick={() => addRelation('Spouse')} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Spouse
                </Button>
              </div>

              {relations.map((relation) => (
                <Card key={relation.id} className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">{relation.type}</h5>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRelation(relation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input placeholder={`${relation.type} Name`} />
                    <Input placeholder="Relationship" />
                    <Textarea placeholder="Address" className="md:col-span-2" />
                    <Input placeholder="Phone" />
                    <Input placeholder="Email" type="email" />
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Verification, Registration Card, Transaction */}
        <div className="space-y-6">
          {/* Verification Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Marital Status Verified by</Label>
                  <Select value={formData.maritalStatusVerification} onValueChange={(value) => setFormData(prev => ({ ...prev, maritalStatusVerification: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {verificationDocuments.map(doc => (
                        <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Birth Status Verified by</Label>
                  <Select value={formData.birthStatusVerification} onValueChange={(value) => setFormData(prev => ({ ...prev, birthStatusVerification: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {verificationDocuments.map(doc => (
                        <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date of Verification</Label>
                  <Input
                    type="date"
                    value={formData.dateOfVerification}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateOfVerification: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Verified By</Label>
                  <Input
                    value={formData.verifiedBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, verifiedBy: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Card Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Registration Card
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Permanent Card Date</Label>
                  <Input
                    type="date"
                    value={formData.pemCardDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, pemCardDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Temporary Card Date</Label>
                  <Input
                    type="date"
                    value={formData.tempCardDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempCardDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Date Card Received</Label>
                  <Input
                    type="date"
                    value={formData.dateCardRecvd}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateCardRecvd: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Card Expiration</Label>
                  <Input
                    type="date"
                    value={formData.cardExpiration}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardExpiration: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Date of Entry</Label>
                  <Input
                    type="date"
                    value={formData.dateOfEntry}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label>Registration Date</Label>
                  <Input
                    type="date"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, registrationDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Entered By</Label>
                  <Input
                    value={formData.enteredBy}
                    onChange={(e) => setFormData(prev => ({ ...prev, enteredBy: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>User ID</Label>
                  <Input
                    value={formData.userId}
                    onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photo & Signature Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photo & Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Upload Photo</p>
                  <Button variant="outline" className="mt-2">Choose File</Button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Upload Signature</p>
                  <Button variant="outline" className="mt-2">Choose File</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end border-t pt-6">
        <Button variant="outline" onClick={() => handleSubmit('save')}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button variant="outline" onClick={() => handleSubmit('print')}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button onClick={() => handleSubmit('generateId')}>
          <IdCard className="h-4 w-4 mr-2" />
          Generate ID Card
        </Button>
        <Button 
          variant="outline" 
          onClick={() => handleSubmit('verifyData')}
          className="flex items-center gap-2"
        >
          <UserCheck className="h-4 w-4" />
          Verify Data
        </Button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Cross-Verification Notice</h4>
        <p className="text-sm text-yellow-700">
          After entering the IP details, verification must be done by another Customer Relationship Representative, 
          Supervisor, or Manager. The same person cannot verify their own entry.
        </p>
      </div>
    </div>
  );
};
