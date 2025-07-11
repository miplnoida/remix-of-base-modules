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
import { Calendar, CalendarIcon, User, MapPin, Phone, Briefcase, Users, Shield, CreditCard, Camera, Save, Printer, FileText, Plus, Edit, Eye, Trash2 } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { NameDialog } from './NameDialog';
import { RelationDialog } from './RelationDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Form schema
const registrationSchema = z.object({
  surname: z.string().min(1, 'Surname is required'),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
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
  addressType: z.enum(['same', 'different']),
  residentAddress: z.string().min(1, 'Resident address is required'),
  mailingAddress: z.string().optional(),
  postalDistrict: z.string().min(1, 'Postal district is required'),
});

type Address = z.infer<typeof addressSchema>;

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
  onRemove 
}: { 
  address: Address; 
  onEdit: () => void; 
  onView: () => void; 
  onRemove: () => void; 
}) => (
  <div className="flex justify-between items-center p-3 border rounded-lg bg-background">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {address.addressType === 'same' ? 'Same Address' : 'Different Addresses'}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        <div>{address.residentAddress}</div>
        {address.addressType === 'different' && address.mailingAddress && (
          <div>Mailing: {address.mailingAddress}</div>
        )}
        <div className="mt-1">{address.postalDistrict}</div>
      </div>
    </div>
    <div className="flex gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onView}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
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
  const [formData, setFormData] = useState<Address>(initialValues || {
    id: '',
    addressType: 'same',
    residentAddress: '',
    mailingAddress: '',
    postalDistrict: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'view') {
      onSubmit(formData);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add New Address' : mode === 'edit' ? 'Edit Address' : 'View Address'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Address Type</Label>
            <Select 
              value={formData.addressType} 
              onValueChange={(value: 'same' | 'different') => 
                setFormData({ ...formData, addressType: value })
              }
              disabled={mode === 'view'}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select address type" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="same">Mailing & Resident Address Same</SelectItem>
                <SelectItem value="different">Different Addresses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Resident Address *</Label>
            <Textarea 
              value={formData.residentAddress}
              onChange={(e) => setFormData({ ...formData, residentAddress: e.target.value })}
              placeholder="Enter resident address"
              disabled={mode === 'view'}
            />
          </div>

          {formData.addressType === 'different' && (
            <div>
              <Label>Mailing Address</Label>
              <Textarea 
                value={formData.mailingAddress}
                onChange={(e) => setFormData({ ...formData, mailingAddress: e.target.value })}
                placeholder="Enter mailing address"
                disabled={mode === 'view'}
              />
            </div>
          )}

          <div>
            <Label>Postal District *</Label>
            <Select 
              value={formData.postalDistrict} 
              onValueChange={(value) => setFormData({ ...formData, postalDistrict: value })}
              disabled={mode === 'view'}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select postal district" />
              </SelectTrigger>
              <SelectContent className="bg-background border max-h-48 overflow-y-auto">
                {postalDistricts.map((district) => (
                  <SelectItem key={district} value={district}>{district}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
  onRemove 
}: { 
  relation: Relation; 
  onEdit: () => void; 
  onView: () => void; 
  onRemove: () => void; 
}) => (
  <div className="flex justify-between items-center p-3 border rounded-lg bg-background">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{relation.type}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {relation.name && <div>Name: {relation.name}</div>}
        {relation.address && <div>Address: {relation.address}</div>}
        {relation.relation && <div>Relation: {relation.relation}</div>}
        {relation.phone && <div>Phone: {relation.phone}</div>}
        {relation.mobile && <div>Mobile: {relation.mobile}</div>}
        {relation.email && <div>Email: {relation.email}</div>}
        {relation.fatherName && <div>Father: {relation.fatherName}</div>}
        {relation.motherName && <div>Mother: {relation.motherName}</div>}
        {relation.spouseName && <div>Spouse: {relation.spouseName}</div>}
        {relation.witnessName && <div>Witness: {relation.witnessName}</div>}
        {relation.beneficiaryName && <div>Beneficiary: {relation.beneficiaryName}</div>}
      </div>
    </div>
    <div className="flex gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onView}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
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

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
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
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
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

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Details Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="surname">Surname *</Label>
                <Input {...form.register('surname')} placeholder="Enter surname" />
                {form.formState.errors.surname && (
                  <p className="text-sm text-destructive">{form.formState.errors.surname.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input {...form.register('firstName')} placeholder="Enter first name" />
                {form.formState.errors.firstName && (
                  <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input {...form.register('middleName')} placeholder="Enter middle name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input 
                  type="number" 
                  onChange={(e) => form.setValue('age', parseInt(e.target.value))}
                  placeholder="Enter age" 
                />
                {form.formState.errors.age && (
                  <p className="text-sm text-destructive">{form.formState.errors.age.message}</p>
                )}
              </div>
              <div className="flex items-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNameDialog(true)}
                  className="w-full"
                >
                  Name Details
                </Button>
              </div>
            </div>

            <Separator />

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
                  placeholder="Select date of birth"
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>
                <Label>Birth Place *</Label>
                <Select onValueChange={(value) => form.setValue('birthPlace', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select birth place" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nationality *</Label>
                <Select onValueChange={(value) => form.setValue('nationality', value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border">
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(form.watch('maritalStatus') === 'Married' || form.watch('maritalStatus') === 'Common Law') && (
                <div>
                  <Label>Date Married</Label>
                  <DatePicker
                    date={form.watch('dateMarried')}
                    onSelect={(date) => form.setValue('dateMarried', date)}
                    placeholder="Select date married"
                  />
                </div>
              )}
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
          </CardContent>
        </Card>

        {/* Address Information Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
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
            {addresses.length > 0 ? (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <AddressListItem
                    key={address.id}
                    address={address}
                    onEdit={() => openAddressModal('edit', address)}
                    onView={() => openAddressModal('view', address)}
                    onRemove={() => removeAddress(address.id)}
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
          </CardContent>
        </Card>

        {/* Relations Section */}
        <Card>
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
            {relations.length > 0 ? (
              <div className="space-y-2">
                {relations.map((relation) => (
                  <RelationListItem
                    key={relation.id}
                    relation={relation}
                    onEdit={() => openRelationModal('edit', relation)}
                    onView={() => openRelationModal('view', relation)}
                    onRemove={() => removeRelation(relation.id)}
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
          </CardContent>
        </Card>

        {/* Employment Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Work Permit Experience</Label>
                <Textarea 
                  {...form.register('workPermitExp')} 
                  placeholder="Enter work permit experience" 
                />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date Resident</Label>
                <DatePicker
                  date={form.watch('dateResident')}
                  onSelect={(date) => form.setValue('dateResident', date)}
                  placeholder="Select date resident"
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

            <div>
              <Label>Application Date</Label>
              <DatePicker
                date={form.watch('applicationDate')}
                onSelect={(date) => form.setValue('applicationDate', date || new Date())}
                placeholder="Application date"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Section */}
        <Card>
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
        </Card>

        {/* Additional Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
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
        </Card>

        {/* Verification Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verification Section
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(verification).map(([key, value]) => (
              <div key={key} className="space-y-4">
                <h4 className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()} Verification
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Verified By</Label>
                    <Select onValueChange={(val) => setVerification({
                      ...verification,
                      [key]: { ...value, verifiedBy: val }
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
                    <Label>Verified By (User)</Label>
                    <Input 
                      value={value.verifier}
                      onChange={(e) => setVerification({
                        ...verification,
                        [key]: { ...value, verifier: e.target.value }
                      })}
                      placeholder="Enter verifier name" 
                    />
                  </div>
                </div>
                {key !== 'nameStatus' && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Registration Card Details Section */}
        <Card>
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

        {/* Transaction Details Section */}
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
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <Button type="button" variant="destructive" className="flex items-center gap-2" onClick={() => setAccountStatusModalOpen(true)}>
            Change Account Status
          </Button>
          <div className="flex gap-3">
            {/*<Button type="submit" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save
            </Button>*/}
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
    </div>
  );
};
