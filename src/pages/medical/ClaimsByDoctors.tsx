import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  FileText,
  Activity,
  Baby,
  Stethoscope,
  AlertTriangle,
  Filter,
  Eye,
  Calendar,
  User,
  Building2,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";
import { format } from "date-fns";

// Types
interface DoctorClaim {
  id: string;
  claimNumber: string;
  claimType: 'Sickness' | 'Employment Injury' | 'Maternity';
  doctorId: string;
  doctorName: string;
  doctorRegistrationNo: string;
  insuredPersonSSN: string;
  insuredPersonName: string;
  employerName: string;
  diagnosisCode: string;
  diagnosisDescription: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Under Investigation' | 'Completed';
  submittedDate: string;
  submittedVia: 'Web Portal' | 'Tablet App';
  medicalCertificateUrl?: string;
  notes?: string;
  reviewedBy?: string;
  reviewedDate?: string;
  amountAwarded?: number;
}

// Mock data
const mockClaims: DoctorClaim[] = [
  {
    id: 'claim-001',
    claimNumber: 'SIC-2025-00234',
    claimType: 'Sickness',
    doctorId: 'doc-reg-001',
    doctorName: 'Dr. Patricia Morgan',
    doctorRegistrationNo: 'MED-2012-3456',
    insuredPersonSSN: '123-45-6789',
    insuredPersonName: 'John A. Smith',
    employerName: 'Caribbean Construction Ltd',
    diagnosisCode: 'J06.9',
    diagnosisDescription: 'Acute upper respiratory infection',
    startDate: '2025-01-15',
    endDate: '2025-01-22',
    daysRequested: 7,
    status: 'Approved',
    submittedDate: '2025-01-15T10:30:00Z',
    submittedVia: 'Tablet App',
    reviewedBy: 'Sarah Johnson',
    reviewedDate: '2025-01-16T09:00:00Z',
    amountAwarded: 1250.00
  },
  {
    id: 'claim-002',
    claimNumber: 'INJ-2025-00089',
    claimType: 'Employment Injury',
    doctorId: 'doc-reg-002',
    doctorName: 'Dr. James Martinez',
    doctorRegistrationNo: 'MED-2008-1122',
    insuredPersonSSN: '234-56-7890',
    insuredPersonName: 'Maria L. Williams',
    employerName: 'Island Manufacturing Co.',
    diagnosisCode: 'S62.5',
    diagnosisDescription: 'Fracture of thumb',
    startDate: '2025-01-10',
    endDate: '2025-02-10',
    daysRequested: 31,
    status: 'Under Investigation',
    submittedDate: '2025-01-10T14:45:00Z',
    submittedVia: 'Web Portal',
    notes: 'Workplace accident report pending verification'
  },
  {
    id: 'claim-003',
    claimNumber: 'MAT-2025-00045',
    claimType: 'Maternity',
    doctorId: 'doc-reg-003',
    doctorName: 'Dr. Sarah Williams',
    doctorRegistrationNo: 'MED-2016-4455',
    insuredPersonSSN: '345-67-8901',
    insuredPersonName: 'Jennifer K. Brown',
    employerName: 'First National Bank SKN',
    diagnosisCode: 'O80',
    diagnosisDescription: 'Normal delivery',
    startDate: '2025-01-20',
    endDate: '2025-04-20',
    daysRequested: 90,
    status: 'Approved',
    submittedDate: '2025-01-18T11:20:00Z',
    submittedVia: 'Web Portal',
    reviewedBy: 'Mary Brown',
    reviewedDate: '2025-01-19T10:30:00Z',
    amountAwarded: 8500.00
  },
  {
    id: 'claim-004',
    claimNumber: 'SIC-2025-00256',
    claimType: 'Sickness',
    doctorId: 'doc-reg-004',
    doctorName: 'Dr. David Brown',
    doctorRegistrationNo: 'MED-2005-6677',
    insuredPersonSSN: '456-78-9012',
    insuredPersonName: 'Robert T. Johnson',
    employerName: 'Tourism Services Ltd',
    diagnosisCode: 'K29.7',
    diagnosisDescription: 'Gastritis, unspecified',
    startDate: '2025-01-22',
    endDate: '2025-01-25',
    daysRequested: 3,
    status: 'Pending Review',
    submittedDate: '2025-01-22T08:15:00Z',
    submittedVia: 'Tablet App'
  },
  {
    id: 'claim-005',
    claimNumber: 'SIC-2025-00198',
    claimType: 'Sickness',
    doctorId: 'doc-reg-001',
    doctorName: 'Dr. Patricia Morgan',
    doctorRegistrationNo: 'MED-2012-3456',
    insuredPersonSSN: '567-89-0123',
    insuredPersonName: 'Angela M. Davis',
    employerName: 'St Kitts Electricity Company',
    diagnosisCode: 'M54.5',
    diagnosisDescription: 'Low back pain',
    startDate: '2025-01-08',
    endDate: '2025-01-15',
    daysRequested: 7,
    status: 'Completed',
    submittedDate: '2025-01-08T16:00:00Z',
    submittedVia: 'Web Portal',
    reviewedBy: 'James Williams',
    reviewedDate: '2025-01-09T11:00:00Z',
    amountAwarded: 1400.00
  },
  {
    id: 'claim-006',
    claimNumber: 'INJ-2025-00092',
    claimType: 'Employment Injury',
    doctorId: 'doc-reg-002',
    doctorName: 'Dr. James Martinez',
    doctorRegistrationNo: 'MED-2008-1122',
    insuredPersonSSN: '678-90-1234',
    insuredPersonName: 'Carlos E. Rodriguez',
    employerName: 'Port Zante Operations',
    diagnosisCode: 'S93.4',
    diagnosisDescription: 'Sprain of ankle',
    startDate: '2025-01-19',
    endDate: '2025-01-26',
    daysRequested: 7,
    status: 'Rejected',
    submittedDate: '2025-01-19T09:30:00Z',
    submittedVia: 'Tablet App',
    reviewedBy: 'Sarah Johnson',
    reviewedDate: '2025-01-20T14:00:00Z',
    notes: 'Injury occurred outside of work hours'
  },
  {
    id: 'claim-007',
    claimNumber: 'SIC-2025-00267',
    claimType: 'Sickness',
    doctorId: 'doc-reg-004',
    doctorName: 'Dr. David Brown',
    doctorRegistrationNo: 'MED-2005-6677',
    insuredPersonSSN: '789-01-2345',
    insuredPersonName: 'Patricia A. Thompson',
    employerName: 'Caribbean Cable Communications',
    diagnosisCode: 'J11.1',
    diagnosisDescription: 'Influenza with respiratory manifestations',
    startDate: '2025-01-21',
    endDate: '2025-01-28',
    daysRequested: 7,
    status: 'Pending Review',
    submittedDate: '2025-01-21T13:45:00Z',
    submittedVia: 'Tablet App'
  }
];

const getClaimTypeConfig = (type: string) => {
  const configs: Record<string, { icon: any; color: string }> = {
    'Sickness': { icon: Stethoscope, color: 'bg-blue-500' },
    'Employment Injury': { icon: AlertTriangle, color: 'bg-amber-500' },
    'Maternity': { icon: Baby, color: 'bg-pink-500' },
  };
  return configs[type] || { icon: FileText, color: 'bg-gray-500' };
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: string; icon: any }> = {
    'Pending Review': { color: 'bg-yellow-500', icon: Clock },
    'Approved': { color: 'bg-green-500', icon: CheckCircle },
    'Rejected': { color: 'bg-red-500', icon: XCircle },
    'Under Investigation': { color: 'bg-purple-500', icon: Activity },
    'Completed': { color: 'bg-teal-500', icon: CheckCircle },
  };
  return configs[status] || { color: 'bg-gray-500', icon: Clock };
};

export default function ClaimsByDoctors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [claimTypeFilter, setClaimTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<DoctorClaim | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Simulated query
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['doctor-claims', claimTypeFilter, statusFilter, searchTerm],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      let filtered = [...mockClaims];
      
      if (claimTypeFilter !== 'all') {
        filtered = filtered.filter(c => c.claimType === claimTypeFilter);
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        filtered = filtered.filter(c => 
          c.claimNumber.toLowerCase().includes(search) ||
          c.doctorName.toLowerCase().includes(search) ||
          c.insuredPersonName.toLowerCase().includes(search) ||
          c.insuredPersonSSN.includes(search)
        );
      }
      
      return filtered.sort((a, b) => 
        new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
      );
    },
  });

  const stats = {
    total: mockClaims.length,
    pending: mockClaims.filter(c => c.status === 'Pending Review').length,
    approved: mockClaims.filter(c => c.status === 'Approved').length,
    rejected: mockClaims.filter(c => c.status === 'Rejected').length,
    underInvestigation: mockClaims.filter(c => c.status === 'Under Investigation').length,
    sickness: mockClaims.filter(c => c.claimType === 'Sickness').length,
    injury: mockClaims.filter(c => c.claimType === 'Employment Injury').length,
    maternity: mockClaims.filter(c => c.claimType === 'Maternity').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Claims by Doctors</h1>
        <p className="text-muted-foreground mt-1">
          View and manage benefit claims initiated by registered doctors
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-xs text-yellow-500">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-500">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-500">{stats.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-500">Rejected</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats.rejected}</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-purple-500">Investigation</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-500">{stats.underInvestigation}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-500">Sickness</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-500">{stats.sickness}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-500">Injury</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-500">{stats.injury}</p>
          </CardContent>
        </Card>
        <Card className="bg-pink-500/10 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-pink-500" />
              <span className="text-xs text-pink-500">Maternity</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-pink-500">{stats.maternity}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by claim number, doctor, patient name or SSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={claimTypeFilter} onValueChange={setClaimTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Claim Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Sickness">Sickness</SelectItem>
                <SelectItem value="Employment Injury">Employment Injury</SelectItem>
                <SelectItem value="Maternity">Maternity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Doctor-Initiated Claims ({claims.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Employer</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted Via</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading claims...
                    </TableCell>
                  </TableRow>
                ) : claims.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No claims found
                    </TableCell>
                  </TableRow>
                ) : (
                  claims.map((claim) => {
                    const typeConfig = getClaimTypeConfig(claim.claimType);
                    const statusConfig = getStatusConfig(claim.status);
                    const TypeIcon = typeConfig.icon;
                    
                    return (
                      <TableRow key={claim.id}>
                        <TableCell className="font-mono text-sm">{claim.claimNumber}</TableCell>
                        <TableCell>
                          <Badge className={`${typeConfig.color} text-white gap-1`}>
                            <TypeIcon className="h-3 w-3" />
                            {claim.claimType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{claim.doctorName}</p>
                            <p className="text-xs text-muted-foreground">{claim.doctorRegistrationNo}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{claim.insuredPersonName}</p>
                            <p className="text-xs text-muted-foreground">{claim.insuredPersonSSN}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{claim.employerName}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(claim.startDate), 'MMM d')} - {format(new Date(claim.endDate), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-center">{claim.daysRequested}</TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig.color} text-white`}>
                            {claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {claim.submittedVia}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Claim Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Claim Details</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Claim Details</TabsTrigger>
                <TabsTrigger value="medical">Medical Info</TabsTrigger>
                <TabsTrigger value="history">Review History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Claim Number</p>
                    <p className="font-mono font-medium">{selectedClaim.claimNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`${getStatusConfig(selectedClaim.status).color} text-white mt-1`}>
                      {selectedClaim.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Claim Type</p>
                    <Badge className={`${getClaimTypeConfig(selectedClaim.claimType).color} text-white mt-1`}>
                      {selectedClaim.claimType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted Via</p>
                    <p className="font-medium">{selectedClaim.submittedVia}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Patient Name</p>
                      <p className="font-medium">{selectedClaim.insuredPersonName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SSN</p>
                      <p className="font-mono">{selectedClaim.insuredPersonSSN}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Employer</p>
                      <p className="font-medium">{selectedClaim.employerName}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Referring Doctor
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Doctor Name</p>
                      <p className="font-medium">{selectedClaim.doctorName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Registration No.</p>
                      <p className="font-mono">{selectedClaim.doctorRegistrationNo}</p>
                    </div>
                  </div>
                </div>

                {selectedClaim.amountAwarded && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Payment Information</h4>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount Awarded</p>
                      <p className="text-2xl font-bold text-green-600">
                        XCD ${selectedClaim.amountAwarded.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="medical" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Diagnosis Code</p>
                    <p className="font-mono font-medium">{selectedClaim.diagnosisCode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Diagnosis Description</p>
                    <p className="font-medium">{selectedClaim.diagnosisDescription}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Leave Period
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Start Date</p>
                      <p className="font-medium">{format(new Date(selectedClaim.startDate), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">End Date</p>
                      <p className="font-medium">{format(new Date(selectedClaim.endDate), 'MMMM d, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Days Requested</p>
                      <p className="text-2xl font-bold">{selectedClaim.daysRequested}</p>
                    </div>
                  </div>
                </div>

                {selectedClaim.notes && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {selectedClaim.notes}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Claim Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted by {selectedClaim.doctorName} via {selectedClaim.submittedVia}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(selectedClaim.submittedDate), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  {selectedClaim.reviewedBy && (
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className={`h-8 w-8 rounded-full ${getStatusConfig(selectedClaim.status).color}/10 flex items-center justify-center`}>
                        <CheckCircle className={`h-4 w-4 ${selectedClaim.status === 'Approved' ? 'text-green-500' : selectedClaim.status === 'Rejected' ? 'text-red-500' : 'text-purple-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">Claim {selectedClaim.status}</p>
                        <p className="text-xs text-muted-foreground">
                          Reviewed by {selectedClaim.reviewedBy}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(selectedClaim.reviewedDate!), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
