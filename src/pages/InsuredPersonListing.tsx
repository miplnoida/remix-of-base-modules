
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Edit,
  Eye,
  HelpCircle,
  ArrowLeft,
  Home
} from 'lucide-react';

const InsuredPersonListing = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    dob: '',
    surname: '',
    firstname: '',
    phone: '',
    gender: '',
    status: '',
    selfRefNo: ''
  });

  // Mock data for insured persons
  const insuredPersons = [
    {
      ssn: '123456',
      surname: 'Doe',
      firstname: 'John',
      middlename: 'Michael',
      previousName: '',
      dob: '1985-03-15',
      sex: 'Male',
      alias: '',
      primaryOccup: 'Accountant',
      selfRefNo: 'IP001',
      aspNum: 'ASP123',
      status: 'Active',
      residentAddr1: '123 Main Street',
      residentAddr2: 'Apt 2B',
      district: 'Basseterre Zone 01',
      phone: '+1869-465-1234',
      registrationDate: '2024-01-15'
    },
    {
      ssn: '789012',
      surname: 'Smith',
      firstname: 'Jane',
      middlename: 'Elizabeth',
      previousName: 'Johnson',
      dob: '1990-07-22',
      sex: 'Female',
      alias: 'Liz',
      primaryOccup: 'Administrative Assistance',
      selfRefNo: 'IP002',
      aspNum: 'ASP456',
      status: 'Pending',
      residentAddr1: '456 Church Street',
      residentAddr2: '',
      district: 'Charlestown',
      phone: '+1869-469-5678',
      registrationDate: '2024-01-20'
    }
  ];

  const handleSearch = () => {
    console.log('Searching with parameters:', searchParams);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
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
            <h1 className="text-3xl font-bold text-gray-900">Insured Person Listing</h1>
            <p className="text-gray-600">Search and manage registered insured persons</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate('/person/register')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New IP
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

      {/* Search Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Insured Persons</CardTitle>
          <CardDescription>Use the filters below to find specific insured persons</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">SSN</label>
              <Input
                placeholder="Enter SSN"
                value={searchParams.ssn}
                onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date of Birth</label>
              <Input
                type="date"
                value={searchParams.dob}
                onChange={(e) => setSearchParams(prev => ({ ...prev, dob: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Surname</label>
              <Input
                placeholder="Enter surname"
                value={searchParams.surname}
                onChange={(e) => setSearchParams(prev => ({ ...prev, surname: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                placeholder="Enter first name"
                value={searchParams.firstname}
                onChange={(e) => setSearchParams(prev => ({ ...prev, firstname: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                placeholder="Enter phone number"
                value={searchParams.phone}
                onChange={(e) => setSearchParams(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Gender</label>
              <Select value={searchParams.gender} onValueChange={(value) => setSearchParams(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Not Specified">Not Specified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={searchParams.status} onValueChange={(value) => setSearchParams(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Self Ref No.</label>
              <Input
                placeholder="Enter self ref no."
                value={searchParams.selfRefNo}
                onChange={(e) => setSearchParams(prev => ({ ...prev, selfRefNo: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
            <Button variant="outline" onClick={() => setSearchParams({
              ssn: '', dob: '', surname: '', firstname: '', phone: '', gender: '', status: '', selfRefNo: ''
            })}>
              Clear
            </Button>
            <Button variant="outline">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Insured Persons ({insuredPersons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SSN</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>DOB</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Primary Occupation</TableHead>
                  <TableHead>Self Ref No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insuredPersons.map((person, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{person.ssn}</TableCell>
                    <TableCell>
                      {person.surname}, {person.firstname} {person.middlename}
                      {person.previousName && <div className="text-sm text-gray-500">Prev: {person.previousName}</div>}
                    </TableCell>
                    <TableCell>{new Date(person.dob).toLocaleDateString()}</TableCell>
                    <TableCell>{person.sex}</TableCell>
                    <TableCell>{person.primaryOccup}</TableCell>
                    <TableCell>{person.selfRefNo}</TableCell>
                    <TableCell>{getStatusBadge(person.status)}</TableCell>
                    <TableCell>{person.district}</TableCell>
                    <TableCell>{person.phone}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" title="Edit Details">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsuredPersonListing;
