
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

const AddEmployer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    basicDetails: {
      name: '',
      registrationNumber: '',
      businessType: '',
      contactPerson: ''
    },
    address: {
      street: '',
      village: '',
      district: '',
      phone: '',
      email: ''
    },
    ownership: {
      ownershipType: '',
      owners: []
    },
    employees: {
      totalEmployees: '',
      categories: []
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
    navigate('/employers-management/manage');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Employers Management</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Add New Employer</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={handleSubmit} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Employer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Employer</h1>
          <p className="text-gray-600">Register a new employer with complete details and requirements</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic Details</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="ownership">Ownership</TabsTrigger>
              <TabsTrigger value="employees">Employees</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="notes">Notes & Visits</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Enter the employer's basic details and registration information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        value={formData.basicDetails.name}
                        onChange={(e) => setFormData({
                          ...formData,
                          basicDetails: { ...formData.basicDetails, name: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="regNumber">Registration Number *</Label>
                      <Input
                        id="regNumber"
                        value={formData.basicDetails.registrationNumber}
                        onChange={(e) => setFormData({
                          ...formData,
                          basicDetails: { ...formData.basicDetails, registrationNumber: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessType">Business Type *</Label>
                      <Input
                        id="businessType"
                        value={formData.basicDetails.businessType}
                        onChange={(e) => setFormData({
                          ...formData,
                          basicDetails: { ...formData.basicDetails, businessType: e.target.value }
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPerson">Contact Person *</Label>
                      <Input
                        id="contactPerson"
                        value={formData.basicDetails.contactPerson}
                        onChange={(e) => setFormData({
                          ...formData,
                          basicDetails: { ...formData.basicDetails, contactPerson: e.target.value }
                        })}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Address Information</CardTitle>
                  <CardDescription>Enter the employer's address and contact details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="street">Street Address</Label>
                      <Input id="street" />
                    </div>
                    <div>
                      <Label htmlFor="village">Village</Label>
                      <Input id="village" />
                    </div>
                    <div>
                      <Label htmlFor="district">District</Label>
                      <Input id="district" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ownership" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ownership Structure</CardTitle>
                  <CardDescription>Define the ownership structure and key stakeholders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ownershipType">Ownership Type</Label>
                    <Input id="ownershipType" placeholder="e.g., Sole Proprietorship, Partnership, Corporation" />
                  </div>
                  <div>
                    <Label>Owners/Stakeholders</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Owner Name" />
                        <Input placeholder="Percentage" />
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Owner
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employees" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Information</CardTitle>
                  <CardDescription>Provide details about the employer's workforce</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="totalEmployees">Total Number of Employees</Label>
                    <Input id="totalEmployees" type="number" />
                  </div>
                  <div>
                    <Label>Employee Categories</Label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Category (e.g., Full-time, Part-time)" />
                        <Input placeholder="Count" type="number" />
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Category
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="locations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Locations</CardTitle>
                  <CardDescription>Add all business locations and branches</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">Location 1 (Head Office)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input placeholder="Address" />
                        <Input placeholder="Village" />
                        <Input placeholder="District" />
                        <Input placeholder="Phone" />
                      </div>
                    </div>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Visit History</CardTitle>
                  <CardDescription>Add notes and track visits to the employer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="notes">General Notes</Label>
                    <Textarea id="notes" placeholder="Add any relevant notes about the employer..." />
                  </div>
                  <div>
                    <Label>Visit History</Label>
                    <div className="space-y-2">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Initial Registration Visit</span>
                          <span className="text-sm text-gray-500">Today</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Registration process initiated</p>
                      </div>
                    </div>
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
