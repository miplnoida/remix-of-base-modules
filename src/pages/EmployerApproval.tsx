
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Building2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  Calendar,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data for pending employer registrations
const pendingEmployers = [
  {
    id: 'EMP001',
    companyName: 'TechCorp Solutions Ltd',
    registrationNumber: 'RC123456',
    submissionDate: '2024-06-10',
    businessType: 'Technology',
    employeeCount: 150,
    contactPerson: 'John Smith',
    email: 'john.smith@techcorp.com',
    phone: '+1-555-0123',
    address: '123 Business District, City Center',
    status: 'pending',
    documents: [
      { name: 'Certificate of Incorporation', type: 'PDF', size: '2.3 MB', uploaded: true },
      { name: 'Tax Registration Certificate', type: 'PDF', size: '1.8 MB', uploaded: true },
      { name: 'Business License', type: 'PDF', size: '3.1 MB', uploaded: true },
      { name: 'Employee List', type: 'Excel', size: '4.5 MB', uploaded: true },
      { name: 'Financial Statements', type: 'PDF', size: '5.2 MB', uploaded: false }
    ]
  },
  {
    id: 'EMP002',
    companyName: 'Green Energy Co.',
    registrationNumber: 'RC789012',
    submissionDate: '2024-06-08',
    businessType: 'Energy',
    employeeCount: 85,
    contactPerson: 'Sarah Johnson',
    email: 'sarah.j@greenenergy.com',
    phone: '+1-555-0456',
    address: '456 Industrial Park, Green Valley',
    status: 'pending',
    documents: [
      { name: 'Certificate of Incorporation', type: 'PDF', size: '2.1 MB', uploaded: true },
      { name: 'Tax Registration Certificate', type: 'PDF', size: '1.9 MB', uploaded: true },
      { name: 'Business License', type: 'PDF', size: '2.8 MB', uploaded: true },
      { name: 'Employee List', type: 'Excel', size: '3.2 MB', uploaded: true },
      { name: 'Financial Statements', type: 'PDF', size: '4.8 MB', uploaded: true }
    ]
  }
];

const EmployerApproval = () => {
  const [selectedEmployer, setSelectedEmployer] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const { toast } = useToast();

  const handleApprove = (employerId: string) => {
    toast({
      title: "Employer Approved",
      description: `Employer ${employerId} has been approved successfully.`,
    });
    setShowDetails(false);
  };

  const handleReject = (employerId: string) => {
    toast({
      title: "Employer Rejected",
      description: `Employer ${employerId} has been rejected.`,
      variant: "destructive",
    });
    setShowDetails(false);
  };

  const openDetails = (employer: any) => {
    setSelectedEmployer(employer);
    setShowDetails(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending Review</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-8 w-8 text-green-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employer Approval</h1>
          <p className="text-gray-600">Review and approve pending employer registrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEmployers.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">+2 from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Employer Registrations</CardTitle>
          <CardDescription>
            Review employer documents and approve or reject registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer ID</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Business Type</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingEmployers.map((employer) => (
                <TableRow key={employer.id}>
                  <TableCell className="font-medium">{employer.id}</TableCell>
                  <TableCell>{employer.companyName}</TableCell>
                  <TableCell>{employer.businessType}</TableCell>
                  <TableCell>{employer.employeeCount}</TableCell>
                  <TableCell>{employer.submissionDate}</TableCell>
                  <TableCell>{getStatusBadge(employer.status)}</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openDetails(employer)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employer Registration Review</DialogTitle>
            <DialogDescription>
              Review all documents and information before approving or rejecting
            </DialogDescription>
          </DialogHeader>

          {selectedEmployer && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="approval">Approval</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Company Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Company Name:</span>
                        <span>{selectedEmployer.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Registration No:</span>
                        <span>{selectedEmployer.registrationNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Submission Date:</span>
                        <span>{selectedEmployer.submissionDate}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Contact Person:</span>
                        <span>{selectedEmployer.contactPerson}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Email:</span>
                        <span>{selectedEmployer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Phone:</span>
                        <span>{selectedEmployer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Address:</span>
                        <span>{selectedEmployer.address}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Required Documents</CardTitle>
                    <CardDescription>
                      Verify all required documents have been uploaded and are valid
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedEmployer.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-medium">{doc.name}</p>
                              <p className="text-sm text-gray-500">{doc.type} • {doc.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.uploaded ? (
                              <>
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Uploaded
                                </Badge>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                Missing
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approval" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Approval Decision</CardTitle>
                    <CardDescription>
                      Add notes and approve or reject this employer registration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="notes">Approval Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add any notes about this approval/rejection..."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => handleApprove(selectedEmployer.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Registration
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleReject(selectedEmployer.id)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Registration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployerApproval;
