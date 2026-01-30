import { useState } from 'react';
import { PermissionWrapper } from '@/components/ui/permission-wrapper';
import { useGroupedC3Configs, useC3ConfigAuditHistory } from '@/hooks/useC3CalculationConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield, Building2, Briefcase, AlertTriangle, History } from 'lucide-react';
import { ConfigCategory } from '@/types/c3CalculationConfig';
import { C3ConfigCategoryCard } from '@/components/admin/c3-config/C3ConfigCategoryCard';
import { C3ConfigAuditLog } from '@/components/admin/c3-config/C3ConfigAuditLog';

const CATEGORY_ICONS: Record<ConfigCategory, React.ReactNode> = {
  social_security: <Shield className="h-5 w-5" />,
  levy: <Building2 className="h-5 w-5" />,
  severance: <Briefcase className="h-5 w-5" />,
  penalty: <AlertTriangle className="h-5 w-5" />
};

export default function C3CalculationConfigPage() {
  const { groupedConfigs, isLoading, error } = useGroupedC3Configs();
  const [activeTab, setActiveTab] = useState<string>('social_security');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          <p className="font-medium">Failed to load configuration</p>
          <p className="text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionWrapper moduleName="C3 Calculation Config">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">C3 Calculation Configuration</h1>
          <p className="text-muted-foreground">
            Configure parameters for Social Security, Levy, Severance, and Penalty calculations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            {groupedConfigs.map(group => (
              <TabsTrigger 
                key={group.category} 
                value={group.category}
                className="flex items-center gap-2"
              >
                {CATEGORY_ICONS[group.category]}
                <span className="hidden sm:inline">{group.displayName}</span>
              </TabsTrigger>
            ))}
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <span className="hidden sm:inline">Audit Log</span>
            </TabsTrigger>
          </TabsList>

          {groupedConfigs.map(group => (
            <TabsContent key={group.category} value={group.category}>
              <C3ConfigCategoryCard group={group} />
            </TabsContent>
          ))}

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Configuration Change History
                </CardTitle>
                <CardDescription>
                  View all changes made to calculation parameters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <C3ConfigAuditLog />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionWrapper>
  );
}
