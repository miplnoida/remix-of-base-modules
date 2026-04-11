import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { ComplianceDashboard } from "@/components/dashboards/ComplianceDashboard";
import { BenefitsDashboard } from "@/components/dashboards/BenefitsDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, Shield, DollarSign, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminKPIs, fetchFinancialSummary } from "@/services/dashboardDataService";

const DASHBOARD_ROLES = new Set([
  'admin',
  'administrator',
  'compliance_officer',
  'benefits_manager',
  'hr_manager',
  'financial_analyst',
]);

const normalizeRole = (role?: string) => role?.trim().toLowerCase().replace(/[\s-]+/g, '_') ?? '';

const resolveDashboardRole = (roles: string[], fallbackRole?: string) => {
  const matchedRole = roles.map(normalizeRole).find((role) => DASHBOARD_ROLES.has(role));
  const resolved = matchedRole || normalizeRole(fallbackRole);
  return resolved === 'administrator' ? 'admin' : resolved;
};

export const Dashboard = () => {
  const { user: mockUser } = useAuth();
  const { roles } = useSupabaseAuth();
  const effectiveRole = resolveDashboardRole(roles, mockUser?.role);

  const renderDashboard = () => {
    switch (effectiveRole) {
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

  return <div className="h-full">{renderDashboard()}</div>;
};

// HR Dashboard Component - DB-driven
const HRDashboard = () => {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['hr_dashboard_kpis'],
    queryFn: fetchAdminKPIs,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: 'Insured Persons', value: (kpis?.insured_persons ?? 0).toLocaleString(), icon: Users },
    { label: 'Total Employers', value: (kpis?.total_employers ?? 0).toLocaleString(), icon: Building2 },
    { label: 'Active Claims', value: (kpis?.active_claims ?? 0).toLocaleString(), icon: FileText },
    { label: 'Compliance Issues', value: (kpis?.compliance_issues ?? 0).toLocaleString(), icon: Shield },
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Financial Dashboard Component - DB-driven
const FinancialDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['financial_dashboard_summary'],
    queryFn: fetchFinancialSummary,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatVal = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-secondary/10">
              <div className="text-3xl font-bold text-secondary">{formatVal(Number(data?.monthly_contributions ?? 0))}</div>
              <p className="text-sm text-muted-foreground font-medium">Monthly Contributions</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-[hsl(217_91%_60%/0.1)]">
              <div className="text-3xl font-bold text-[hsl(217_91%_60%)]">{formatVal(Number(data?.benefits_paid_mtd ?? 0))}</div>
              <p className="text-sm text-muted-foreground font-medium">Benefits Paid</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <div className="text-3xl font-bold text-primary">{formatVal(Number(data?.net_surplus ?? 0))}</div>
              <p className="text-sm text-muted-foreground font-medium">Net Surplus</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-destructive/10">
              <div className="text-3xl font-bold text-destructive">{formatVal(Number(data?.outstanding_arrears ?? 0))}</div>
              <p className="text-sm text-muted-foreground font-medium">Outstanding Arrears</p>
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
