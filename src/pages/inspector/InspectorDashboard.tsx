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
    <div className="space-y-4 pb-6">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Inspector'}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your field activity overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground line-clamp-2">{stat.label}</p>
                <div className={`${stat.bgColor} p-2 rounded-lg flex-shrink-0`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Today's Schedule
              </CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/inspector/plan')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaySchedule.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No visits scheduled for today</p>
              </div>
            ) : (
              todaySchedule.map((visit, index) => (
                <div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex-shrink-0 min-w-[60px]">
                    <div className="text-xs font-medium">{visit.time}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{visit.employer}</p>
                    <p className="text-xs text-muted-foreground">{visit.type}</p>
                  </div>
                  <Badge variant={visit.status === 'pending' ? 'default' : 'secondary'} className="text-xs">
                    {visit.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Violations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-4 w-4" />
                Recent Violations
              </CardTitle>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/inspector/violations')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentViolations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent violations</p>
              </div>
            ) : (
              recentViolations.map((violation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    violation.severity === 'high' ? 'bg-red-500' : 
                    violation.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{violation.employer}</p>
                    <p className="text-xs text-muted-foreground">{violation.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{violation.date}</p>
                  </div>
                  <Badge variant={violation.severity === 'high' ? 'destructive' : 'secondary'} className="text-xs">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/plan')}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs">Create Plan</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/activities')}
            >
              <MapPin className="h-5 w-5" />
              <span className="text-xs">Field Visit</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/violations')}
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs">Violation</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => navigate('/inspector/reports')}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
