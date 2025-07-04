
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Search, Filter, Calendar } from 'lucide-react';

const EmployersReports = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('registered');

  const registeredEmployers = [
    { id: 'EMP001', name: 'ABC Manufacturing Ltd', type: 'Manufacturing', status: 'Active', registeredDate: '2024-01-15', employees: 45 },
    { id: 'EMP002', name: 'XYZ Services Corp', type: 'Services', status: 'Active', registeredDate: '2024-01-10', employees: 23 },
    { id: 'EMP003', name: 'Tech Solutions Inc', type: 'Technology', status: 'Active', registeredDate: '2024-01-08', employees: 67 },
    { id: 'EMP004', name: 'Retail Chain Ltd', type: 'Retail', status: 'Active', registeredDate: '2024-01-05', employees: 89 },
  ];

  const ceasedEmployers = [
    { id: 'EMP005', name: 'Old Factory Ltd', type: 'Manufacturing', status: 'Ceased', ceasedDate: '2024-01-20', reason: 'Business Closure' },
    { id: 'EMP006', name: 'Temp Services', type: 'Services', status: 'Suspended', ceasedDate: '2024-01-18', reason: 'Non-compliance' },
  ];

  const pendingVerification = [
    { id: 'EMP007', name: 'New Business Ltd', type: 'Construction', status: 'Pending', appliedDate: '2024-01-22', inspector: 'John Smith' },
    { id: 'EMP008', name: 'Startup Corp', type: 'Technology', status: 'Under Review', appliedDate: '2024-01-20', inspector: 'Jane Doe' },
  ];

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employers Reports</h1>
          <p className="text-gray-600">Generate and view reports for registered, ceased, and pending employers</p>
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
                    {registeredEmployers.map((employer) => (
                      <TableRow key={employer.id}>
                        <TableCell className="font-medium">{employer.id}</TableCell>
                        <TableCell>{employer.name}</TableCell>
                        <TableCell>{employer.type}</TableCell>
                        <TableCell>
                          <Badge variant="default">{employer.status}</Badge>
                        </TableCell>
                        <TableCell>{employer.registeredDate}</TableCell>
                        <TableCell>{employer.employees}</TableCell>
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
                    {ceasedEmployers.map((employer) => (
                      <TableRow key={employer.id}>
                        <TableCell className="font-medium">{employer.id}</TableCell>
                        <TableCell>{employer.name}</TableCell>
                        <TableCell>{employer.type}</TableCell>
                        <TableCell>
                          <Badge variant={employer.status === 'Ceased' ? 'secondary' : 'destructive'}>
                            {employer.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{employer.ceasedDate}</TableCell>
                        <TableCell>{employer.reason}</TableCell>
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
                    {pendingVerification.map((employer) => (
                      <TableRow key={employer.id}>
                        <TableCell className="font-medium">{employer.id}</TableCell>
                        <TableCell>{employer.name}</TableCell>
                        <TableCell>{employer.type}</TableCell>
                        <TableCell>
                          <Badge variant="default">{employer.status}</Badge>
                        </TableCell>
                        <TableCell>{employer.appliedDate}</TableCell>
                        <TableCell>{employer.inspector}</TableCell>
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
