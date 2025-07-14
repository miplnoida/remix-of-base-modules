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
  Info
} from 'lucide-react';
import { DatePicker } from '@/components/ip/DatePicker';
import { toast } from '@/hooks/use-toast';

interface Owner {
  id: string;
  name: string;
  title: string;
  phone: string;
}

interface Location {
  id: string;
  tradeName: string;
  address1: string;
  address2: string;
  activityType: string;
}

interface Note {
  id: string;
  date: Date;
  note: string;
  userId: string;
}

interface PreviousOwner {
  id: string;
  name: string;
  address: string;
}

const AddEmployer = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('form-detail');
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    addressType: 'mailing',
    mailingAddress: '',
    hqAddress: '',
    phone: '',
    countryCode: '+1',
    fax: '',
    faxCountryCode: '+1',
    email: '',
    parentRegNo: '',
    officeCode: '',
    ownershipCode: '',
    sectorCode: '',
    industrialCode: '',
    acquiredCode: 'No',
    acquisitionDate: null as Date | null,
    incorporatedDate: null as Date | null,
    villageCode: '',
    activityType: '',
    inspectorCode: '',
    dateOfApplication: null as Date | null,
    totalEmployees: 0,
    maleEmployees: 0,
    femaleEmployees: 0,
    dateWagesFirstPaid: null as Date | null,
    dateOfClosure: null as Date | null,
    reRegistrationDate: null as Date | null,
    computerPayroll: 'No',
    makeModel: '',
    commencementDate: null as Date | null
  });

  const [previousOwners, setPreviousOwners] = useState<PreviousOwner[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [newOwner, setNewOwner] = useState({ name: '', title: '', phone: '' });
  const [newLocation, setNewLocation] = useState({ tradeName: '', address1: '', address2: '', activityType: '' });
  const [newNote, setNewNote] = useState({ note: '', userId: '' });
  const [newPreviousOwner, setNewPreviousOwner] = useState({ name: '', address: '' });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Success",
      description: "Employer has been successfully registered!",
    });
    navigate('/employers-management/manage');
  };

  const addOwner = () => {
    if (newOwner.name && newOwner.title && newOwner.phone) {
      setOwners([...owners, { ...newOwner, id: Date.now().toString() }]);
      setNewOwner({ name: '', title: '', phone: '' });
      toast({
        title: "Owner Added",
        description: "Owner has been successfully added to the list.",
      });
    }
  };

  const addLocation = () => {
    if (newLocation.tradeName && newLocation.address1) {
      setLocations([...locations, { ...newLocation, id: Date.now().toString() }]);
      setNewLocation({ tradeName: '', address1: '', address2: '', activityType: '' });
      toast({
        title: "Location Added",
        description: "Location has been successfully added to the list.",
      });
    }
  };

  const addNote = () => {
    if (newNote.note && newNote.userId) {
      setNotes([...notes, { ...newNote, id: Date.now().toString(), date: new Date() }]);
      setNewNote({ note: '', userId: '' });
      toast({
        title: "Note Added",
        description: "Note has been successfully added to the list.",
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

  const deletePreviousOwner = (id: string) => {
    setPreviousOwners(previousOwners.filter(owner => owner.id !== id));
  };

  const getTabStatus = (tab: string) => {
    switch (tab) {
      case 'form-detail':
        return formData.name && formData.tradeName ? 'complete' : 'incomplete';
      case 'owners':
        return owners.length > 0 ? 'complete' : 'incomplete';
      case 'locations':
        return locations.length > 0 ? 'complete' : 'incomplete';
      default:
        return 'incomplete';
    }
  };

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
              </TabsTrigger>
              <TabsTrigger value="commencement" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Commencement
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

            <TabsContent value="form-detail" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Information */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      General Information
                    </CardTitle>
                    <CardDescription>Basic company details and identification</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Input
                        id="name"
                        placeholder=" "
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="peer"
                        required
                      />
                      <Label htmlFor="name" className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Company Name *
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="tradeName"
                        placeholder=" "
                        value={formData.tradeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, tradeName: e.target.value }))}
                        className="peer"
                        required
                      />
                      <Label htmlFor="tradeName" className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Trade Name *
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Address Information
                    </CardTitle>
                    <CardDescription>Select address type and enter details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Address Type</Label>
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
                    </div>
                    <div className="relative">
                      <Textarea
                        id="address"
                        placeholder=" "
                        value={formData.addressType === 'mailing' ? formData.mailingAddress : formData.hqAddress}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          [formData.addressType === 'mailing' ? 'mailingAddress' : 'hqAddress']: e.target.value 
                        }))}
                        className="peer min-h-20"
                        required
                      />
                      <Label htmlFor="address" className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        {formData.addressType === 'mailing' ? 'Mailing Address' : 'HQ Address'} *
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Previous Owners */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Previous Owners
                  </CardTitle>
                  <CardDescription>Add and manage previous owner details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newPreviousOwner.name}
                        onChange={(e) => setNewPreviousOwner(prev => ({ ...prev, name: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Previous Owner Name
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newPreviousOwner.address}
                        onChange={(e) => setNewPreviousOwner(prev => ({ ...prev, address: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Previous Owner Address
                      </Label>
                    </div>
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
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>Phone, fax, and email details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex gap-2">
                      <Select value={formData.countryCode} onValueChange={(value) => setFormData(prev => ({ ...prev, countryCode: value }))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                          <SelectItem value="+1-869">🇰🇳 +1-869</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Input
                          placeholder=" "
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="peer"
                        />
                        <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                          Phone Number
                        </Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select value={formData.faxCountryCode} onValueChange={(value) => setFormData(prev => ({ ...prev, faxCountryCode: value }))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">🇺🇸 +1</SelectItem>
                          <SelectItem value="+44">🇬🇧 +44</SelectItem>
                          <SelectItem value="+1-869">🇰🇳 +1-869</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Input
                          placeholder=" "
                          value={formData.fax}
                          onChange={(e) => setFormData(prev => ({ ...prev, fax: e.target.value }))}
                          className="peer"
                        />
                        <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                          Fax Number
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder=" "
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="peer"
                    />
                    <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                      Email Address
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Organizational Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Organizational Info
                    </CardTitle>
                    <CardDescription>Codes and organizational details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Parent Reg. No.</Label>
                      <Input
                        value={formData.parentRegNo}
                        onChange={(e) => setFormData(prev => ({ ...prev, parentRegNo: e.target.value }))}
                        placeholder="Enter parent registration number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Office Code</Label>
                      <Input
                        value={formData.officeCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, officeCode: e.target.value }))}
                        placeholder="Enter office code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ownership Code</Label>
                      <Input
                        value={formData.ownershipCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, ownershipCode: e.target.value }))}
                        placeholder="Enter ownership code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sector Code</Label>
                      <Input
                        value={formData.sectorCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, sectorCode: e.target.value }))}
                        placeholder="Enter sector code"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      Industrial & Activity
                    </CardTitle>
                    <CardDescription>Business classification and activity type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Activity Type</Label>
                      <Input
                        value={formData.activityType}
                        onChange={(e) => setFormData(prev => ({ ...prev, activityType: e.target.value }))}
                        placeholder="Enter activity type"
                      />
                    </div>
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
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
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
                          onChange={(e) => {
                            const total = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, totalEmployees: total }));
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Male</Label>
                        <Input
                          type="number"
                          value={formData.maleEmployees}
                          onChange={(e) => {
                            const male = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ 
                              ...prev, 
                              maleEmployees: male,
                              totalEmployees: male + prev.femaleEmployees
                            }));
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Female</Label>
                        <Input
                          type="number"
                          value={formData.femaleEmployees}
                          onChange={(e) => {
                            const female = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ 
                              ...prev, 
                              femaleEmployees: female,
                              totalEmployees: prev.maleEmployees + female
                            }));
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>
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
                  </CardContent>
                </Card>

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Technical Information
                    </CardTitle>
                    <CardDescription>Technical and system details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Acquired</Label>
                      <RadioGroup
                        value={formData.acquiredCode}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, acquiredCode: value }))}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Yes" id="acquired-yes" />
                          <Label htmlFor="acquired-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No" id="acquired-no" />
                          <Label htmlFor="acquired-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    {formData.acquiredCode === 'Yes' && (
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
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Computer Payroll</Label>
                      <RadioGroup
                        value={formData.computerPayroll}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, computerPayroll: value }))}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="Yes" id="payroll-yes" />
                          <Label htmlFor="payroll-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="No" id="payroll-no" />
                          <Label htmlFor="payroll-no">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Make Model</Label>
                      <Input
                        value={formData.makeModel}
                        onChange={(e) => setFormData(prev => ({ ...prev, makeModel: e.target.value }))}
                        placeholder="Enter make and model"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="owners" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Owners Management
                  </CardTitle>
                  <CardDescription>Add and manage company owners and stakeholders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newOwner.name}
                        onChange={(e) => setNewOwner(prev => ({ ...prev, name: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Owner Name
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newOwner.title}
                        onChange={(e) => setNewOwner(prev => ({ ...prev, title: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Title
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newOwner.phone}
                        onChange={(e) => setNewOwner(prev => ({ ...prev, phone: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Phone Number
                      </Label>
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
                              <TableCell className="font-medium">{owner.id}</TableCell>
                              <TableCell>{owner.name}</TableCell>
                              <TableCell>{owner.title}</TableCell>
                              <TableCell>{owner.phone}</TableCell>
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
                                    <Trash2 className="h-4 w-4" />
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

            <TabsContent value="locations" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Locations Management
                  </CardTitle>
                  <CardDescription>Add and manage business locations and branches</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newLocation.tradeName}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, tradeName: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Trade Name
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newLocation.activityType}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, activityType: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Activity Type
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newLocation.address1}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, address1: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Address Line 1
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newLocation.address2}
                        onChange={(e) => setNewLocation(prev => ({ ...prev, address2: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Address Line 2
                      </Label>
                    </div>
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
                            <TableHead>Address 1</TableHead>
                            <TableHead>Address 2</TableHead>
                            <TableHead>Activity Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {locations.map((location) => (
                            <TableRow key={location.id}>
                              <TableCell className="font-medium">{location.id}</TableCell>
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
                                    <Trash2 className="h-4 w-4" />
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

            <TabsContent value="notes" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Notes Management
                  </CardTitle>
                  <CardDescription>Add and manage notes and documentation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Textarea
                        placeholder=" "
                        value={newNote.note}
                        onChange={(e) => setNewNote(prev => ({ ...prev, note: e.target.value }))}
                        className="peer min-h-20"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        Note Content
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        placeholder=" "
                        value={newNote.userId}
                        onChange={(e) => setNewNote(prev => ({ ...prev, userId: e.target.value }))}
                        className="peer"
                      />
                      <Label className="absolute left-2 top-2 text-sm text-muted-foreground transition-all peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary">
                        User ID
                      </Label>
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
                            <TableHead>Note ID</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Note</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {notes.map((note) => (
                            <TableRow key={note.id}>
                              <TableCell className="font-medium">{note.id}</TableCell>
                              <TableCell>{note.date.toLocaleDateString()}</TableCell>
                              <TableCell>{note.note}</TableCell>
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
                                    <Trash2 className="h-4 w-4" />
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

            <TabsContent value="commencement" className="space-y-6">
              <Card className="shadow-lg">
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

            <TabsContent value="visits" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    Visit History
                  </CardTitle>
                  <CardDescription>Track visits and inspections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <span className="font-medium">Initial Registration Visit</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Registration process initiated on {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Visit history will appear here once visits are scheduled</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suits" className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Legal Suits
                  </CardTitle>
                  <CardDescription>Manage legal proceedings and suits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8">
                    <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No legal suits recorded for this employer</p>
                  </div>
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