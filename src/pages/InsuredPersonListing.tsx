import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Search,
  Filter,
  Clock,
  List,
  Eye,
  Edit,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';

const InsuredPersonListing = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('listing');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock data for insured persons
  const insuredPersons = [
    {
      ssn: '123-45-6789',
      name: 'John Doe',
      idNumber: 'ID001234',
      status: 'Active',
      employer: 'ABC Company',
      registrationDate: '2024-01-15',
      lastContribution: '2024-07-10'
    },
    {
      ssn: '234-56-7890',
      name: 'Jane Smith',
      idNumber: 'ID002345',
      status: 'Active',
      employer: 'XYZ Corp',
      registrationDate: '2023-12-20',
      lastContribution: '2024-07-05'
    },
    {
      ssn: '345-67-8901',
      name: 'Mike Johnson',
      idNumber: 'ID003456',
      status: 'Suspended',
      employer: 'DEF Ltd',
      registrationDate: '2024-02-10',
      lastContribution: '2024-06-15'
    },
    {
      ssn: '456-78-9012',
      name: 'Sarah Wilson',
      idNumber: 'ID004567',
      status: 'Active',
      employer: 'GHI Inc',
      registrationDate: '2024-03-05',
      lastContribution: '2024-07-08'
    },
    {
      ssn: '567-89-0123',
      name: 'Robert Brown',
      idNumber: 'ID005678',
      status: 'Ceased',
      employer: 'JKL Corp',
      registrationDate: '2023-11-12',
      lastContribution: '2024-05-20'
    },
    {
      ssn: '678-90-1234',
      name: 'Emily Davis',
      idNumber: 'ID006789',
      status: 'Active',
      employer: 'MNO Ltd',
      registrationDate: '2024-04-18',
      lastContribution: '2024-07-12'
    }
  ];

  // Mock data for pending applications
  const pendingApplications = [
    {
      applicationId: 'APP001',
      name: 'David Miller',
      ssn: '789-01-2345',
      employer: 'PQR Company',
      submissionDate: '2024-07-10',
      status: 'Under Review',
      documents: 'Complete'
    },
    {
      applicationId: 'APP002',
      name: 'Lisa Anderson',
      ssn: '890-12-3456',
      employer: 'STU Corp',
      submissionDate: '2024-07-08',
      status: 'Pending Documents',
      documents: 'Incomplete'
    },
    {
      applicationId: 'APP003',
      name: 'James Taylor',
      ssn: '901-23-4567',
      employer: 'VWX Ltd',
      submissionDate: '2024-07-05',
      status: 'Verification Required',
      documents: 'Complete'
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Active': { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
      'Suspended': { variant: 'secondary', icon: AlertCircle, color: 'text-yellow-600' },
      'Ceased': { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      'Under Review': { variant: 'secondary', icon: Clock, color: 'text-blue-600' },
      'Pending Documents': { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      'Verification Required': { variant: 'secondary', icon: AlertCircle, color: 'text-orange-600' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Active'];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const filteredPersons = insuredPersons.filter(person => {
    const matchesSearch = person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.ssn.includes(searchTerm) ||
                         person.idNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleView = (ssn: string) => {
    navigate(`/person/view/${ssn}`);
  };

  const handleEdit = (ssn: string) => {
    navigate(`/person/edit/${ssn}`);
  };

  const handleApprove = (applicationId: string) => {
    console.log('Approve application:', applicationId);
  };

  const handleReject = (applicationId: string) => {
    console.log('Reject application:', applicationId);
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600" />
          <h1 className="text-xl lg:text-3xl font-bold text-gray-900">IP Listing</h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="listing" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Insured Persons
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Applications
          </TabsTrigger>
        </TabsList>

        {/* Insured Persons Listing Tab */}
        <TabsContent value="listing" className="space-y-4">
          {/* Filters Section */}
          <Card>
            <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Search & Filters
                    </CardTitle>
                    <Button variant="ghost" size="sm">
                      {isFilterOpen ? 'Collapse' : 'Expand'}
                    </Button>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name, SSN, or ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                          <SelectItem value="Ceased">Ceased</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" className="w-full">
                        Reset Filters
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle>Insured Persons ({filteredPersons.length} records)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SSN</TableHead>
                      <TableHead>ID Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Registration Date</TableHead>
                      <TableHead>Last Contribution</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPersons.map((person) => (
                      <TableRow key={person.ssn}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.ssn}</TableCell>
                        <TableCell>{person.idNumber}</TableCell>
                        <TableCell>{getStatusBadge(person.status)}</TableCell>
                        <TableCell>{person.employer}</TableCell>
                        <TableCell>{person.registrationDate}</TableCell>
                        <TableCell>{person.lastContribution}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(person.ssn)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(person.ssn)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem>Generate ID Card</DropdownMenuItem>
                                <DropdownMenuItem>View History</DropdownMenuItem>
                                <DropdownMenuItem>Change Status</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Applications Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications ({pendingApplications.length} applications)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SSN</TableHead>
                      <TableHead>Employer</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApplications.map((application) => (
                      <TableRow key={application.applicationId}>
                        <TableCell className="font-medium">{application.applicationId}</TableCell>
                        <TableCell>{application.name}</TableCell>
                        <TableCell>{application.ssn}</TableCell>
                        <TableCell>{application.employer}</TableCell>
                        <TableCell>{application.submissionDate}</TableCell>
                        <TableCell>{getStatusBadge(application.status)}</TableCell>
                        <TableCell>
                          <Badge variant={application.documents === 'Complete' ? 'default' : 'destructive'}>
                            {application.documents}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => console.log('View application:', application.applicationId)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem 
                                  onClick={() => handleApprove(application.applicationId)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleReject(application.applicationId)}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Request Documents
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InsuredPersonListing;