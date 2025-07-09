
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, CalendarIcon, User, MapPin, Phone, Briefcase, Users, Shield, CreditCard, FileSignature, Camera, Save, Printer, Search, Edit, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Form schema
const registrationSchema = z.object({
  // Basic Information
  title: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  surname: z.string().min(1, 'Surname is required'),
  maidenName: z.string().optional(),
  suffix: z.string().optional(),
  alias: z.string().optional(),
  dateOfBirth: z.date({ required_error: 'Date of birth is required' }),
  sex: z.enum(['Male', 'Female', 'Not Specified']),
  maritalStatus: z.enum(['Common Law', 'Married', 'Divorced', 'Separated', 'Single', 'Widowed', 'Unknown']),
  nationality: z.string().min(1, 'Nationality is required'),
  birthplace: z.string().min(1, 'Birthplace is required'),
  dateOfMarriage: z.date().optional(),
  eyeColor: z.enum(['Black', 'Blue', 'Brown', 'Green']).optional(),
  heightFeet: z.number().optional(),
  heightInches: z.number().optional(),
  
  // Address Information
  residentAddress1: z.string().min(1, 'Resident address is required'),
  residentAddress2: z.string().optional(),
  mailingAddress1: z.string().optional(),
  mailingAddress2: z.string().optional(),
  postalDistrict: z.string().min(1, 'Postal district is required'),
  placeOfResidence: z.string().min(1, 'Place of residence is required'),
  
  // Contact Details
  phoneNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  emailAddress: z.string().email().optional(),
  
  // Employment & Legal Details
  primaryOccupation: z.string().min(1, 'Primary occupation is required'),
  employerName: z.string().optional(),
  workPermit: z.boolean().default(false),
  workPermitExperience: z.string().optional(),
  dateOfResidency: z.date().optional(),
  npfStatus: z.boolean().default(false),
  citizenshipStatus: z.boolean().default(false),
  applicationDate: z.date().default(() => new Date()),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const districts = [
  'Basseterre Zone 01', 'Basseterre Zone 02', 'Basseterre Zone 03', 'Basseterre Zone 04',
  'Basseterre Zone 05', 'Basseterre Zone 06', 'Basseterre Zone 07', 'Basseterre Zone 08',
  'Basseterre Zone 09', 'Basseterre Zone 10', 'Basseterre Zone 11', 'Dieppe Bay Zone 04',
  'Charlestown', 'Gingerland', 'Saint James Parish', 'Saint Anne Parish'
];

const occupations = [
  'Accountant', 'Seaman', 'Teacher', 'Nurse', 'Doctor', 'Engineer', 'Lawyer', 'Police Officer',
  'Construction Worker', 'Administrative Assistant', 'Sales Representative', 'Chef', 'Driver',
  'Mechanic', 'Electrician', 'Plumber', 'Farmer', 'Fisher', 'Shop Keeper', 'Security Guard'
];

const countries = [
  'Saint Kitts and Nevis', 'Antigua and Barbuda', 'Barbados', 'Dominica', 'Grenada',
  'Jamaica', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
  'United States', 'Canada', 'United Kingdom', 'Other'
];

const documentTypes = [
  'Birth Certificate', 'Passport', 'Identification Card', 'Marriage Certificate',
  'Divorce Certificate', 'Death Certificate', 'Affidavit', 'Court Order', 'Other'
];

interface Relation {
  id: string;
  type: 'beneficiary' | 'contact' | 'spouse' | 'witness';
  name: string;
  address?: string;
  relation?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  dob?: Date;
  ssn?: string;
  dateWitnessed?: Date;
}

export const ComprehensiveIPForm = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState<Partial<Relation>>({ type: 'beneficiary' });
  const [verification, setVerification] = useState({
    maritalStatus: { status: '', dateVerified: null as Date | null, verifiedBy: '' },
    birthStatus: { status: '', dateVerified: null as Date | null, verifiedBy: '' },
    deathStatus: { status: '', dateVerified: null as Date | null, verifiedBy: '' },
    nameStatus: { status: '', dateVerified: null as Date | null, verifiedBy: '' }
  });
  const [cardIssuance, setCardIssuance] = useState({
    tempCardDate: null as Date | null,
    permCardDate: null as Date | null,
    dateCardReceived: null as Date | null,
    cardExpiration: null as Date | null
  });

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      applicationDate: new Date(),
      sex: 'Male',
      maritalStatus: 'Single',
      workPermit: false,
      npfStatus: false,
      citizenshipStatus: false
    }
  });

  const sections = [
    { name: 'Basic Information', icon: User },
    { name: 'Address Information', icon: MapPin },
    { name: 'Contact Details', icon: Phone },
    { name: 'Employment & Legal', icon: Briefcase },
    { name: 'Relations', icon: Users },
    { name: 'Verification', icon: Shield },
    { name: 'Card Issuance', icon: CreditCard },
    { name: 'Photo & Signature', icon: Camera }
  ];

  const addRelation = () => {
    if (newRelation.name && newRelation.type) {
      const relation: Relation = {
        id: Date.now().toString(),
        type: newRelation.type,
        name: newRelation.name,
        address: newRelation.address || '',
        relation: newRelation.relation || '',
        phone: newRelation.phone || '',
        mobile: newRelation.mobile || '',
        email: newRelation.email || '',
        dob: newRelation.dob,
        ssn: newRelation.ssn || '',
        dateWitnessed: newRelation.dateWitnessed
      };
      setRelations([...relations, relation]);
      setNewRelation({ type: 'beneficiary' });
      setShowAddRelation(false);
    }
  };

  const removeRelation = (id: string) => {
    setRelations(relations.filter(r => r.id !== id));
  };

  const onSubmit = (data: RegistrationFormData) => {
    console.log('Form submission:', { 
      ...data, 
      relations, 
      verification, 
      cardIssuance 
    });
    // Handle form submission
  };

  const DatePicker = ({ date, onSelect, placeholder }: { date?: Date, onSelect: (date: Date | undefined) => void, placeholder: string }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <CalendarComponent
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Select onValueChange={(value) => form.setValue('title', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Miss">Miss</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input {...form.register('firstName')} placeholder="Enter first name" />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input {...form.register('middleName')} placeholder="Enter middle name" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="surname">Surname *</Label>
                <Input {...form.register('surname')} placeholder="Enter surname" />
                {form.formState.errors.surname && (
                  <p className="text-sm text-red-600">{form.formState.errors.surname.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="maidenName">Maiden Name</Label>
                <Input {...form.register('maidenName')} placeholder="Enter maiden name" />
              </div>
              <div>
                <Label htmlFor="suffix">Suffix</Label>
                <Input {...form.register('suffix')} placeholder="Jr, Sr, III, etc." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alias">Alias</Label>
                <Input {...form.register('alias')} placeholder="Enter alias" />
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <DatePicker
                  date={form.watch('dateOfBirth')}
                  onSelect={(date) => form.setValue('dateOfBirth', date!)}
                  placeholder="Select date of birth"
                />
                {form.formState.errors.dateOfBirth && (
                  <p className="text-sm text-red-600">{form.formState.errors.dateOfBirth.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Sex *</Label>
                <Select onValueChange={(value: 'Male' | 'Female' | 'Not Specified') => form.setValue('sex', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Not Specified">Not Specified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marital Status *</Label>
                <Select onValueChange={(value: any) => form.setValue('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Common Law">Common Law</SelectItem>
                    <SelectItem value="Married">Married</SelectItem>
                    <SelectItem value="Divorced">Divorced</SelectItem>
                    <SelectItem value="Separated">Separated</SelectItem>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Widowed">Widowed</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nationality *</Label>
                <Select onValueChange={(value) => form.setValue('nationality', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Birthplace *</Label>
                <Select onValueChange={(value) => form.setValue('birthplace', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select birthplace" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.watch('maritalStatus') === 'Married' || form.watch('maritalStatus') === 'Common Law') && (
              <div>
                <Label>Date of Marriage</Label>
                <DatePicker
                  date={form.watch('dateOfMarriage')}
                  onSelect={(date) => form.setValue('dateOfMarriage', date)}
                  placeholder="Select date of marriage"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Eye Color</Label>
                <Select onValueChange={(value: any) => form.setValue('eyeColor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select eye color" />
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
                <Label>Height (Feet)</Label>
                <Input 
                  type="number" 
                  onChange={(e) => form.setValue('heightFeet', parseInt(e.target.value))}
                  placeholder="e.g., 5" 
                />
              </div>
              <div>
                <Label>Height (Inches)</Label>
                <Input 
                  type="number" 
                  onChange={(e) => form.setValue('heightInches', parseInt(e.target.value))}
                  placeholder="e.g., 8" 
                />
              </div>
            </div>
          </div>
        );

      case 1: // Address Information
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="residentAddress1">Resident Address Line 1 *</Label>
                <Input {...form.register('residentAddress1')} placeholder="Enter resident address" />
                {form.formState.errors.residentAddress1 && (
                  <p className="text-sm text-red-600">{form.formState.errors.residentAddress1.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="residentAddress2">Resident Address Line 2</Label>
                <Input {...form.register('residentAddress2')} placeholder="Apt, Suite, etc." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mailingAddress1">Mailing Address Line 1</Label>
                <Input {...form.register('mailingAddress1')} placeholder="Enter mailing address" />
              </div>
              <div>
                <Label htmlFor="mailingAddress2">Mailing Address Line 2</Label>
                <Input {...form.register('mailingAddress2')} placeholder="Apt, Suite, etc." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Postal District *</Label>
                <Select onValueChange={(value) => form.setValue('postalDistrict', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select postal district" />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Place of Residence *</Label>
                <Select onValueChange={(value) => form.setValue('placeOfResidence', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select place of residence" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case 2: // Contact Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input {...form.register('phoneNumber')} placeholder="+1 869 xxx-xxxx" />
              </div>
              <div>
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input {...form.register('mobileNumber')} placeholder="+1 869 xxx-xxxx" />
              </div>
            </div>
            <div>
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input {...form.register('emailAddress')} type="email" placeholder="example@email.com" />
              {form.formState.errors.emailAddress && (
                <p className="text-sm text-red-600">{form.formState.errors.emailAddress.message}</p>
              )}
            </div>
          </div>
        );

      case 3: // Employment & Legal Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Primary Occupation *</Label>
                <Select onValueChange={(value) => form.setValue('primaryOccupation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select occupation" />
                  </SelectTrigger>
                  <SelectContent>
                    {occupations.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>{occupation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="employerName">Employer Name</Label>
                <Input {...form.register('employerName')} placeholder="Enter employer name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="workPermit" 
                  checked={form.watch('workPermit')}
                  onCheckedChange={(checked) => form.setValue('workPermit', checked as boolean)}
                />
                <Label htmlFor="workPermit">Work Permit Required</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="npfStatus" 
                  checked={form.watch('npfStatus')}
                  onCheckedChange={(checked) => form.setValue('npfStatus', checked as boolean)}
                />
                <Label htmlFor="npfStatus">NPF Member</Label>
              </div>
            </div>

            {form.watch('workPermit') && (
              <div>
                <Label htmlFor="workPermitExperience">Work Permit Experience</Label>
                <Textarea {...form.register('workPermitExperience')} placeholder="Describe work permit experience" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date of Residency</Label>
                <DatePicker
                  date={form.watch('dateOfResidency')}
                  onSelect={(date) => form.setValue('dateOfResidency', date)}
                  placeholder="Select date of residency"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="citizenshipStatus" 
                  checked={form.watch('citizenshipStatus')}
                  onCheckedChange={(checked) => form.setValue('citizenshipStatus', checked as boolean)}
                />
                <Label htmlFor="citizenshipStatus">Citizen of Saint Kitts & Nevis</Label>
              </div>
            </div>
          </div>
        );

      case 4: // Relations
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Manage Relations</h3>
              <Button onClick={() => setShowAddRelation(true)}>Add Relation</Button>
            </div>

            {showAddRelation && (
              <Card>
                <CardHeader>
                  <CardTitle>Add New Relation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Relation Type</Label>
                      <Select onValueChange={(value: any) => setNewRelation({...newRelation, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relation type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beneficiary">Beneficiary</SelectItem>
                          <SelectItem value="contact">Emergency Contact</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="witness">Witness</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={newRelation.name || ''} 
                        onChange={(e) => setNewRelation({...newRelation, name: e.target.value})}
                        placeholder="Enter name" 
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Address</Label>
                    <Input 
                      value={newRelation.address || ''} 
                      onChange={(e) => setNewRelation({...newRelation, address: e.target.value})}
                      placeholder="Enter address" 
                    />
                  </div>

                  {newRelation.type === 'contact' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Relation</Label>
                          <Input 
                            value={newRelation.relation || ''} 
                            onChange={(e) => setNewRelation({...newRelation, relation: e.target.value})}
                            placeholder="e.g., Sister, Mother" 
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input 
                            value={newRelation.phone || ''} 
                            onChange={(e) => setNewRelation({...newRelation, phone: e.target.value})}
                            placeholder="Phone number" 
                          />
                        </div>
                        <div>
                          <Label>Mobile</Label>
                          <Input 
                            value={newRelation.mobile || ''} 
                            onChange={(e) => setNewRelation({...newRelation, mobile: e.target.value})}
                            placeholder="Mobile number" 
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input 
                          value={newRelation.email || ''} 
                          onChange={(e) => setNewRelation({...newRelation, email: e.target.value})}
                          placeholder="Email address" 
                          type="email"
                        />
                      </div>
                    </>
                  )}

                  {newRelation.type === 'spouse' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Date of Birth</Label>
                        <DatePicker
                          date={newRelation.dob}
                          onSelect={(date) => setNewRelation({...newRelation, dob: date})}
                          placeholder="Select date of birth"
                        />
                      </div>
                      <div>
                        <Label>SSN (6 digits)</Label>
                        <Input 
                          value={newRelation.ssn || ''} 
                          onChange={(e) => setNewRelation({...newRelation, ssn: e.target.value})}
                          placeholder="XXXXXX" 
                          maxLength={6}
                        />
                      </div>
                    </div>
                  )}

                  {newRelation.type === 'witness' && (
                    <div>
                      <Label>Date Witnessed</Label>
                      <DatePicker
                        date={newRelation.dateWitnessed}
                        onSelect={(date) => setNewRelation({...newRelation, dateWitnessed: date})}
                        placeholder="Select date witnessed"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={addRelation}>Add Relation</Button>
                    <Button variant="outline" onClick={() => setShowAddRelation(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {relations.map((relation) => (
                <Card key={relation.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="secondary" className="mb-2">
                          {relation.type.charAt(0).toUpperCase() + relation.type.slice(1)}
                        </Badge>
                        <h4 className="font-semibold">{relation.name}</h4>
                        {relation.address && <p className="text-sm text-gray-600">{relation.address}</p>}
                        {relation.relation && <p className="text-sm">Relation: {relation.relation}</p>}
                        {relation.phone && <p className="text-sm">Phone: {relation.phone}</p>}
                        {relation.email && <p className="text-sm">Email: {relation.email}</p>}
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeRelation(relation.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5: // Verification
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Document Verification</h3>
            
            {Object.entries(verification).map(([key, value]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Document Type</Label>
                      <Select onValueChange={(val) => setVerification({
                        ...verification,
                        [key]: { ...value, status: val }
                      })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((doc) => (
                            <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date Verified</Label>
                      <DatePicker
                        date={value.dateVerified || undefined}
                        onSelect={(date) => setVerification({
                          ...verification,
                          [key]: { ...value, dateVerified: date || null }
                        })}
                        placeholder="Select verification date"
                      />
                    </div>
                    <div>
                      <Label>Verified By</Label>
                      <Input 
                        value={value.verifiedBy}
                        onChange={(e) => setVerification({
                          ...verification,
                          [key]: { ...value, verifiedBy: e.target.value }
                        })}
                        placeholder="Enter verifier name" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 6: // Card Issuance
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">ID Card Issuance</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Temporary Card Date</Label>
                <DatePicker
                  date={cardIssuance.tempCardDate || undefined}
                  onSelect={(date) => setCardIssuance({
                    ...cardIssuance,
                    tempCardDate: date || null
                  })}
                  placeholder="Select temporary card date"
                />
              </div>
              <div>
                <Label>Permanent Card Date</Label>
                <DatePicker
                  date={cardIssuance.permCardDate || undefined}
                  onSelect={(date) => setCardIssuance({
                    ...cardIssuance,
                    permCardDate: date || null
                  })}
                  placeholder="Select permanent card date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Card Received</Label>
                <DatePicker
                  date={cardIssuance.dateCardReceived || undefined}
                  onSelect={(date) => setCardIssuance({
                    ...cardIssuance,
                    dateCardReceived: date || null
                  })}
                  placeholder="Select card received date"
                />
              </div>
              <div>
                <Label>Card Expiration Date</Label>
                <DatePicker
                  date={cardIssuance.cardExpiration || undefined}
                  onSelect={(date) => setCardIssuance({
                    ...cardIssuance,
                    cardExpiration: date || null
                  })}
                  placeholder="Select card expiration date"
                />
              </div>
            </div>
          </div>
        );

      case 7: // Photo & Signature
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Photo & Signature Upload</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Photo Upload</CardTitle>
                  <CardDescription>Upload passport-style photo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600">Click to upload photo or drag and drop</p>
                    <input type="file" accept="image/*" className="hidden" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Signature Upload</CardTitle>
                  <CardDescription>Upload or capture signature</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileSignature className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600">Click to upload signature or drag and drop</p>
                    <input type="file" accept="image/*" className="hidden" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Register Insured Person</h1>
          <p className="text-gray-600">Complete all sections to register a new insured person</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      {/* Section Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {sections.map((section, index) => (
              <Button
                key={index}
                variant={currentSection === index ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentSection(index)}
                className="flex items-center gap-2 text-xs lg:text-sm"
              >
                <section.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{section.name}</span>
                <span className="sm:hidden">{index + 1}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(sections[currentSection].icon, { className: "h-5 w-5" })}
              {sections[currentSection].name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderCurrentSection()}
          </CardContent>
        </Card>

        {/* Navigation & Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
              disabled={currentSection === sections.length - 1}
            >
              Next
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Registration
            </Button>
            <Button type="button" variant="outline" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button type="button" variant="outline" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Generate ID Card
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
