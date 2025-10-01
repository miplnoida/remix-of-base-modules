
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, Calendar } from 'lucide-react';

export const ComplianceView = () => {
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
                metric.status === 'warning' ? 'text-orange-600' : 'text-blue-500'
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
