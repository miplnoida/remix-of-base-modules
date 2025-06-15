
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, AlertTriangle, CheckCircle, FileText, Upload, Download, Edit, Plus } from 'lucide-react';

const EmployerComplianceManagement = () => {
  const navigate = useNavigate();
  const [selectedEmployer, setSelectedEmployer] = useState(null);

  const employers = [
    {
      id: 'EMP-001',
      name: 'ABC Manufacturing Ltd',
      registrationNumber: 'REG-12345',
      industry: 'Manufacturing',
      employees: 245,
      riskScore: 75,
      complianceStatus: 'Non-Compliant',
      lastAudit: '2023-11-15',
      violations: 3,
      contributionStatus: 'Late'
    },
    {
      id: 'EMP-002',
      name: 'XYZ Services Corp',
      registrationNumber: 'REG-23456',
      industry: 'Services',
      employees: 89,
      riskScore: 25,
      complianceStatus: 'Compliant',
      lastAudit: '2023-12-01',
      violations: 0,
      contributionStatus: 'Current'
    },
    {
      id: 'EMP-003',
      name: 'Tech Solutions Inc',
      registrationNumber: 'REG-34567',
      industry: 'Technology',
      employees: 156,
      riskScore: 60,
      complianceStatus: 'Under Review',
      lastAudit: '2023-10-20',
      violations: 1,
      contributionStatus: 'Current'
    }
  ];

  const contributionHistory = [
    { period: '2023-12', amount: '$12,450', status: 'Paid', dueDate: '2024-01-15', paidDate: '2024-01-10' },
    { period: '2023-11', amount: '$12,450', status: 'Late', dueDate: '2023-12-15', paidDate: '2023-12-22' },
    { period: '2023-10', amount: '$11,890', status: 'Paid', dueDate: '2023-11-15', paidDate: '2023-11-12' },
    { period: '2023-09', amount: '$12,100', status: 'Paid', dueDate: '2023-10-15', paidDate: '2023-10-08' },
  ];

  const violations = [
    {
      id: 'V-2024-001',
      type: 'Late Payment',
      description: 'November 2023 contributions paid 7 days late',
      severity: 'Medium',
      dateReported: '2023-12-22',
      status: 'Resolved',
      penalty: '$150'
    },
    {
      id: 'V-2024-015',
      type: 'Under-reporting',
      description: 'Employee salary under-reported for October 2023',
      severity: 'High',
      dateReported: '2023-11-25',
      status: 'Open',
      penalty: '$500'
    }
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
                onClick={() => navigate("/compliance/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Compliance
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Compliance & Audit</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Employer Management</span>
              </nav>
            </div>
            <Button onClick={() => {}} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Audit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Employer Compliance Management</h1>
          <p className="text-gray-600">Monitor and manage employer compliance across all registered companies</p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Employer Overview</TabsTrigger>
            <TabsTrigger value="audit">Audit Management</TabsTrigger>
            <TabsTrigger value="violations">Violation Tracking</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employer Compliance Directory</CardTitle>
                <CardDescription>View and manage all registered employers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employers.map((employer) => (
                      <TableRow key={employer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employer.name}</div>
                            <div className="text-sm text-gray-500">{employer.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{employer.registrationNumber}</TableCell>
                        <TableCell>{employer.industry}</TableCell>
                        <TableCell>{employer.employees}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${
                              employer.riskScore >= 70 ? 'text-red-600' :
                              employer.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {employer.riskScore}
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  employer.riskScore >= 70 ? 'bg-red-500' :
                                  employer.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${employer.riskScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            employer.complianceStatus === 'Compliant' ? 'default' :
                            employer.complianceStatus === 'Non-Compliant' ? 'destructive' : 'secondary'
                          }>
                            {employer.complianceStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={employer.violations > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {employer.violations}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEmployer(employer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {selectedEmployer && (
              <Card>
                <CardHeader>
                  <CardTitle>Employer Details: {selectedEmployer.name}</CardTitle>
                  <CardDescription>Detailed compliance information and history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="profile">Profile</TabsTrigger>
                      <TabsTrigger value="contributions">Contributions</TabsTrigger>
                      <TabsTrigger value="violations">Violations</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Company Name</Label>
                          <Input value={selectedEmployer.name} readOnly />
                        </div>
                        <div>
                          <Label>Registration Number</Label>
                          <Input value={selectedEmployer.registrationNumber} readOnly />
                        </div>
                        <div>
                          <Label>Industry</Label>
                          <Input value={selectedEmployer.industry} readOnly />
                        </div>
                        <div>
                          <Label>Number of Employees</Label>
                          <Input value={selectedEmployer.employees} readOnly />
                        </div>
                        <div>
                          <Label>Risk Score</Label>
                          <Input value={`${selectedEmployer.riskScore}/100`} readOnly />
                        </div>
                        <div>
                          <Label>Compliance Status</Label>
                          <Input value={selectedEmployer.complianceStatus} readOnly />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="contributions">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Paid Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {contributionHistory.map((contribution, index) => (
                            <TableRow key={index}>
                              <TableCell>{contribution.period}</TableCell>
                              <TableCell>{contribution.amount}</TableCell>
                              <TableCell>
                                <Badge variant={contribution.status === 'Paid' ? 'default' : 'destructive'}>
                                  {contribution.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{contribution.dueDate}</TableCell>
                              <TableCell>{contribution.paidDate}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>

                    <TabsContent value="violations">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Violation ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Penalty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {violations.map((violation) => (
                            <TableRow key={violation.id}>
                              <TableCell>{violation.id}</TableCell>
                              <TableCell>{violation.type}</TableCell>
                              <TableCell>{violation.description}</TableCell>
                              <TableCell>
                                <Badge variant={violation.severity === 'High' ? 'destructive' : 'default'}>
                                  {violation.severity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={violation.status === 'Resolved' ? 'default' : 'destructive'}>
                                  {violation.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{violation.penalty}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employer Audit Form</CardTitle>
                <CardDescription>Conduct comprehensive compliance audit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Select Employer</Label>
                    <Input placeholder="Search and select employer..." />
                  </div>
                  <div>
                    <Label>Audit Type</Label>
                    <Input placeholder="Routine / Risk-based / Investigation" />
                  </div>
                  <div>
                    <Label>Audit Date</Label>
                    <Input type="date" />
                  </div>
                  <div>
                    <Label>Assigned Auditor</Label>
                    <Input placeholder="Select auditor..." />
                  </div>
                </div>
                
                <div>
                  <Label>Audit Checklist</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="remittances" />
                      <label htmlFor="remittances">Contribution Remittances</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="registration" />
                      <label htmlFor="registration">Employee Registration Records</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="wages" />
                      <label htmlFor="wages">Wage Documentation</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="benefits" />
                      <label htmlFor="benefits">Benefit Claims Processing</label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Audit Notes</Label>
                  <Textarea placeholder="Enter audit findings and observations..." className="min-h-32" />
                </div>

                <div>
                  <Label>Supporting Documents</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Upload documents, contracts, and evidence</p>
                    <Button variant="outline" className="mt-2">
                      Choose Files
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Save Draft</Button>
                  <Button>Submit Audit</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Violation Record</CardTitle>
                <CardDescription>Record new compliance violation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Employer ID</Label>
                    <Input placeholder="Enter employer ID..." />
                  </div>
                  <div>
                    <Label>Violation Type</Label>
                    <Input placeholder="Late Payment / Under-reporting / etc." />
                  </div>
                  <div>
                    <Label>Severity Level</Label>
                    <Input placeholder="Low / Medium / High" />
                  </div>
                  <div>
                    <Label>Date Identified</Label>
                    <Input type="date" />
                  </div>
                </div>

                <div>
                  <Label>Violation Description</Label>
                  <Textarea placeholder="Detailed description of the violation..." />
                </div>

                <div>
                  <Label>Rules Breached</Label>
                  <Textarea placeholder="Specific regulations or rules violated..." />
                </div>

                <div>
                  <Label>Evidence</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Upload supporting evidence</p>
                    <Button variant="outline" className="mt-2">
                      Upload Files
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Save Draft</Button>
                  <Button>Create Violation</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Reports</CardTitle>
                <CardDescription>Generate comprehensive compliance reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Available Reports</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Employer Compliance Summary
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Violation Trends Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Audit Schedule Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Risk Assessment Report
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">Custom Report Generator</h3>
                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" placeholder="From" />
                        <Input type="date" placeholder="To" />
                      </div>
                      <Label>Filters</Label>
                      <Input placeholder="Industry, size, location..." />
                      <Button className="w-full">Generate Report</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployerComplianceManagement;
