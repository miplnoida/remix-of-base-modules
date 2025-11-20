import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import RiskFactorsTab from './risk-policy/RiskFactorsTab';
import RiskPoliciesTab from './risk-policy/RiskPoliciesTab';
import RiskBandsTab from './risk-policy/RiskBandsTab';

export default function RiskRulePolicy() {
  const [activeTab, setActiveTab] = useState('factors');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Risk Rule Policy</h1>
        <p className="text-muted-foreground">
          Configure risk factors, policies, and risk bands to guide audit selection and compliance actions
        </p>
      </div>

      {/* Tabs */}
      <Card className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="factors">Risk Factors</TabsTrigger>
            <TabsTrigger value="policies">Risk Policies</TabsTrigger>
            <TabsTrigger value="bands">Risk Bands & Behaviour</TabsTrigger>
          </TabsList>

          <TabsContent value="factors" className="space-y-4">
            <RiskFactorsTab />
          </TabsContent>

          <TabsContent value="policies" className="space-y-4">
            <RiskPoliciesTab />
          </TabsContent>

          <TabsContent value="bands" className="space-y-4">
            <RiskBandsTab />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
