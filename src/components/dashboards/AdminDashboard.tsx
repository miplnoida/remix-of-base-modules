import { useState } from 'react';
import { Building2, Users, FileText, AlertTriangle, DollarSign, ClipboardCheck, Calendar, Briefcase } from 'lucide-react';
import { DashboardKPICard } from './widgets/DashboardKPICard';
import { ContributionTrendChart } from './widgets/ContributionTrendChart';
import { ComplianceDonut } from './widgets/ComplianceDonut';
import { RegistrationPipeline } from './widgets/RegistrationPipeline';
import { BenefitsDistribution } from './widgets/BenefitsDistribution';
import { RecentSystemActivity } from './widgets/RecentSystemActivity';
import { QuickActions } from './widgets/QuickActions';
import { AlertsWidget } from './widgets/AlertsWidget';
import { FinancialSummaryStrip } from './widgets/FinancialSummaryStrip';

export const AdminDashboard = () => {
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-[26px] font-semibold text-foreground tracking-tight">
            {greeting}, Administrator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            System overview for {today.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          Last updated: {today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPICard
          title="Total Employers"
          value="15,432"
          change="+2.3%"
          icon={Building2}
          iconBg="bg-primary/10 text-primary"
        />
        <DashboardKPICard
          title="Insured Persons"
          value="1,234,567"
          change="+5.1%"
          icon={Users}
          iconBg="bg-secondary/15 text-secondary"
        />
        <DashboardKPICard
          title="Active Claims"
          value="8,456"
          change="-1.2%"
          icon={FileText}
          iconBg="bg-[hsl(217_91%_60%/0.12)] text-[hsl(217_91%_60%)]"
        />
        <DashboardKPICard
          title="Compliance Issues"
          value="23"
          change="-15%"
          icon={AlertTriangle}
          iconBg="bg-destructive/10 text-destructive"
        />
      </div>

      {/* Financial Summary Strip */}
      <FinancialSummaryStrip />

      {/* Alerts */}
      <AlertsWidget />

      {/* Charts Row 1: Contribution Trend (2/3) + Compliance Donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ContributionTrendChart />
        </div>
        <div className="lg:col-span-1">
          <ComplianceDonut />
        </div>
      </div>

      {/* Charts Row 2: Registration Pipeline + Benefits Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RegistrationPipeline />
        <BenefitsDistribution />
      </div>

      {/* Bottom Row: Activity Feed + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecentSystemActivity />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>
    </div>
  );
};
