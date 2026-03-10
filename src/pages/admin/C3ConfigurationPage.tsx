import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Layers, History, RefreshCw, FileText, AlertCircle, TreePalm, Sun, Tag, TagsIcon, ClipboardList } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Tab content components
import { C3PeriodConfigTab } from '@/components/admin/c3-configuration/C3PeriodConfigTab';
import { LevySlabsConfigTab } from '@/components/admin/c3-configuration/LevySlabsConfigTab';
import { C3AuditLogsTab } from '@/components/admin/c3-configuration/C3AuditLogsTab';
import { C3PublishButton } from '@/components/admin/c3-configuration/C3PublishButton';
import { C3SyncHistoryTab } from '@/components/admin/c3-configuration/C3SyncHistoryTab';
import { BonusPolicyDefaultTab } from '@/components/admin/c3-configuration/BonusPolicyDefaultTab';
import { BonusPolicyExceptionsTab } from '@/components/admin/c3-configuration/BonusPolicyExceptionsTab';
import { HolidayPayPolicyDefaultTab } from '@/components/admin/c3-configuration/HolidayPayPolicyDefaultTab';
import { HolidayPayPolicyExceptionsTab } from '@/components/admin/c3-configuration/HolidayPayPolicyExceptionsTab';
import { IncomeCodePolicyDefaultTab } from '@/components/admin/c3-configuration/IncomeCodePolicyDefaultTab';
import { IncomeCodePolicyExceptionsTab } from '@/components/admin/c3-configuration/IncomeCodePolicyExceptionsTab';
import { C3FilingConfigTab } from '@/components/admin/c3-configuration/C3FilingConfigTab';

const C3ConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('period-config');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="C3 Configuration"
          subtitle="Manage all C3 calculation parameters, levy slabs, and bonus configuration from a single location"
          breadcrumbs={[
            { label: 'Administration', href: '/admin' },
            { label: 'C3 Configuration' }
          ]}
        />
        <C3PublishButton />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="space-y-3">
          {/* General Config Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger value="period-config" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Period Configuration</span>
                <span className="sm:hidden">Periods</span>
              </TabsTrigger>
              <TabsTrigger value="filing-config" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Filing & Penalties</span>
                <span className="sm:hidden">Filing</span>
              </TabsTrigger>
              <TabsTrigger value="levy-slabs" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Levy Slabs</span>
                <span className="sm:hidden">Slabs</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator />

          {/* Policy Groups Row */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* Bonus Policy Group */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Bonus</span>
              <TabsList className="h-auto bg-transparent p-0 gap-1">
                <TabsTrigger value="bonus-policy-default" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Policy</span>
                  <span className="sm:hidden">Policy</span>
                </TabsTrigger>
                <TabsTrigger value="bonus-policy-exceptions" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Exceptions</span>
                  <span className="sm:hidden">Exc</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            {/* Holiday Pay Policy Group */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Holiday Pay</span>
              <TabsList className="h-auto bg-transparent p-0 gap-1">
                <TabsTrigger value="holiday-pay-policy" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Sun className="h-4 w-4" />
                  <span className="hidden sm:inline">Policy</span>
                  <span className="sm:hidden">Policy</span>
                </TabsTrigger>
                <TabsTrigger value="holiday-pay-exceptions" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TreePalm className="h-4 w-4" />
                  <span className="hidden sm:inline">Exceptions</span>
                  <span className="sm:hidden">Exc</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <Separator orientation="vertical" className="h-8 hidden sm:block" />

            {/* Income Code Policy Group */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Income Code</span>
              <TabsList className="h-auto bg-transparent p-0 gap-1">
                <TabsTrigger value="income-code-policy" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Tag className="h-4 w-4" />
                  <span className="hidden sm:inline">Policy</span>
                  <span className="sm:hidden">Policy</span>
                </TabsTrigger>
                <TabsTrigger value="income-code-exceptions" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <TagsIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Exceptions</span>
                  <span className="sm:hidden">Exc</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <Separator />

          {/* System Row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
              <TabsTrigger value="audit-logs" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Audit Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
              <TabsTrigger value="sync-history" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Sync History</span>
                <span className="sm:hidden">Sync</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="period-config" className="mt-6">
          <C3PeriodConfigTab />
        </TabsContent>

        <TabsContent value="filing-config" className="mt-6">
          <C3FilingConfigTab />
        </TabsContent>

        <TabsContent value="levy-slabs" className="mt-6">
          <LevySlabsConfigTab />
        </TabsContent>

        <TabsContent value="bonus-policy-default" className="mt-6">
          <BonusPolicyDefaultTab />
        </TabsContent>

        <TabsContent value="bonus-policy-exceptions" className="mt-6">
          <BonusPolicyExceptionsTab />
        </TabsContent>

        <TabsContent value="holiday-pay-policy" className="mt-6">
          <HolidayPayPolicyDefaultTab />
        </TabsContent>

        <TabsContent value="holiday-pay-exceptions" className="mt-6">
          <HolidayPayPolicyExceptionsTab />
        </TabsContent>

        <TabsContent value="income-code-policy" className="mt-6">
          <IncomeCodePolicyDefaultTab />
        </TabsContent>

        <TabsContent value="income-code-exceptions" className="mt-6">
          <IncomeCodePolicyExceptionsTab />
        </TabsContent>

        <TabsContent value="audit-logs" className="mt-6">
          <C3AuditLogsTab />
        </TabsContent>

        <TabsContent value="sync-history" className="mt-6">
          <C3SyncHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default C3ConfigurationPage;
