
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Search, Filter, Calendar, Plus, Building2 } from 'lucide-react';
import { employerData } from '@/data/employerData';

const EmployersReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('registered');

  // Generate reports from actual employer data
  const registeredEmployers = employerData.filter(emp => emp.employerStatus === 'Active');
  const ceasedEmployers = employerData.filter(emp => emp.employerStatus === 'Inactive');
  const pendingVerification = employerData.filter(emp => emp.complianceStatus === 'Under Audit');

  const filteredRegistered = registeredEmployers.filter(emp =>
    emp.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCeased = ceasedEmployers.filter(emp =>
    emp.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPending = pendingVerification.filter(emp =>
    emp.employerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <span className="text-gray-900 font-medium">Reports</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => navigate('/employers-management/add')}
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Register Employer
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Employers Reports</h1>
              <p className="text-gray-600">Generate and view reports for registered, ceased, and pending employers</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/employers-management/add')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register New Employer
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employers..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Range
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="registered">Registered Employers</TabsTrigger>
            <TabsTrigger value="ceased">Ceased/Suspended</TabsTrigger>
            <TabsTrigger value="pending">Pending Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registered Employers Report</CardTitle>
                <CardDescription>List of all active registered employers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer ID</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered Date</TableHead>
                      <TableHead>Employees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistered.map((employer) => (
                      <TableRow key={employer.employerId}>
                        <TableCell className="font-medium">{employer.employerId}</TableCell>
                        <TableCell>{employer.employerName}</TableCell>
                        <TableCell>{employer.businessType}</TableCell>
                        <TableCell>
                          <Badge variant="default">{employer.employerStatus}</Badge>
                        </TableCell>
                        <TableCell>{new Date(employer.registrationDate).toLocaleDateString()}</TableCell>
                        <TableCell>{employer.numberOfEmployees.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ceased" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ceased/Suspended Employers</CardTitle>
                <CardDescription>List of employers that have ceased operations or been suspended</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer ID</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ceased Date</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCeased.map((employer) => (
                      <TableRow key={employer.employerId}>
                        <TableCell className="font-medium">{employer.employerId}</TableCell>
                        <TableCell>{employer.employerName}</TableCell>
                        <TableCell>{employer.businessType}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {employer.employerStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(employer.lastAuditDate).toLocaleDateString()}</TableCell>
                        <TableCell>Business Operations Ceased</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Verification</CardTitle>
                <CardDescription>Employers waiting for verification and approval</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer ID</TableHead>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Assigned Inspector</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((employer) => (
                      <TableRow key={employer.employerId}>
                        <TableCell className="font-medium">{employer.employerId}</TableCell>
                        <TableCell>{employer.employerName}</TableCell>
                        <TableCell>{employer.businessType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employer.complianceStatus}</Badge>
                        </TableCell>
                        <TableCell>{new Date(employer.lastAuditDate).toLocaleDateString()}</TableCell>
                        <TableCell>{employer.authorizedRepresentative}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployersReports;
