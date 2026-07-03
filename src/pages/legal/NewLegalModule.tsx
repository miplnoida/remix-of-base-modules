/** @deprecated Legal V1 legacy — retired 2026-07. See docs/legal/LEGAL_LEGACY_RETIREMENT_AUDIT.md. Not routed / not linked from canonical UI. */
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { 
  Scale, 
  FileText, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  Users,
  Clock,
  CheckCircle,
  Plus,
  Eye,
  Download,
  Filter
} from 'lucide-react';

const NewLegalModule = () => {
  const navigate = useNavigate();
  
  const dashboardStats = [
    { label: 'Open Cases', value: '47', status: 'warning', icon: Scale, color: 'text-orange-500' },
    { label: 'Under Review', value: '23', status: 'info', icon: Clock, color: 'text-blue-500' },
    { label: 'In Legal Action', value: '12', status: 'danger', icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Resolved This Month', value: '156', status: 'success', icon: CheckCircle, color: 'text-green-500' },
  ];

  const casesByType = [
    { type: 'Non-Compliance', count: 18, percentage: 38 },
    { type: 'Benefit Dispute', count: 12, percentage: 26 },
    { type: 'Fraud Investigation', count: 9, percentage: 19 },
    { type: 'Appeals', count: 8, percentage: 17 },
  ];

  const recentCases = [
    {
      id: 'LC-2024-089',
      type: 'Non-Compliance',
      employer: 'ABC Manufacturing Ltd',
      status: 'Under Review',
      priority: 'High',
      dateCreated: '2024-01-15',
      assignedOfficer: 'Sarah Johnson',
      description: 'Late contribution payments for Q4 2023'
    },
    {
      id: 'LC-2024-088',
      type: 'Benefit Dispute',
      insuredPerson: 'John Smith (SSN: 123-45-6789)',
      status: 'In Legal Action',
      priority: 'Medium',
      dateCreated: '2024-01-12',
      assignedOfficer: 'Michael Chen',
      description: 'Disability benefit calculation dispute'
    },
    {
      id: 'LC-2024-087',
      type: 'Appeal',
      appellant: 'XYZ Services Corp',
      status: 'Filed',
      priority: 'Low',
      dateCreated: '2024-01-10',
      assignedOfficer: 'Lisa Wang',
      description: 'Appeal against penalty assessment'
    }
  ];

  const upcomingHearings = [
    {
      caseId: 'LC-2024-089',
      date: '2024-02-15',
      time: '10:00 AM',
      type: 'Preliminary Hearing',
      location: 'Legal Office - Conference Room A'
    },
    {
      caseId: 'LC-2024-088',
      date: '2024-02-18',
      time: '2:00 PM',
      type: 'Mediation Session',
      location: 'Mediation Center'
    }
  ];

  const penaltiesCollected = {
    thisMonth: 125000,
    outstanding: 89500,
    collectionRate: 78
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Scale className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-semibold text-gray-900">Legal Module</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={() => navigate('/legal/case-intake')}>
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/legal/notices')}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Notice
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Legal Case Dashboard</h2>
          <p className="text-gray-600">Monitor legal cases, compliance enforcement, and dispute resolution</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Cases by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-500" />
                Cases by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {casesByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.type}</span>
                        <span className="text-sm text-gray-500">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Penalties & Collections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Penalties & Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold text-green-600">${penaltiesCollected.thisMonth.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">Collected This Month</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">${penaltiesCollected.outstanding.toLocaleString()}</div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{penaltiesCollected.collectionRate}%</div>
                  <p className="text-sm text-gray-600">Collection Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Hearings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                Upcoming Hearings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingHearings.map((hearing, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{hearing.caseId}</h4>
                      <Badge variant="outline" className="text-xs">{hearing.type}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>{hearing.date} at {hearing.time}</div>
                      <div className="text-xs text-gray-500">{hearing.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Cases */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Legal Cases</CardTitle>
                <CardDescription>Latest cases requiring attention</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/legal/case-tracking')}>
                  View All Cases
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCases.map((case_, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{case_.id}</h4>
                      <Badge variant={
                        case_.status === 'Under Review' ? 'default' :
                        case_.status === 'In Legal Action' ? 'destructive' : 'secondary'
                      }>
                        {case_.status}
                      </Badge>
                      <Badge variant={
                        case_.priority === 'High' ? 'destructive' :
                        case_.priority === 'Medium' ? 'default' : 'secondary'
                      }>
                        {case_.priority}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/legal/case-detail/${case_.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Type:</span> {case_.type}
                    </div>
                    <div>
                      <span className="font-medium">Officer:</span> {case_.assignedOfficer}
                    </div>
                    <div>
                      <span className="font-medium">Party:</span> {case_.employer || case_.insuredPerson || case_.appellant}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {case_.dateCreated}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{case_.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="h-16 flex flex-col items-center space-y-2" onClick={() => navigate('/legal/case-intake')}>
            <Plus className="h-5 w-5" />
            <span>Create New Case</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col items-center space-y-2" onClick={() => navigate('/legal/notices')}>
            <FileText className="h-5 w-5" />
            <span>Generate Notice</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col items-center space-y-2" onClick={() => navigate('/legal/evidence')}>
            <FileText className="h-5 w-5" />
            <span>Upload Evidence</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col items-center space-y-2" onClick={() => navigate('/legal/reports')}>
            <Download className="h-5 w-5" />
            <span>Generate Reports</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewLegalModule;