import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  FileText,
  Clock,
  Search,
  Filter,
  Eye,
  Edit,
  Phone,
  Mail
} from 'lucide-react';

// Mock employer data
const mockEmployers = [
  {
    id: 'EMP001',
    name: 'Government of St. Kitts & Nevis',
    registrationNumber: 'GOV001',
    status: 'ACTIVE',
    complianceStatus: 'COMPLIANT',
    lastC3Submission: '2024-01-15',
    outstandingAmount: 0,
    contactPerson: 'HR Manager',
    phone: '(869) 465-2521',
    email: 'hr@gov.kn',
    employeeCount: 2500
  },
  {
    id: 'EMP002',
    name: 'Royal Bank of Canada',
    registrationNumber: 'RBC001',
    status: 'ACTIVE',
    complianceStatus: 'ARREARS',
    lastC3Submission: '2023-12-20',
    outstandingAmount: 15750.00,
    contactPerson: 'Payroll Department',
    phone: '(869) 465-2359',
    email: 'payroll@rbc.com',
    employeeCount: 85
  },
  {
    id: 'EMP003',
    name: 'Four Seasons Resort',
    registrationNumber: 'FSR001',
    status: 'ACTIVE',
    complianceStatus: 'NON_COMPLIANT',
    lastC3Submission: '2023-11-30',
    outstandingAmount: 32400.00,
    contactPerson: 'John Smith',
    phone: '(869) 469-1111',
    email: 'hr@fourseasons.com',
    employeeCount: 450
  }
];

// Mock employment verification requests
const mockVerificationRequests = [
  {
    id: 'VER001',
    claimId: 'CLM003',
    employerId: 'EMP003',
    employerName: 'Four Seasons Resort',
    contributorName: 'Robert Johnson',
    requestDate: '2024-01-18',
    status: 'PENDING',
    verificationType: 'EMPLOYMENT_INJURY',
    details: 'Verify employment status and incident details for back injury claim'
  },
  {
    id: 'VER002',
    claimId: 'CLM001',
    employerId: 'EMP001',
    employerName: 'Government of St. Kitts & Nevis',
    contributorName: 'John Contributor',
    requestDate: '2024-01-16',
    status: 'COMPLETED',
    verificationType: 'SICKNESS',
    details: 'Confirm last day worked and expected return date',
    response: 'Employment confirmed. Last day worked: 2024-01-10. Expected return: 2024-01-25.'
  }
];

export const EmployerHub: React.FC = () => {
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationNotes, setVerificationNotes] = useState('');

  const handleSendVerificationRequest = () => {
    console.log('Sending verification request reminder...');
    alert('Verification request reminder sent to employer');
  };

  const handleRecordResponse = () => {
    if (!verificationNotes.trim()) {
      alert('Please enter the employer response or notes');
      return;
    }
    console.log('Recording employer response...', verificationNotes);
    alert('Employer response recorded successfully');
    setVerificationNotes('');
  };

  const getComplianceStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'default';
      case 'ARREARS':
        return 'secondary';
      case 'NON_COMPLIANT':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getVerificationStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'OVERDUE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredEmployers = mockEmployers.filter(employer => {
    const matchesSearch = employer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employer.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || employer.complianceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employer Hub</h1>
          <p className="text-muted-foreground">Manage employer verification, compliance, and incident confirmations</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          New Verification Request
        </Button>
      </div>

      <Tabs defaultValue="verification" className="w-full">
        <TabsList>
          <TabsTrigger value="verification">Employment Verification</TabsTrigger>
          <TabsTrigger value="incident">Incident Confirmation</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Monitoring</TabsTrigger>
          <TabsTrigger value="directory">Employer Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employment Verification Requests</CardTitle>
              <CardDescription>Verify employment details for benefit claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockVerificationRequests.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{request.id} - {request.contributorName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {request.employerName} • Claim: {request.claimId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Type: {request.verificationType.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getVerificationStatusBadgeVariant(request.status)}>
                          {request.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-muted/50 rounded">
                      <p className="text-sm">{request.details}</p>
                    </div>

                    {request.response && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm font-medium text-green-900">Employer Response:</p>
                        <p className="text-sm text-green-700">{request.response}</p>
                      </div>
                    )}

                    <div className="mt-3 flex space-x-2">
                      {request.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={handleSendVerificationRequest}>
                            <Mail className="h-4 w-4 mr-1" />
                            Send Reminder
                          </Button>
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-1" />
                            Call Employer
                          </Button>
                        </>
                      )}
                      {request.status === 'COMPLETED' && (
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-1" />
                          View Response
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Record Employer Response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Verification Request</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pending request" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockVerificationRequests
                      .filter(req => req.status === 'PENDING')
                      .map(req => (
                        <SelectItem key={req.id} value={req.id}>
                          {req.id} - {req.contributorName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="verificationNotes">Employer Response/Notes</Label>
                <Textarea 
                  id="verificationNotes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Record the employer's response and any additional notes..."
                  rows={4}
                />
              </div>

              <Button onClick={handleRecordResponse}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Response
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incident" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incident Confirmation Requests</CardTitle>
              <CardDescription>Confirm workplace incidents for employment injury claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <h3 className="font-medium">INC001 - Robert Johnson</h3>
                        <p className="text-sm text-muted-foreground">
                          Four Seasons Resort • Claim: CLM003
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Incident Date: 2024-01-08 • Location: Kitchen Area
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">PENDING</Badge>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm font-medium text-orange-900">Incident Description:</p>
                    <p className="text-sm text-orange-700">
                      Employee injured lower back while lifting heavy boxes in kitchen storage area. 
                      Seeking confirmation of incident details and safety report.
                    </p>
                  </div>

                  <div className="mt-3 flex space-x-2">
                    <Button size="sm">
                      <Mail className="h-4 w-4 mr-1" />
                      Request Incident Report
                    </Button>
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4 mr-1" />
                      Contact Safety Officer
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Employer Compliance Status</CardTitle>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search employers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="COMPLIANT">Compliant</SelectItem>
                      <SelectItem value="ARREARS">In Arrears</SelectItem>
                      <SelectItem value="NON_COMPLIANT">Non-Compliant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredEmployers.map((employer) => (
                  <div key={employer.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{employer.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Reg: {employer.registrationNumber} • Employees: {employer.employeeCount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last C3: {new Date(employer.lastC3Submission).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getComplianceStatusBadgeVariant(employer.complianceStatus)}>
                          {employer.complianceStatus.replace(/_/g, ' ')}
                        </Badge>
                        {employer.outstandingAmount > 0 && (
                          <Badge variant="destructive">
                            ${employer.outstandingAmount.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {employer.outstandingAmount > 0 && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-900">
                          Outstanding Amount: ${employer.outstandingAmount.toLocaleString()}
                        </p>
                        <div className="mt-2 flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Send Demand
                          </Button>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            View Arrears
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employer Directory</CardTitle>
              <CardDescription>Complete list of registered employers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockEmployers.map((employer) => (
                  <div 
                    key={employer.id}
                    className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedEmployer?.id === employer.id ? 'bg-muted border-primary' : ''
                    }`}
                    onClick={() => setSelectedEmployer(employer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Building className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{employer.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {employer.contactPerson} • {employer.phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {employer.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {employer.employeeCount} employees
                        </Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};