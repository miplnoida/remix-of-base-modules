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
import { Calendar, CalendarIcon, User, MapPin, Phone, Briefcase, Users, Shield, CreditCard, Camera, Save, Printer, FileText, Plus, Edit, Eye, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { DatePicker } from './DatePicker';
import DatePickerWithDropdowns from '@/components/shared/DatePickerWithDropdowns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { formatDisplayDate } from '@/lib/dateFormat';
import { cn } from '@/lib/utils';
import { useDistricts } from '@/hooks/useIPMasterLookups';
import { NameDialog } from './NameDialog';
import { RelationDialog } from './RelationDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLocation } from 'react-router-dom';
import { Stepper, StepperStep } from '@/components/ui/stepper';

// Form schema
const registrationSchema = z.object({
  title: z.string().optional(),
  surname: z.string().min(1, 'Surname is required'),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  maidenName: z.string().optional(),
  suffix: z.string().optional(),
  alias: z.string().optional(),
  age: z.number().min(1, 'Age is required'),
  sex: z.enum(['Male', 'Female', 'Not Specified']),
  dateOfBirth: z.date({ required_error: 'Date of birth is required' }),
  maritalStatus: z.enum(['Common Law', 'Divorced', 'Married', 'Separated', 'Single', 'Unknown', 'Widowed']),
  heightFeet: z.number().optional(),
  heightInches: z.number().optional(),
  birthPlace: z.string().min(1, 'Birth place is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  dateMarried: z.date().optional(),
  eyeColor: z.enum(['Black', 'Blue', 'Brown', 'Green']).optional(),
  occupation: z.string().min(1, 'Occupation is required'),
  workPermit: z.enum(['Yes', 'No']).default('No'),
  workPermitExp: z.string().optional(),
  dateResident: z.date().optional(),
  npf: z.enum(['Yes', 'No']).default('No'),
  plOfResidence: z.string().min(1, 'Place of residence is required'),
  applicationDate: z.date().default(() => new Date()),
  telNumber: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional(),
  citizenship: z.enum(['Yes', 'No']).default('No'),
  dateOfDeath: z.date().optional(),
  signatureOnFile: z.enum(['Yes', 'No']).default('No'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

// Address schema
const addressSchema = z.object({
  id: z.string(),
  addressType: z.enum(['resident', 'mailing', 'email']),
  residentAddress: z.string().optional(),
  mailingAddress: z.string().optional(),
  residentPostalCode: z.string().optional(),
  residentPostalDistrict: z.string().optional(),
  mailingPostalCode: z.string().optional(),
  mailingPostalDistrict: z.string().optional(),
  emailAddress: z.string().optional(),
});

type Address = z.infer<typeof addressSchema>;

// Districts loaded from database via useDistricts hook

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

const documentTypes = [
  'Baptism Certificate', 'Birth Certificate', 'Certificate of Death', 'Deed Poll',
  'Adoption Certificate', 'Affidavit', 'Divorce Certificate', 'Identification Card',
  'Identification Letter', 'Marriage Certificate', 'Passport', 'Document not Available'
];

interface Relation {
  id: string;
  type: 'Beneficiary' | 'Contact' | 'Parent' | 'Spouse' | 'Witness';
  name?: string;
  address?: string;
  relation?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  spouseAddress?: string;
  spouseDOB?: Date;
  spouseSSN?: string;
  witnessName?: string;
  dateWitnessed?: Date;
  beneficiaryName?: string;
  beneficiaryAddress?: string;
}

// Address List Item Component
const AddressListItem = ({ 
  address, 
  onEdit, 
  onView, 
  onRemove,
  isViewMode = false
}: { 
  address: Address; 
  onEdit: () => void; 
  onView: () => void; 
  onRemove: () => void; 
  isViewMode?: boolean;
}) => (
  <div className="flex justify-between items-center p-3 border rounded-lg bg-background">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {address.addressType === 'resident' ? 'Resident Address' : 
           address.addressType === 'mailing' ? 'Mailing Address' : 
           address.addressType === 'email' ? 'Email Address' : 'Address'}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {address.addressType === 'email' ? (
          <div>{address.emailAddress}</div>
        ) : address.addressType === 'resident' ? (
          <>
            <div>{address.residentAddress}</div>
            <div className="mt-1">{address.residentPostalDistrict}</div>
          </>
        ) : (
          <div>{address.mailingAddress}</div>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onView}>
        <Eye className="h-4 w-4" />
      </Button>
      {!isViewMode && (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  </div>
);

// Address Form Modal Component
const AddressFormModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  mode, 
  initialValues 
}: { 
  open: boolean; 
  onClose: () => void; 
  onSubmit: (data: Address) => void; 
  mode: 'add' | 'edit' | 'view'; 
  initialValues?: Address; 
}) => {
  const { data: postalDistricts = [], isLoading: loadingDistricts } = useDistricts();
  const [formData, setFormData] = useState<Address>(initialValues || {
    id: '',
    addressType: 'resident',
    residentAddress: '',
    mailingAddress: '',
    residentPostalCode: '',
    residentPostalDistrict: '',
    mailingPostalCode: '',
    mailingPostalDistrict: '',
    emailAddress: ''
  });
  // Local state for the checkbox only
  const [isSameAddress, setIsSameAddress] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'view') {
      // Validate based on address type
      if (formData.addressType === 'resident') {
        if (!formData.residentAddress || !formData.residentPostalDistrict) {
          alert('Please fill in all required fields for resident address');
          return;
        }
      } else if (formData.addressType === 'mailing') {
        if (!formData.mailingAddress) {
          alert('Please enter a mailing address');
          return;
        }
      } else if (formData.addressType === 'email') {
        if (!formData.emailAddress) {
          alert('Please enter an email address');
          return;
        }
      }
      onSubmit(formData);
    }
    onClose();
  };

  // Handle checkbox change to copy resident address to mailing address
  const handleSameAddressChange = (checked: boolean) => {
    setIsSameAddress(checked);
    setFormData({ 
      ...formData, 
      // When checked, copy all resident address fields to mailing address fields
      mailingAddress: checked ? formData.residentAddress : formData.mailingAddress,
      mailingPostalCode: checked ? formData.residentPostalCode : formData.mailingPostalCode,
      mailingPostalDistrict: checked ? formData.residentPostalDistrict : formData.mailingPostalDistrict
    });
  };

  // Handle resident address change to also update mailing address if same
  const handleResidentAddressChange = (value: string) => {
    const newFormData = { ...formData, residentAddress: value };
    if (isSameAddress) {
      newFormData.mailingAddress = value;
    }
    setFormData(newFormData);
  };

  // Handle resident postal code change to also update mailing postal code if same
  const handleResidentPostalCodeChange = (value: string) => {
    const newFormData = { ...formData, residentPostalCode: value };
    if (isSameAddress) {
      newFormData.mailingPostalCode = value;
    }
    setFormData(newFormData);
  };

  // Handle resident postal district change to also update mailing postal district if same
  const handleResidentPostalDistrictChange = (value: string) => {
    const newFormData = { ...formData, residentPostalDistrict: value };
    if (isSameAddress) {
      newFormData.mailingPostalDistrict = value;
    }
    setFormData(newFormData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Address' : mode === 'edit' ? 'Edit Address' : 'View Address'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Address Type Selection */}
          <div>
            <Label>Address Type</Label>
            <Select 
              value={formData.addressType} 
              onValueChange={(value) => setFormData({ ...formData, addressType: value as any })}
              disabled={mode === 'view'}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select address type" />
              </SelectTrigger>
              <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                <SelectItem value="resident">Resident Address</SelectItem>
                <SelectItem value="mailing">Mailing Address</SelectItem>
                <SelectItem value="email">Email Address</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Fields Based on Address Type */}
          {formData.addressType === 'resident' && (
            <div className="space-y-4">
              <div>
                <Label>Resident Address *</Label>
                <Textarea 
                  value={formData.residentAddress}
                  onChange={(e) => handleResidentAddressChange(e.target.value)}
                  placeholder="Enter resident address"
                  disabled={mode === 'view'}
                />
              </div>

              <div>
                <Label>Postal Code</Label>
                <Input
                  value={formData.residentPostalCode || ''}
                  onChange={(e) => handleResidentPostalCodeChange(e.target.value)}
                  placeholder="Enter postal code"
                  disabled={mode === 'view'}
                />
              </div>

              <div>
                <Label>Postal District *</Label>
                <Select 
                  value={formData.residentPostalDistrict} 
                  onValueChange={handleResidentPostalDistrictChange}
                  disabled={mode === 'view' || loadingDistricts}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select postal district" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                    {postalDistricts.map((district) => (
                      <SelectItem key={district.code} value={district.code}>{district.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.addressType === 'mailing' && (
            <div className="space-y-4">
              <div>
                <Label>Mailing Address *</Label>
                <Textarea 
                  value={formData.mailingAddress}
                  onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
                  placeholder="Enter mailing address"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          )}

          {formData.addressType === 'email' && (
            <div className="space-y-4">
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={formData.emailAddress || ''}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  placeholder="Enter email address"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          )}

          {mode !== 'view' && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {mode === 'add' ? 'Add Address' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Relation List Item Component
const RelationListItem = ({ 
  relation, 
  onEdit, 
  onView, 
  onRemove,
  isViewMode = false
}: { 
  relation: Relation; 
  onEdit: () => void; 
  onView: () => void; 
  onRemove: () => void; 
  isViewMode?: boolean;
}) => (
  <div className="flex justify-between items-center p-3 border rounded-lg bg-background">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{relation.type}</span>
      </div>
      <div className="text-sm">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-1">
            {relation.name && <div className="text-left"><span className="font-semibold">Name:</span> {relation.name}</div>}
            {relation.phone && <div className="text-left"><span className="font-semibold">Phone:</span> {relation.phone}</div>}
            {relation.address && <div className="text-left"><span className="font-semibold">Address:</span> {relation.address}</div>}
            {relation.fatherName && <div className="text-left"><span className="font-semibold">Father:</span> {relation.fatherName}</div>}
            {relation.spouseName && <div className="text-left"><span className="font-semibold">Spouse:</span> {relation.spouseName}</div>}
          </div>
          <div className="space-y-1">
            {relation.relation && <div className="text-left"><span className="font-semibold">Relation:</span> {relation.relation}</div>}
            {relation.email && <div className="text-left"><span className="font-semibold">Email:</span> {relation.email}</div>}
            {relation.mobile && <div className="text-left"><span className="font-semibold">Mobile:</span> {relation.mobile}</div>}
            {relation.motherName && <div className="text-left"><span className="font-semibold">Mother:</span> {relation.motherName}</div>}
            {relation.witnessName && <div className="text-left"><span className="font-semibold">Witness:</span> {relation.witnessName}</div>}
          </div>
        </div>
        {relation.beneficiaryName && (
          <div className="mt-2 text-left">
            <span className="font-semibold">Beneficiary:</span> {relation.beneficiaryName}
          </div>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onView}>
        <Eye className="h-4 w-4" />
      </Button>
      {!isViewMode && (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  </div>
);

// Relation Form Modal Component
const RelationFormModal = ({ 
  open, 
  onClose, 
  onSubmit, 
  mode, 
  initialValues 
}: { 
  open: boolean; 
  onClose: () => void; 
  onSubmit: (data: Relation) => void; 
  mode: 'add' | 'edit' | 'view'; 
  initialValues?: Relation; 
}) => {
  const [formData, setFormData] = useState<Relation>(initialValues || {
    id: '',
    type: 'Contact',
    name: '',
    address: '',
    relation: '',
    phone: '',
    mobile: '',
    email: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    spouseAddress: '',
    spouseDOB: undefined,
    spouseSSN: '',
    witnessName: '',
    dateWitnessed: undefined,
    beneficiaryName: '',
    beneficiaryAddress: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'view') {
      onSubmit(formData);
    }
    onClose();
  };

  const renderFieldsByType = () => {
    switch (formData.type) {
      case 'Parent':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Father's Name</Label>
                <Input 
                  value={formData.fatherName || ''}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="Enter father's name"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Mother's Name</Label>
                <Input 
                  value={formData.motherName || ''}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  placeholder="Enter mother's name"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </>
        );
      case 'Spouse':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Spouse Name</Label>
                <Input 
                  value={formData.spouseName || ''}
                  onChange={(e) => setFormData({ ...formData, spouseName: e.target.value })}
                  placeholder="Enter spouse name"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Spouse Address</Label>
                <Textarea 
                  value={formData.spouseAddress || ''}
                  onChange={(e) => setFormData({ ...formData, spouseAddress: e.target.value })}
                  placeholder="Enter spouse address"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Spouse Date of Birth</Label>
                <DatePicker
                  date={formData.spouseDOB}
                  onSelect={(date) => setFormData({ ...formData, spouseDOB: date })}
                  placeholder="Select spouse DOB"
                />
              </div>
              <div>
                <Label>Spouse SSN</Label>
                <Input 
                  value={formData.spouseSSN || ''}
                  onChange={(e) => setFormData({ ...formData, spouseSSN: e.target.value })}
                  placeholder="Enter spouse SSN"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </>
        );
      case 'Witness':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Witness Name</Label>
                <Input 
                  value={formData.witnessName || ''}
                  onChange={(e) => setFormData({ ...formData, witnessName: e.target.value })}
                  placeholder="Enter witness name"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Date Witnessed</Label>
                <DatePicker
                  date={formData.dateWitnessed}
                  onSelect={(date) => setFormData({ ...formData, dateWitnessed: date })}
                  placeholder="Select date witnessed"
                />
              </div>
            </div>
          </>
        );
      case 'Beneficiary':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Beneficiary Name</Label>
                <Input 
                  value={formData.beneficiaryName || ''}
                  onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  placeholder="Enter beneficiary name"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Beneficiary Address</Label>
                <Textarea 
                  value={formData.beneficiaryAddress || ''}
                  onChange={(e) => setFormData({ ...formData, beneficiaryAddress: e.target.value })}
                  placeholder="Enter beneficiary address"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </>
        );
      default: // Contact
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input 
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Relation</Label>
                <Input 
                  value={formData.relation || ''}
                  onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                  placeholder="Enter relation"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Address</Label>
                <Textarea 
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                  type="email"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input 
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  disabled={mode === 'view'}
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input 
                  value={formData.mobile || ''}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Enter mobile number"
                  disabled={mode === 'view'}
                />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Relation' : mode === 'edit' ? 'Edit Relation' : 'View Relation'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Relation Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'Beneficiary' | 'Contact' | 'Parent' | 'Spouse' | 'Witness') => 
                setFormData({ ...formData, type: value })
              }
              disabled={mode === 'view'}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select relation type" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="Contact">Contact</SelectItem>
                <SelectItem value="Parent">Parent</SelectItem>
                <SelectItem value="Spouse">Spouse</SelectItem>
                <SelectItem value="Witness">Witness</SelectItem>
                <SelectItem value="Beneficiary">Beneficiary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderFieldsByType()}

          {mode !== 'view' && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {mode === 'add' ? 'Add Relation' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Account Status Modal
const AccountStatusModal = ({
  open,
  onClose,
  currentStatus,
  onChangeStatus
}: {
  open: boolean;
  onClose: () => void;
  currentStatus: string;
  onChangeStatus: (newStatus: string, reason: string) => void;
}) => {
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeStatus(newStatus, reason);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Account Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Current Status</Label>
            <span className={`inline-block ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-800`}>
              {currentStatus}
            </span>
          </div>
          <div>
            <Label>Change Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="Suspend">Suspend</SelectItem>
                <SelectItem value="Verify">Verify</SelectItem>
                <SelectItem value="Ceased">Ceased</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason for status change"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Change Status
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const RegisterPersonForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [showRelationDialog, setShowRelationDialog] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressModal, setAddressModal] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit' | 'view',
    selectedAddress: null as Address | null
  });
  const [relationModal, setRelationModal] = useState({
    open: false,
    mode: 'add' as 'add' | 'edit' | 'view',
    selectedRelation: null as Relation | null
  });
  const [verification, setVerification] = useState({
    maritalStatus: { verifiedBy: '', dateVerified: null as Date | null, verifier: '' },
    birthStatus: { verifiedBy: '', dateVerified: null as Date | null, verifier: '' },
    deathStatus: { verifiedBy: '', dateVerified: null as Date | null, verifier: '' },
    nameStatus: { verifiedBy: '', dateVerified: null as Date | null, verifier: '' }
  });
  const [cardDetails, setCardDetails] = useState({
    pemCardDate: null as Date | null,
    tempCardDate: null as Date | null,
    dateCardRecvd: null as Date | null,
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
  const [accountStatusModalOpen, setAccountStatusModalOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState('Active');
  const location = useLocation();
  
  // Check if we're in view mode (on '/person/view/' path)
  const isViewMode = location.pathname.includes('/person/view/');
  
  // Mock data for preview - replace with actual data from props or API
  const previewData = {
    title: 'Mr.',
    surname: 'Sanger',
    firstName: 'Ayush',
    middleName: 'Singh',
    age: 18,
    maidenName: 'All',
    alias: 'Alias',
    sex: 'Male',
    dateOfBirth: new Date('2006-01-15'),
    maritalStatus: 'Single',
    heightFeet: 5,
    heightInches: 8,
    birthPlace: 'Saint Kitts and Nevis',
    nationality: 'Saint Kitts and Nevis',
    dateMarried: null,
    eyeColor: 'Brown',
    occupation: 'Student',
    workPermit: 'No',
    workPermitExp: '',
    dateResident: new Date('2020-01-01'),
    npf: 'No',
    plOfResidence: 'Saint Kitts and Nevis',
    applicationDate: new Date('2024-01-15'),
    telNumber: '+1869-465-1234',
    mobileNumber: '+1869-555-1234',
    email: 'ayush.sanger@email.com',
    citizenship: 'Yes',
    dateOfDeath: null,
    signatureOnFile: 'Yes'
  };

  // Mock address data for preview
  const previewAddresses: Address[] = [
    {
      id: '1',
      addressType: 'resident',
      residentAddress: '123 Main Street, Apt 2B, Basseterre',
      mailingAddress: '',
      residentPostalCode: 'KN001',
      residentPostalDistrict: 'Basseterre Zone 01',
      mailingPostalCode: '',
      mailingPostalDistrict: '',
      emailAddress: ''
    },
    {
      id: '2',
      addressType: 'mailing',
      residentAddress: '',
      mailingAddress: '789 Pine Street, P.O. Box 123',
      residentPostalCode: '',
      residentPostalDistrict: '',
      mailingPostalCode: 'KN003',
      mailingPostalDistrict: 'Basseterre Zone 02',
      emailAddress: ''
    },
    {
      id: '3',
      addressType: 'email',
      residentAddress: '',
      mailingAddress: '',
      residentPostalCode: '',
      residentPostalDistrict: '',
      mailingPostalCode: '',
      mailingPostalDistrict: '',
      emailAddress: 'john.doe@example.com'
    }
  ];

  // Mock relations data for preview
  const previewRelations: Relation[] = [
    {
      id: '1',
      type: 'Parent',
      fatherName: 'John Sanger',
      motherName: 'Mary Sanger',
      address: '123 Main Street, Basseterre',
      phone: '+1869-555-1111',
      mobile: '+1869-555-1112',
      email: 'john.sanger@email.com'
    },
    {
      id: '2',
      type: 'Contact',
      name: 'Jane Doe',
      relation: 'Sister',
      address: '456 Oak Avenue, Charlestown',
      phone: '+1869-555-9876',
      mobile: '+1869-555-9877',
      email: 'jane.doe@email.com'
    },
    {
      id: '3',
      type: 'Spouse',
      spouseName: 'Sarah Sanger',
      spouseAddress: '123 Main Street, Basseterre',
      spouseDOB: new Date('1990-05-20'),
      spouseSSN: '123-45-6789'
    }
  ];

  // Define stepper steps
  const steps: StepperStep[] = [
    {
      id: 'identity',
      title: 'Basic Details',
      icon: <User className="w-5 h-5" />,
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'upcoming'
    },
    {
      id: 'address',
      title: 'Address & Contact',
      icon: <MapPin className="w-5 h-5" />,
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'upcoming'
    },
    {
      id: 'relations',
      title: 'Relations',
      icon: <Users className="w-5 h-5" />,
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'upcoming'
    },
    {
      id: 'employment',
      title: 'Employment Details',
      icon: <Briefcase className="w-5 h-5" />,
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'upcoming'
    },
    {
      id: 'verification',
      title: 'Document Verification',
      icon: <Shield className="w-5 h-5" />,
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'upcoming'
    }
  ];

  // Navigation functions
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      title: '',
      suffix: '',
      sex: 'Male',
      maritalStatus: 'Single',
      workPermit: 'No',
      npf: 'No',
      citizenship: 'No',
      signatureOnFile: 'No',
      applicationDate: new Date()
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
          {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background border">
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

  const addRelation = (relation: Relation) => {
    setRelations([...relations, relation]);
  };

  const removeRelation = (id: string) => {
    setRelations(relations.filter(r => r.id !== id));
  };

  const updateRelation = (relation: Relation) => {
    setRelations(relations.map(r => r.id === relation.id ? relation : r));
  };

  const addAddress = (address: Address) => {
    const newAddress = { ...address, id: Date.now().toString() };
    setAddresses([...addresses, newAddress]);
  };

  const updateAddress = (address: Address) => {
    setAddresses(addresses.map(a => a.id === address.id ? address : a));
  };

  const removeAddress = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const openAddressModal = (mode: 'add' | 'edit' | 'view', address?: Address) => {
    setAddressModal({
      open: true,
      mode,
      selectedAddress: address || null
    });
  };

  const closeAddressModal = () => {
    setAddressModal({
      open: false,
      mode: 'add',
      selectedAddress: null
    });
  };

  const handleAddressSubmit = (data: Address) => {
    if (addressModal.mode === 'add') {
      addAddress(data);
    } else if (addressModal.mode === 'edit' && addressModal.selectedAddress) {
      updateAddress({ ...data, id: addressModal.selectedAddress.id });
    }
  };

  const openRelationModal = (mode: 'add' | 'edit' | 'view', relation?: Relation) => {
    setRelationModal({
      open: true,
      mode,
      selectedRelation: relation || null
    });
  };

  const closeRelationModal = () => {
    setRelationModal({
      open: false,
      mode: 'add',
      selectedRelation: null
    });
  };

  const handleRelationSubmit = (data: Relation) => {
    if (relationModal.mode === 'add') {
      addRelation(data);
    } else if (relationModal.mode === 'edit' && relationModal.selectedRelation) {
      updateRelation({ ...data, id: relationModal.selectedRelation.id });
    }
  };

  const onSubmit = (data: RegistrationFormData) => {
    console.log('Form submission:', { 
      ...data, 
      addresses,
      relations, 
      verification, 
      cardDetails, 
      transactionDetails 
    });
  };

  const handleChangeAccountStatus = (newStatus: string, reason: string) => {
    setAccountStatus(newStatus);
    // You can handle the reason or API call here
  };

  // Preview Field Component
  const PreviewField = ({ 
    label, 
    value, 
    required = false, 
    className = "",
    showEmpty = true 
  }: { 
    label: string; 
    value: string | number | null | undefined; 
    required?: boolean;
    className?: string;
    showEmpty?: boolean;
  }) => {
    const displayValue = value || (showEmpty ? 'Not specified' : '');
    
    return (
      <div className={`space-y-1 ${className}`}>
        <Label className="text-sm font-medium text-gray-700 flex items-center">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <div className="mt-1 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 min-h-[2.5rem] flex items-center">
          {displayValue}
        </div>
      </div>
    );
  };

  // Step content components
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        if (isViewMode) {
          return (
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Basic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* First Row: Title, First Name, Middle Name, Surname */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <PreviewField label="Title" value={previewData.title} />
                  <PreviewField label="First Name" value={previewData.firstName} required />
                  <PreviewField label="Middle Name" value={previewData.middleName} />
                  <PreviewField label="Surname" value={previewData.surname} required />
                </div>

                {/* Second Row: Age, Maiden Name, Alias */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PreviewField label="Age" value={`${previewData.age} Year`} required />
                  <PreviewField label="Maiden Name" value={previewData.maidenName} />
                  <PreviewField label="Alias" value={previewData.alias} />
                </div>

                <hr/>

                {/* Third Row: Sex, Date of Birth, Marital Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PreviewField label="Sex" value={previewData.sex} required />
                  <PreviewField label="Date of Birth" value={previewData.dateOfBirth ? formatDisplayDate(previewData.dateOfBirth) : null} required />
                  <PreviewField label="Marital Status" value={previewData.maritalStatus} required />
                </div>

                {/* Fourth Row: Height Feet, Height Inches, Birth Place */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PreviewField label="Height (Feet)" value={previewData.heightFeet} />
                  <PreviewField label="Height (Inches)" value={previewData.heightInches} />
                  <PreviewField label="Birth Place" value={previewData.birthPlace} required />
                </div>

                {/* Fifth Row: Nationality, Eye Color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PreviewField label="Nationality" value={previewData.nationality} required />
                  <PreviewField label="Eye Color" value={previewData.eyeColor} />
                </div>

                {/* Conditional Date Married field */}
                {(previewData.maritalStatus === 'Married' || previewData.maritalStatus === 'Common Law') && (
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <PreviewField label="Date Married" value={previewData.dateMarried ? formatDisplayDate(previewData.dateMarried) : null} />
                  </div>
                )}
              </CardContent>
            </div>
          );
        }
        
        return (
        <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
             Basic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* First Row: Title, First Name, Middle Name, Surname */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-1">
                <Label>Title *</Label>
                <Select onValueChange={(value) => form.setValue('title', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Miss.">Miss.</SelectItem>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="firstName">First Name *</Label>
                <Input {...form.register('firstName')} placeholder="Enter first name" />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input {...form.register('middleName')} placeholder="Enter middle name" />
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="surname">Surname *</Label>
                <Input {...form.register('surname')} placeholder="Enter surname"/>
                {form.formState.errors.surname && (
                  <p className="text-sm text-destructive">{form.formState.errors.surname.message}</p>
                )}
              </div>
            </div>

            {/* Second Row: Suffix, Maiden Name, Alias */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Suffix *</Label>
                <Select onValueChange={(value) => form.setValue('suffix', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select suffix" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Jr.">Jr.</SelectItem>
                    <SelectItem value="Sr.">Sr.</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="maidenName">Maiden Name *</Label>
                <Input {...form.register('maidenName')} placeholder="Enter maiden name" />
              </div>
              <div>
                <Label htmlFor="alias">Alias</Label>
                <Input {...form.register('alias')} placeholder="Enter alias" />
              </div>
            </div>
            {/* Third Row: Sex, Date of Birth, Marital Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Sex *</Label>
                <Select onValueChange={(value: 'Male' | 'Female' | 'Not Specified') => form.setValue('sex', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
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
                  placeholder="dd/mm/yyyy"
                />
                {form.formState.errors.dateOfBirth && (
                  <p className="text-sm text-destructive">{form.formState.errors.dateOfBirth.message}</p>
                )}
              </div>
              <div>
                <Label>Marital Status *</Label>
                <Select onValueChange={(value: any) => form.setValue('maritalStatus', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
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

            {/* Fourth Row: Height, Birth Place, Nationality */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Height</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      type="number" 
                      onChange={(e) => form.setValue('heightFeet', parseInt(e.target.value))}
                      placeholder="feet" 
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      type="number" 
                      onChange={(e) => form.setValue('heightInches', parseInt(e.target.value))}
                      placeholder="inch" 
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Birth Place *</Label>
                <Select onValueChange={(value) => form.setValue('birthPlace', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Birth Place" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nationality</Label>
                <Select onValueChange={(value) => form.setValue('nationality', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Nationality" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fifth Row: Eye Color */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Eye Color</Label>
                <Select onValueChange={(value: any) => form.setValue('eyeColor', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select eye color" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Black">Black</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                    <SelectItem value="Brown">Brown</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Conditional Date Married field */}
            {(form.watch('maritalStatus') === 'Married' || form.watch('maritalStatus') === 'Common Law') && (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <Label>Date Married</Label>
                  <DatePickerWithDropdowns
                    date={form.watch('dateMarried')}
                    onSelect={(date) => form.setValue('dateMarried', date)}
                    placeholder="dd/mm/yyyy"
                    maxDate={new Date()}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </div>
        );

      case 1:
        if (isViewMode) {
          return (
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className='px-2 py-2'>
                  {previewAddresses.length > 0 ? (
                    <div className="space-y-2">
                      {previewAddresses.map((address) => (
                        <AddressListItem
                          key={address.id}
                          address={address}
                          onEdit={() => {}} // Empty function since edit is disabled in view mode
                          onView={() => openAddressModal('view', address)}
                          onRemove={() => {}} // Empty function since remove is disabled in view mode
                          isViewMode={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No addresses available</p>
                    </div>
                  )}
                </Card>
              </CardContent>
              
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <PreviewField label="Tel Number" value={previewData.telNumber} />
                  <PreviewField label="Mobile Number" value={previewData.mobileNumber} />
                  <PreviewField label="Email" value={previewData.email} />
                </div>
              </CardContent>
            </div>
          );
        }
        
        return (
        <div>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                
                Address Information
              </CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => openAddressModal('add')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Address
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Card className='px-2 py-2'>
              {addresses.length > 0 ? (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <AddressListItem
                    key={address.id}
                    address={address}
                    onEdit={() => openAddressModal('edit', address)}
                    onView={() => openAddressModal('view', address)}
                    onRemove={() => removeAddress(address.id)}
                    isViewMode={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No addresses added yet</p>
                <p className="text-sm">Click "Add New Address" to get started</p>
              </div>
            )}
            </Card>
          </CardContent>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
             Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* First Row: Surname, First Name, Middle Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="telNumber" >Tel number</Label>
                <Input {...form.register('telNumber')} placeholder="+1869 xxx-xxxx"/>
              </div>
              <div>
                <Label htmlFor="mobileNumber">Mobile number</Label>
                <Input {...form.register('mobileNumber')} placeholder="+1869 xxx-xxxx" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input {...form.register('email')} placeholder="Example@email.com" />
              </div>
            </div>
			</CardContent>
        </div>
        );

      case 2:
        if (isViewMode) {
          return (
            <div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                 
                  Relations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card className='px-2 py-2'>
                  {previewRelations.length > 0 ? (
                    <div className="space-y-2">
                      {previewRelations.map((relation) => (
                        <RelationListItem
                          key={relation.id}
                          relation={relation}
                          onEdit={() => {}} // Empty function since edit is disabled in view mode
                          onView={() => openRelationModal('view', relation)}
                          onRemove={() => {}} // Empty function since remove is disabled in view mode
                          isViewMode={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No relations available</p>
                    </div>
                  )}
                </Card>
              </CardContent>
            </div>
          );
        }
        
        return (
        <div>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Relations
              </CardTitle>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => openRelationModal('add')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Relation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Card className='px-2 py-2'>
            {relations.length > 0 ? (
              <div className="space-y-2">
                {relations.map((relation) => (
                  <RelationListItem
                    key={relation.id}
                    relation={relation}
                    onEdit={() => openRelationModal('edit', relation)}
                    onView={() => openRelationModal('view', relation)}
                    onRemove={() => removeRelation(relation.id)}
                    isViewMode={false} // Ensure buttons are visible in non-view mode
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No relations added yet</p>
                <p className="text-sm">Click "Add Relation" to get started</p>
              </div>
            )}
            </Card>
          </CardContent>
        </div>
        );

      case 3:
        if (isViewMode) {
          return (
            <>
              <div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                  Employment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PreviewField label="Occupation" value={previewData.occupation} required />
                    <PreviewField label="Work Permit" value={previewData.workPermit} />
                    <PreviewField label="NPF" value={previewData.npf} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PreviewField label="Application Date" value={previewData.applicationDate ? formatDisplayDate(previewData.applicationDate) : null} />
                    <PreviewField label="Date Resident" value={previewData.dateResident ? formatDisplayDate(previewData.dateResident) : null} />
                    <PreviewField label="Place of Residence" value={previewData.plOfResidence} required />
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                    <PreviewField label="Work Permit Experience" value={previewData.workPermitExp} />
                  </div>
                </CardContent>
              </div>

              <div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <PreviewField label="Citizenship" value={previewData.citizenship} />
                    <PreviewField label="Date of Death" value={previewData.dateOfDeath ? formatDisplayDate(previewData.dateOfDeath) : null} />
                    <PreviewField label="Signature on File" value={previewData.signatureOnFile} />
                  </div>
                </CardContent>
              </div>
            </>
          );
        }
        
        return (
          <>
        <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              
            Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Occupation *</Label>
                <Select onValueChange={(value) => form.setValue('occupation', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select occupation" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                    {occupations.map((occupation) => (
                      <SelectItem key={occupation} value={occupation}>{occupation}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.occupation && (
                  <p className="text-sm text-destructive">{form.formState.errors.occupation.message}</p>
                )}
              </div>
              <div>
                <Label>Work Permit</Label>
                <Select onValueChange={(value: 'Yes' | 'No') => form.setValue('workPermit', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select work permit status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>NPF</Label>
                <Select onValueChange={(value: 'Yes' | 'No') => form.setValue('npf', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select NPF status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Application Date</Label>
                <DatePicker
                  date={form.watch('applicationDate')}
                  onSelect={(date) => form.setValue('applicationDate', date || new Date())}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div>
                <Label>Date Resident</Label>
                <DatePicker
                  date={form.watch('dateResident')}
                  onSelect={(date) => form.setValue('dateResident', date)}
                  placeholder="dd/mm/yyyy"
                />
              </div>
              <div>
                <Label>Place of Residence *</Label>
                <Select onValueChange={(value) => form.setValue('plOfResidence', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select place of residence" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
              <Label>Work Permit Experience</Label>
              <Textarea 
                {...form.register('workPermitExp')} 
                placeholder="Enter Work Permit Experience" 
              />
              </div>
            </div>
          </CardContent>
        </div>

        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tel Number</Label>
                <Input {...form.register('telNumber')} placeholder="+1 869 xxx-xxxx" />
              </div>
              <div>
                <Label>Mobile Number</Label>
                <Input {...form.register('mobileNumber')} placeholder="+1 869 xxx-xxxx" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input {...form.register('email')} type="email" placeholder="example@email.com" />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </CardContent>
        </Card> */}

        <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Citizenship</Label>
                <Select onValueChange={(value: 'Yes' | 'No') => form.setValue('citizenship', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select citizenship status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Death</Label>
                <DatePicker
                  date={form.watch('dateOfDeath')}
                  onSelect={(date) => form.setValue('dateOfDeath', date)}
                  placeholder="Select date of death"
                />
              </div>
              <div>
                <Label>Signature on File</Label>
                <Select onValueChange={(value: 'Yes' | 'No') => form.setValue('signatureOnFile', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select signature status" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </div>
          </>
        );

      case 4:
        if (isViewMode) {
          return (
            <>
              <div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                  Document Verification
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <hr />
                  <div className="space-y-4">
                    <h4 className="font-medium capitalize text-[#6B7280]">
                      Marital Status Verification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PreviewField label="Verified By" value="Birth Certificate" />
                      <PreviewField label="Date of Verification" value="01/15/2024" />
                      <PreviewField label="Verified By (User)" value="John Smith" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium capitalize text-[#6B7280]">
                      Birth Status Verification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PreviewField label="Verified By" value="Birth Certificate" />
                      <PreviewField label="Date of Verification" value="01/15/2024" />
                      <PreviewField label="Verified By (User)" value="John Smith" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium capitalize text-[#6B7280]">
                      Death Status Verification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PreviewField label="Verified By" value="Not Applicable" />
                      <PreviewField label="Date of Verification" value="Not Applicable" />
                      <PreviewField label="Verified By (User)" value="Not Applicable" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium capitalize text-[#6B7280]">
                      Name Status Verification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PreviewField label="Verified By" value="Birth Certificate" />
                      <PreviewField label="Date of Verification" value="01/15/2024" />
                      <PreviewField label="Verified By (User)" value="John Smith" />
                    </div>
                  </div>
                </CardContent>
              </div>
            </>
          );
        }
        
        return (
          <>
        <div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Document Verification
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
          <hr />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <Label>Marital Status Verification</Label>
                  <Select onValueChange={(val) => setVerification({
                    ...verification,
                    maritalStatus: { ...verification.maritalStatus, verifiedBy: val }
                  })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                      {documentTypes.map((doc) => (
                        <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Death Status Verification</Label>
                  <Select onValueChange={(val) => setVerification({
                    ...verification,
                    deathStatus: { ...verification.deathStatus, verifiedBy: val }
                  })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                      {documentTypes.map((doc) => (
                        <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <Label>Birth Status Verification</Label>
                  <Select onValueChange={(val) => setVerification({
                    ...verification,
                    birthStatus: { ...verification.birthStatus, verifiedBy: val }
                  })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                      {documentTypes.map((doc) => (
                        <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Name Status Verification</Label>
                  <Select onValueChange={(val) => setVerification({
                    ...verification,
                    nameStatus: { ...verification.nameStatus, verifiedBy: val }
                  })}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                      {documentTypes.map((doc) => (
                        <SelectItem key={doc} value={doc}>{doc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </div>

        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Registration Card Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Permanent Card Date</Label>
                <DatePicker
                  date={cardDetails.pemCardDate || undefined}
                  onSelect={(date) => setCardDetails({
                    ...cardDetails,
                    pemCardDate: date || null
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
                  date={cardDetails.dateCardRecvd || undefined}
                  onSelect={(date) => setCardDetails({
                    ...cardDetails,
                    dateCardRecvd: date || null
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaction Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Date Modified</Label>
                <DatePicker
                  date={transactionDetails.dateModified || undefined}
                  onSelect={(date) => setTransactionDetails({
                    ...transactionDetails,
                    dateModified: date || null
                  })}
                  placeholder="Select modification date"
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
        </Card> */}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card className='py-5' style={{backgroundColor:"#F9FAFB"}}>
          <div className='px-5 mb-6'>
            <Card className='p-3'>
              <Stepper 
            steps={steps} 
            currentStep={currentStep} 
            onStepClick={goToStep}
            className=""
          />
            </Card>
          </div>
       

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-end items-center pt-6 px-5">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md bg-sky-100 mr-5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            
          </div>

          <div className="flex gap-3">
            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 border-r-4 border-r-[#33529C]"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Submit
              </Button>
            )}
          </div>
        </div>

        <NameDialog 
          open={showNameDialog} 
          onClose={() => setShowNameDialog(false)} 
        />
        
        <RelationDialog 
          open={showRelationDialog} 
          onClose={() => setShowRelationDialog(false)}
          onAddRelation={addRelation}
        />

        <AddressFormModal
          open={addressModal.open}
          onClose={closeAddressModal}
          onSubmit={handleAddressSubmit}
          mode={addressModal.mode}
          initialValues={addressModal.selectedAddress || undefined}
        />

        <RelationFormModal
          open={relationModal.open}
          onClose={closeRelationModal}
          onSubmit={handleRelationSubmit}
          mode={relationModal.mode}
          initialValues={relationModal.selectedRelation || undefined}
        />

        <AccountStatusModal
          open={accountStatusModalOpen}
          onClose={() => setAccountStatusModalOpen(false)}
          currentStatus={accountStatus}
          onChangeStatus={handleChangeAccountStatus}
        />


      </form>
      </Card>
    </div>
  );
};
