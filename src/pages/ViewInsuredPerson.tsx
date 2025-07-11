
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  DollarSign,
  FileText,
  ToggleLeft,
  HandCoins,
  Edit,
  Eye,
  IdCard,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Users,
  Building2,
  Camera,
  Shield,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Import form tabs
import { PersonalInfoTab } from '@/components/person/PersonalInfoTab';
import { AddressInfoTab } from '@/components/person/AddressInfoTab';
import { EmploymentInfoTab } from '@/components/person/EmploymentInfoTab';
import { DependantsTab } from '@/components/person/DependantsTab';
import { EmergencyContactTab } from '@/components/person/EmergencyContactTab';
import { PhotoSignatureTab } from '@/components/person/PhotoSignatureTab';
import { DeclarationTab } from '@/components/person/DeclarationTab';

const ViewInsuredPerson = () => {
  const navigate = useNavigate();
  const { ssn } = useParams();
  const [activeTab, setActiveTab] = useState('personal');
  const [activeHistoryTab, setActiveHistoryTab] = useState('wages');
  const [isRegisterSectionOpen, setIsRegisterSectionOpen] = useState(true);
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('Active');
  
  // Form data and handlers for tabs
  const [formData, setFormData] = useState({});
  const [dependants, setDependants] = useState([]);
  const [formerEmployers, setFormerEmployers] = useState([]);
  const [caricomCountries, setCaricomCountries] = useState([]);

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Active
        </Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Pending
        </Badge>;
      case 'Verify':
        return <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <UserCheck className="h-3 w-3" /> Verify
        </Badge>;
      case 'Suspend':
        return <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Suspend
        </Badge>;
      case 'Ceased':
        return <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Ceased
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleEdit = () => {
    navigate(`/person/edit/${ssn}`);
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
    // Update person data status
    console.log(`Status changed to: ${newStatus}`);
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

      {/* Register Person Form Tabs Section - Collapsible */}
      <Collapsible open={isRegisterSectionOpen} onOpenChange={setIsRegisterSectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Registration Information
                </CardTitle>
                {isRegisterSectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="personal" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Personal</span>
                  </TabsTrigger>
                  <TabsTrigger value="address" className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Address</span>
                  </TabsTrigger>
                  <TabsTrigger value="employment" className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Employment</span>
                  </TabsTrigger>
                  <TabsTrigger value="dependants" className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Dependants</span>
                  </TabsTrigger>
                  <TabsTrigger value="emergency" className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Emergency</span>
                  </TabsTrigger>
                  <TabsTrigger value="photo" className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">Photo</span>
                  </TabsTrigger>
                  <TabsTrigger value="declaration" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Declaration</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="personal">
                    <PersonalInfoTab formData={formData} handleInputChange={handleInputChange} />
                  </TabsContent>
                  
                  <TabsContent value="address">
                    <AddressInfoTab formData={formData} handleInputChange={handleInputChange} />
                  </TabsContent>
                  
                  <TabsContent value="employment">
                    <EmploymentInfoTab 
                      formData={formData} 
                      handleInputChange={handleInputChange}
                      formerEmployers={formerEmployers}
                      setFormerEmployers={setFormerEmployers}
                      caricomCountries={caricomCountries}
                      setCaricomCountries={setCaricomCountries}
                    />
                  </TabsContent>
                  
                  <TabsContent value="dependants">
                    <DependantsTab dependants={dependants} setDependants={setDependants} />
                  </TabsContent>
                  
                  <TabsContent value="emergency">
                    <EmergencyContactTab formData={formData} handleInputChange={handleInputChange} />
                  </TabsContent>
                  
                  <TabsContent value="photo">
                    <PhotoSignatureTab formData={formData} handleInputChange={handleInputChange} />
                  </TabsContent>
                  
                  <TabsContent value="declaration">
                    <DeclarationTab formData={formData} handleInputChange={handleInputChange} />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* History and Status Management Section - Collapsible */}
      <Collapsible open={isHistorySectionOpen} onOpenChange={setIsHistorySectionOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  History & Status Management
                </CardTitle>
                {isHistorySectionOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <Tabs value={activeHistoryTab} onValueChange={setActiveHistoryTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
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
                  <TabsTrigger value="voluntary" className="flex items-center gap-2">
                    <HandCoins className="h-4 w-4" />
                    <span className="hidden sm:inline">Voluntary</span>
                  </TabsTrigger>
                  <TabsTrigger value="selfemployed" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Self-Employed</span>
                  </TabsTrigger>
                  <TabsTrigger value="contributions" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Contributions</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="wages">
                    <Card>
                      <CardHeader>
                        <CardTitle>Wages History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead>Employer</TableHead>
                              <TableHead>Wages</TableHead>
                              <TableHead>Contributions</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024 Q1</TableCell>
                              <TableCell>ABC Company Ltd</TableCell>
                              <TableCell>$4,500.00</TableCell>
                              <TableCell>$450.00</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">Paid</Badge></TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2023 Q4</TableCell>
                              <TableCell>ABC Company Ltd</TableCell>
                              <TableCell>$4,200.00</TableCell>
                              <TableCell>$420.00</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">Paid</Badge></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="claims">
                    <Card>
                      <CardHeader>
                        <CardTitle>Claims History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Claim ID</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Date Filed</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>CLM-2024-001</TableCell>
                              <TableCell>Medical</TableCell>
                              <TableCell>2024-02-15</TableCell>
                              <TableCell>$750.00</TableCell>
                              <TableCell><Badge className="bg-blue-100 text-blue-800">Processing</Badge></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="status">
                    <Card>
                      <CardHeader>
                        <CardTitle>Status Management</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <label className="text-sm font-medium">Current Status:</label>
                            {getStatusBadge(currentStatus)}
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="text-sm font-medium">Change Status:</label>
                            <Select value={currentStatus} onValueChange={handleStatusChange}>
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select new status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Verify">Verify</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Suspend">Suspend</SelectItem>
                                <SelectItem value="Ceased">Ceased</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="pt-4">
                            <h4 className="font-medium mb-2">Status History</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Previous Status</TableHead>
                                  <TableHead>New Status</TableHead>
                                  <TableHead>Changed By</TableHead>
                                  <TableHead>Reason</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell>2024-01-20</TableCell>
                                  <TableCell>Pending</TableCell>
                                  <TableCell>Active</TableCell>
                                  <TableCell>Admin User</TableCell>
                                  <TableCell>Verification completed</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="voluntary">
                    <Card>
                      <CardHeader>
                        <CardTitle>Voluntary Contributions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-500 mb-4">Voluntary contribution history and management.</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024-03-01</TableCell>
                              <TableCell>$200.00</TableCell>
                              <TableCell>Bank Transfer</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">Received</Badge></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="selfemployed">
                    <Card>
                      <CardHeader>
                        <CardTitle>Self-Employed Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-500 mb-4">Self-employment history and earnings.</p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead>Business Type</TableHead>
                              <TableHead>Declared Income</TableHead>
                              <TableHead>Contributions</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024 Q1</TableCell>
                              <TableCell>Consulting Services</TableCell>
                              <TableCell>$5,000.00</TableCell>
                              <TableCell>$500.00</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">Filed</Badge></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contributions">
                    <Card>
                      <CardHeader>
                        <CardTitle>Contribution Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium">Total Contributions</h4>
                            <p className="text-2xl font-bold text-primary">$15,420.00</p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium">Years of Service</h4>
                            <p className="text-2xl font-bold text-primary">8.5</p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium">Last Payment</h4>
                            <p className="text-2xl font-bold text-primary">2024-03-01</p>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Employee Contribution</TableHead>
                              <TableHead>Employer Contribution</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Weeks Credited</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024</TableCell>
                              <TableCell>$450.00</TableCell>
                              <TableCell>$450.00</TableCell>
                              <TableCell>$900.00</TableCell>
                              <TableCell>12</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2023</TableCell>
                              <TableCell>$1,680.00</TableCell>
                              <TableCell>$1,680.00</TableCell>
                              <TableCell>$3,360.00</TableCell>
                              <TableCell>52</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default ViewInsuredPerson;
