import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Edit,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  FileText,
  Settings,
  Users,
  Eye,
  Calculator,
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  X,
  HelpCircle,
  Filter,
  Download,
  Upload,
  Search
} from 'lucide-react';
import { DatePicker } from '@/components/ip/DatePicker';
import { toast } from '@/hooks/use-toast';

interface Owner {
  id: string;
  ownerId: string;
  name: string;
  title: string;
  phone: string;
  countryCode: string;
}

interface Location {
  id: string;
  locationId: string;
  tradeName: string;
  address1: string;
  address2: string;
  activityType: string;
}

interface Note {
  id: string;
  noteId: string;
  date: Date;
  note: string;
  userId: string;
}

interface PreviousOwner {
  id: string;
  name: string;
  address: string;
}

interface Visit {
  id: string;
  date: Date;
  inspector: string;
  outcome: string;
  notes: string;
}

interface Suit {
  id: string;
  suitId: string;
  date: Date;
  status: string;
  summary: string;
}

const AddEmployer = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('form-detail');
  const [formData, setFormData] = useState({
    // General Information
    name: '',
    tradeName: '',
    addressType: 'mailing',
    mailingAddress: '',
    hqAddress: '',
    
    // Contact Information
    phone: '',
    phoneCountryCode: '+1',
    fax: '',
    faxCountryCode: '+1',
    email: '',
    
    // Organizational Information
    parentRegNo: '',
    officeCode: '',
    ownershipCode: '',
    sectorCode: '',
    industrialCode: '',
    
    // Acquisition / Incorporation
    acquiredCode: false,
    acquisitionDate: null as Date | null,
    incorporatedDate: null as Date | null,
    
    // Location
    villageCode: '',
    activityType: '',
    inspectorCode: '',
    
    // Dates & Employees
    dateOfApplication: null as Date | null,
    totalEmployees: 0,
    maleEmployees: 0,
    femaleEmployees: 0,
    dateWagesFirstPaid: null as Date | null,
    dateOfClosure: null as Date | null,
    reRegistrationDate: null as Date | null,
    
    // Technical Information
    computerPayroll: false,
    makeModel: '',
    
    // Commencement Date
    commencementDate: null as Date | null
  });

  const [previousOwners, setPreviousOwners] = useState<PreviousOwner[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [suits, setSuits] = useState<Suit[]>([]);

  const [newOwner, setNewOwner] = useState({ ownerId: '', name: '', title: '', phone: '', countryCode: '+1' });
  const [newLocation, setNewLocation] = useState({ locationId: '', tradeName: '', address1: '', address2: '', activityType: '' });
  const [newNote, setNewNote] = useState({ noteId: '', note: '', userId: '' });
  const [newPreviousOwner, setNewPreviousOwner] = useState({ name: '', address: '' });
  const [newVisit, setNewVisit] = useState({ date: null as Date | null, inspector: '', outcome: '', notes: '' });
  const [newSuit, setNewSuit] = useState({ suitId: '', date: null as Date | null, status: '', summary: '' });

  // Data arrays for dropdowns
  const industrialCodes = [
    'Account/Book-keep/Audit',
    'Act of other trans agency',
    'Admin of Financial Market',
    'Adult Education',
    'Advertising',
    'Agri. & Animal Husbandry',
    'Agriculture Extension',
    'Air & Sea Port Operation',
    'Amusement Park ETC.',
    'Arch. Eng. & Other Tech.',
    'Architect/Engineer Active',
    'Botanical & Zool. Gardens',
    'Building of Complete Con',
    'Building & Repairing Ship',
    'Building Completion',
    'Building Installation',
    'Building Repairing Boats',
    'Building Cleaning Activities',
    'Business Activities N.E.S',
    'Business/Employer Organization',
    'Business/Management Consultant',
    'Cargo Handling',
    'Catering',
    'Central Banking',
    'Charity',
    'Charters & Taxi SVCS',
    'College & University',
    'Combined Retail Items',
    'Commercial Banking',
    'Community Services',
    'Conserve/Drainage of Land',
    'Courier Activities',
    'Credit Unions',
    'Cutting & Shaping of Stone',
    'Database Activities',
    'Data Processing',
    'Deep Sea Trawler Fishing',
    'Defence Activities',
    'Distill Rectif Blending',
    'Dramatic Arts & Music',
    'Electricity',
    'Extraction of Salts',
    'Extra- Territorial Organ',
    'Farming Domestic Animals',
    'Farming of Animals',
    'Financial Leasing',
    'Finishing of Textiles',
    'Fish Preserv. & Processing',
    'Foreign Affairs',
    'Forest Conservation',
    'Freight Transport by Road',
    'Fruit/Vegie Preservation',
    'Funeral & Related Activities',
    'Gambling & Other Recreate',
    'Garbage Collection & Disp',
    'Gardening'
  ];

  const villages = [
    'Adams Hill', 'Barnaby', 'Barnes Bhaut', 'Basseterre', 'Bath Village', 'Bayfords', 'Belle View', 'Belle Vue', 'Belmont', 'Bird Rock Basseterre', 'Bladen Commercial Dev.', 'Bloody Point', 'Bourryeau Village', 'Boyds Village', 'Brick Kiln Village', 'Brighton\'s Estate', 'Brimstone Hill', 'Brotherson Estate', 'Brown Hill', 'Brown Pasture', 'Buckley\'s Site', 'Bucks Hill Gingerland', 'Bush Hill', 'Butlers Village', 'Cabbage Tree Project', 'Canies Estate', 'Calypso Bay', 'Camps Estate', 'Camps Village', 'Canada Estate', 'Carisfesta Village', 'Cayon', 'Ceder Hill', 'Chalk Farm Olad Road', 'Challenger\'s Village', 'Charlestown', 'Chicken Stone', 'Christ Church', 'Clay Ghaut', 'Clay Villa Estate', 'Cliff Dwellers', 'Clifton Estate'
  ];

  const inspectorCodes = [
    '00 Nevis',
    '01 Vincent Sutton',
    '02 Dexter Richardson',
    '03 Danielle Brown',
    '04 Kimmoy Brathwaite',
    '05 Omar Hodge',
    '06 Aleks Condell (Dexter)',
    'N01 Chase Lawerence',
    'N02 Karen Amory',
    'N03 Fayola O Tross',
    'OSC Overseas Company',
    'UNK Unknown',
    '07 Patricia Rogers-Lake',
    'N04 Sheon Lewis'
  ];

  const visitOutcomes = [
    'Completed',
    'Partially Completed',
    'Rescheduled',
    'No Access',
    'Cancelled',
    'Follow-up Required'
  ];

  const suitStatuses = [
    'Active',
    'Closed',
    'Pending',
    'Under Review',
    'Dismissed'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Success",
      description: "Employer has been successfully registered!",
    });
    navigate('/employers-management/manage');
  };

  const addOwner = () => {
    if (newOwner.name && newOwner.title && newOwner.phone && newOwner.ownerId) {
      setOwners([...owners, { ...newOwner, id: Date.now().toString() }]);
      setNewOwner({ ownerId: '', name: '', title: '', phone: '', countryCode: '+1' });
      toast({
        title: "Owner Added",
        description: "Owner has been successfully added to the list.",
      });
    }
  };

  const addLocation = () => {
    if (newLocation.tradeName && newLocation.address1 && newLocation.locationId) {
      setLocations([...locations, { ...newLocation, id: Date.now().toString() }]);
      setNewLocation({ locationId: '', tradeName: '', address1: '', address2: '', activityType: '' });
      toast({
        title: "Location Added",
        description: "Location has been successfully added to the list.",
      });
    }
  };

  const addNote = () => {
    if (newNote.note && newNote.userId && newNote.noteId) {
      setNotes([...notes, { ...newNote, id: Date.now().toString(), date: new Date() }]);
      setNewNote({ noteId: '', note: '', userId: '' });
      toast({
        title: "Note Added",
        description: "Note has been successfully added to the list.",
      });
    }
  };

  const addVisit = () => {
    if (newVisit.date && newVisit.inspector && newVisit.outcome) {
      setVisits([...visits, { ...newVisit, id: Date.now().toString() }]);
      setNewVisit({ date: null, inspector: '', outcome: '', notes: '' });
      toast({
        title: "Visit Added",
        description: "Visit has been successfully added to the list.",
      });
    }
  };

  const addSuit = () => {
    if (newSuit.suitId && newSuit.date && newSuit.status && newSuit.summary) {
      setSuits([...suits, { ...newSuit, id: Date.now().toString() }]);
      setNewSuit({ suitId: '', date: null, status: '', summary: '' });
      toast({
        title: "Suit Added",
        description: "Suit has been successfully added to the list.",
      });
    }
  };

  const addPreviousOwner = () => {
    if (newPreviousOwner.name && newPreviousOwner.address) {
      setPreviousOwners([...previousOwners, { ...newPreviousOwner, id: Date.now().toString() }]);
      setNewPreviousOwner({ name: '', address: '' });
      toast({
        title: "Previous Owner Added",
        description: "Previous owner has been successfully added to the list.",
      });
    }
  };

  const deleteOwner = (id: string) => {
    setOwners(owners.filter(owner => owner.id !== id));
  };

  const deleteLocation = (id: string) => {
    setLocations(locations.filter(location => location.id !== id));
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter(note => note.id !== id));
  };

  const deleteVisit = (id: string) => {
    setVisits(visits.filter(visit => visit.id !== id));
  };

  const deleteSuit = (id: string) => {
    setSuits(suits.filter(suit => suit.id !== id));
  };

  const deletePreviousOwner = (id: string) => {
    setPreviousOwners(previousOwners.filter(owner => owner.id !== id));
  };

  const updateEmployeeCount = (type: 'male' | 'female', value: number) => {
    if (type === 'male') {
      setFormData(prev => ({ 
        ...prev, 
        maleEmployees: value,
        totalEmployees: value + prev.femaleEmployees
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        femaleEmployees: value,
        totalEmployees: prev.maleEmployees + value
      }));
    }
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case 'form-detail':
        return formData.name && formData.tradeName ? 'complete' : 'incomplete';
      case 'owners':
        return owners.length > 0 ? 'complete' : 'incomplete';
      case 'locations':
        return locations.length > 0 ? 'complete' : 'incomplete';
      case 'notes':
        return notes.length > 0 ? 'complete' : 'incomplete';
      case 'commencement':
        return formData.commencementDate ? 'complete' : 'incomplete';
      default:
        return 'incomplete';
    }
  };

  const FloatingLabelInput = ({ label, value, onChange, type = "text", required = false, placeholder = " " }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div className="relative">
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="peer pt-6 pb-2"
        required={required}
      />
      <Label className="absolute left-3 top-2 text-xs text-muted-foreground transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
    </div>
  );

  const FloatingLabelTextarea = ({ label, value, onChange, required = false, placeholder = " " }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div className="relative">
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="peer pt-6 pb-2 min-h-20"
        required={required}
      />
      <Label className="absolute left-3 top-2 text-xs text-muted-foreground transition-all peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="bg-background/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/employers-management/manage")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Employers
              </Button>
              <div className="h-6 w-px bg-border" />
              <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Employers Management</span>
                <span>/</span>
                <span className="text-foreground font-medium">Add New Employer</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate('/employers-management/manage')}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Employer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Add New Employer</h1>
              <p className="text-muted-foreground">Register a new employer with complete details and requirements</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-6">
              <TabsTrigger value="form-detail" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Form Detail
                {getTabStatus('form-detail') === 'complete' && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="owners" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Owners
                {getTabStatus('owners') === 'complete' && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="locations" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locations
                {getTabStatus('locations') === 'complete' && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
                {getTabStatus('notes') === 'complete' && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="commencement" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Commencement
                {getTabStatus('commencement') === 'complete' && <CheckCircle className="h-3 w-3 text-green-500" />}
              </TabsTrigger>
              <TabsTrigger value="visits" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Visits
              </TabsTrigger>
              <TabsTrigger value="suits" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Suits
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Form Detail */}
            <TabsContent value="form-detail" className="space-y-6">
              {/* Group 1: General Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    General Information
                  </CardTitle>
                  <CardDescription>Basic company details and identification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="Company Name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="Trade Name"
                      value={formData.tradeName}
                      onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Address Type</Label>
                    <RadioGroup
                      value={formData.addressType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, addressType: value }))}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mailing" id="mailing" />
                        <Label htmlFor="mailing">Mailing Address</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hq" id="hq" />
                        <Label htmlFor="hq">HQ Address</Label>
                      </div>
                    </RadioGroup>
                    <FloatingLabelTextarea
                      label={formData.addressType === 'mailing' ? 'Mailing Address' : 'HQ Address'}
                      value={formData.addressType === 'mailing' ? formData.mailingAddress : formData.hqAddress}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        [formData.addressType === 'mailing' ? 'mailingAddress' : 'hqAddress']: e.target.value 
                      }))}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Group 2: Previous Owner */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Previous Owners
                  </CardTitle>
                  <CardDescription>Add and manage previous owner details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="Previous Owner Name"
                      value={newPreviousOwner.name}
                      onChange={(e) => setNewPreviousOwner(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <FloatingLabelInput
                      label="Previous Owner Address"
                      value={newPreviousOwner.address}
                      onChange={(e) => setNewPreviousOwner(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <Button type="button" onClick={addPreviousOwner} variant="outline" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Previous Owner
                  </Button>
                  
                  {previousOwners.length > 0 && (
                    <div className="space-y-2">
                      {previousOwners.map((owner) => (
                        <div key={owner.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{owner.name}</p>
                            <p className="text-sm text-muted-foreground">{owner.address}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePreviousOwner(owner.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Group 3: Contact Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5 text-primary" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>Phone, fax, and email details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Phone Number</Label>
                      <div className="flex gap-2">
                        <Select value={formData.phoneCountryCode} onValueChange={(value) => setFormData(prev => ({ ...prev, phoneCountryCode: value }))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+1">🇺🇸 +1</SelectItem>
                            <SelectItem value="+44">🇬🇧 +44</SelectItem>
                            <SelectItem value="+1-869">🇰🇳 +1-869</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Fax Number</Label>
                      <div className="flex gap-2">
                        <Select value={formData.faxCountryCode} onValueChange={(value) => setFormData(prev => ({ ...prev, faxCountryCode: value }))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+1">🇺🇸 +1</SelectItem>
                            <SelectItem value="+44">🇬🇧 +44</SelectItem>
                            <SelectItem value="+1-869">🇰🇳 +1-869</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={formData.fax}
                          onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                          placeholder="Enter fax number"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <FloatingLabelInput
                    label="Email Address"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    type="email"
                  />
                </CardContent>
              </Card>

              {/* Group 4: Organizational Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-primary" />
                    Organizational Information
                  </CardTitle>
                  <CardDescription>Codes and organizational details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FloatingLabelInput
                      label="Parent Reg. No."
                      value={formData.parentRegNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentRegNo: e.target.value }))}
                    />
                    <FloatingLabelInput
                      label="Office Code"
                      value={formData.officeCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, officeCode: e.target.value }))}
                    />
                    <FloatingLabelInput
                      label="Ownership Code"
                      value={formData.ownershipCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, ownershipCode: e.target.value }))}
                    />
                    <FloatingLabelInput
                      label="Sector Code"
                      value={formData.sectorCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, sectorCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Industrial Code</Label>
                    <Select value={formData.industrialCode} onValueChange={(value) => setFormData(prev => ({ ...prev, industrialCode: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industrial code" />
                      </SelectTrigger>
                      <SelectContent>
                        {industrialCodes.map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Group 5: Acquisition / Incorporation */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="h-5 w-5 text-primary" />
                    Acquisition / Incorporation
                  </CardTitle>
                  <CardDescription>Company acquisition and incorporation details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="acquired"
                      checked={formData.acquiredCode}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acquiredCode: checked }))}
                    />
                    <Label htmlFor="acquired" className="text-sm font-medium">
                      Acquired Company
                    </Label>
                  </div>
                  {formData.acquiredCode && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Acquisition Date</Label>
                      <DatePicker
                        date={formData.acquisitionDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, acquisitionDate: date }))}
                        placeholder="Select acquisition date"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Incorporated Date</Label>
                    <DatePicker
                      date={formData.incorporatedDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, incorporatedDate: date }))}
                      placeholder="Select incorporation date"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Group 6: Location */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    Location Information
                  </CardTitle>
                  <CardDescription>Location and activity details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Village</Label>
                      <Select value={formData.villageCode} onValueChange={(value) => setFormData(prev => ({ ...prev, villageCode: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select village" />
                        </SelectTrigger>
                        <SelectContent>
                          {villages.map((village) => (
                            <SelectItem key={village} value={village}>{village}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FloatingLabelInput
                      label="Activity Type"
                      value={formData.activityType}
                      onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Inspector Code</Label>
                    <Select value={formData.inspectorCode} onValueChange={(value) => setFormData(prev => ({ ...prev, inspectorCode: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select inspector" />
                      </SelectTrigger>
                      <SelectContent>
                        {inspectorCodes.map((code) => (
                          <SelectItem key={code} value={code}>{code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Group 7: Dates & Employees */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    Dates & Employees
                  </CardTitle>
                  <CardDescription>Important dates and employee information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date of Application</Label>
                    <DatePicker
                      date={formData.dateOfApplication}
                      onSelect={(date) => setFormData(prev => ({ ...prev, dateOfApplication: date }))}
                      placeholder="Select application date"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Total Employees</Label>
                      <Input
                        type="number"
                        value={formData.totalEmployees}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Male</Label>
                      <Input
                        type="number"
                        value={formData.maleEmployees}
                        onChange={(e) => updateEmployeeCount('male', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Female</Label>
                      <Input
                        type="number"
                        value={formData.femaleEmployees}
                        onChange={(e) => updateEmployeeCount('female', parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date Wages First Paid</Label>
                      <DatePicker
                        date={formData.dateWagesFirstPaid}
                        onSelect={(date) => setFormData(prev => ({ ...prev, dateWagesFirstPaid: date }))}
                        placeholder="Select date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date of Closure</Label>
                      <DatePicker
                        date={formData.dateOfClosure}
                        onSelect={(date) => setFormData(prev => ({ ...prev, dateOfClosure: date }))}
                        placeholder="Select date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Re-registration Date</Label>
                      <DatePicker
                        date={formData.reRegistrationDate}
                        onSelect={(date) => setFormData(prev => ({ ...prev, reRegistrationDate: date }))}
                        placeholder="Select date"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Group 8: Technical Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="h-5 w-5 text-primary" />
                    Technical Information
                  </CardTitle>
                  <CardDescription>Technical and system details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="payroll"
                      checked={formData.computerPayroll}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, computerPayroll: checked }))}
                    />
                    <Label htmlFor="payroll" className="text-sm font-medium">
                      Computer Payroll
                    </Label>
                  </div>
                  <FloatingLabelInput
                    label="Make Model"
                    value={formData.makeModel}
                    onChange={(e) => setFormData(prev => ({ ...prev, makeModel: e.target.value }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Owners */}
            <TabsContent value="owners" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Owners Management
                  </CardTitle>
                  <CardDescription>Add and manage company owners and stakeholders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FloatingLabelInput
                      label="Owner ID"
                      value={newOwner.ownerId}
                      onChange={(e) => setNewOwner(prev => ({ ...prev, ownerId: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="Owner Name"
                      value={newOwner.name}
                      onChange={(e) => setNewOwner(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="Title"
                      value={newOwner.title}
                      onChange={(e) => setNewOwner(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Phone Number</Label>
                      <div className="flex gap-2">
                        <Select value={newOwner.countryCode} onValueChange={(value) => setNewOwner(prev => ({ ...prev, countryCode: value }))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+1">🇺🇸 +1</SelectItem>
                            <SelectItem value="+44">🇬🇧 +44</SelectItem>
                            <SelectItem value="+1-869">🇰🇳 +1-869</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={newOwner.phone}
                          onChange={(e) => setNewOwner(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Enter phone number"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="button" onClick={addOwner} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Owner
                  </Button>
                  
                  {owners.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Owner ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {owners.map((owner) => (
                            <TableRow key={owner.id}>
                              <TableCell className="font-medium">{owner.ownerId}</TableCell>
                              <TableCell>{owner.name}</TableCell>
                              <TableCell>{owner.title}</TableCell>
                              <TableCell>{owner.countryCode} {owner.phone}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteOwner(owner.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Locations */}
            <TabsContent value="locations" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Locations Management
                  </CardTitle>
                  <CardDescription>Add and manage business locations and branches</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <FloatingLabelInput
                      label="Location ID"
                      value={newLocation.locationId}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, locationId: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="Trade Name"
                      value={newLocation.tradeName}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, tradeName: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="Loc Addr1"
                      value={newLocation.address1}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, address1: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="Loc Addr2"
                      value={newLocation.address2}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, address2: e.target.value }))}
                    />
                    <FloatingLabelInput
                      label="Activity Type"
                      value={newLocation.activityType}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, activityType: e.target.value }))}
                    />
                  </div>
                  <Button type="button" onClick={addLocation} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                  
                  {locations.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Location ID</TableHead>
                            <TableHead>Trade Name</TableHead>
                            <TableHead>Loc Addr1</TableHead>
                            <TableHead>Loc Addr2</TableHead>
                            <TableHead>Activity Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {locations.map((location) => (
                            <TableRow key={location.id}>
                              <TableCell className="font-medium">{location.locationId}</TableCell>
                              <TableCell>{location.tradeName}</TableCell>
                              <TableCell>{location.address1}</TableCell>
                              <TableCell>{location.address2}</TableCell>
                              <TableCell>{location.activityType}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteLocation(location.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 4: Notes */}
            <TabsContent value="notes" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes Management
                  </CardTitle>
                  <CardDescription>Add and manage notes and documentation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FloatingLabelInput
                      label="Notes ID"
                      value={newNote.noteId}
                      onChange={(e) => setNewNote(prev => ({ ...prev, noteId: e.target.value }))}
                      required
                    />
                    <FloatingLabelInput
                      label="User's ID"
                      value={newNote.userId}
                      onChange={(e) => setNewNote(prev => ({ ...prev, userId: e.target.value }))}
                      required
                    />
                    <div className="md:col-span-1">
                      <FloatingLabelTextarea
                        label="Note"
                        value={newNote.note}
                        onChange={(e) => setNewNote(prev => ({ ...prev, note: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addNote} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                  
                  {notes.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Notes ID</TableHead>
                            <TableHead>Note Date</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead>User's ID</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notes.map((note) => (
                            <TableRow key={note.id}>
                              <TableCell className="font-medium">{note.noteId}</TableCell>
                              <TableCell>{note.date.toLocaleDateString()}</TableCell>
                              <TableCell className="max-w-xs truncate">{note.note}</TableCell>
                              <TableCell>{note.userId}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteNote(note.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 5: Commencement Date */}
            <TabsContent value="commencement" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Commencement Date
                  </CardTitle>
                  <CardDescription>Set the business commencement date and related information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Commencement Date</Label>
                    <DatePicker
                      date={formData.commencementDate}
                      onSelect={(date) => setFormData(prev => ({ ...prev, commencementDate: date }))}
                      placeholder="Select commencement date"
                    />
                  </div>
                  {formData.commencementDate && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Commencement Date Set</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Business commenced on {formData.commencementDate.toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 6: Visits */}
            <TabsContent value="visits" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Visit History
                  </CardTitle>
                  <CardDescription>Track visits and inspections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Visit Date</Label>
                      <DatePicker
                        date={newVisit.date}
                        onSelect={(date) => setNewVisit(prev => ({ ...prev, date }))}
                        placeholder="Select visit date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Inspector</Label>
                      <Select value={newVisit.inspector} onValueChange={(value) => setNewVisit(prev => ({ ...prev, inspector: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select inspector" />
                        </SelectTrigger>
                        <SelectContent>
                          {inspectorCodes.map((code) => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Visit Outcome</Label>
                      <Select value={newVisit.outcome} onValueChange={(value) => setNewVisit(prev => ({ ...prev, outcome: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome" />
                        </SelectTrigger>
                        <SelectContent>
                          {visitOutcomes.map((outcome) => (
                            <SelectItem key={outcome} value={outcome}>{outcome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FloatingLabelTextarea
                        label="Visit Notes"
                        value={newVisit.notes}
                        onChange={(e) => setNewVisit(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addVisit} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Visit
                  </Button>
                  
                  {visits.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Inspector</TableHead>
                            <TableHead>Visit Outcome</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visits.map((visit) => (
                            <TableRow key={visit.id}>
                              <TableCell>{visit.date.toLocaleDateString()}</TableCell>
                              <TableCell>{visit.inspector}</TableCell>
                              <TableCell>
                                <Badge variant={visit.outcome === 'Completed' ? 'default' : 'secondary'}>
                                  {visit.outcome}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{visit.notes}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteVisit(visit.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No visits recorded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 7: Suits */}
            <TabsContent value="suits" className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Legal Suits
                  </CardTitle>
                  <CardDescription>Manage legal proceedings and suits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FloatingLabelInput
                      label="Suit ID"
                      value={newSuit.suitId}
                      onChange={(e) => setNewSuit(prev => ({ ...prev, suitId: e.target.value }))}
                      required
                    />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date</Label>
                      <DatePicker
                        date={newSuit.date}
                        onSelect={(date) => setNewSuit(prev => ({ ...prev, date }))}
                        placeholder="Select suit date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status</Label>
                      <Select value={newSuit.status} onValueChange={(value) => setNewSuit(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {suitStatuses.map((status) => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <FloatingLabelTextarea
                        label="Summary"
                        value={newSuit.summary}
                        onChange={(e) => setNewSuit(prev => ({ ...prev, summary: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={addSuit} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Suit
                  </Button>
                  
                  {suits.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Suit ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Summary</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suits.map((suit) => (
                            <TableRow key={suit.id}>
                              <TableCell className="font-medium">{suit.suitId}</TableCell>
                              <TableCell>{suit.date.toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Badge variant={suit.status === 'Active' ? 'default' : suit.status === 'Closed' ? 'secondary' : 'outline'}>
                                  {suit.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{suit.summary}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteSuit(suit.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No legal suits recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </div>
  );
};

export default AddEmployer;