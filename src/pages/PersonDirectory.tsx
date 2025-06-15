
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users,
  Search,
  Camera,
  PenTool,
  Printer,
  Plus,
  ArrowLeft,
  Home,
  Edit,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IDCardPreview } from '@/components/person/IDCardPreview';
import { CameraCapture } from '@/components/person/CameraCapture';
import { SignatureCapture } from '@/components/person/SignatureCapture';

// Mock data for registered persons
const registeredPersons = [
  {
    id: 1,
    registrationNo: 'REG001234',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1985-03-15',
    gender: 'Male',
    nationalId: 'ID123456789',
    mobileNumber: '(869) 465-1234',
    status: 'Active',
    photo: null,
    signature: null,
    address: '123 Main Street, Basseterre',
    email: 'john.doe@email.com'
  },
  {
    id: 2,
    registrationNo: 'REG001235',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    dateOfBirth: '1990-07-22',
    gender: 'Female',
    nationalId: 'ID123456790',
    mobileNumber: '(869) 465-5678',
    status: 'Active',
    photo: null,
    signature: null,
    address: '456 Church Street, Charlestown',
    email: 'maria.rodriguez@email.com'
  },
  {
    id: 3,
    registrationNo: 'REG001236',
    firstName: 'David',
    lastName: 'Williams',
    dateOfBirth: '1988-11-10',
    gender: 'Male',
    nationalId: 'ID123456791',
    mobileNumber: '(869) 465-9012',
    status: 'Pending',
    photo: null,
    signature: null,
    address: '789 Victoria Road, Sandy Point',
    email: 'david.williams@email.com'
  }
];

const PersonDirectory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('name');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [persons, setPersons] = useState(registeredPersons);
  const [showCamera, setShowCamera] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);

  const filteredPersons = persons.filter(person => {
    const searchValue = searchTerm.toLowerCase();
    switch (searchBy) {
      case 'name':
        return `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchValue);
      case 'nationalId':
        return person.nationalId.toLowerCase().includes(searchValue);
      case 'registrationNo':
        return person.registrationNo.toLowerCase().includes(searchValue);
      case 'mobile':
        return person.mobileNumber.toLowerCase().includes(searchValue);
      default:
        return true;
    }
  });

  const handlePhotoCapture = (photoData: string) => {
    if (selectedPerson) {
      setPersons(prev => prev.map(p => 
        p.id === selectedPerson.id ? { ...p, photo: photoData } : p
      ));
      toast({
        title: "Photo Captured",
        description: "Photo has been successfully saved to the person's profile.",
      });
      setShowCamera(false);
    }
  };

  const handleSignatureCapture = (signatureData: string) => {
    if (selectedPerson) {
      setPersons(prev => prev.map(p => 
        p.id === selectedPerson.id ? { ...p, signature: signatureData } : p
      ));
      toast({
        title: "Signature Captured",
        description: "Signature has been successfully saved to the person's profile.",
      });
      setShowSignature(false);
    }
  };

  const handlePrintCard = (person: any) => {
    if (!person.photo || !person.signature) {
      toast({
        title: "Missing Requirements",
        description: "Photo and signature must be captured before printing ID card.",
        variant: "destructive"
      });
      return;
    }
    setSelectedPerson(person);
    setShowIDCard(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>;
      case 'Pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Inactive':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Insured Person Directory</h1>
            <p className="text-gray-600">Manage registered insured persons and ID cards</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/person-registration')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Register New Person
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Main Menu
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Insured Persons</CardTitle>
          <CardDescription>Find registered persons by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={searchBy} onValueChange={setSearchBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="nationalId">National ID</SelectItem>
                <SelectItem value="registrationNo">Registration No.</SelectItem>
                <SelectItem value="mobile">Mobile Number</SelectItem>
              </SelectContent>
            </Select>
            <Button className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Persons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Persons ({filteredPersons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Registration No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersons.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                      {person.photo ? (
                        <img src={person.photo} alt="Photo" className="w-full h-full object-cover rounded" />
                      ) : (
                        <Users className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{person.registrationNo}</TableCell>
                  <TableCell>{person.firstName} {person.lastName}</TableCell>
                  <TableCell>{new Date(person.dateOfBirth).toLocaleDateString()}</TableCell>
                  <TableCell>{person.gender}</TableCell>
                  <TableCell>{person.mobileNumber}</TableCell>
                  <TableCell>{getStatusBadge(person.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowCamera(true);
                        }}
                        title="Capture Photo"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedPerson(person);
                          setShowSignature(true);
                        }}
                        title="Capture Signature"
                      >
                        <PenTool className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePrintCard(person)}
                        title="Print ID Card"
                        disabled={!person.photo || !person.signature}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={showCamera} onOpenChange={setShowCamera}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Photo</DialogTitle>
            <DialogDescription>
              Capture a photo for {selectedPerson?.firstName} {selectedPerson?.lastName}
            </DialogDescription>
          </DialogHeader>
          <CameraCapture onCapture={handlePhotoCapture} />
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      <Dialog open={showSignature} onOpenChange={setShowSignature}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capture Signature</DialogTitle>
            <DialogDescription>
              Capture digital signature for {selectedPerson?.firstName} {selectedPerson?.lastName}
            </DialogDescription>
          </DialogHeader>
          <SignatureCapture onCapture={handleSignatureCapture} />
        </DialogContent>
      </Dialog>

      {/* ID Card Preview Dialog */}
      <Dialog open={showIDCard} onOpenChange={setShowIDCard}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
            <DialogDescription>
              Preview and print ID card for {selectedPerson?.firstName} {selectedPerson?.lastName}
            </DialogDescription>
          </DialogHeader>
          {selectedPerson && (
            <IDCardPreview 
              person={selectedPerson}
              onPrint={() => {
                toast({
                  title: "Print Initiated",
                  description: "ID card has been sent to printer.",
                });
                setShowIDCard(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PersonDirectory;
