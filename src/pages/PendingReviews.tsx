
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Home, Search, Clock, AlertTriangle, CheckCircle, Eye, Edit, FileText } from 'lucide-react';

const PendingReviews = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState({
    ssn: '',
    type: '',
    priority: '',
    daysWaiting: ''
  });

  // Mock pending reviews data
  const pendingItems = [
    {
      id: 1,
      ssn: '123456',
      name: 'John Doe',
      type: 'Registration',
      description: 'New insured person registration pending verification',
      submittedDate: '2024-01-15',
      daysWaiting: 5,
      priority: 'High',
      assignedTo: 'Sarah Wilson',
      requiredDocuments: ['Birth Certificate', 'Passport Copy'],
      missingDocuments: ['Birth Certificate'],
      status: 'Document Verification'
    },
    {
      id: 2,
      ssn: '789012',
      name: 'Jane Smith',
      type: 'Benefit Claim',
      description: 'Maternity benefit claim awaiting medical review',
      submittedDate: '2024-01-10',
      daysWaiting: 10,
      priority: 'Medium',
      assignedTo: 'Mike Johnson',
      requiredDocuments: ['Medical Certificate', 'Hospital Records'],
      missingDocuments: [],
      status: 'Medical Review'
    },
    {
      id: 3,
      ssn: '456789',
      name: 'Robert Brown',
      type: 'Registration',
      description: 'Work permit verification pending',
      submittedDate: '2024-01-05',
      daysWaiting: 15,
      priority: 'High',
      assignedTo: 'Lisa Davis',
      requiredDocuments: ['Work Permit', 'Employer Letter'],
      missingDocuments: ['Employer Letter'],
      status: 'Document Verification'
    },
    {
      id: 4,
      ssn: '321654',
      name: 'Maria Garcia',
      type: 'Benefit Claim',
      description: 'Sickness benefit claim pending doctor approval',
      submittedDate: '2024-01-12',
      daysWaiting: 8,
      priority: 'Low',
      assignedTo: 'Tom Anderson',
      requiredDocuments: ['Medical Certificate', 'Doctor\'s Report'],
      missingDocuments: ['Doctor\'s Report'],
      status: 'Medical Review'
    },
    {
      id: 5,
      ssn: '987654',
      name: 'David Wilson',
      type: 'Address Change',
      description: 'Address update requiring proof of residence',
      submittedDate: '2024-01-18',
      daysWaiting: 2,
      priority: 'Low',
      assignedTo: 'Emma Thompson',
      requiredDocuments: ['Utility Bill', 'Lease Agreement'],
      missingDocuments: ['Utility Bill'],
      status: 'Document Verification'
    }
  ];

  const handleSearch = () => {
    console.log('Searching pending reviews with parameters:', searchParams);
  };

  const handleReview = (item: any) => {
    console.log('Reviewing item:', item);
    // Navigate to review page or open modal
  };

  const handleApprove = (id: number) => {
    console.log('Approving item:', id);
    // Handle approval logic
  };

  const handleReject = (id: number) => {
    console.log('Rejecting item:', id);
    // Handle rejection logic
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High':
        return <Badge variant="destructive">High</Badge>;
      case 'Medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'Low':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Document Verification':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Document Verification
        </Badge>;
      case 'Medical Review':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Medical Review
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDaysWaitingBadge = (days: number) => {
    if (days > 14) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {days} days
      </Badge>;
    } else if (days > 7) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {days} days
      </Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">
        {days} days
      </Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/person/management')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to IP Management</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="h-6 w-px bg-gray-300" />
          <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-orange-600" />
          <div>
            <h1 className="text-xl lg:text-3xl font-bold text-gray-900">Pending Reviews</h1>
            <p className="text-sm lg:text-base text-gray-600 hidden sm:block">Review and process pending applications and claims</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 self-start lg:self-center"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Main Menu</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">{pendingItems.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {pendingItems.filter(item => item.priority === 'High').length}
            </div>
            <p className="text-xs text-muted-foreground">Urgent attention needed</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue ({`>`}14 days)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {pendingItems.filter(item => item.daysWaiting > 14).length}
            </div>
            <p className="text-xs text-muted-foreground">Past target time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold">
              {Math.round(pendingItems.reduce((sum, item) => sum + item.daysWaiting, 0) / pendingItems.length)} days
            </div>
            <p className="text-xs text-muted-foreground">Average processing time</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Filter Pending Reviews</CardTitle>
          <CardDescription>Search and filter items awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">SSN</label>
              <Input
                placeholder="Enter SSN"
                value={searchParams.ssn}
                onChange={(e) => setSearchParams(prev => ({ ...prev, ssn: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={searchParams.type} onValueChange={(value) => setSearchParams(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Registration">Registration</SelectItem>
                  <SelectItem value="Benefit Claim">Benefit Claim</SelectItem>
                  <SelectItem value="Address Change">Address Change</SelectItem>
                  <SelectItem value="Document Update">Document Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={searchParams.priority} onValueChange={(value) => setSearchParams(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Days Waiting</label>
              <Select value={searchParams.daysWaiting} onValueChange={(value) => setSearchParams(prev => ({ ...prev, daysWaiting: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0-7">0-7 days</SelectItem>
                  <SelectItem value="8-14">8-14 days</SelectItem>
                  <SelectItem value="15+">15+ days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base lg:text-lg">Pending Items ({pendingItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">SSN</TableHead>
                  <TableHead className="min-w-[120px]">Name</TableHead>
                  <TableHead className="min-w-[100px]">Type</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[120px]">Submitted</TableHead>
                  <TableHead className="min-w-[100px]">Days Waiting</TableHead>
                  <TableHead className="min-w-[80px]">Priority</TableHead>
                  <TableHead className="min-w-[120px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">Assigned To</TableHead>
                  <TableHead className="min-w-[150px]">Missing Docs</TableHead>
                  <TableHead className="min-w-[150px] sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.ssn}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.description}>
                      {item.description}
                    </TableCell>
                    <TableCell>{item.submittedDate}</TableCell>
                    <TableCell>{getDaysWaitingBadge(item.daysWaiting)}</TableCell>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{item.assignedTo}</TableCell>
                    <TableCell>
                      {item.missingDocuments.length > 0 ? (
                        <div className="space-y-1">
                          {item.missingDocuments.map((doc, index) => (
                            <div key={index} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              {doc}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Complete
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="View Details"
                          onClick={() => handleReview(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          title="Edit"
                          onClick={() => handleReview(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          title="Approve"
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          title="Reject"
                          onClick={() => handleReject(item.id)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
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
  );
};

export default PendingReviews;
