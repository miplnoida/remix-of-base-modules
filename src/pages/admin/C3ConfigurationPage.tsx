import React, { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Layers, Gift, History, RefreshCw } from 'lucide-react';

// Tab content components
import { C3PeriodConfigTab } from '@/components/admin/c3-configuration/C3PeriodConfigTab';
import { LevySlabsConfigTab } from '@/components/admin/c3-configuration/LevySlabsConfigTab';
import { BonusLevyExemptionsTab } from '@/components/admin/c3-configuration/BonusLevyExemptionsTab';
import { C3AuditLogsTab } from '@/components/admin/c3-configuration/C3AuditLogsTab';
import { C3PublishButton } from '@/components/admin/c3-configuration/C3PublishButton';
import { C3SyncHistoryTab } from '@/components/admin/c3-configuration/C3SyncHistoryTab';

const C3ConfigurationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('period-config');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="C3 Configuration"
          subtitle="Manage all C3 calculation parameters, levy slabs, and bonus exemptions from a single location"
          breadcrumbs={[
            { label: 'Administration', href: '/admin' },
            { label: 'C3 Configuration' }
          ]}
        />
        <C3PublishButton />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="period-config" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Period Configuration</span>
            <span className="sm:hidden">Periods</span>
          </TabsTrigger>
          <TabsTrigger value="levy-slabs" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Levy Slabs</span>
            <span className="sm:hidden">Slabs</span>
          </TabsTrigger>
          <TabsTrigger value="bonus-exemptions" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Bonus Exemptions</span>
            <span className="sm:hidden">Exemptions</span>
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Audit Logs</span>
            <span className="sm:hidden">Logs</span>
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

        <TabsContent value="levy-slabs" className="mt-6">
          <LevySlabsConfigTab />
        </TabsContent>

        <TabsContent value="bonus-exemptions" className="mt-6">
          <BonusLevyExemptionsTab />
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
