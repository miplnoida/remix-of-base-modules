import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Calendar, Eye, CheckCircle, XCircle, Building2, Trash2 } from 'lucide-react';
import { employerData } from '@/data/employerData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EmployerRecord {
  regNo: string;
  name: string;
  tradeName: string;
  phone: string;
  fax: string;
  hqAddress1: string;
  hqAddress2: string;
  officeCode: string;
  activityType: string;
  industrialCode: string;
  mailingAddress1: string;
  mailingAddress2: string;
  villageCode: string;
  sectorCode: string;
  malesEmployed: number;
  femalesEmployed: number;
  arrears: number;
  legalAction: string;
  expectedMonthlyIncomeDate: string;
  dateOfRegistration: string;
  dateWagesFirstPaid: string;
  dateOfClosure: string;
  dateOfApplication: string;
  dateOfEntry: string;
  dateOfIssue: string;
  dateModified: string;
  dateVerified: string;
  enteredBy: string;
  modifiedBy: string;
  verifiedBy: string;
  ownershipCode: string;
  previousOwner: string;
  previousOwnerAddress1: string;
  previousOwnerAddress2: string;
  dateOfAcquisition: string;
  dateOfIncorporated: string;
  companyPayroll: string;
  makeModel: string;
  diskType: string;
  acquiredCode: string;
  estimatedArrearsSS: number;
  estimatedArrearsLV: number;
  estimatedArrearsPE: number;
  estimatedWagesSS: number;
  estimatedWagesLV: number;
  estimatedWagesPE: number;
  status: string;
  inspectorCode: string;
  parentRegNo: string;
  reRegistrationDate: string;
}

// Sample data with pending verification employers
const sampleEmployers: EmployerRecord[] = [
  {
    regNo: "PEND001",
    name: "PendingCorp Solutions",
    tradeName: "PendingCorp",
    phone: "(869) 465-4567",
    fax: "(869) 465-4568",
    hqAddress1: "789 Pending Street",
    hqAddress2: "Charlestown",
    officeCode: "CHT001",
    activityType: "IT Services",
    industrialCode: "Software Development",
    mailingAddress1: "P.O. Box 789",
    mailingAddress2: "Charlestown",
    villageCode: "Charlestown",
    sectorCode: "SEC003",
    malesEmployed: 12,
    femalesEmployed: 8,
    arrears: 0,
    legalAction: "None",
    expectedMonthlyIncomeDate: "2024-03-15",
    dateOfRegistration: "",
    dateWagesFirstPaid: "",
    dateOfClosure: "",
    dateOfApplication: "2024-02-01",
    dateOfEntry: "2024-02-05",
    dateOfIssue: "",
    dateModified: "",
    dateVerified: "",
    enteredBy: "System Admin",
    modifiedBy: "",
    verifiedBy: "",
    ownershipCode: "OWN003",
    previousOwner: "",
    previousOwnerAddress1: "",
    previousOwnerAddress2: "",
    dateOfAcquisition: "",
    dateOfIncorporated: "2024-01-01",
    companyPayroll: "No",
    makeModel: "",
    diskType: "",
    acquiredCode: "No",
    estimatedArrearsSS: 0,
    estimatedArrearsLV: 0,
    estimatedArrearsPE: 0,
    estimatedWagesSS: 8000,
    estimatedWagesLV: 6000,
    estimatedWagesPE: 12000,
    status: "Pending",
    inspectorCode: "03 Sarah Williams",
    parentRegNo: "",
    reRegistrationDate: ""
  },
  {
    regNo: "PEND002",
    name: "NewTech Innovations",
    tradeName: "NewTech",
    phone: "(869) 465-5678",
    fax: "(869) 465-5679",
    hqAddress1: "321 Innovation Drive",
    hqAddress2: "Sandy Point",
    officeCode: "SPT001",
    activityType: "Technology",
    industrialCode: "Tech Innovation",
    mailingAddress1: "P.O. Box 321",
    mailingAddress2: "Sandy Point",
    villageCode: "Sandy Point",
    sectorCode: "SEC004",
    malesEmployed: 18,
    femalesEmployed: 22,
    arrears: 0,
    legalAction: "None",
    expectedMonthlyIncomeDate: "2024-03-20",
    dateOfRegistration: "",
    dateWagesFirstPaid: "",
    dateOfClosure: "",
    dateOfApplication: "2024-02-10",
    dateOfEntry: "2024-02-15",
    dateOfIssue: "",
    dateModified: "",
    dateVerified: "",
    enteredBy: "Admin User",
    modifiedBy: "",
    verifiedBy: "",
    ownershipCode: "OWN004",
    previousOwner: "",
    previousOwnerAddress1: "",
    previousOwnerAddress2: "",
    dateOfAcquisition: "",
    dateOfIncorporated: "2024-01-15",
    companyPayroll: "Yes",
    makeModel: "",
    diskType: "",
    acquiredCode: "No",
    estimatedArrearsSS: 0,
    estimatedArrearsLV: 0,
    estimatedArrearsPE: 0,
    estimatedWagesSS: 15000,
    estimatedWagesLV: 12000,
    estimatedWagesPE: 20000,
    status: "Pending",
    inspectorCode: "04 Michael Davis",
    parentRegNo: "",
    reRegistrationDate: ""
  }
];

const PendingVerificationPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  // Get pending verification employers
  const pendingEmployers = sampleEmployers.filter(emp => emp.status === 'Pending');

  const filteredPending = pendingEmployers.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );
 
  // Pending Verification handlers
  const handleApprove = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setApproveDialogOpen(true);
  };

  const handleReject = (employer: EmployerRecord) => {
    setSelectedEmployer(employer);
    setRejectDialogOpen(true);
  };

  const handleViewDetails = (employer: EmployerRecord) => {
    navigate(`/employers-management/view/${employer.regNo}`);
  };

  const confirmApprove = () => {
    if (selectedEmployer) {
      console.log('Approving employer:', selectedEmployer);
      alert(`Successfully approved ${selectedEmployer.name}. Status changed to Active.`);
      setApproveDialogOpen(false);
      setSelectedEmployer(null);
    }
  };

  const confirmReject = () => {
    if (selectedEmployer && rejectionReason.trim()) {
      console.log('Rejecting employer:', selectedEmployer, 'Reason:', rejectionReason);
      alert(`Successfully rejected ${selectedEmployer.name}. Rejection email sent with reason: ${rejectionReason}`);
      setRejectDialogOpen(false);
      setSelectedEmployer(null);
      setRejectionReason('');
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/employers-management/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="h-6 w-px bg-border" />
            
            <div>
              <h1 className="text-xl lg:text-3xl font-bold text-foreground">Pending Verification</h1>
              <p className="text-sm lg:text-base text-muted-foreground hidden sm:block">Review and approve pending employer registrations</p>
            </div>
          </div>

          {/* Search and Filter Section */}
          <Card className="mt-6 shadow-sm">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Pending Verification ({filteredPending.length})</CardTitle>
                  <CardDescription>Review and approve pending employer registrations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search by employer name or registration number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="font-medium">Employer Name</TableHead>
                      <TableHead className="font-medium">Business Name</TableHead>
                      <TableHead className="font-medium">Date Submitted</TableHead>
                      <TableHead className="font-medium">Registration Number</TableHead>
                      <TableHead className="font-medium">Phone</TableHead>
                      <TableHead className="font-medium text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((employer) => (
                      <TableRow key={employer.regNo} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{employer.name}</TableCell>
                        <TableCell>{employer.tradeName}</TableCell>
                        <TableCell>{employer.dateOfApplication || 'N/A'}</TableCell>
                        <TableCell>{employer.regNo}</TableCell>
                        <TableCell>{employer.phone}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleApprove(employer)}
                                  className="h-8 px-3"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Approve Registration</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => handleReject(employer)}
                                  className="h-8 px-3"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reject Registration</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleViewDetails(employer)}
                                  className="h-8 px-3"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Registration Details</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Employer Registration</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve the registration for {selectedEmployer?.name}? 
                This will change their status to Active and send a confirmation notification.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmApprove}>
                Approve Registration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Employer Registration</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting the registration for {selectedEmployer?.name}. 
                This reason will be included in the rejection email.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmReject} 
                disabled={!rejectionReason.trim()}
                variant="destructive"
              >
                Reject Registration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default PendingVerificationPage;