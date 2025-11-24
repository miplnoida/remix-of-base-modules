import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  MapPin, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const InspectorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { 
      label: 'This Week\'s Plan', 
      value: '8', 
      icon: Calendar, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Completed Visits', 
      value: '5', 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Pending Actions', 
      value: '12', 
      icon: Clock, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    { 
      label: 'Open Violations', 
      value: '3', 
      icon: AlertCircle, 
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
  ];

  const todaySchedule = [
    { time: '09:00 AM', employer: 'ABC Construction Ltd', type: 'Audit', status: 'pending' },
    { time: '11:30 AM', employer: 'XYZ Retail Store', type: 'Follow-up', status: 'pending' },
    { time: '02:00 PM', employer: 'DEF Manufacturing', type: 'Inspection', status: 'scheduled' },
  ];

  const recentViolations = [
    { employer: 'ABC Construction Ltd', type: 'Late C3 Filing', date: '2024-01-15', severity: 'high' },
    { employer: 'LMN Services', type: 'Unregistered Workers', date: '2024-01-14', severity: 'medium' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Inspector'}!</h1>
        <p className="text-muted-foreground mt-1">Here's your field activity overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <h3 className="text-3xl font-bold mt-2">{stat.value}</h3>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/inspector/plan')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No visits scheduled for today</p>
              </div>
            ) : (
              todaySchedule.map((visit, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-16 text-center">
                      <div className="text-sm font-medium">{visit.time}</div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{visit.employer}</p>
                    <p className="text-sm text-muted-foreground">{visit.type}</p>
                  </div>
                  <Badge variant={visit.status === 'pending' ? 'default' : 'secondary'}>
                    {visit.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Violations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Recent Violations
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate('/inspector/violations')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentViolations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent violations</p>
              </div>
            ) : (
              recentViolations.map((violation, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    violation.severity === 'high' ? 'bg-red-500' : 
                    violation.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{violation.employer}</p>
                    <p className="text-sm text-muted-foreground">{violation.type}</p>
                    <p className="text-xs text-muted-foreground mt-1">{violation.date}</p>
                  </div>
                  <Badge variant={violation.severity === 'high' ? 'destructive' : 'secondary'}>
                    {violation.severity}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/plan')}
            >
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Create Plan</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/activities')}
            >
              <MapPin className="h-6 w-6" />
              <span className="text-sm">Field Visit</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/violations')}
            >
              <AlertCircle className="h-6 w-6" />
              <span className="text-sm">Record Violation</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/reports')}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">Submit Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
