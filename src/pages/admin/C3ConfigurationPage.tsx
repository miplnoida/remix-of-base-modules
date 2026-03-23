import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Layers, RefreshCw, FileText, AlertCircle, TreePalm, Sun, Tag, TagsIcon, ClipboardList, Calculator, CreditCard } from 'lucide-react';

// Tab content components
import { C3PeriodConfigTab } from '@/components/admin/c3-configuration/C3PeriodConfigTab';
import { LevySlabsConfigTab } from '@/components/admin/c3-configuration/LevySlabsConfigTab';

import { C3PublishButton } from '@/components/admin/c3-configuration/C3PublishButton';
import { C3SyncHistoryTab } from '@/components/admin/c3-configuration/C3SyncHistoryTab';
import { BonusPolicyDefaultTab } from '@/components/admin/c3-configuration/BonusPolicyDefaultTab';
import { BonusPolicyExceptionsTab } from '@/components/admin/c3-configuration/BonusPolicyExceptionsTab';
import { HolidayPayPolicyDefaultTab } from '@/components/admin/c3-configuration/HolidayPayPolicyDefaultTab';
import { HolidayPayPolicyExceptionsTab } from '@/components/admin/c3-configuration/HolidayPayPolicyExceptionsTab';
import { IncomeCodePolicyDefaultTab } from '@/components/admin/c3-configuration/IncomeCodePolicyDefaultTab';
import { IncomeCodePolicyExceptionsTab } from '@/components/admin/c3-configuration/IncomeCodePolicyExceptionsTab';
import { C3FilingConfigTab } from '@/components/admin/c3-configuration/C3FilingConfigTab';
import SepContribRateManagement from '@/pages/admin/SepContribRateManagement';
import CyberSourceSettings from '@/pages/c3Management/CyberSourceSettings';

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
        <TabsList className="responsive-tabs">
          <TabsTrigger value="period-config" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Period Configuration</span>
            <span className="sm:hidden">Periods</span>
          </TabsTrigger>
          <TabsTrigger value="filing-config" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Filing & Penalties</span>
            <span className="sm:hidden">Filing</span>
          </TabsTrigger>
          <TabsTrigger value="levy-slabs" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Levy Slabs</span>
            <span className="sm:hidden">Slabs</span>
          </TabsTrigger>
          <TabsTrigger value="bonus-policy-default" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Bonus Policy</span>
            <span className="sm:hidden">Bonus</span>
          </TabsTrigger>
          <TabsTrigger value="bonus-policy-exceptions" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Bonus Exceptions</span>
            <span className="sm:hidden">B. Exc</span>
          </TabsTrigger>
          <TabsTrigger value="holiday-pay-policy" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span className="hidden sm:inline">Holiday Pay Policy</span>
            <span className="sm:hidden">Holiday</span>
          </TabsTrigger>
          <TabsTrigger value="holiday-pay-exceptions" className="flex items-center gap-2">
            <TreePalm className="h-4 w-4" />
            <span className="hidden sm:inline">Holiday Pay Exceptions</span>
            <span className="sm:hidden">H. Exc</span>
          </TabsTrigger>
          <TabsTrigger value="income-code-policy" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Income Code Policy</span>
            <span className="sm:hidden">IC Policy</span>
          </TabsTrigger>
          <TabsTrigger value="income-code-exceptions" className="flex items-center gap-2">
            <TagsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">IC Exceptions</span>
            <span className="sm:hidden">IC Exc</span>
          </TabsTrigger>
          <TabsTrigger value="sep-rates" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">SE Contribution Rates</span>
            <span className="sm:hidden">SE Rates</span>
          </TabsTrigger>
          <TabsTrigger value="cybersource" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">CyberSource Settings</span>
            <span className="sm:hidden">CyberSource</span>
          </TabsTrigger>
          <TabsTrigger value="sync-history" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sync History</span>
            <span className="sm:hidden">Sync</span>
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="sep-rates" className="mt-6">
          <SepContribRateManagement embedMode />
        </TabsContent>

        <TabsContent value="cybersource" className="mt-6">
          <CyberSourceSettings embedMode />
        </TabsContent>


        <TabsContent value="sync-history" className="mt-6">
          <C3SyncHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default C3ConfigurationPage;
