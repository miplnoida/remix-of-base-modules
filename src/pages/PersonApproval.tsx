
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  Home,
  Building2,
  Users,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock data for pending person registrations
const pendingPersons = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    socialSecurityNo: 'SS001234567',
    dateOfBirth: '1985-03-15',
    gender: 'Male',
    nationality: 'St. Kitts & Nevis',
    email: 'john.doe@email.com',
    phone: '(869) 465-1234',
    address: '123 Main Street, Basseterre',
    occupation: 'Software Developer',
    employer: 'Tech Solutions Ltd.',
    maritalStatus: 'Married',
    emergencyContact: 'Jane Doe - Spouse',
    submittedDate: '2024-01-15',
    status: 'pending',
    documents: ['Birth Certificate', 'Passport', 'Work Permit', 'Marriage Certificate'],
    dependants: [
      { name: 'Sarah Doe', relationship: 'Daughter', dateOfBirth: '2010-08-20' }
    ]
  },
  {
    id: 2,
    firstName: 'Maria',
    lastName: 'Rodriguez',
    socialSecurityNo: 'SS001234568',
    dateOfBirth: '1990-07-22',
    gender: 'Female',
    nationality: 'Dominican Republic',
    email: 'maria.rodriguez@email.com',
    phone: '(869) 465-5678',
    address: '456 Church Street, Charlestown',
    occupation: 'Nurse',
    employer: 'General Hospital',
    maritalStatus: 'Single',
    emergencyContact: 'Carlos Rodriguez - Brother',
    submittedDate: '2024-01-18',
    status: 'pending',
    documents: ['Birth Certificate', 'Passport', 'Work Permit', 'Medical License'],
    dependants: []
  },
  {
    id: 3,
    firstName: 'David',
    lastName: 'Williams',
    socialSecurityNo: 'SS001234569',
    dateOfBirth: '1988-11-10',
    gender: 'Male',
    nationality: 'St. Kitts & Nevis',
    email: 'david.williams@email.com',
    phone: '(869) 465-9012',
    address: '789 Victoria Road, Sandy Point',
    occupation: 'Teacher',
    employer: 'Sandy Point High School',
    maritalStatus: 'Divorced',
    emergencyContact: 'Patricia Williams - Mother',
    submittedDate: '2024-01-20',
    status: 'pending',
    documents: ['Birth Certificate', 'Passport', 'Teaching Certificate'],
    dependants: [
      { name: 'Michael Williams', relationship: 'Son', dateOfBirth: '2012-04-15' },
      { name: 'Lisa Williams', relationship: 'Daughter', dateOfBirth: '2014-09-30' }
    ]
  }
];

const PersonApproval = () => {
  const navigate = useNavigate();
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const { toast } = useToast();

  const handleApprove = (personId: number) => {
    toast({
      title: "Person Approved",
      description: "The insured person registration has been approved successfully.",
    });
    console.log(`Approved person with ID: ${personId}`, { notes: approvalNotes });
    setApprovalNotes('');
  };

  const handleReject = (personId: number) => {
    if (!approvalNotes.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Person Rejected",
      description: "The insured person registration has been rejected.",
      variant: "destructive"
    });
    console.log(`Rejected person with ID: ${personId}`, { notes: approvalNotes });
    setApprovalNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
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
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Person Approval</h1>
            <p className="text-gray-600">Review and approve pending insured person registrations</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Main Menu
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-gray-700 transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-gray-900">Person Approval</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPersons.filter(p => p.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Approved applications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Person Registrations</CardTitle>
          <CardDescription>
            Review and approve or reject insured person registration applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Social Security No.</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead>Employer</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingPersons.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="font-medium">
                    {person.firstName} {person.lastName}
                  </TableCell>
                  <TableCell>{person.socialSecurityNo}</TableCell>
                  <TableCell>{new Date(person.dateOfBirth).toLocaleDateString()}</TableCell>
                  <TableCell>{person.occupation}</TableCell>
                  <TableCell>{person.employer}</TableCell>
                  <TableCell>{new Date(person.submittedDate).toLocaleDateString()}</TableCell>
                  <TableCell>{getStatusBadge(person.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPerson(person)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Person Registration Details</DialogTitle>
                            <DialogDescription>
                              Review the complete registration information for {selectedPerson?.firstName} {selectedPerson?.lastName}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedPerson && (
                            <div className="space-y-6">
                              {/* Personal Information */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Personal Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Full Name</Label>
                                    <p className="text-sm">{selectedPerson.firstName} {selectedPerson.lastName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Social Security No.</Label>
                                    <p className="text-sm">{selectedPerson.socialSecurityNo}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                                    <p className="text-sm">{new Date(selectedPerson.dateOfBirth).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Gender</Label>
                                    <p className="text-sm">{selectedPerson.gender}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Nationality</Label>
                                    <p className="text-sm">{selectedPerson.nationality}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Marital Status</Label>
                                    <p className="text-sm">{selectedPerson.maritalStatus}</p>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Contact Information */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <Phone className="h-5 w-5" />
                                    Contact Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Email</Label>
                                    <p className="text-sm">{selectedPerson.email}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Phone</Label>
                                    <p className="text-sm">{selectedPerson.phone}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-sm font-medium text-gray-500">Address</Label>
                                    <p className="text-sm">{selectedPerson.address}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-sm font-medium text-gray-500">Emergency Contact</Label>
                                    <p className="text-sm">{selectedPerson.emergencyContact}</p>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Employment Information */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Employment Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Occupation</Label>
                                    <p className="text-sm">{selectedPerson.occupation}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-gray-500">Employer</Label>
                                    <p className="text-sm">{selectedPerson.employer}</p>
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Dependants */}
                              {selectedPerson.dependants.length > 0 && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                      <Users className="h-5 w-5" />
                                      Dependants
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Name</TableHead>
                                          <TableHead>Relationship</TableHead>
                                          <TableHead>Date of Birth</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedPerson.dependants.map((dependant: any, index: number) => (
                                          <TableRow key={index}>
                                            <TableCell>{dependant.name}</TableCell>
                                            <TableCell>{dependant.relationship}</TableCell>
                                            <TableCell>{new Date(dependant.dateOfBirth).toLocaleDateString()}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Documents */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Submitted Documents
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-2 gap-2">
                                    {selectedPerson.documents.map((doc: string, index: number) => (
                                      <Badge key={index} variant="outline" className="justify-start">
                                        <FileText className="h-3 w-3 mr-1" />
                                        {doc}
                                      </Badge>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Approval Actions */}
                              <Card>
                                <CardHeader>
                                  <CardTitle>Approval Decision</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div>
                                    <Label htmlFor="notes">Notes/Comments</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Add any notes or comments regarding this application..."
                                      value={approvalNotes}
                                      onChange={(e) => setApprovalNotes(e.target.value)}
                                      rows={3}
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <Button 
                                      onClick={() => handleApprove(selectedPerson.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Approve
                                    </Button>
                                    <Button 
                                      variant="destructive"
                                      onClick={() => handleReject(selectedPerson.id)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonApproval;
