
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ComplianceDashboard } from "@/components/dashboards/ComplianceDashboard";
import { BenefitsDashboard } from "@/components/dashboards/BenefitsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Shield, TrendingUp, DollarSign } from "lucide-react";

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

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      {renderDashboard()}
    </div>
  );
};

// HR Dashboard Component
const HRDashboard = () => {
  const stats = [
    { label: 'Total Employees', value: '1,234,567', icon: Users, color: 'from-green-500 to-green-600', change: '+12%' },
    { label: 'New Registrations', value: '156', icon: Building2, color: 'from-blue-500 to-blue-600', change: '+8%' },
    { label: 'Pending Applications', value: '45', icon: FileText, color: 'from-yellow-500 to-yellow-600', change: '-5%' },
    { label: 'ID Cards Generated', value: '89', icon: Shield, color: 'from-purple-500 to-purple-600', change: '+15%' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">HR Management Overview</h2>
        <p className="text-gray-600">Manage insured persons and employee registrations</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.label}</CardTitle>
              <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Overview</h2>
        <p className="text-gray-600">Monitor financial metrics and contributions</p>
      </div>
      
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-government-600" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">$12.5M</div>
              <p className="text-sm text-gray-600 font-medium">Monthly Contributions</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">$8.2M</div>
              <p className="text-sm text-gray-600 font-medium">Benefits Paid</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">$4.3M</div>
              <p className="text-sm text-gray-600 font-medium">Net Surplus</p>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SecureServe</h2>
        <p className="text-gray-600">Your personalized dashboard based on your role and permissions</p>
      </div>
      
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-government-600" />
            Getting Started
          </CardTitle>
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
