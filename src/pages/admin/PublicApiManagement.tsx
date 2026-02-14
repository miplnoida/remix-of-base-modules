import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Globe, BarChart3, Key, Shield, FileText, Gauge } from 'lucide-react';
import ApiRegistryTab from '@/components/admin/api-management/ApiRegistryTab';
import ApiPerformanceTab from '@/components/admin/api-management/ApiPerformanceTab';
import ApiKeysTab from '@/components/admin/api-management/ApiKeysTab';
import ApiAccessControlTab from '@/components/admin/api-management/ApiAccessControlTab';
import ApiConfigAuditTab from '@/components/admin/api-management/ApiConfigAuditTab';
import ApiRateLimitPoliciesTab from '@/components/admin/api-management/ApiRateLimitPoliciesTab';

const PublicApiManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('registry');

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Public API Management</h1>
        <p className="text-muted-foreground">
          Centralized governance, monitoring, and access control for all publicly exposed APIs
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="registry" className="gap-1.5">
            <Globe className="h-4 w-4" /> API Registry
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Performance & Usage
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-1.5">
            <Key className="h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5">
            <Shield className="h-4 w-4" /> Access Control
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <FileText className="h-4 w-4" /> Config Audit
          </TabsTrigger>
          <TabsTrigger value="rate-limits" className="gap-1.5">
            <Gauge className="h-4 w-4" /> Rate Limits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registry"><ApiRegistryTab /></TabsContent>
        <TabsContent value="performance"><ApiPerformanceTab /></TabsContent>
        <TabsContent value="keys"><ApiKeysTab /></TabsContent>
        <TabsContent value="access"><ApiAccessControlTab /></TabsContent>
        <TabsContent value="audit"><ApiConfigAuditTab /></TabsContent>
        <TabsContent value="rate-limits"><ApiRateLimitPoliciesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PublicApiManagement;
