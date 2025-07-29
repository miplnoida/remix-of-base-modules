import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { employerData } from '@/data/employerData';
import { useNavigate } from 'react-router-dom';

const EmployersDashboard = () => {
  const navigate = useNavigate();

  // Calculate KPIs from employer data
  const totalEmployers = employerData.length;
  const activeEmployers = employerData.filter(emp => emp.employerStatus === 'Active').length;
  const inactiveEmployers = employerData.filter(emp => emp.employerStatus === 'Inactive').length;
  const totalEmployees = employerData.reduce((sum, emp) => sum + emp.numberOfEmployees, 0);
  const totalContributions = employerData.reduce((sum, emp) => sum + emp.totalContributions, 0);
  const compliantEmployers = employerData.filter(emp => emp.complianceStatus === 'Compliant').length;
  const nonCompliantEmployers = employerData.filter(emp => emp.complianceStatus === 'Non-Compliant').length;
  const pendingContributions = employerData.filter(emp => emp.contributionStatus === 'Pending').length;

  const kpiCards = [
    {
      title: "Total Employers",
      value: totalEmployers.toString(),
      description: `${activeEmployers} Active, ${inactiveEmployers} Inactive`,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Total Employees",
      value: totalEmployees.toLocaleString(),
      description: "Across all employers",
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Contributions",
      value: `$${totalContributions.toLocaleString()}`,
      description: "Lifetime contributions",
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Compliance Rate",
      value: `${Math.round((compliantEmployers / totalEmployers) * 100)}%`,
      description: `${compliantEmployers} Compliant, ${nonCompliantEmployers} Non-Compliant`,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "Pending Contributions",
      value: pendingContributions.toString(),
      description: "Require immediate attention",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "Growth Rate",
      value: "+12.5%",
      description: "New registrations this quarter",
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  const quickLinks = [
    {
      title: "Register New Employer",
      description: "Add a new employer to the system",
      icon: Plus,
      action: () => navigate('/employer/register'),
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      title: "Pending Verification",
      description: "Review and approve pending employer registrations",
      icon: Clock,
      action: () => navigate('/employers-management/pending-verification'),
      color: "bg-yellow-600 hover:bg-yellow-700"
    },
    {
      title: "Search Employers",
      description: "Find and manage existing employers",
      icon: Search,
      action: () => navigate('/employers-management/pending-verification'),
      color: "bg-green-600 hover:bg-green-700"
    },
    {
      title: "View Reports",
      description: "Generate employer reports and analytics",
      icon: FileText,
      action: () => navigate('/employers-management/reports'),
      color: "bg-purple-600 hover:bg-purple-700"
    }
  ];

  const recentActivity = [
    { employer: "TechCorp Solutions Inc.", action: "Contribution Received", status: "completed", time: "2 hours ago" },
    { employer: "Green Valley Manufacturing", action: "Audit Scheduled", status: "pending", time: "4 hours ago" },
    { employer: "City Health Services", action: "Registration Approved", status: "completed", time: "1 day ago" },
    { employer: "Sunset Retail Chain", action: "Contribution Overdue", status: "warning", time: "2 days ago" },
    { employer: "Mountain View Consulting", action: "Account Deactivated", status: "inactive", time: "3 days ago" }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employers Dashboard</h1>
            <p className="text-gray-600">Overview of employer registrations and activities</p>
          </div>
        </div>
        {/* Register button removed from header as requested */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <p className="text-xs text-gray-500 mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Frequently used actions for employer management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickLinks.map((link, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start h-auto p-4 hover:bg-gray-50"
                onClick={link.action}
              >
                <div className={`p-2 rounded-md ${link.color} mr-3`}>
                  <link.icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{link.title}</div>
                  <div className="text-sm text-gray-500">{link.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest updates and actions in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(activity.status)}
                    <div>
                      <p className="font-medium text-sm">{activity.employer}</p>
                      <p className="text-xs text-gray-500">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={activity.status === 'completed' ? 'default' : 
                              activity.status === 'pending' ? 'secondary' : 
                              activity.status === 'warning' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {activity.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/employers-management/manage')}>
              View All Activities
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Employer Status Overview</CardTitle>
          <CardDescription>
            Current distribution of employers by status and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activeEmployers}</div>
              <div className="text-sm text-green-700">Active Employers</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{inactiveEmployers}</div>
              <div className="text-sm text-red-700">Inactive Employers</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{compliantEmployers}</div>
              <div className="text-sm text-blue-700">Compliant</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{nonCompliantEmployers}</div>
              <div className="text-sm text-orange-700">Non-Compliant</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployersDashboard;