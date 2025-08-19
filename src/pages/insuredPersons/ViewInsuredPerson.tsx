
import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog,  DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Printer, 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  FileDown,
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
  Clock,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';

// Import registration tabs
import { RegisterPersonForm } from '@/components/ip/RegisterPersonForm';
import { DependentTab } from '@/components/ip/DependentTab';
import { NotesTab } from '@/components/ip/NotesTab';
import { NPFTab } from '@/components/ip/NPFTab';
import { PhotoTab } from '@/components/ip/PhotoTab';
import { CaricomTab } from '@/components/ip/CaricomTab';
import { Textarea } from '@/components/ui/textarea';
import { Label } from 'recharts';
import { DialogContent } from '@radix-ui/react-dialog';

const ViewInsuredPerson = () => {
  const navigate = useNavigate();
  const { ssn } = useParams();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('register');
  const [activeHistoryTab, setActiveHistoryTab] = useState('wages');
  const [isRegisterSectionOpen, setIsRegisterSectionOpen] = useState(true);
  const [isHistorySectionOpen, setIsHistorySectionOpen] = useState(true);
   const [accountStatusModalOpen, setAccountStatusModalOpen] = useState(false);
    const [accountStatus, setAccountStatus] = useState('Active');
  const [currentStatus, setCurrentStatus] = useState('Active');
  const history = [
    { date: '2025-05-01 10:12', action: 'Created record', user: 'Admin' },
    { date: '2025-05-03 14:20', action: 'Updated address', user: 'Clerk' },
  ];

  // Get status from location state if available
  const statusFromLocation = location.state?.status;

  // Mock data - replace with actual data fetching
  const personData = {
    ssn: ssn || '123456',
    surname: 'Doe',
    firstname: 'John',
    middlename: 'Michael',
    dob: '1985-03-15',
    sex: 'Male',
    status: statusFromLocation || 'Active',
    occupation: 'Accountant',
    phone: '+1869-465-1234',
    email: 'john.doe@email.com',
    address: '123 Main Street, Apt 2B',
    district: 'Basseterre Zone 01'
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

  // Account Status Modal
const AccountStatusModal = ({
  open,
  onClose,
  currentStatus,
  onChangeStatus
}: {
  open: boolean;
  onClose: () => void;
  currentStatus: string;
  onChangeStatus: (newStatus: string, reason: string) => void;
}) => {
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeStatus(newStatus, reason);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Account Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Current Status</Label>
            <span className={`inline-block ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-800`}>
              {currentStatus}
            </span>
          </div>
          <div>
            <Label>Change Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="Suspend">Suspend</SelectItem>
                <SelectItem value="Verify">Verify</SelectItem>
                <SelectItem value="Ceased">Ceased</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason for status change"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Change Status
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
 const handleChangeAccountStatus = (newStatus: string, reason: string) => {
    setAccountStatus(newStatus);
    // You can handle the reason or API call here
  };

  const handleStatusChange = (newStatus: string) => {
    setCurrentStatus(newStatus);
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
                      className="flex items-center gap-2 border-0 border-l-2 border-l-[#0284C7] shadow-md"
                    >
                      <ArrowLeft className="h-4 w-4" />
                     
                      <span className="sm:hidden">Back</span>
                    </Button>
          <div className="h-6 w-px bg-gray-300" />
          {/* <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900">
              {personData.firstname} {personData.surname}
            </h1>
            <p className="text-gray-600">SSN: {personData.ssn} {getStatusBadge(personData.status)}</p>
          </div> */}
        </div>
        <div className="flex gap-2">
        
          
            
 
          {personData.status === 'Draft' && (
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {personData.status === 'Pending' && (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button type="button" variant="outline" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button type="button" variant="default" className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                Approve
              </Button>
              <Button type="button" variant="destructive" className="flex items-center gap-2">
                Reject
              </Button>
            </>
          )}
          {personData.status !== 'Draft' && personData.status !== 'Pending' && (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button>
                <IdCard className="h-4 w-4 mr-2" />
                Generate ID Card
              </Button>
              <Button type="button" variant="outline" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button type="button" variant="destructive" className="flex items-center gap-2" onClick={()=>{setAccountStatusModalOpen(true)}}>
                Change Account Status
              </Button>
              
            </>
          )}
        </div>
      </div>
      {/* New Person Info Card */}
      <Card className="mb-4">
        <CardContent className="py-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
            </div>
            <div className="flex flex-col gap-1 justify-center">
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
                {personData.firstname} {personData.surname}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 text-sm font-medium">SSN: {personData.ssn}</span>
                {getStatusBadge(personData.status)}
              </div>
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
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="register" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Register Person</span>
                  </TabsTrigger>
                  <TabsTrigger value="dependent" className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Dependent</span>
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="npf" className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    <span className="hidden sm:inline">NPF</span>
                  </TabsTrigger>
                  <TabsTrigger value="photo" className="flex items-center gap-1">
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">Photo</span>
                  </TabsTrigger>
                  <TabsTrigger value="caricom" className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Caricom</span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="register">
                    <RegisterPersonForm />
                  </TabsContent>
                  
                  <TabsContent value="dependent">
                    <DependentTab />
                  </TabsContent>
                  
                  <TabsContent value="notes">
                    <NotesTab />
                  </TabsContent>
                  
                  <TabsContent value="npf">
                    <NPFTab />
                  </TabsContent>
                  
                  <TabsContent value="photo">
                    <PhotoTab />
                  </TabsContent>
                  
                  <TabsContent value="caricom">
                    <CaricomTab />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* History and Status Management Section - Collapsible */}
      {/* <Collapsible open={isHistorySectionOpen} onOpenChange={setIsHistorySectionOpen}>
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
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Wages History</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Wages
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <FileDown className="h-4 w-4" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex items-center gap-4">
                          <div className="flex-1">
                            <Input 
                              placeholder="Search wages records..." 
                              className="max-w-sm"
                            />
                          </div>
                          <Select>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filter by year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2023">2023</SelectItem>
                              <SelectItem value="2022">2022</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Weeks Paid</TableHead>
                              <TableHead>Weeks Credited</TableHead>
                              <TableHead>Weeks Deducted</TableHead>
                              <TableHead>Actual Wages Paid</TableHead>
                              <TableHead>Wages Credited</TableHead>
                              <TableHead>Total Annual Wages</TableHead>
                              <TableHead>Total Wages Deducted</TableHead>
                              <TableHead>Total Adjusted Wages</TableHead>
                              <TableHead>Total Annual Contribution</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024</TableCell>
                              <TableCell>52</TableCell>
                              <TableCell>52</TableCell>
                              <TableCell>0</TableCell>
                              <TableCell>$52,000.00</TableCell>
                              <TableCell>$52,000.00</TableCell>
                              <TableCell>$52,000.00</TableCell>
                              <TableCell>$0.00</TableCell>
                              <TableCell>$52,000.00</TableCell>
                              <TableCell>$5,200.00</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2023</TableCell>
                              <TableCell>50</TableCell>
                              <TableCell>50</TableCell>
                              <TableCell>2</TableCell>
                              <TableCell>$50,000.00</TableCell>
                              <TableCell>$50,000.00</TableCell>
                              <TableCell>$50,000.00</TableCell>
                              <TableCell>$2,000.00</TableCell>
                              <TableCell>$48,000.00</TableCell>
                              <TableCell>$4,800.00</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="claims">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Claim History</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <FileDown className="h-4 w-4" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex items-center gap-4">
                          <div className="flex-1">
                            <Input 
                              placeholder="Search claim records..." 
                              className="max-w-sm"
                            />
                          </div>
                          <Select>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="medical">Medical</SelectItem>
                              <SelectItem value="unemployment">Unemployment</SelectItem>
                              <SelectItem value="maternity">Maternity</SelectItem>
                              <SelectItem value="injury">Work Injury</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Claim Sequence</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Claim Date</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Wks/Days</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Weekly Rate</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Avg. Weekly Wages</TableHead>
                              <TableHead>Disallowance Reason</TableHead>
                              <TableHead>Remark</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>CLM-2024-001</TableCell>
                              <TableCell>Medical</TableCell>
                              <TableCell>2024-02-15</TableCell>
                              <TableCell>2024-02-20</TableCell>
                              <TableCell>2024-03-05</TableCell>
                              <TableCell>2 weeks</TableCell>
                              <TableCell>$750.00</TableCell>
                              <TableCell>$375.00</TableCell>
                              <TableCell><Badge className="bg-blue-100 text-blue-800">Processing</Badge></TableCell>
                              <TableCell>$400.00</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>Medical documentation submitted</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>CLM-2023-012</TableCell>
                              <TableCell>Unemployment</TableCell>
                              <TableCell>2023-11-10</TableCell>
                              <TableCell>2023-11-15</TableCell>
                              <TableCell>2024-01-15</TableCell>
                              <TableCell>8 weeks</TableCell>
                              <TableCell>$3,200.00</TableCell>
                              <TableCell>$400.00</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">Approved</Badge></TableCell>
                              <TableCell>$450.00</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>Job seeking verification provided</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="status">
                    <Card>
                      <CardHeader>
                        <CardTitle>Status History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                         
                          <div className="pt-4">
                          
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
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Voluntary Contributions</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <FileDown className="h-4 w-4" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 flex items-center gap-4">
                          <div className="flex-1">
                            <Input 
                              placeholder="Search voluntary contributions..." 
                              className="max-w-sm"
                            />
                          </div>
                          <Select>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="ceased">Ceased</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date Registered</TableHead>
                              <TableHead>Payment Commencement Date</TableHead>
                              <TableHead>Payment Interval</TableHead>
                              <TableHead>Contribution Amount</TableHead>
                              <TableHead>Date Ceased</TableHead>
                              <TableHead>Date Suspended</TableHead>
                              <TableHead>Due Date</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024-01-15</TableCell>
                              <TableCell>2024-02-01</TableCell>
                              <TableCell>Monthly</TableCell>
                              <TableCell>$200.00</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>2024-04-01</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2023-06-10</TableCell>
                              <TableCell>2023-07-01</TableCell>
                              <TableCell>Quarterly</TableCell>
                              <TableCell>$600.00</TableCell>
                              <TableCell>2024-01-10</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
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
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Contribution Summary</CardTitle>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <FileDown className="h-4 w-4" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                          <div className="p-4 border rounded-lg">
                            <h4 className="font-medium">Compliance Status</h4>
                            <p className="text-2xl font-bold text-green-600">Up to Date</p>
                          </div>
                        </div>
                        
                        <div className="mb-4 flex items-center gap-4">
                          <div className="flex-1">
                            <Input 
                              placeholder="Search contribution records..." 
                              className="max-w-sm"
                            />
                          </div>
                          <Select>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Filter by year" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2023">2023</SelectItem>
                              <SelectItem value="2022">2022</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Year</TableHead>
                              <TableHead>Employee Contribution</TableHead>
                              <TableHead>Employer Contribution</TableHead>
                              <TableHead>Government Contribution</TableHead>
                              <TableHead>Voluntary Contribution</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Weeks Credited</TableHead>
                              <TableHead>Compliance Rate</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell>2024</TableCell>
                              <TableCell>$450.00</TableCell>
                              <TableCell>$450.00</TableCell>
                              <TableCell>$150.00</TableCell>
                              <TableCell>$200.00</TableCell>
                              <TableCell>$1,250.00</TableCell>
                              <TableCell>12</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">100%</Badge></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2023</TableCell>
                              <TableCell>$1,680.00</TableCell>
                              <TableCell>$1,680.00</TableCell>
                              <TableCell>$560.00</TableCell>
                              <TableCell>$600.00</TableCell>
                              <TableCell>$4,520.00</TableCell>
                              <TableCell>52</TableCell>
                              <TableCell><Badge className="bg-green-100 text-green-800">100%</Badge></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>2022</TableCell>
                              <TableCell>$1,600.00</TableCell>
                              <TableCell>$1,600.00</TableCell>
                              <TableCell>$533.00</TableCell>
                              <TableCell>$0.00</TableCell>
                              <TableCell>$3,733.00</TableCell>
                              <TableCell>50</TableCell>
                              <TableCell><Badge className="bg-yellow-100 text-yellow-800">96%</Badge></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
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
      </Collapsible> */}
      <AccountStatusModal
          open={accountStatusModalOpen}
          onClose={() => setAccountStatusModalOpen(false)}
          currentStatus={accountStatus}
          onChangeStatus={handleChangeAccountStatus}
        />
    </div>
  );
};

export default ViewInsuredPerson;
