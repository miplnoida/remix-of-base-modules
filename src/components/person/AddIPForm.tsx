
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { User, MapPin, Users, FileText, Camera, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Relation {
  id: string;
  type: 'Beneficiary' | 'Contact' | 'Parent' | 'Spouse' | 'Witness';
  data: any;
}

interface Dependent {
  id: string;
  surname: string;
  firstname: string;
  middlename: string;
  address: string;
  sex: string;
  dob: string;
  relation: string;
  schoolChild: boolean;
  invalid: boolean;
  dateModified: string;
  userId: string;
  dateOfDeath?: string;
}

export const AddIPForm = () => {
  const { toast } = useToast();
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [activeTab, setActiveTab] = useState('basic');

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

  const occupations = [
    'A.C Equipment Tec', 'Ablebodied Seaman', 'Accountant', 'Accounts Clerk',
    'Administer Legal Secretary', 'Administrative Assistance', 'Adult Educator',
    'Advertising & P.R Manager', 'Agr. Research Technician', 'Agriculture Assistant',
    'Agricultural Labourer', 'Agronomist', 'Air Traffic Controller', 'Air Traffic Safety Technician',
    'Aircraft Pilot', 'Airline Clerk', 'Ambulance Officer', 'Animal & Crop Farming'
  ];

  const verificationDocuments = [
    'Baptism Certificate', 'Birth Certificate', 'Certificate of Death', 'Deed Poll',
    'Adoption Certificate', 'Affidavit', 'Divorce Certificate', 'Identification Card',
    'Identification Letter', 'Marriage Certificate', 'Passport', 'Document not Available'
  ];

  const addRelation = (type: Relation['type']) => {
    const newRelation: Relation = {
      id: Date.now().toString(),
      type,
      data: {}
    };
    setRelations([...relations, newRelation]);
  };

  const addDependent = () => {
    const newDependent: Dependent = {
      id: Date.now().toString(),
      surname: '',
      firstname: '',
      middlename: '',
      address: '',
      sex: '',
      dob: '',
      relation: '',
      schoolChild: false,
      invalid: false,
      dateModified: new Date().toISOString().split('T')[0],
      userId: 'current_user'
    };
    setDependents([...dependents, newDependent]);
  };

  const handleSubmit = (action: 'save' | 'print' | 'generateId') => {
    console.log(`${action} clicked`, { formData, relations, dependents });
    toast({
      title: `IP ${action === 'generateId' ? 'ID Card Generated' : action === 'print' ? 'Printed' : 'Saved'}`,
      description: `Insured Person has been ${action === 'generateId' ? 'ID card generated' : action}d successfully.`,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Details</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="dependents">Dependents</TabsTrigger>
          <TabsTrigger value="notes">Notes & Photo</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="height">Height (Ft. & In.)</Label>
                  <Input
                    id="height"
                    placeholder="e.g., 5'8\""
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="eyeColor">Eye Color</Label>
                  <Select value={formData.eyeColor} onValueChange={(value) => setFormData(prev => ({ ...prev, eyeColor: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Black">Black</SelectItem>
                      <SelectItem value="Blue">Blue</SelectItem>
                      <SelectItem value="Brown">Brown</SelectItem>
                      <SelectItem value="Green">Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="birthPlace">Birth Place</Label>
                  <Input
                    id="birthPlace"
                    value={formData.birthPlace}
                    onChange={(e) => setFormData(prev => ({ ...prev, birthPlace: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="flex items-center space-x-4">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Mailing Address</h4>
                  <Textarea
                    placeholder="Enter mailing address"
                    value={formData.mailingAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, mailingAddress: e.target.value }))}
                  />
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Resident Address</h4>
                  <Textarea
                    placeholder="Enter resident address"
                    value={formData.residentAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, residentAddress: e.target.value }))}
                  />
                </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
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
                <Button onClick={() => addRelation('Parent')} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Parent
                </Button>
                <Button onClick={() => addRelation('Spouse')} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Spouse
                </Button>
                <Button onClick={() => addRelation('Witness')} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Witness
                </Button>
              </div>

              {relations.map((relation) => (
                <Card key={relation.id} className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">{relation.type}</h5>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRelations(relations.filter(r => r.id !== relation.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {relation.type === 'Contact' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Contact Name" />
                      <Input placeholder="Contact Relation" />
                      <Input placeholder="Contact Address" />
                      <Input placeholder="Phone (+country code)" />
                      <Input placeholder="Mobile (+country code)" />
                      <Input placeholder="Email" type="email" />
                    </div>
                  )}
                  
                  {relation.type === 'Spouse' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Spouse Name" />
                      <Input placeholder="Spouse Address" />
                      <Input placeholder="Spouse DOB" type="date" />
                      <Input placeholder="Spouse SSN (6 digits)" maxLength={6} />
                    </div>
                  )}
                  
                  {relation.type === 'Parent' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Father's Name" />
                      <Input placeholder="Mother's Name" />
                    </div>
                  )}
                  
                  {relation.type === 'Beneficiary' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Beneficiary's Name" />
                      <Textarea placeholder="Beneficiary's Address" />
                    </div>
                  )}
                  
                  {relation.type === 'Witness' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Witness Name" />
                      <Input placeholder="Date of Witnessed" type="date" />
                    </div>
                  )}
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Verification Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Label>Name Status Verified by</Label>
                  <Select value={formData.nameStatusVerification} onValueChange={(value) => setFormData(prev => ({ ...prev, nameStatusVerification: value }))}>
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
                  <Label>Death Status Verified by</Label>
                  <Select value={formData.deathStatusVerification} onValueChange={(value) => setFormData(prev => ({ ...prev, deathStatusVerification: value }))}>
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
        </TabsContent>

        <TabsContent value="dependents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Dependents</span>
                <Button onClick={addDependent} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Dependent
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dependents.map((dependent, index) => (
                <Card key={dependent.id} className="p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-medium">Dependent {index + 1}</h5>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDependents(dependents.filter(d => d.id !== dependent.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Surname" />
                    <Input placeholder="First Name" />
                    <Input placeholder="Middle Name" />
                    <Textarea placeholder="Address" className="md:col-span-3" />
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sex" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="date" placeholder="Date of Birth" />
                    <Input placeholder="Relation" />
                  </div>
                  <div className="flex space-x-4 mt-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox id={`school-${dependent.id}`} />
                      <Label htmlFor={`school-${dependent.id}`}>School Child</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id={`invalid-${dependent.id}`} />
                      <Label htmlFor={`invalid-${dependent.id}`}>Invalid</Label>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Note Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>Note</Label>
                  <Textarea placeholder="Enter note" rows={5} />
                </div>
                <Button size="sm">Add Note</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photo & Signature
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to capture photo</p>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to capture signature</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => handleSubmit('save')}>
          Save
        </Button>
        <Button variant="outline" onClick={() => handleSubmit('print')}>
          Print
        </Button>
        <Button onClick={() => handleSubmit('generateId')}>
          Generate ID Card
        </Button>
      </div>
    </div>
  );
};
