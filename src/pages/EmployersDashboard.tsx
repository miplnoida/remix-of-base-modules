import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, FileText, AlertTriangle, Plus, Eye, TrendingUp, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { employerData } from '@/data/employerData';
import { routes } from '@/config/routes';

const EmployersDashboard = () => {
  const navigate = useNavigate();

  // Calculate statistics from employer data
  const stats = {
    total: employerData.length,
    active: employerData.filter(emp => emp.employerStatus === 'Active').length,
    inactive: employerData.filter(emp => emp.employerStatus === 'Inactive').length,
    pending: employerData.filter(emp => emp.contributionStatus === 'Pending').length,
    compliant: employerData.filter(emp => emp.complianceStatus === 'Compliant').length,
    nonCompliant: employerData.filter(emp => emp.complianceStatus === 'Non-Compliant').length,
    totalPayroll: employerData.reduce((sum, emp) => sum + emp.totalPayroll, 0),
    totalContributions: employerData.reduce((sum, emp) => sum + emp.totalContributions, 0),
    totalEmployees: employerData.reduce((sum, emp) => sum + emp.numberOfEmployees, 0)
  };

  const quickLinks = [
    {
      title: "Register New Employer",
      description: "Add a new employer to the system",
      icon: Plus,
      action: () => navigate('/employer-registration'),
      variant: "default" as const
    },
    {
      title: "View Pending Verification",
      description: "Review employers awaiting verification",
      icon: Eye,
      action: () => navigate('/employers-management/manage?status=pending'),
      variant: "outline" as const
    },
    {
      title: "View Penalties",
      description: "Check employer penalties and fines",
      icon: AlertTriangle,
      action: () => navigate('/penalty-management'),
      variant: "outline" as const
    },
    {
      title: "Generate Reports",
      description: "Create employer compliance reports",
      icon: FileText,
      action: () => navigate('/employers-management/reports'),
      variant: "outline" as const
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employers Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of employer registrations and compliance status
            </p>
          </div>
          <Button onClick={() => navigate('/employer-registration')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Register Employer
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Employers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.total}</div>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {stats.active} Active
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {stats.inactive} Inactive
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.totalEmployees.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all employers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                ${(stats.totalPayroll / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Annual payroll value
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-card-foreground">Contributions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">
                ${(stats.totalContributions / 1000).toFixed(0)}K
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total contributions received
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Compliance Status</CardTitle>
              <CardDescription>Current employer compliance overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-card-foreground">Compliant</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(stats.compliant / stats.total) * 100}%` }}
                    />
                  </div>
                  <Badge variant="secondary">{stats.compliant}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-card-foreground">Non-Compliant</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ width: `${(stats.nonCompliant / stats.total) * 100}%` }}
                    />
                  </div>
                  <Badge variant="destructive">{stats.nonCompliant}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-card-foreground">Pending Review</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-muted rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(stats.pending / stats.total) * 100}%` }}
                    />
                  </div>
                  <Badge variant="default">{stats.pending}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Quick Actions</CardTitle>
              <CardDescription>Frequently used employer management functions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map((link, index) => (
                <Button
                  key={index}
                  variant={link.variant}
                  className="w-full justify-start h-auto p-4"
                  onClick={link.action}
                >
                  <div className="flex items-start gap-3">
                    <link.icon className="h-5 w-5 mt-0.5" />
                    <div className="text-left">
                      <div className="font-medium">{link.title}</div>
                      <div className="text-xs text-muted-foreground">{link.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Recent Registrations</CardTitle>
            <CardDescription>Latest employer registrations and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employerData.slice(0, 5).map((employer) => (
                <div key={employer.employerId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-card-foreground">{employer.employerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {employer.businessType} • {employer.numberOfEmployees} employees
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={employer.employerStatus === 'Active' ? 'default' : 'secondary'}
                    >
                      {employer.employerStatus}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/employers-management/manage`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployersDashboard;