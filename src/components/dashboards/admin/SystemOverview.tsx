import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, FileText, AlertTriangle, TrendingUp, Shield } from 'lucide-react';

export const SystemOverview = () => {
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

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'destructive';
      case 'info':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'warning':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'info':
        return 'bg-info/10 text-info hover:bg-info/20';
      default:
        return '';
    }
  };

  return (
    <>
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
                <span className="text-sm font-medium text-success">98.5%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">System Uptime</span>
                <span className="text-sm font-medium text-success">99.9%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '99.9%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Security Score</span>
                <span className="text-sm font-medium text-warning">85%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{ width: '85%' }}></div>
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
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="w-16 flex-shrink-0">
                    <Badge 
                      variant={getBadgeVariant(activity.type)}
                      className={`text-xs w-full justify-center ${getBadgeColor(activity.type)}`}
                    >
                      {activity.type}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-gray-900 leading-snug">{activity.action}</p>
                      <p className="text-sm text-gray-600 leading-snug">{activity.entity}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
