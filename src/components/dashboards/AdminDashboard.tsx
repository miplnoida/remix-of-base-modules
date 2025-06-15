
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemOverview } from './admin/SystemOverview';
import { ComplianceView } from './admin/ComplianceView';
import { BenefitsView } from './admin/BenefitsView';
import { HRView } from './admin/HRView';
import { FinancialView } from './admin/FinancialView';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Administration Dashboard</h1>
        <p className="text-gray-600">Complete overview of all system operations and detailed module insights</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="hr">HR Management</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SystemOverview />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <ComplianceView />
        </TabsContent>

        <TabsContent value="benefits" className="space-y-6">
          <BenefitsView />
        </TabsContent>

        <TabsContent value="hr" className="space-y-6">
          <HRView />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialView />
        </TabsContent>
      </Tabs>
    </div>
  );
};
