
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
  Filter,
  Eye,
  Download,
  ArrowLeft,
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  CreditCard
} from 'lucide-react';

// Mock data for insured persons
const insuredPersons = [
  {
    id: 1,
    socialSecurityNo: 'SS001234567',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1985-03-15',
    gender: 'Male',
    nationality: 'St. Kitts & Nevis',
    email: 'john.doe@email.com',
    phone: '(869) 465-1234',
    address: '123 Main Street, Basseterre',
    occupation: 'Software Developer',
    employer: 'Tech Solutions Ltd.',
    maritalStatus: 'Married',
    status: 'Active',
    registrationDate: '2023-01-15',
    idCardIssued: true,
    contributionsPaid: 156,
    lastContribution: '2024-01-01'
  },
  {
    id: 2,
    socialSecurityNo: 'SS001234568',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    dateOfBirth: '1990-07-22',
    gender: 'Female',
    nationality: 'Dominican Republic',
    email: 'maria.rodriguez@email.com',
    phone: '(869) 465-5678',
    address: '456 Church Street, Charlestown',
    occupation: 'Nurse',
    employer: 'General Hospital',
    maritalStatus: 'Single',
    status: 'Active',
    registrationDate: '2023-03-20',
    idCardIssued: true,
    contributionsPaid: 98,
    lastContribution: '2024-01-01'
  },
  {
    id: 3,
    socialSecurityNo: 'SS001234569',
    firstName: 'David',
    lastName: 'Williams',
    dateOfBirth: '1988-11-10',
    gender: 'Male',
    nationality: 'St. Kitts & Nevis',
    email: 'david.williams@email.com',
    phone: '(869) 465-9012',
    address: '789 Victoria Road, Sandy Point',
    occupation: 'Teacher',
    employer: 'Sandy Point High School',
    maritalStatus: 'Divorced',
    status: 'Active',
    registrationDate: '2023-05-10',
    idCardIssued: false,
    contributionsPaid: 67,
    lastContribution: '2023-12-01'
  },
  {
    id: 4,
    socialSecurityNo: 'SS001234570',
    firstName: 'Sarah',
    lastName: 'Johnson',
    dateOfBirth: '1992-09-05',
    gender: 'Female',
    nationality: 'St. Kitts & Nevis',
    email: 'sarah.johnson@email.com',
    phone: '(869) 465-3456',
    address: '321 Independence Square, Basseterre',
    occupation: 'Accountant',
    employer: 'Financial Services Ltd.',
    maritalStatus: 'Single',
    status: 'Suspended',
    registrationDate: '2022-11-30',
    idCardIssued: true,
    contributionsPaid: 45,
    lastContribution: '2023-10-01'
  }
];

const PersonDirectory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);

  const filteredPersons = insuredPersons.filter(person => {
    const matchesSearch = 
      person.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.socialSecurityNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || person.status.toLowerCase() === statusFilter;
    const matchesGender = genderFilter === 'all' || person.gender.toLowerCase() === genderFilter;
    
    return matchesSearch && matchesStatus && matchesGender;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Social Security No.', 'First Name', 'Last Name', 'Date of Birth', 'Gender', 'Email', 'Phone', 'Occupation', 'Employer', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredPersons.map(person => [
        person.socialSecurityNo,
        person.firstName,
        person.lastName,
        person.dateOfBirth,
        person.gender,
        person.email,
        person.phone,
        person.occupation,
        person.employer,
        person.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insured-persons.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
            <h1 className="text-3xl font-bold text-gray-900">Person Directory</h1>
            <p className="text-gray-600">Manage and view all insured persons</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Main Menu
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-gray-700 transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-gray-900">Person Directory</span>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Persons</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuredPersons.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered insured persons
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuredPersons.filter(p => p.status === 'Active').length}</div>
            <p className="text-xs text-muted-foreground">
              Active contributors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ID Cards Issued</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insuredPersons.filter(p => p.idCardIssued).length}</div>
            <p className="text-xs text-muted-foreground">
              Cards distributed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              New registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search and Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, SSN, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportToCSV} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Persons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Insured Persons ({filteredPersons.length})</CardTitle>
          <CardDescription>
            Complete directory of all registered insured persons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Social Security No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ID Card</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersons.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">{person.socialSecurityNo}</TableCell>
                  <TableCell>{person.firstName} {person.lastName}</TableCell>
                  <TableCell>{new Date(person.dateOfBirth).toLocaleDateString()}</TableCell>
                  <TableCell>{person.gender}</TableCell>
                  <TableCell>{person.occupation}</TableCell>
                  <TableCell>{person.employer}</TableCell>
                  <TableCell>{getStatusBadge(person.status)}</TableCell>
                  <TableCell>
                    {person.idCardIssued ? (
                      <Badge className="bg-green-100 text-green-800">Issued</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedPerson(person)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Person Details</DialogTitle>
                          <DialogDescription>
                            Complete information for {selectedPerson?.firstName} {selectedPerson?.lastName}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {selectedPerson && (
                          <div className="space-y-6">
                            {/* Personal Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <User className="h-5 w-5" />
                                  Personal Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Social Security No.</Label>
                                  <p className="text-sm">{selectedPerson.socialSecurityNo}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                                  <p className="text-sm">{selectedPerson.firstName} {selectedPerson.lastName}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                                  <p className="text-sm">{new Date(selectedPerson.dateOfBirth).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Gender</Label>
                                  <p className="text-sm">{selectedPerson.gender}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Nationality</Label>
                                  <p className="text-sm">{selectedPerson.nationality}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Marital Status</Label>
                                  <p className="text-sm">{selectedPerson.maritalStatus}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Contact Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Phone className="h-5 w-5" />
                                  Contact Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Email</Label>
                                  <p className="text-sm">{selectedPerson.email}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Phone</Label>
                                  <p className="text-sm">{selectedPerson.phone}</p>
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-sm font-medium text-gray-500">Address</Label>
                                  <p className="text-sm">{selectedPerson.address}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Employment Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Building2 className="h-5 w-5" />
                                  Employment Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Occupation</Label>
                                  <p className="text-sm">{selectedPerson.occupation}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Employer</Label>
                                  <p className="text-sm">{selectedPerson.employer}</p>
                                </div>
                              </CardContent>
                            </Card>

                            {/* System Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Calendar className="h-5 w-5" />
                                  System Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Registration Date</Label>
                                  <p className="text-sm">{new Date(selectedPerson.registrationDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                                  <p className="text-sm">{selectedPerson.status}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Contributions Paid</Label>
                                  <p className="text-sm">{selectedPerson.contributionsPaid}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">Last Contribution</Label>
                                  <p className="text-sm">{new Date(selectedPerson.lastContribution).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-gray-500">ID Card Status</Label>
                                  <p className="text-sm">{selectedPerson.idCardIssued ? 'Issued' : 'Pending'}</p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonDirectory;
