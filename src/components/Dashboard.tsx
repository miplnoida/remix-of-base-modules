
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ComplianceDashboard } from "@/components/dashboards/ComplianceDashboard";
import { BenefitsDashboard } from "@/components/dashboards/BenefitsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Shield } from "lucide-react";

export const Dashboard = () => {
  const { user } = useAuth();

  // Render role-specific dashboard
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

  return renderDashboard();
};

// Additional dashboard components for other roles
const HRDashboard = () => {
  const stats = [
    { label: 'Total Employees', value: '1.2M', icon: Users, color: 'bg-green-500' },
    { label: 'New Registrations', value: '156', icon: Building2, color: 'bg-blue-500' },
    { label: 'Pending Applications', value: '45', icon: FileText, color: 'bg-yellow-500' },
    { label: 'ID Cards Generated', value: '89', icon: Shield, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">HR Management Dashboard</h1>
        <p className="text-gray-600">Manage insured persons and employee registrations</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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
    </div>
  );
};

const FinancialDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
        <p className="text-gray-600">Monitor financial metrics and contributions</p>
      </div>
      
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
    </div>
  );
};

const DefaultDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to SecureServe</h1>
        <p className="text-gray-600">Your personalized dashboard based on your role and permissions</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Welcome to SecureServe - Social Security Management System. Use the sidebar to navigate to different sections based on your role and permissions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
