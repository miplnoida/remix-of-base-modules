
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, TrendingDown } from 'lucide-react';

export const ComplianceDashboard = () => {
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

  const upcomingInspections = [
    { company: 'Global Industries', date: '2024-01-15', type: 'Routine', inspector: 'John Smith' },
    { company: 'Medical Center', date: '2024-01-16', type: 'Follow-up', inspector: 'Jane Doe' },
    { company: 'Construction Corp', date: '2024-01-18', type: 'Investigation', inspector: 'Mike Johnson' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-gray-600">Monitor compliance status and manage violations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {complianceMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              <metric.icon className={`h-4 w-4 ${
                metric.status === 'danger' ? 'text-red-500' :
                metric.status === 'success' ? 'text-green-500' :
                metric.status === 'warning' ? 'text-orange-600' : 'text-blue-500'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                Upcoming Inspections
              </span>
              <Button size="sm">Schedule New</Button>
            </CardTitle>
            <CardDescription>Planned inspections and reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingInspections.map((inspection, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{inspection.company}</h4>
                    <Badge variant="outline">{inspection.type}</Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{inspection.date}</span>
                    <span>Inspector: {inspection.inspector}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-green-500" />
            Compliance Trends
          </CardTitle>
          <CardDescription>Monthly compliance performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">87%</div>
              <p className="text-sm text-gray-600">Overall Compliance Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">156</div>
              <p className="text-sm text-gray-600">Inspections Completed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">2.3 days</div>
              <p className="text-sm text-gray-600">Average Resolution Time</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
