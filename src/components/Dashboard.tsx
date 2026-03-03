import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ComplianceDashboard } from "@/components/dashboards/ComplianceDashboard";
import { BenefitsDashboard } from "@/components/dashboards/BenefitsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Shield, DollarSign } from "lucide-react";

export const Dashboard = () => {
  const { user } = useAuth();

  const renderDashboard = () => {
    switch (user?.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'compliance_officer':
        return <ComplianceDashboard />;
      case 'benefits_manager':
        return <BenefitsDashboard />;
      case 'hr_manager':
        return <HRDashboard />;
      case 'financial_analyst':
        return <FinancialDashboard />;
      default:
        return <DefaultDashboard />;
    }
  };

  return (
    <div className="h-full">
      {renderDashboard()}
    </div>
  );
};

// HR Dashboard Component
const HRDashboard = () => {
  const stats = [
    { label: 'Total Employees', value: '1,234,567', icon: Users, change: '+12%' },
    { label: 'New Registrations', value: '156', icon: Building2, change: '+8%' },
    { label: 'Pending Applications', value: '45', icon: FileText, change: '-5%' },
    { label: 'ID Cards Generated', value: '89', icon: Shield, change: '+15%' },
  ];

  return (
    <div className="space-y-4 h-full animate-fade-in">
      <div className="mb-4">
        <h2 className="text-[26px] font-semibold text-foreground">HR Management Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage insured persons and employee registrations</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-card-hover transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[13px] font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-secondary' : 'text-destructive'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Financial Dashboard Component
const FinancialDashboard = () => {
  return (
    <div className="space-y-4 h-full animate-fade-in">
      <div className="mb-4">
        <h2 className="text-[26px] font-semibold text-foreground">Financial Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Monitor financial metrics and contributions</p>
      </div>
      <Card className="hover:shadow-card-hover transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <DollarSign className="h-5 w-5 text-primary" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-secondary/10">
              <div className="text-3xl font-bold text-secondary">$12.5M</div>
              <p className="text-sm text-muted-foreground font-medium">Monthly Contributions</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-[hsl(217_91%_60%/0.1)]">
              <div className="text-3xl font-bold text-[hsl(217_91%_60%)]">$8.2M</div>
              <p className="text-sm text-muted-foreground font-medium">Benefits Paid</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <div className="text-3xl font-bold text-primary">$4.3M</div>
              <p className="text-sm text-muted-foreground font-medium">Net Surplus</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Default Dashboard Component
const DefaultDashboard = () => {
  return (
    <div className="space-y-4 h-full animate-fade-in">
      <div className="mb-4">
        <h2 className="text-[26px] font-semibold text-foreground">Welcome to SecureServe</h2>
        <p className="text-sm text-muted-foreground mt-1">Your personalized dashboard based on your role and permissions</p>
      </div>
      <Card className="hover:shadow-card-hover transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Shield className="h-5 w-5 text-primary" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Welcome to SecureServe – Social Security Management System. Use the sidebar to navigate to different sections based on your role and permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
