
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, Edit, Save, Printer, CreditCard, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { NameDialog } from './NameDialog';
import { RelationDialog } from './RelationDialog';

const registrationSchema = z.object({
  surname: z.string().min(1, 'Surname is required'),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  age: z.number().min(0, 'Age must be positive'),
  mailingAddress: z.string().min(1, 'Mailing address is required'),
  residentAddress: z.string().min(1, 'Resident address is required'),
  postalDistrict: z.string().min(1, 'Postal district is required'),
  sex: z.enum(['Male', 'Female', 'Not Specified']),
  dateOfBirth: z.date({ required_error: 'Date of birth is required' }),
  maritalStatus: z.enum(['Common Law', 'Divorced', 'Married', 'Separated', 'Single', 'Unknown', 'Widowed']),
  heightFeet: z.number().optional(),
  heightInches: z.number().optional(),
  birthplace: z.string().min(1, 'Birthplace is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  dateMarried: z.date().optional(),
  eyeColor: z.enum(['Black', 'Blue', 'Brown', 'Green']).optional(),
  occupation: z.string().min(1, 'Occupation is required'),
  workPermit: z.boolean().default(false),
  workPermitExperience: z.string().optional(),
  dateResident: z.date().optional(),
  npf: z.boolean().default(false),
  plOfResidence: z.string().min(1, 'Place of residence is required'),
  applicationDate: z.date().default(() => new Date()),
  telNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional(),
  citizenship: z.boolean().default(false),
  dateOfDeath: z.date().optional(),
  signatureOnFile: z.boolean().default(false)
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const postalDistricts = [
  'Basseterre Zone 01', 'Basseterre Zone 02', 'Basseterre Zone 03', 'Basseterre Zone 04',
  'Basseterre Zone 05', 'Basseterre Zone 06', 'Basseterre Zone 07', 'Basseterre Zone 08',
  'Basseterre Zone 09', 'Basseterre Zone 10', 'Basseterre Zone 11', 'Cayon Zone 06',
  'Charlestown', 'Dieppe Bay Zone 04', 'Gingerland', 'Old Road Zone 02', 'Overseas',
  'Sandy Point Zone 03', 'Tabernacle Zone 05', 'Unknown'
];

const occupations = [
  'A.C Equipment Tec', 'Ablebodied Seaman', 'Accountant', 'Accounts Clerk', 'Administer Legal Secretary',
  'Administrative Assistance', 'Adult Educator', 'Advertising & P.R Manager', 'Agr. Research Technician',
  'Agriculture Assistant', 'Agricultural Labourer', 'Agronomist', 'Air Traffic Controller',
  'Air Traffic Safety Technician', 'Aircraft Pilot', 'Airline Clerk', 'Ambulance Officer',
  'Animal & Crop Farming', 'Teacher', 'Nurse', 'Doctor', 'Engineer', 'Lawyer', 'Police Officer',
  'Construction Worker', 'Sales Representative', 'Chef', 'Driver', 'Mechanic', 'Electrician',
  'Plumber', 'Farmer', 'Fisher', 'Shop Keeper', 'Security Guard'
];

const countries = [
  'Saint Kitts and Nevis', 'Antigua and Barbuda', 'Barbados', 'Dominica', 'Grenada',
  'Jamaica', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
  'United States', 'Canada', 'United Kingdom', 'Other'
];

const verificationDocuments = [
  'Baptism Certificate', 'Birth Certificate', 'Certificate of Death', 'Deed Poll',
  'Adoption Certificate', 'Affidavit', 'Divorce Certificate', 'Identification Card',
  'Identification Letter', 'Marriage Certificate', 'Passport', 'Document not Available'
];

interface Relation {
  id: string;
  type: 'beneficiary' | 'contact' | 'parent' | 'spouse' | 'witness';
  data: any;
}

export const RegisterPersonForm = () => {
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [verification, setVerification] = useState({
    maritalStatus: { verifiedBy: '', dateVerified: null as Date | null, verifierName: '' },
    birthStatus: { verifiedBy: '', dateVerified: null as Date | null, verifierName: '' },
    deathStatus: { verifiedBy: '', dateVerified: null as Date | null, verifierName: '' },
    nameStatus: { verifiedBy: '', dateVerified: null as Date | null, verifierName: '' }
  });
  const [cardDetails, setCardDetails] = useState({
    permCardDate: null as Date | null,
    tempCardDate: null as Date | null,
    dateCardReceived: null as Date | null,
    cardExpiration: null as Date | null
  });
  const [transactionDetails, setTransactionDetails] = useState({
    dateOfEntry: new Date(),
    registrationDate: new Date(),
    enteredBy: '',
    dateModified: null as Date | null,
    userId: '',
    terminationDate: null as Date | null,
    terminationCode: ''
  });

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      applicationDate: new Date(),
      sex: 'Male',
      maritalStatus: 'Single',
      workPermit: false,
      npf: false,
      citizenship: false,
      signatureOnFile: false
    }
  });

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
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );

  const addRelation = (relationData: Relation) => {
    setRelations([...relations, relationData]);
  };

  const removeRelation = (id: string) => {
    setRelations(relations.filter(r => r.id !== id));
  };

  const onSubmit = (data: RegistrationFormData) => {
    console.log('Form submission:', { 
      ...data, 
      relations, 
      verification, 
      cardDetails,
      transactionDetails
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="surname">Surname *</Label>
                <Input {...form.register('surname')} placeholder="Enter surname" />
                {form.formState.errors.surname && (
                  <p className="text-sm text-red-600">{form.formState.errors.surname.message}</p>
                )}
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

            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={() => setShowNameDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Name Details
              </Button>
              <div>
                <Label htmlFor="age">Age</Label>
                <Input 
                  type="number" 
                  onChange={(e) => form.setValue('age', parseInt(e.target.value))}
                  placeholder="Enter age" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mailingAddress">Mailing Address *</Label>
                <Textarea {...form.register('mailingAddress')} placeholder="Enter mailing address" />
              </div>
              <div>
                <Label htmlFor="residentAddress">Resident Address *</Label>
                <Textarea {...form.register('residentAddress')} placeholder="Enter resident address" />
              </div>
            </div>

            <div>
              <Label>Postal District *</Label>
              <Select onValueChange={(value) => form.setValue('postalDistrict', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select postal district" />
                </SelectTrigger>
                <SelectContent>
                  {postalDistricts.map((district) => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Relations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Relations
              <Button type="button" onClick={() => setShowRelationDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Relation
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {relations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No relations added yet</p>
            ) : (
              <div className="space-y-2">
                {relations.map((relation) => (
                  <div key={relation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium capitalize">{relation.type}</span>
                      <span className="text-gray-500 ml-2">
                        {relation.data.name || relation.data.fatherName || 'Unnamed'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeRelation(relation.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Sex *</Label>
                <Select onValueChange={(value: any) => form.setValue('sex', value)}>
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
                <Label>Date of Birth *</Label>
                <DatePicker
                  date={form.watch('dateOfBirth')}
                  onSelect={(date) => form.setValue('dateOfBirth', date!)}
                  placeholder="Select date of birth"
                />
              </div>
              <div>
                <Label>Marital Status *</Label>
                <Select onValueChange={(value: any) => form.setValue('maritalStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select marital status" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Height (Feet)</Label>
                  <Input 
                    type="number" 
                    onChange={(e) => form.setValue('heightFeet', parseInt(e.target.value))}
                    placeholder="5" 
                  />
                </div>
                <div className="flex-1">
                  <Label>Height (Inches)</Label>
                  <Input 
                    type="number" 
                    onChange={(e) => form.setValue('heightInches', parseInt(e.target.value))}
                    placeholder="8" 
                  />
                </div>
              </div>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {(form.watch('maritalStatus') === 'Married' || form.watch('maritalStatus') === 'Common Law') && (
              <div>
                <Label>Date Married</Label>
                <DatePicker
                  date={form.watch('dateMarried')}
                  onSelect={(date) => form.setValue('dateMarried', date)}
                  placeholder="Select date of marriage"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Occupation *</Label>
              <Select onValueChange={(value) => form.setValue('occupation', value)}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="workPermit" 
                  checked={form.watch('workPermit')}
                  onCheckedChange={(checked) => form.setValue('workPermit', checked as boolean)}
                />
                <Label htmlFor="workPermit">Work Permit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="npf" 
                  checked={form.watch('npf')}
                  onCheckedChange={(checked) => form.setValue('npf', checked as boolean)}
                />
                <Label htmlFor="npf">NPF</Label>
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
                <Label>Date Resident</Label>
                <DatePicker
                  date={form.watch('dateResident')}
                  onSelect={(date) => form.setValue('dateResident', date)}
                  placeholder="Select date of residency"
                />
              </div>
              <div>
                <Label>Place of Residence *</Label>
                <Select onValueChange={(value) => form.setValue('plOfResidence', value)}>
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

            <div>
              <Label>Application Date</Label>
              <DatePicker
                date={form.watch('applicationDate')}
                onSelect={(date) => form.setValue('applicationDate', date!)}
                placeholder="Application date"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telNumber">Telephone Number</Label>
                <Input {...form.register('telNumber')} placeholder="+1 869 xxx-xxxx" />
              </div>
              <div>
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input {...form.register('mobileNumber')} placeholder="+1 869 xxx-xxxx" />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input {...form.register('email')} type="email" placeholder="example@email.com" />
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="citizenship" 
                  checked={form.watch('citizenship')}
                  onCheckedChange={(checked) => form.setValue('citizenship', checked as boolean)}
                />
                <Label htmlFor="citizenship">Citizenship</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="signatureOnFile" 
                  checked={form.watch('signatureOnFile')}
                  onCheckedChange={(checked) => form.setValue('signatureOnFile', checked as boolean)}
                />
                <Label htmlFor="signatureOnFile">Signature on File</Label>
              </div>
            </div>

            <div>
              <Label>Date of Death</Label>
              <DatePicker
                date={form.watch('dateOfDeath')}
                onSelect={(date) => form.setValue('dateOfDeath', date)}
                placeholder="Select date of death (if applicable)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Verification Section */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(verification).map(([key, value]) => (
              <div key={key} className="space-y-4 p-4 border rounded">
                <h4 className="font-semibold">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Verified By</Label>
                    <Select onValueChange={(val) => setVerification({
                      ...verification,
                      [key]: { ...value, verifiedBy: val }
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {verificationDocuments.map((doc) => (
                          <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date of Verification</Label>
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
                    <Label>Verified by (User)</Label>
                    <Input 
                      value={value.verifierName}
                      onChange={(e) => setVerification({
                        ...verification,
                        [key]: { ...value, verifierName: e.target.value }
                      })}
                      placeholder="Enter verifier name" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Registration Card Details */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Card Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Permanent Card Date</Label>
                <DatePicker
                  date={cardDetails.permCardDate || undefined}
                  onSelect={(date) => setCardDetails({
                    ...cardDetails,
                    permCardDate: date || null
                  })}
                  placeholder="Select permanent card date"
                />
              </div>
              <div>
                <Label>Temporary Card Date</Label>
                <DatePicker
                  date={cardDetails.tempCardDate || undefined}
                  onSelect={(date) => setCardDetails({
                    ...cardDetails,
                    tempCardDate: date || null
                  })}
                  placeholder="Select temporary card date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Card Received</Label>
                <DatePicker
                  date={cardDetails.dateCardReceived || undefined}
                  onSelect={(date) => setCardDetails({
                    ...cardDetails,
                    dateCardReceived: date || null
                  })}
                  placeholder="Select card received date"
                />
              </div>
              <div>
                <Label>Card Expiration</Label>
                <DatePicker
                  date={cardDetails.cardExpiration || undefined}
                  onSelect={(date) => setCardDetails({
                    ...cardDetails,
                    cardExpiration: date || null
                  })}
                  placeholder="Select card expiration date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date of Entry</Label>
                <DatePicker
                  date={transactionDetails.dateOfEntry}
                  onSelect={(date) => setTransactionDetails({
                    ...transactionDetails,
                    dateOfEntry: date || new Date()
                  })}
                  placeholder="Date of entry"
                />
              </div>
              <div>
                <Label>Registration Date</Label>
                <DatePicker
                  date={transactionDetails.registrationDate}
                  onSelect={(date) => setTransactionDetails({
                    ...transactionDetails,
                    registrationDate: date || new Date()
                  })}
                  placeholder="Registration date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Entered By</Label>
                <Input 
                  value={transactionDetails.enteredBy}
                  onChange={(e) => setTransactionDetails({
                    ...transactionDetails,
                    enteredBy: e.target.value
                  })}
                  placeholder="Enter user name" 
                />
              </div>
              <div>
                <Label>User ID</Label>
                <Input 
                  value={transactionDetails.userId}
                  onChange={(e) => setTransactionDetails({
                    ...transactionDetails,
                    userId: e.target.value
                  })}
                  placeholder="Enter user ID" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Modified</Label>
                <DatePicker
                  date={transactionDetails.dateModified || undefined}
                  onSelect={(date) => setTransactionDetails({
                    ...transactionDetails,
                    dateModified: date || null
                  })}
                  placeholder="Date modified"
                />
              </div>
              <div>
                <Label>Termination Date/Code</Label>
                <div className="flex gap-2">
                  <DatePicker
                    date={transactionDetails.terminationDate || undefined}
                    onSelect={(date) => setTransactionDetails({
                      ...transactionDetails,
                      terminationDate: date || null
                    })}
                    placeholder="Termination date"
                  />
                  <Input 
                    value={transactionDetails.terminationCode}
                    onChange={(e) => setTransactionDetails({
                      ...transactionDetails,
                      terminationCode: e.target.value
                    })}
                    placeholder="Code" 
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-end">
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button type="button" variant="outline" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="outline" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Generate ID Card
          </Button>
          <Button type="button" variant="outline" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Verify Data
          </Button>
        </div>
      </form>

      {/* Dialogs */}
      <NameDialog open={showNameDialog} onClose={() => setShowNameDialog(false)} />
      <RelationDialog 
        open={showRelationDialog} 
        onClose={() => setShowRelationDialog(false)}
        onAddRelation={addRelation}
      />
    </div>
  );
};
