
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  DollarSign,
  FileText,
  ToggleLeft,
  HandCoins,
  Edit,
  Eye,
  IdCard
} from 'lucide-react';

const ViewInsuredPerson = () => {
  const navigate = useNavigate();
  const { ssn } = useParams();
  const [activeTab, setActiveTab] = useState('details');

  // Mock data - replace with actual data fetching
  const personData = {
    ssn: ssn || '123456',
    surname: 'Doe',
    firstname: 'John',
    middlename: 'Michael',
    dob: '1985-03-15',
    sex: 'Male',
    status: 'Active',
    occupation: 'Accountant',
    phone: '+1869-465-1234',
    email: 'john.doe@email.com',
    address: '123 Main Street, Apt 2B',
    district: 'Basseterre Zone 01'
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'Inactive':
        return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleEdit = () => {
    navigate(`/person/edit/${ssn}`);
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/person/management')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900">
              {personData.firstname} {personData.surname}
            </h1>
            <p className="text-gray-600">SSN: {personData.ssn}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button>
            <IdCard className="h-4 w-4 mr-2" />
            Generate ID Card
          </Button>
        </div>
      </div>

      {/* Person Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Personal Information</CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-sm text-gray-600">Status: {getStatusBadge(personData.status)}</span>
                <span className="text-sm text-gray-600">DOB: {new Date(personData.dob).toLocaleDateString()}</span>
                <span className="text-sm text-gray-600">Gender: {personData.sex}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Occupation</label>
              <p className="text-sm">{personData.occupation}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Phone</label>
              <p className="text-sm">{personData.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm">{personData.email}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-sm">{personData.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">District</label>
              <p className="text-sm">{personData.district}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
          <TabsTrigger value="wages" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Wages</span>
          </TabsTrigger>
          <TabsTrigger value="claims" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Claims</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <ToggleLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
          <TabsTrigger value="contribution" className="flex items-center gap-2">
            <HandCoins className="h-4 w-4" />
            <span className="hidden sm:inline">Voluntary</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Personal Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Full Name</label>
                      <p className="text-sm">{personData.firstname} {personData.middlename} {personData.surname}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                      <p className="text-sm">{new Date(personData.dob).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p className="text-sm">{personData.sex}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Contact Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm">{personData.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="text-sm">{personData.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="text-sm">{personData.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Wages History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Wages history will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Claim History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Claim history will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Insured Person Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Status change functionality will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contribution" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Voluntary Contribution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Voluntary contribution management will be implemented here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ViewInsuredPerson;
