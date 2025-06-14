
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, FileText, AlertTriangle, TrendingUp, Shield, Heart, DollarSign, Clock, CheckCircle, XCircle, Calendar, TrendingDown, Eye, EyeOff } from 'lucide-react';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const systemStats = [
    { label: 'Total Employers', value: '15,432', change: '+2.3%', icon: Building2, color: 'bg-blue-500' },
    { label: 'Insured Persons', value: '1.2M', change: '+5.1%', icon: Users, color: 'bg-green-500' },
    { label: 'Active Claims', value: '8,456', change: '-1.2%', icon: FileText, color: 'bg-orange-500' },
    { label: 'Compliance Issues', value: '23', change: '-15%', icon: AlertTriangle, color: 'bg-red-500' },
  ];

  const recentActivities = [
    { action: 'New employer registered', entity: 'ABC Manufacturing Corp', time: '5 minutes ago', type: 'success' },
    { action: 'Compliance violation detected', entity: 'XYZ Services Ltd', time: '1 hour ago', type: 'warning' },
    { action: 'Bulk ID cards generated', entity: '500 cards processed', time: '2 hours ago', type: 'info' },
    { action: 'System backup completed', entity: 'Database backup', time: '6 hours ago', type: 'success' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Administration Dashboard</h1>
        <p className="text-gray-600">Complete overview of all system operations and detailed module insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="hr">HR Management</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {systemStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <div className={`p-2 rounded ${stat.color}`}>
                    <stat.icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                      {stat.change}
                    </span>
                    {' '}from last month
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  System Performance
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Database Performance</span>
                    <span className="text-sm font-medium text-green-600">98.5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">System Uptime</span>
                    <span className="text-sm font-medium text-green-600">99.9%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Security Score</span>
                    <span className="text-sm font-medium text-yellow-600">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Recent System Activities
                </CardTitle>
                <CardDescription>Latest system events and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Badge 
                        variant={activity.type === 'success' ? 'default' : activity.type === 'warning' ? 'destructive' : 'secondary'}
                        className="mt-1"
                      >
                        {activity.type}
                      </Badge>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.entity}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceView />
        </TabsContent>

        <TabsContent value="benefits" className="space-y-6">
          <BenefitsView />
        </TabsContent>

        <TabsContent value="hr" className="space-y-6">
          <HRView />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Compliance View Component
const ComplianceView = () => {
  const complianceMetrics = [
    { label: 'Open Violations', value: '23', status: 'danger', icon: AlertTriangle },
    { label: 'Resolved This Month', value: '157', status: 'success', icon: CheckCircle },
    { label: 'Pending Reviews', value: '45', status: 'warning', icon: Clock },
    { label: 'Scheduled Inspections', value: '12', status: 'info', icon: Calendar },
  ];

  const violations = [
    { employer: 'ABC Manufacturing', violation: 'Late contribution payment', severity: 'High', daysOpen: 15, inspector: 'John Smith' },
    { employer: 'XYZ Services', violation: 'Missing employee records', severity: 'Medium', daysOpen: 8, inspector: 'Jane Doe' },
    { employer: 'Tech Solutions Inc', violation: 'Incorrect benefit calculations', severity: 'High', daysOpen: 22, inspector: 'Mike Johnson' },
    { employer: 'Retail Chain Ltd', violation: 'Incomplete documentation', severity: 'Low', daysOpen: 5, inspector: 'Sarah Wilson' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className={`h-4 w-4 ${
                metric.status === 'danger' ? 'text-red-500' :
                metric.status === 'success' ? 'text-green-500' :
                metric.status === 'warning' ? 'text-yellow-500' : 'text-blue-500'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Violations
            </span>
            <Button size="sm">View All</Button>
          </CardTitle>
          <CardDescription>Current compliance violations requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {violations.map((violation, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{violation.employer}</h4>
                  <Badge variant={
                    violation.severity === 'High' ? 'destructive' :
                    violation.severity === 'Medium' ? 'default' : 'secondary'
                  }>
                    {violation.severity}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{violation.violation}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Inspector: {violation.inspector}</span>
                  <span>{violation.daysOpen} days open</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Benefits View Component
const BenefitsView = () => {
  const benefitsStats = [
    { label: 'Total Claims', value: '8,456', change: '+12%', icon: Heart, color: 'text-blue-600' },
    { label: 'Approved Benefits', value: '$2.4M', change: '+8%', icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Claims', value: '342', change: '-5%', icon: Clock, color: 'text-yellow-600' },
    { label: 'Rejected Claims', value: '89', change: '-15%', icon: XCircle, color: 'text-red-600' },
  ];

  const recentClaims = [
    { id: 'CLM-2024-001', beneficiary: 'John Doe', type: 'Medical', amount: '$2,500', status: 'Pending', date: '2024-01-10' },
    { id: 'CLM-2024-002', beneficiary: 'Jane Smith', type: 'Pension', amount: '$1,800', status: 'Approved', date: '2024-01-09' },
    { id: 'CLM-2024-003', beneficiary: 'Mike Johnson', type: 'Disability', amount: '$3,200', status: 'Under Review', date: '2024-01-08' },
    { id: 'CLM-2024-004', beneficiary: 'Sarah Wilson', type: 'Medical', amount: '$850', status: 'Approved', date: '2024-01-07' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefitsStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
                  {stat.change}
                </span>
                {' '}from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Recent Claims
            </span>
            <Button size="sm">Process New</Button>
          </CardTitle>
          <CardDescription>Latest benefit claims requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentClaims.map((claim, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{claim.id}</h4>
                  <Badge variant={
                    claim.status === 'Approved' ? 'default' :
                    claim.status === 'Pending' ? 'secondary' : 'outline'
                  }>
                    {claim.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{claim.beneficiary}</span>
                  <span className="text-sm font-medium">{claim.amount}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{claim.type}</span>
                  <span>{claim.date}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// HR View Component
const HRView = () => {
  const hrStats = [
    { label: 'Total Employees', value: '1.2M', icon: Users, color: 'bg-green-500' },
    { label: 'New Registrations', value: '156', icon: Building2, color: 'bg-blue-500' },
    { label: 'Pending Applications', value: '45', icon: FileText, color: 'bg-yellow-500' },
    { label: 'ID Cards Generated', value: '89', icon: Shield, color: 'bg-purple-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {hrStats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            <div className={`p-2 rounded ${stat.color}`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Financial View Component
const FinancialView = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">$12.5M</div>
            <p className="text-sm text-gray-600">Monthly Contributions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">$8.2M</div>
            <p className="text-sm text-gray-600">Benefits Paid</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">$4.3M</div>
            <p className="text-sm text-gray-600">Net Surplus</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
