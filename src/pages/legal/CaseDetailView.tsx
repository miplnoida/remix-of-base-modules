import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  FileText, 
  AlertTriangle,
  DollarSign,
  MessageSquare,
  Clock
} from 'lucide-react';

const CaseDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock case data - in real app, fetch based on ID
  const caseData = {
    id: id || 'LC-2024-089',
    type: 'Non-Compliance',
    party: 'ABC Manufacturing Ltd (EMP-001)',
    status: 'Under Review',
    priority: 'High',
    dateCreated: '2024-01-15',
    assignedOfficer: 'Sarah Johnson',
    description: 'Late contribution payments for Q4 2023',
    slaStatus: 'Within SLA',
    daysOpen: 12,
    nextAction: 'Review evidence',
    nextActionDate: '2024-01-25',
    legalBasis: 'Social Security Act Section 15(2) - Timely Payment of Contributions',
    penaltyAmount: '$5,250.00',
    totalOutstanding: '$12,450.00',
    communications: [
      {
        date: '2024-01-20',
        type: 'Notice Sent',
        details: 'First notice sent to employer regarding late payments',
        officer: 'Sarah Johnson'
      },
      {
        date: '2024-01-18',
        type: 'Case Review',
        details: 'Initial case assessment completed',
        officer: 'Sarah Johnson'
      }
    ],
    evidence: [
      {
        type: 'Document',
        name: 'C3 Payment Records Q4 2023',
        dateAdded: '2024-01-16',
        addedBy: 'System'
      },
      {
        type: 'Document',
        name: 'Employer Response Letter',
        dateAdded: '2024-01-19',
        addedBy: 'Sarah Johnson'
      }
    ]
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Filed': return 'secondary';
      case 'Under Review': return 'default';
      case 'In Legal Action': return 'destructive';
      case 'Resolved': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'warning';
      case 'Low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSLABadgeVariant = (slaStatus: string) => {
    switch (slaStatus) {
      case 'Within SLA': return 'success';
      case 'At Risk': return 'warning';
      case 'Overdue': return 'destructive';
      case 'Completed': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/legal/case-tracking')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Case Tracking
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <nav className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Legal Module</span>
                <span>/</span>
                <span>Case Tracking</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Case {caseData.id}</span>
              </nav>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/legal/case-edit/${caseData.id}`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Case
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Case Summary Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Case {caseData.id}</h1>
              <p className="text-gray-600">{caseData.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={getStatusBadgeVariant(caseData.status)}>
                {caseData.status}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(caseData.priority)}>
                {caseData.priority} Priority
              </Badge>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Days Open</p>
                    <p className="text-lg font-semibold">{caseData.daysOpen}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">SLA Status</p>
                    <Badge variant={getSLABadgeVariant(caseData.slaStatus)}>
                      {caseData.slaStatus}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Penalty Amount</p>
                    <p className="text-lg font-semibold">{caseData.penaltyAmount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Assigned Officer</p>
                    <p className="text-lg font-semibold">{caseData.assignedOfficer}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Case Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Case Type</label>
                      <p className="text-sm">{caseData.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Date Created</label>
                      <p className="text-sm">{caseData.dateCreated}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Party Involved</label>
                      <p className="text-sm">{caseData.party}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Legal Basis</label>
                      <p className="text-sm">{caseData.legalBasis}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-600">Description</label>
                    <p className="text-sm mt-1">{caseData.description}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{caseData.nextAction}</p>
                        <p className="text-sm text-blue-700">Due: {caseData.nextActionDate}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evidence & Documents</CardTitle>
                <CardDescription>All evidence and supporting documents for this case</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {caseData.evidence.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">Added on {item.dateAdded} by {item.addedBy}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Communication History</CardTitle>
                <CardDescription>All communications related to this case</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {caseData.communications.map((comm, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                      <MessageSquare className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{comm.type}</p>
                          <p className="text-sm text-gray-600">{comm.date}</p>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{comm.details}</p>
                        <p className="text-xs text-gray-500 mt-2">By: {comm.officer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Timeline</CardTitle>
                <CardDescription>Chronological view of all case activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2" />
                    <p>Timeline view coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Penalties, payments, and outstanding amounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Penalty Amount</p>
                    <p className="text-2xl font-bold text-red-700">{caseData.penaltyAmount}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600">Total Outstanding</p>
                    <p className="text-2xl font-bold text-orange-700">{caseData.totalOutstanding}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Payments Received</p>
                    <p className="text-2xl font-bold text-green-700">$0.00</p>
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

export default CaseDetailView;