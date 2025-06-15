import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import LegalCaseForm from '@/components/legal/LegalCaseForm';
import LegalCaseView from '@/components/legal/LegalCaseView';
import { 
  ArrowLeft, 
  Gavel, 
  FileText, 
  Calendar, 
  DollarSign, 
  Search, 
  Filter, 
  Download,
  Eye,
  Plus,
  CheckCircle,
  Scale
} from 'lucide-react';

const LegalProceedings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCaseView, setShowCaseView] = useState(false);

  const legalCases = [
    {
      id: 'LC-2024-001',
      employerName: 'ABC Manufacturing Ltd',
      employerId: 'EMP-001',
      caseType: 'Civil',
      violationType: 'Late Payment',
      filingDate: '2024-01-15',
      status: 'Under Trial',
      jurisdiction: 'Labor Court District 1',
      assignedOfficer: 'Sarah Johnson',
      penaltyAmount: '$15,000',
      nextHearing: '2024-02-10',
      paymentStatus: 'Unpaid',
      violationDescription: 'Non-payment of employee contributions for period Oct-Dec 2023.',
      evidenceSummary: 'Supporting documents include payroll records and bank statements.'
    },
    {
      id: 'LC-2024-002',
      employerName: 'XYZ Services Corp',
      employerId: 'EMP-002',
      caseType: 'Administrative',
      violationType: 'Under-reporting',
      filingDate: '2024-01-08',
      status: 'Judgment Passed',
      jurisdiction: 'Administrative Tribunal',
      assignedOfficer: 'Michael Chen',
      penaltyAmount: '$8,500',
      nextHearing: 'N/A',
      paymentStatus: 'Partial',
      violationDescription: 'Systematic under-reporting of employee wages.',
      evidenceSummary: 'Audit findings and wage comparison analysis.'
    },
    {
      id: 'LC-2024-003',
      employerName: 'Tech Solutions Inc',
      employerId: 'EMP-003',
      caseType: 'Criminal',
      violationType: 'Fraud',
      filingDate: '2023-12-20',
      status: 'Enforced',
      jurisdiction: 'Criminal Court',
      assignedOfficer: 'Lisa Wang',
      penaltyAmount: '$25,000',
      nextHearing: 'N/A',
      paymentStatus: 'Paid',
      violationDescription: 'Fraudulent reporting of employee data.',
      evidenceSummary: 'Digital forensics and document analysis.'
    }
  ];

  const hearingSchedule = [
    {
      caseId: 'LC-2024-001',
      date: '2024-02-10',
      time: '10:00 AM',
      type: 'Main Hearing',
      judge: 'Hon. Justice Smith',
      location: 'Courtroom 3',
      status: 'Scheduled'
    },
    {
      caseId: 'LC-2024-004',
      date: '2024-02-12',
      time: '2:00 PM',
      type: 'Preliminary',
      judge: 'Magistrate Jones',
      location: 'Tribunal Hall A',
      status: 'Scheduled'
    }
  ];

  const caseStats = [
    { label: 'Total Cases', value: '156', status: 'info', icon: Scale },
    { label: 'Pending Hearings', value: '23', status: 'warning', icon: Calendar },
    { label: 'Resolved Cases', value: '89', status: 'success', icon: CheckCircle },
    { label: 'Recovery Rate', value: '78%', status: 'info', icon: DollarSign },
  ];

  const handleCreateCase = (formData: any) => {
    console.log('Creating new legal case:', formData);
    // Here you would typically make an API call to create the case
    setShowCreateForm(false);
    // Optionally refresh the cases list
  };

  const handleViewCase = (caseData: any) => {
    setSelectedCase(caseData);
    setShowCaseView(true);
  };

  const handleEditCase = () => {
    setShowCaseView(false);
    setShowCreateForm(true);
  };

  // Show Create Form
  if (showCreateForm) {
    return (
      <LegalCaseForm
        onSubmit={handleCreateCase}
        onCancel={() => setShowCreateForm(false)}
        initialData={selectedCase}
      />
    );
  }

  // Show Case View
  if (showCaseView && selectedCase) {
    return (
      <LegalCaseView
        caseData={selectedCase}
        onBack={() => setShowCaseView(false)}
        onEdit={handleEditCase}
      />
    );
  }

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
                <span className="text-gray-900 font-medium">Legal Proceedings</span>
              </nav>
            </div>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Legal Case
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Legal Proceedings</h1>
          <p className="text-gray-600">Manage legal cases, court proceedings, and enforcement actions</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="cases">Case Management</TabsTrigger>
            <TabsTrigger value="hearings">Hearings</TabsTrigger>
            <TabsTrigger value="enforcement">Enforcement</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {caseStats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${
                      stat.status === 'danger' ? 'text-red-500' :
                      stat.status === 'success' ? 'text-green-500' :
                      stat.status === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-blue-500" />
                    Recent Legal Cases
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {legalCases.slice(0, 3).map((legalCase, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{legalCase.id}</h4>
                          <Badge variant={
                            legalCase.status === 'Under Trial' ? 'default' :
                            legalCase.status === 'Judgment Passed' ? 'secondary' : 'destructive'
                          }>
                            {legalCase.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{legalCase.employerName}</p>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{legalCase.violationType}</span>
                          <span>{legalCase.penaltyAmount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    Upcoming Hearings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {hearingSchedule.map((hearing, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{hearing.caseId}</h4>
                          <Badge variant="outline">{hearing.type}</Badge>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{hearing.date} at {hearing.time}</span>
                          <span>{hearing.judge}</span>
                        </div>
                        <p className="text-xs text-gray-500">{hearing.location}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cases" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Legal Case Management</CardTitle>
                    <CardDescription>View and manage all legal proceedings</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search cases..."
                        className="pl-8 w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Violation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Officer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legalCases.map((legalCase) => (
                      <TableRow key={legalCase.id}>
                        <TableCell className="font-medium">{legalCase.id}</TableCell>
                        <TableCell>{legalCase.employerName}</TableCell>
                        <TableCell>{legalCase.caseType}</TableCell>
                        <TableCell>{legalCase.violationType}</TableCell>
                        <TableCell>
                          <Badge variant={
                            legalCase.status === 'Under Trial' ? 'default' :
                            legalCase.status === 'Judgment Passed' ? 'secondary' : 'destructive'
                          }>
                            {legalCase.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{legalCase.penaltyAmount}</TableCell>
                        <TableCell>{legalCase.assignedOfficer}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewCase(legalCase)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hearings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hearing Schedule Management</CardTitle>
                <CardDescription>Track and manage court hearings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Judge</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hearingSchedule.map((hearing, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{hearing.caseId}</TableCell>
                        <TableCell>{hearing.date}</TableCell>
                        <TableCell>{hearing.time}</TableCell>
                        <TableCell>{hearing.type}</TableCell>
                        <TableCell>{hearing.judge}</TableCell>
                        <TableCell>{hearing.location}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{hearing.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enforcement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Penalty Enforcement Tracking</CardTitle>
                <CardDescription>Monitor payment collection and enforcement actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">$125,000</div>
                      <p className="text-sm text-gray-600">Total Outstanding</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">$89,500</div>
                      <p className="text-sm text-gray-600">Collected This Month</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">78%</div>
                      <p className="text-sm text-gray-600">Collection Rate</p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Case ID</TableHead>
                        <TableHead>Employer</TableHead>
                        <TableHead>Penalty Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Enforcement Method</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {legalCases.map((legalCase) => (
                        <TableRow key={legalCase.id}>
                          <TableCell className="font-medium">{legalCase.id}</TableCell>
                          <TableCell>{legalCase.employerName}</TableCell>
                          <TableCell>{legalCase.penaltyAmount}</TableCell>
                          <TableCell>
                            <Badge variant={
                              legalCase.paymentStatus === 'Paid' ? 'default' :
                              legalCase.paymentStatus === 'Partial' ? 'secondary' : 'destructive'
                            }>
                              {legalCase.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {legalCase.paymentStatus === 'Unpaid' ? 'Bank Garnishment' : 
                             legalCase.paymentStatus === 'Partial' ? 'Asset Seizure' : 'Voluntary'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Legal Reports & Analytics</CardTitle>
                <CardDescription>Generate comprehensive legal proceeding reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Available Reports</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Legal Case Aging Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Win/Loss Analysis
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Recovery Rate Report
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Court Calendar Report
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium">Custom Report Generator</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" placeholder="From" />
                        <Input type="date" placeholder="To" />
                      </div>
                      <label className="text-sm font-medium">Case Type</label>
                      <Input placeholder="Civil, Criminal, Administrative" />
                      <label className="text-sm font-medium">Status Filter</label>
                      <Input placeholder="Under Trial, Judgment Passed, etc." />
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

export default LegalProceedings;
