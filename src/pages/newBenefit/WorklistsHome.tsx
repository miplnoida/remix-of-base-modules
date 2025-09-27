import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNewBenefitAuth } from '@/contexts/NewBenefitAuthContext';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Filter,
  Search,
  Calendar,
  User,
  Building,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';

// Mock data for staff worklists
const mockClaims = [
  {
    id: 'CLM001',
    ssn: '123456789',
    contributorName: 'John Contributor',
    benefitType: 'SICKNESS',
    status: 'SUBMITTED',
    submissionDate: '2024-01-15',
    priority: 'NORMAL',
    assignedTo: null,
    daysInQueue: 3,
    employer: 'Government of St. Kitts & Nevis'
  },
  {
    id: 'CLM002',
    ssn: '987654321',
    contributorName: 'Jane Smith',
    benefitType: 'MATERNITY',
    status: 'ELIGIBILITY_CHECK',
    submissionDate: '2024-01-10',
    priority: 'HIGH',
    assignedTo: 'claims_officer1',
    daysInQueue: 8,
    employer: 'Royal Bank of Canada'
  },
  {
    id: 'CLM003',
    ssn: '456789123',
    contributorName: 'Robert Johnson',
    benefitType: 'EMPLOYMENT_INJURY',
    status: 'PENDING_INFO',
    submissionDate: '2024-01-05',
    priority: 'URGENT',
    assignedTo: 'claims_officer1',
    daysInQueue: 13,
    employer: 'Four Seasons Resort'
  },
  {
    id: 'CLM004',
    ssn: '789123456',
    contributorName: 'Maria Garcia',
    benefitType: 'AGE_PENSION',
    status: 'CALCULATION',
    submissionDate: '2024-01-12',
    priority: 'NORMAL',
    assignedTo: 'supervisor1',
    daysInQueue: 6,
    employer: 'Ministry of Health'
  },
  {
    id: 'CLM005',
    ssn: '321654987',
    contributorName: 'David Wilson',
    benefitType: 'INVALIDITY',
    status: 'EVIDENCE_REVIEW',
    submissionDate: '2024-01-08',
    priority: 'HIGH',
    assignedTo: 'medical1',
    daysInQueue: 10,
    employer: 'Sugar Factory'
  }
];

export const WorklistsHome: React.FC = () => {
  const { currentUser, hasPermission } = useNewBenefitAuth();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ELIGIBILITY_CHECK':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'PENDING_INFO':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'CALCULATION':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'EVIDENCE_REVIEW':
        return <Eye className="h-4 w-4 text-indigo-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'destructive';
      case 'HIGH':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatBenefitType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const myClaims = mockClaims.filter(claim => claim.assignedTo === currentUser?.username);
  const unassignedClaims = mockClaims.filter(claim => !claim.assignedTo);
  const teamClaims = mockClaims.filter(claim => claim.assignedTo && claim.assignedTo !== currentUser?.username);

  const queueStats = {
    myQueue: myClaims.length,
    teamQueue: mockClaims.length,
    overdue: mockClaims.filter(claim => claim.daysInQueue > 7).length,
    urgent: mockClaims.filter(claim => claim.priority === 'URGENT').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Home/Worklists</h1>
          <p className="text-muted-foreground">Manage your claim queues and workload</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {currentUser?.role?.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{queueStats.myQueue}</p>
                <p className="text-sm text-blue-600">My Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{queueStats.teamQueue}</p>
                <p className="text-sm text-green-600">Team Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{queueStats.overdue}</p>
                <p className="text-sm text-orange-600">Overdue (7+ days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{queueStats.urgent}</p>
                <p className="text-sm text-red-600">Urgent Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claims Queues */}
      <Tabs defaultValue="my-queue" className="w-full">
        <TabsList>
          <TabsTrigger value="my-queue">My Queue ({myClaims.length})</TabsTrigger>
          {hasPermission('view_team_queues') && (
            <TabsTrigger value="team-queue">Team Queue ({teamClaims.length})</TabsTrigger>
          )}
          <TabsTrigger value="unassigned">Unassigned ({unassignedClaims.length})</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="my-queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Assigned Claims</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myClaims.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No claims assigned to you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myClaims.map((claim) => (
                    <div key={claim.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(claim.status)}
                          <div>
                            <h3 className="font-medium">{claim.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {claim.contributorName} - {formatBenefitType(claim.benefitType)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right text-sm">
                            <p className="font-medium">{claim.daysInQueue} days</p>
                            <p className="text-muted-foreground">in queue</p>
                          </div>
                          <Badge variant={getPriorityBadgeVariant(claim.priority)}>
                            {claim.priority}
                          </Badge>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/newbenefit/claim-360/${claim.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Submitted: {new Date(claim.submissionDate).toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Building className="h-3 w-3 mr-1" />
                          {claim.employer}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {claim.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Claims</CardTitle>
              <CardDescription>All claims assigned to team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamClaims.map((claim) => (
                  <div key={claim.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(claim.status)}
                        <div>
                          <h3 className="font-medium">{claim.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {claim.contributorName} - {formatBenefitType(claim.benefitType)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {claim.assignedTo}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm">
                          <p className="font-medium">{claim.daysInQueue} days</p>
                          <p className="text-muted-foreground">in queue</p>
                        </div>
                        <Badge variant={getPriorityBadgeVariant(claim.priority)}>
                          {claim.priority}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/newbenefit/claim-360/${claim.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unassigned" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unassigned Claims</CardTitle>
              <CardDescription>Claims waiting for assignment</CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedClaims.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No unassigned claims</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unassignedClaims.map((claim) => (
                    <div key={claim.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(claim.status)}
                          <div>
                            <h3 className="font-medium">{claim.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              {claim.contributorName} - {formatBenefitType(claim.benefitType)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right text-sm">
                            <p className="font-medium">{claim.daysInQueue} days</p>
                            <p className="text-muted-foreground">waiting</p>
                          </div>
                          <Badge variant={getPriorityBadgeVariant(claim.priority)}>
                            {claim.priority}
                          </Badge>
                          <Button size="sm">
                            Assign to Me
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/newbenefit/claim-360/${claim.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Overdue Claims</CardTitle>
                <CardDescription>Claims over 7 days old</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockClaims.filter(claim => claim.daysInQueue > 7).map(claim => (
                    <div key={claim.id} className="flex items-center justify-between p-2 border-l-4 border-l-red-500 bg-red-50">
                      <div>
                        <p className="font-medium">{claim.id}</p>
                        <p className="text-sm text-muted-foreground">{claim.contributorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-bold">{claim.daysInQueue} days</p>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/newbenefit/claim-360/${claim.id}`}>Action</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Pending Information</CardTitle>
                <CardDescription>Claims waiting for additional documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockClaims.filter(claim => claim.status === 'PENDING_INFO').map(claim => (
                    <div key={claim.id} className="flex items-center justify-between p-2 border-l-4 border-l-orange-500 bg-orange-50">
                      <div>
                        <p className="font-medium">{claim.id}</p>
                        <p className="text-sm text-muted-foreground">{claim.contributorName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-600 font-bold">{claim.daysInQueue} days</p>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/newbenefit/claim-360/${claim.id}`}>Follow Up</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};